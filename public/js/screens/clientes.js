import { Store } from '../store.js';
import { UI } from '../ui.js';
import { App } from '../app.js';
import { F } from '../ui.js';

/* ════════════════════════════════════════════════════════════════
   MÓDULO S1 — js/screens/clientes.js · PANTALLA 1: Nuevo Cliente
   ════════════════════════════════════════════════════════════════ */
const S_Clientes = {
  title: 'Clientes',
  render(el){
    const c = Store.client();
    let html = '<div class="h-page"><div><h2>' + (c ? 'Ficha del cliente' : 'Nuevo cliente') + '</h2>' +
      '<p>Todo el sistema se alimenta de esta ficha. Cuanto más completa, más precisa la estrategia. La IA hará preguntas inteligentes sobre lo que falte.</p></div>' +
      '<div style="display:flex;gap:8px"><button class="btn" id="bNuevo">+ Nuevo cliente</button>' +
      (c ? '<button class="btn danger" id="bBorrar">Eliminar</button>' : '') + '</div></div>';

    if (!c){
      html += '<div class="card"><div class="empty"><div class="art">3·2·1</div><h4>Empieza con tu primer cliente</h4>' +
        '<p>Crea la ficha del negocio y el sistema generará diagnóstico, estrategia de 6 meses, contenido, calendario, publicidad y automatizaciones con el Método 3·2·1.</p>' +
        '<button class="btn pri" id="bNuevo2">Crear cliente</button></div></div>';
      el.innerHTML = html;
      const go = () => { const n = Store.nuevoCliente(); Store.data.clients.push(n); Store.data.activeId = n.id; Store.save(); App.refresh(); };
      document.getElementById('bNuevo').onclick = go;
      document.getElementById('bNuevo2').onclick = go;
      return;
    }

    html += '<div class="card"><div class="card-b">' +
      '<div class="fs-title">Identidad</div><div class="fgrid">' +
      F('nombre','Nombre de contacto') + F('empresa','Empresa / marca') + F('industria','Industria', 'text', {ph:'restaurante, clínica dental, boutique…'}) +
      F('tipo','Tipo de negocio','sel',{opciones:['B2C','B2B','B2B y B2C']}) +
      F('alcanceGeo','Alcance','sel',{opciones:['Local','Regional','Nacional','Internacional']}) +
      F('pais','País') + F('ciudad','Ciudad') +
      F('web','Página web','text',{ph:'https://…'}) + F('redes','Redes sociales actuales','text',{ph:'@usuario en IG, TikTok, FB…'}) +
      '</div>' +
      '<div class="fs-title">Oferta y economía</div><div class="fgrid">' +
      F('productos','Productos','ta',{ph:'qué vende, líneas principales'}) + F('servicios','Servicios','ta') +
      F('precioProm','Precio promedio (USD)','number') + F('ticketProm','Ticket promedio (USD)','number') + F('margen','Margen (%)','number') +
      F('capProduccion','Capacidad de producción','text',{ph:'p. ej. 40 pedidos/día'}) + F('capAtencion','Capacidad de atención','text',{ph:'p. ej. 2 personas responden DMs'}) +
      '</div>' +
      '<div class="fs-title">Marketing</div><div class="fgrid">' +
      F('objetivos','Objetivos del semestre','ta',{ph:'ventas, reservas, leads, posicionamiento…'}) +
      F('presupuesto','Presupuesto publicitario mensual (USD)','number') +
      F('tiempo','Tiempo disponible para contenido','text',{ph:'p. ej. 6 h/semana'}) +
      F('equipo','Equipo','text',{ph:'quién graba, edita, responde'}) +
      F('plataformas','Plataformas que ya usa','text',{ph:'IG, TikTok, FB…'}) +
      F('competencia','Competencia directa','ta',{ph:'nombres o cuentas'}) +
      '</div>' +
      '<div class="fs-title">Análisis interno</div><div class="fgrid c2">' +
      F('fortalezas','Fortalezas','ta') + F('debilidades','Debilidades','ta') +
      '</div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:6px"><button class="btn pri" id="bGuardar">Guardar ficha</button>' +
      '<button class="btn" id="bDx">Continuar al diagnóstico →</button></div>' +
      '</div></div>';
    el.innerHTML = html;

    el.querySelectorAll('[data-f]').forEach(inp => {
      // M7: guardar mientras se escribe (Store.save ya trae debounce de 500 ms);
      // antes solo se guardaba al salir del campo y lo tecleado podía perderse.
      inp.addEventListener('input', () => { c.intake[inp.dataset.f] = inp.value; Store.save(); });
      inp.addEventListener('change', () => { c.intake[inp.dataset.f] = inp.value; Store.save(); App.paintChrome(); });
    });
    el.querySelectorAll('select[data-f]').forEach(s => { if (c.intake[s.dataset.f] == null) c.intake[s.dataset.f] = s.value; });
    document.getElementById('bGuardar').onclick = () => { Store.save(); UI.toast('Ficha guardada'); App.paintChrome(); };
    document.getElementById('bDx').onclick = () => App.go('dx');
    document.getElementById('bNuevo').onclick = () => { const n = Store.nuevoCliente(); Store.data.clients.push(n); Store.data.activeId = n.id; Store.save(); App.refresh(); };
    const del = document.getElementById('bBorrar');
    if (del) del.onclick = () => {
      const nombre = c.intake.empresa || 'este cliente';
      UI.confirmar('Eliminar cliente',
        'Vas a eliminar <b>' + UI.esc(nombre) + '</b> con todo su historial: ' +
        c.contenidos.length + ' pieza(s) de contenido, ' + c.banco.length + ' registro(s) del Banco, ' +
        c.metricas.length + ' semana(s) de métricas y su estrategia. Esta acción no se puede deshacer.',
        'Eliminar definitivamente', () => {
          Store.data.clients = Store.data.clients.filter(x => x.id !== c.id);
          Store.data.activeId = Store.data.clients.length ? Store.data.clients[0].id : null;
          Store.save(); App.refresh(); UI.toast('Cliente eliminado');
        });
    };
  }
};


export { S_Clientes };
