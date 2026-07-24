# Flujo transaccional — Fase 3

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 3 — Orden transaccional obligatorio por mensaje (v3)" (líneas 879-896)

> Este documento detalla el orden de 12 pasos que `procesarUnMensaje()` ejecuta para cada mensaje individual en `codigo/script_refactorizado.gs`, su correspondencia con las etapas de `Log Mensajes` (`documentacion/DISENO_HOJAS_TECNICAS.md`) y la regla de recuperación ante fallos parciales.

---

## 1. Los 12 pasos

| # | Paso (plan v3) | Etapa registrada | Función(es) responsables |
|---|---|---|---|
| 1 | Registrar mensaje `EN_PROCESO` | `INICIO` | `registrarInicioProcesamiento()` |
| 2 | Extraer y normalizar correo (solo contenido nuevo) | `CORREO_EXTRAIDO` | `extraerDatosCorreo()`, `normalizarCuerpo()`, `extraerContenidoNuevo()`, `enmascararDatosSensibles()` |
| 3 | Obtener y validar clasificación | `FILTRO_COMPLETADO` → `IA_INICIADA` → `IA_COMPLETADA` → `RESPUESTA_VALIDADA` | `evaluarFiltroDeterministico()`, `consultarIAExtractora()`, `validarRespuestaIA()` |
| 4 | Persistir manifiesto de tareas | `MANIFIESTO_PERSISTIDO` | `generarTareasNormalizadas()`, `persistirManifiestoTareas()` |
| 5 | Reservar IDs (tareas `RESERVADA`) | `TAREAS_RESERVADAS` | `generarIdDeterministico()` (dentro de `generarTareasNormalizadas()`), `reservarTareas()` |
| 6 | Escribir tareas | `ESCRITURA_INICIADA` | `agruparFilasPorHoja()`, `sanitizarValoresParaSheets()`, `escribirFilasPorLote()` |
| 7 | Marcar tareas como `ESCRITAS` | `ESCRITURA_COMPLETADA` | `marcarTareasEscritas()` |
| 8 | Registrar `ESCRITURA_COMPLETADA` | *(ver fila anterior)* | `actualizarLogMensajes()` |
| 9 | Actualizar Gmail (etiquetas y archivado por mensaje) | — | `aplicarResultadoGmail()` |
| 10 | Registrar `GMAIL_ACTUALIZADO` | `GMAIL_ACTUALIZADO` | `actualizarLogMensajes()` |
| 11 | Marcar mensaje `PROCESADO` o `REVISION_MANUAL` | — | `finalizarMensaje()` / `finalizarMensajeSinTareas()` |
| 12 | Registrar `FINALIZADO` | `FINALIZADO` | `actualizarLogMensajes()`, escritura en `Indice Idempotencia` |

Nota de implementación: en `script_refactorizado.gs` los pasos 7-8 y 11-12 están fusionados en una sola llamada (`marcarTareasEscritas()` actualiza estado y hoja en el mismo paso; `finalizarMensaje()` actualiza `Log Mensajes` y escribe `Indice Idempotencia` juntos), porque ambas escrituras deben ser consistentes entre sí y no tiene sentido registrar una sin la otra.

## 2. Por qué el orden es obligatorio y no intercambiable

- **Pasos 4-5 antes del paso 6:** las tareas deben registrarse como `RESERVADA` (con su `task_id` ya asignado de forma determinística) **antes** de escribir ninguna fila en un tablero de negocio. Si la ejecución se interrumpe entre la reserva y la escritura, el registro deja constancia exacta de qué tareas se pretendía crear, sin haber tocado aún ningún tablero.
- **Paso 6 antes del paso 9:** el mensaje **nunca** se etiqueta `Procesado` ni se archiva antes de que todas sus tareas estén escritas. Esto es lo que evita la ruta de duplicación D-04/R-01 (`DIAGNOSTICO_ERRORES.md`, `MATRIZ_RIESGOS.md`): en `script_actual.gs`, una falla entre `appendRow()` (L82) y `addLabel()` (L85) deja el hilo elegible para reprocesarse íntegro. Aquí, si la escritura (paso 6) ya se completó pero Gmail (paso 9) falla, el mensaje **no vuelve a generar tareas** en el siguiente intento (ver sección 3).
- **Paso 9 antes del paso 11:** el mensaje no se marca `PROCESADO` en `Log Mensajes`/`Indice Idempotencia` hasta que Gmail confirme la actualización, para que una falla en este paso dispare la regla de recuperación de la sección 3 y no un cierre prematuro.
- **Paso 12 al final:** `Indice Idempotencia` — la fuente de verdad contra duplicados — solo se escribe cuando **todo** lo anterior se completó (o cuando el mensaje se cierra explícitamente como `SIN_TAREAS` / `REVISION_MANUAL` / `ERROR_DEFINITIVO`, casos que también pasan por `finalizarMensaje()`).

## 3. Regla de recuperación (plan v3)

> "Si falla la actualización de Gmail después de la escritura, **no** consultar nuevamente a OpenAI ni reescribir filas; repetir únicamente la actualización de Gmail a partir de la etapa registrada."

En el borrador de esta fase, esta regla se traduce así:

- Si `procesarUnMensaje()` falla **después** de `ESCRITURA_COMPLETADA` (por ejemplo, dentro de `aplicarResultadoGmail()`), `gestionarErrorMensaje()` registra el mensaje como `ERROR_TEMPORAL` **sin** escribir `Indice Idempotencia` — el mensaje queda "abierto".
- En la siguiente ejecución, `obtenerMensajesPendientes()` **volvería a traer este mensaje** porque no tiene fila en `Indice Idempotencia`. Esto es una brecha reconocida del borrador estructural: la implementación actual de `recuperarProcesamientosAbandonados()` solo reclasifica `EN_PROCESO` vencido a `ERROR_TEMPORAL`, pero **no** implementa todavía la reanudación fina que saltea los pasos 1-8 cuando la `etapa` registrada ya es `ESCRITURA_COMPLETADA` o posterior.
- **Esta reanudación fina queda explícitamente diferida a la Fase 5** (`documentacion/RECUPERACION_INTERRUPCIONES.md`), que debe:
  1. Leer la `etapa` de `Log Mensajes` antes de decidir si un mensaje "pendiente" requiere pipeline completo o solo el paso de Gmail.
  2. Si `etapa >= ESCRITURA_COMPLETADA`, consultar `Registro Tareas` por `message_id` (ya `ESCRITA`) y ejecutar únicamente `aplicarResultadoGmail()` + cierre, sin volver a llamar a `consultarIAExtractora()` ni a `escribirFilasPorLote()`.

Esta limitación está documentada explícitamente en el código (`recuperarProcesamientosAbandonados()`, comentario `PENDIENTE (Fase 5)`) y no se considera un defecto de la Fase 3: el objetivo de esta fase es el orden transaccional y el aislamiento de errores, no la recuperación fina completa.

## 4. Aislamiento entre mensajes de la misma tanda

`procesarCorreosDeTareas()` envuelve cada llamada a `procesarUnMensaje()` en su propio `try/catch`. Una excepción en el mensaje *i* no impide que el mensaje *i+1* se procese en la misma ejecución (a diferencia de `script_actual.gs`, donde una excepción no controlada dentro del `for` interrumpe toda la tanda restante — `DIAGNOSTICO_ERRORES.md`, D-01).

## 5. Límite de tiempo interno

Antes de procesar cada mensaje, `procesarCorreosDeTareas()` verifica `Date.now() - inicioEjecucion > cfg.tiempoInternoMaxMs` y corta la tanda si se excede, dejando los mensajes restantes para la siguiente ejecución (ya elegibles, porque no se tocaron). Esto acota el riesgo de que la ejecución completa sea interrumpida por el límite duro de Apps Script (6 minutos) a mitad de un mensaje, relacionado con D-09 (`runtime exited unexpectedly`).

## Referencias cruzadas

- Descripción completa de cada función: `documentacion/ARQUITECTURA_PROPUESTA.md`.
- Estados y etapas de `Log Mensajes`: `documentacion/DISENO_HOJAS_TECNICAS.md`, secciones 4-5.
- Riesgos que este orden mitiga: `documentacion/MATRIZ_RIESGOS.md`, R-01, R-03, R-04, R-06.
- Brecha de recuperación fina diferida a Fase 5: plan v3, sección "Fase 5. Idempotencia, IDs y recuperación".
