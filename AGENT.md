# AGENT.md — Proyecto Pegasus
> Este archivo define las reglas globales que el agente debe respetar en TODA tarea, sin excepción.

---

## Regla fundamental

Antes de escribir cualquier línea de código, leé `ARCHITECTURE.md` completo.
Si algo en tu tarea contradice lo que dice `ARCHITECTURE.md`, **no escribas código — avisá el conflicto y esperá instrucciones.**

---

## Cómo trabajás en este proyecto

1. **Leés** `ARCHITECTURE.md` completo.
2. **Leés** el archivo de tarea que te indiquen (ej: `.agents/01-docker.md`).
3. **Confirmás** en un mensaje corto qué vas a hacer y qué archivos vas a tocar, antes de empezar.
4. **Ejecutás** solo lo que dice el scope de esa tarea.
5. **Parás** cuando los entregables de la tarea estén listos. No continuás al siguiente paso solo.

---

## Reglas que nunca podés romper

- **No toques** archivos fuera del scope definido en la tarea.
- **No instales** dependencias nuevas sin que te lo pidan explícitamente.
- **No tomes decisiones de arquitectura** por tu cuenta. Si algo no está claro en `ARCHITECTURE.md`, preguntá antes de asumir.
- **No borres** código existente salvo que la tarea lo indique explícitamente.
- **No creés** archivos nuevos que no estén listados en los entregables de la tarea.
- **No commitees** nada. El desarrollador decide cuándo y qué commitear.

---

## Stack del proyecto (referencia rápida)

| Servicio | Tecnología |
|----------|-----------|
| Base de datos | MySQL en Railway |
| Worker | Python 3.11 |
| API | Node.js 20 |
| Frontend | React + Tailwind CSS |
| Infraestructura | Docker + docker-compose |
| LMS | Moodle REST API |

> Para detalles completos, siempre referite a `ARCHITECTURE.md`.

---

## Si encontrás un problema

No intentes resolverlo por tu cuenta si implica cambiar la arquitectura.
Respondé con este formato:

```
⚠️ CONFLICTO DETECTADO
Tarea: [nombre de la tarea]
Problema: [qué encontraste]
Opciones posibles: [qué se podría hacer]
Esperando instrucciones.
```
