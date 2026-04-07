# Tarea 01 — Dockerizar los servicios
> Leé `AGENT.md` y `ARCHITECTURE.md` antes de empezar.

---

## Objetivo

Crear los archivos de infraestructura Docker para que los tres servicios del proyecto puedan levantarse con un solo comando: `docker compose up`.

---

## Antes de empezar, confirmá esto

- [ ] Leíste `ARCHITECTURE.md` sección §3 (Servicios y contenedores Docker)
- [ ] Leíste `ARCHITECTURE.md` sección §9 (Variables de entorno)
- [ ] Confirmás en un mensaje qué carpetas vas a crear y qué archivos vas a tocar

---

## Scope — qué podés tocar

| Acción | Archivo |
|--------|---------|
| Crear o sobreescribir | `docker-compose.yml` |
| Crear carpeta | `services/python/` |
| Crear carpeta | `services/api/` |
| Crear carpeta | `frontend/` |
| Crear | `services/python/Dockerfile` |
| Crear | `services/python/requirements.txt` (vacío, solo un comentario) |
| Crear | `services/api/Dockerfile` |
| Crear | `frontend/Dockerfile` |
| Crear | `.env.example` |

---

## Fuera de scope — no tocar

- Cualquier archivo `.py` existente
- Cualquier archivo `.js` o `.jsx` existente
- `ARCHITECTURE.md`
- `AGENT.md`
- Archivos dentro de `src/`
- `package.json` o `requirements.txt` existentes

---

## Requisitos de cada archivo

### `docker-compose.yml`
- Tres servicios: `python-worker`, `node-api`, `react-dashboard`
- Todos en la misma red interna llamada `pegasus_network`
- `node-api` expone el puerto `3000`
- `react-dashboard` expone el puerto `5173`
- `python-worker` no expone puertos
- Todos leen variables de entorno desde `.env`
- La conexión a MySQL usa la variable `DATABASE_URL` que apunta a Railway (no hay contenedor de base de datos local)

### `services/python/Dockerfile`
- Base: `python:3.11-slim`
- Instala dependencias desde `requirements.txt`
- Working directory: `/app`

### `services/api/Dockerfile`
- Base: `node:20-slim`
- Instala dependencias con `npm install`
- Working directory: `/app`
- Comando de inicio: `npm run dev`

### `frontend/Dockerfile`
- Base: `node:20-slim`
- Instala dependencias con `npm install`
- Working directory: `/app`
- Comando de inicio: `npm run dev`
- Expone el puerto `5173`

### `.env.example`
- Lista todas las variables necesarias con valores de ejemplo, nunca valores reales
- Incluir como mínimo: `DATABASE_URL`, `MOODLE_TOKEN`, `MOODLE_URL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `API_PORT`, `NODE_ENV`

---

## Entregables

Al terminar esta tarea deben existir exactamente estos archivos nuevos:

```
docker-compose.yml
services/python/Dockerfile
services/python/requirements.txt
services/api/Dockerfile
frontend/Dockerfile
.env.example
```

---

## Cuándo parar

Cuando los 5 archivos del listado de entregables estén creados. **No sigas a la siguiente tarea.** Avisá que terminaste y esperá confirmación.
