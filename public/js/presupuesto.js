/* ════════════════════════════════════════════════════════════════
   MÓDULO PRESUPUESTO — js/presupuesto.js
   Reglas deterministas de presupuesto del Método 3·2·1.
   Única fuente de verdad: antes la distribución y los niveles A/B/C
   estaban duplicados en las pantallas Estrategia y Publicidad.
   ════════════════════════════════════════════════════════════════ */

/** Distribución fija del presupuesto semestral por mes (suma 100). */
export const DIST_SEMESTRAL = [5, 10, 15, 20, 20, 30];

/** Nivel de inversión del método según presupuesto mensual (USD).
    A < 300 · B 300–1,500 · C > 1,500. Devuelve null sin presupuesto. */
export function nivelPresupuesto(mensual){
  const p = +mensual || 0;
  if (!p) return null;
  if (p < 300) return { clave: 'A', etiqueta: 'A · Local básico' };
  if (p <= 1500) return { clave: 'B', etiqueta: 'B · Crecimiento' };
  return { clave: 'C', etiqueta: 'C · Agresivo' };
}
