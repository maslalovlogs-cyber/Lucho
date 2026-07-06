import { KB } from './kb.js';
import { Store } from './store.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO AI — js/ai.js
   Motor de inteligencia: cada pantalla llama a la API de Anthropic
   con las secciones relevantes del Método 3·2·1 como sistema.
   ════════════════════════════════════════════════════════════════ */
const AI = {
  system(secciones, rol, textoPlano){
    return 'Eres el Director de Marketing Senior de una agencia que opera ÚNICA y EXCLUSIVAMENTE con el Método 3·2·1. ' +
      (rol || '') +
      ' Reglas duras: (1) Cada recomendación se fundamenta en la metodología de abajo; si la metodología prohíbe algo, no lo recomiendas jamás. ' +
      '(2) Eres específico para ESTE negocio: usas su industria, ciudad, productos, precios y capacidad real; nada genérico. ' +
      '(3) Escribes en español neutro, directo y accionable. ' +
      (textoPlano
        ? '(4) Respondes en texto plano bien estructurado, sin markdown ni JSON.'
        : '(4) Respondes ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto antes o después. Sé conciso para no truncar el JSON.') +
      '\n\n=== MÉTODO 3·2·1 (v' + KB.version + ') ===\n' + KB.ctx(secciones);
  },
  clienteCtx(c){
    const i = c.intake, d = c.diagnostico;
    const base = { negocio: i, mesDelPrograma: c.mes, etapaActual: 'Etapa ' + Store.etapaDe(c.mes) };
    if (d && d.matriz) base.configuracionMatriz = d.matriz;
    if (d && d.persona) base.buyerPersona = d.persona;
    if (c.banco.length) base.estructurasGanadoras = c.banco.filter(b => b.icg >= 1.2).map(b => ({ titulo:b.titulo, formato:b.formato, pilar:b.pilar, estructura:b.estructura, icg:b.icg })).slice(0,8);
    return 'DATOS DEL CLIENTE:\n' + JSON.stringify(base);
  },
  /* Fase 2 (arquitectura): la llamada original iba directa a
     api.anthropic.com desde el navegador (sin key → 401/CORS y riesgo
     de exponer la key). Ahora habla con nuestro backend /api/ai, que
     custodia la API key en el servidor. */
  async raw(system, user){
    const headers = { 'Content-Type': 'application/json' };
    const pass = sessionStorage.getItem('m321:pass');
    if (pass) headers['x-app-password'] = pass;
    const res = await fetch('/api/ai', {
      method: 'POST', headers,
      body: JSON.stringify({ system: system, user: user })
    });
    if (res.status === 401){
      const intento = prompt('Esta instalación está protegida. Escribe la contraseña de acceso:');
      if (intento){ sessionStorage.setItem('m321:pass', intento); return this.raw(system, user); }
      throw new Error('Acceso no autorizado');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'El servidor de IA respondió con un error (' + res.status + ')');
    return data.text || '';
  },
  parse(t){
    t = t.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = t.indexOf('{'), b = t.indexOf('[');
    let s = -1, e = -1;
    if (a >= 0 && (b < 0 || a < b)){ s = a; e = t.lastIndexOf('}'); }
    else if (b >= 0){ s = b; e = t.lastIndexOf(']'); }
    if (s < 0 || e < 0) throw new Error('sin JSON');
    return JSON.parse(t.slice(s, e + 1));
  },
  async json(system, user){
    let txt = await this.raw(system, user);
    try{ return this.parse(txt); }
    catch(e){
      txt = await this.raw(system, user + '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido o quedó incompleta. Responde SOLO el JSON, más breve.');
      return this.parse(txt);
    }
  }
};


export { AI };
