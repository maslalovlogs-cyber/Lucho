import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';
import { SECUENCIA } from '../schemas.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S8 — js/screens/autos.js · PANTALLA 8: Automatizaciones
   ════════════════════════════════════════════════════════════════ */
const S_Autos = {
  title: 'Automatizaciones',
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    let html = '<div class="h-page"><div><h2>Automatizaciones</h2><p>El puente de conversión del método: palabra clave → DM automático → calificación → WhatsApp → humano en menos de 5 minutos. Speed-to-lead = dinero.</p></div></div>';

    html += '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>Flujo estándar del método</h3></div><div class="card-b"><div class="script" style="font-family:var(--mono);font-size:11.5px">Reel/Anuncio → Comentario con palabra clave → DM automático (ManyChat)\n→ 1 pregunta calificadora → valor + link → WhatsApp / agenda / landing\n→ conversación humana (&lt;5 min) → VENTA → etiqueta en CRM\n→ secuencia post-venta → fidelización → referido</div>' +
      '<div class="fgrid" style="grid-template-columns:1fr 1fr 1fr auto;align-items:end;margin-top:14px">' +
      '<div class="field"><label for="aCanal">Canal</label><select id="aCanal"><option>ManyChat (DM Instagram)</option><option>WhatsApp Business</option><option>Email</option><option>CRM / seguimiento</option><option>Flujo completo (comentario → venta)</option></select></div>' +
      '<div class="field"><label for="aObj">Objetivo</label><select id="aObj"><option>Capturar y calificar leads</option><option>Agendar citas</option><option>Entregar lead magnet</option><option>Cerrar venta por DM</option><option>Recompra / fidelización</option><option>Recuperar carritos o DMs fríos</option></select></div>' +
      '<div class="field"><label for="aKw">Palabra clave</label><input id="aKw" placeholder="p. ej. PRECIO, GUÍA, AGENDA"></div>' +
      '<div class="field"><button class="btn pri" id="bAuto"' + (this._gen ? ' disabled' : '') + '>Generar secuencia</button></div></div><div id="aProg"></div></div></div>';

    if (!c.autos.length){
      html += '<div class="card"><div class="empty"><div class="art">⚡</div><h4>Sin secuencias creadas</h4><p>Genera flujos con mensajes literales listos para pegar en ManyChat, WhatsApp o tu herramienta de email.</p></div></div>';
    } else {
      c.autos.slice().reverse().forEach(a => {
        html += '<details class="acc"><summary><span class="chip blue">' + UI.esc(a.canal) + '</span> ' + UI.esc(a.nombre) + '<span class="car">▶</span></summary><div class="acc-b">';
        if (a.pasos && a.pasos.length){
          html += a.pasos.map((p,i) => '<div style="display:flex;gap:10px;margin-bottom:10px"><span class="chip gray" style="font-family:var(--mono)">' + (i+1) + '</span><div><b style="font-size:12.5px">' + UI.esc(p.paso) + '</b>' +
            (p.mensaje ? '<div class="script" style="margin-top:5px">' + UI.esc(p.mensaje) + '</div>' : '') +
            (p.nota ? '<p style="font-size:11.5px;color:var(--faint);margin-top:4px">' + UI.esc(p.nota) + '</p>' : '') + '</div></div>').join('');
        }
        if (a.cadencia) html += '<p style="font-size:12.5px;margin-top:8px"><b>Seguimiento 24-72-7:</b> ' + UI.esc(a.cadencia) + '</p>';
        html += '<button class="btn sm ghost danger" data-dela="' + a.id + '" style="margin-top:8px">Eliminar</button></div></details>';
      });
    }
    el.innerHTML = html;
    document.getElementById('bAuto').onclick = () => this.generar(c);
    el.querySelectorAll('[data-dela]').forEach(b => b.onclick = () => {
      const a = c.autos.find(x => x.id === b.dataset.dela);
      UI.confirmar('Eliminar secuencia',
        'Vas a eliminar la secuencia <b>' + UI.esc(a ? a.nombre : '') + '</b> con sus mensajes. Esta acción no se puede deshacer.',
        'Eliminar', () => {
          c.autos = c.autos.filter(x => x.id !== b.dataset.dela); Store.save(); App.refresh();
        });
    });
  },
  async generar(c){
    const prog = document.getElementById('aProg');
    const btn = document.getElementById('bAuto'); btn.disabled = true; // G4: sin duplicados por doble clic
    this._gen = true;
    prog.innerHTML = UI.thinking('Escribiendo la secuencia con los guiones del método…');
    const canal = document.getElementById('aCanal').value, obj = document.getElementById('aObj').value, kw = document.getElementById('aKw').value;
    try{
      const res = await AI.json(
        AI.system(['etapa3','principios','operativo'], 'Diseñas automatizaciones de conversión con los guiones y reglas del método (speed-to-lead <5 min, 1 pregunta calificadora, cadencia 24-72-7, cierre asumido con 2 opciones).'),
        AI.clienteCtx(c) + '\nCanal: ' + canal + '. Objetivo: ' + obj + '. Palabra clave: ' + (kw || 'proponla tú') + '.' +
        '\nDevuelve JSON: {"nombre":str,"canal":str corto,"pasos":[4-6 objetos {"paso":str qué ocurre máx 10 palabras,"mensaje":str texto LITERAL del mensaje con el tono del negocio (usa [Nombre] como variable),"nota":str máx 12 palabras ("" si no aplica)}],"cadencia":str máx 30 palabras qué se envía a las 24h, 72h y día 7}', SECUENCIA);
      res.id = Store.uid();
      c.autos.push(res); Store.save(); this._gen = false; App.refresh(); UI.toast('Secuencia lista');
    }catch(e){ this._gen = false; prog.innerHTML = '<div class="warn">Error: ' + UI.esc(e.message) + '</div>'; btn.disabled = false; }
  }
};


export { S_Autos };
