import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { KB } from '../kb.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S10 — js/screens/metodo.js · Base de conocimiento,
   módulos de actualización (nuevas plataformas / algoritmos) y
   respaldo de datos. Aquí se actualiza el sistema sin tocar código.
   ════════════════════════════════════════════════════════════════ */
const S_Metodo = {
  title: 'Método y actualizaciones',
  render(el){
    let html = '<div class="h-page"><div><h2>Método 3·2·1 · v' + KB.version + '</h2><p>La base de conocimiento gobierna cada respuesta de la IA. Agrega módulos para nuevas plataformas (TikTok Shop, Threads, YouTube, Pinterest, LinkedIn), cambios de algoritmo o nuevas fórmulas — sin romper la aplicación.</p></div></div>';

    html += '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>Módulos de actualización</h3><span class="hint">se inyectan en todas las llamadas de IA; el más reciente manda</span></div><div class="card-b">';
    const mods = Store.data.modules || [];
    if (mods.length){
      html += '<table class="tb" style="margin-bottom:14px"><tr><th>Módulo</th><th>Fecha</th><th>Reglas</th><th></th></tr>' +
        mods.map(m => '<tr><td><b>' + UI.esc(m.nombre) + '</b></td><td class="num">' + UI.esc(m.fecha) + '</td><td style="font-size:12px;color:var(--muted)">' + UI.esc((m.reglas||'').slice(0,140)) + ((m.reglas||'').length > 140 ? '…' : '') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn sm" data-tog="' + m.id + '">' + (m.activo === false ? 'Activar' : 'Pausar') + '</button> <button class="btn sm ghost danger" data-delmod="' + m.id + '">✕</button></td></tr>').join('') + '</table>';
    } else {
      html += '<p style="color:var(--faint);font-size:13px;margin-bottom:14px">Sin módulos. Ejemplo: "TikTok Shop — los videos con producto etiquetado entran a superficies de compra; CTA directo al carrito; comisión X%…"</p>';
    }
    html += '<div class="fgrid" style="grid-template-columns:1fr 2fr auto;align-items:end">' +
      '<div class="field"><label>Nombre del módulo</label><input id="modNom" placeholder="p. ej. TikTok Shop · Q3 2026"></div>' +
      '<div class="field"><label>Reglas nuevas</label><input id="modReg" placeholder="qué cambia, qué se prioriza, qué se prohíbe…"></div>' +
      '<div class="field"><button class="btn pri" id="bMod">Agregar módulo</button></div></div></div></div>';

    html += '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>Notas internas de la agencia</h3><span class="hint">criterios propios que la IA debe respetar siempre</span></div><div class="card-b">' +
      '<div class="field"><textarea id="kbNotas" style="min-height:90px" placeholder="p. ej. Nunca proponer sorteos; el tono de la agencia es directo y sin emojis…">' + UI.esc(Store.data.kbNotes || '') + '</textarea></div>' +
      '<button class="btn" id="bNotas">Guardar notas</button></div></div>';

    html += '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>Base de conocimiento activa</h3><span class="hint">extractos del documento oficial que usa la IA</span></div><div class="card-b">' +
      Object.keys(KB.sec).map(k => '<details class="acc"><summary style="font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.05em">' + k + '<span class="car">▶</span></summary><div class="acc-b"><div class="script">' + UI.esc(KB.sec[k]) + '</div></div></details>').join('') +
      '</div></div>';

    html += '<div class="card"><div class="card-h"><h3>Datos</h3></div><div class="card-b" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button class="btn" id="bExp">Exportar respaldo (JSON)</button>' +
      '<label class="btn" style="position:relative;overflow:hidden">Importar respaldo<input type="file" id="bImp" accept=".json" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
      '<span class="storage-hint">' + (Store.persistente ? 'Persistencia activa: tus datos se guardan automáticamente en este espacio.' : 'Este entorno no tiene almacenamiento persistente: exporta tu respaldo al terminar.') + '</span></div></div>';

    el.innerHTML = html;
    document.getElementById('bMod').onclick = () => {
      const n = document.getElementById('modNom').value.trim(), r = document.getElementById('modReg').value.trim();
      if (!n || !r){ UI.toast('Completa nombre y reglas'); return; }
      Store.data.modules.push({ id: Store.uid(), nombre:n, reglas:r, fecha: UI.hoyISO(), activo:true });
      Store.save(); App.refresh(); UI.toast('Módulo agregado a la base de conocimiento');
    };
    document.getElementById('bNotas').onclick = () => {
      Store.data.kbNotes = document.getElementById('kbNotas').value; Store.save(); UI.toast('Notas guardadas');
    };
    document.getElementById('bExp').onclick = () => Store.exportar();
    document.getElementById('bImp').onchange = e => { if (e.target.files[0]) Store.importar(e.target.files[0]); };
    el.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
      const m = Store.data.modules.find(x => x.id === b.dataset.tog);
      m.activo = m.activo === false ? true : false; Store.save(); App.refresh();
    });
    el.querySelectorAll('[data-delmod]').forEach(b => b.onclick = () => {
      Store.data.modules = Store.data.modules.filter(x => x.id !== b.dataset.delmod); Store.save(); App.refresh();
    });
  }
};


export { S_Metodo };
