/* Verifica que todos los JSON Schemas cumplen las reglas de structured
   outputs de la API: cada objeto lleva additionalProperties:false y
   required con todas sus propiedades; sin restricciones no soportadas.
   Ejecutar: node test/schemas.test.mjs */
import assert from 'node:assert/strict';
import * as S from '../public/js/schemas.js';

const NO_SOPORTADO = ['minimum', 'maximum', 'multipleOf', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern', '$ref'];

function revisa(nodo, ruta){
  if (!nodo || typeof nodo !== 'object') return;
  for (const k of NO_SOPORTADO){
    assert.ok(!(k in nodo), ruta + ' usa "' + k + '" (no soportado por structured outputs)');
  }
  if (nodo.type === 'object'){
    assert.equal(nodo.additionalProperties, false, ruta + ' sin additionalProperties:false');
    assert.ok(Array.isArray(nodo.required), ruta + ' sin required');
    const props = Object.keys(nodo.properties || {});
    assert.deepEqual([...nodo.required].sort(), [...props].sort(), ruta + ': required no cubre todas las propiedades');
    props.forEach(p => revisa(nodo.properties[p], ruta + '.' + p));
  }
  if (nodo.type === 'array') revisa(nodo.items, ruta + '[]');
}

let n = 0;
for (const [nombre, schema] of Object.entries(S)){
  revisa(schema, nombre);
  n++;
  console.log('✓ schema ' + nombre + ' válido para structured outputs');
}
assert.ok(n >= 8, 'faltan schemas exportados');
console.log('\n' + n + ' schemas verificados');
