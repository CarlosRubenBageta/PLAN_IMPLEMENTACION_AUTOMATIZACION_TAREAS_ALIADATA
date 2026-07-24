# Mapa de columnas — Fase 2

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, secciones 4.5-4.7 (líneas 193-233) y "Fase 2" (líneas 610-635)

> Este documento traduce cada campo del esquema JSON (`ESQUEMA_JSON.md`) y de los metadatos del mensaje a las 17 columnas existentes de los tableros de negocio. No se agrega ni se quita ninguna columna: se mantienen las 17 y el mismo orden (decisión ya confirmada en el plan v3, sección 4.5).

---

## 1. Mapeo columna por columna (una fila = una tarea)

| # | Columna del tablero | Origen del valor | Regla de generación |
|---|---|---|---|
| 1 | ID | `task_id` (generado por el script) | ID determinístico por tarea (diseño definitivo en Fase 5); reemplaza `Math.random()` del script actual (`DIAGNOSTICO_ERRORES.md`, D-05) |
| 2 | Fecha de entrada | `datosCorreo.fecha` (fecha del mensaje) | Formato `dd/MM/yyyy`, igual que hoy |
| 3 | Fuente | Constante | `"Gmail"`, sin cambios |
| 4 | Grupo origen | `tareas[].grupo_origen` | Uno de los 5 valores permitidos (`ESQUEMA_JSON.md`) |
| 5 | Remitente | `datosCorreo.remitente` | Del mensaje individual (Gmail API), no del último mensaje del hilo |
| 6 | Asunto original | `datosCorreo.asunto` | Del mensaje individual |
| 7 | Resumen de tarea | `tareas[].resumen` | Acción concreta y ejecutable (RF de `REGLAS_FUNCIONALES.md`); no se usa `texto_original` de la observación aquí |
| 8 | Prioridad sugerida IA | `tareas[].prioridad` | Uno de los 4 valores permitidos |
| 9 | Prioridad final | *(vacío)* | Campo de edición manual, sin cambios respecto al script actual |
| 10 | Estado | Constante inicial | `"Pendiente"` al crear la fila (estado de negocio, distinto del `estado` técnico de `Log Mensajes`) |
| 11 | Responsable | `tareas[].responsable_sugerido` | Uno de los 6 valores permitidos (rol); mapeo a persona real pendiente, ver `REGLAS_FUNCIONALES.md`, sección "Pendientes" |
| 12 | Fecha límite | `tareas[].fecha_limite` | Si no es `null`: convertir de ISO 8601 a `Date` y escribir como `dd/MM/yyyy` (RF-05); si es `null`, dejar vacío |
| 13 | Link al correo | Enlace al **mensaje** individual | En el script actual es `hilo.getPermalink()` (nivel hilo); con Gmail API debe construirse o resolverse a nivel de mensaje cuando la API lo permita, documentado como pendiente técnico de la Fase 3 |
| 14 | Link a Drive | *(vacío)* | Sin cambios; fuera de alcance de esta fase |
| 15 | Derivada a | *(vacío)* | Sin cambios; fuera de alcance de esta fase |
| 16 | Última actualización | Timestamp de escritura | `dd/MM/yyyy HH:mm`, igual que hoy (`fecha_escritura` de `Registro Tareas`) |
| 17 | Observaciones | `observaciones[].texto_original` | Texto original de la observación que originó **esta** tarea (no el asunto ni el resumen); ver regla 4.6 del plan: no se agrega una columna adicional llamada "Resumen" |

## 2. Relación 1 observación → N tareas → N filas

Cuando una observación genera varias tareas (RF-03), se escribe **una fila por tarea**, y todas esas filas comparten:

- la misma columna 17 (`Observaciones` = `texto_original` de esa observación);
- las columnas 2, 3, 5, 6 (fecha, fuente, remitente, asunto), porque provienen del mismo mensaje;
- pero difieren en columnas 1, 4, 7, 8, 10 (parcialmente), 11, 12, 13 según la clasificación independiente de cada tarea (RF-09).

Ejemplo (a partir del JSON de ejemplo de `ESQUEMA_JSON.md`, sección 4): dos observaciones, cada una con una tarea, generan **dos filas**, una en `Desarrollo IT` y otra en `Finanzas`, cada una con su propio `Observaciones` (columna 17) igual al `texto_original` de su observación de origen.

## 3. Casos que NO generan fila

Consistente con `REGLAS_FUNCIONALES.md` (RF-06, RF-07, RF-08): si un mensaje no produce ninguna tarea, no se escribe ninguna fila en los tableros de negocio. El mensaje sí se registra en `Log Mensajes` y, si corresponde, en `Indice Idempotencia`, pero los tableros permanecen sin filas nuevas para ese mensaje.

## 4. Tratamiento por resultado del mensaje (etiqueta y archivado)

Tabla del plan v3 (sección 4.7), aplicada **por mensaje individual** mediante Gmail API (no por hilo, DEC-001):

| Resultado | Crea filas | Etiqueta aplicada | Archiva |
|---|---:|---|---:|
| Tareas válidas | Sí | `Procesado` | Sí |
| Sin tareas detectadas (RF-07) | No | `Revisión manual/Sin tareas detectadas` | Sí |
| Error de procesamiento | No | `Revisión manual/Error de procesamiento` | Sí |
| Notificación de Apps Script | No | `Revisión manual/Error de automatización` | Sí |
| Correo promocional o informativo (RF-08) | No | `Revisión manual/Sin tareas detectadas` | Sí |
| Clasificación inválida / ambigua (RF-06) | No | `Revisión manual/Error de procesamiento` | Sí |

Todas las filas de esta tabla implican **archivar** el mensaje: la diferencia está únicamente en si se crean tareas y en qué etiqueta de revisión recibe, para que el responsable funcional pueda auditar por categoría desde Gmail.

## 5. Correspondencia con las hojas técnicas

| Hoja técnica | Relación con las 17 columnas |
|---|---|
| `Log Mensajes` | No escribe columnas de negocio; registra 1 fila por **mensaje**, use o no genere tareas |
| `Registro Tareas` | 1 fila por **tarea**, en paralelo a la fila del tablero de negocio; `fila_destino` apunta a la fila real escrita en el tablero |
| `Indice Idempotencia` | No tiene columnas de negocio; solo referencia `message_id`/`task_id` para impedir reprocesar |

## Referencias cruzadas

- Estructura y valores permitidos del JSON: `documentacion/ESQUEMA_JSON.md`.
- Reglas de cardinalidad, consolidación y revisión manual: `documentacion/REGLAS_FUNCIONALES.md`.
- Diseño completo de las hojas técnicas: `documentacion/DISENO_HOJAS_TECNICAS.md`.
- Estructura de 17 columnas confirmada como invariante: plan v3, sección 4.5.
