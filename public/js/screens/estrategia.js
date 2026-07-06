import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';
import { DIST_SEMESTRAL, nivelPresupuesto } from '../presupuesto.js';
import { ETAPA } from '../schemas.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S3 — js/screens/estrategia.js · PANTALLA 3: Estrategia
   Plan de 6 meses por etapas. El presupuesto se calcula en código
   (distribución 5/10/15/20/20/30 es regla fija del método); la IA
   personaliza objetivos, cronograma y tareas por etapa.
   ════════════════════════════════════════════════════════════════ */
const S_Estrategia = {
  title: 'Estrategia 6 meses',
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    const tieneDx = !!c.diagnostico;
    let html = '<div class="h-page"><div><h2>Estrategia de 6 meses</h2><p>Roadmap completo del semestre: Reconocimiento (3) → Consideración (2) → Conversión (1), con objetivos, KPI, cronograma, tareas y presupuesto.</p></div>' +
      '<button class="btn pri" id="bGen" ' + (tieneDx ? '' : 'disabled title="Genera primero el diagnóstico"') + '>' + (c.estrategia.e1 ? 'Regenerar estrategia' : 'Generar estrategia') + '</button></div>';
    if (!tieneDx) html += '<div class="note">El método exige diagnóstico antes de estrategia (Semana 0 → configuración de la Matriz). <b>Genera primero el diagnóstico.</b></div>';
    html += '<div id="esProg"></div>';

    // Presupuesto semestral — cálculo determinista del método
    const p = +c.intake.presupuesto || 0;
    if (p > 0){
      const total = p * 6;
      const nivel = nivelPresupuesto(p).etiqueta;
      html += '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Presupuesto publicitario del semestre</h3><span class="hint">distribución fija del método · nivel ' + nivel + '</span></div>' +
        '<div class="card-b"><table class="tb"><tr><th>Mes</th>' + [1,2,3,4,5,6].map(m => '<th>M' + m + '</th>').join('') + '<th>Total</th></tr>' +
        '<tr><td>% del semestre</td>' + DIST_SEMESTRAL.map(x => '<td class="num">' + x + '%</td>').join('') + '<td class="num">100%</td></tr>' +
        '<tr><td>Inversión</td>' + DIST_SEMESTRAL.map(x => '<td class="num">' + UI.fmtMoney(total * x / 100) + '</td>').join('') + '<td class="num"><b>' + UI.fmtMoney(total) + '</b></td></tr></table>' +
        '<p style="font-size:12px;color:var(--muted);margin-top:10px">Regla del método: la pauta nunca rescata contenido débil — amplifica piezas con ICG ≥ 1.2 ya validadas orgánicamente.</p></div></div>';
    }

    const et = [
      { k:'e1', n:'3', titulo:'Etapa 1 · Reconocimiento', rango:'Meses 1–3', color:'blue' },
      { k:'e2', n:'2', titulo:'Etapa 2 · Consideración', rango:'Meses 4–5', color:'green' },
      { k:'e3', n:'1', titulo:'Etapa 3 · Conversión', rango:'Mes 6', color:'gold' }
    ];
    et.forEach(e => {
      const d = c.estrategia[e.k];
      html += '<div class="card" style="margin-bottom:16px"><div class="card-h"><span class="chip ' + e.color + '" style="font-family:var(--mono)">' + e.n + '</span><h3>' + e.titulo + '</h3><span class="hint">' + e.rango + '</span></div><div class="card-b">';
      if (!d){ html += '<p style="color:var(--faint);font-size:13px">Pendiente de generar.</p>'; }
      else {
        html += '<p style="font-size:13.5px;margin-bottom:14px"><b>Misión:</b> ' + UI.esc(d.mision||'') + '</p>' +
          '<div class="grid2"><div><b style="font-size:12.5px">Objetivos</b>' + UI.ul(d.objetivos) + '</div>' +
          '<div><b style="font-size:12.5px">KPI de la etapa</b>' + UI.ul(d.kpi) + '</div></div>';
        if (d.cronograma && d.cronograma.length){
          html += '<div class="fs-title">Cronograma</div><table class="tb"><tr><th style="width:120px">Periodo</th><th>Foco</th><th>Acciones clave</th></tr>' +
            d.cronograma.map(r => '<tr><td><b>' + UI.esc(r.periodo) + '</b></td><td>' + UI.esc(r.foco) + '</td><td>' + UI.esc((r.acciones||[]).join(' · ')) + '</td></tr>').join('') + '</table>';
        }
        if (d.tareas && d.tareas.length){
          html += '<div class="fs-title">Tareas del equipo</div>' + UI.ul(d.tareas);
        }
        if (d.pauta) html += '<p style="font-size:12.5px;color:var(--muted);margin-top:12px"><b>Pauta:</b> ' + UI.esc(d.pauta) + '</p>';
      }
      html += '</div></div>';
    });
    el.innerHTML = html;
    const b = document.getElementById('bGen');
    if (b && !b.disabled) b.onclick = () => this.generar(c);
  },
  async generar(c){
    const prog = document.getElementById('esProg');
    document.getElementById('bGen').disabled = true;
    const defs = [
      { k:'e1', kb:['principios','etapa1','ab','operativo'], label:'Etapa 1 · Reconocimiento (meses 1–3)', extra:'Cronograma con 3 filas: "Mes 1 · Exploración", "Mes 2 · Iteración", "Mes 3 · Validación".' },
      { k:'e2', kb:['principios','etapa2','operativo'], label:'Etapa 2 · Consideración (meses 4–5)', extra:'Cronograma con 2 filas: "Mes 4" y "Mes 5" (optimización, influencers según presupuesto, UGC y prueba social).' },
      { k:'e3', kb:['principios','etapa3','operativo'], label:'Etapa 3 · Conversión (mes 6)', extra:'Cronograma con 4 filas: "Semana 1 · Pre-lanzamiento", "Semana 2 · Apertura", "Semana 3 · Prueba social", "Semana 4 · Cierre". Incluye el diseño de oferta recomendado (por defecto bonus stack) adaptado a este negocio.' }
    ];
    try{
      for (const d of defs){
        prog.innerHTML = UI.thinking('Generando ' + d.label + '…');
        c.estrategia[d.k] = await AI.json(
          AI.system(d.kb, 'Diseñas el plan de "' + d.label + '" para este cliente.'),
          AI.clienteCtx(c) + '\n' + d.extra +
          '\nDevuelve JSON: {"mision":str máx 25 palabras,"objetivos":[3 str medibles y específicos de este negocio],"kpi":[3-4 str con metas numéricas del método],"cronograma":[{"periodo":str,"foco":str máx 10 palabras,"acciones":[2-3 str cortos]}],"tareas":[3-4 str operativas],"pauta":str máx 25 palabras sobre cómo usar el presupuesto de la etapa}', ETAPA);
        Store.save();
      }
      App.refresh(); UI.toast('Estrategia de 6 meses lista');
    }catch(e){
      prog.innerHTML = '<div class="warn">Error al generar: ' + UI.esc(e.message) + '. Vuelve a intentar (lo ya generado quedó guardado).</div>';
      document.getElementById('bGen').disabled = false;
    }
  }
};


export { S_Estrategia };
