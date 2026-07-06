import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';
import { DX1, DX2, DX3 } from '../schemas.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S2 — js/screens/diagnostico.js · PANTALLA 2: Diagnóstico
   La IA analiza la ficha con el método en 3 pasos encadenados:
   1) FODA + dolores/deseos/objeciones + preguntas inteligentes
   2) Buyer persona + mapa de empatía
   3) Niveles, probabilidad de éxito y Matriz de Adaptación
   ════════════════════════════════════════════════════════════════ */
const S_Dx = {
  title: 'Diagnóstico',
  faltantes(c){
    const req = { empresa:'empresa', industria:'industria', objetivos:'objetivos', presupuesto:'presupuesto mensual', precioProm:'precio promedio', ciudad:'ciudad', tipo:'tipo de negocio' };
    return Object.keys(req).filter(k => !c.intake[k]).map(k => req[k]);
  },
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    const d = c.diagnostico;
    let html = '<div class="h-page"><div><h2>Diagnóstico</h2><p>Análisis del negocio con las lentes del método: FODA, buyer persona, mapa de empatía, niveles y configuración de la Matriz de Adaptación.</p></div>' +
      '<button class="btn pri" id="bGen"' + (this._gen ? ' disabled' : '') + '>' + (d ? 'Regenerar diagnóstico' : 'Generar diagnóstico') + '</button></div>';

    const falta = this.faltantes(c);
    if (falta.length) html += '<div class="warn"><b>Ficha incompleta:</b> falta ' + falta.join(', ') + '. Puedes generar igual — la IA marcará sus supuestos y hará preguntas inteligentes.</div>';
    html += '<div id="dxProg"></div>';

    if (!d){
      html += '<div class="card"><div class="empty"><div class="art">Dx</div><h4>Aún no hay diagnóstico</h4><p>La IA leerá la ficha completa y la analizará exclusivamente con el Método 3·2·1.</p></div></div>';
    } else {
      if (d.preguntas && d.preguntas.length){
        html += '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Preguntas inteligentes</h3><span class="hint">responderlas afina la estrategia</span></div><div class="card-b">' + UI.ul(d.preguntas) + '</div></div>';
      }
      html += '<div class="grid2" style="margin-bottom:16px"><div class="card"><div class="card-h"><h3>Probabilidad de éxito</h3><span class="hint">a 6 meses, ejecutando el método</span></div><div class="card-b"><div class="gauge">' +
        '<span class="num" style="color:var(--blue)">' + (d.probabilidad||0) + '%</span><p style="font-size:12.5px;color:var(--muted)">' + UI.esc(d.probabilidadNota||'') + '</p></div></div></div>' +
        '<div class="card"><div class="card-h"><h3>Niveles actuales</h3><span class="hint">0–10</span></div><div class="card-b">' +
        UI.meter('Competencia del mercado', d.niveles && d.niveles.competencia) +
        UI.meter('Autoridad', d.niveles && d.niveles.autoridad) +
        UI.meter('Contenido', d.niveles && d.niveles.contenido) +
        UI.meter('Marca', d.niveles && d.niveles.marca) +
        UI.meter('Ventas', d.niveles && d.niveles.ventas) +
        UI.meter('Confianza', d.niveles && d.niveles.confianza) +
        '</div></div></div>';

      if (d.matriz){
        html += '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Matriz de Adaptación</h3><span class="hint">variables que configuran todo el semestre</span></div><div class="card-b"><div class="meta-grid">' +
          '<div class="m"><b>Plataforma primaria</b><span>' + UI.esc(d.matriz.plataformaPrimaria) + '</span></div>' +
          '<div class="m"><b>Secundaria</b><span>' + UI.esc(d.matriz.plataformaSecundaria) + '</span></div>' +
          '<div class="m"><b>CTA principal</b><span>' + UI.esc(d.matriz.ctaPrincipal) + '</span></div>' +
          '<div class="m"><b>Ciclo de venta</b><span>' + UI.esc(d.matriz.cicloVenta) + '</span></div></div>' +
          '<div style="margin-top:12px"><b style="font-size:12px">Los 4 pilares de contenido</b><div style="margin-top:6px">' + UI.chips(d.matriz.pilares, 'blue') + '</div></div>' +
          (d.matriz.particularidades ? '<p style="font-size:12.5px;color:var(--muted);margin-top:10px">' + UI.esc(d.matriz.particularidades) + '</p>' : '') +
          '</div></div>';
      }

      if (d.foda){
        html += '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Análisis FODA</h3></div><div class="card-b"><div class="foda">' +
          '<div class="q"><h5><span class="chip green">F</span>Fortalezas</h5>' + UI.ul(d.foda.fortalezas) + '</div>' +
          '<div class="q"><h5><span class="chip blue">O</span>Oportunidades</h5>' + UI.ul(d.foda.oportunidades) + '</div>' +
          '<div class="q"><h5><span class="chip amber">D</span>Debilidades</h5>' + UI.ul(d.foda.debilidades) + '</div>' +
          '<div class="q"><h5><span class="chip red">A</span>Amenazas</h5>' + UI.ul(d.foda.amenazas) + '</div></div></div></div>';
      }

      html += '<div class="grid3" style="margin-bottom:16px">' +
        '<div class="card"><div class="card-h"><h3>Dolores</h3></div><div class="card-b">' + UI.ul(d.dolores) + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Deseos</h3></div><div class="card-b">' + UI.ul(d.deseos) + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Objeciones</h3></div><div class="card-b">' + UI.ul(d.objeciones) + '</div></div></div>';

      if (d.persona){
        html += '<div class="grid2"><div class="card"><div class="card-h"><h3>Buyer persona</h3></div><div class="card-b">' +
          '<b style="font-size:15px">' + UI.esc(d.persona.nombre||'') + '</b> <span class="chip gray">' + UI.esc(d.persona.edad||'') + '</span>' +
          '<p style="font-size:13px;margin:8px 0">' + UI.esc(d.persona.contexto||'') + '</p><div class="meta-grid">' +
          '<div class="m"><b>Ocupación</b><span>' + UI.esc(d.persona.ocupacion||'') + '</span></div>' +
          '<div class="m"><b>Dolor principal</b><span>' + UI.esc(d.persona.dolorPrincipal||'') + '</span></div>' +
          '<div class="m"><b>Motivación</b><span>' + UI.esc(d.persona.motivacion||'') + '</span></div>' +
          '<div class="m"><b>Dónde vive digitalmente</b><span>' + UI.esc(d.persona.canales||'') + '</span></div></div></div></div>';
        const e = d.empatia || {};
        html += '<div class="card"><div class="card-h"><h3>Mapa de empatía</h3></div><div class="card-b"><div class="meta-grid" style="grid-template-columns:1fr 1fr">' +
          '<div class="m"><b>Piensa y siente</b><span>' + UI.esc(e.piensaSiente||'') + '</span></div>' +
          '<div class="m"><b>Ve</b><span>' + UI.esc(e.ve||'') + '</span></div>' +
          '<div class="m"><b>Oye</b><span>' + UI.esc(e.oye||'') + '</span></div>' +
          '<div class="m"><b>Dice y hace</b><span>' + UI.esc(e.diceHace||'') + '</span></div>' +
          '<div class="m"><b>Esfuerzos (frustraciones)</b><span>' + UI.esc(e.esfuerzos||'') + '</span></div>' +
          '<div class="m"><b>Resultados (lo que quiere lograr)</b><span>' + UI.esc(e.resultados||'') + '</span></div>' +
          '</div></div></div></div>';
      }
    }
    el.innerHTML = html;
    document.getElementById('bGen').onclick = () => this.generar(c);
  },
  async generar(c){
    const prog = document.getElementById('dxProg');
    const btn = document.getElementById('bGen'); btn.disabled = true;
    this._gen = true; // sobrevive a re-renders: render() respeta este flag
    const falta = this.faltantes(c);
    try{
      prog.innerHTML = UI.thinking('Paso 1/3 · FODA, dolores, deseos y objeciones…');
      const p1 = await AI.json(
        AI.system(['principios','matriz','evitar'], 'Estás haciendo el diagnóstico de onboarding (Semana 0).'),
        AI.clienteCtx(c) + (falta.length ? '\nCampos sin responder: ' + falta.join(', ') + '.' : '') +
        '\nDevuelve JSON: {"foda":{"fortalezas":[3-4 str],"oportunidades":[3-4],"debilidades":[3-4],"amenazas":[3]},"dolores":[4 str cortos del cliente final],"deseos":[4],"objeciones":[4],"preguntas":[2-4 preguntas inteligentes SOLO sobre información faltante o ambigua de la ficha; si nada falta, []]}. Frases de máx 14 palabras.', DX1);
      prog.innerHTML = UI.thinking('Paso 2/3 · Buyer persona y mapa de empatía…');
      const p2 = await AI.json(
        AI.system(['principios','matriz'], 'Construyes el buyer persona del onboarding.'),
        AI.clienteCtx(c) + '\nDolores detectados: ' + JSON.stringify(p1.dolores) +
        '\nDevuelve JSON: {"persona":{"nombre":str,"edad":str,"ocupacion":str,"contexto":str máx 30 palabras,"dolorPrincipal":str,"motivacion":str,"canales":str},"empatia":{"piensaSiente":str,"ve":str,"oye":str,"diceHace":str,"esfuerzos":str,"resultados":str}}. Cada campo de empatía máx 15 palabras.', DX2);
      prog.innerHTML = UI.thinking('Paso 3/3 · Niveles, probabilidad y Matriz de Adaptación…');
      const p3 = await AI.json(
        AI.system(['principios','matriz','algoritmos','etapa1'], 'Cierras el diagnóstico configurando la Matriz de Adaptación del método para este negocio.'),
        AI.clienteCtx(c) +
        '\nDevuelve JSON: {"niveles":{"competencia":0-10,"autoridad":0-10,"contenido":0-10,"marca":0-10,"ventas":0-10,"confianza":0-10},"probabilidad":40-95,"probabilidadNota":str máx 22 palabras justificando,"matriz":{"plataformaPrimaria":str,"plataformaSecundaria":str,"pilares":[4 pilares concretos para ESTE negocio],"ctaPrincipal":str,"cicloVenta":str,"particularidades":str máx 25 palabras (regulación, ética, estacionalidad si aplica)}}', DX3);
      c.diagnostico = Object.assign({}, p1, p2, p3);
      this._gen = false;
      Store.save(); App.refresh(); UI.toast('Diagnóstico generado con el Método 3·2·1');
    }catch(e){
      this._gen = false;
      prog.innerHTML = '<div class="warn">No se pudo completar el diagnóstico: ' + UI.esc(e.message) + '. Intenta de nuevo.</div>';
      btn.disabled = false;
    }
  }
};


export { S_Dx };
