/* ════════════════════════════════════════════════════════════════
   MÓDULO SCHEMAS — js/schemas.js
   JSON Schemas de cada generación de IA (Fase 5).
   El backend los pasa a la API como `output_config.format` →
   la respuesta ES JSON válido con esta forma, garantizado por la
   plataforma. Sustituye el parseo heurístico y el reintento
   "responde más breve" del original (error G2 de la auditoría).

   Reglas de la API para estos esquemas: todo objeto lleva
   additionalProperties:false y required; sin límites numéricos ni
   de longitud (esos matices se piden en el prompt).
   ════════════════════════════════════════════════════════════════ */

const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const arr = (items) => ({ type: 'array', items });
const str = { type: 'string' };
const int = { type: 'integer' };

/** Diagnóstico paso 1: FODA, dolores, deseos, objeciones, preguntas. */
export const DX1 = obj({
  foda: obj({ fortalezas: arr(str), oportunidades: arr(str), debilidades: arr(str), amenazas: arr(str) }),
  dolores: arr(str), deseos: arr(str), objeciones: arr(str), preguntas: arr(str)
});

/** Diagnóstico paso 2: buyer persona + mapa de empatía. */
export const DX2 = obj({
  persona: obj({ nombre: str, edad: str, ocupacion: str, contexto: str, dolorPrincipal: str, motivacion: str, canales: str }),
  empatia: obj({ piensaSiente: str, ve: str, oye: str, diceHace: str, esfuerzos: str, resultados: str })
});

/** Diagnóstico paso 3: niveles, probabilidad y Matriz de Adaptación. */
export const DX3 = obj({
  niveles: obj({ competencia: int, autoridad: int, contenido: int, marca: int, ventas: int, confianza: int }),
  probabilidad: int,
  probabilidadNota: str,
  matriz: obj({ plataformaPrimaria: str, plataformaSecundaria: str, pilares: arr(str), ctaPrincipal: str, cicloVenta: str, particularidades: str })
});

/** Plan de una etapa de la estrategia de 6 meses. */
export const ETAPA = obj({
  mision: str, objetivos: arr(str), kpi: arr(str),
  cronograma: arr(obj({ periodo: str, foco: str, acciones: arr(str) })),
  tareas: arr(str), pauta: str
});

/** Una pieza de contenido completa. */
const PIEZA = obj({
  titulo: str, formato: str, pilar: str, plataforma: str, etapa: str,
  gancho: str, guion: str, cta: str, objPsico: str, objAlgoritmo: str,
  duracion: str, edicion: str, plano: str, miniatura: str,
  hashtags: arr(str), keyword: str, musica: str, icgEsperado: str
});

/** Lote de piezas (generación de contenido y Regla de 3 en UNA llamada). */
export const PIEZAS = obj({ piezas: arr(PIEZA) });

/** Planificación semanal del calendario. */
export const PLAN_SEMANA = obj({ asignaciones: arr(obj({ id: str, dia: int })) });

/** Campaña publicitaria del mes. */
export const CAMPANA = obj({
  nombre: str, objetivo: str, presupuesto: str,
  campanas: arr(obj({ nombre: str, objetivoPlataforma: str, audiencia: str, pct: str, creativo: str, kpi: str })),
  remarketing: str, reglas: str
});

/** Secuencia de automatización. */
export const SECUENCIA = obj({
  nombre: str, canal: str,
  pasos: arr(obj({ paso: str, mensaje: str, nota: str })),
  cadencia: str
});
