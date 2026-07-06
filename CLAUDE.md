# 321 OS — guía para sesiones de desarrollo

## Comandos
- `npm start` — servidor en http://localhost:3000 (lee `.env` si existe)
- `npm test` — unitarias (ICG + schemas, sin dependencias)
- Smoke e2e: ver README § Pruebas (Playwright + Chromium)

## Arquitectura en una línea
Frontend vanilla ES modules en `public/js/` (pantallas en `screens/`, lógica pura en `icg.js`/`presupuesto.js`) + mini-backend `server.js` (estáticos + `POST /api/ai`, único puente con Anthropic). Datos en IndexedDB del navegador. Detalle por módulo: `docs/MODULOS.md`.

## Reglas del proyecto
1. **Todo dato de usuario o de IA pasa por `UI.esc()` antes de entrar a HTML** (única barrera XSS).
2. La API key de Anthropic vive SOLO en el servidor; el navegador habla con `/api/ai`.
3. `ICG.calc(bancoPrevio, pieza, modoVenta)` recibe el banco SIN la pieza (ICG fijo al registrar — no recalcular retroactivamente).
4. Cambios de esquema de datos: tocar `Store.nuevoCliente()` y `Store.normaliza()` juntos.
5. Cambios en `icg.js`/`presupuesto.js`/`schemas.js` exigen actualizar su test en el mismo commit.
6. Pantalla nueva: `screens/x.js` con `{title, render(el)}` + entrada en `App.rutas` + grupo en `pintaNav` (+ schema si genera con IA).
7. Textos de UI y commits en español.

## Historial
El proyecto se profesionalizó en 10 fases documentadas (auditoría en `AUDITORIA.md`, original en `legacy/index.original.html`); los mensajes de commit de la rama `claude/321os-audit-refactor-8v8eos` explican cada fase.
