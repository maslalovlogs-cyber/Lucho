import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S9 — js/screens/dashboard.js · PANTALLA 9: Dashboard
   KPI semanales, ROAS/CPA/CPL, benchmarks del método, gráficas SVG
   y alertas inteligentes (reglas de diagnóstico por síntoma).
   ════════════════════════════════════════════════════════════════ */
const S_Dash = {
  title: 'Dashboard',
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    const M = c.metricas;
    const last = M[M.length - 1] || {};
    const prev = M[M.length - 2] || {};
    const roas = last.gasto > 0 ? (last.ingresos || 0) / last.gasto : null;
    const cpa = last.conversiones > 0 ? (last.gasto || 0) / last.conversiones : null;
    const cpl = last.dms > 0 ? (last.gasto || 0) / last.dms : null;
    const icgProm = c.banco.length ? c.banco.reduce((s,b) => s + b.icg, 0) / c.banco.length : null;
    const delta = (a,b) => (a != null && b != null && b !== 0) ? Math.round((a - b) / b * 100) : null;

    let html = '<div class="h-page"><div><h2>Dashboard</h2><p>Ritual de los viernes: registrar métricas, calcular ICG, clasificar, decidir réplicas. La disciplina de este ritual es la diferencia entre una agencia que opina y una que sabe.</p></div>' +
      '<div style="display:flex;gap:8px"><button class="btn" id="bSem">+ Registrar semana</button><button class="btn pri" id="bAn" ' + (M.length ? '' : 'disabled') + '>Análisis del estratega</button></div></div>';

    const kpi = (lbl, val, sub, d) => '<div class="card kpi"><div class="lbl">' + lbl + '</div><div class="val">' + val + '</div><div class="sub">' +
      (d != null ? '<span style="color:' + (d >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (d >= 0 ? '▲' : '▼') + ' ' + Math.abs(d) + '%</span> vs semana previa' : (sub || '')) + '</div></div>';
    html += '<div class="grid4" style="margin-bottom:14px">' +
      kpi('Alcance semanal', last.alcance != null ? (+last.alcance).toLocaleString() : '—', M.length ? 'total de la semana' : 'sin registros', delta(last.alcance, prev.alcance)) +
      kpi('Retención promedio', last.retencion != null ? last.retencion + '%' : '—', 'benchmark 40–45%', delta(last.retencion, prev.retencion)) +
      kpi('Interacción / alcance', last.alcance > 0 ? ((last.interaccion||0) / last.alcance * 100).toFixed(1) + '%' : '—', 'benchmark 5–8%', null) +
      kpi('Seguidores', last.seguidores != null ? (+last.seguidores).toLocaleString() : '—', 'vanidad controlada: se reporta, no se optimiza', delta(last.seguidores, prev.seguidores)) + '</div>' +
      '<div class="grid4" style="margin-bottom:18px">' +
      kpi('ICG promedio del banco', icgProm ? icgProm.toFixed(2) : '—', 'meta: ≥ 50% de piezas con ICG > 1') +
      kpi('ROAS', roas != null ? roas.toFixed(1) + '×' : '—', 'meta mes 6: ≥ 3 retail · ≥ 5 ticket alto') +
      kpi('CPA', cpa != null ? UI.fmtMoney(cpa) : '—', 'costo por conversión') +
      kpi('CPL', cpl != null ? UI.fmtMoney(cpl) : '—', 'costo por DM/lead iniciado') + '</div>';

    // Embudo del método
    if (last.alcance > 0){
      const f = [
        ['Alcance', +last.alcance || 0],
        ['Interacciones', +last.interaccion || 0],
        ['Visitas a perfil', +last.visitas || 0],
        ['DMs / leads', +last.dms || 0],
        ['Conversiones', +last.conversiones || 0]
      ];
      html += '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>Embudo de la semana</h3><span class="hint">Atención → Interés → Confianza → Acción</span></div><div class="card-b">' +
        f.map((x,i) => {
          const pct = f[0][1] ? Math.max(.5, x[1] / f[0][1] * 100) : 0;
          return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px"><span style="width:120px;font-size:12px;color:var(--muted)">' + x[0] + '</span>' +
            '<div style="flex:1;height:22px;background:#F0F2F6;border-radius:5px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + (i === f.length-1 ? 'var(--green)' : 'var(--blue)') + ';opacity:' + (1 - i*.12) + '"></div></div>' +
            '<b class="num" style="width:80px;text-align:right;font-family:var(--mono);font-size:12.5px">' + x[1].toLocaleString() + '</b></div>';
        }).join('') + '</div></div>';
    }

    // Gráficas
    if (M.length >= 2){
      const lbl = M.map(m => m.semana.slice(5));
      html += '<div class="grid2" style="margin-bottom:18px">' +
        '<div class="card"><div class="card-h"><h3>Alcance</h3></div><div class="card-b">' + UI.svgLine(M.map(m => m.alcance), lbl) + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Conversiones</h3></div><div class="card-b">' + UI.svgLine(M.map(m => m.conversiones), lbl, 520, 150, 'var(--green)') + '</div></div></div>';
    }

    // Alertas inteligentes (reglas 12.7 / 12.8 del método, evaluadas en código)
    const alertas = this.alertas(c, last, prev, icgProm);
    html += '<div class="grid2"><div class="card"><div class="card-h"><h3>Alertas inteligentes</h3><span class="hint">diagnóstico por síntoma (método §12.7–12.8)</span></div><div class="card-b">' +
      (alertas.length ? alertas.map(a => '<div class="alert-it"><div class="ic" style="background:var(--' + a.c + '-t);color:var(--' + a.c + ')">' + a.i + '</div><div><b>' + a.t + '</b><p>' + a.p + '</p></div></div>').join('')
        : '<div class="empty" style="padding:24px"><p>Sin alertas. Registra semanas y piezas para que el sistema vigile los síntomas del método.</p></div>') +
      '</div></div><div class="card"><div class="card-h"><h3>Análisis del estratega</h3></div><div class="card-b" id="anBox">' +
      (c.analisis ? '<div style="font-size:13px;white-space:pre-wrap">' + UI.esc(c.analisis) + '</div>' : '<p style="color:var(--faint);font-size:13px">Pide un análisis: la IA lee tus métricas y responde con el diagnóstico y la acción correctiva del método.</p>') +
      '</div></div></div>';

    if (M.length){
      html += '<div class="card" style="margin-top:18px"><div class="card-h"><h3>Histórico semanal</h3></div><div class="card-b" style="padding:0;overflow-x:auto"><table class="tb"><tr><th>Semana</th><th>Alcance</th><th>Ret. %</th><th>Interac.</th><th>Visitas</th><th>DMs</th><th>Conv.</th><th>Seguid.</th><th>Gasto</th><th>Ingresos</th><th></th></tr>' +
        M.slice().reverse().map(m => '<tr><td class="num">' + UI.esc(m.semana) + '</td><td class="num">' + (+m.alcance||0).toLocaleString() + '</td><td class="num">' + (m.retencion||0) + '</td><td class="num">' + (m.interaccion||0) + '</td><td class="num">' + (m.visitas||0) + '</td><td class="num">' + (m.dms||0) + '</td><td class="num">' + (m.conversiones||0) + '</td><td class="num">' + (m.seguidores||0) + '</td><td class="num">' + (m.gasto||0) + '</td><td class="num">' + (m.ingresos||0) + '</td>' +
          '<td><button class="btn sm ghost danger" data-delm="' + m.semana + '">✕</button></td></tr>').join('') + '</table></div></div>';
    }
    el.innerHTML = html;
    document.getElementById('bSem').onclick = () => this.formulario(c);
    const bAn = document.getElementById('bAn');
    if (bAn && !bAn.disabled) bAn.onclick = () => this.analizar(c);
    el.querySelectorAll('[data-delm]').forEach(b => b.onclick = () => {
      c.metricas = c.metricas.filter(x => x.semana !== b.dataset.delm); Store.save(); App.refresh();
    });
  },
  alertas(c, last, prev, icgProm){
    const A = [];
    if (prev.alcance > 0 && last.alcance > 0 && last.alcance < prev.alcance * 0.6)
      A.push({ i:'!', c:'red', t:'El alcance cayó más de 40%', p:'Si se repite una segunda semana: auditoría completa — originalidad, engagement bait, consistencia temática y cambios de algoritmo (§12.8).' });
    if (last.alcance > 0 && last.retencion > 0 && last.retencion < 35)
      A.push({ i:'▲', c:'amber', t:'Alto alcance, baja retención', p:'El gancho promete y el cuerpo no cumple: sube densidad, pattern interrupts cada 3–5 s y cumple la promesa del gancho.' });
    if (last.alcance > 0 && (last.interaccion||0) / last.alcance > 0.05 && (last.conversiones||0) === 0 && Store.etapaDe(c.mes) >= 2)
      A.push({ i:'→', c:'blue', t:'Engagement alto, cero ventas', p:'Falta el puente de conversión: CTA de palabra clave + DM automatizado + oferta clara (§12.7).' });
    if (prev.seguidores > 0 && last.seguidores > prev.seguidores && prev.alcance > 0 && last.alcance < prev.alcance)
      A.push({ i:'◇', c:'amber', t:'Seguidores suben, alcance baja', p:'El contenido gusta al círculo actual pero no descubre: aumenta formatos de descubrimiento (POV, ranking, tendencia adaptada).' });
    if (icgProm != null && icgProm < 0.9 && c.banco.length >= 6)
      A.push({ i:'ICG', c:'red', t:'ICG promedio bajo con muestra suficiente', p:'Si tras 6 semanas ninguna pieza supera 1.2, el problema no es el formato: reabrir pilares y propuesta de valor con el cliente (§12.8).' });
    if (last.gasto > 0 && last.dms > 0 && (last.conversiones||0) / last.dms < 0.1 && Store.etapaDe(c.mes) === 3)
      A.push({ i:'%', c:'amber', t:'Conversión DM→venta por debajo de 10%', p:'Con tráfico sano, el problema es la oferta o el cierre: revisa oferta (bonus stack), precio ancla y speed-to-lead <5 min.' });
    const pub = c.calendario.filter(k => k.publicado).length;
    if (pub > 0 && c.banco.length < pub)
      A.push({ i:'✎', c:'blue', t:(pub - c.banco.length) + ' pieza(s) publicadas sin registrar', p:'Sin registro no hubo prueba: captura sus métricas en el Banco a las 72 h y 7 días.' });
    return A;
  },
  formulario(c){
    const semDef = UI.hoyISO(); // G5: fecha local, no UTC
    const num = (id,l) => '<div class="field"><label>' + l + '</label><input type="number" id="' + id + '" min="0" step="any" value="0"></div>';
    UI.modal('Registrar semana',
      '<div class="field"><label>Semana (fecha del viernes)</label><input type="date" id="mSem" value="' + semDef + '"></div><div class="fgrid">' +
      num('mAl','Alcance') + num('mRet','Retención prom. %') + num('mInt','Interacciones') +
      num('mVis','Visitas a perfil') + num('mDm','DMs / leads') + num('mConv','Conversiones') +
      num('mSeg','Seguidores totales') + num('mGas','Gasto en pauta (USD)') + num('mIng','Ingresos atribuidos (USD)') +
      '</div><button class="btn pri" id="mOk" style="width:100%">Guardar semana</button>',
      () => {
        document.getElementById('mOk').onclick = () => {
          const g = id => +document.getElementById(id).value || 0;
          const semana = document.getElementById('mSem').value;
          // M5: la fecha es obligatoria (antes se podían guardar semanas sin clave)
          if (!semana){ UI.toast('Indica la fecha de la semana'); return; }
          const fila = { semana,
            alcance:g('mAl'), retencion:Math.min(100, g('mRet')), interaccion:g('mInt'), visitas:g('mVis'),
            dms:g('mDm'), conversiones:g('mConv'), seguidores:g('mSeg'), gasto:g('mGas'), ingresos:g('mIng') };
          // M5: re-registrar la misma semana la actualiza en vez de duplicarla
          const i = c.metricas.findIndex(m => m.semana === semana);
          if (i >= 0) c.metricas[i] = fila; else c.metricas.push(fila);
          c.metricas.sort((a,b) => a.semana < b.semana ? -1 : 1);
          Store.save(); UI.closeModal(); App.refresh(); UI.toast(i >= 0 ? 'Semana actualizada' : 'Semana registrada');
        };
      });
  },
  async analizar(c){
    const box = document.getElementById('anBox');
    box.innerHTML = UI.thinking('Leyendo métricas con las tablas de diagnóstico del método…');
    try{
      const txt = await AI.raw(
        AI.system(['operativo','icg','principios'], 'Analizas el dashboard como estratega senior. Estructura tu respuesta en 3 bloques breves titulados DIAGNÓSTICO, ACCIÓN DE LA SEMANA y RIESGO, cada uno de 2-3 frases, aplicando el diagnóstico por síntoma y las reglas de intervención. Nada genérico: usa los números reales.', true),
        AI.clienteCtx(c) + '\nMétricas semanales: ' + JSON.stringify(c.metricas.slice(-6)) +
        '\nBanco (título, icg): ' + JSON.stringify(c.banco.map(b => [b.titulo, b.icg]).slice(-10)));
      c.analisis = txt.trim(); Store.save(); App.refresh();
    }catch(e){ box.innerHTML = '<div class="warn">Error: ' + UI.esc(e.message) + '</div>'; }
  }
};


export { S_Dash };
