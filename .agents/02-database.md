# Tarea 02 — Mover archivo de conexión a base de datos
> Leé `AGENT.md` y `ARCHITECTURE.md` antes de empezar.

---

## Objetivo

Mover el archivo `mysql.js` de la raíz del proyecto a la carpeta correcta según `ARCHITECTURE.md`. Nada más.

---

## Contexto importante

- Existe un archivo `mysql.js` en la raíz del proyecto que conecta correctamente a MySQL.
- Existe un `.env` en la raíz con `DATABASE_URL` configurada y funcionando.
- **No reescribir la lógica** — solo mover el archivo.
- **No tocar el `.env`** — queda en la raíz.

---

## Antes de empezar, confirmá esto

- [ ] Ubicaste `mysql.js` en la raíz
- [ ] Revisaste `ARCHITECTURE.md` para saber la ruta exacta donde debe vivir el archivo de conexión
- [ ] Confirmás en un mensaje la ruta de destino antes de mover nada

---

## Scope — qué podés tocar

| Acción | Archivo |
|--------|---------|
| Mover | `mysql.js` → ruta según `ARCHITECTURE.md` |
| Ajustar si es necesario | El path del `require("dotenv").config()` si cambia la ubicación relativa al `.env` |

---

## Fuera de scope — no tocar

- El contenido lógico de `mysql.js`
- `.env`
- Cualquier otro archivo del proyecto

---

## Entregables

- `mysql.js` en la ruta correcta según `ARCHITECTURE.md`
- `mysql.js` eliminado de la raíz

---

## Cuándo parar

Cuando el archivo esté en su nueva ubicación. Avisá la ruta final y esperá confirmación.
