# ARCHITECTURE.md — Proyecto Pegasus

## 1. Visión general del sistema
Pegasus es un sistema de control de asistencia estudiantil orientado a operacion diaria, conciliacion automatica y seguimiento en tiempo real. La fuente primaria de presencia fisica es el torniquete (CSV, JSON o API), y la fuente academica/comunicacional es Moodle. El sistema cruza ambos mundos para obtener asistencia confiable por estudiante y por dia.

La arquitectura se divide en tres planos: procesamiento (Python), exposicion (API REST en Node.js) y visualizacion (React + Tailwind CSS). Python ejecuta parser, evaluadores de negocio y cron jobs; Node.js expone endpoints REST, integra envio de correos con Nodemailer y publica eventos WebSocket; React consume datos agregados y estado operativo para dashboard administrativo.

MySQL en Railway es la unica fuente de verdad. Todas las operaciones relevantes (ingesta, evaluacion, tokens, correos, reintentos y logs) quedan persistidas en tablas normalizadas para trazabilidad completa. Cada proceso batch registra su ejecucion en `processing_logs`, permitiendo auditoria y observabilidad desde el dashboard.

Para tiempo real se adopta WebSockets desde la API Node.js (sin Supabase Realtime). Esto permite actualizar vistas de tokens, correos y estado de procesamiento sin recarga. Como fallback de resiliencia del cliente, el frontend ejecuta polling de respaldo cuando el socket no esta disponible.

La estrategia de despliegue y desarrollo local usa Docker y `docker-compose`, con todos los servicios en contenedores. La conexion a MySQL en Railway se realiza por variables de entorno y TLS, manteniendo separacion clara entre codigo, configuracion sensible y datos operativos.

```mermaid
flowchart LR
    T["Torniquete\nCSV / JSON / API"] --> P["Python Jobs\nparser.py + evaluators.py + cron.py"]
    P --> DB[("MySQL en Railway")]
    DB --> N["API Node.js\nREST + WebSocket"]
    N --> F["Dashboard React\n(Tailwind)"]
    P --> M["Moodle REST API\nnotificaciones de token"]
    N --> E["SMTP Provider\nvia Nodemailer"]
    P --> N
```

> ⚠️ PENDIENTE: confirmar formato final de exportacion del torniquete (CSV, JSON o API directa) y campos oficiales de identificacion del estudiante para cerrar mapeo definitivo del parser.

## 2. Stack tecnológico
| Capa | Tecnologia | Version sugerida | Rol en el sistema |
|---|---|---|---|
| Base de datos | MySQL (Railway) | MySQL 8.0.x | Persistencia transaccional de estudiantes, accesos, asistencias, tokens, correos y logs |
| Backend de procesamiento | Python | 3.11 | Parser de torniquete, evaluadores de asistencia, cron jobs diarios |
| API REST | Node.js + Express | Node 20 LTS, Express 4.19 | Endpoints de dashboard, operaciones manuales, envio de correos, WebSocket |
| Frontend | React + Tailwind CSS | React 18, Tailwind 3.4 | Dashboard administrativo, filtros globales, busqueda y vistas semanales |
| Tiempo real | Socket.IO (sobre Node.js) | Socket.IO 4.x | Actualizaciones en vivo de tokens, correos y procesamiento |
| ORM Node | Prisma | 7.6.x | Acceso SQL tipado, schema declarativo y migraciones |
| ORM/DB driver Python | SQLAlchemy + mysqlclient | SQLAlchemy 2.x | Lectura/escritura transaccional en jobs batch |
| Scheduler | APScheduler (Python) | 3.10+ | Ejecucion por cron configurable (seeder, ausencias, tokens, expiraciones) |
| Correos | Nodemailer | 6.x | Envio SMTP de ausencias y reenvio manual desde dashboard |
| Infraestructura | Docker | 26+ | Empaquetado de servicios |
| Orquestacion local | docker-compose | v2.27+ | Levantar frontend, API y jobs en local |
| Integracion LMS | Moodle REST API | API estable Moodle 4.x | Envio de tokens por mensajeria interna Moodle |

## 3. Servicios y contenedores Docker
| Servicio | Imagen base | Puerto host:contenedor | Volumenes | Depende de |
|---|---|---|---|---|
| `api-node` | `node:20-alpine` (build local) | `3000:3000` | `./services/api:/app`, `/app/node_modules` | MySQL Railway (externo) |
| `python-jobs` | `python:3.11-slim` (build local) | sin exposicion publica | `./services/processing:/app`, `./data/turnstile:/data/turnstile`, `./templates:/templates` | `api-node`, MySQL Railway |
| `frontend` | `node:20-alpine` (build local) | `5173:5173` | `./frontend:/app`, `/app/node_modules` | `api-node` |
| `mailhog` (solo dev) | `mailhog/mailhog:v1.0.1` | `8025:8025`, `1025:1025` | sin volumen | ninguno |

```yaml
version: "3.9"

services:
  api-node:
    build:
      context: ./services/api
      dockerfile: Dockerfile
    image: pegasus/api-node:latest
    env_file:
      - .env
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
      WS_CORS_ORIGIN: ${WS_CORS_ORIGIN:-http://localhost:5173}
    command: sh -c "npx prisma generate && npm install && npm run dev"
    ports:
      - "3000:3000"
    volumes:
      - ./services/api:/app
      - /app/node_modules
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 25s
    restart: unless-stopped

  python-jobs:
    build:
      context: ./services/processing
      dockerfile: Dockerfile
    image: pegasus/python-jobs:latest
    env_file:
      - .env
    environment:
      PYTHONUNBUFFERED: "1"
      DATABASE_URL: ${DATABASE_URL}
      API_INTERNAL_BASE_URL: http://api-node:3000
    command: sh -c "pip install -r requirements.txt && python cron.py"
    volumes:
      - ./services/processing:/app
      - ./data/turnstile:/data/turnstile
      - ./templates:/templates
    depends_on:
      api-node:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    image: pegasus/frontend:latest
    env_file:
      - .env
    environment:
      VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:3000/api/v1}
      VITE_WS_URL: ${VITE_WS_URL:-ws://localhost:3000}
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 5173"
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      api-node:
        condition: service_healthy
    restart: unless-stopped

  mailhog:
    image: mailhog/mailhog:v1.0.1
    profiles: ["dev-mail"]
    ports:
      - "8025:8025"
      - "1025:1025"
    restart: unless-stopped

networks:
  default:
    name: pegasus-net
```

## 4. Modelo de datos (MySQL / Railway)
### Tablas y relaciones
1. `students`: catalogo maestro de estudiantes, cruce por `student_code` e `moodle_user_id`.
2. `processing_logs`: bitacora de cada ejecucion batch (seeder, evaluacion, correos, tokens).
3. `access_records`: eventos validos de torniquete por estudiante.
4. `turnstile_quarantine`: eventos descartados (duplicado/corrupto/fuera de rango) sin frenar proceso.
5. `attendance_processed`: resultado diario por estudiante (presente/ausente/en edificio fuera de aula).
6. `class_sessions`: sesiones academicas por fecha para generar tokens.
7. `session_tokens`: token por sesion y estudiante con estado completo.
8. `email_logs`: trazabilidad de correos de ausencia y reintentos.

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

CREATE TABLE students (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(50) NOT NULL,
  moodle_user_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  clan_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_students_student_code (student_code),
  UNIQUE KEY uq_students_moodle_user_id (moodle_user_id),
  UNIQUE KEY uq_students_email (email),
  CONSTRAINT fk_students_clan
    FOREIGN KEY (clan_id) REFERENCES clanes(id),
  KEY idx_students_clan_active (clan_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE processing_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_name ENUM('turnstile_seeder','attendance_evaluator','absence_email_sender','token_generator','token_expirer') NOT NULL,
  scheduled_for DATETIME NOT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  status ENUM('success','partial','failed') NOT NULL,
  source_type ENUM('csv','json','api','internal') NOT NULL DEFAULT 'internal',
  records_read INT UNSIGNED NOT NULL DEFAULT 0,
  records_inserted INT UNSIGNED NOT NULL DEFAULT 0,
  records_duplicates INT UNSIGNED NOT NULL DEFAULT 0,
  records_corrupt INT UNSIGNED NOT NULL DEFAULT 0,
  records_out_of_range INT UNSIGNED NOT NULL DEFAULT 0,
  message VARCHAR(500) NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_processing_logs_job_started (job_name, started_at),
  KEY idx_processing_logs_status_started (status, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE access_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  turnstile_event_id VARCHAR(120) NULL,
  access_time DATETIME NOT NULL,
  direction ENUM('entry','exit','unknown') NOT NULL DEFAULT 'entry',
  source_file VARCHAR(255) NULL,
  raw_payload JSON NULL,
  processing_log_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_access_records_student
    FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_access_records_processing
    FOREIGN KEY (processing_log_id) REFERENCES processing_logs(id),
  UNIQUE KEY uq_access_records_event_id (turnstile_event_id),
  UNIQUE KEY uq_access_records_student_time_direction (student_id, access_time, direction),
  KEY idx_access_records_student_date (student_id, access_time),
  KEY idx_access_records_processing (processing_log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE turnstile_quarantine (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reason ENUM('duplicate','corrupt','out_of_range') NOT NULL,
  raw_payload JSON NOT NULL,
  detected_at DATETIME NOT NULL,
  processing_log_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_turnstile_quarantine_processing
    FOREIGN KEY (processing_log_id) REFERENCES processing_logs(id),
  KEY idx_turnstile_quarantine_reason_date (reason, detected_at),
  KEY idx_turnstile_quarantine_processing (processing_log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attendance_processed (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','in_building_outside_classroom') NOT NULL,
  first_access_at DATETIME NULL,
  last_access_at DATETIME NULL,
  evaluator_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  processing_log_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_processed_student
    FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_attendance_processed_processing
    FOREIGN KEY (processing_log_id) REFERENCES processing_logs(id),
  UNIQUE KEY uq_attendance_processed_student_date (student_id, attendance_date),
  KEY idx_attendance_processed_date_status (attendance_date, status),
  KEY idx_attendance_processed_student_date (student_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE class_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_date DATE NOT NULL,
  session_name VARCHAR(80) NOT NULL DEFAULT 'morning',
  opens_at DATETIME NOT NULL,
  closes_at DATETIME NOT NULL,
  token_ttl_minutes SMALLINT UNSIGNED NOT NULL,
  status ENUM('scheduled','open','closed') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_class_sessions_date_name (session_date, session_name),
  KEY idx_class_sessions_date_status (session_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE session_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  token_last4 CHAR(4) NOT NULL,
  expires_at DATETIME NOT NULL,
  claimed_at DATETIME NULL,
  status ENUM('generated','claimed','expired','rejected') NOT NULL DEFAULT 'generated',
  rejection_reason VARCHAR(255) NULL,
  moodle_message_id VARCHAR(120) NULL,
  access_record_id BIGINT UNSIGNED NULL,
  processing_log_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_tokens_session
    FOREIGN KEY (session_id) REFERENCES class_sessions(id),
  CONSTRAINT fk_session_tokens_student
    FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_session_tokens_access_record
    FOREIGN KEY (access_record_id) REFERENCES access_records(id),
  CONSTRAINT fk_session_tokens_processing
    FOREIGN KEY (processing_log_id) REFERENCES processing_logs(id),
  UNIQUE KEY uq_session_tokens_session_student (session_id, student_id),
  UNIQUE KEY uq_session_tokens_hash (token_hash),
  KEY idx_session_tokens_status_expires (status, expires_at),
  KEY idx_session_tokens_student_status (student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  template_name VARCHAR(80) NOT NULL DEFAULT 'absence_default',
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_rendered MEDIUMTEXT NOT NULL,
  status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  provider ENUM('nodemailer_smtp') NOT NULL DEFAULT 'nodemailer_smtp',
  provider_message_id VARCHAR(255) NULL,
  sent_at DATETIME NULL,
  error_message VARCHAR(500) NULL,
  retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  processing_log_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_logs_student
    FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_email_logs_processing
    FOREIGN KEY (processing_log_id) REFERENCES processing_logs(id),
  KEY idx_email_logs_attendance_status (attendance_date, status),
  KEY idx_email_logs_student_date (student_id, attendance_date),
  KEY idx_email_logs_status_retry (status, retry_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```mermaid
erDiagram
    clanes ||--o{ students : agrupa
    clanes ||--o{ lideres : tiene
    students ||--o{ access_records : tiene
    students ||--o{ attendance_processed : tiene
    students ||--o{ session_tokens : recibe
    students ||--o{ email_logs : recibe

    processing_logs ||--o{ access_records : registra
    processing_logs ||--o{ turnstile_quarantine : registra
    processing_logs ||--o{ attendance_processed : registra
    processing_logs ||--o{ session_tokens : registra
    processing_logs ||--o{ email_logs : registra

    class_sessions ||--o{ session_tokens : genera
    access_records ||--o{ session_tokens : valida
```

### Indices recomendados (enfocados en dashboard)
- `attendance_processed(attendance_date, status)` para contadores de presentes/ausentes por fecha.
- `students(clan_id, is_active)` para filtro sincronizado por clan.
- `session_tokens(status, expires_at)` para tiempo real de reclamados/expirados/rechazados.
- `email_logs(attendance_date, status)` para tablero de estado de correos.
- `processing_logs(job_name, started_at)` para mostrar ultimo procesamiento.

### Conexion Railway y acceso remoto
- Cadena principal: `DATABASE_URL=mysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?ssl=true`.
- Variables equivalentes Railway: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
- Requisito de seguridad: TLS habilitado para conexiones productivas y rotacion trimestral de credenciales.
- Politica operativa: migraciones solo desde `api-node` con `prisma migrate deploy`; `python-jobs` solo consume esquema ya migrado.

## 5. Flujos de datos por épica
### EP-01 — Conexion al Torniquete
```mermaid
flowchart TD
    A["Cron Python: seeder"] --> B["Leer fuente torniquete\nCSV/JSON/API"]
    B --> C["parser.py valida estructura"]
    C --> D{"Registro valido?"}
    D -- No --> E["Guardar en turnstile_quarantine\n(reason: corrupt/out_of_range/duplicate)"]
    D -- Si --> F["Upsert en access_records\n(idempotente)"]
    F --> G["Guardar metricas en processing_logs"]
    E --> G
    G --> H["Node API expone ultimo procesamiento"]
    H --> I["Dashboard muestra estado"]
```

### EP-02 — Correos Automaticos de Ausencia
```mermaid
flowchart TD
    A["Cron Python: cierre del dia"] --> B["evaluators.py calcula ausentes"]
    B --> C["Persistir attendance_processed"]
    C --> D["Crear email_logs en estado pending"]
    D --> E["Node sender (Nodemailer) procesa pendientes"]
    E --> F{"SMTP ok?"}
    F -- Si --> G["email_logs => sent + sent_at"]
    F -- No --> H["email_logs => failed + error_message"]
    G --> I["WebSocket evento email.status.updated"]
    H --> I
    I --> J["Dashboard estado de correos"]
    J --> K["Reenvio manual via API"]
    K --> E
```

### EP-03 — Sistema de Tokens de Asistencia (Moodle)
```mermaid
flowchart TD
    A["Cron Python: token_generator"] --> B["Crear/abrir class_sessions"]
    B --> C["Generar token unico por estudiante"]
    C --> D["Guardar hash en session_tokens"]
    D --> E["Enviar token por Moodle REST API"]
    E --> F["Actualizar moodle_message_id"]
    F --> G["Estudiante reclama token (Moodle/form)"]
    G --> H["POST /api/v1/tokens/claim"]
    H --> I{"Paso por torniquete hoy?"}
    I -- Si --> J["session_tokens => claimed"]
    I -- No --> K["session_tokens => rejected"]
    J --> L["WebSocket token.updated"]
    K --> L
    L --> M["Dashboard en tiempo real"]
```

### EP-04 — Dashboard y Frontend
```mermaid
flowchart TD
    A["React Dashboard carga inicial"] --> B["GET /dashboard/summary"]
    A --> C["GET /dashboard/morning-leak"]
    A --> D["GET /dashboard/weekly-patterns"]
    A --> E["GET /students/search"]
    A --> F["Conectar Socket.IO"]
    F --> G["Eventos: attendance.updated, token.updated, email.status.updated, processing.updated"]
    G --> H["Actualizar store global (fecha + clan)"]
    H --> I["Refrescar widgets sin recargar pagina"]
    I --> J["Cambio de fecha/filtro dispara refetch incremental"]
```

## 6. Contratos de API (endpoints principales)
Base URL: `/api/v1`

### EP-01 (torniquete y procesamiento)
`GET /processing/last`
- Descripcion: devuelve el ultimo log de procesamiento por `job_name`.
- Request JSON: `{ "jobName": "turnstile_seeder" }` (via query string).
- Response JSON:
```json
{
  "jobName": "turnstile_seeder",
  "status": "success",
  "startedAt": "2026-03-31T06:00:00Z",
  "finishedAt": "2026-03-31T06:01:12Z",
  "metrics": {
    "recordsRead": 1042,
    "recordsInserted": 1031,
    "duplicates": 7,
    "corrupt": 3,
    "outOfRange": 1
  }
}
```

`POST /processing/seeder/run`
- Descripcion: dispara seeder manual desde dashboard (admin).
- Request JSON:
```json
{
  "sourceType": "csv",
  "forceDate": "2026-03-31"
}
```
- Response JSON:
```json
{
  "accepted": true,
  "jobId": "turnstile_seeder:20260331:001",
  "message": "Seeder en ejecucion"
}
```

`GET /access-records`
- Descripcion: lista registros de acceso con filtros para auditoria.
- Request JSON: `{ "date": "2026-03-31", "clan": "Thomson", "studentCode": "STD-001" }` (query).
- Response JSON:
```json
{
  "items": [
    {
      "id": 98123,
      "studentCode": "STD-001",
      "clan": "Thomson",
      "accessTime": "2026-03-31T07:11:22Z",
      "direction": "entry"
    }
  ],
  "total": 1
}
```

### EP-02 (correos de ausencia)
`POST /emails/absence/run`
- Descripcion: ejecuta envio de ausencias para una fecha.
- Request JSON:
```json
{
  "attendanceDate": "2026-03-31",
  "dryRun": false
}
```
- Response JSON:
```json
{
  "accepted": true,
  "processingLogId": 455,
  "queued": 68
}
```

`GET /emails/logs`
- Descripcion: consulta estado de envio por fecha, clan y estado.
- Request JSON: `{ "attendanceDate": "2026-03-31", "clan": "Hamilton", "status": "failed" }` (query).
- Response JSON:
```json
{
  "items": [
    {
      "emailLogId": 7781,
      "studentCode": "STD-143",
      "recipientEmail": "estudiante143@ejemplo.edu",
      "status": "failed",
      "sentAt": null,
      "errorMessage": "SMTP timeout"
    }
  ],
  "total": 1
}
```

`POST /emails/{emailLogId}/resend`
- Descripcion: reintento manual desde dashboard.
- Request JSON:
```json
{
  "reason": "reintento_manual_dashboard"
}
```
- Response JSON:
```json
{
  "emailLogId": 7781,
  "status": "pending",
  "message": "Reenvio encolado"
}
```

### EP-03 (tokens y validacion)
`POST /tokens/sessions/generate`
- Descripcion: genera tokens para una sesion especifica.
- Request JSON:
```json
{
  "sessionDate": "2026-03-31",
  "sessionName": "morning",
  "ttlMinutes": 15
}
```
- Response JSON:
```json
{
  "sessionId": 92,
  "generated": 420,
  "notifiedInMoodle": 418,
  "failedNotifications": 2
}
```

`POST /tokens/claim`
- Descripcion: reclama token de asistencia (consumido desde flujo Moodle/formulario).
- Request JSON:
```json
{
  "studentCode": "STD-001",
  "sessionId": 92,
  "token": "A1C9K7"
}
```
- Response JSON:
```json
{
  "sessionTokenId": 12003,
  "status": "claimed",
  "claimedAt": "2026-03-31T07:20:31Z",
  "validation": {
    "hasTurnstileAccess": true,
    "attendanceDate": "2026-03-31"
  }
}
```

`GET /tokens/status`
- Descripcion: estado agregado por clan y detalle por estudiante.
- Request JSON: `{ "sessionDate": "2026-03-31", "clan": "Thomson" }` (query).
- Response JSON:
```json
{
  "summary": {
    "generated": 210,
    "claimed": 173,
    "expired": 21,
    "rejected": 16
  },
  "items": [
    {
      "studentCode": "STD-001",
      "status": "claimed",
      "claimedAt": "2026-03-31T07:20:31Z"
    }
  ]
}
```

### EP-04 (dashboard)
`GET /dashboard/summary`
- Descripcion: KPIs del dia, contador de presentes descontando ausentes.
- Request JSON: `{ "date": "2026-03-31", "clan": "Hamilton" }` (query).
- Response JSON:
```json
{
  "date": "2026-03-31",
  "clan": "Hamilton",
  "totals": {
    "students": 212,
    "present": 184,
    "absent": 20,
    "inBuildingOutsideClassroom": 8
  },
  "lastProcessing": {
    "jobName": "attendance_evaluator",
    "status": "success",
    "finishedAt": "2026-03-31T18:01:00Z"
  }
}
```

`GET /dashboard/morning-leak`
- Descripcion: seccion "fuga de mañana" por fecha/clan.
- Request JSON: `{ "date": "2026-03-31", "clan": "Thomson" }` (query).
- Response JSON:
```json
{
  "date": "2026-03-31",
  "clan": "Thomson",
  "items": [
    {
      "studentCode": "STD-009",
      "studentName": "Ana Perez",
      "firstAccessAt": "2026-03-31T07:01:02Z",
      "status": "in_building_outside_classroom"
    }
  ]
}
```

`GET /dashboard/weekly-patterns`
- Descripcion: vista semanal de 5 dias por clan.
- Request JSON: `{ "startDate": "2026-03-30", "clan": "Hamilton" }` (query).
- Response JSON:
```json
{
  "startDate": "2026-03-30",
  "days": [
    { "date": "2026-03-30", "present": 180, "absent": 22, "outsideClassroom": 10 },
    { "date": "2026-03-31", "present": 184, "absent": 20, "outsideClassroom": 8 }
  ]
}
```

`GET /students/search`
- Descripcion: busqueda de estudiante por nombre/codigo con historial expandible.
- Request JSON: `{ "q": "STD-001", "clan": "Thomson", "date": "2026-03-31" }` (query).
- Response JSON:
```json
{
  "items": [
    {
      "studentId": 1,
      "studentCode": "STD-001",
      "fullName": "Juan Gomez",
      "clan": "Thomson"
    }
  ]
}
```

`GET /students/{studentId}/weekly-history`
- Descripcion: historial semanal por dia para tarjeta expandible.
- Request JSON: `{ "startDate": "2026-03-30" }` (query).
- Response JSON:
```json
{
  "studentId": 1,
  "history": [
    {
      "date": "2026-03-30",
      "attendanceStatus": "present",
      "tokenStatus": "claimed",
      "emailStatus": null
    },
    {
      "date": "2026-03-31",
      "attendanceStatus": "absent",
      "tokenStatus": "rejected",
      "emailStatus": "sent"
    }
  ]
}
```

### Endpoint interno de sincronizacion entre servicios
`POST /internal/events/processing-complete`
- Descripcion: `python-jobs` notifica a `api-node` para emitir eventos WebSocket.
- Seguridad: header `X-Internal-Token` obligatorio.
- Request JSON:
```json
{
  "eventType": "attendance.updated",
  "date": "2026-03-31",
  "clan": "all",
  "processingLogId": 455
}
```
- Response JSON:
```json
{
  "accepted": true
}
```

## 7. Integración con Moodle
### Endpoints Moodle a usar
1. `POST {MOODLE_BASE_URL}/webservice/rest/server.php`
   - `wsfunction=core_message_send_instant_messages`
   - Uso: envio del token al inbox/notificacion del estudiante.
2. `POST {MOODLE_BASE_URL}/webservice/rest/server.php`
   - `wsfunction=core_user_get_users_by_field`
   - Uso: validacion de usuario Moodle previo al envio.

### Autenticacion
- Metodo: token de servicio Moodle (`MOODLE_WS_TOKEN`) en parametro `wstoken`.
- Formato adicional fijo: `moodlewsrestformat=json`.

### Request/response esperados
Request para envio de mensaje (form-urlencoded):
```text
wstoken=<MOODLE_WS_TOKEN>
wsfunction=core_message_send_instant_messages
moodlewsrestformat=json
messages[0][touserid]=12345
messages[0][text]=Tu token de asistencia es A1C9K7 (vence en 15 min)
messages[0][textformat]=1
```

Response esperada:
```json
[
  {
    "msgid": 987654,
    "eventtype": "instantmessage"
  }
]
```

### Manejo de errores y reintentos
- Reintentos automaticos: 3 intentos con backoff exponencial (`10s`, `30s`, `90s`).
- Errores 4xx funcionales (usuario invalido, token invalido): no reintentar; marcar `session_tokens.status = rejected` con `rejection_reason`.
- Errores 5xx/red: reintentar; si agota reintentos, marcar en `processing_logs` como `partial` y guardar detalle.
- Idempotencia: no regenerar token por reintento de envio; solo reenviar mensaje del token ya existente.

> ⚠️ PENDIENTE: validar con administracion Moodle si el flujo de reclamacion del token se hara mediante formulario externo que consuma `POST /api/v1/tokens/claim` o mediante plugin interno de Moodle.

## 8. Estrategia de tiempo real (Socket.IO)
Decision: WebSockets con Socket.IO desde `api-node` (sin Supabase Realtime).

### Mecanismo
- Frontend abre una conexion Socket.IO unica al cargar dashboard.
- Cliente se suscribe por contexto `{date, clan}` para minimizar trafico.
- `api-node` emite eventos en operaciones sincrona (reenvio correo, claim token) y tambien cuando recibe callback interno de `python-jobs`.

### Eventos en tiempo real
- `processing.updated`: nuevo estado de `processing_logs` (seeder/evaluador/tokens/correos).
- `attendance.updated`: cambios de contadores y estados diarios.
- `token.updated`: cambio de `session_tokens` (claimed/expired/rejected).
- `email.status.updated`: transicion de `email_logs` (pending/sent/failed).

### Gestion de estado en frontend
- Store global (React Context + reducer) con claves: `selectedDate`, `selectedClan`, `summary`, `morningLeak`, `weeklyPatterns`, `emailStatus`, `tokenStatus`.
- Cada evento aplica patch incremental al store; no reemplaza toda la pantalla.
- Al cambiar fecha, frontend hace refetch REST base y mantiene socket activo.
- Fallback: si socket se cae mas de 30s, activar polling cada 20s en endpoints de dashboard hasta reconexion.

## 9. Variables de entorno requeridas
### Globales compartidas (`.env`)
| Variable | Servicio | Descripcion | Ejemplo |
|---|---|---|---|
| `TZ` | todos | Zona horaria operativa | `America/Guayaquil` |
| `DATABASE_URL` | api-node, python-jobs | URI MySQL Railway con TLS | `mysql://user:pass@containers-us-west...:6543/railway?ssl=true` |
| `INTERNAL_SERVICE_TOKEN` | api-node, python-jobs | Token para endpoints internos | `pegasus_internal_2026_xxx` |

### API Node (`services/api`)
| Variable | Descripcion | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecucion | `development` |
| `PORT` | Puerto HTTP API | `3000` |
| `JWT_SECRET` | Firma de JWT para dashboard admin | `replace_with_64_char_secret` |
| `WS_CORS_ORIGIN` | Origen permitido para Socket.IO | `http://localhost:5173` |
| `EMAIL_PROVIDER` | Proveedor de correo | `nodemailer` |
| `SMTP_HOST` | Host SMTP | `smtp.sendgrid.net` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_SECURE` | TLS estricto en SMTP | `false` |
| `SMTP_USER` | Usuario SMTP | `apikey` |
| `SMTP_PASS` | Password/API key SMTP | `SG.xxxxxx` |
| `MAIL_FROM` | Remitente visible | `Asistencia Pegasus <no-reply@colegio.edu>` |
| `EMAIL_TEMPLATE_PATH` | Ruta plantilla ausencia | `/app/config/email/absence.hbs` |
| `MOODLE_BASE_URL` | URL base Moodle | `https://moodle.colegio.edu` |
| `MOODLE_WS_TOKEN` | Token servicio Moodle REST | `moodle_ws_token_example` |

### Python Jobs (`services/processing`)
| Variable | Descripcion | Ejemplo |
|---|---|---|
| `SEEDER_CRON` | Cron EP-01 | `0 6 * * 1-5` |
| `ATTENDANCE_EVAL_CRON` | Cron evaluador diario | `10 18 * * 1-5` |
| `ABSENCE_EMAIL_CRON` | Cron queue de ausencias | `15 18 * * 1-5` |
| `TOKEN_GENERATION_CRON` | Cron generacion token | `45 6 * * 1-5` |
| `TOKEN_EXPIRER_CRON` | Cron expiracion token | `*/2 * * * *` |
| `TOKEN_TTL_MINUTES` | Tiempo de vida de token | `15` |
| `TURNSTILE_SOURCE_TYPE` | Tipo de fuente torniquete | `csv` |
| `TURNSTILE_CSV_PATH` | Ruta archivo CSV | `/data/turnstile/export.csv` |
| `TURNSTILE_JSON_PATH` | Ruta archivo JSON | `/data/turnstile/export.json` |
| `TURNSTILE_API_URL` | Endpoint API torniquete | `https://turnstile.example/api/events` |
| `TURNSTILE_API_TOKEN` | Token API torniquete | `turnstile_api_token_example` |
| `TURNSTILE_ALLOWED_START` | Ventana inferior valida | `05:30` |
| `TURNSTILE_ALLOWED_END` | Ventana superior valida | `22:00` |
| `API_INTERNAL_BASE_URL` | URL interna de API Node | `http://api-node:3000` |
| `LOG_LEVEL` | Nivel de logging | `INFO` |

### Frontend (`frontend`)
| Variable | Descripcion | Ejemplo |
|---|---|---|
| `VITE_API_BASE_URL` | Base REST para React | `http://localhost:3000/api/v1` |
| `VITE_WS_URL` | URL Socket.IO | `ws://localhost:3000` |
| `VITE_POLLING_FALLBACK_SECONDS` | Polling fallback si cae socket | `20` |

## 10. Estructura de carpetas del proyecto
```text
pegasus/
├── ARCHITECTURE.md
├── docker-compose.yml
├── .env.example
├── data/
│   └── turnstile/
│       ├── export.csv
│       └── export.json
├── templates/
│   └── absence_template.md
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/client.js
│       ├── context/DashboardContext.jsx
│       ├── hooks/useDashboardSocket.js
│       ├── pages/DashboardPage.jsx
│       └── components/
│           ├── ClanFilter.jsx
│           ├── MorningLeakTable.jsx
│           ├── WeeklyPatternPanel.jsx
│           ├── StudentSearchPanel.jsx
│           ├── EmailStatusTable.jsx
│           └── TokenRealtimePanel.jsx
├── services/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── email/
│   │   │       ├── absence.hbs
│   │   │       └── template.config.json
│   │   └── src/
│   │       ├── server.js
│   │       ├── app.js
│   │       ├── db/mysql.js
│   │       ├── sockets/index.js
│   │       ├── middleware/auth.js
│   │       ├── routes/
│   │       │   ├── processing.routes.js
│   │       │   ├── access.routes.js
│   │       │   ├── emails.routes.js
│   │       │   ├── tokens.routes.js
│   │       │   ├── dashboard.routes.js
│   │       │   └── students.routes.js
│   │       └── services/
│   │           ├── emailSender.service.js
│   │           ├── dashboard.service.js
│   │           └── tokenValidation.service.js
│   └── processing/
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── parser.py
│       ├── evaluators.py
│       ├── cron.py
│       ├── moodle_client.py
│       ├── seeder.py
│       ├── token_jobs.py
│       ├── email_queue_job.py
│       ├── db.py
│       └── config.py
└── scripts/
    ├── wait-for-db.sh
    └── bootstrap-dev.sh
```

## 11. Decisiones de diseño y justificaciones
1. **Decision**: WebSockets (Socket.IO) para actualizacion en vivo del dashboard → **Alternativa descartada**: polling exclusivo cada N segundos → **Justificacion**: menor latencia para estado de tokens y correos, y menor carga constante sobre MySQL/API en horario pico.
2. **Decision**: Nodemailer integrado en `api-node` para correos de ausencia → **Alternativa descartada**: n8n → **Justificacion**: menos componentes operativos, versionado de plantilla en repositorio y trazabilidad directa con `email_logs` + endpoint de reenvio manual.
3. **Decision**: Python concentra parser, evaluadores y cron jobs con APScheduler → **Alternativa descartada**: cron del sistema operativo host → **Justificacion**: comportamiento portable en Docker, configuracion por variables de entorno y menor acoplamiento a infraestructura.
4. **Decision**: persistir registros invalidos en `turnstile_quarantine` en vez de descartarlos en memoria → **Alternativa descartada**: log solo en archivo → **Justificacion**: auditoria consultable en dashboard y analisis posterior sin perder evidencia.
5. **Decision**: almacenar `token_hash` (SHA-256) y no token plano en BD → **Alternativa descartada**: guardar token en claro → **Justificacion**: reduce impacto de exposicion de datos y mantiene validacion segura.
6. **Decision**: estado de asistencia diario en tabla materializada `attendance_processed` → **Alternativa descartada**: calcular todo on-the-fly desde `access_records` en cada request → **Justificacion**: respuestas rapidas en dashboard semanal y carga predecible en consultas.
7. **Decision**: callback interno `POST /internal/events/processing-complete` desde Python a Node → **Alternativa descartada**: polling interno de Node sobre BD cada pocos segundos → **Justificacion**: evita consultas repetitivas innecesarias y emite eventos solo cuando hay cambios reales.
8. **Decision**: MySQL remoto en Railway como fuente unica en todos los ambientes integrados → **Alternativa descartada**: bases separadas por servicio → **Justificacion**: consistencia transaccional entre epicas y menor complejidad de reconciliacion de datos.

## 12. Dependencias externas y riesgos
| Dependencia externa | Estado actual | Impacto si falla | Plan de contingencia |
|---|---|---|---|
| Torniquete (export CSV/JSON/API) | Pendiente confirmacion final de formato | No se actualiza asistencia diaria | Ejecutar seeder con ultimo archivo valido + marcar `processing_logs.status=partial` + alerta operativa |
| Moodle REST API | Requiere token y permisos de servicio | No se entregan tokens a estudiantes | Reintentos automaticos, cola de pendientes y reenvio cuando Moodle vuelva |
| Proveedor SMTP | Definido por TI institucional | Correos de ausencia no enviados | Reintentos + dashboard de fallidos + reenvio manual masivo |
| Railway MySQL | Activo en nube | API y jobs quedan sin persistencia | Backoff de reconexion, modo degradado en UI y procedimiento de failover con snapshot diario |
| DNS/Conectividad institucional | Variable segun red local | Interrupcion parcial de integraciones externas | Monitoreo de healthchecks + ejecucion diferida de jobs pendientes |

> ⚠️ PENDIENTE: confirmar SLA operativo y ventana de mantenimiento de Moodle y Railway para ajustar cron de jobs fuera de periodos de indisponibilidad programada.

## 13. Checklist pre-implementación
- [ ] Confirmar con proveedor del torniquete el formato oficial, campos obligatorios y mecanismo de entrega diaria.
- [ ] Obtener credenciales Railway (`DATABASE_URL`) para ambientes `dev`, `staging` y `prod`.
- [ ] Crear usuario de servicio Moodle con permisos de `core_message_send_instant_messages` y `core_user_get_users_by_field`.
- [ ] Validar remitente SMTP autorizado (`MAIL_FROM`) y limites de envio por hora.
- [ ] Definir zona horaria institucional unica (`TZ`) para parser, evaluadores y dashboard.
- [ ] Acordar plantilla oficial de correo de ausencia y ubicarla en archivo versionado (`templates/absence_template.md` o `services/api/config/email/absence.hbs`).
- [ ] Confirmar reglas de negocio de `in_building_outside_classroom` (ventanas horarias y criterio exacto).
- [ ] Confirmar mecanismo de reclamacion de token desde Moodle (form externo o plugin) y seguridad asociada.
- [ ] Provisionar secretos en `.env` para cada servicio y registrar owner por credencial.
- [ ] Alinear contrato final de endpoints entre Backend y Frontend antes de iniciar implementacion.
- [ ] Definir plan QA minimo: casos EP-01 a EP-04, fixtures de datos y criterios de aceptacion por epica.

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
| 1.2 | 2026-04-06 | Actualización ORM: Prisma reemplaza knex, estructura de carpetas actualizada |
