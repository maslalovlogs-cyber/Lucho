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
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 3000;
const MODEL = 'claude-sonnet-4-6';   // mismo modelo que usaba la app original
const MAX_TOKENS = 1000;             // paridad con el original; se revisa en Fase 5
const BODY_LIMIT = 512 * 1024;       // 512 KB de cuerpo máximo

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

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
  if (process.env.APP_PASSWORD && req.headers['x-app-password'] !== process.env.APP_PASSWORD){
    return json(res, 401, { error: 'Contraseña de acceso incorrecta o ausente' });
  }
  if (!client){
    return json(res, 503, { error: 'El servidor no tiene configurada ANTHROPIC_API_KEY. Crea un archivo .env (ver .env.example) y reinicia.' });
  }
  let body;
  try{ body = JSON.parse(await leerCuerpo(req)); }
  catch(e){ return json(res, e.message === 'body_too_large' ? 413 : 400, { error: 'Cuerpo de la petición inválido' }); }
  const { system, user } = body || {};
  if (typeof system !== 'string' || typeof user !== 'string' || !system || !user){
    return json(res, 400, { error: 'Faltan los campos system y user' });
  }
  try{
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: system,
      messages: [{ role: 'user', content: user }]
    });
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
    const data = await readFile(abs);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
    res.end(data);
  }catch(e){
    json(res, 404, { error: 'No encontrado' });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/ai') return apiAI(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return estatico(req, res);
  json(res, 405, { error: 'Método no permitido' });
});

server.listen(PORT, () => {
  console.log('321 OS escuchando en http://localhost:' + PORT);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠ ANTHROPIC_API_KEY no configurada: las funciones de IA responderán 503.');
  if (!process.env.APP_PASSWORD) console.warn('⚠ APP_PASSWORD no configurada: /api/ai queda abierto (solo recomendable en local).');
});
