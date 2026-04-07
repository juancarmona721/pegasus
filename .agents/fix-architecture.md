# Tarea: Corregir ARCHITECTURE.md — 3 correcciones puntuales
> Leé AGENT.md antes de empezar.

---

## Objetivo

Aplicar exactamente 3 correcciones al archivo `ARCHITECTURE.md` existente.
No reescribas el archivo completo. No cambies nada fuera de lo indicado.

---

## Corrección 1 — Modelo de datos (sección §4)

### Problema
La tabla `students` tiene el campo `clan` como ENUM interno:
```sql
clan ENUM('Thomson','Hamilton') NOT NULL,
```
Esto está mal. Los clanes deben ser una tabla propia, y falta la tabla `lideres`.

### Qué hacer
1. En la tabla `students`, reemplazá el campo:
```sql
clan ENUM('Thomson','Hamilton') NOT NULL,
```
Por:
```sql
clan_id BIGINT UNSIGNED NOT NULL,
```

2. Agregá la FOREIGN KEY correspondiente en `students`:
```sql
CONSTRAINT fk_students_clan
  FOREIGN KEY (clan_id) REFERENCES clanes(id),
```

3. Agregá el índice actualizado en `students`:
```sql
KEY idx_students_clan_active (clan_id, is_active)
```
(reemplazando el anterior `KEY idx_students_clan_active (clan, is_active)`)

4. Agregá estas dos tablas nuevas ANTES del CREATE TABLE de `students` (deben existir primero por las foreign keys):

```sql
CREATE TABLE clanes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clanes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE lideres (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clan_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  rol ENUM('admin','lider') NOT NULL DEFAULT 'lider',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lideres_clan
    FOREIGN KEY (clan_id) REFERENCES clanes(id),
  UNIQUE KEY uq_lideres_email (email),
  KEY idx_lideres_clan_rol (clan_id, rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

5. Actualizá el diagrama Mermaid de relaciones agregando:
```
clanes ||--o{ students : agrupa
clanes ||--o{ lideres : tiene
```

---

## Corrección 2 — Título de sección §8

### Problema
El título actual dice:
```
## 8. Estrategia de tiempo real (Supabase Realtime)
```

### Qué hacer
Reemplazarlo por:
```
## 8. Estrategia de tiempo real (Socket.IO)
```
Solo el título. No toques el contenido de la sección.

---

## Corrección 3 — Agregar dos secciones nuevas al final del documento

Agregá estas dos secciones después de la sección §13, respetando la numeración:

```markdown
## 14. Convenciones de nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Carpetas | kebab-case | `services/python-worker` |
| Servicios Docker | kebab-case | `python-jobs`, `api-node` |
| Red Docker | kebab-case | `pegasus-net` |
| Variables de entorno | UPPER_SNAKE_CASE | `DATABASE_URL` |
| Tablas de base de datos | snake_case en plural | `access_records` |
| Archivos Python | snake_case | `parser.py`, `cron_jobs.py` |
| Archivos JavaScript | camelCase | `emailSender.service.js` |
| Componentes React | PascalCase | `ClanFilter.jsx` |

## 15. Control de versiones del documento

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-03-31 | Versión inicial generada por agente arquitecto |
| 1.1 | 2026-04-03 | Corrección modelo de datos: tabla clanes y lideres, fix título §8, convenciones de nomenclatura |
```

---

## Fuera de scope — no tocar

- Cualquier otra sección del ARCHITECTURE.md
- docker-compose.yml
- AGENT.md
- Cualquier archivo de código

---

## Entregables

- `ARCHITECTURE.md` con exactamente las 3 correcciones aplicadas

## Cuándo parar

Cuando las 3 correcciones estén aplicadas. Avisá qué cambios hiciste y en qué líneas, y esperá confirmación.
