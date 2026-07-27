# Recuperación de interrupciones — Fase 5

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 5 — Reglas" (líneas 1058-1068); brecha diferida desde `documentacion/FLUJO_TRANSACCIONAL.md`, sección 3 (Fase 3)
**Código asociado:** `codigo/recuperacion.gs`

---

## 1. Objetivo

Permitir que un mensaje cuya ejecución se interrumpió a mitad de camino (por ejemplo, por el error `The JavaScript runtime exited unexpectedly`, documentado en `documentacion/DIAGNOSTICO_ERRORES.md`, D-09) se recupere correctamente en la siguiente ejecución del activador, **sin duplicar** tareas ya escritas y **sin volver a consultar la IA** cuando ya existe un manifiesto persistido.

## 2. Detección de abandono

`recuperarProcesamientosAbandonados(cfg)` se ejecuta al inicio de `procesarCorreosDeTareas()`, antes de buscar mensajes nuevos. Recorre `Log Mensajes` y considera "abandonado" todo registro con:

```text
estado == EN_PROCESO
Y (ahora - fecha_inicio) > UMBRAL_ABANDONO_MIN (20 minutos, confirmado en Fase 3)
```

Un registro `EN_PROCESO` **dentro** del umbral no se toca: podría ser una ejecución legítima en curso (recordar que `LockService` impide dos ejecuciones simultáneas del activador, pero no impide que una ejecución lenta esté genuinamente procesando ese mensaje en este momento).

## 3. Bifurcación según la etapa alcanzada

Esta es la decisión central de la fase, y resuelve explícitamente la brecha que `documentacion/FLUJO_TRANSACCIONAL.md` (sección 3) dejó diferida desde la Fase 3:

| Etapa registrada | ¿Existe manifiesto persistido? | Acción de recuperación |
|---|---|---|
| `INICIO`, `CORREO_EXTRAIDO`, `FILTRO_COMPLETADO`, `IA_INICIADA`, `IA_COMPLETADA`, `RESPUESTA_VALIDADA` | No | Se marca `ERROR_TEMPORAL`. Como el mensaje nunca llegó a `Indice Idempotencia`, la siguiente `obtenerMensajesPendientes()` lo vuelve a traer y lo reprocesa **desde cero** (incluida una nueva consulta a la IA) — es seguro porque no hay nada persistido con qué entrar en conflicto (ver `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`, sección 3). |
| `MANIFIESTO_PERSISTIDO`, `TAREAS_RESERVADAS`, `ESCRITURA_INICIADA`, `ESCRITURA_COMPLETADA`, `GMAIL_ACTUALIZADO` | Sí | Se llama a `reanudarDesdeManifiesto()`: **no** se vuelve a llamar a `consultarIAExtractora()`; se retoma exactamente desde donde quedó. |

## 4. `reanudarDesdeManifiesto()`: qué hace exactamente

1. Lee el manifiesto completo desde `Registro Tareas` (`obtenerManifiestoPersistido()`) — incluye `resumen`, `prioridad`, `grupo_origen`, `responsable_sugerido`, `fecha_limite` y el texto de la observación de origen para cada tarea (columnas agregadas en esta fase, ver `ESTRATEGIA_IDEMPOTENCIA.md`, sección 5).
2. Relee el mensaje de Gmail **solo para metadatos livianos** (`obtenerMetadatosMensaje()`: remitente, asunto, fecha, link) — **no** vuelve a leer ni normalizar el cuerpo, porque no lo necesita: la clasificación ya está en el manifiesto.
3. Separa las tareas en `pendientes` (`estado_escritura != ESCRITA`) y ya escritas.
4. Si hay `pendientes`: ejecuta únicamente el tramo de escritura (`agruparFilasPorHoja` → `escribirFilasPorLote` → `marcarTareasEscritas`) para esas tareas.
5. Si **no** hay pendientes (todas ya `ESCRITA`): no se toca ningún tablero de negocio. Este es el caso textual que describe la regla de recuperación del plan v3:

   > "Si falla la actualización de Gmail después de la escritura, no consultar nuevamente a OpenAI ni reescribir filas; repetir únicamente la actualización de Gmail a partir de la etapa registrada."

6. En ambos casos, aplica `aplicarResultadoGmail()` (etiqueta `Procesado` + archivado por mensaje) y cierra el mensaje con `finalizarMensaje()`.

## 5. Caso límite: etapa avanzada pero manifiesto vacío

Si `recuperarProcesamientosAbandonados()` encuentra una etapa que sugeriría manifiesto persistido, pero `obtenerManifiestoPersistido()` devuelve un arreglo vacío (por ejemplo, el proceso murió **durante** la propia escritura del manifiesto, dejando la etapa mal registrada), `reanudarDesdeManifiesto()` no asume nada: trata el caso como si no hubiera manifiesto y lo marca `ERROR_TEMPORAL` para reprocesamiento completo. Es una salvaguarda deliberadamente conservadora ante un estado inconsistente.

## 6. Corrección de un bug real encontrado al implementar esta fase

Al diseñar la reanudación, se detectó que `registrarInicioProcesamiento()` (Fase 3) **insertaba una fila nueva en `Log Mensajes` en cada invocación**, sin comprobar si el mensaje ya tenía una fila de un intento anterior. Esto habría producido filas duplicadas para el mismo `message_id` cada vez que un mensaje se reprocesara tras un abandono temprano (sección 3, primera fila de la tabla), y `actualizarLogMensajes()` habría seguido encontrando y actualizando solo la **primera** fila (la más antigua), dejando el resto del historial inconsistente.

**Corrección aplicada** (`codigo/script_refactorizado.gs`, `registrarInicioProcesamiento()`): antes de insertar, se busca una fila existente para el `message_id`; si existe, se reutiliza (se actualizan `fecha_inicio`, `fecha_fin`, `remitente`, `asunto`, `estado`, `etapa`); solo se inserta una fila nueva si el mensaje nunca se había visto. Esto garantiza que `Log Mensajes` mantenga **una única fila por mensaje**, incluso a través de múltiples intentos.

## 7. Qué NO cubre esta fase (limitaciones reconocidas)

- **Recuperación de mensajes cerrados por error definitivo de IA:** un mensaje que agotó los 3 reintentos de `consultarIAExtractora()` (`documentacion/POLITICA_REINTENTOS.md`) se cierra como `REVISION_MANUAL` y queda registrado en `Indice Idempotencia`; esta fase no lo reabre automáticamente. Es una decisión deliberada del plan v3 ("no reintentar indefinidamente"), no un olvido de esta fase.
- **Reintentos automáticos entre ejecuciones para `ERROR_DEFINITIVO`:** por diseño, un mensaje `ERROR_DEFINITIVO` se cierra igual que uno terminal (`gestionarErrorMensaje()`, Fase 3) y no vuelve a intentarse solo. Esto sigue siendo así **cuando no hay manifiesto persistido** (ver sección 8 para el caso con manifiesto).
- **Verificación empírica de la reanudación fina:** esta fase entrega el diseño y el código; la verificación contra una interrupción real simulada corresponde a la Fase 8 (pruebas controladas, caso a definir junto con CP-20).

## 8. Corrección de Fase 8 (INC-FASE8-005): una segunda vía de recuperación, inmediata

Al ejecutar de verdad en la Fase 8 (`pruebas/resultados/INCIDENCIAS_FASE_8.md`, INC-FASE8-005), se detectó que la bifurcación de la sección 3 tenía una brecha real: describe correctamente lo que hace `recuperarProcesamientosAbandonados()`, pero esa función **solo actúa sobre mensajes ya `EN_PROCESO` y con `fecha_inicio` más antigua que `UMBRAL_ABANDONO_MIN`**. Una falla de Gmail que ocurre y se **captura como excepción dentro de la misma ejecución** (por ejemplo, un error real de la API, no una caída del runtime) nunca llega a esperar ese umbral: `gestionarErrorMensaje()` la intercepta de inmediato, y en su diseño original la cerraba como `ERROR_DEFINITIVO` con `tareas=[]`, sin comprobar si ya existía un manifiesto — exactamente el escenario que CP-12 y CP-25 pretendían cubrir, pero que ninguna de las dos rutas de recuperación existentes hasta ese momento resolvía correctamente.

**Corrección aplicada:** ahora existen **dos** puntos de entrada a la recuperación fina, ambos convergiendo en `reanudarDesdeManifiesto()`:

1. **Por abandono** (sin cambios, sección 2-4 de este documento): `recuperarProcesamientosAbandonados()`, al inicio de `procesarCorreosDeTareas()`, para mensajes `EN_PROCESO` más antiguos que `UMBRAL_ABANDONO_MIN` (típicamente, una caída de runtime que nadie capturó).
2. **Inmediata, en la entrada de `procesarUnMensaje()`** (nuevo): antes de `registrarInicioProcesamiento()`, se comprueba `obtenerManifiestoPersistido(messageId, cfg)`. Si ya existe un manifiesto (de un intento anterior en la MISMA ejecución del activador que falló y fue capturado por `gestionarErrorMensaje()`, o de una ejecución previa cuyo error no llegó a los 20 minutos de abandono), se llama a `reanudarDesdeManifiesto()` directamente, sin esperar nada.

`gestionarErrorMensaje()` es el punto de conexión entre ambas: cuando detecta que ya existe un manifiesto para el mensaje que falló, **no intenta recuperarlo ahí mismo** (evita la cadena "recuperación → error → recuperación" difícil de acotar); solo registra `ERROR_TEMPORAL` con el error, **preservando la `etapa` ya alcanzada** (no la resetea), y retorna. El mensaje queda así disponible para que la vía 2 lo tome en la próxima invocación de `procesarUnMensaje()` para ese `messageId` — que puede ocurrir en la ejecución siguiente del activador (10 minutos después, sin esperar `UMBRAL_ABANDONO_MIN`).

**Por qué la responsabilidad de decidir "hay que reanudar" se movió a la entrada de `procesarUnMensaje()` y no quedó dentro de `gestionarErrorMensaje()`:** mezclar "registrar y clasificar un error" con "reintentar el pipeline transaccional" en la misma función crea una ruta de control difícil de acotar (¿qué pasa si el reintento inline también falla? ¿cuántas veces se reintenta en la misma invocación?). Con la comprobación en la entrada de `procesarUnMensaje()`, cada invocación intenta la recuperación **como máximo una vez**, y si falla, vuelve a pasar por el mismo camino ya conocido (`gestionarErrorMensaje()` → `ERROR_TEMPORAL` → próxima invocación) sin necesidad de lógica de reintento especial.

**Riesgo residual identificado (no resuelto en esta corrección, dejado como riesgo documentado):** `finalizarMensaje()` no verifica si ya existe una fila para la combinación `message_id` + `task_id` antes de insertar en `Indice Idempotencia`. Si, por alguna vía no contemplada, el mismo mensaje llegara a finalizarse dos veces, se generarían filas duplicadas (no crearía tareas duplicadas en los tableros de negocio, pero sí ensuciaría el índice). Con el diseño actual esto no debería ocurrir en la práctica (la combinación de `LockService`, el orden secuencial de `recuperarProcesamientosAbandonados()` antes del bucle de mensajes nuevos, y el chequeo de manifiesto en la entrada de `procesarUnMensaje()` lo hace muy improbable), pero se registra como endurecimiento pendiente, no urgente.

**Actualización (auditoría del 20/07/2026, a pedido de Carlos Rubén Bageta):** el riesgo residual anterior deja de considerarse tolerable y pasa a corrección propuesta obligatoria — ver sección 9. Las secciones 9 a 12 registran una nueva ronda de hallazgos, **ninguno aplicado en código todavía** (diagnóstico y propuesta, pendientes de aprobación).

## 9. Idempotencia estructural de `finalizarMensaje()` (aplicada y verificada — CP-35 Aprobado, 27/07/2026)

**Hallazgo H-05:** `finalizarMensaje()` (`codigo/script_refactorizado.gs`, líneas 601-614) siempre **agrega** filas a `Indice Idempotencia` vía `hojaIndice.getRange(hojaIndice.getLastRow() + 1, ...).setValues(filas)`, sin comprobar si ya existe una fila para la misma combinación `message_id` + `task_id`. Esto convierte el "riesgo residual" de la sección 8 en un defecto de diseño real: **CP-35 no puede ser una prueba obligatoria de la Fase 8 mientras el código no garantice estructuralmente la ausencia de duplicados** — hoy solo se puede argumentar que es "improbable", no que sea imposible.

**Hallazgo H-06 (orden transaccional):** dentro de la misma función, la actualización de `Log Mensajes` (`estado`, `etapa: FINALIZADO`, `fecha_fin`) ocurre **antes** de la escritura en `Indice Idempotencia`. La única barrera real contra el reprocesamiento es `Indice Idempotencia` (`obtenerMensajesPendientes()` no consulta `Log Mensajes` para excluir un mensaje). Si la escritura del índice fuera la que efectivamente aplica el upsert (H-05), conviene que sea la **primera** acción confirmada de `finalizarMensaje()`, no la última: así, ante una interrupción a mitad de la función, la barrera real (el índice) queda protegida primero, y `Log Mensajes` —que es solo observabilidad, no un mecanismo de exclusión— puede quedar levemente rezagado sin consecuencia funcional.

**Propuesta de corrección (no aplicada):**
1. Antes de escribir, leer `Indice Idempotencia` y construir un `Set` de claves `message_id + '|' + task_id` ya existentes (análogo a `obtenerIdsYaProcesados()`, pero por la clave compuesta).
2. Para cada fila a insertar: si la clave ya existe, **actualizar** la fila existente (`estado_final`, `fecha`) en lugar de agregar una nueva; si no existe, agregarla.
3. Reordenar `finalizarMensaje()` para que el upsert en `Indice Idempotencia` se confirme **antes** de la actualización final de `Log Mensajes`.
4. Aplica sin cambios a los tres casos de invocación (`tareas.length === 0`, con tareas, y el caso `ERROR_DEFINITIVO` de `gestionarErrorMensaje()`), ya que todos pasan por esta misma función.

**Archivos afectados (propuesta):** `codigo/script_refactorizado.gs` (`finalizarMensaje()`).
**Regresión propuesta:** CP-35 (ver `pruebas/CASOS_DE_PRUEBA.md`), forzando dos invocaciones de `finalizarMensaje()` para el mismo mensaje y confirmando una sola fila final por `task_id` (actualizada, no duplicada).

**Aplicada (27/07/2026, ver `auditoria/CHANGELOG.md`):** los 3 puntos de la propuesta se implementaron tal cual — nueva función `upsertIndiceIdempotencia()` (upsert por clave compuesta `message_id+'|'+task_id`, análoga a `obtenerIdsYaProcesados()`) y `finalizarMensaje()` reordenado para confirmar ese upsert antes de `actualizarLogMensajes()`. Verificado localmente con mocks de Sheets (inserción nueva, doble invocación mismo estado, doble invocación distinto estado, lote mixto, orden de llamadas) — sin regresión. Instrumentación temporal agregada para forzar la regresión real de CP-35 (gancho gateado por `cfg.modoPrueba` + `CP35_DUPLICAR_FINALIZACION`, con guard contra recursión sin límite). **Pendiente:** ejecutar la corrida real y confirmar en la planilla antes de aprobar CP-35 y retirar la instrumentación.

## 10. Recuperación independiente de que el mensaje siga en Recibidos (aplicada y confirmada con corrida real — CP-38 Aprobado, 27/07/2026)

**Hallazgo H-07:** la corrección de INC-FASE8-005 (sección 8) depende de que `obtenerMensajesPendientes()` **vuelva a encontrar** el `message_id` en una ejecución posterior para que el chequeo de manifiesto en la entrada de `procesarUnMensaje()` se dispare. Pero `obtenerMensajesPendientes()` se construye a partir de `GmailApp.search(consulta, ...)` (`in:inbox` en producción, `GMAIL_QUERY_PRUEBA` en prueba) — si el mensaje **ya no está en la bandeja de entrada** (por ejemplo, porque `aplicarResultadoGmail()` alcanzó a archivarlo antes de que fallara algo posterior, o porque el estado de Gmail cambió por cualquier otra vía), la búsqueda nunca lo vuelve a traer, y el mecanismo de la sección 8 **nunca se activa** para ese mensaje — quedaría en `ERROR_TEMPORAL` para siempre, sin que nada lo retome.

**Propuesta de corrección (no aplicada):** agregar, al inicio de `procesarCorreosDeTareas()` (junto a `recuperarProcesamientosAbandonados()`, pero como mecanismo distinto), una función `recuperarMensajesConManifiestoPendiente(cfg)` que:
1. Recorre `Log Mensajes` buscando filas con `estado === ERROR_TEMPORAL`.
2. Para cada una, comprueba `obtenerManifiestoPersistido(messageId, cfg).length > 0` (existe manifiesto) y que el `message_id` **no** tenga ya una fila en `Indice Idempotencia` (no fue cerrado por otra vía mientras tanto).
3. Si ambas condiciones se cumplen, llama a `reanudarDesdeManifiesto()` directamente — sin pasar por `obtenerMensajesPendientes()` ni por ninguna búsqueda de Gmail, ya que `reanudarDesdeManifiesto()` relee el mensaje por `GmailApp.getMessageById(messageId)` (`obtenerMetadatosMensaje()`, ya implementado), que funciona sin importar si el mensaje está en la bandeja, archivado, o con cualquier etiqueta.

Esta función complementa (no reemplaza) a `recuperarProcesamientosAbandonados()`: esta última cubre mensajes `EN_PROCESO` abandonados (caída de runtime real); la nueva cubre mensajes `ERROR_TEMPORAL` explícitamente marcados por `gestionarErrorMensaje()` tras una excepción capturada.

**Archivos afectados (propuesta):** `codigo/recuperacion.gs` (nueva función), `codigo/script_refactorizado.gs` (llamado desde `procesarCorreosDeTareas()`).
**Regresión propuesta:** CP-38 (ver `pruebas/CASOS_DE_PRUEBA.md`) — forzar una falla de Gmail después de que el mensaje ya fue archivado por una operación previa exitosa (simulando que solo el paso posterior falló), y confirmar que se recupera igual, sin depender de que siga en la bandeja.

**Aplicada (27/07/2026, ver `auditoria/CHANGELOG.md`, DEC-010):** implementada tal cual la propuesta — `recuperarMensajesConManifiestoPendiente(cfg)` en `codigo/recuperacion.gs`, llamada desde `procesarCorreosDeTareasConConfiguracion_()` junto a `recuperarProcesamientosAbandonados()`, con los mismos guards (`opciones.omitirRecuperacion`, `cfg.dryRun`). Verificado localmente con mocks de Sheets: reanuda un `ERROR_TEMPORAL` con manifiesto y sin fila en `Indice Idempotencia`; no toca un `ERROR_TEMPORAL` sin manifiesto; no reanuda uno ya cerrado por otra vía; ignora mensajes que no están en `ERROR_TEMPORAL`.

**Confirmada con corrida real (27/07/2026, CP-38 Aprobado):** mensaje archivado de verdad en Gmail y luego forzado a `ERROR_TEMPORAL` con manifiesto; la ejecución siguiente lo recuperó vía `recuperarMensajesConManifiestoPendiente()` mientras la búsqueda normal de Gmail informaba `0 mensajes elegibles` — confirma que la recuperación no depende de que el mensaje siga siendo hallable por Gmail. Instrumentación temporal (`CP38_FORZAR_FALLO_POSTERIOR`) retirada. Detalle completo en `pruebas/resultados/RESULTADOS_FASE_8.md`.

## 11. Límite de reintentos para fallas de Gmail posteriores al manifiesto (aplicada y confirmada con corrida real — CP-39 Aprobado, 27/07/2026)

**Hallazgo H-08:** ni la corrección de INC-FASE8-005 ni la propuesta de la sección 10 imponen un límite a cuántas veces se reintenta la actualización de Gmail para un mensaje con manifiesto. Una falla permanente (por ejemplo, un ID de etiqueta inválido, un permiso revocado) haría que el mensaje se reintente en cada ejecución, indefinidamente, sin nunca alertar a un humano ni cerrarse.

**Propuesta de corrección (no aplicada, DEC-007):** agregar una columna `intentos_gmail` a `Log Mensajes` (distinta de `intentos`, que ya mide reintentos de la IA), incrementada cada vez que `gestionarErrorMensaje()` detecta un manifiesto y deja el mensaje en `ERROR_TEMPORAL`. Al superar `LIMITE_REINTENTOS_GMAIL` (propuesta: 5), el mensaje se cierra como `ERROR_DEFINITIVO` — con las tareas ya escritas en los tableros de negocio **conservadas** (no se revierten; ya son datos reales y válidos) — y se escribe `Indice Idempotencia`, quedando como un caso de revisión manual humana permanente (la etiqueta de Gmail puede no haberse podido aplicar, pero las tareas sí existen).

**Archivos afectados (propuesta):** `codigo/script_refactorizado.gs` (`gestionarErrorMensaje()`, `registrarInicioProcesamiento()` o el punto donde se inicializa la fila), `documentacion/DISENO_HOJAS_TECNICAS.md` (nueva columna).
**Regresión propuesta:** CP-39 (ver `pruebas/CASOS_DE_PRUEBA.md`) — forzar que la recuperación de Gmail falle repetidamente más allá del límite y confirmar el cierre `ERROR_DEFINITIVO` con tareas conservadas.

**Aplicada (27/07/2026, ver `auditoria/CHANGELOG.md`, DEC-007 actualizada):** columna 27 `intentos_gmail` agregada a `documentacion/DISENO_HOJAS_TECNICAS.md` y a `registrarInicioProcesamiento()`; propiedad obligatoria `LIMITE_REINTENTOS_GMAIL` validada en `validarConfiguracion()`; `gestionarErrorMensaje()` cuenta el intento en la rama que ya detecta manifiesto y, al superar el límite, cierra `ERROR_DEFINITIVO` pasando el manifiesto completo a `finalizarMensaje()` (las tareas ya escritas quedan conservadas, no se revierten). Verificado localmente con mocks de Sheets: por debajo del límite sigue `ERROR_TEMPORAL` con el contador incrementado; en el límite exacto todavía no cierra; al superarlo cierra `ERROR_DEFINITIVO` con la fila de `Indice Idempotencia` escrita. **Confirmada con corrida real (27/07/2026, CP-39 Aprobado):** `LIMITE_REINTENTOS_GMAIL=6` en el proyecto de prueba, 7 ejecuciones reales sobre el mismo mensaje — la séptima superó el límite y cerró `ERROR_DEFINITIVO` con las 2 tareas ya escritas conservadas, sin duplicados en `Indice Idempotencia` ni en `Registro Tareas`. Instrumentación temporal (`CP39_FORZAR_FALLO_GMAIL_REPETIDO`) retirada. Detalle completo en `pruebas/resultados/RESULTADOS_FASE_8.md`.

## 12. Ajustes menores de la recuperación (aplicados, 27/07/2026)

- **H-10 — `reanudarDesdeManifiesto()` y tareas `ANULADA`:** el filtro `pendientes = tareas.filter(t => t.estadoEscritura !== ESCRITA)` (`codigo/recuperacion.gs`) trataría una tarea `ANULADA` (estado del enum `ESTADOS_ESCRITURA_TAREA`, hoy no generado por ningún código, pero previsto desde la Fase 2 para tareas descartadas por duplicado de contenido) como "pendiente de escribir", intentando escribirla de nuevo. Propuesta: excluir explícitamente `ANULADA` del filtro de pendientes (solo `RESERVADA`/`ERROR_ESCRITURA` deben reintentarse).
- **H-11 — `unidades_gmail_api` no acumula:** `actualizarLogMensajes(..., { unidades_gmail_api: 1 }, cfg)` sobrescribe el valor en cada llamada a `aplicarResultadoGmail()`. Si un mensaje requiere más de una llamada real a Gmail (una fallida + una exitosa en la recuperación), el valor final no refleja el consumo real acumulado. Propuesta: leer el valor actual antes de escribir y sumar, en vez de sobrescribir.
- **H-12 — `Log Mensajes.error` nunca se limpia tras una recuperación exitosa:** una vez que `gestionarErrorMensaje()` escribe un mensaje de error, ninguna función posterior lo borra, aunque `reanudarDesdeManifiesto()` complete el mensaje con éxito después. Un mensaje `PROCESADO` con una columna `error` no vacía es confuso para quien audite la hoja. Propuesta: `finalizarMensaje()` limpia (o anota como "resuelto tras reintento") el campo `error` cuando el `estadoFinal` es un cierre exitoso (`PROCESADO`, `SIN_TAREAS`), conservándolo solo para cierres de error (`ERROR_DEFINITIVO`, `REVISION_MANUAL`).

**Archivos afectados (propuesta):** `codigo/recuperacion.gs` (H-10), `codigo/script_refactorizado.gs` (H-11, H-12).
**Regresión propuesta:** casos de prueba a definir junto con CP-32/CP-33 (H-10), verificación manual del campo `unidades_gmail_api` en CP-38 (H-11), y verificación del campo `error` en CP-38 (H-12).

**Aplicados (27/07/2026, ver `auditoria/CHANGELOG.md`, DEC-011):**
- **H-10:** el filtro de `pendientes` en `reanudarDesdeManifiesto()` pasó de `estadoEscritura !== ESCRITA` a una lista explícita (`RESERVADA` o `ERROR_ESCRITURA` únicamente).
- **H-11:** `aplicarResultadoGmail()` acumula `unidades_gmail_api` (nuevo helper compartido `obtenerValorNumericoLogMensajes()`, también usado por H-08) en vez de sobrescribir.
- **H-12, con una precisión sobre la propuesta:** `finalizarMensaje()` limpia `error` **solo** cuando `estadoFinal === PROCESADO`. La propuesta original incluía también `SIN_TAREAS`, pero `finalizarMensajeSinTareas()` escribe deliberadamente el `motivo_sin_tareas` en esa misma columna antes de llegar a `finalizarMensaje()` — limpiarlo ahí borraría ese texto legítimo (confirmado revisando el flujo real, no solo la propuesta en abstracto). `finalizarMensajeSinTareas()` nunca cierra con `PROCESADO`, así que restringir a ese único estado cubre el escenario real de H-12 (mensaje que se recupera con éxito tras una falla) sin ese efecto colateral.

Verificado localmente con mocks de Sheets: `ANULADA` queda fuera de las tareas que se reintentan escribir; `unidades_gmail_api` se acumula entre dos llamadas (1 previa + 1 nueva = 2, no sobrescribe a 1); `error` se limpia en `PROCESADO` pero se conserva intacto en `SIN_TAREAS` y en `ERROR_DEFINITIVO`. Sin instrumentación temporal ni corrida real propia — se verifican junto con CP-38/CP-39 (comparten el mismo camino de código que H-07/H-08).

**Confirmación real parcial (27/07/2026, vía CP-38):** la corrida real de CP-38 ejerció el mismo camino de código que H-11 y H-12, confirmándolos también en producción real: `unidades_gmail_api` llegó a `2` (acumulado, no sobrescrito) y `Log Mensajes.error` quedó vacío tras el cierre `PROCESADO`. **H-10 (exclusión de `ANULADA`) no fue ejercitado** por ese escenario (ninguna tarea del mensaje estaba `ANULADA`) y permanece verificado solo localmente con mocks — no tiene un caso de regresión propio que lo ejerza en producción real.

## 13. Nota relacionada: precisión del descubrimiento de mensajes (H-03)

La sección 10 asume que, cuando el descubrimiento sí trae un mensaje, ese mensaje realmente corresponde a la consulta configurada. Una auditoría separada (20/07/2026) encontró que `obtenerHilosPendientes()`/`obtenerMensajesPendientes()` seleccionaban por **hilo** (`GmailApp.search()` + `hilo.getMessages()`), no por mensaje individual, lo que podía traer mensajes que no coincidían ellos mismos con la consulta (por ejemplo, `GMAIL_QUERY_PRUEBA`) simplemente por compartir hilo con uno que sí coincidía. **Aplicado en Lote 1 (21/07/2026):** `obtenerHilosPendientes()` y `obtenerMensajesPendientes()` fueron eliminadas y reemplazadas por `obtenerMensajesPendientesDesdeGmail(cfg)`, que usa `Gmail.Users.Messages.list()` (Gmail API por mensaje individual). Ver `auditoria/DECISIONES.md`, DEC-005.

## 14. Un mensaje con manifiesto puede reanudarse dos veces en la misma ejecución (aplicada y confirmada con corrida real, 27/07/2026)

**Hallazgo H-14:** al preparar el procedimiento de CP-39 (H-08) — leyendo el código antes de instrumentar o correr nada — se detectó que la sección 10 (H-07) y el chequeo de manifiesto ya existente en la entrada de `procesarUnMensaje()` (sección 8, INC-FASE8-005) no son mutuamente excluyentes dentro de una misma ejecución.

Un mensaje `ERROR_TEMPORAL` con manifiesto persistido que **no llega a archivarse** (permanece en `in:inbox`, sea porque `PERMITIR_ARCHIVADO=false` o porque la actualización de Gmail vuelve a fallar) se encuentra dos veces en la misma ejecución de `procesarCorreosDeTareasConConfiguracion_()`: primero por `recuperarMensajesConManifiestoPendiente()` (corre antes de la búsqueda de Gmail), y después por la búsqueda normal de Gmail, que todavía lo trae porque nunca salió de la bandeja — entregándoselo a `procesarUnMensaje()`, cuyo propio chequeo de manifiesto lo reanuda otra vez. Si ambos intentos fallan (el escenario exacto de CP-39: falla de Gmail persistente), `gestionarErrorMensaje()` se llama dos veces por ejecución, duplicando `intentos_gmail`/`unidades_gmail_api` y gastando el doble de cuota real de Gmail de lo que la premisa original de DEC-007 asumía (un intento real por ejecución manual). No lo expuso la corrida real de CP-38 porque ese caso sí archiva el mensaje, sacándolo de la búsqueda normal.

No corrompe datos: sin manifiesto que reescribir dos veces (las tareas ya están `ESCRITA`), sin filas duplicadas en ninguna hoja.

**Corrección aplicada (27/07/2026, DEC-012):** `recuperarProcesamientosAbandonados(cfg)` y `recuperarMensajesConManifiestoPendiente(cfg)` (`codigo/recuperacion.gs`) devuelven la lista de `message_id` que efectivamente intentaron reanudar vía `reanudarDesdeManifiesto()` en esa ejecución (haya tenido éxito o no). `procesarCorreosDeTareasConConfiguracion_()` (`codigo/script_refactorizado.gs`) junta ambas listas y filtra esos ids del resultado de `obtenerMensajesPendientesDesdeGmail()` antes del bucle principal, para que `procesarUnMensaje()` nunca vuelva a ver, en la misma ejecución, un mensaje que la recuperación ya intentó.

Deliberadamente **no** se excluyen los mensajes que `recuperarProcesamientosAbandonados()` reabre sin manifiesto (`reabiertosCompletos`): esos deben seguir siendo encontrados por la búsqueda normal en la misma ejecución para reprocesarse desde cero — comportamiento preexistente, sin relación con este hallazgo.

Verificado localmente con mocks de Sheets (18 verificaciones, código real extraído por rango de línea): ambas funciones de recuperación devuelven exactamente los ids reanudados vía manifiesto, sin incluir los reabiertos sin manifiesto ni los excluidos por los filtros preexistentes (ya cerrado en `Indice Idempotencia`, sin manifiesto, dentro del umbral de abandono); el filtro nuevo en `procesarCorreosDeTareasConConfiguracion_()` excluye correctamente esos ids de la búsqueda normal en la misma ejecución, sin falsos positivos cuando la recuperación no encuentra nada, y sin alterar el comportamiento de `DRY_RUN`/`omitirRecuperacion`. **Confirmado con corrida real (27/07/2026, vía CP-39):** de la ejecución 2 en adelante, cada corrida mostró `"0 mensajes elegibles, procesando 0"` tras la recuperación de H-07, y `intentos_gmail` avanzó exactamente 1 por ejecución (2, 3, 4, 5, 6) — sin el doble incremento que exhibía el código antes de esta corrección.

## Referencias cruzadas

- Formato de ID y por qué la determinismo aplica solo post-manifiesto: `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`.
- Los 12 pasos originales y la brecha que esta fase resuelve: `documentacion/FLUJO_TRANSACCIONAL.md`, sección 3.
- Columnas de `Registro Tareas` que hacen posible la reconstrucción sin IA: `documentacion/DISENO_HOJAS_TECNICAS.md`, sección 2.
- Riesgos mitigados: `documentacion/MATRIZ_RIESGOS.md`, R-01 (duplicación), R-03 (caída del runtime), R-04 (ejecuciones simultáneas), R-06 (falla parcial de escritura).
