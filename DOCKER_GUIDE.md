# Guía de Docker para Contribuidores - Proyecto Pegasus

¡Bienvenido al proyecto Pegasus! Esta guía te explicará a detalle cómo funciona nuestro entorno de Docker, cómo levantar los servicios y cómo está estructurada la arquitectura local para el desarrollo.

## Resumen de la Arquitectura con Docker

Utilizamos **Docker y Docker Compose** para orquestar los diferentes servicios que componen esta aplicación. El objetivo principal es mantener un entorno de desarrollo estandarizado donde no necesites instalar múltiples lenguajes o bases de datos directamente en tu máquina. 

Todos nuestros contenedores en modo desarrollo montan el código de tu entorno local (a través de *Volumes*), lo que significa que **cualquier cambio que guardes en tu editor se reflejará inmediatamente dentro del contenedor**.

> [!TIP]
> Dado que la instalación de dependencias (`npm install` o `pip install`) ocurre en el momento de arranque del contenedor, es normal que la primera vez que levantes los servicios tarde un poco más en iniciar.

### Archivo de Configuración
La configuración de los servicios se encuentra definida en el archivo raíz: `docker-compose.yml`

---

## 🛠️ Servicios Principales

El proyecto se divide principalmente en los siguientes servicios clave:

### 1. `api-node` (Backend)
- **Directorio Local:** `./services/api`
- **Puerto:** `3000`
- **Funcionalidad:** Es el servidor principal expuesto (API REST y WebSockets) desarrollado con Node.js.
- **Detalles técnicos:** 
  - Ejecuta internamente `npm install && npm run dev`.
  - Contiene un *healthcheck* configurado apuntando a la ruta `/health` para avisar al resto de los servicios cuándo está listo para recibir tráfico.
  - Se conecta a la base de datos a través de la variable `DATABASE_URL` del `.env`.

### 2. `python-jobs` (Procesos Asíncronos)
- **Directorio Local:** `./services/processing`
- **Funcionalidad:** Procesa tareas en segundo plano usando un script cron en Python y guarda archivos en las carpetas `data` y `templates`.
- **Detalles técnicos:**
  - Ejecuta internamente `pip install -r requirements.txt && python cron.py`.
  - Depende de que el servicio `api-node` esté en estado "saludable" (healthy) para poder inicializarse.

### 3. `frontend` (Agente / Vista de Usuario)
- **Directorio Local:** `./frontend`
- **Puerto:** `5173`
- **Funcionalidad:** La aplicación web frontal construida con Vite. 
- **Detalles técnicos:**
  - Ejecuta internamente `npm install && npm run dev -- --host 0.0.0.0 --port 5173`.
  - Consume a `api-node` de forma predeterminada, comunicándose por el puerto 3000 o según lo configurado en las variables de entorno (`VITE_API_BASE_URL`).

### 4. `mailhog` (Herramienta de Pruebas - Opcional)
- **Puertos:** `8025` (Interfaz Web) y `1025` (Servidor SMTP)
- **Funcionalidad:** Intercepta los emails locales para que no se envíen correos reales mientras desarrollas. Puedes ver cómo se ve el correo en la interfaz web de MailHog.
- **Nota Importante:** Este servicio usa perfiles de docker (`profiles: ["dev-mail"]`), por lo que no iniciará automáticamente si solo corres el comando general.

---

## 🚀 Cómo Empezar y Comandos Comunes

Para comenzar, asegúrate de tener el motor de Docker encendido (Docker Desktop) y de haber creado un archivo `.env` basado en el `.env.example`.

### Levantar Todo el Ambiente Principal
Desde la raíz de `pegasus` (donde está el `docker-compose.yml`):
```bash
docker-compose up -d
```
> [!NOTE]
> El flag `-d` o `--detach` corre los contenedores en segundo plano dejándote usar la terminal de nuevo.

### Levantar los Servicios + MailHog (Correos Locales)
```bash
docker-compose --profile dev-mail up -d
```

### Ver los Logs (Registros) de la Aplicación
Para ver qué está pasando y examinar errores de la terminal:
```bash
# Ver los logs de todos los servicios simultáneamente:
docker-compose logs -f

# Ver el log de un servicio específico (ej: del backend api-node):
docker-compose logs -f api-node
```

### Detener los Servicios
```bash
docker-compose down
```

### Reconstruir Contenedores (Si agregas nuevas librerías)
En ocasiones, si agregaste una nueva librería en algún `.json` o se rompieron los modulos, es sugerible forzar un re-build:
```bash
docker-compose up --build -d
```

---

## 🌉 ¿Cómo se comunican los contenedores? (Redes y Volúmenes)

Si nunca has usado Docker, imagina que cada contenedor es una mini-computadora completamente aislada flotando en la nada. Por defecto, no saben que los otros existen y no tienen acceso a los archivos de tu computadora. Para solucionar esto, usamos dos "puentes": **Las Redes (Networks)** para que hablen entre ellos, y **Los Volúmenes (Volumes)** para que hablen con tu computadora.

### 1. El Puente entre Contenedores: Docker Networks (Redes)
Como estas mini-computadoras están aisladas, no pueden hablarse entre sí usando `localhost`. Para Docker, `localhost` significa "dentro de mí mismo".
- **La solución:** Docker Compose crea una **red virtual privada** llamada `pegasus-net`.
- **¿Cómo funciona?** Todos los servicios se conectan a esta misma red. El motor de Docker hace magia por detrás y convierte los nombres de los servicios en direcciones IP reales. 
- **Ejemplo práctico:** Si el contenedor de procesos (`python-jobs`) necesita hacerle una petición al servidor backend (`api-node`), **¡no le consulta a localhost!** En su lugar, hace la petición directamente a `http://api-node:3000`. ¡El nombre del servicio de Docker funciona como si fuera una URL de internet!

### 2. El Puente hacia tu Computadora: Docker Volumes (Volúmenes)
Si el contenedor está aislado en su propio mundo, ¿cómo ejecuta tu código? Podríamos simular un "copiar y pegar" del código hacia adentro de la mini-computadora, pero tendrías que repetir ese tedioso proceso cada vez que guardes el archivo.
- **La solución:** Usar *Volúmenes*.
- **¿Cómo funciona?** Un volumen es como un "portal espacio-tiempo" o un **espejo** entre una carpeta física de tu computadora y una carpeta virtual dentro del contenedor.
- **Ejemplo práctico:** En el archivo de configuración le decimos a Docker: *"Todo lo que esté en mi carpeta local `./services/api` de Windows, espéjalo dentro del contenedor en la ruta `/app`"*.
  
> [!IMPORTANT]
> Gracias a los volúmenes, **nunca debes modificar archivos entrando al contenedor o a su terminal**. Cualquier cambio que hagas en VS Code (en tu computadora física) cruzará el volumen al instante. Herramientas de desarrollo como Vite (frontend) o Nodemon (backend) detectarán este cambio a través del espejo y actualizarán la aplicación en vivo (hot-reload) sin que tengas que reiniciar Docker.

### 3. Configuraciones Compartidas (.env)
De manera similar, para que todos los contenedores puedan conectarse a bases de datos o servicios externos, pueden compartir el mismo archivo `.env` ubicado en la raíz del proyecto. No necesitas estar copiando tus credenciales a cada contenedor individualmente.
