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
  /** Garantiza la forma de los datos aunque vengan de un respaldo viejo o incompleto. */
  normaliza(){
    const d = this.data;
    d.clients = d.clients || []; d.modules = d.modules || []; d.kbNotes = d.kbNotes || '';
    d.clients.forEach(c => {
      c.intake = c.intake || {}; c.mes = c.mes || 1;
      c.estrategia = c.estrategia || { e1:null, e2:null, e3:null };
      ['contenidos','calendario','banco','campanas','autos','metricas','historial'].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; });
    });
    if (d.activeId && !d.clients.some(c => c.id === d.activeId)) d.activeId = d.clients.length ? d.clients[0].id : null;
  },
  _t: null,
  save(){
    UI.saveDot('Guardando…');
    clearTimeout(this._t);
    this._t = setTimeout(async () => {
      const json = JSON.stringify(this.data);
      try{
        if (typeof indexedDB !== 'undefined'){ await idbSet(DATA_KEY, json); }
        else if (typeof localStorage !== 'undefined'){ localStorage.setItem(DATA_KEY, json); }
        else { throw new Error('sin almacenamiento'); }
        this.persistente = true;
        UI.saveDot('Guardado ✓');
      }catch(e){
        this.persistente = false;
        UI.saveDot('Solo en memoria — exporta tus datos');
      }
    }, 500);
  },
  exportar(){
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'metodo321-datos-' + new Date().toISOString().slice(0,10) + '.json';
    a.click(); URL.revokeObjectURL(a.href);
  },
  importar(file){
    const rd = new FileReader();
    rd.onload = () => {
      try{ Store.data = JSON.parse(rd.result); Store.normaliza(); Store.save(); App.refresh(); UI.toast('Datos importados'); }
      catch(e){ UI.toast('El archivo no es un respaldo válido'); }
    };
    rd.readAsText(file);
  }
};

export { Store };
