import { Store } from './store.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO UI — js/ui.js  · Helpers de interfaz
   ════════════════════════════════════════════════════════════════ */
const UI = {
  esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); },
  toast(msg){
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    document.getElementById('toasts').appendChild(d);
    setTimeout(() => d.remove(), 3200);
  },
  _saveT: null,
  /* M8: el indicador se limpia solo pasados unos segundos (antes
     "Guardado ✓" quedaba pegado para siempre). */
  saveDot(t, autoLimpiar){
    document.getElementById('saveDot').textContent = t || '';
    clearTimeout(this._saveT);
    if (t && autoLimpiar) this._saveT = setTimeout(() => { document.getElementById('saveDot').textContent = ''; }, 2500);
  },
  /* G5: fecha local YYYY-MM-DD (el original usaba toISOString → UTC,
     que de noche en LATAM devuelve el día siguiente). */
  hoyISO(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  },
  /* G6/G3: confirmación destructiva con modal propio (confirm() nativo
     retorna false silenciosamente dentro de iframes sandboxeados). */
  confirmar(titulo, mensajeHTML, textoBoton, onOk){
    UI.modal(titulo, '<div style="font-size:13px;margin-bottom:14px">' + mensajeHTML + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
      '<button class="btn" id="cfNo">Cancelar</button>' +
      '<button class="btn danger" id="cfSi" style="border-color:var(--red)">' + UI.esc(textoBoton) + '</button></div>',
      () => {
        document.getElementById('cfNo').onclick = UI.closeModal;
        document.getElementById('cfSi').onclick = () => { UI.closeModal(); onOk(); };
      });
  },
  _focoPrevio: null,
  _teclasModal: null,
  /* Fase 6 (accesibilidad): role=dialog + aria-modal, el foco entra al
     abrir y vuelve a su origen al cerrar, Escape cierra y Tab queda
     atrapado dentro del modal. */
  _onClose: null,
  modal(title, bodyHTML, onMount, onClose){
    const host = document.getElementById('modalHost');
    UI._onClose = onClose || null;
    UI._focoPrevio = document.activeElement;
    host.innerHTML = '<div class="modal-bg" id="mBg"><div class="modal" role="dialog" aria-modal="true" aria-label="' + this.esc(title) + '"><div class="card-h"><h3>' + this.esc(title) +
      '</h3><button class="x" id="mX" aria-label="Cerrar">✕</button></div><div class="card-b" id="mBody">' + bodyHTML + '</div></div></div>';
    document.getElementById('mX').onclick = UI.closeModal;
    document.getElementById('mBg').onclick = e => { if (e.target.id === 'mBg') UI.closeModal(); };
    UI._teclasModal = e => {
      if (e.key === 'Escape'){ e.preventDefault(); UI.closeModal(); return; }
      if (e.key !== 'Tab') return;
      const focos = host.querySelectorAll('button, input, select, textarea, [tabindex]');
      if (!focos.length) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero){ e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', UI._teclasModal);
    if (onMount) onMount();
    const primero = document.getElementById('mBody').querySelector('input, select, textarea, button');
    (primero || document.getElementById('mX')).focus();
  },
  closeModal(){
    document.getElementById('modalHost').innerHTML = '';
    if (UI._onClose){ const f = UI._onClose; UI._onClose = null; f(); }
    if (UI._teclasModal){ document.removeEventListener('keydown', UI._teclasModal); UI._teclasModal = null; }
    if (UI._focoPrevio && UI._focoPrevio.focus){ UI._focoPrevio.focus(); }
    UI._focoPrevio = null;
  },
  thinking(label){
    return '<div class="thinking"><div class="spin"></div><span>' + this.esc(label) + '</span></div>';
  },
  meter(label, val){
    const pct = Math.max(0, Math.min(10, +val || 0)) * 10;
    return '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="font-weight:600">' + this.esc(label) +
      '</span></div><div class="bar-meter"><div class="track"><i style="width:' + pct + '%"></i></div><b>' + (+val || 0) + '/10</b></div></div>';
  },
  /** Campo numérico de modal (compartido por Banco y Dashboard). */
  campoNum(id, lbl, hint){
    return '<div class="field"><label for="' + id + '">' + UI.esc(lbl) + (hint ? '<small>' + UI.esc(hint) + '</small>' : '') + '</label><input type="number" id="' + id + '" min="0" step="any" value="0"></div>';
  },
  chips(arr, cls){
    return '<div class="tag-list">' + (arr || []).map(x => '<span class="chip ' + (cls||'line') + '">' + this.esc(x) + '</span>').join('') + '</div>';
  },
  ul(arr){ return '<ul style="margin-left:16px">' + (arr||[]).map(x => '<li style="margin-bottom:4px">' + this.esc(x) + '</li>').join('') + '</ul>'; },
  fmtMoney(n){ return isFinite(+n) ? ('$' + (+n).toLocaleString('en-US', {maximumFractionDigits:0}) + ' USD') : '—'; },
  fecha(d){ return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short' }); },
  /** Gráfica de línea SVG minimalista (sin librerías). */
  svgLine(values, labels, w, h, color){
    w = w || 520; h = h || 150; color = color || 'var(--blue)';
    const vals = values.map(v => +v || 0);
    if (vals.length < 2) return '<div class="empty" style="padding:26px">Registra al menos 2 semanas para ver la tendencia.</div>';
    const max = Math.max.apply(null, vals) * 1.12 || 1;
    const px = i => 34 + i * ((w - 46) / (vals.length - 1));
    const py = v => (h - 24) - (v / max) * (h - 40);
    const pts = vals.map((v,i) => px(i) + ',' + py(v)).join(' ');
    let g = '<svg class="chart" role="img" aria-label="Gráfica de tendencia semanal" viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto">';
    for (let k = 0; k <= 3; k++){
      const y = 16 + k * ((h - 40) / 3);
      g += '<line x1="34" x2="' + (w-10) + '" y1="' + y + '" y2="' + y + '" stroke="#EDEFF3"/>';
      g += '<text x="30" y="' + (y+3) + '" text-anchor="end">' + Math.round(max * (1 - k/3)).toLocaleString() + '</text>';
    }
    g += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>';
    vals.forEach((v,i) => {
      g += '<circle cx="' + px(i) + '" cy="' + py(v) + '" r="3" fill="' + color + '"/>';
      g += '<text x="' + px(i) + '" y="' + (h-6) + '" text-anchor="middle">' + UI.esc(labels[i] || '') + '</text>';
    });
    return g + '</svg>';
  }
};

/** Campo de formulario (helper de las pantallas). */
function F(id, label, type, opts){
  opts = opts || {};
  const c = Store.client(); const v = c ? (c.intake[id] != null ? c.intake[id] : '') : '';
  let inner;
  const fid = 'f-' + id;
  if (type === 'ta') inner = '<textarea id="' + fid + '" data-f="' + id + '" placeholder="' + UI.esc(opts.ph||'') + '">' + UI.esc(v) + '</textarea>';
  else if (type === 'sel') inner = '<select id="' + fid + '" data-f="' + id + '">' + opts.opciones.map(o => '<option' + (v===o?' selected':'') + '>' + UI.esc(o) + '</option>').join('') + '</select>';
  else inner = '<input id="' + fid + '" data-f="' + id + '" type="' + (type||'text') + '" value="' + UI.esc(v) + '" placeholder="' + UI.esc(opts.ph||'') + '">';
  return '<div class="field"><label for="' + fid + '">' + UI.esc(label) + (opts.hint ? '<small>' + UI.esc(opts.hint) + '</small>' : '') + '</label>' + inner + '</div>';
}


export { UI, F };
