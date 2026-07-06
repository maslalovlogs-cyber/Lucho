import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S4 — js/screens/contenido.js · PANTALLA 4: Contenido
   Generador de piezas completas (gancho, guion, CTA, psicología,
   algoritmo, edición, SEO…). Nunca repite ideas: el historial de
   títulos viaja en cada prompt.
   ════════════════════════════════════════════════════════════════ */
const S_Contenido = {
  title: 'Contenido',
  FORMATOS: ['Automático (decide el método)','Reel','Carrusel','Historias (secuencia)','Post','Live','Colaboración','UGC','Serie','Storytelling','Ranking','POV','Errores comunes','Antes y después','Caso real','Mini documental','Mitos y verdades','Comparativa','FAQ','Opinión impopular','Cómo lo hacemos','Un día en','Tendencia adaptada'],
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    const pilares = (c.diagnostico && c.diagnostico.matriz && c.diagnostico.matriz.pilares) || ['Educación / Utilidad','Entretenimiento / Identidad','Conexión / Humano','Prueba / Producto'];
    let html = '<div class="h-page"><div><h2>Contenido</h2><p>Cada pieza sale con gancho, guion completo, CTA, objetivo psicológico, objetivo de algoritmo, edición, SEO y su ICG esperado — lista para programar en el calendario.</p></div></div>';
    if (!c.diagnostico) html += '<div class="warn">Sin diagnóstico, la IA no conoce los pilares ni la plataforma primaria. <b>Recomendado: genera el diagnóstico primero.</b></div>';

    html += '<div class="card" style="margin-bottom:18px"><div class="card-b"><div class="fgrid" style="grid-template-columns:1.2fr 1.2fr 1fr .7fr auto;align-items:end">' +
      '<div class="field"><label>Pilar</label><select id="gPilar"><option>Automático (mix de la etapa)</option>' + pilares.map(p => '<option>' + UI.esc(p) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Formato</label><select id="gFmt">' + this.FORMATOS.map(f => '<option>' + UI.esc(f) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Plataforma</label><select id="gPlat"><option>La primaria del cliente</option><option>Instagram</option><option>TikTok</option><option>Facebook</option></select></div>' +
      '<div class="field"><label>Piezas</label><select id="gN"><option>2</option><option>3</option></select></div>' +
      '<div class="field"><button class="btn pri" id="bGenC" style="width:100%">Generar ideas</button></div>' +
      '</div><div id="cProg"></div>' +
      '<p style="font-size:11.5px;color:var(--faint)">El generador respeta el mix de la etapa actual (mes ' + c.mes + ' → Etapa ' + Store.etapaDe(c.mes) + '), la biblioteca de formatos del método y las prácticas prohibidas. No repite ideas ya generadas (' + c.historial.length + ' en el historial).</p>' +
      '</div></div>';

    if (!c.contenidos.length){
      html += '<div class="card"><div class="empty"><div class="art">✦</div><h4>Biblioteca vacía</h4><p>Genera tu primer lote de contenido fundamentado en el Método 3·2·1.</p></div></div>';
    } else {
      html += c.contenidos.slice().reverse().map(it => this.cardPieza(it)).join('');
    }
    el.innerHTML = html;
    document.getElementById('bGenC').onclick = () => this.generar(c);
    el.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => this.programar(c, b.dataset.prog));
    el.querySelectorAll('[data-delc]').forEach(b => b.onclick = () => {
      c.contenidos = c.contenidos.filter(x => x.id !== b.dataset.delc); Store.save(); App.refresh();
    });
  },
  cardPieza(it){
    const m = (k,v) => v ? '<div class="m"><b>' + k + '</b><span>' + UI.esc(v) + '</span></div>' : '';
    return '<details class="acc"><summary><span class="chip blue">' + UI.esc(it.formato) + '</span><span class="chip line">' + UI.esc(it.pilar||'') + '</span> ' + UI.esc(it.titulo) +
      '<span class="car">▶</span></summary><div class="acc-b">' +
      '<p style="margin:6px 0 10px"><b>Gancho (0–3 s):</b> ' + UI.esc(it.gancho) + '</p>' +
      '<div class="script">' + UI.esc(it.guion) + '</div>' +
      '<p style="margin:10px 0"><b>CTA:</b> ' + UI.esc(it.cta) + '</p>' +
      '<div class="meta-grid">' +
      m('Objetivo psicológico', it.objPsico) + m('Objetivo del algoritmo', it.objAlgoritmo) +
      m('Duración', it.duracion) + m('Edición', it.edicion) + m('Plano / grabación', it.plano) +
      m('Miniatura / portada', it.miniatura) + m('Keyword SEO', it.keyword) + m('Música', it.musica) +
      m('Hashtags', (it.hashtags||[]).join(' ')) + m('ICG esperado', it.icgEsperado) +
      m('Plataforma', it.plataforma) + m('Etapa', it.etapa) +
      '</div><div style="display:flex;gap:8px;margin-top:14px">' +
      '<button class="btn sm pri" data-prog="' + it.id + '">Programar en calendario</button>' +
      '<button class="btn sm ghost danger" data-delc="' + it.id + '">Eliminar</button></div></div></details>';
  },
  async generar(c){
    const prog = document.getElementById('cProg');
    const btn = document.getElementById('bGenC'); btn.disabled = true;
    const pilar = document.getElementById('gPilar').value, fmt = document.getElementById('gFmt').value,
          plat = document.getElementById('gPlat').value, n = +document.getElementById('gN').value;
    const nuevas = [];
    try{
      for (let i = 1; i <= n; i++){
        prog.innerHTML = UI.thinking('Diseñando pieza ' + i + ' de ' + n + ' con las estructuras del método…');
        const it = await AI.json(
          AI.system(['principios','algoritmos','formatos','evitar','operativo'], 'Diseñas UNA pieza de contenido lista para producir.'),
          AI.clienteCtx(c) +
          '\nPedido: 1 pieza. Pilar: ' + pilar + '. Formato: ' + fmt + '. Plataforma: ' + plat + '.' +
          ((c.historial.length || nuevas.length) ? '\nNO repitas ninguna de estas ideas ya usadas: ' + JSON.stringify(c.historial.slice(-40).concat(nuevas)) : '') +
          (c.banco.filter(b => b.icg >= 1.2).length ? '\nPrioriza variaciones de las estructuras ganadoras del Banco (Regla de 3).' : '') +
          '\nDevuelve JSON (UN solo objeto): {"titulo":str,"formato":str,"pilar":str,"plataforma":str,"etapa":"Etapa 1|2|3","gancho":str literal para decir/mostrar en 0-3s con la keyword,"guion":str guion completo con marcas de tiempo y qué se ve/dice (5-8 líneas, usa \\n),"cta":str un solo CTA del método,"objPsico":str máx 8 palabras,"objAlgoritmo":str señal que fabrica máx 8 palabras,"duracion":str,"edicion":str máx 12 palabras,"plano":str máx 10 palabras,"miniatura":str máx 12 palabras,"hashtags":[3-5 con #],"keyword":str,"musica":str máx 8 palabras,"icgEsperado":str p.ej "1.2-1.4 (gancho de aversión a la pérdida)"}. Guion específico de ESTE negocio con sus productos y ciudad reales.');
        it.id = Store.uid(); it.creado = new Date().toISOString();
        c.contenidos.push(it); c.historial.push(it.titulo); nuevas.push(it.titulo);
        Store.save();
      }
      App.refresh(); UI.toast(n + ' piezas nuevas en la biblioteca');
    }catch(e){
      App.refresh();
      UI.toast('Error al generar' + (nuevas.length ? ' (se guardaron ' + nuevas.length + ' piezas)' : '') + ': ' + e.message);
    }
  },
  programar(c, id){
    const it = c.contenidos.find(x => x.id === id); if (!it) return;
    const hoy = UI.hoyISO(); // G5: fecha local, no UTC
    UI.modal('Programar pieza', '<div class="field"><label>Fecha de publicación</label><input type="date" id="pFecha" value="' + hoy + '"></div>' +
      '<button class="btn pri" id="pOk" style="width:100%">Agregar al calendario</button>', () => {
      document.getElementById('pOk').onclick = () => {
        c.calendario.push({ id: Store.uid(), contenidoId: it.id, titulo: it.titulo, formato: it.formato, pilar: it.pilar, fecha: document.getElementById('pFecha').value, publicado: false });
        Store.save(); UI.closeModal(); UI.toast('Programado'); App.go('cal');
      };
    });
  }
};


export { S_Contenido };
