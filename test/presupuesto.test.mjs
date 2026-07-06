/* Pruebas del módulo de presupuesto (reglas fijas del método).
   Ejecutar: node test/presupuesto.test.mjs */
import assert from 'node:assert/strict';
import { DIST_SEMESTRAL, nivelPresupuesto } from '../public/js/presupuesto.js';

assert.equal(DIST_SEMESTRAL.length, 6, 'seis meses');
assert.equal(DIST_SEMESTRAL.reduce((a,b) => a+b, 0), 100, 'la distribución suma 100%');
assert.deepEqual(DIST_SEMESTRAL, [5,10,15,20,20,30], 'distribución fija del método');
console.log('✓ distribución semestral 5/10/15/20/20/30 (suma 100)');

assert.equal(nivelPresupuesto(0), null);
assert.equal(nivelPresupuesto(undefined), null);
assert.equal(nivelPresupuesto(299).clave, 'A');
assert.equal(nivelPresupuesto(300).clave, 'B');   // frontera A/B
assert.equal(nivelPresupuesto(1500).clave, 'B');  // frontera B/C
assert.equal(nivelPresupuesto(1501).clave, 'C');
console.log('✓ niveles A/B/C con fronteras exactas (299/300 · 1500/1501)');
console.log('\n2 bloques de presupuesto en verde');
