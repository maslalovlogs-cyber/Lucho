import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';
import { DIST_SEMESTRAL, nivelPresupuesto } from '../presupuesto.js';
import { CAMPANA } from '../schemas.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S7 — js/screens/publicidad.js · PANTALLA 7: Publicidad
   ════════════════════════════════════════════════════════════════ */
const S_Ads = {
  title: 'Publicidad',
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    const p = +c.intake.presupuesto || 0;
    const nivel = (nivelPresupuesto(p) || {}).etiqueta || null;
    const mesPct = DIST_SEMESTRAL[c.mes - 1];
    const ganadores = c.banco.filter(b => b.icg >= 1.2);
    let html = '<div class="h-page"><div><h2>Publicidad</h2><p>La pauta amplifica lo validado: solo corren creativos con ICG ≥ 1.2 o derivados directos. Si un anuncio muere, se vuelve al Banco, no al brainstorming.</p></div>' +
      '<button class="btn pri" id="bCamp"' + (this._gen ? ' disabled' : '') + '>Diseñar campaña del mes</button></div>';

    html += '<div class="grid3" style="margin-bottom:18px">' +
      '<div class="card kpi"><div class="lbl">Nivel de presupuesto</div><div class="val" style="font-size:19px">' + (nivel || 'Sin definir') + '</div><div class="sub">' + (p ? UI.fmtMoney(p) + ' / mes' : 'captura el presupuesto en la ficha') + '</div></div>' +
      '<div class="card kpi"><div class="lbl">Este mes (M' + c.mes + ' → ' + mesPct + '% del semestre)</div><div class="val">' + (p ? UI.fmtMoney(p * 6 * mesPct / 100) : '—') + '</div><div class="sub">distribución fija 5/10/15/20/20/30</div></div>' +
      '<div class="card kpi"><div class="lbl">Creativos elegibles (ICG ≥ 1.2)</div><div class="val">' + ganadores.length + '</div><div class="sub">' + (ganadores.length ? 'listos para pauta' : 'aún sin validar — el orgánico investiga primero') + '</div></div></div>';

    html += '<div id="adProg"></div>';
    if (!c.campanas.length){
      html += '<div class="card"><div class="empty"><div class="art">Ads</div><h4>Sin campañas diseñadas</h4><p>El estratega arma la campaña del mes según tu etapa, nivel de presupuesto y creativos ganadores: objetivos, audiencias, remarketing por temperatura, creativos y KPI.</p></div></div>';
    } else {
      c.campanas.slice().reverse().forEach(k => {
        html += '<details class="acc" open><summary><span class="chip blue">Mes ' + k.mes + '</span> ' + UI.esc(k.nombre) + '<span class="car">▶</span></summary><div class="acc-b">' +
          '<p style="margin-bottom:10px"><b>Objetivo:</b> ' + UI.esc(k.objetivo) + ' · <b>Presupuesto:</b> ' + UI.esc(k.presupuesto) + '</p>';
        if (k.campanas && k.campanas.length){
          html += '<table class="tb"><tr><th scope="col">Campaña</th><th scope="col">Objetivo de plataforma</th><th scope="col">Audiencia</th><th scope="col">% Ppto</th><th scope="col">Creativo</th><th scope="col">KPI meta</th></tr>' +
            k.campanas.map(a => '<tr><td><b>' + UI.esc(a.nombre) + '</b></td><td>' + UI.esc(a.objetivoPlataforma) + '</td><td style="font-size:12px">' + UI.esc(a.audiencia) + '</td><td class="num">' + UI.esc(a.pct) + '</td><td style="font-size:12px">' + UI.esc(a.creativo) + '</td><td style="font-size:12px">' + UI.esc(a.kpi) + '</td></tr>').join('') + '</table>';
        }
        if (k.remarketing) html += '<p style="font-size:12.5px;margin-top:10px"><b>Remarketing:</b> ' + UI.esc(k.remarketing) + '</p>';
        if (k.reglas) html += '<p style="font-size:12.5px;color:var(--muted);margin-top:6px"><b>Reglas de operación:</b> ' + UI.esc(k.reglas) + '</p>';
        html += '<button class="btn sm ghost danger" data-delk="' + k.id + '" style="margin-top:10px">Eliminar</button></div></details>';
      });
    }
    el.innerHTML = html;
    document.getElementById('bCamp').onclick = () => this.generar(c);
    el.querySelectorAll('[data-delk]').forEach(b => b.onclick = () => {
      const k = c.campanas.find(x => x.id === b.dataset.delk);
      UI.confirmar('Eliminar campaña',
        'Vas a eliminar la campaña <b>' + UI.esc(k ? k.nombre : '') + '</b>. Esta acción no se puede deshacer.',
        'Eliminar', () => {
          c.campanas = c.campanas.filter(x => x.id !== b.dataset.delk); Store.save(); App.refresh();
        });
    });
  },
  async generar(c){
    const prog = document.getElementById('adProg');
    const btn = document.getElementById('bCamp'); btn.disabled = true; // G4: sin duplicados por doble clic
    this._gen = true;
    prog.innerHTML = UI.thinking('Diseñando la campaña del mes ' + c.mes + ' según etapa y nivel de presupuesto…');
    try{
      const ganadores = c.banco.filter(b => b.icg >= 1.2).map(b => b.titulo + ' (ICG ' + b.icg.toFixed(2) + ')');
      const res = await AI.json(
        AI.system(['principios','etapa' + Store.etapaDe(c.mes), 'operativo'], 'Eres el media buyer del método. Diseñas la estructura publicitaria del mes actual.'),
        AI.clienteCtx(c) + '\nMes del programa: ' + c.mes + '. Creativos ganadores disponibles: ' + (ganadores.length ? JSON.stringify(ganadores) : 'ninguno aún (respeta el Principio 1: sin ICG ≥ 1.2 no hay prospección con presupuesto significativo)') +
        '\nDevuelve JSON: {"nombre":str nombre de la campaña del mes,"objetivo":str máx 15 palabras,"presupuesto":str cómo se reparte el monto del mes,"campanas":[2-4 objetos {"nombre":str,"objetivoPlataforma":str p.ej. interacción/video views/conversiones,"audiencia":str específica,"pct":str "40%","creativo":str qué pieza o derivado,"kpi":str meta numérica}],"remarketing":str máx 30 palabras públicos por temperatura y secuencia,"reglas":str máx 25 palabras (frecuencia, rotación, cuándo apagar)}', CAMPANA);
      res.id = Store.uid(); res.mes = c.mes;
      c.campanas.push(res); Store.save(); this._gen = false; App.refresh(); UI.toast('Campaña del mes diseñada');
    }catch(e){ this._gen = false; prog.innerHTML = '<div class="warn">Error: ' + UI.esc(e.message) + '</div>'; btn.disabled = false; }
  }
};


export { S_Ads };
