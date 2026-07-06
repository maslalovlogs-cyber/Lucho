

/* ════════════════════════════════════════════════════════════════
   MÓDULO ICG — js/icg.js
   Índice de Contenido Ganador, implementado exactamente como lo
   define la sección 7 del método: ratios contra la MEDIANA móvil
   de las últimas 15 piezas, pesos 0.15/0.30/0.25/0.15/0.15 y
   "modo venta" (Etapa 3) con componente V de conversión (0.30).
   ════════════════════════════════════════════════════════════════ */
const ICG = {
  mediana(arr){
    const v = arr.filter(x => isFinite(x) && x > 0).sort((a,b) => a-b);
    if (!v.length) return 0;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m-1] + v[m]) / 2;
  },
  ratios(m){
    const al = +m.alcance || 0;
    return {
      A: al,
      R: +m.retencion || 0,
      C: al ? (+m.compartidos || 0) / al : 0,
      G: al ? (+m.guardados || 0) / al : 0,
      I: al ? ((+m.visitas||0) + (+m.clics||0) + (+m.dms||0)) / al : 0,
      V: al ? (+m.conversiones || 0) / al : 0
    };
  },
  calc(banco, pieza, modoVenta){
    const prev = banco.filter(p => p.id !== pieza.id).slice(-15).map(p => this.ratios(p.metricas));
    const r = this.ratios(pieza.metricas);
    const med = k => this.mediana(prev.map(p => p[k]));
    const ratio = k => { const m = med(k); return m > 0 ? r[k] / m : 1; };
    let icg;
    if (modoVenta){
      // V pesa 0.30; los pesos base (suman 1) se reescalan ×0.70
      icg = .105*ratio('A') + .21*ratio('R') + .175*ratio('C') + .105*ratio('G') + .105*ratio('I') + .30*ratio('V');
    } else {
      icg = .15*ratio('A') + .30*ratio('R') + .25*ratio('C') + .15*ratio('G') + .15*ratio('I');
    }
    return Math.round(icg * 100) / 100;
  },
  clase(icg){
    if (icg >= 1.5) return { t:'🏆 Ganador absoluto', c:'gold', accion:'Entra al Banco · replicar ×3 · candidato a pauta inmediata' };
    if (icg >= 1.2) return { t:'Ganador', c:'green', accion:'Replicar ×3 para la Regla de 3' };
    if (icg >= 0.8) return { t:'Neutro', c:'amber', accion:'1 iteración cambiando SOLO el gancho; si no mejora, archivo' };
    return { t:'Débil', c:'red', accion:'Descartar la estructura tras 2 intentos · documentar aprendizaje' };
  }
};


export { ICG };
