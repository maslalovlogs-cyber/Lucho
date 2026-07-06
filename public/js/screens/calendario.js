import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { AI } from '../ai.js';
import { PLAN_SEMANA } from '../schemas.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S5 — js/screens/calendario.js · PANTALLA 5: Calendario
   Vista mensual y semanal · arrastrar y soltar · duplicar ·
   marcar como publicado.
   ════════════════════════════════════════════════════════════════ */
const S_Cal = {
  title: 'Calendario',
  vista: 'mes',
  cursor: new Date(),
  render(el){
    const c = Store.client();
    if (!c){ el.innerHTML = App.sinCliente(); return; }
    let html = '<div class="h-page"><div><h2>Calendario editorial</h2><p>Arrastra las piezas entre días para moverlas. El método recomienda 4–5 piezas de feed por semana en días alternados.</p></div>' +
      '<div style="display:flex;gap:8px"><div class="seg"><button id="vMes" class="' + (this.vista==='mes'?'on':'') + '">Mes</button><button id="vSem" class="' + (this.vista==='sem'?'on':'') + '">Semana</button></div>' +
      '<button class="btn" id="bPlan" title="La IA programa la semana siguiente con la plantilla del método"' + (this._gen ? ' disabled' : '') + '>Planificar semana con IA</button></div></div>' +
      '<div id="calProg"></div>' +
      '<div class="cal-head"><button class="btn sm" id="cPrev">←</button><h3 id="cTitle"></h3><button class="btn sm" id="cNext">→</button><button class="btn sm ghost" id="cHoy">Hoy</button></div>' +
      '<div id="calBody"></div>';
    el.innerHTML = html;
    document.getElementById('vMes').onclick = () => { this.vista='mes'; App.refresh(); };
    document.getElementById('vSem').onclick = () => { this.vista='sem'; App.refresh(); };
    document.getElementById('cPrev').onclick = () => { this.mueve(-1); };
    document.getElementById('cNext').onclick = () => { this.mueve(1); };
    document.getElementById('cHoy').onclick = () => { this.cursor = new Date(); App.refresh(); };
    document.getElementById('bPlan').onclick = () => this.planSemana(c);
    this.pinta(c);
  },
  mueve(dir){
    const d = this.cursor;
    if (this.vista === 'mes') this.cursor = new Date(d.getFullYear(), d.getMonth() + dir, 1);
    else this.cursor = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir * 7);
    App.refresh();
  },
  iso(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); },
  itemHTML(it){
    return '<div class="cal-it' + (it.publicado ? ' pub' : '') + '" draggable="true" data-cit="' + it.id + '">' +
      '<span class="f">' + UI.esc(it.formato||'') + '</span>' + UI.esc(it.titulo) +
      '<div class="acts"><button data-pub="' + it.id + '" title="Marcar publicado">✓</button><button data-mov="' + it.id + '" title="Mover a otra fecha">⇄</button><button data-dup="' + it.id + '" title="Duplicar">⧉</button><button data-del="' + it.id + '" title="Quitar">✕</button></div></div>';
  },
  pinta(c){
    const body = document.getElementById('calBody');
    const hoy = this.iso(new Date());
    const DOW = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    if (this.vista === 'mes'){
      const y = this.cursor.getFullYear(), m = this.cursor.getMonth();
      document.getElementById('cTitle').textContent = this.cursor.toLocaleDateString('es-MX', { month:'long', year:'numeric' }).replace(/^./, s => s.toUpperCase());
      const first = new Date(y, m, 1);
      const start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
      let g = '<div class="cal-grid">' + DOW.map(d => '<div class="cal-dow">' + d + '</div>').join('');
      for (let i = 0; i < 42; i++){
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const k = this.iso(d);
        const its = c.calendario.filter(x => x.fecha === k);
        g += '<div class="cal-day' + (d.getMonth() !== m ? ' out' : '') + (k === hoy ? ' today' : '') + '" data-day="' + k + '"><span class="dnum">' + d.getDate() + '</span>' +
          its.map(it => this.itemHTML(it)).join('') + '</div>';
      }
      body.innerHTML = g + '</div>';
    } else {
      const d0 = new Date(this.cursor);
      d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
      const d6 = new Date(d0); d6.setDate(d0.getDate() + 6);
      document.getElementById('cTitle').textContent = 'Semana del ' + UI.fecha(this.iso(d0)) + ' al ' + UI.fecha(this.iso(d6));
      let g = '<div class="week-grid">';
      for (let i = 0; i < 7; i++){
        const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
        const k = this.iso(d);
        g += '<div class="week-col' + (k === hoy ? ' today' : '') + '" data-day="' + k + '"><h5>' + DOW[i] + ' ' + d.getDate() + '</h5>' +
          c.calendario.filter(x => x.fecha === k).map(it => this.itemHTML(it)).join('') + '</div>';
      }
      body.innerHTML = g + '</div>';
    }
    this.wire(c, body);
  },
  wire(c, body){
    body.querySelectorAll('[data-cit]').forEach(elc => {
      elc.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', elc.dataset.cit); });
    });
    body.querySelectorAll('[data-day]').forEach(day => {
      day.addEventListener('dragover', e => { e.preventDefault(); day.classList.add('over'); });
      day.addEventListener('dragleave', () => day.classList.remove('over'));
      day.addEventListener('drop', e => {
        e.preventDefault(); day.classList.remove('over');
        const it = c.calendario.find(x => x.id === e.dataTransfer.getData('text/plain'));
        if (it){ it.fecha = day.dataset.day; Store.save(); this.pinta(c); }
      });
    });
    body.querySelectorAll('[data-pub]').forEach(b => b.onclick = () => {
      const it = c.calendario.find(x => x.id === b.dataset.pub);
      it.publicado = !it.publicado; Store.save(); this.pinta(c);
      if (it.publicado) UI.toast('Publicado ✓ — registra sus métricas en el Banco a las 72 h y 7 días');
    });
    body.querySelectorAll('[data-mov]').forEach(b => b.onclick = () => {
      const it = c.calendario.find(x => x.id === b.dataset.mov);
      UI.modal('Mover pieza', '<div class="field"><label for="mvF">Nueva fecha</label><input type="date" id="mvF" value="' + it.fecha + '"></div>' +
        '<button class="btn pri" id="mvOk" style="width:100%">Mover</button>', () => {
        document.getElementById('mvOk').onclick = () => {
          it.fecha = document.getElementById('mvF').value || it.fecha;
          Store.save(); UI.closeModal(); S_Cal.pinta(c);
        };
      });
    });
    body.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => {
      const it = c.calendario.find(x => x.id === b.dataset.dup);
      c.calendario.push(Object.assign({}, it, { id: Store.uid(), publicado:false }));
      Store.save(); this.pinta(c);
    });
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      c.calendario = c.calendario.filter(x => x.id !== b.dataset.del); Store.save(); this.pinta(c);
    });
  },
  async planSemana(c){
    if (!c.contenidos.length){ UI.toast('Genera contenido primero: el calendario programa piezas de la biblioteca'); return; }
    const prog = document.getElementById('calProg');
    const btn = document.getElementById('bPlan'); btn.disabled = true; // G4: sin duplicados por doble clic
    this._gen = true;
    prog.innerHTML = UI.thinking('Asignando la semana con la plantilla semanal del método…');
    try{
      const pend = c.contenidos.filter(it => !c.calendario.some(k => k.contenidoId === it.id)).slice(0, 14);
      if (!pend.length){ this._gen = false; prog.innerHTML = ''; btn.disabled = false; UI.toast('Todas las piezas de la biblioteca ya están programadas'); return; }
      const d0 = new Date(); d0.setDate(d0.getDate() + ((8 - d0.getDay()) % 7 || 7)); // próximo lunes
      const res = await AI.json(
        AI.system(['operativo','principios'], 'Programas la semana siguiendo el calendario semanal tipo del método (lunes educativo, miércoles identidad, jueves serie/carrusel, viernes storytelling/prueba social, sábado comunidad).'),
        'Etapa actual: Etapa ' + Store.etapaDe(c.mes) + '. Piezas disponibles: ' + JSON.stringify(pend.map(p => ({ id:p.id, titulo:p.titulo, formato:p.formato, pilar:p.pilar }))) +
        '\nElige 4-5 piezas y asígnales día (0=lunes … 6=domingo) según la plantilla. Devuelve JSON: {"asignaciones":[{"id":str,"dia":0-6}]}', PLAN_SEMANA);
      (res.asignaciones || []).forEach(a => {
        const it = pend.find(p => p.id === a.id); if (!it) return;
        const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + (+a.dia || 0));
        c.calendario.push({ id: Store.uid(), contenidoId: it.id, titulo: it.titulo, formato: it.formato, pilar: it.pilar, fecha: this.iso(d), publicado:false });
      });
      Store.save(); this.cursor = d0; this._gen = false;
      /* App.refresh (no this.pinta(c)): si el usuario cambió de cliente o de
         pantalla durante la llamada, pinta(c) mezclaría datos de dos clientes
         o lanzaría sobre nodos inexistentes. */
      App.refresh(); UI.toast('Semana planificada con la plantilla del método');
    }catch(e){ this._gen = false; prog.innerHTML = '<div class="warn">Error: ' + UI.esc(e.message) + '</div>'; btn.disabled = false; }
  }
};


export { S_Cal };
