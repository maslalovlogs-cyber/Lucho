import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';
import { ICG } from '../icg.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S6 — js/screens/banco.js · PANTALLA 6: Banco de Ganadores
   Registro de piezas publicadas → cálculo automático del ICG
   (medianas móviles) → clasificación → replicar con IA (Regla de 3).
   ════════════════════════════════════════════════════════════════ */
const S_Banco = {
  title: 'Banco de Ganadores',
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    const modoVenta = Store.etapaDe(c.mes) === 3;
    const ganadores = c.banco.filter(b => b.icg >= 1.2);
    const prom = c.banco.length ? (c.banco.reduce((s,b) => s + b.icg, 0) / c.banco.length) : 0;
    let html = '<div class="h-page"><div><h2>Banco de Contenido Ganador</h2><p>Registra cada pieza a las 72 h y a los 7 días. El ICG se calcula contra la mediana móvil de tus últimas 15 piezas — la decisión es del dato, no del gusto.' +
      (modoVenta ? ' <b>Mes 6: ICG en modo venta</b> (componente de conversión con peso 0.30).' : '') + '</p></div>' +
      '<button class="btn pri" id="bReg">+ Registrar pieza</button></div>';

    html += '<div class="grid4" style="margin-bottom:18px">' +
      '<div class="card kpi"><div class="lbl">Piezas registradas</div><div class="val">' + c.banco.length + '</div></div>' +
      '<div class="card kpi"><div class="lbl">ICG promedio</div><div class="val" style="color:' + (prom >= 1 ? 'var(--green)' : 'var(--text)') + '">' + (prom ? prom.toFixed(2) : '—') + '</div></div>' +
      '<div class="card kpi"><div class="lbl">Ganadoras (≥ 1.2)</div><div class="val">' + ganadores.length + '</div></div>' +
      '<div class="card kpi"><div class="lbl">Estructuras certificadas</div><div class="val">' + ICG.estructuras(c.banco).filter(e => e.certificada).length + '</div><div class="sub">Regla de 3: tres piezas ≥ 1.3</div></div></div>';

    if (c.banco.length < 5) html += '<div class="note">Con menos de 5 piezas registradas las medianas aún son inestables; el método pide un mes de datos antes de podar nada.</div>';
    html += '<div id="bProg"></div>';

    if (!c.banco.length){
      html += '<div class="card"><div class="empty"><div class="art">ICG</div><h4>El banco está vacío</h4><p>Cuando publiques una pieza del calendario, registra aquí sus métricas y el sistema calculará su ICG y la clasificará automáticamente.</p></div></div>';
    } else {
      html += '<div class="card"><div class="card-h"><h3>Registro y clasificación</h3><span class="hint">ordenado por ICG</span></div><div class="card-b" style="padding:0"><table class="tb"><tr><th>Pieza</th><th>Formato · Pilar</th><th>ICG</th><th>Clase</th><th>Acción del método</th><th></th></tr>' +
        c.banco.slice().sort((a,b) => b.icg - a.icg).map(b => {
          const cl = ICG.clase(b.icg);
          return '<tr><td><b>' + UI.esc(b.titulo) + '</b><div style="font-size:11px;color:var(--faint)">' + UI.esc(b.estructura||'') + '</div></td>' +
            '<td style="font-size:12px;color:var(--muted)">' + UI.esc(b.formato) + ' · ' + UI.esc(b.pilar||'—') + '</td>' +
            '<td><span class="icg-hero" style="font-size:17px">' + b.icg.toFixed(2) + '</span></td>' +
            '<td><span class="chip ' + cl.c + '">' + cl.t + '</span></td>' +
            '<td style="font-size:12px;color:var(--muted)">' + cl.accion + '</td>' +
            '<td style="white-space:nowrap">' + (b.icg >= 1.2 ? '<button class="btn sm" data-rep="' + b.id + '">Replicar ×3</button> ' : '') +
            '<button class="btn sm ghost danger" data-delb="' + b.id + '">✕</button></td></tr>';
        }).join('') + '</table></div></div>';

      const est = ICG.estructuras(c.banco).filter(e => e.n >= 2);
      if (est.length){
        html += '<div class="card" style="margin-top:16px"><div class="card-h"><h3>Estructuras (Regla de 3)</h3><span class="hint">una estructura se certifica con 3 piezas ≥ 1.3</span></div><div class="card-b" style="padding:0"><table class="tb"><tr><th>Estructura</th><th>Piezas</th><th>ICG medio</th><th>Estado</th></tr>' +
          est.map(e => '<tr><td><b>' + UI.esc(e.k) + '</b></td><td class="num">' + e.n + '</td><td class="num">' + e.prom.toFixed(2) + '</td><td>' +
            (e.certificada ? '<span class="chip gold">Certificada ✓</span>' : (e.promete ? '<span class="chip green">Promete · faltan ' + (3 - e.cumplen) + ' pieza(s) ≥ 1.3</span>' : '<span class="chip gray">En observación</span>')) + '</td></tr>').join('') + '</table></div></div>';
      }
    }
    el.innerHTML = html;
    document.getElementById('bReg').onclick = () => this.formulario(c);
    el.querySelectorAll('[data-delb]').forEach(b => b.onclick = () => {
      c.banco = c.banco.filter(x => x.id !== b.dataset.delb);
      Store.save(); App.refresh();
    });
    el.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => this.replicar(c, b.dataset.rep));
  },
  formulario(c){
    const publicadas = c.calendario.filter(k => k.publicado && !c.banco.some(b => b.calId === k.id));
    const num = (id, lbl, hint) => '<div class="field"><label>' + lbl + (hint ? '<small>' + hint + '</small>' : '') + '</label><input type="number" id="' + id + '" min="0" step="any" value="0"></div>';
    UI.modal('Registrar pieza publicada',
      (publicadas.length ? '<div class="field"><label>Pieza del calendario<small>o escribe una libre abajo</small></label><select id="rCal"><option value="">— libre —</option>' +
        publicadas.map(p => '<option value="' + p.id + '">' + UI.esc(p.titulo) + '</option>').join('') + '</select></div>' : '') +
      '<div class="field"><label>Título</label><input id="rTit" placeholder="nombre de la pieza"></div>' +
      '<div class="fgrid c2">' +
      '<div class="field"><label>Formato</label><select id="rFmt"><option>Reel</option><option>Carrusel</option><option>Historia</option><option>Post</option><option>Live</option><option>Anuncio</option></select></div>' +
      '<div class="field"><label>Pilar</label><input id="rPil" placeholder="p. ej. Educación"></div></div>' +
      '<div class="field"><label>Estructura<small>gancho + desarrollo replicable; agrupa piezas para la Regla de 3</small></label><input id="rEst" placeholder="p. ej. &quot;5 formas de usar X&quot;"></div>' +
      '<div class="fs-title">Métricas a 7 días</div><div class="fgrid">' +
      num('rAl','Alcance') + num('rRet','Retención %','promedio del video') + num('rCom','Compartidos') +
      num('rGua','Guardados') + num('rVis','Visitas a perfil') + num('rCli','Clics') +
      num('rDm','DMs iniciados') + num('rConv','Conversiones','ventas/leads atribuidos') + '</div>' +
      '<button class="btn pri" id="rOk" style="width:100%">Calcular ICG y guardar</button>',
      () => {
        const sel = document.getElementById('rCal');
        if (sel) sel.onchange = () => {
          const p = publicadas.find(x => x.id === sel.value);
          if (p){ document.getElementById('rTit').value = p.titulo; document.getElementById('rPil').value = p.pilar || ''; }
        };
        document.getElementById('rOk').onclick = () => {
          const g = id => +document.getElementById(id).value || 0;
          const pieza = { id: Store.uid(), calId: sel ? sel.value : '', fecha: UI.hoyISO(),
            titulo: document.getElementById('rTit').value || 'Pieza sin título',
            formato: document.getElementById('rFmt').value, pilar: document.getElementById('rPil').value,
            estructura: document.getElementById('rEst').value,
            metricas: { alcance:g('rAl'), retencion:Math.min(100, g('rRet')), compartidos:g('rCom'), guardados:g('rGua'), visitas:g('rVis'), clics:g('rCli'), dms:g('rDm'), conversiones:g('rConv') } };
          /* M1: el ICG se calcula UNA vez, contra las piezas registradas
             ANTES (c.banco todavía no incluye esta) y queda fijo.
             M2: en Etapa 3 el modo venta aplica a TODAS las piezas del
             mes, tengan o no conversiones (antes se mezclaban fórmulas). */
          const modoVenta = Store.etapaDe(c.mes) === 3;
          pieza.icgModo = modoVenta ? 'venta' : 'organico';
          pieza.icg = ICG.calc(c.banco, pieza, modoVenta);
          c.banco.push(pieza);
          Store.save(); UI.closeModal(); App.refresh();
          const cl = ICG.clase(pieza.icg);
          UI.toast('ICG ' + pieza.icg.toFixed(2) + ' · ' + cl.t);
        };
      });
  },
  async replicar(c, id){
    const b = c.banco.find(x => x.id === id); if (!b) return;
    const prog = document.getElementById('bProg');
    // G4: evitar réplicas duplicadas por doble clic
    document.querySelectorAll('[data-rep]').forEach(x => { x.disabled = true; });
    const nuevas = [];
    try{
      for (let i = 1; i <= 3; i++){
        prog.innerHTML = UI.thinking('Regla de 3 · réplica ' + i + ' de 3 de la estructura ganadora…');
        const it = await AI.json(
          AI.system(['principios','icg','formatos','algoritmos'], 'Aplicas la Regla de 3: replicas UNA vez una estructura ganadora con un tema distinto, manteniendo gancho y desarrollo.'),
          AI.clienteCtx(c) + '\nEstructura ganadora: ' + JSON.stringify({ titulo:b.titulo, formato:b.formato, pilar:b.pilar, estructura:b.estructura, icg:b.icg }) +
          '\nNo repitas: ' + JSON.stringify(c.historial.slice(-30).concat(nuevas)) +
          '\nDevuelve JSON (UN solo objeto): {"titulo":str,"formato":str,"pilar":str,"plataforma":str,"etapa":str,"gancho":str,"guion":str 4-6 líneas con \\n,"cta":str,"objPsico":str,"objAlgoritmo":str,"duracion":str,"edicion":str,"plano":str,"miniatura":str,"hashtags":[3-5],"keyword":str,"musica":str,"icgEsperado":str}');
        it.id = Store.uid(); it.creado = new Date().toISOString();
        c.contenidos.push(it); c.historial.push(it.titulo); nuevas.push(it.titulo);
        Store.save();
      }
      prog.innerHTML = ''; UI.toast('3 réplicas listas en Contenido'); App.go('con');
    }catch(e){
      prog.innerHTML = '<div class="warn">Error: ' + UI.esc(e.message) + (nuevas.length ? ' · Se guardaron ' + nuevas.length + ' réplica(s) en Contenido.' : '') + '</div>';
      document.querySelectorAll('[data-rep]').forEach(x => { x.disabled = false; });
    }
  }
};


export { S_Banco };
