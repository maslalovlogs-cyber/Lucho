# 321 OS — Guía de despliegue

La app es un único proceso Node sin base de datos (los datos viven en el navegador de cada usuario). Cualquier hosting que corra Node 22+ o un contenedor sirve.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Para usar IA | Key de https://console.anthropic.com — vive SOLO en el servidor |
| `APP_PASSWORD` | **Sí, en internet** | Sin ella, cualquiera que descubra la URL puede gastar tu cuenta de Anthropic a través de `/api/ai` |
| `PORT` | No | 3000 por defecto |

## Local

```bash
npm install && cp .env.example .env   # completa la key
npm start
```

## Docker (hosting-agnóstico)

```bash
docker build -t 321os .
docker run -d -p 3000:3000 -e ANTHROPIC_API_KEY=sk-... -e APP_PASSWORD=una-clave 321os
```

## VPS / servicios tipo Railway, Render, Fly.io

- Comando de arranque: `npm start` (o la imagen Docker).
- Configura las variables de entorno en el panel del servicio — **nunca** subas `.env` a git (ya está en `.gitignore`).
- Pon HTTPS delante (el servicio lo suele dar; en VPS propio, Caddy o nginx + certbot). La contraseña de acceso viaja en un header: sin HTTPS iría en claro.
- Si corres más de una réplica, el rate limit en memoria deja de ser global: muévelo al reverse proxy (p. ej. `limit_req` de nginx).

## Checklist antes de publicar

1. `APP_PASSWORD` definida y comunicada solo al equipo.
2. HTTPS activo.
3. `npm test` en verde.
4. Recordar al equipo el respaldo JSON (pantalla **Método → Datos**): los datos viven en el navegador de cada quien.

## Límites conocidos de esta arquitectura

- **Datos por dispositivo:** IndexedDB no se comparte entre equipos ni usuarios; el respaldo JSON es manual. El paso natural siguiente (cuando se necesite multiusuario) es una base de datos con autenticación — la lógica ya está modularizada para ese salto.
- **Una contraseña compartida** no es gestión de usuarios: no hay roles ni revocación individual.
