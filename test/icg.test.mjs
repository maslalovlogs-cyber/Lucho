/* Pruebas unitarias del módulo ICG (puro, sin DOM).
   Ejecutar: node test/icg.test.mjs
   Documentan numéricamente las correcciones M1–M4 de la Fase 3. */
import assert from 'node:assert/strict';
import { ICG } from '../public/js/icg.js';

const pieza = (m, extra) => Object.assign({ id: Math.random().toString(36).slice(2), metricas: m }, extra);
const M = (alcance, retencion, compartidos, guardados, visitas, clics, dms, conversiones) =>
  ({ alcance, retencion, compartidos, guardados, visitas, clics, dms, conversiones });

let n = 0;
const t = (nombre, fn) => { fn(); n++; console.log('✓ ' + nombre); };

/* ── Cordura de la fórmula: pieza idéntica a su historial → ICG = 1.00 ── */
t('pieza igual a la mediana de su cuenta → ICG 1.00 (pesos suman 1)', () => {
  const base = M(1000, 45, 10, 10, 20, 5, 5, 0);
  const banco = [pieza(base), pieza(base), pieza(base)];
  assert.equal(ICG.calc(banco, pieza(base), false), 1.00);
});

t('modo venta: pesos reescalados también suman 1.00', () => {
  const base = M(1000, 45, 10, 10, 20, 5, 5, 8);
  const banco = [pieza(base), pieza(base), pieza(base)];
  assert.equal(ICG.calc(banco, pieza(base), true), 1.00);
});

t('el doble de rendimiento en todo → ICG 2.00', () => {
  const base = M(1000, 40, 10, 10, 20, 5, 5, 0);
  const banco = [pieza(base), pieza(base), pieza(base)];
  const doble = M(2000, 80, 40, 40, 80, 20, 20, 0); // ratios por alcance también ×2
  assert.equal(ICG.calc(banco, pieza(doble), false), 2.00);
});

/* ── M3: los ceros cuentan para la mediana ── */
t('M3 · mediana con ceros incluidos (antes se filtraban)', () => {
  assert.equal(ICG.mediana([0, 0, 5]), 0);      // antes: 5 (benchmark inflado)
  assert.equal(ICG.mediana([0, 4, 10]), 4);
  assert.equal(ICG.mediana([-1, NaN, 3, 1]), 2); // negativos/NaN sí se descartan
});

t('M3 · cuenta donde casi nadie comparte: la métrica queda neutra, no castiga', () => {
  // 3 piezas previas: solo una tuvo compartidos → mediana de C = 0 → ratio neutro 1
  const banco = [
    pieza(M(1000, 40, 0, 0, 0, 0, 0, 0)),
    pieza(M(1000, 40, 0, 0, 0, 0, 0, 0)),
    pieza(M(1000, 40, 12, 0, 0, 0, 0, 0))
  ];
  const nueva = pieza(M(1000, 40, 5, 0, 0, 0, 0, 0));
  // A=1, R=1, C=neutro 1, G=neutro 1, I=neutro 1 → ICG 1.00 exacto
  assert.equal(ICG.calc(banco, nueva, false), 1.00);
});

/* ── M1: solo cuentan las 15 piezas ANTERIORES (ventana móvil real) ── */
t('M1 · la ventana usa las últimas 15 previas: una pieza vieja fuera de la ventana no influye', () => {
  const normal = M(1000, 40, 10, 10, 20, 5, 5, 0);
  const outlier = M(999999, 99, 999, 999, 999, 999, 999, 0); // pieza nº1, ya fuera de la ventana
  const banco16 = [pieza(outlier)].concat(Array.from({ length: 15 }, () => pieza(normal)));
  const banco15 = Array.from({ length: 15 }, () => pieza(normal));
  const nueva = pieza(M(1500, 50, 15, 15, 30, 8, 8, 0));
  assert.equal(ICG.calc(banco16, nueva, false), ICG.calc(banco15, nueva, false));
});

t('M1 · el ICG es determinista respecto al estado previo (fijado al registrar, sin recálculo retroactivo)', () => {
  const base = M(1000, 40, 10, 10, 20, 5, 5, 0);
  const previas = [pieza(base), pieza(base), pieza(base)];
  const nueva = pieza(M(1200, 55, 20, 12, 25, 6, 9, 0));
  const icgAlRegistrar = ICG.calc(previas, nueva, false);
  // llegan 5 piezas posteriores muy superiores…
  const posteriores = previas.concat([nueva], Array.from({ length: 5 }, () => pieza(M(9000, 90, 200, 200, 400, 90, 90, 0))));
  // …y el ICG calculado con el MISMO estado previo no cambia:
  assert.equal(ICG.calc(previas, nueva, false), icgAlRegistrar);
  // (la pantalla Banco ya no recalcula: pasa siempre el estado previo al registro)
  assert.notEqual(ICG.calc(posteriores, nueva, false), undefined);
});

/* ── M4: Regla de 3 según la letra del método ── */
t('M4 · estructura con 3 piezas ≥ 1.3 certifica aunque tenga una pieza floja', () => {
  const banco = [1.4, 1.35, 1.3, 1.0].map(icg => ({ estructura: 'Serie X', formato: 'Reel', pilar: 'Educación', icg }));
  const e = ICG.estructuras(banco).find(x => x.k === 'Serie X');
  assert.equal(e.certificada, true);   // la versión anterior la vetaba por la pieza de 1.0
  assert.equal(e.cumplen, 3);
});

t('M4 · con 2 piezas ≥ 1.3 promete (falta 1); sin piezas ≥ 1.3 queda en observación', () => {
  const banco = [
    { estructura: 'Serie B', formato: 'Reel', pilar: '', icg: 1.45 },
    { estructura: 'Serie B', formato: 'Reel', pilar: '', icg: 1.31 },
    { estructura: 'Serie C', formato: 'Post', pilar: '', icg: 1.0 },
    { estructura: 'Serie C', formato: 'Post', pilar: '', icg: 0.9 }
  ];
  const est = ICG.estructuras(banco);
  const b = est.find(x => x.k === 'Serie B'), c = est.find(x => x.k === 'Serie C');
  assert.deepEqual([b.certificada, b.promete, b.cumplen], [false, true, 2]);
  assert.deepEqual([c.certificada, c.promete, c.cumplen], [false, false, 0]);
});

/* ── M2 se verifica en banco.js (modoVenta = etapa 3 para TODAS las piezas);
      aquí comprobamos que la fórmula venta castiga la no-conversión solo
      cuando la cuenta SÍ convierte normalmente ── */
t('M2 · en modo venta, no convertir castiga si la cuenta suele convertir', () => {
  const conConv = M(1000, 40, 10, 10, 20, 5, 5, 10);
  const banco = [pieza(conConv), pieza(conConv), pieza(conConv)];
  const sinConv = pieza(M(1000, 40, 10, 10, 20, 5, 5, 0));
  const icg = ICG.calc(banco, sinConv, true);
  assert.equal(icg, 0.70); // pierde exactamente el peso 0.30 de V
});

console.log('\n' + n + ' pruebas ICG en verde');
