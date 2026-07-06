# Auditoría técnica — 321 OS (Método 3·2·1)

**Fase 1 del plan de trabajo · Solo lectura: en esta fase no se modificó ninguna línea del código funcional.**

- Fecha: 2026-07-06
- Auditor: Staff Software Engineer (Claude Code)
- Código auditado: `index.html` (1,628 líneas, archivo único) — preservado tal cual en este commit como línea base para poder comparar cada cambio de las fases siguientes.

---

## 1. Resumen ejecutivo

321 OS es una aplicación funcional y conceptualmente muy bien diseñada: la base de conocimiento del Método 3·2·1, el cálculo del ICG y el flujo cliente → diagnóstico → estrategia → contenido → calendario → banco → publicidad → dashboard están completos y son coherentes con la metodología. La calidad del "producto" (dominio) es alta.

Sin embargo, **la aplicación hoy no puede funcionar fuera del entorno donde fue generada** (el sandbox de Claude Artifacts) por dos motivos bloqueantes:

1. **La capa de IA está rota en producción.** Llama a `https://api.anthropic.com/v1/messages` directamente desde el navegador **sin API key ni headers obligatorios** (`x-api-key`, `anthropic-version`). En cualquier hosting real la API responde 401 y el navegador bloquea la petición por CORS. Todas las funciones de IA (diagnóstico, estrategia, contenido, campañas, automatizaciones, análisis) fallan. La única forma de "arreglarlo" sin backend sería incrustar la API key en el cliente, lo cual **expondría la key a cualquier visitante** — inaceptable para un SaaS.
2. **No hay persistencia real.** Los datos se guardan vía `window.storage`, una API que **no existe en los navegadores** (es del sandbox de Artifacts). En producción, cada recarga de página borra todos los clientes, estrategias y métricas. El único salvavidas es la exportación manual a JSON.

Además: el repositorio estaba vacío (el código vivía solo fuera de git), no existe React/Next.js/TypeScript (la app es un único HTML con JS vanilla, contrario a lo que asume el brief), no hay tests, ni linting, ni CI, ni build, ni autenticación, ni multiusuario.

**Conclusión:** el producto es un excelente prototipo funcional de dominio. Para convertirlo en software comercial se necesita (a) un backend que custodie la API key y los datos, (b) una migración ordenada a una arquitectura Next.js + TypeScript modular, y (c) corregir la lista de errores documentada abajo. Nada de esto exige reescribir la lógica de negocio: KB, ICG, alertas y las 10 pantallas se migran tal cual, módulo por módulo.

Calificación por área (0–10):

| Área | Nota | Comentario |
|---|---|---|
| Lógica de dominio (método, ICG, alertas) | 9 | Fiel al método, con 3 desviaciones menores documentadas |
| UX / diseño visual | 7.5 | Ya tiene lenguaje visual tipo Linear/Notion; faltan detalles |
| Arquitectura de código | 4 | Monolito de 1 archivo, acoplamiento global, sin tipos |
| Seguridad | 1 | API sin auth desde el navegador; sin backend; sin validación |
| Persistencia / datos | 2 | API inexistente en navegadores; pérdida de datos garantizada |
| Accesibilidad | 5 | Buen punto de partida, con huecos concretos (lista abajo) |
| Rendimiento | 6 | Correcto a esta escala; patrones que no escalan |
| Preparación para SaaS | 1 | Sin auth, sin multiusuario, sin API, sin infraestructura |

---

## 2. Arquitectura actual

Un solo archivo `index.html` con tres capas embebidas:

```
index.html
├─ <style>            ~340 líneas de CSS (tokens, layout, componentes, responsive)
├─ <body>             cascarón estático (sidebar, topbar, #view, toasts, modal host)
└─ <script>           ~1,050 líneas de JS vanilla en 15 "módulos" lógicos:
   ├─ KB              Base de conocimiento (12 secciones de texto del método)
   ├─ Store           Estado global + persistencia (window.storage) + export/import
   ├─ AI              fetch a api.anthropic.com + parseo heurístico de JSON
   ├─ ICG             Medianas móviles + fórmula del ICG + clasificación
   ├─ UI              Helpers (esc, toast, modal, meter, chips, svgLine, fechas)
   ├─ F()             Constructor de campos de formulario
   ├─ S1..S10         Las 10 pantallas (Clientes, Dx, Estrategia, Contenido,
   │                  Calendario, Banco, Ads, Autos, Dashboard, Método)
   └─ App             Router por estado en memoria + nav + rail + arranque
```

Características estructurales:

- **Renderizado:** cada pantalla reconstruye su HTML como string concatenado y lo inyecta con `innerHTML`; después re-adjunta todos los event listeners con `querySelectorAll`. No hay virtual DOM ni componentes reales.
- **Estado:** objeto global mutable `Store.data` (clients[], activeId, modules[], kbNotes). Las pantallas mutan directamente y llaman `Store.save()` (debounce 500 ms).
- **Acoplamiento:** todos los módulos son globales y se referencian entre sí libremente (KB lee Store; AI lee KB y Store; las pantallas leen/escriben todo). No hay fronteras reales: los "módulos" son comentarios, no unidades aisladas.
- **Routing:** `App.actual` en memoria; al recargar la página siempre se vuelve a "Clientes" (no hay hash/URL routing).
- **Positivo a rescatar:** la separación conceptual en módulos está bien pensada y mapea 1:1 a una estructura de carpetas real; el cálculo determinista (presupuesto 5/10/15/20/20/30, ICG, alertas) vive en código y no se delega a la IA — decisión correcta; el prompt de sistema inyecta solo las secciones de KB relevantes por pantalla.

---

## 3. Tecnologías utilizadas

| Capa | Tecnología real | Lo que asume el brief |
|---|---|---|
| UI | HTML + CSS artesanal + JS vanilla (ES6, sin build) | React / Next.js |
| Tipado | Ninguno | TypeScript |
| Estado | Objeto global mutable | — |
| Persistencia | `window.storage` (API del sandbox de Artifacts, inexistente en navegadores) + export/import JSON manual | — |
| IA | `fetch` directo a `api.anthropic.com/v1/messages`, modelo `claude-sonnet-4-6`, `max_tokens: 1000`, sin auth, sin streaming, sin structured outputs | — |
| Fuentes | Google Fonts (Instrument Sans, Geist Mono) — única dependencia externa | — |
| Gráficas | SVG generado a mano (sin librerías) — decisión ligera y acertada | — |
| Backend / Auth / DB / Tests / CI / Build | No existen | — |

Nota verificada contra la referencia oficial de la API: `claude-sonnet-4-6` **es un ID de modelo válido y vigente** (Claude Sonnet 4.6). El problema no es el modelo sino la ausencia total de autenticación y de headers obligatorios.

## 4. Dependencias

- **Externas en runtime:** solo Google Fonts (2 familias). Riesgo bajo; para un SaaS conviene self-host (`next/font`) por rendimiento y privacidad (GDPR).
- **API de Anthropic:** dependencia crítica sin manejo de rate limits, sin reintentos con backoff (solo 1 reintento por JSON inválido), sin timeout/AbortController, sin streaming.
- **npm/paquetes:** ninguno. No hay `package.json`, lockfile ni gestión de versiones.

---

## 5. Problemas encontrados

Clasificación: 🔴 bloqueante · 🟠 grave · 🟡 medio · 🔵 menor. Referencias por módulo (el archivo es único).

### 🔴 Bloqueantes (la app no sirve en producción sin esto)

| # | Problema | Dónde | Detalle |
|---|---|---|---|
| B1 | Llamada a la API de Anthropic desde el navegador sin autenticación | `AI.raw` | Solo envía `Content-Type`. Faltan `x-api-key` y `anthropic-version` → 401. Además el navegador bloquea por CORS. Funcionaba solo por el proxy del sandbox de Artifacts. **Fix:** mover la llamada a un backend (route handler de Next.js) con la key en variable de entorno del servidor. Nunca exponer la key al cliente. |
| B2 | Persistencia sobre una API inexistente | `Store.load/save` | `window.storage.get/set` no existe en navegadores → siempre cae al catch → los datos viven solo en memoria y se pierden al recargar. El aviso "Solo en memoria" aparece recién al intentar guardar. **Fix corto:** `localStorage`/IndexedDB como fallback. **Fix real (SaaS):** base de datos con auth. |
| B3 | Sin autenticación ni multiusuario | global | Cualquiera con la URL vería/modificaría todo. Datos de clientes de agencia (precios, márgenes, estrategias) son confidenciales. Prerrequisito de SaaS. |

### 🟠 Graves

| # | Problema | Dónde | Detalle |
|---|---|---|---|
| G1 | Riesgo de exposición de API key si se "arregla" B1 en el cliente | `AI.raw` | La tentación natural es añadir la key al fetch del navegador. Cualquier visitante la leería en DevTools y podría gastar la cuenta. Debe quedar explícitamente prohibido en la arquitectura. |
| G2 | `max_tokens: 1000` + parseo heurístico de JSON | `AI.raw/parse/json` | Respuestas JSON largas se truncan; el "fix" actual es reintentar pidiendo "más breve". Frágil: `parse()` recorta por llaves y puede aceptar JSON malformado o rechazar respuestas válidas. **Fix:** structured outputs del SDK (`output_config.format` con json_schema) + `max_tokens` adecuado + streaming; elimina la clase entera de errores. |
| G3 | Importación de respaldo sin validación de esquema | `Store.importar` | Un JSON arbitrario reemplaza TODO el estado. `normaliza()` protege arrays de cliente pero no la forma de `banco[]`: una pieza sin `icg` numérico rompe el render del Banco (`b.icg.toFixed(2)` → TypeError) y la pantalla queda en blanco. Vector real de crash + pérdida de datos (el import pisa lo anterior sin confirmación). |
| G4 | Sin manejo de errores de red/API digno de producto | `AI.*`, pantallas | Se muestra `e.message` crudo ("Failed to fetch", mensajes internos de la API, en inglés). Sin reintentos con backoff, sin distinción 429/5xx vs 4xx, sin AbortController (peticiones huérfanas al navegar), sin cola: doble clic en "Diseñar campaña"/"Replicar ×3"/"Planificar semana" dispara generaciones duplicadas (esos botones no se deshabilitan; "Generar diagnóstico" sí). |
| G5 | Fechas por defecto en UTC | `S_Contenido.programar`, `S_Banco.formulario`, `S_Dash.formulario` | `new Date().toISOString().slice(0,10)` devuelve la fecha UTC: un usuario de México/Colombia/Argentina después de las ~18–21 h ve "mañana" como fecha por defecto. Inconsistente con `S_Cal.iso()` que sí usa fecha local. Afecta a qué semana/día se registran métricas y publicaciones. |
| G6 | Borrado de cliente depende de `confirm()` | `S_Clientes` | En iframes sandboxeados (embeds, algunos webviews) `confirm()` retorna `false` silenciosamente → el botón "Eliminar" parece muerto. Además rompe la coherencia visual (hay sistema de modales propio). El resto de borrados (campañas, autos, piezas, semanas) ni siquiera confirma, y no existe deshacer. |

### 🟡 Medios

| # | Problema | Dónde |
|---|---|---|
| M1 | El ICG se recalcula retroactivamente: cada alta/borrado recalcula TODAS las piezas contra el banco actual, así que el ICG histórico de una pieza cambia con el tiempo. El método define la mediana móvil de las **15 piezas anteriores** a la pieza evaluada; la implementación usa "las otras 15 por orden de inserción", no por fecha. Decisiones ya tomadas ("replicar ×3") pueden quedar referidas a un ICG que ya no existe. | `S_Banco.recalcular`, `ICG.calc` |
| M2 | En mes 6, el "modo venta" del ICG se aplica por pieza solo si `conversiones > 0` → dentro del mismo ranking conviven piezas calculadas con dos fórmulas distintas (pesos diferentes), comparación inconsistente. | `S_Banco.recalcular` |
| M3 | `ICG.mediana` filtra `x > 0`: los ceros no cuentan para la mediana. Una cuenta donde la mayoría de piezas tiene 0 compartidos obtiene medianas infladas (solo de las que sí compartieron) o mediana 0 → ratio forzado a 1. Sesga el índice en cuentas chicas. | `ICG.mediana` |
| M4 | Regla de 3 desviada del método: exige `todas las piezas ≥ 1.15` además de 3 ≥ 1.3. Una estructura con 4 piezas (1.4, 1.35, 1.3, 1.0) **no** certifica aunque cumple "3 piezas ≥ 1.3". | `S_Banco.estructuras` |
| M5 | Métricas semanales: permite guardar semana con fecha vacía y fechas duplicadas; el borrado usa `semana` como clave → borra todas las filas con la misma fecha; gráficas y deltas se distorsionan. | `S_Dash.formulario` |
| M6 | Generación secuencial: 3 piezas = 3 llamadas en serie (~30-60 s), reenviando en cada una todo el KB (miles de tokens). Costo y latencia multiplicados. Fix: 1 llamada que devuelva array, o paralelizar + prompt caching en el backend. | `S_Contenido.generar`, `S_Banco.replicar` |
| M7 | Estado no persistido en la ficha: los inputs guardan en memoria en `input` pero `Store.save()` solo en `change`; texto escrito sin blur se pierde si cierras la pestaña (agravado por B2). No hay flush en `beforeunload`. | `S_Clientes` |
| M8 | Al recargar, siempre vuelve a "Clientes" (routing en memoria); el indicador "Guardado ✓" queda fijo para siempre; navegación durante una generación deja el spinner huérfano (el resultado sí se guarda, pero el usuario no lo sabe). | `App`, `UI.saveDot` |

### 🔵 Menores

- `F()` no escapa `label` ni `hint` (hoy son constantes del código, pero el patrón es frágil — un descuido futuro = XSS).
- `c.analisis` se agrega dinámicamente al cliente pero no existe en `nuevoCliente()` ni en `normaliza()` — esquema de datos implícito/indocumentado.
- Números sin límites: retención 4500 %, presupuesto negativo imposible pero 0/valores absurdos pasan sin aviso.
- Gasto/ingresos en el histórico se muestran sin formato de moneda (inconsistente con el resto).
- Dos tabs abiertas (cuando haya storage real) se pisan mutuamente (last-write-wins sin merge).
- Enter no envía los formularios de los modales (no hay `<form>`).

## 6. Código repetido (DRY)

1. **Distribución presupuestaria `[5,10,15,20,20,30]`** definida en `S_Estrategia.DIST` y duplicada inline en `S_Ads` (`[5,10,15,20,20,30][c.mes-1]`). Si el método cambia, hay que tocar 2 sitios.
2. **Clasificación de nivel de presupuesto A/B/C** (`p<300 ? 'A' : p<=1500 ? 'B' : 'C'`) duplicada en `S_Estrategia.render` y `S_Ads.render` con strings ligeramente distintos.
3. **Títulos de pantalla** duplicados: `S_*.title` y `App.labels` son dos fuentes de verdad casi iguales ("Clientes" vs "Nuevo cliente").
4. **Patrón crear-cliente** repetido 3 veces (bNuevo, bNuevo2 y de nuevo más abajo en la misma pantalla).
5. **Helper `num()` de campos numéricos de modal** definido 2 veces (Banco y Dashboard) con firmas casi idénticas.
6. **Patrón "generar con spinner + try/catch + refresh"** repetido en 7 pantallas con variaciones (unas deshabilitan botón, otras no; unas usan toast, otras warn) — candidato a un único helper/hook.

## 7. Componentes innecesarios / código muerto

- **CSS muerto:** `.btn.ink` y `.btn.ink:hover` (ninguna vista usa la clase `ink`); token `--ink-2` sin uso. *(Ojo: `--blue-t` parece duplicado de `--blue-tint` pero SÍ se usa — las alertas construyen `var(--blue-t)` por string; documentarlo antes de "limpiar".)*
- **JS muerto:** propiedad `grupo` en `App.rutas` (la agrupación real está hardcodeada en `pintaNav`); variable `cur` sin uso en `S_Cal.render`; parámetro `hint` de `num()` en Dashboard nunca usado.
- **Naming residual:** clase `.login-hint` usada para el aviso de almacenamiento (sugiere un login que no existe).
- **No se detectan funcionalidades sobrantes**: las 10 pantallas y todos los flujos están conectados al método. No se recomienda eliminar ninguna funcionalidad.

---

## 8. Rendimiento

Estado actual: aceptable para 1 usuario con pocos clientes; hay patrones que no escalan.

- **Re-render total por interacción:** cada acción reconstruye el HTML completo de la pantalla (y `App.refresh()` repinta además nav + rail). Marcar publicado en calendario está optimizado (`pinta` local) — bien —, pero borrar una pieza de contenido re-renderiza toda la biblioteca. Con 200+ piezas acumuladas en 6 meses se notará.
- **Listas sin límite ni virtualización:** biblioteca de contenido, banco e histórico renderizan todo siempre. Falta paginación o lazy render.
- **Llamadas IA:** secuenciales (ver M6), sin streaming (el usuario espera 10-30 s mirando un spinner), reenviando ~6-10k tokens de KB en cada llamada. En backend, **prompt caching** de Anthropic reduciría costo del prefijo ~90 % y el streaming reduciría la latencia percibida drásticamente.
- **Fuentes:** Google Fonts render-blocking con roundtrip a terceros (mitigado por `display=swap` y preconnect). Self-host elimina el roundtrip.
- **Bundle:** N/A (sin build). El HTML pesa ~90 KB sin comprimir — hoy no es problema; la migración a Next.js habilita code-splitting por pantalla cuando crezca.
- **Positivo:** debounce de guardado (500 ms), gráficas SVG propias sin librerías pesadas, cero dependencias JS.

## 9. Accesibilidad

Lo bueno (poco común en prototipos): `lang="es"`, `prefers-reduced-motion` respetado, `:focus-visible` en botones/nav/segmentos, `<details>/<summary>` nativos, `title` en botones de icono, modo táctil para las acciones del calendario (`@media hover:none`), y el drag & drop tiene alternativa por modal ("Mover").

Huecos concretos a corregir:

1. **Labels no asociados a inputs**: `F()` y los modales generan `<label>` + `<input>` hermanos sin `for`/`id` → los lectores de pantalla no anuncian el campo.
2. **Modales sin semántica ni gestión de foco**: falta `role="dialog"`, `aria-modal`, mover el foco al abrir, devolverlo al cerrar, atraparlo dentro, y cerrar con Escape.
3. **Toasts invisibles para lectores de pantalla**: el contenedor necesita `aria-live="polite"`.
4. **Contraste insuficiente**: `--faint` (#98A0B0 sobre blanco ≈ 2.9:1) se usa en textos informativos < AA (4.5:1). `--muted` está al límite (≈ 4.8:1, OK).
5. **Gráficas SVG sin texto alternativo** (`role="img"` + `<title>`) y tablas sin `scope`/`caption`.
6. **Select de cliente y select de mes** sin label accesible (solo `title`).
7. Iconos de navegación decorativos sin `aria-hidden="true"`.

## 10. Seguridad

1. **Crítico — arquitectura:** API de Anthropic invocada desde el cliente (B1/G1). Regla para todas las fases siguientes: la key vive SOLO en el servidor; el navegador habla con `/api/*` propio, autenticado y con rate limit.
2. **Sin autenticación/autorización** (B3): imprescindible antes de uso comercial (los datos de clientes de la agencia son sensibles).
3. **XSS:** buen hábito general — `UI.esc()` se aplica consistentemente a datos de usuario y a respuestas de la IA (revisado pantalla por pantalla: no encontré un vector explotable hoy). El riesgo es estructural: 100+ concatenaciones manuales de `innerHTML` donde **un solo olvido futuro = XSS**. `F()` ya inyecta `label`/`hint` sin escapar (hoy constantes). JSX de React elimina la clase de bug por diseño.
4. **Inyección de prompt por diseño:** los "Módulos de actualización" y las "Notas de la agencia" se inyectan al system prompt. Es una feature (así se actualiza el método), pero en un SaaS multiusuario debe quedar aislada por tenant y documentada como superficie de riesgo.
5. **Import de JSON sin validación** (G3): validar con schema (Zod) antes de aceptar.
6. **Sin variables de entorno** (nada que proteger aún — precisamente porque la key no está; al añadir backend: `.env` fuera de git, secretos en Vercel/hosting).
7. **Errores crudos al usuario** (G4): los mensajes internos de la API no deben llegar a la UI.

## 11. Fidelidad al Método 3·2·1 (lógica de dominio)

Verificado contra la KB embebida:

- ✅ Fórmula ICG estándar: pesos 0.15/0.30/0.25/0.15/0.15 — correcta.
- ✅ Modo venta: V con 0.30 y reescalado ×0.70 de los demás (0.105/0.21/0.175/0.105/0.105) — matemática correcta.
- ✅ Umbrales de clasificación (1.5/1.2/0.8) y acciones — correctos.
- ✅ Distribución presupuestaria 5/10/15/20/20/30 y niveles A/B/C — correctos.
- ✅ Alertas del dashboard implementan fielmente el "diagnóstico por síntoma" (§12.7–12.8).
- ⚠️ Desviaciones a corregir: mediana "móvil" no cronológica y recálculo retroactivo (M1), modo venta por pieza (M2), ceros excluidos de la mediana (M3), Regla de 3 más estricta que el método (M4).

## 12. Recomendaciones y arquitectura objetivo

### Decisión estructural (a validar contigo antes de la Fase 2)

**Migrar a Next.js (App Router) + TypeScript**, portando módulo por módulo la lógica ya escrita. No es una reescritura del producto: KB, ICG, alertas, prompts y las 10 pantallas se trasladan; lo que cambia es el esqueleto. Justificación: es la única vía razonable para (a) backend que custodie la API key, (b) persistencia real, (c) auth multiusuario, (d) tipado fuerte, (e) los objetivos de escalabilidad del brief (módulos TikTok/LinkedIn/CRM/facturación).

```
src/
├─ app/                    # rutas (App Router) + /api (proxy Anthropic, auth)
├─ modules/                # 1 carpeta por dominio: clients, diagnosis, strategy,
│  │                       # content, calendar, bank, ads, automations, dashboard, kb
│  │                       # cada uno: components/ + hooks/ + service + types + README
├─ core/                   # icg.ts, budget.ts, alerts.ts, method-kb.ts (puros, testeables)
├─ lib/                    # cliente Anthropic (server-only), db, validaciones (Zod)
└─ components/ui/          # design system (Button, Card, Modal, Field, Chip, Toast…)
```

- **Datos:** SQLite/Postgres vía Prisma o Supabase (auth incluida). Fase intermedia posible: IndexedDB local para validar la migración sin backend.
- **IA:** SDK oficial `@anthropic-ai/sdk` en route handlers; structured outputs (json_schema) en vez del parseo heurístico; streaming a la UI; prompt caching del KB (~90 % de ahorro en el prefijo); reintentos/backoff del SDK. Modelo: mantener Sonnet 4.6 o evaluar `claude-opus-4-8` para diagnóstico/estrategia (mayor calidad) — decisión de costo/calidad para la Fase 5.
- **Estado cliente:** React Query (server state) + estado local; elimina el re-render global manual.
- **Calidad:** ESLint + Prettier + Vitest (unit para `core/`: ICG, presupuesto, alertas, fechas) + Playwright (flujo crítico) + GitHub Actions.

### Plan por fases (mapeado a tu flujo de trabajo)

| Fase (tuya) | Contenido concreto | Entregable |
|---|---|---|
| 1. Auditoría | Este documento | ✅ AUDITORIA.md |
| 2. Arquitectura | Scaffold Next.js+TS, carpetas por módulo, design tokens portados, CI básico | App corre con las 10 pantallas vacías |
| 3. Corrección de errores | B2 (persistencia), G3, G5, G6, M5, M7, M8 sobre la lógica portada | Bugs cerrados con tests |
| 4. Refactorización | Portar KB/ICG/pantallas a módulos tipados; eliminar duplicaciones §6 y muertos §7 | Paridad funcional 1:1 |
| 5. Optimización | B1/G1/G2/G4/M6: backend IA con SDK, structured outputs, streaming, caching | IA funcionando en producción |
| 6. UX/UI | Detalles premium (estados vacíos, undo, confirmaciones propias, focus, micro-interacciones) | UI nivel SaaS |
| 7. Rendimiento | React Query, memoización, paginación de listas, fuentes self-host, code-splitting | Métricas Lighthouse |
| 8. Seguridad | Auth (Supabase/NextAuth), aislamiento por usuario, validación Zod en API, rate limit | App protegida |
| 9. Documentación | README por módulo (qué hace, cómo extender, dependencias, riesgos) + guía de despliegue | Docs completas |
| 10. Pruebas | Suite unit+e2e, fixtures del método (casos ICG conocidos) | CI verde |

### Decisiones que necesito de ti antes de la Fase 2

1. **¿Apruebas la migración a Next.js + TypeScript?** (Alternativa: mantener vanilla JS y solo añadir un mini-backend — más rápido, pero incumple los objetivos de escalabilidad, tipado y módulos futuros del brief.)
2. **Persistencia:** ¿Supabase (Postgres + auth listos, gratis para empezar) o Prisma+SQLite local primero?
3. **Los 4 ajustes de fidelidad al método (M1–M4):** ¿los corrijo hacia la letra del método, o el comportamiento actual es intencional?
4. **Hosting previsto** (¿Vercel?) — condiciona detalles de la Fase 2.

---

*Fin de la Fase 1. No se modificó código funcional: este commit solo agrega la línea base (`index.html` tal cual existía) y este reporte. Espero tu aprobación y respuestas para iniciar la Fase 2 (Arquitectura).*
