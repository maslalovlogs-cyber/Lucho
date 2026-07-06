import { Store } from './store.js';
import { UI } from './ui.js';
import { S_Clientes } from './screens/clientes.js';
import { S_Dx } from './screens/diagnostico.js';
import { S_Estrategia } from './screens/estrategia.js';
import { S_Contenido } from './screens/contenido.js';
import { S_Cal } from './screens/calendario.js';
import { S_Banco } from './screens/banco.js';
import { S_Ads } from './screens/publicidad.js';
import { S_Autos } from './screens/autos.js';
import { S_Dash } from './screens/dashboard.js';
import { S_Metodo } from './screens/metodo.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO ROUTER — js/app.js · Navegación, topbar y arranque
   ════════════════════════════════════════════════════════════════ */
const App = {
  rutas: [
    { id:'cli', icon:'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.5 6a5.5 5.5 0 0 1 11 0z', s: () => S_Clientes, grupo:'Cliente' },
    { id:'dx',  icon:'M2 8h3l2-5 3 10 2-5h2', s: () => S_Dx },
    { id:'est', icon:'M2 13h3V6H2zm5 0h3V2H7zm5 0h3V9h-3z', s: () => S_Estrategia, grupo:'Sistema' },
    { id:'con', icon:'M3 2h10v9l-3 3H3zM10 14v-3h3', s: () => S_Contenido },
    { id:'cal', icon:'M3 3h10v10H3zM3 6h10M6 2v2M10 2v2', s: () => S_Cal },
    { id:'ban', icon:'M8 2l1.8 3.9L14 6.5l-3 3 .8 4.3L8 11.7l-3.8 2.1L5 9.5l-3-3 4.2-.6z', s: () => S_Banco, grupo:'Operación' },
    { id:'ads', icon:'M2 9l9-6v10zM11 6h3v2h-3M4 13l1 2', s: () => S_Ads },
    { id:'aut', icon:'M9 1L3 9h4l-1 6 6-8H8z', s: () => S_Autos },
    { id:'dash',icon:'M8 8V2a6 6 0 1 1-6 6h6z M10 1a5 5 0 0 1 5 5h-5z', s: () => S_Dash },
    { id:'kb',  icon:'M8 5a2.5 2.5 0 1 1 0 6a2.5 2.5 0 0 1 0-6zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13', s: () => S_Metodo, grupo:'Sistema' }
  ],
  labels: { cli:'Nuevo cliente', dx:'Diagnóstico', est:'Estrategia 6 meses', con:'Contenido', cal:'Calendario', ban:'Banco de Ganadores', ads:'Publicidad', aut:'Automatizaciones', dash:'Dashboard', kb:'Método' },
  actual: 'cli',
  /* M8: la pantalla activa vive en el hash de la URL (#dash, #cal…),
     así sobrevive a recargas y funcionan atrás/adelante del navegador.
     Antes el routing era solo memoria y toda recarga volvía a Clientes. */
  go(id){
    if (!this.rutas.some(r => r.id === id)) id = 'cli';
    this.actual = id;
    if (location.hash !== '#' + id) location.hash = id; // el handler ignora el eco (actual ya coincide)
    this.refresh(); // render síncrono: sin esperar al evento hashchange
  },
  sinCliente(){
    return '<div class="card"><div class="empty"><div class="art">3·2·1</div><h4>Primero crea un cliente</h4><p>Toda pantalla trabaja sobre la ficha del cliente activo.</p><button class="btn pri" onclick="App.go(\'cli\')">Ir a Nuevo cliente</button></div></div>';
  },
  pintaNav(){
    const grupos = { Cliente:['cli','dx','est'], Operación:['con','cal','ban','ads','aut','dash'], Sistema:['kb'] };
    let h = '';
    Object.keys(grupos).forEach(g => {
      h += '<div class="nav-label">' + g + '</div>';
      grupos[g].forEach(id => {
        const r = this.rutas.find(x => x.id === id);
        h += '<button data-go="' + id + '" class="' + (this.actual === id ? 'on' : '') + '">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + r.icon + '"/></svg>' +
          this.labels[id] + (this.actual === id ? '<span class="dot"></span>' : '') + '</button>';
      });
    });
    document.getElementById('nav').innerHTML = h;
    document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.go(b.dataset.go));
  },
  pintaRail(){
    const c = Store.client();
    const rail = document.getElementById('rail');
    if (!c){ rail.innerHTML = '<h4>Programa 3·2·1</h4><p style="font-size:11px;color:#5A6272">Sin cliente activo</p>'; return; }
    const et = Store.etapaDe(c.mes);
    const def = [ [1,'Reconocimiento',3,[1,2,3]], [2,'Consideración',2,[4,5]], [3,'Conversión',1,[6]] ];
    rail.innerHTML = '<h4>Programa 3·2·1</h4>' + def.map(d => {
      const meses = d[3];
      const done = meses.filter(m => m < c.mes).length + (meses.includes(c.mes) ? .5 : 0);
      const pct = Math.min(100, done / meses.length * 100);
      return '<div class="rail-row' + (et === d[0] ? ' live' : '') + '"><span class="num">' + d[2] + '</span><span class="tag">' + d[1] + '</span><div class="bar"><i style="width:' + (et > d[0] ? 100 : (et === d[0] ? pct : 0)) + '%"></i></div></div>';
    }).join('') + '<div class="rail-mes">Mes ' + c.mes + ' de 6 · Etapa ' + et + '</div>';
  },
  paintChrome(){
    const sel = document.getElementById('clientSel');
    sel.innerHTML = Store.data.clients.length
      ? Store.data.clients.map(c => '<option value="' + c.id + '"' + (c.id === Store.data.activeId ? ' selected' : '') + '>' + UI.esc(c.intake.empresa || 'Cliente sin nombre') + '</option>').join('')
      : '<option>— sin clientes —</option>';
    const c = Store.client();
    const ms = document.getElementById('mesStep');
    if (c){
      ms.style.display = 'flex';
      document.getElementById('mesLbl').textContent = 'Mes ' + c.mes + ' · Etapa ' + Store.etapaDe(c.mes);
    } else ms.style.display = 'none';
    this.pintaRail();
  },
  refresh(){
    this.pintaNav(); this.paintChrome();
    const r = this.rutas.find(x => x.id === this.actual);
    document.getElementById('crumb').textContent = r.s().title;
    r.s().render(document.getElementById('view'));
    document.querySelector('.view').scrollTop = 0;
  },
  /** M8: sincroniza App.actual con el hash actual de la URL. */
  leeHash(){
    const id = (location.hash || '').replace('#', '');
    this.actual = this.rutas.some(r => r.id === id) ? id : 'cli';
  },
  async init(){
    await Store.load();
    document.getElementById('clientSel').onchange = e => {
      const c = Store.data.clients.find(x => x.id === e.target.value);
      if (c){ Store.data.activeId = c.id; Store.save(); this.refresh(); }
    };
    document.getElementById('mesDown').onclick = () => { const c = Store.client(); if (c && c.mes > 1){ c.mes--; Store.save(); this.refresh(); } };
    document.getElementById('mesUp').onclick = () => { const c = Store.client(); if (c && c.mes < 6){ c.mes++; Store.save(); this.refresh(); } };
    // Solo reacciona a cambios reales (atrás/adelante, edición manual del hash);
    // los clics de navegación ya renderizaron en go().
    window.addEventListener('hashchange', () => {
      const previa = this.actual;
      this.leeHash();
      if (this.actual !== previa) this.refresh();
    });
    this.leeHash();
    this.refresh();
  }
};
window.App = App;
App.init();

export { App };
