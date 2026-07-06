import { UI } from './ui.js';
import { App } from './app.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO STORE — js/store.js
   Estado central + persistencia.

   Fase 2 (arquitectura): la persistencia original usaba
   `window.storage`, una API exclusiva del sandbox donde se generó
   la app (inexistente en navegadores). Se reemplaza por IndexedDB
   con degradación a localStorage y, en último caso, solo memoria.
   La forma de los datos y el resto de la lógica (nuevoCliente,
   normaliza, exportar, importar) se conservan idénticas al original.
   ════════════════════════════════════════════════════════════════ */

const DB_NAME = 'm321';
const DB_STORE = 'kv';
const DATA_KEY = 'm321:data';

function idbOpen(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbGet(key){
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => { resolve(req.result); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  }));
}
function idbSet(key, value){
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => { resolve(); db.close(); };
    tx.onerror = () => { reject(tx.error); db.close(); };
  }));
}

const Store = {
  data: { clients: [], activeId: null, modules: [], kbNotes: '' },
  persistente: false,
  uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); },

  nuevoCliente(){
    return { id: this.uid(), creado: new Date().toISOString(), mes: 1,
      intake: {}, diagnostico: null, estrategia: { e1:null, e2:null, e3:null },
      contenidos: [], calendario: [], banco: [], campanas: [], autos: [],
      metricas: [], historial: [] };
  },
  client(){ return this.data.clients.find(c => c.id === this.data.activeId) || null; },
  etapaDe(mes){ return mes <= 3 ? 1 : (mes <= 5 ? 2 : 3); },

  async load(){
    try{
      let raw = null;
      if (typeof indexedDB !== 'undefined'){
        raw = await idbGet(DATA_KEY);
        // migración desde localStorage si IDB está vacío pero hubo datos previos
        if (raw == null && typeof localStorage !== 'undefined' && localStorage.getItem(DATA_KEY)){
          raw = localStorage.getItem(DATA_KEY);
          await idbSet(DATA_KEY, raw);
        }
        this.persistente = true;
      } else if (typeof localStorage !== 'undefined'){
        raw = localStorage.getItem(DATA_KEY);
        this.persistente = true;
      }
      if (raw){ this.data = Object.assign(this.data, JSON.parse(raw)); }
    }catch(e){ this.persistente = false; }
    this.normaliza();
  },
  /** Garantiza la forma de los datos aunque vengan de un respaldo viejo o incompleto.
      G3: además blinda cada pieza del banco (icg numérico, métricas objeto)
      para que un respaldo corrupto no pueda romper el render. */
  normaliza(){
    const d = this.data;
    if (!Array.isArray(d.clients)) d.clients = [];
    d.clients = d.clients.filter(c => c && typeof c === 'object');
    d.modules = Array.isArray(d.modules) ? d.modules : [];
    d.kbNotes = typeof d.kbNotes === 'string' ? d.kbNotes : '';
    d.clients.forEach(c => {
      if (!c.id) c.id = this.uid();
      c.intake = (c.intake && typeof c.intake === 'object') ? c.intake : {};
      c.mes = Math.min(6, Math.max(1, +c.mes || 1));
      c.estrategia = (c.estrategia && typeof c.estrategia === 'object') ? c.estrategia : { e1:null, e2:null, e3:null };
      ['contenidos','calendario','banco','campanas','autos','metricas','historial'].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; });
      c.banco = c.banco.filter(b => b && typeof b === 'object');
      c.banco.forEach(b => {
        b.icg = isFinite(+b.icg) ? +b.icg : 0;
        if (!b.metricas || typeof b.metricas !== 'object') b.metricas = {};
      });
      // Las gráficas y el borrado usan `semana` como clave: fuera filas sin fecha
      c.metricas = c.metricas.filter(m => m && typeof m.semana === 'string' && m.semana);
    });
    if (d.activeId && !d.clients.some(c => c.id === d.activeId)) d.activeId = d.clients.length ? d.clients[0].id : null;
  },
  /** G3: comprobación mínima de que el JSON tiene forma de respaldo de 321 OS. */
  esRespaldoValido(obj){
    return !!obj && typeof obj === 'object' && !Array.isArray(obj) &&
      Array.isArray(obj.clients) &&
      obj.clients.every(c => c && typeof c === 'object' && !Array.isArray(c));
  },
  _t: null,
  _pendiente: false,
  save(){
    UI.saveDot('Guardando…');
    this._pendiente = true;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 500);
  },
  /** Escribe de inmediato lo que esté en cola (usado por el debounce y por M7 al ocultar la pestaña). */
  async flush(){
    if (!this._pendiente) return;
    this._pendiente = false;
    clearTimeout(this._t);
    const json = JSON.stringify(this.data);
    try{
      if (typeof indexedDB !== 'undefined'){ await idbSet(DATA_KEY, json); }
      else if (typeof localStorage !== 'undefined'){ localStorage.setItem(DATA_KEY, json); }
      else { throw new Error('sin almacenamiento'); }
      this.persistente = true;
      UI.saveDot('Guardado ✓', true);
    }catch(e){
      this.persistente = false;
      UI.saveDot('Solo en memoria — exporta tus datos');
    }
  },
  exportar(){
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'metodo321-datos-' + UI.hoyISO() + '.json';
    a.click(); URL.revokeObjectURL(a.href);
  },
  /* G3: el respaldo se valida antes de aceptarse y, si hay datos
     actuales, se pide confirmación explícita (antes un JSON cualquiera
     reemplazaba TODO sin preguntar). */
  importar(file){
    const rd = new FileReader();
    rd.onload = () => {
      let obj;
      try{ obj = JSON.parse(rd.result); }
      catch(e){ UI.toast('El archivo no es un JSON válido'); return; }
      if (!Store.esRespaldoValido(obj)){ UI.toast('El archivo no es un respaldo de 321 OS'); return; }
      const aplicar = () => {
        Store.data = obj; Store.normaliza(); Store.save(); App.refresh(); UI.toast('Datos importados');
      };
      const actuales = Store.data.clients.length;
      if (actuales > 0){
        UI.confirmar('Importar respaldo',
          'Esto <b>reemplazará los datos actuales</b> (' + actuales + ' cliente(s)) por el contenido del respaldo (' +
          obj.clients.length + ' cliente(s)). Esta acción no se puede deshacer.',
          'Reemplazar datos', aplicar);
      } else {
        aplicar();
      }
    };
    rd.readAsText(file);
  }
};

/* M7: si el usuario cierra u oculta la pestaña con un guardado en
   cola (debounce de 500 ms), se vuelca de inmediato. */
window.addEventListener('pagehide', () => Store.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flush(); });

export { Store };
