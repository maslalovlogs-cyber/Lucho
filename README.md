# 321 OS — Método 3·2·1

Aplicación de inteligencia estratégica para agencias, basada en el **Método 3·2·1**: diagnóstico con IA, estrategia de 6 meses, generación de contenido, calendario editorial, Banco de Contenido Ganador (ICG), publicidad, automatizaciones y dashboard.

## Cómo ejecutarla

Requisitos: Node.js 22 o superior (el arranque usa `--env-file-if-exists`, disponible desde 22.9).

```bash
npm install
cp .env.example .env     # y completa ANTHROPIC_API_KEY
npm start                # http://localhost:3000
```

Sin `ANTHROPIC_API_KEY` la app funciona igualmente, pero las funciones de IA muestran un aviso. Si vas a exponer el servidor a internet, define también `APP_PASSWORD` (la interfaz la pedirá una sola vez): sin ella, cualquiera podría gastar tu cuenta de Anthropic a través del proxy.

## Arquitectura

```
server.js                  Mini-backend Node: sirve /public y expone POST /api/ai
                           (la API key de Anthropic vive SOLO aquí, vía .env)
public/
├─ index.html              Cascarón de la aplicación
├─ css/styles.css          Design system (tokens, layout, componentes)
└─ js/
   ├─ kb.js                Base de conocimiento del Método 3·2·1 (12 secciones)
   ├─ store.js             Estado + persistencia en IndexedDB (export/import JSON)
   ├─ ai.js                Cliente del backend de IA (/api/ai)
   ├─ icg.js               Índice de Contenido Ganador (medianas móviles, pesos, clases)
   ├─ presupuesto.js       Reglas de presupuesto del método (distribución y niveles A/B/C)
   ├─ schemas.js           JSON Schemas de cada generación de IA (structured outputs)
   ├─ ui.js                Helpers de interfaz (esc, toast, modal, meter, svgLine, F)
   ├─ app.js               Router, navegación, rail 3·2·1 y arranque
   └─ screens/             Las 10 pantallas (una por archivo)
legacy/index.original.html Versión monolítica original (línea base de la auditoría)
test/smoke.mjs             Prueba de humo end-to-end (Playwright)
AUDITORIA.md               Auditoría técnica completa (Fase 1)
docs/MODULOS.md            Documentación por módulo (qué hace, cómo extender, riesgos)
docs/DESPLIEGUE.md         Guía de despliegue (Docker, VPS, checklist)
```

- **Datos:** viven en el navegador (IndexedDB), por dispositivo. Respaldo manual en la pantalla **Método → Datos** (exportar/importar JSON). La migración a base de datos multiusuario está prevista en el roadmap.
- **IA:** el navegador nunca habla con Anthropic directamente; llama a `/api/ai` y el servidor hace la petición con el SDK oficial (modelo `claude-sonnet-5`, salidas estructuradas + prompt caching).
- **Actualizar el método sin tocar código:** pantalla **Método** → módulos de actualización y notas de la agencia (se inyectan en cada llamada de IA).

## Pruebas

```bash
npm test                              # unitarias: ICG (M1–M4), schemas y presupuesto — sin dependencias

# Prueba de humo end-to-end (requiere Chromium):
npm i --no-save playwright
PORT=3113 node server.js &            # el test espera el puerto 3113
CHROMIUM_PATH=/ruta/a/chrome node test/smoke.mjs
```

La prueba de humo verifica: render de las 10 pantallas, creación de cliente, **persistencia tras recargar** (IndexedDB), pantalla activa tras recargar (hash routing), modal de eliminación y mensajes de error de IA legibles.

## Estado del proyecto (plan por fases)

| Fase | Estado |
|---|---|
| 1. Auditoría | ✅ `AUDITORIA.md` |
| 2. Arquitectura (separación en módulos, mini-backend, IndexedDB) | ✅ este commit |
| 3. Corrección de errores (G3–G6, M1–M8 de la auditoría) | ✅ |
| 4. Refactorización (duplicaciones, código muerto) | ✅ |
| 5. Optimización IA (structured outputs, lotes, prompt caching) | ✅ |
| 6. UX/UI y accesibilidad | ✅ |
| 7. Rendimiento (fuentes locales, gzip, caché HTTP) | ✅ |
| 8. Seguridad (CSP, rate limit, timing-safe) | ✅ |
| 9. Documentación (docs/, Dockerfile, CLAUDE.md) | ✅ |
| 10. Pruebas y CI (GitHub Actions) | ✅ |
