# Contexto de Base de Datos — Proyecto Pegasus

---

## ¿Qué es este documento?

Este documento fue preparado para darle contexto completo al encargado de base de datos antes de empezar a trabajar. Acá vas a encontrar: de qué trata el sistema, cuáles son las tablas que podemos definir ahora mismo y por qué, cuáles están bloqueadas esperando información externa, y dos preguntas que necesitamos que respondas antes de definir los parámetros de cada tabla.

La idea es que no llegues en frío a tomar decisiones — que entiendas el por qué de cada cosa antes de escribir una sola línea de SQL.

---

## ¿Qué es el sistema?

El Sistema de Control de Asistencia Estudiantil (Proyecto Pegasus) automatiza el registro y análisis de asistencia de coder a través de torniquetes de acceso con lector de huella dactilar.

El flujo básico es este: el coder pasa su huella por el torniquete → el sistema registra la entrada o salida con fecha y hora → con esos datos se generan métricas por coder (llegadas tarde, salidas tempranas, exceso de breaks, ausencias) → esa información alimenta un dashboard web para líderes y administradores → si un coder falta, el sistema manda un correo automático notificando la ausencia → adicionalmente, el sistema va a integrarse con Moodle para enviar un token de asistencia al aula (esto está en investigación, los detalles de esa integración pueden cambiar).

Los coder están divididos en grupos llamados **clanes**. Cada clan tiene un **líder** asignado. Los líderes tienen acceso al dashboard y pueden ver todos los coder, no solo los de su clan. Los administradores también tienen acceso total.

---

## Stack tecnológico relevante para vos

| Capa | Tecnología |
|------|-----------|
| Base de datos | MySQL en Railway |
| API que consulta la BD | Node.js |
| Worker que escribe en la BD | Python |
| Dashboard que lee la BD (vía API) | React |

La base de datos vive en Railway. Ya existe una conexión funcionando desde el código. Tu trabajo es definir el esquema — las tablas, sus columnas, tipos, relaciones e índices.

---

## Estado actual del proyecto

El proyecto está en sus primeras etapas. Tenemos:
- Arquitectura definida (`ARCHITECTURE.md`)
- Conexión a MySQL en Railway funcionando
- Docker configurado para los servicios

---

## Tablas que podemos crear ahora

Las siguientes 4 tablas no dependen de ninguna información externa. Las podemos definir con confianza ahora mismo.

---

### `clanes`

**¿Por qué existe?** Los coder están divididos en grupos llamados clanes. Antes de crear un coder, el clan tiene que existir porque el coder pertenece a uno.

**¿Para qué sirve?** Para filtrar toda la información del dashboard por clan — asistencia, ausencias, breaks — y para que los líderes vean a sus coder agrupados.

**¿Qué sabemos ya?** Que existen al menos Thompson, Hamilton, McCarty y Nakamoto, tambien que cada clan tiene un horario asignado para entrada, salida y tiempos de alimentación.

**¿Qué más sabemos?** Se pueden agregar clanes nuevos en el futuro y no siempre van a ser los mismos. Pueden crecer necesitan tabla propia.

**¿Cómo se integra después?** Cada coder va a tener un `clan_id`. Cada registro de asistencia va a poder filtrarse por clan a través del coder. El dashboard va a usar esta tabla para el filtro global.

---

### `lideres`

**¿Por qué existe?** Los líderes son usuarios del sistema con acceso al dashboard. Son diferentes a un administrador genérico porque tienen identidad propia — nombre, correo, clan al que pertenecen.

**¿Para qué sirve?** Para autenticar quién entra al dashboard y para saber qué líder está viendo qué información.

**¿Qué sabemos ya?** Que cada líder tiene su propio clan asignado pero puede ver todos los coder de otros clanes. Tambien habrán roles donde un admin puede configurar horarios, un líder que solo ve datos y coders.

**Recomendación:** agregar un campo `rol` con valores `admin` , `lider` y `coder`.

**¿Cómo se integra después?** Cuando se implemente autenticación, esta tabla es la que valida el login. El `clan_id` del líder sirve para mostrar primero su clan en el dashboard aunque pueda ver todos.

---

### `coder`

**¿Por qué existe?** Es la entidad central del sistema. Todo — asistencia, tokens, correos — gira alrededor del coder.

**¿Para qué sirve?** Para identificar a cada persona que pasa por el torniquete y cruzar esa información con Moodle.

**¿Qué sabemos ya?** Que el torniquete va a entregar `usuario_id` (cédula), nombre, y que cada coder pertenece a un clan. También que Moodle tiene su propio ID de usuario que hay que cruzar con el nuestro. El `usuario_id` del torniquete es exactamente la cédula.

**Recomendación:** tener un `id` propio del sistema (autoincremental), guardar la cédula como campo separado (`cedula`), y tener un campo `moodle_id` para el cruce con Moodle. Así si el torniquete cambia su formato de ID, no afecta nada más del sistema.

**¿Cómo se integra después?** La tabla `registros` va a referenciar `coder_id`. La tabla `tokens` también. La tabla `correos_enviados` también. Es el centro de todo.

---

### `correos_enviados`

**¿Por qué existe?** Porque el sistema tiene que saber qué correos mandó, a quién, cuándo, y si llegaron — para no mandar duplicados y para que el dashboard muestre el estado.

**¿Para qué sirve?** Para el dashboard de correos. El líder o admin entra y ve: "a Juan se le mandó correo hoy a las 6pm, estado: enviado". También para el reenvío manual — el sistema verifica acá si ya se mandó antes de volver a enviar.

**¿Qué sabemos ya?** Que los estados posibles son enviado, fallido y pendiente. Que se manda uno por coder ausente por día.

**¿Qué no sabemos?** Si en el futuro van a haber otros tipos de correo además del de ausencia — por ejemplo notificaciones de llegadas tarde reiteradas. Si eso puede pasar, conviene un campo `tipo_correo` desde ya.

**Recomendación:** agregar `tipo_correo` con valor por defecto `ausencia`. Costo cero ahora, evita una migración después.

**¿Cómo se integra después?** Va a referenciar `coder_id`. El dashboard la consulta para mostrar el estado. El worker Python la escribe cada vez que intenta mandar un correo.

---

## Tablas que esperan información externa

Estas **no las definimos todavía**. Están bloqueadas hasta tener más información.

| Tabla | Espera | Por qué |
|-------|--------|---------|
| `registros` | Formato exacto del torniquete | Necesitamos saber exactamente qué campos llegan para no crear columnas de más ni de menos |
| `tokens` | Definición de la integración con Moodle | El flujo del token puede cambiar dependiendo de cómo funcione el webservice de Moodle |

---

## Preguntas para el encargado de base de datos

Antes de definir los parámetros (columnas, tipos, restricciones) de las 4 tablas anteriores, necesitamos que respondas esto:

1. **¿Los líderes van a poder iniciar sesión en el sistema**, o por ahora el dashboard es abierto sin autenticación? Esto define si la tabla `lideres` necesita campos de contraseña/hash desde el principio o no.

Respuesta del encargado: Sí, los líderes deben iniciar sesion en el sistema.

2. **¿El correo electrónico del coder lo tiene el sistema**, o solo tenemos la cédula y el nombre que llega del torniquete? Esto define si `correos_enviados` puede referenciar directamente el correo del coder o necesitamos otra fuente.

Respuesta del encargado: Sí, el correo electronico se encuentra alojado en el sistema de moddle, pero no en el torniquete.

Con esas dos respuestas definimos los parámetros completos de las 4 tablas y las creamos en Railway.
