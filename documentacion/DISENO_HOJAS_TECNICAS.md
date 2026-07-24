# Diseño de hojas técnicas — Fase 2

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 2 — Hojas técnicas (v3)" (líneas 691-790)

> Las tres hojas descritas aquí se crean **dentro del mismo archivo maestro de Google Sheets**, junto a los tableros de negocio (`Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT`, `Gestión General`). Reemplazan a la hoja única `Log Procesamiento` de la versión 2 del plan. Ninguna de estas hojas se crea en Google Workspace durante la Fase 2: este documento es el diseño; la creación real ocurre en fases posteriores con aprobación explícita (el plan v3, sección 2, exige aprobación humana para "modificar hojas productivas").

---

## 1. Hoja `Log Mensajes` — una fila por mensaje individual

### Objetivo

Registrar el resultado del procesamiento de cada mensaje de Gmail, independientemente de si generó tareas, y servir de base para el diagnóstico de fallos (costos, tiempos, truncamientos).

### Columnas

| # | Columna | Tipo | Ejemplo | Notas |
|---|---|---|---|---|
| 1 | `message_id` | string | `18d4a2f...` | ID de Gmail API, clave de esta hoja |
| 2 | `thread_id` | string | `18d4a2e...` | Referencia informativa; el control de idempotencia es por `message_id`, no por hilo (RF-12) |
| 3 | `fecha_inicio` | datetime | `20/07/2026 09:14:02` | Momento en que el mensaje entra al pipeline (etapa `INICIO`) |
| 4 | `fecha_fin` | datetime | `20/07/2026 09:14:05` | Momento de la etapa `FINALIZADO`; vacío si la ejecución se interrumpió antes |
| 5 | `remitente` | string | `cliente@dominio.com` | — |
| 6 | `asunto` | string | `Consulta factura #123` | — |
| 7 | `estado` | string | `PROCESADO` | Uno de los seis valores de la sección "Estados permitidos" |
| 8 | `etapa` | string | `FINALIZADO` | Última etapa alcanzada (sección "Etapas permitidas"); permite saber dónde se interrumpió una ejecución fallida |
| 9 | `cantidad_observaciones` | integer | `2` | Tamaño de `observaciones[]` en la respuesta de la IA |
| 10 | `cantidad_tareas` | integer | `3` | Suma de tareas de todas las observaciones |
| 11 | `resultado_gmail` | string | `ETIQUETADO_Y_ARCHIVADO` | Resultado de la operación de etiquetado/archivado por mensaje (Gmail API). Valores posibles (definidos en la corrección INC-FASE8-004, `pruebas/resultados/INCIDENCIAS_FASE_8.md`): `OMITIDO_POR_CONFIGURACION` (ambos permisos deshabilitados, no se llamó a Gmail), `SOLO_ETIQUETADO`, `SOLO_ARCHIVADO`, `ETIQUETADO_Y_ARCHIVADO`, `ERROR_GMAIL` (la llamada se intentó y falló; el detalle va en la columna `error`, no acá). Vacío (`''`) solo antes de alcanzar la etapa `GMAIL_ACTUALIZADO`. |
| 12 | `intentos` | integer | `1` | Cantidad de intentos de llamada a la IA para este mensaje |
| 13 | `codigo_http` | integer | `200` | Código de respuesta de la última llamada a OpenAI |
| 14 | `error` | string | *(vacío)* | Mensaje de error si `estado` es `ERROR_TEMPORAL` o `ERROR_DEFINITIVO` |
| 15 | `modelo` | string | `gpt-4o-mini` | Modelo usado (definido en Fase 4) |
| 16 | `tokens_entrada` | integer | `540` | De la respuesta de OpenAI |
| 17 | `tokens_salida` | integer | `180` | De la respuesta de OpenAI |
| 18 | `tokens_totales` | integer | `720` | Suma de las dos anteriores |
| 19 | `costo_estimado` | decimal | `0.0009` | Calculado con la tarifa del modelo vigente |
| 20 | `request_id` | string | `req_abc123` | ID de request de OpenAI, para soporte/depuración |
| 21 | `cuerpo_truncado` | boolean | `false` | `true` si se aplicó `MAX_CARACTERES_CUERPO` |
| 22 | `longitud_original` | integer | `9200` | Caracteres del cuerpo antes de truncar |
| 23 | `longitud_normalizada` | integer | `8000` | Caracteres efectivamente enviados a la IA |
| 24 | `duracion_llamada_ia` | decimal (s) | `1.8` | Tiempo de la llamada a OpenAI |
| 25 | `unidades_gmail_api` | integer | `2` | Consumo de cuota de Gmail API para este mensaje (obligatorio registrar, sección 7.3.6 del plan) |
| 26 | `version_script` | string | `v3.0.0` | Versión del script que procesó el mensaje, para correlacionar incidencias con despliegues |

### Regla de escritura

Una fila se crea en la etapa `INICIO` (con los campos disponibles en ese momento) y se **actualiza** — no se duplica — a medida que el mensaje avanza de etapa, hasta `FINALIZADO` o un estado de error. `message_id` es la clave de búsqueda para esa actualización.

---

## 2. Hoja `Registro Tareas` — una fila por tarea

### Objetivo

Permitir identificar exactamente qué tareas de un mensaje llegaron a escribirse en los tableros y cuáles no, en caso de una interrupción a mitad de la escritura (mitigación directa de R-01 y R-06 en `MATRIZ_RIESGOS.md`). **Actualizado en Fase 5:** esta hoja es también el **manifiesto persistido** que permite recuperar un mensaje interrumpido **sin volver a consultar la IA** (`documentacion/RECUPERACION_INTERRUPCIONES.md`); por eso incorpora, desde esta fase, el contenido completo de cada tarea (no solo su estado de escritura).

### Columnas

| # | Columna | Tipo | Ejemplo | Notas |
|---|---|---|---|---|
| 1 | `task_id` | string | `ALI-A8F23C91D04B7E12-003` | ID determinístico (formato definido en Fase 5, `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`); clave de esta hoja |
| 2 | `message_id` | string | `18d4a2f...` | Referencia a `Log Mensajes` |
| 3 | `thread_id` | string | `18d4a2e...` | Informativo |
| 4 | `tablero` | string | `Desarrollo IT` | Hoja de destino de negocio |
| 5 | `estado_escritura` | string | `ESCRITA` | Uno de `RESERVADA`, `ESCRITA`, `ERROR_ESCRITURA`, `ANULADA` |
| 6 | `fila_destino` | integer | `184` | Número de fila en la hoja de negocio, una vez escrita |
| 7 | `fecha_reserva` | datetime | `20/07/2026 09:14:04` | Momento en que se registra como `RESERVADA`, antes de escribir |
| 8 | `fecha_escritura` | datetime | `20/07/2026 09:14:05` | Momento en que se confirma `ESCRITA` |
| 9 | `hash_contenido` | string | `a1b2c3...` | Hash MD5 del contenido de la tarea, para detección rápida de reprocesos idénticos sin comparar texto completo |
| 10 | `resumen` | string | `Revisar caída del sistema de facturación.` | **(Fase 5)** Contenido de la tarea, necesario para reconstruir la fila del tablero sin la IA |
| 11 | `prioridad` | string | `Crítico` | **(Fase 5)** |
| 12 | `grupo_origen` | string | `Soporte` | **(Fase 5)** |
| 13 | `responsable_sugerido` | string | `Responsable Técnico` | **(Fase 5)** |
| 14 | `fecha_limite` | string (ISO 8601 o vacío) | `2026-07-24` | **(Fase 5)** |
| 15 | `observacion_numero` | integer | `1` | **(Fase 5)** `numero` de la observación de origen dentro del correo |
| 16 | `observacion_texto_original` | string | `El cliente reporta que...` | **(Fase 5)** Texto original de la observación de origen |

**Nota de diseño (Fase 5):** las columnas 10-16 no estaban en el diseño original de la Fase 2. Se agregaron porque el plan v3 exige que una recuperación "retome desde el manifiesto persistido" y "no vuelva a consultar la IA" (sección "Fase 5"); sin el contenido completo de la tarea en esta hoja, una recuperación no tendría forma de reconstruir la fila de negocio sin repetir la llamada a OpenAI. Ver `entregables/FASE_5/ACTA_APROBACION_FASE_5.md`, observación 1.

### Regla transaccional (obligatoria)

```text
1. Antes de escribir en cualquier tablero de negocio: registrar TODAS las tareas
   del mensaje como RESERVADA en Registro Tareas.
2. Ejecutar la escritura por lotes en los tableros correspondientes.
3. Por cada escritura confirmada: actualizar esa fila a ESCRITA, con fila_destino
   y fecha_escritura.
4. Si una escritura falla: la fila permanece RESERVADA o pasa a ERROR_ESCRITURA,
   nunca se reintenta como una tarea nueva con otro task_id.
```

Esta secuencia es la que permite, ante una interrupción (por ejemplo, el error `runtime exited unexpectedly` documentado en `DIAGNOSTICO_ERRORES.md` D-09), saber con precisión cuáles de las N tareas generadas para un mensaje ya llegaron al tablero y cuáles deben reintentarse — sin duplicar las que sí se escribieron.

### `ANULADA`

Se usa cuando una tarea fue reservada pero, por una regla de validación posterior (por ejemplo, se detecta que duplica una tarea ya existente vía `hash_contenido` o `Indice Idempotencia`), se decide no escribirla. Queda como registro auditable, no se borra la fila.

---

## 3. Hoja `Indice Idempotencia` — permanente, protegida

### Objetivo

Ser la **fuente de verdad contra duplicados**: antes de procesar un mensaje, se consulta esta hoja para saber si ya fue tratado.

### Columnas

| # | Columna | Tipo | Ejemplo | Notas |
|---|---|---|---|---|
| 1 | `message_id` | string | `18d4a2f...` | Clave de búsqueda principal |
| 2 | `task_id` | string | `ALI-2026-000482` | Una fila por cada tarea generada por ese mensaje; si el mensaje no generó tareas, una fila con `task_id` vacío y `estado_final` explicando por qué |
| 3 | `estado_final` | string | `PROCESADO` | Estado terminal del mensaje (`PROCESADO`, `SIN_TAREAS`, `REVISION_MANUAL`, `ERROR_DEFINITIVO`) |
| 4 | `fecha` | datetime | `20/07/2026 09:14:05` | Momento del cierre |

### Política de retención (v3)

- **Esta hoja se conserva indefinidamente.** Es la única barrera contra reprocesar un mensaje ya tratado; purgarla reabriría el riesgo de duplicación (R-01).
- La purga a 6 meses aplica **únicamente** a la información ampliada de `Log Mensajes` y `Registro Tareas` (asuntos, errores, métricas de costos y tiempos), mediante un procedimiento manual documentado en `MANUAL_OPERATIVO.md` (Fase 10), conservando siempre un respaldo previo.
- `Indice Idempotencia` debe protegerse contra edición manual accidental (protección de hoja/rango a nivel de Google Sheets), dado su rol crítico.

---

## 4. Estados permitidos (mensaje)

Solo caracteres ASCII, para evitar errores de comparación y codificación:

```text
EN_PROCESO
PROCESADO
SIN_TAREAS
REVISION_MANUAL
ERROR_TEMPORAL
ERROR_DEFINITIVO
```

| Estado | Significado | Se refleja en |
|---|---|---|
| `EN_PROCESO` | El mensaje está siendo procesado en esta misma ejecución | `Log Mensajes.estado` mientras dura la ejecución |
| `PROCESADO` | Se generaron y escribieron una o más tareas | `Log Mensajes` + `Indice Idempotencia` |
| `SIN_TAREAS` | Correo relevante pero sin acción pendiente, o no relevante (RF-07/RF-08) | ídem |
| `REVISION_MANUAL` | `requiere_revision: true` o clasificación inválida no corregible | ídem |
| `ERROR_TEMPORAL` | Falla recuperable (timeout, error HTTP 5xx de OpenAI); candidato a reintento en la próxima ejecución | `Log Mensajes`; no se escribe aún en `Indice Idempotencia` (el mensaje sigue "abierto") |
| `ERROR_DEFINITIVO` | Falla no recuperable tras agotar reintentos (política de Fase 4) | Ambas hojas; el mensaje se cierra igual que `PROCESADO`, para no reintentarlo indefinidamente |

## 5. Etapas permitidas (pipeline por mensaje)

```text
INICIO
CORREO_EXTRAIDO
FILTRO_COMPLETADO
IA_INICIADA
IA_COMPLETADA
RESPUESTA_VALIDADA
MANIFIESTO_PERSISTIDO
TAREAS_RESERVADAS
ESCRITURA_INICIADA
ESCRITURA_COMPLETADA
GMAIL_ACTUALIZADO
FINALIZADO
```

La etapa registrada en `Log Mensajes.etapa` es la **última alcanzada con éxito**. Si una ejecución se interrumpe (por ejemplo, D-09), la próxima ejecución puede leer esta columna para decidir desde dónde reanudar el mensaje en lugar de reiniciar todo el pipeline (diseño detallado de recuperación: Fase 5).

## Referencias cruzadas

- Estructura del JSON que alimenta estas hojas: `documentacion/ESQUEMA_JSON.md`.
- Reglas funcionales que determinan qué estado/etapa corresponde a cada caso: `documentacion/REGLAS_FUNCIONALES.md`.
- Mapeo de estos datos a las columnas visibles de los tableros de negocio: `documentacion/MAPA_COLUMNAS.md`.
- Riesgos que estas hojas mitigan directamente: `documentacion/MATRIZ_RIESGOS.md`, R-01, R-03, R-04, R-06.
