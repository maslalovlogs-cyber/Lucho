/* ════════════════════════════════════════════════════════════════
   321 OS — mini-backend
   ────────────────────────────────────────────────────────────────
   Responsabilidades (y nada más):
   1. Servir la app estática de /public.
   2. POST /api/ai → llamar a la API de Anthropic con la key que
      vive SOLO en el servidor (variable de entorno ANTHROPIC_API_KEY).

   Seguridad:
   - La API key jamás se envía al navegador.
   - Si defines APP_PASSWORD, cada llamada a /api/ai debe traer el
     header x-app-password (la UI lo pide una vez y lo recuerda en
     la sesión). Configúrala SIEMPRE que expongas esto a internet:
     un proxy de IA abierto deja que cualquiera gaste tu cuenta.
   - Protección contra path traversal al servir estáticos.

   Variables de entorno (ver .env.example):
     ANTHROPIC_API_KEY  obligatoria para las funciones de IA
     APP_PASSWORD       opcional, recomendada en despliegues públicos
     PORT               opcional (3000 por defecto)
   ════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 3000;
const MODEL = 'claude-sonnet-5';     // Fase 5: sucesor de sonnet-4-6, con structured outputs
const MAX_TOKENS = 4096;             // Fase 5 (G2): antes 1000 → los JSON largos se truncaban
const BODY_LIMIT = 512 * 1024;       // 512 KB de cuerpo máximo

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};
/* Fase 7: caché HTTP por tipo. El HTML nunca se cachea (revalida en cada
   visita); css/js una hora (cambian con cada release); fuentes una semana. */
const CACHE = { '.html': 'no-cache', '.css': 'public, max-age=3600', '.js': 'public, max-age=3600', '.woff2': 'public, max-age=604800' };
const COMPRIMIBLE = new Set(['.html', '.css', '.js', '.json', '.svg']);

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ timeout: 120000 }) : null; // ms; el SDK reintenta 429/5xx solo

/* ── Fase 8: seguridad ─────────────────────────────────────────── */

/* Cabeceras en TODAS las respuestas. La CSP es estricta: scripts solo
   propios (sin inline — la Fase 4 eliminó el último onclick inline),
   fuentes propias (Fase 7), sin marcos de terceros. style 'unsafe-inline'
   es necesario: la UI usa estilos inline por diseño. */
function cabecerasSeguridad(res){
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/* Comparación en tiempo constante (evita timing attacks al password). */
function passwordCorrecto(recibido){
  const a = createHash('sha256').update(String(recibido || '')).digest();
  const b = createHash('sha256').update(process.env.APP_PASSWORD).digest();
  return timingSafeEqual(a, b);
}

/* Rate limit en memoria por IP: 30 peticiones de IA cada 10 minutos.
   Suficiente para uso real de agencia; frena el abuso de un proxy
   expuesto. (Tras un reverse proxy, configura trust del X-Forwarded-For
   en ese nivel; aquí se usa la IP directa del socket.) */
const VENTANA_MS = 10 * 60 * 1000, MAX_PETICIONES = 30;
const cubetas = new Map();
function limiteExcedido(ip){
  const ahora = Date.now();
  let c = cubetas.get(ip);
  if (!c || ahora > c.reinicio){ c = { n: 0, reinicio: ahora + VENTANA_MS }; cubetas.set(ip, c); }
  if (cubetas.size > 10000) cubetas.clear(); // tope de memoria
  c.n++;
  return c.n > MAX_PETICIONES;
}

/* Límites por campo (el system legítimo es el Método: ~50-80 KB máx). */
const MAX_SYSTEM = 150000, MAX_USER = 60000;

function json(res, status, body){
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function leerCuerpo(req){
  return new Promise((resolve, reject) => {
    let total = 0; const chunks = [];
    req.on('data', ch => {
      total += ch.length;
      if (total > BODY_LIMIT){ reject(new Error('body_too_large')); req.destroy(); return; }
      chunks.push(ch);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function apiAI(req, res){
  if (process.env.APP_PASSWORD && !passwordCorrecto(req.headers['x-app-password'])){
    console.warn('[api/ai] intento con contraseña incorrecta desde', req.socket.remoteAddress);
    return json(res, 401, { error: 'Contraseña de acceso incorrecta o ausente' });
  }
  if (limiteExcedido(req.socket.remoteAddress || '?')){
    return json(res, 429, { error: 'Demasiadas peticiones de IA; espera unos minutos' });
  }
  if (!client){
    return json(res, 503, { error: 'El servidor no tiene configurada ANTHROPIC_API_KEY. Crea un archivo .env (ver .env.example) y reinicia.' });
  }
  let body;
  try{ body = JSON.parse(await leerCuerpo(req)); }
  catch(e){ return json(res, e.message === 'body_too_large' ? 413 : 400, { error: 'Cuerpo de la petición inválido' }); }
  const { system, user, schema } = body || {};
  if (typeof system !== 'string' || typeof user !== 'string' || !system || !user){
    return json(res, 400, { error: 'Faltan los campos system y user' });
  }
  if (schema !== undefined && (typeof schema !== 'object' || schema === null || Array.isArray(schema))){
    return json(res, 400, { error: 'schema debe ser un objeto JSON Schema' });
  }
  if (system.length > MAX_SYSTEM || user.length > MAX_USER){
    return json(res, 413, { error: 'La petición excede el tamaño permitido' });
  }
  try{
    const peticion = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      /* Prompt caching: el Método 3·2·1 (miles de tokens) se cachea 5 min
         → las llamadas repetidas con las mismas secciones pagan ~10 %. */
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      /* Generaciones cortas y estructuradas: sin razonamiento extendido
         (menos latencia y costo; en sonnet-5 lo adaptativo es el default). */
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: user }]
    };
    /* Structured outputs (G2): con schema, la API garantiza JSON válido
       con esa forma exacta — adiós al parseo heurístico del original. */
    if (schema) peticion.output_config = { format: { type: 'json_schema', schema } };
    const msg = await client.messages.create(peticion);
    const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return json(res, 200, { text });
  }catch(e){
    // Errores tipados del SDK: no filtrar detalles internos al cliente
    if (e instanceof Anthropic.AuthenticationError) return json(res, 502, { error: 'La API key configurada en el servidor no es válida' });
    if (e instanceof Anthropic.RateLimitError)      return json(res, 429, { error: 'Límite de peticiones de IA alcanzado; espera un momento y reintenta' });
    if (e instanceof Anthropic.APIConnectionError)  return json(res, 502, { error: 'No se pudo conectar con el servicio de IA' });
    if (e instanceof Anthropic.APIError)            return json(res, 502, { error: 'El servicio de IA respondió con un error (' + (e.status || '?') + ')' });
    console.error('[api/ai]', e);
    return json(res, 500, { error: 'Error interno del servidor de IA' });
  }
}

async function estatico(req, res){
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== path.join(ROOT, 'index.html')){
    return json(res, 403, { error: 'Ruta no permitida' });
  }
  try{
    let data = await readFile(abs);
    const ext = path.extname(abs);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (CACHE[ext]) headers['Cache-Control'] = CACHE[ext];
    /* Fase 7: gzip para texto (el JS+CSS de la app pasa de ~95 KB a ~25 KB) */
    if (COMPRIMIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')){
      data = gzipSync(data);
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }
    res.writeHead(200, headers);
    res.end(data);
  }catch(e){
    json(res, 404, { error: 'No encontrado' });
  }
}

const server = http.createServer((req, res) => {
  cabecerasSeguridad(res);
  if (req.method === 'POST' && req.url === '/api/ai') return apiAI(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return estatico(req, res);
  json(res, 405, { error: 'Método no permitido' });
});

server.listen(PORT, () => {
  console.log('321 OS escuchando en http://localhost:' + PORT);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠ ANTHROPIC_API_KEY no configurada: las funciones de IA responderán 503.');
  if (!process.env.APP_PASSWORD) console.warn('⚠ APP_PASSWORD no configurada: /api/ai queda abierto (solo recomendable en local).');
});
