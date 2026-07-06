# 321 OS — Documentación de módulos

Cada sección responde: **qué hace · cómo funciona · cómo modificarlo · cómo agregar funciones · dependencias · riesgos**.

Convención general: los módulos de `public/js/` son módulos ES sin framework. Las pantallas renderizan HTML como string en `render(el)` y recablean sus listeners tras cada render. Todo dato de usuario o de IA pasa por `UI.esc()` antes de insertarse en HTML — **mantener esta regla en cualquier código nuevo es obligatorio** (es la defensa anti-XSS).

---

## server.js — mini-backend

- **Qué hace:** sirve la app estática de `/public` (gzip + caché + cabeceras de seguridad) y expone `POST /api/ai`, el único puente con la API de Anthropic. La API key vive exclusivamente aquí (`.env`).
- **Cómo funciona:** `apiAI()` valida contraseña (tiempo constante) → rate limit por IP (30/10 min) → valida cuerpo y tamaños → llama a `client.messages.create` con el system cacheado (`cache_control`), `thinking` desactivado y, si llega `schema`, `output_config.format` (structured outputs: JSON garantizado). Errores del SDK se mapean a mensajes claros en español sin filtrar detalles internos.
- **Cómo modificarlo:** modelo y límites están en constantes al inicio (`MODEL`, `MAX_TOKENS`, `VENTANA_MS`, `MAX_PETICIONES`). La CSP está en `cabecerasSeguridad()`.
- **Cómo agregar funciones:** nuevos endpoints se añaden en el dispatcher de `http.createServer` (patrón: función async propia + validación + `json(res, ...)`). Si un endpoint nuevo muta datos, exigir `APP_PASSWORD` igual que `/api/ai`.
- **Dependencias:** `@anthropic-ai/sdk` (única de producción), Node ≥ 22.
- **Riesgos:** sin `APP_PASSWORD` el proxy queda abierto (solo aceptable en local). El rate limit es en memoria: se reinicia con el proceso y no se comparte entre réplicas — con más de una instancia, moverlo a Redis o al reverse proxy.

## public/js/kb.js — base de conocimiento

- **Qué hace:** contiene el Método 3·2·1 completo en 12 secciones de texto (`KB.sec`) y arma el contexto de cada llamada de IA (`KB.ctx`).
- **Cómo funciona:** cada pantalla pide solo las secciones relevantes (p. ej. Publicidad pide `principios + etapaN + operativo`); `ctx()` añade al final los módulos de actualización activos y las notas de la agencia guardadas en Store.
- **Cómo modificarlo:** el texto del método se edita directamente en `KB.sec.*`. Cambios de algoritmo o plataformas nuevas NO requieren tocar código: se agregan como "módulos de actualización" desde la pantalla Método.
- **Cómo agregar funciones:** una sección nueva = una clave nueva en `KB.sec` + referenciarla en las pantallas que la necesiten.
- **Dependencias:** `store.js` (lee módulos y notas).
- **Riesgos:** el texto de módulos/notas se inyecta al system prompt tal cual (es la feature de actualización). En un futuro multiusuario, aislar por cuenta: es superficie de prompt injection entre tenants.

## public/js/store.js — estado y persistencia

- **Qué hace:** estado global (`Store.data`: clients, activeId, modules, kbNotes) + persistencia en IndexedDB + exportar/importar respaldos JSON.
- **Cómo funciona:** `load()` lee IndexedDB (migra desde localStorage si existiera) y pasa todo por `normaliza()`, que blinda la forma de los datos (arrays garantizados, `icg` numérico, semanas con fecha). `save()` marca pendiente y difiere 500 ms; `flush()` escribe ya (también en `pagehide`/pestaña oculta). `importar()` valida con `esRespaldoValido()` y pide confirmación antes de reemplazar.
- **Cómo modificarlo:** cambios de esquema de datos → tocar `nuevoCliente()` **y** `normaliza()` a la vez (normaliza es lo que protege los respaldos viejos).
- **Cómo agregar funciones:** campos nuevos del cliente solo necesitan default en `normaliza()`; colecciones nuevas se añaden a la lista de arrays garantizados.
- **Dependencias:** `ui.js` (indicador de guardado, toasts), `app.js` (refresh tras importar).
- **Riesgos:** IndexedDB es por navegador/dispositivo y purgable por el sistema — el respaldo JSON es la red de seguridad del usuario. Dos pestañas simultáneas: gana la última escritura.

## public/js/ai.js — cliente de IA

- **Qué hace:** construye el system prompt (`system()`), el contexto del cliente (`clienteCtx()`) y habla con `/api/ai` (`raw()`/`json()`).
- **Cómo funciona:** `json(system, user, schema)` envía el schema al backend → la respuesta es JSON válido garantizado → `JSON.parse` directo. Sin schema queda el parseo heurístico antiguo como fallback. Timeout de 3 min con `AbortSignal`. Si el servidor exige contraseña (401), la pide una vez y la recuerda en `sessionStorage`.
- **Cómo modificarlo:** el rol/reglas del "Director de Marketing Senior" están en `system()`.
- **Cómo agregar funciones:** una generación nueva = schema en `schemas.js` + llamada `AI.json(AI.system([...secciones], rol), prompt, SCHEMA)`.
- **Dependencias:** `kb.js`, `store.js`, backend `/api/ai`.
- **Riesgos:** ninguno propio; los errores llegan ya humanizados del backend.

## public/js/icg.js — Índice de Contenido Ganador (lógica pura)

- **Qué hace:** mediana móvil, ratios A/R/C/G/I/V, cálculo del ICG (pesos 0.15/0.30/0.25/0.15/0.15; modo venta reescalado ×0.70 + V 0.30), clasificación (1.5/1.2/0.8) y Regla de 3 (`estructuras()`).
- **Cómo funciona:** `calc(bancoPrevio, pieza, modoVenta)` — **contrato clave:** `bancoPrevio` es el estado ANTERIOR al registro; el ICG se calcula una vez y queda fijo (decisiones no cambian retroactivamente). Los ceros cuentan para la mediana; mediana 0 → ratio neutro 1.
- **Cómo modificarlo:** pesos y umbrales están a la vista; cualquier cambio DEBE reflejarse en `test/icg.test.mjs` (es la especificación ejecutable del método).
- **Cómo agregar funciones:** métricas nuevas = ampliar `ratios()` + pesos; mantenerlo puro (sin DOM/Store) para que siga siendo testeable.
- **Dependencias:** ninguna (módulo puro — por eso se testea en Node).
- **Riesgos:** romper el contrato de `calc` (pasarle el banco ya con la pieza) reintroduce el bug M1.

## public/js/presupuesto.js — reglas de presupuesto (lógica pura)

- **Qué hace:** distribución semestral fija (5/10/15/20/20/30) y niveles A/B/C. Única fuente de verdad para Estrategia y Publicidad.
- **Riesgos:** ninguno; mantenerlo puro.

## public/js/schemas.js — esquemas de salida de la IA

- **Qué hace:** un JSON Schema por generación (DX1–DX3, ETAPA, PIEZAS, PLAN_SEMANA, CAMPANA, SECUENCIA); el backend los convierte en `output_config.format`.
- **Cómo modificarlo/extender:** usar los helpers `obj/arr/str/int`. Reglas de la API: todo objeto lleva `additionalProperties:false` y `required` completo; sin `min/max`, `minLength`, `$ref` ni recursión (los matices se piden en el prompt). `test/schemas.test.mjs` verifica esto automáticamente.
- **Riesgos:** si el schema y el prompt piden formas distintas, manda el schema (la API fuerza la forma); mantenerlos alineados para no confundir al modelo.

## public/js/ui.js — helpers de interfaz

- **Qué hace:** `esc` (anti-XSS), toasts (aria-live), indicador de guardado, modales accesibles (dialog, foco, Escape, trampa de Tab), `confirmar()` destructivo, medidores, chips, listas, dinero, fechas locales (`hoyISO`), gráficas SVG, campos de formulario (`F`, `campoNum`).
- **Cómo modificarlo:** los modales concentran la accesibilidad — si se cambia su HTML, conservar `role=dialog`, gestión de foco y Escape.
- **Riesgos:** `esc()` es la única barrera XSS del proyecto; jamás insertar en HTML datos sin pasarla.

## public/js/app.js — router y arranque

- **Qué hace:** define las 10 rutas (id, label, icono, pantalla), pinta nav/rail/topbar, y arranca (`init`: carga Store, listeners, hash).
- **Cómo funciona:** la pantalla activa vive en el hash (`#dash`); `go()` renderiza síncrono y el evento `hashchange` cubre atrás/adelante. La navegación usa delegación: cualquier elemento con `data-go="id"` navega.
- **Cómo agregar una pantalla (ej. TikTok, CRM, Facturación):** 1) crear `screens/nueva.js` exportando `{ title, render(el) }`; 2) importarla en `app.js` y añadir una entrada a `rutas` + su id al grupo correspondiente de `pintaNav`; 3) si genera con IA, schema en `schemas.js`. Nada más — el hash routing, la delegación y el chrome ya la recogen.
- **Dependencias:** todas las pantallas, `store.js`, `ui.js`.
- **Riesgos:** los ids de ruta son parte de las URLs de los usuarios (marcadores); no renombrarlos sin redirección en `leeHash`.

## public/js/screens/ — las 10 pantallas

Patrón común: `render(el)` lee `Store.client()`, arma HTML (todo dato por `UI.esc`), lo inyecta y cablea listeners; las generaciones deshabilitan su botón, muestran `UI.thinking`, llaman `AI.json(..., SCHEMA)` y re-renderizan.

| Pantalla | Papel en el método | Particularidades |
|---|---|---|
| `clientes.js` | Ficha (semana 0) — alimenta todo | Guarda mientras se escribe; eliminación con modal resumen |
| `diagnostico.js` | FODA, persona, empatía, niveles, Matriz | 3 llamadas encadenadas (el paso 2 usa dolores del paso 1) |
| `estrategia.js` | Plan 6 meses por etapas | Presupuesto calculado en código (no IA); 3 llamadas, una por etapa |
| `contenido.js` | Generador de piezas | Lote completo en UNA llamada; historial anti-repetición viaja en el prompt |
| `calendario.js` | Mensual/semanal, drag & drop | `iso()` local; "Planificar semana" respeta la plantilla del método |
| `banco.js` | ICG + Regla de 3 | ICG fijo al registrar (contrato de `ICG.calc`); réplicas ×3 en una llamada |
| `publicidad.js` | Campaña del mes | Solo lista creativos ICG ≥ 1.2 como elegibles (Principio 1) |
| `autos.js` | Secuencias DM/WhatsApp/email | Mensajes literales listos para pegar |
| `dashboard.js` | Ritual de viernes: KPI + alertas | Alertas = reglas §12.7–12.8 evaluadas en código; semanas upsert por fecha |
| `metodo.js` | KB, módulos de actualización, respaldo | Aquí se actualiza el método sin tocar código |

**Riesgo transversal:** cada `App.refresh()` re-renderiza la pantalla completa; con historiales muy largos (cientos de piezas) convendrá paginar la biblioteca y el banco.

## test/ — pruebas

- `icg.test.mjs`: especificación ejecutable del ICG (M1–M4 con casos numéricos). `npm test`.
- `schemas.test.mjs`: valida las reglas de structured outputs en todos los schemas. `npm test`.
- `presupuesto.test.mjs`: distribución semestral y fronteras de los niveles A/B/C. `npm test`.
- `smoke.mjs`: end-to-end en Chromium (render, persistencia tras recarga, hash routing, modales, errores de IA legibles). Ver README para ejecutarla.
- **Regla:** cualquier cambio en `icg.js`/`presupuesto.js`/`schemas.js` exige actualizar su test en el mismo commit.
