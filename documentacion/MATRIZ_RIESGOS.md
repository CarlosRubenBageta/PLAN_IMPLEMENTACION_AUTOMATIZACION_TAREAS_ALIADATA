# Matriz de riesgos — Fase 1

**Fecha de análisis:** 20/07/2026
**Analizado por:** Claude Cowork (revisión documental de `codigo/script_actual.gs`)
**Base:** matriz mínima del plan v3 (sección "Fase 1"), ampliada con causa detallada, puntos exactos de código y estado de mitigación previsto por fase.

> Ningún riesgo de esta matriz fue mitigado en la Fase 1. Esta fase solo diagnostica; el diseño de las mitigaciones corresponde a las Fases 2 a 8, según se indica en la columna "Fase de mitigación".

| ID | Riesgo | Causa (código exacto) | Probabilidad | Impacto | Mitigación prevista | Fase de mitigación |
|---|---|---|---|---|---|---|
| R-01 | Duplicación de filas | Sin idempotencia (`Math.random()` L59), sin `LockService`, sin `try/catch` entre escritura (L82) y etiquetado (L85-86). Detalle: `DIAGNOSTICO_ERRORES.md` D-04 | Alta | Alta | ID determinístico por mensaje + registro de tarea creada (Índice de Idempotencia) | Fase 5 |
| R-02 | Procesamiento de correos automáticos/publicitarios como tareas | La búsqueda `label:inbox -label:Procesado` (L19) no distingue remitente automático; filtrado delegado enteramente al prompt de IA (L97-106), sin regla determinística previa. Detalle: D-10 | Alta | Media | Filtro determinístico por remitente/patrón antes de invocar la IA | Fase 6 (reglas de elegibilidad) |
| R-03 | Caída del runtime (`runtime exited unexpectedly`) | Sin truncamiento de cuerpo (`getPlainBody()` L37 sin límite), sin aislamiento de errores por mensaje (D-01), causa exacta no confirmable sin logs de ejecución reales. Detalle: D-09 | Media | Alta | Manifiesto de ejecución persistido + recuperación por etapa; `MAX_CARACTERES_CUERPO` | Fase 5 |
| R-04 | Ejecuciones simultáneas del activador | Activador cada 10 minutos sin `LockService.getScriptLock()` en ningún punto del script. Detalle: D-03 | Media | Alta | `LockService` al inicio de `procesarCorreosDeTareas()` | Fase 3 (arquitectura propuesta) |
| R-05 | Respuesta inválida o incompleta de la IA | `response_format: json_object` (L116) reduce pero no garantiza estructura; el segundo `JSON.parse` (L135) no valida campos contra los valores permitidos del prompt (L100-105) | Media | Alta | JSON Schema + validación local de valores permitidos antes de escribir | Fase 4 (prompt operativo) |
| R-06 | Falla parcial de escritura | `appendRow()` (L82) sin `try/catch`; una interrupción a mitad de tanda deja algunas filas escritas y otras no, sin registro de cuáles. Detalle: D-01.4, D-07 | Media | Alta | Reserva de fila + estado por tarea en hoja técnica | Fase 5 / Fase 7 (mapa de escritura) |
| R-07 | Pérdida de respuestas nuevas en hilos ya procesados | Etiquetado y búsqueda a **nivel de hilo** (L19, L85-86) mientras el contenido analizado es de **un solo mensaje** (L31-32); una respuesta nueva en un hilo `Procesado` reingresa al inbox pero queda excluida de `label:inbox -label:Procesado`. Detalle: D-06 | Alta | Alta | Adopción de Gmail API para tratamiento por mensaje individual (ya decidido, DEC-001) | Fase 3 |
| R-08 | Instrucciones maliciosas incluidas en el correo (inyección de prompt) | El cuerpo completo del mensaje (L37) se envía sin sanitizar como `userContent` (L108) directamente al modelo | Media | Alta | Prompt endurecido + validación local de la salida (whitelist de valores) | Fase 4 |
| R-09 | Inyección de fórmulas en Sheets | Ningún valor de `nuevaFila` (L61-79) se sanitiza antes de `appendRow()`; un asunto o cuerpo que comience con `=`, `+`, `-` o `@` se interpretaría como fórmula en Sheets | Media | Media | Sanitización (prefijo neutralizador o `TextStyle`) previa a `setValues()`/`appendRow()` | Fase 7 |
| R-10 | Cuerpo del correo excesivamente largo | Sin límite de caracteres en `getPlainBody()` (L37); contribuye también a R-03 | Baja/Media | Media | Normalización + `MAX_CARACTERES_CUERPO` (propuesta: 8.000, registrado en `INVENTARIO_TECNICO.md`) con truncamiento registrado en el log | Fase 2 (diseño) / Fase 4 |
| R-11 | Hoja de destino inexistente | `getSheetByName(nombreTablero)` (L48) puede devolver `null` si la IA alucina un nombre de tablero; se reasigna a "Gestión General" sin dejar registro de la reasignación (L52-53) | Baja | Alta | Validación previa contra la lista cerrada de hojas + registro explícito de reasignación | Fase 2 |
| R-12 | Clave API ausente o inválida | `OPENAI_API_KEY` (L2) se lee sin validar que exista antes de construir el payload (L110-118); recién falla al hacer el `fetch` | Baja | Alta | `validarConfiguracion()` ejecutada al inicio de `procesarCorreosDeTareas()` | Fase 3 |
| R-13 | Búsqueda de Gmail no paginada | `GmailApp.search()` (L19) resuelve todos los hilos coincidentes antes de aplicar el límite de 10 (L27-29). Detalle: D-08 | Baja | Media | Paginación o `start`/`max` en la consulta; migración a Gmail API por mensaje reduce este riesgo (DEC-001) | Fase 3 |
| R-14 | Un correo con varias observaciones/tareas se colapsa en una sola fila | El esquema actual asume una clasificación por correo (prompt L97-106, una fila por iteración L82); no hay forma de expresar 1 correo → N tareas | Alta | Media | Nuevo esquema de salida de IA (observaciones → tareas) + escritura en lote por tarea | Fase 2 |

## Notas sobre la matriz

- Los riesgos R-01, R-03, R-04, R-06 y R-07 son los de mayor severidad combinada (probabilidad × impacto) y deben resolverse antes de cualquier despliegue (Fase 9).
- R-08 y R-09 son riesgos de seguridad, no solo de calidad de datos; se marcan explícitamente para que la Fase 4 (prompt) y la Fase 7 (escritura) los traten como requisito, no como mejora opcional.
- Ningún riesgo de esta tabla requirió acceso a Google Workspace para ser identificado: todos se derivan de la lectura estática de `codigo/script_actual.gs` y de la evidencia ya registrada en la Fase 0.
- Riesgos operativos no incluidos aquí por no ser de código (por ejemplo, disponibilidad de OpenAI, cambios de cuota de Google Workspace) quedan fuera del alcance de esta matriz y no bloquean la Fase 1.

## Referencias cruzadas

- Detalle línea por línea de cada hallazgo: `documentacion/DIAGNOSTICO_ERRORES.md` (códigos D-01 a D-10).
- Descripción de la arquitectura vigente: `documentacion/ARQUITECTURA_ACTUAL.md`.
- Decisión que mitiga R-07/R-13: `auditoria/DECISIONES.md`, DEC-001.
- Problemas confirmados por el responsable funcional: plan v3, sección 3.2.
