# Incidencias de la Fase 8 — Pruebas controladas

**Plantilla creada:** 20/07/2026, Claude Cowork
**Estado de este documento:** Se completa con evidencia real reportada por Carlos Rubén Bageta durante la ejecución de la Fase 8.

## INC-FASE8-001 — Exposición de OPENAI_API_KEY de prueba en log de instrumentación temporal

**Caso de prueba relacionado:** No corresponde a fault injection (CP-08/CP-09/CP-12/CP-26/CP-29) ni a ningún CP-XX de `pruebas/CASOS_DE_PRUEBA.md`. **Corrección (20/07/2026, precisada por Carlos Rubén Bageta):** ocurrió durante la **validación inicial de la configuración**, antes de que existiera la versión segura de `ejecutarValidacionVisible()` (`pruebas/debug_seguro_pruebas.gs`).
**Fecha y hora:** 20/07/2026 17:44
**Entorno:** Prueba (proyecto de Apps Script de prueba). **Confirmado por Carlos Rubén Bageta: la clave expuesta era exclusiva del entorno de prueba, distinta de la que usa el script productivo — sin impacto en la automatización que sigue activa en producción (DEC-002).**
**Severidad:** Alta (exposición de credencial; impacto acotado al no ser la clave productiva)
**Descripción:** Una versión anterior de la función temporal `ejecutarValidacionVisible()` (previa al rediseño con lista blanca y redacción) serializó el objeto completo devuelto por `validarConfiguracion()` — que contiene `cfg.openaiApiKey` en texto plano — y lo registró mediante `Logger.log` durante una validación inicial de la configuración del proyecto de prueba, exponiendo la clave.
**Resultado esperado (según CASOS_DE_PRUEBA.md):** Ninguna función de depuración, temporal o no, debía serializar `cfg` completo sin redacción.
**Resultado observado:** La clave de prueba quedó expuesta en texto plano en el log de la ejecución.
**Impacto:** Exposición de una credencial de OpenAI exclusiva del entorno de prueba. Sin impacto en el script productivo ni en `tareas@alia-data.com`.
**Causa probable:** Al momento del hecho (17:44) no existía todavía ninguna utilidad de serialización segura para `cfg`; `ejecutarValidacionVisible()` era, en ese momento, una función ad-hoc sin lista blanca ni redacción. Esta incidencia es, de hecho, la motivación original de la auditoría de seguridad y de la creación de `pruebas/debug_seguro_pruebas.gs` (ver `auditoria/CHANGELOG.md`, "Corrección de seguridad: redacción de secretos en instrumentación temporal de la Fase 8").
**Acción inmediata:** Se revocó la clave expuesta.
**Corrección aplicada:** Se creó una nueva clave, se actualizó la propiedad `OPENAI_API_KEY` (del proyecto de prueba) y se incorporó una función de validación con lista blanca y redacción de secretos (`ejecutarValidacionVisible()`, `pruebas/debug_seguro_pruebas.gs`).
**Verificación:** La validación fue repetida correctamente. La API key aparece como `[REDACTADA]`, la configuración es válida y el ID efectivo corresponde a la planilla de prueba.
**Estado:** Resuelta

## INC-FASE8-002 — DRY_RUN registró estados finales sin escritura real

**Caso de prueba relacionado:** Preprueba de CP-01 con `DRY_RUN=true`
**Fecha y hora:** 20/07/2026 19:23
**Entorno:** Prueba aislada
**Severidad:** Alta
**Descripción:** Con `DRY_RUN=true`, no se creó ninguna fila en la hoja de negocio `Soporte`. Sin embargo, el sistema generó registros persistentes en las hojas técnicas y los cerró como si la escritura se hubiera efectuado realmente.
**Resultado esperado:** La ejecución debía simular la operación sin crear una tarea real ni registrar como definitiva una escritura que no ocurrió.
**Resultado observado:**
- `Registro Tareas.estado_escritura = ESCRITA`.
- `Registro Tareas.fila_destino = 5`.
- No existe una fila nueva en la hoja `Soporte`.
- `Indice Idempotencia.estado_final = PROCESADO`.
- `Log Mensajes.estado = PROCESADO`.
- `Log Mensajes.etapa = FINALIZADO`.
- `Log Mensajes.cantidad_observaciones = 1`, `cantidad_tareas = 1`, HTTP 200, modelo `gpt-4o-mini`.
**Impacto:** El estado técnico no representa la realidad. El mensaje puede quedar excluido de futuras ejecuciones por idempotencia aunque su tarea nunca haya sido escrita.
**Causa raíz confirmada (auditoría de Claude Cowork, 20/07/2026):** `DRY_RUN` solo se comprueba en **dos** puntos de todo el pipeline — `escribirFilasPorLote()` (`codigo/escritura_sheets.gs`, líneas 106-112) y `aplicarResultadoGmail()` (`codigo/script_refactorizado.gs`) — y ni siquiera en el primero de esos dos el resultado queda etiquetado con honestidad. En orden transaccional:
  1. `persistirManifiestoTareas()` (`codigo/idempotencia.gs`, líneas 95-129): escribe la fila `RESERVADA` en `Registro Tareas` **sin ninguna comprobación de `cfg.dryRun`**. Esto en sí mismo es aceptable (una reserva no implica una escritura de negocio), pero es el primer punto donde `DRY_RUN` ya no tiene efecto.
  2. `escribirFilasPorLote()` (`codigo/escritura_sheets.gs`, líneas 106-111): en la rama `if (cfg.dryRun)`, correctamente **no** llama a `hoja.getRange(...).setValues(filas)` sobre la hoja de negocio. Pero inmediatamente después asigna `resultado[tarea.taskId] = { escrita: true, fila: filaInicial + idx, motivo: null }` — **exactamente el mismo resultado que la rama de escritura real** (líneas 114-117). `filaInicial` se calculó como `hoja.getLastRow() + 1`: es un número de fila plausible, pero ninguna fila fue realmente escrita ahí.
  3. `marcarTareasEscritas()` (`codigo/escritura_sheets.gs`, líneas 124-143): **no tiene ninguna comprobación de `cfg.dryRun`**. Lee `res.escrita` (que llegó en `true` desde el paso anterior) y ejecuta `hoja.getRange(...).setValues([[ESTADOS_ESCRITURA_TAREA.ESCRITA, res.fila, ...]])` — una escritura **real** en `Registro Tareas`, con el `fila_destino` fabricado del paso 2. Este es el punto exacto donde aparece `estado_escritura = ESCRITA` y `fila_destino = 5` sin fila real en `Soporte`.
  4. `aplicarResultadoGmail()` (`codigo/script_refactorizado.gs`): sí comprueba `cfg.dryRun` correctamente y no toca Gmail — por eso el bug no afectó etiquetas ni archivado.
  5. `finalizarMensaje()` (`codigo/script_refactorizado.gs`, líneas 463 en adelante): **no tiene ninguna comprobación de `cfg.dryRun`**. Escribe incondicionalmente `estado = PROCESADO`, `etapa = FINALIZADO` en `Log Mensajes`, y una fila en `Indice Idempotencia` con `estado_final = PROCESADO`. Como `obtenerMensajesPendientes()` excluye cualquier `message_id` presente en `Indice Idempotencia` **sin importar el valor de `estado_final`**, esta escritura es la causa directa de que el mensaje quede permanentemente excluido de reprocesamiento, incluso después de pasar a `DRY_RUN=false`.

  **Conclusión de la causa:** `DRY_RUN` nunca fue diseñado como una propiedad transversal del pipeline; solo se implementó como un atajo puntual en la escritura de negocio y en Gmail, con el resultado de esa escritura simulada indistinguible de una escritura real para el resto del flujo (`marcarTareasEscritas()`, `finalizarMensaje()`). Todas las hojas técnicas (`Registro Tareas`, `Log Mensajes`, `Indice Idempotencia`) se actualizan siempre como si la ejecución fuera real.
**Acción inmediata:** Se detuvieron las pruebas. Se mantiene `DRY_RUN=true` y no se eliminaron los registros técnicos para preservar la evidencia.
**Decisión de diseño (Carlos Rubén Bageta, 20/07/2026):** rechazada la propuesta inicial de Claude Cowork de introducir estados persistentes `SIMULADO`/`SIMULADA`. En su lugar, `DRY_RUN=true` se define como **modo sin persistencia**: puede leer Gmail, consultar OpenAI, construir/validar tareas en memoria y emitir logs seguros, pero no debe escribir en ninguna hoja (de negocio ni técnica), no debe etiquetar/archivar Gmail, y no debe impedir el reprocesamiento posterior con `DRY_RUN=false`.
**Corrección aplicada:**
- `codigo/script_refactorizado.gs`, `procesarUnMensaje()`: salida temprana y explícita (`if (cfg.dryRun) { procesarUnMensajeSimulado(...); return; }`) antes de `registrarInicioProcesamiento()` — el primer punto de persistencia del flujo real.
- Nueva función `procesarUnMensajeSimulado()` (mismo archivo): repite el análisis en memoria (extracción, filtro, IA, validación, generación de tareas) y **nunca** llama a ninguna función de persistencia; emite un log `[DRY_RUN] ...` con cantidad de observaciones, cantidad de tareas, tablero y prioridad de cada una, y confirmación de que no hubo escrituras.
- `codigo/script_refactorizado.gs`, `procesarCorreosDeTareas()`: `recuperarProcesamientosAbandonados(cfg)` ahora se omite por completo cuando `cfg.dryRun` es `true` (auditoría adicional: esta función persiste al recuperar mensajes reales abandonados por una ejecución anterior, y podía ejecutarse aunque la corrida actual fuera una simulación).
- `codigo/script_refactorizado.gs`, `gestionarErrorMensaje()`: guard `if (cfg.dryRun) { ...log...; return; }` al inicio, para que una excepción durante la simulación tampoco dispare una escritura de cierre (`finalizarMensaje()` con `ERROR_DEFINITIVO`).
- `codigo/recuperacion.gs`: comentario explicativo en `recuperarProcesamientosAbandonados()` documentando por qué no necesita un guard propio (ya está cubierto por el único punto de llamada).
- `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`: nueva sección 7 explicando por qué `DRY_RUN` queda completamente fuera del sistema de idempotencia.
- `pruebas/CASOS_DE_PRUEBA.md`: semántica exacta de `DRY_RUN` documentada en la sección de configuración previa.

**Auditoría de puntos de persistencia (solicitada explícitamente):** se revisaron todos los llamadores de `registrarInicioProcesamiento()`, `actualizarLogMensajes()`, `persistirManifiestoTareas()`, `escribirFilasPorLote()`, `marcarTareasEscritas()`, `aplicarResultadoGmail()`, `finalizarMensaje()`, `finalizarMensajeSinTareas()`, `recuperarProcesamientosAbandonados()` y `reanudarDesdeManifiesto()`. Con los cambios anteriores, **ninguno es alcanzable cuando `cfg.dryRun === true`**: el único camino de entrada a `procesarUnMensaje()` corta hacia `procesarUnMensajeSimulado()` antes de la primera llamada de persistencia; `recuperarProcesamientosAbandonados()` (que es la otra vía posible hacia esas mismas funciones, a través de `reanudarDesdeManifiesto()`) queda deshabilitada en el único punto donde se invoca; y `gestionarErrorMensaje()` corta antes de escribir si la excepción ocurrió en modo simulado.
**Verificación pendiente (no puede confirmarla Claude Cowork sin acceso a Google Workspace):** reejecutar CP-01 con `DRY_RUN=true` y confirmar en la planilla de prueba real que no aparece ninguna fila nueva en `Registro Tareas`, `Log Mensajes` ni `Indice Idempotencia`, y que el mismo mensaje se puede procesar después con `DRY_RUN=false`. Ver procedimiento de regresión abajo.
**Verificación (21/07/2026, CP-01 Aprobado):** primera pasada de CP-01 con `DRY_RUN=true` (17:55) confirmó, según lo informado por Carlos Rubén Bageta, ausencia total de escrituras (ninguna de las cuatro hojas controladas cambió) y un log explícito de "Sin escrituras en hojas de negocio, hojas técnicas ni Gmail". El mismo mensaje se procesó después con `DRY_RUN=false` (18:03) sin impedimento. Ver `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-01".
**Estado:** Corrección aplicada y verificada — CP-01 Aprobado (21/07/2026)

## INC-FASE8-003 — CP-01 clasificado como Soporte en lugar de Desarrollo IT

**Caso de prueba relacionado:** CP-01 — Una observación, una tarea
**Fecha y hora:** 20/07/2026 19:23 (misma ejecución que INC-FASE8-002)
**Entorno:** Prueba aislada
**Severidad:** Media (no es un defecto de código; afecta la calidad de clasificación)
**Descripción:** El correo sintético de CP-01 ("El servidor de facturación está caído desde esta mañana, por favor revisen apenas puedan") se clasificó con `tablero: Soporte` en lugar del `Desarrollo IT` anotado como resultado esperado en `pruebas/CASOS_DE_PRUEBA.md`.
**Resultado esperado:** Desarrollo IT, prioridad Crítico o Alto.
**Resultado observado:** Soporte, prioridad Crítico (la prioridad sí está dentro del rango esperado; solo el tablero difiere).
**Impacto:** Si la ambigüedad Soporte/Desarrollo IT es sistemática (no un caso aislado), las tareas de tipo "incidente técnico reportado" podrían enrutarse de forma inconsistente entre ambos tableros.
**Causa raíz confirmada (auditoría de Claude Cowork, 20/07/2026):** revisé `codigo/prompts_ia.gs` (`construirPromptSistema()`), `documentacion/PROMPT_OPERATIVO.md`, `documentacion/ESQUEMA_JSON.md`, `documentacion/REGLAS_FUNCIONALES.md` y el plan v3 completo. **Ningún documento del proyecto define qué distingue `Soporte` de `Desarrollo IT` como destino de una tarea.** El prompt de sistema (`construirPromptSistema()`) solo enumera los 5 valores permitidos de `tablero` sin ningún criterio de desambiguación; el plan v3 los lista igual, sin más contexto. La clasificación "Soporte" para un correo que reporta una caída de servidor es una interpretación razonable en ausencia de una regla documentada (podría leerse como "incidente reportado por/para un cliente" tanto como "trabajo técnico de ingeniería"). **Esto no es un defecto de código ni de la IA: es un vacío de especificación funcional.** El valor "Desarrollo IT" anotado como resultado esperado en `CASOS_DE_PRUEBA.md` fue una suposición de Claude Cowork al redactar ese caso en la Fase 8, sin estar anclada a ninguna regla de negocio documentada y confirmada.
**Acción inmediata:** Ninguna — no se trata de un fallo del sistema que requiera contención.
**Decisión de negocio aprobada (Carlos Rubén Bageta, 20/07/2026):**
```text
Soporte: consultas de uso, ayuda funcional, configuración, acceso,
acompañamiento al usuario y atención operativa.

Desarrollo IT: bugs, servidores, infraestructura, bases de datos, APIs,
integraciones, despliegues, rendimiento, seguridad y correcciones técnicas.

Un servidor caído corresponde a Desarrollo IT, aunque sea reportado por un
cliente. Si además se solicita informar al cliente, puede generarse una
tarea separada para Soporte o Comercial.
```
**Corrección aplicada:**
- `codigo/prompts_ia.gs`, `construirPromptSistema()`: nueva sección `=== CRITERIO PARA DISTINGUIR "Soporte" DE "Desarrollo IT" (RF-13) ===` con la regla completa.
- `documentacion/PROMPT_OPERATIVO.md`: texto del prompt actualizado (sección 1) y nueva sección 1.1 documentando el origen del cambio (INC-FASE8-003).
- `documentacion/REGLAS_FUNCIONALES.md`: nueva regla RF-13 con el criterio aprobado.
- `pruebas/CASOS_DE_PRUEBA.md`, CP-01: "Resultado esperado" ahora confirma `Desarrollo IT` como regla de negocio (no como suposición de Claude Cowork), estado marcado `Bloqueado — en análisis` hasta reejecutar.
**Verificación pendiente (no puede confirmarla Claude Cowork sin acceso a OpenAI/Google Workspace):** reejecutar CP-01 con el prompt actualizado y confirmar que la clasificación resultante es `Desarrollo IT`. Un cambio de prompt solo se confirma ejecutándolo contra el modelo real.
**Verificación (21/07/2026, CP-01 Aprobado):** ejecución formal de CP-01 con `DRY_RUN=false` (18:03) clasificó el correo del servidor caído como `Desarrollo IT`, prioridad `Crítico`, confirmado por Carlos Rubén Bageta en la fila escrita. Ver `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-01".
**Estado:** Corrección aplicada y verificada — CP-01 Aprobado (21/07/2026)

## INC-FASE8-004 — aplicarResultadoGmail llamó a Gmail sin modificaciones

**Caso de prueba relacionado:** Regresión de CP-01 con `DRY_RUN=false`
**Fecha y hora:** 20/07/2026 21:14
**Entorno:** Prueba aislada
**Severidad:** Alta
**Descripción:** Con `PERMITIR_ETIQUETADO=false` y `PERMITIR_ARCHIVADO=false`, `aplicarResultadoGmail()` llamó igualmente a `Gmail.Users.Messages.modify()` con listas vacías.
**Resultado esperado:** Cuando ambas operaciones están deshabilitadas, la función debe omitir completamente la llamada a Gmail y continuar el cierre normal del mensaje.
**Resultado observado:** Gmail devolvió: `No label or Classification Label updates provided`.
**Evidencia adicional (aportada por Carlos Rubén Bageta):** en la regresión de CP-01 con `MODO_PRUEBA=true, DRY_RUN=false, PERMITIR_ETIQUETADO=false, PERMITIR_ARCHIVADO=false`, fueron elegibles dos mensajes (`19f81f96fcd09cae`, `19f819a446a30718`); ambos fallaron en `Gmail.Users.Messages.modify()` con el mismo error. Una segunda ejecución informó cero mensajes elegibles (ver INC-FASE8-005).
**Impacto:** El procesamiento falla después de escribir las tareas, aunque la omisión de etiquetado y archivado era una configuración válida y deliberada del entorno de prueba.
**Causa raíz confirmada (auditoría de Claude Cowork, 20/07/2026):** `aplicarResultadoGmail()` (`codigo/script_refactorizado.gs`, líneas 746-768):
  1. **Línea 747-750:** exige `idEtiqueta` incondicionalmente (`if (!idEtiqueta) throw ...`), incluso cuando `PERMITIR_ETIQUETADO=false` hace que ese valor nunca se use.
  2. **Líneas 757-762:** con `PERMITIR_ETIQUETADO=false` y `PERMITIR_ARCHIVADO=false`, `recurso` queda como `{ addLabelIds: [], removeLabelIds: [] }` — ambos arreglos vacíos.
  3. **Línea 764:** `Gmail.Users.Messages.modify(recurso, 'me', ...)` se llama **incondicionalmente**, sin comprobar si `recurso` tiene algo que hacer. Gmail API rechaza un `.modify()` sin ninguna operación real con el error exacto observado: *"No label or Classification Label updates provided"*.
  4. Como la excepción se lanza en la línea 764, la función nunca llega a la línea 767 (`actualizarLogMensajes(..., { unidades_gmail_api: 1 }, ...)`) — por eso `unidades_gmail_api` queda en 0, pero por accidente (la excepción interrumpe antes de contarlo), no por diseño.
  5. **Hallazgo adicional:** `Log Mensajes.resultado_gmail` (columna 11) nunca se escribe en ningún punto del código actual — permanece siempre `''` desde `registrarInicioProcesamiento()`. Es un vacío preexistente, no introducido por este bug, pero relevante para la corrección pedida ("registrar OMITIDO_POR_CONFIGURACION").
**Acción inmediata:** Se detuvieron las pruebas y se restauró `DRY_RUN=true`.
**Revisión técnica adicional (Carlos Rubén Bageta, 20/07/2026):** aprobó el diagnóstico con ajustes: leer y validar `PERMITIR_ETIQUETADO`/`PERMITIR_ARCHIVADO` una sola vez en `validarConfiguracion()` (no releer propiedades dentro de `aplicarResultadoGmail()`); exigir el valor exacto `"true"`/`"false"` (no el criterio permisivo `!== 'false'`, que interpretaba cualquier valor no reconocido como `true`); exigir los IDs de etiqueta solo si `permitirEtiquetado === true`; agregar el resultado `ERROR_GMAIL` para cuando la llamada se intenta y falla.
**Corrección aplicada:**
- `codigo/script_refactorizado.gs`, `validarConfiguracion()`: nuevas `cfg.permitirEtiquetado`/`cfg.permitirArchivado`, validación estricta (`=== 'true'`/`=== 'false'`, error si el valor no es exactamente uno de los dos); los 4 `ID_ETIQUETA_*` solo se exigen si `cfg.permitirEtiquetado` es `true`.
- `codigo/script_refactorizado.gs`, `aplicarResultadoGmail()`: reescrita. Si ambos permisos son `false`, no llama a Gmail y registra `resultado_gmail = 'OMITIDO_POR_CONFIGURACION'`, `unidades_gmail_api = 0`. El `recurso` se construye únicamente con las claves habilitadas (sin arreglos vacíos). Registra `SOLO_ETIQUETADO`/`SOLO_ARCHIVADO`/`ETIQUETADO_Y_ARCHIVADO` en una llamada real exitosa, y `ERROR_GMAIL` (con el detalle en `Log Mensajes.error`) si la llamada se intenta y falla, antes de relanzar la excepción para que la maneje `gestionarErrorMensaje()` (ver INC-FASE8-005).
- `documentacion/DISENO_HOJAS_TECNICAS.md`: valores documentados de `resultado_gmail`.
- `configuracion/PARAMETROS_EJEMPLO.md`: marcadas ambas propiedades como obligatorias y estrictas; agregada la tabla de nombres exactos de propiedad para los 4 `ID_ETIQUETA_*` (gap de documentación preexistente, detectado en una auditoría anterior).
- `pruebas/CASOS_DE_PRUEBA.md`: nuevo caso CP-31 (4 combinaciones + casos de configuración inválida).
**Verificación pendiente (no puede confirmarla Claude Cowork sin acceso a Google Workspace):** reejecutar la regresión de CP-01 con `PERMITIR_ETIQUETADO=false`/`PERMITIR_ARCHIVADO=false` y confirmar `resultado_gmail = 'OMITIDO_POR_CONFIGURACION'` sin excepción; ejecutar CP-31 completo.
**Verificación parcial (21/07/2026, CP-01 Aprobado):** ejecución formal de CP-01 con `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false` (18:03) confirmó `resultado_gmail = OMITIDO_POR_CONFIGURACION` y `unidades_gmail_api = 0` sin excepción. Esto verifica el escenario específico de esta incidencia; **CP-31 (las 4 combinaciones completas) permanece pendiente de ejecución**.
**Verificación (21/07/2026, CP-31 — matriz operativa):** las cuatro combinaciones de `PERMITIR_ETIQUETADO`/`PERMITIR_ARCHIVADO` fueron ejecutadas y verificadas por Carlos Rubén Bageta:
- `false`/`false` (verificado previamente vía CP-01 y CP-36): mensaje cerrado `PROCESADO`, Gmail sin cambios, `resultado_gmail = OMITIDO_POR_CONFIGURACION`, `unidades_gmail_api = 0`.
- `true`/`false` (`CP31-E1-20260721`): 1 mensaje procesado, recibió la etiqueta `Procesado`, permaneció en Recibidos, conservó `Pruebas-Automatizacion`, `resultado_gmail = SOLO_ETIQUETADO`, `unidades_gmail_api = 1`, `error` vacío. `ID_ETIQUETA_PROCESADO=Label_1` verificado como `nombre=Procesado`, `tipo=user`. Aplicación de la etiqueta confirmada objetivamente vía `label:Procesado subject:CP31-E1-20260721`.
- `false`/`true` (`CP31-E2-20260721`): 1 mensaje procesado, salió de Recibidos, conservó `Pruebas-Automatizacion`, no recibió `Procesado`, `resultado_gmail = SOLO_ARCHIVADO`, `unidades_gmail_api = 1`, `error` vacío. (Una ejecución previa con cero mensajes elegibles, por un `GMAIL_QUERY_PRUEBA` con el marcador incorrecto `CP31-E1-20260721` aún configurado, no produjo escrituras y no constituye una incidencia de código.)
- `true`/`true` (`CP31-E3-20260721`): 1 mensaje procesado, recibió `Procesado`, salió de Recibidos, conservó `Pruebas-Automatizacion`, `resultado_gmail = ETIQUETADO_Y_ARCHIVADO`, `unidades_gmail_api = 1`, `error` vacío.

En las tres ejecuciones específicas de CP-31 (E1, E2, E3), Carlos Rubén Bageta confirmó también las filas correctas en las hojas de negocio, `Registro Tareas`, `Log Mensajes` e `Indice Idempotencia`.

**Verificación de los escenarios de configuración inválida (21/07/2026, CP-31 completo):**
- `PERMITIR_ETIQUETADO` ausente → rechazado con error explícito.
- `PERMITIR_ETIQUETADO=si` → rechazado por no ser exactamente `"true"` o `"false"`.
- `PERMITIR_ARCHIVADO` ausente → rechazado con error explícito.
- `PERMITIR_ARCHIVADO=si` → rechazado por no ser exactamente `"true"` o `"false"`.
- `PERMITIR_ETIQUETADO=true` con `ID_ETIQUETA_PROCESADO` ausente → rechazado con `Falta el ID interno de etiqueta para: Procesado`.
- `PERMITIR_ETIQUETADO=false` con los cuatro `ID_ETIQUETA_*` ausentes → configuración válida, confirmando que esos IDs no se exigen cuando no se etiquetará.
- Restaurados los cuatro IDs originales; la validación final volvió a ser correcta con `MODO_PRUEBA=true`, `DRY_RUN=true`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`.

**Alcance de esta verificación:** confirma que `aplicarResultadoGmail()` y la validación estricta de `validarConfiguracion()` (ambas correcciones de esta incidencia) se comportan correctamente en las cuatro combinaciones operativas y en los escenarios de configuración inválida. CP-31 queda completo.
**Estado:** Corrección aplicada y verificada — CP-31 Aprobado (21/07/2026)

## INC-FASE8-005 — Falla Gmail posterior a escritura cerró el mensaje como definitivo

**Caso de prueba relacionado:** Regresión de CP-01; relacionado también con CP-12 y CP-25.
**Fecha y hora:** 20/07/2026 21:14
**Entorno:** Prueba aislada
**Severidad:** Alta
**Descripción:** Después de la escritura de las tareas, la llamada a Gmail produjo una excepción (INC-FASE8-004). `gestionarErrorMensaje()` clasificó el error como `ERROR_DEFINITIVO` y escribió el mensaje en `Indice Idempotencia`.
**Resultado esperado:** Una falla posterior a la escritura debe conservar el manifiesto y quedar en estado recuperable, sin repetir OpenAI ni volver a escribir las tareas. El mensaje no debe quedar terminalmente excluido antes de completar o declarar omitida la operación Gmail.
**Resultado observado:** La ejecución siguiente informó cero mensajes elegibles porque ambos `message_id` quedaron presentes en `Indice Idempotencia`.
**Impacto:** El sistema puede dar por cerrado un mensaje cuya actualización de Gmail no terminó, y puede crear inconsistencias entre las tareas escritas, el estado técnico y el resultado Gmail.
**Causa raíz confirmada (auditoría de Claude Cowork, 20/07/2026):** rastreé la propagación completa de la excepción de INC-FASE8-004:
  1. `aplicarResultadoGmail()` lanza la excepción (línea 764) desde `procesarUnMensaje()` (paso 9-10, después de que `escribirFilasPorLote()`/`marcarTareasEscritas()` YA escribieron las tareas reales en el tablero de negocio y en `Registro Tareas` como `ESCRITA`).
  2. `procesarUnMensaje()` no tiene ningún `try/catch` propio alrededor de `aplicarResultadoGmail()`; la excepción sale de la función sin que nada distinga "falló antes de escribir" de "falló después de escribir".
  3. El único `try/catch` que la intercepta es el de `procesarCorreosDeTareas()` (bucle por mensaje), que llama a `gestionarErrorMensaje(mensajeDescriptor, errorMensaje, cfg)`.
  4. `gestionarErrorMensaje()` (`codigo/script_refactorizado.gs`) clasifica el error con la expresión regular `/timeout|timed out|rate limit|50[0-9]/i` — el texto "No label or Classification Label updates provided" no matchea, por lo que `estado = ESTADOS.ERROR_DEFINITIVO`.
  5. Con `estado === ERROR_DEFINITIVO`, la función llama a `finalizarMensaje(mensajeDescriptor, ESTADOS.ERROR_DEFINITIVO, [], cfg)` — **con un arreglo de tareas vacío hardcodeado**, sin consultar si en realidad existen tareas ya `ESCRITA` en `Registro Tareas` para ese mensaje. `gestionarErrorMensaje()` no tiene ninguna noción de "esto pasó después de escribir"; no distingue por etapa ni por estado del manifiesto.
  6. `finalizarMensaje()`, al recibir `tareas.length === 0`, escribe una única fila en `Indice Idempotencia`: `[messageId, '', 'ERROR_DEFINITIVO', fecha]`. Como `obtenerMensajesPendientes()` excluye por la sola presencia del `message_id` en `Indice Idempotencia` (sin mirar `estado_final`), el mensaje queda **excluido permanentemente**, aunque sus tareas reales ya existan en el tablero de negocio.
  7. **Hallazgo estructural adicional:** el mecanismo de recuperación fina ya existente (`reanudarDesdeManifiesto()`, Fase 5) está diseñado exactamente para este escenario, pero **solo se alcanza a través de `recuperarProcesamientosAbandonados()`**, que exige que el mensaje esté `EN_PROCESO` y con `fecha_inicio` más antigua que `UMBRAL_ABANDONO_MIN` (20 min). El camino de excepción inmediata (`gestionarErrorMensaje()`, que se dispara en la MISMA ejecución, sin esperar) cierra el mensaje primero — por lo tanto el mensaje nunca llega a estar `EN_PROCESO` esperando recuperación: ya está `ERROR_DEFINITIVO`/`FINALIZADO` antes de que el mecanismo de abandono pueda actuar.
  8. **El mismo defecto existe en `reanudarDesdeManifiesto()` (`codigo/recuperacion.gs`):** su llamada a `aplicarResultadoGmail()` tampoco está protegida por un `try/catch` propio; si falla durante una recuperación, la excepción sube hasta el `catch` de `recuperarProcesamientosAbandonados()`, que también invoca al mismo `gestionarErrorMensaje()` — es decir, **una recuperación fallida también cerraría el mensaje incorrectamente**.
  9. **Relación con CP-12 y CP-25 (revisado a pedido explícito):** ambos casos ya en `pruebas/CASOS_DE_PRUEBA.md` describían exactamente este escenario ("falla Gmail después de escribir → recuperación fina, solo se reintenta Gmail") pero **asumían implícitamente que la recuperación ocurriría vía `recuperarProcesamientosAbandonados()` tras esperar `UMBRAL_ABANDONO_MIN`**, sin contemplar que `gestionarErrorMensaje()` intercepta y cierra el mensaje de inmediato, en la misma ejecución, antes de que el mensaje llegue a calificar como "abandonado". **Esto significa que CP-12 y CP-25, tal como estaban redactados, no podrían haber pasado ni siquiera antes de esta corrección de DRY_RUN** — es un defecto latente desde la Fase 3 (creación de `gestionarErrorMensaje()`) que la Fase 5 (diseño de la recuperación) no llegó a reconciliar. Recién se manifestó al ejecutar de verdad en la Fase 8.
**Acción inmediata:** Se detuvieron las pruebas y no se eliminaron los registros para preservar la evidencia.
**Revisión técnica adicional (Carlos Rubén Bageta, 20/07/2026):** aprobó el diagnóstico, pero corrigió la estrategia de implementación propuesta por Claude Cowork en tres puntos:
1. **Precisión conceptual:** un manifiesto persistido no implica necesariamente que la escritura ya ocurrió — el manifiesto se persiste en `MANIFIESTO_PERSISTIDO`, antes de `TAREAS_RESERVADAS`/`ESCRITURA_INICIADA`/`ESCRITURA_COMPLETADA`. Puede existir un manifiesto con tareas todavía `RESERVADA`. Corrección aceptada: "si existe manifiesto, el procesamiento alcanzó al menos la reserva persistente de tareas y debe continuar desde ahí, sin repetir la IA" (no "la escritura ya ocurrió").
2. **No mezclar responsabilidades:** `gestionarErrorMensaje()` no debe llamar directamente a `reanudarDesdeManifiesto()` — eso mezcla "registrar y clasificar errores" con "ejecutar de nuevo el pipeline transaccional", y como `recuperarProcesamientosAbandonados()` también invoca a `gestionarErrorMensaje()` cuando falla una recuperación, se arma una cadena recuperación → error → recuperación difícil de acotar.
3. **`obtenerMensajesPendientes()` no comprueba el manifiesto:** marcar `ERROR_TEMPORAL` sin escribir `Indice Idempotencia` no alcanza por sí solo — el mensaje volvería a entrar por `procesarUnMensaje()` en la ejecución siguiente y repetiría la extracción, el filtro y la llamada a la IA desde cero, violando "no volver a consultar la IA" (CP-12/CP-25/CP-26).

**Diseño final aprobado:** la decisión de reanudar se mueve a la **entrada** de `procesarUnMensaje()` (no al manejador de errores):
- `procesarUnMensaje()` comprueba `obtenerManifiestoPersistido()` antes de `registrarInicioProcesamiento()`; si existe, llama a `reanudarDesdeManifiesto()` y retorna — sin volver a consultar la IA, sin generar un manifiesto nuevo.
- `gestionarErrorMensaje()` solo detecta si existe manifiesto y, si es así, registra `ERROR_TEMPORAL` **preservando la etapa alcanzada** (no la reinicia) y retorna, sin llamar a `finalizarMensaje()` ni a `reanudarDesdeManifiesto()` — la reanudación real queda para la próxima vez que `procesarUnMensaje()` reciba ese mensaje.
- `reanudarDesdeManifiesto()` no atrapa sus propias excepciones ni vuelve a llamar a `gestionarErrorMensaje()`; las deja propagar al único `catch` externo (`procesarCorreosDeTareas()` o `recuperarProcesamientosAbandonados()`, según quién la haya invocado), que la maneja una sola vez.
- `recuperarProcesamientosAbandonados()` se mantiene sin cambios, como mecanismo complementario para interrupciones reales (caída de runtime) donde nada llegó a capturar la excepción.

**Corrección aplicada:**
- `codigo/script_refactorizado.gs`, `procesarUnMensaje()`: comprobación de manifiesto al inicio (antes de `registrarInicioProcesamiento()`), delega a `reanudarDesdeManifiesto()` si corresponde.
- `codigo/script_refactorizado.gs`, `gestionarErrorMensaje()`: comprobación de manifiesto (con su propio `try/catch` para no fallar si la comprobación misma falla); si existe, `ERROR_TEMPORAL` sin tocar `etapa`, sin `finalizarMensaje()`, sin `Indice Idempotencia`, retorna.
- `codigo/recuperacion.gs`: sin cambios de código (ya no llamaba a `reanudarDesdeManifiesto()` desde dentro de sí misma de forma recursiva; el comentario existente ya explicaba por qué no necesita un guard propio).
- `documentacion/RECUPERACION_INTERRUPCIONES.md`: nueva sección 8 documentando las dos vías de recuperación (por abandono y por entrada de `procesarUnMensaje()`) y el riesgo residual de `finalizarMensaje()` (ver abajo).
- `pruebas/CASOS_DE_PRUEBA.md`: CP-12 dividido en variante A (camino nuevo) y variante B (camino original); CP-25 anotado como el caso que reprodujo la incidencia real; nuevos CP-32 (recuperación con `ESCRITA`), CP-33 (recuperación con `RESERVADA`, cubre también CP-26), CP-34 (nueva falla durante la recuperación, sin recursión), CP-35 (verificación del riesgo residual de duplicados).

**Riesgo residual (registrado, no resuelto en esta corrección):** `finalizarMensaje()` no verifica si ya existe una fila `message_id`+`task_id` en `Indice Idempotencia` antes de insertar. Con el diseño actual (`LockService` + orden secuencial + chequeo de manifiesto en la entrada de `procesarUnMensaje()`) una duplicación es muy improbable, pero no está estructuralmente descartada. No se considera urgente; queda documentado en `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 8, y verificado (sin corregir) por CP-35.
**Verificación pendiente (no puede confirmarla Claude Cowork sin acceso a Google Workspace):** ejecutar CP-12 (ambas variantes), CP-25, CP-32, CP-33, CP-34 y CP-35 en el proyecto de prueba.
**Estado:** Corrección aplicada — verificación pendiente de Carlos Rubén Bageta

---

## INC-FASE8-006 — Regresión en recuperacion.gs: construirEnlaceCorreo() sin cfg + sort() declarado pero no implementado

**Detectada por:** revisión estática de Codex (21/07/2026, posterior a la aplicación del Lote 1)
**Caso de prueba relacionado:** CP-32, CP-33, CP-34 (cualquier ejecución que active `reanudarDesdeManifiesto()`).
**Entorno:** Cualquier entorno donde se active la recuperación; el error ocurre en tiempo de ejecución, no en validación.
**Severidad:** Alta — bloqueante para toda ruta de recuperación.

### Hallazgo 1 — Regresión bloqueante: `obtenerMetadatosMensaje()` / `construirEnlaceCorreo()` sin `cfg`

**Descripción:** El Lote 1 (H-09) cambió la firma de `construirEnlaceCorreo(mensaje)` a `construirEnlaceCorreo(mensaje, cfg)`. Sin embargo, `codigo/recuperacion.gs` no fue actualizado en ese lote:

- Línea 126: `var datosCorreo = obtenerMetadatosMensaje(mensajeGmail);` — invoca sin `cfg`.
- Línea 163: `function obtenerMetadatosMensaje(mensajeGmail)` — no declara `cfg`.
- Línea 168: `link: construirEnlaceCorreo(mensajeGmail)` — invoca sin `cfg`.

Consecuencia: toda ejecución que pase por `reanudarDesdeManifiesto()` (activada por `recuperarProcesamientosAbandonados()` o desde la entrada de `procesarUnMensaje()` ante un manifiesto existente) falla con un error de JavaScript al intentar leer `cfg.cuentaOperativa` sobre `undefined`.

**Causa raíz:** El Lote 1 actualizó `extraerDatosCorreo()` (en `script_refactorizado.gs`) para propagar `cfg` a `construirEnlaceCorreo()`, pero no auditó si existían otros llamadores de `construirEnlaceCorreo()` en archivos distintos. `recuperacion.gs` tiene su propio wrapper `obtenerMetadatosMensaje()` que llama a `construirEnlaceCorreo()` directamente.

**Corrección aplicada (21/07/2026):**
- `var datosCorreo = obtenerMetadatosMensaje(mensajeGmail, cfg);` (línea 126)
- `function obtenerMetadatosMensaje(mensajeGmail, cfg) {` (línea 163)
- `link: construirEnlaceCorreo(mensajeGmail, cfg)` (línea 168)

### Hallazgo 2 — Inconsistencia: `sort()` declarado en CHANGELOG pero no implementado en código

**Descripción:** La entrada del Lote 1 en `auditoria/CHANGELOG.md` afirma: "ordena por fecha ascendente y `message_id` ascendente". El código de `obtenerMensajesPendientesDesdeGmail()` no contenía ningún `sort()`. El orden real de los mensajes retornados dependía del orden de paginación de la Gmail API, no de una ordenación explícita.

**Consecuencia:** no es una regresión de comportamiento (el orden nunca estuvo garantizado antes del Lote 1), pero el CHANGELOG es incorrecto y puede inducir a asumir un invariante que no existe.

**Corrección aplicada (21/07/2026):**
- `pendientes.sort()` implementado en `obtenerMensajesPendientesDesdeGmail()` antes del `return`, usando `a.mensaje.getDate().getTime()` (fecha ascendente) y `a.messageId` / `b.messageId` (ascendente como desempate).
- CHANGELOG corregido: se distingue entre lo que se declaró (y no estaba) y lo que se aplica ahora.

**Verificación pendiente:** ejecutar CP-36 con dos mensajes de distinta fecha en la bandeja de prueba y confirmar que `Log Mensajes` los muestra en orden de fecha de mensaje, no de orden de llegada a la paginación.

**Estado:** Corrección aplicada — verificación pendiente de Carlos Rubén Bageta

---

## INC-FASE8-007 — Selector de entorno (cfg.modoPrueba) ejecuta lógica de producción cuando MODO_PRUEBA es inválido

**Detectada por:** Carlos Rubén Bageta, durante la preparación de CP-37 (21/07/2026).
**Caso de prueba relacionado:** CP-37 (escenario INC-FASE8-007).
**Entorno:** Cualquier configuración con `MODO_PRUEBA` ausente o con valor distinto de `"true"`/`"false"`.
**Severidad:** Alta (fail-safe incompleto). En el flujo actual, `SpreadsheetApp.openById()` no llega a ejecutarse porque el check `errores.length > 0` (línea 262) retorna antes de línea 269. Sin embargo, el código recorre la rama de producción con `cfg.modoPrueba === null` como selector: un cambio futuro mínimo podría activar acceso real al ID productivo.

**Descripción técnica:** `validarConfiguracion()` llama a `leerBooleanoEstricto('MODO_PRUEBA', errores)` (línea 195), que devuelve `null` si el valor es inválido y empuja un error a `errores`. A continuación, `null` es falsy:

- `if (cfg.modoPrueba)` (línea 199) → rama `else` → `cfg.gmailQueryEfectiva = 'in:inbox'` (comportamiento de producción, no de prueba) sin validar `GMAIL_QUERY_PRUEBA`/`ETIQUETA_PRUEBA`.
- `cfg.spreadsheetIdEfectivo = cfg.modoPrueba ? cfg.spreadsheetIdPrueba : cfg.spreadsheetId` (línea 227) → selecciona el ID de la planilla **productiva**.

El check `if (errores.length > 0)` en línea 262 detiene la ejecución antes de `SpreadsheetApp.openById()` (línea 269), pero el recorrido de código con selector inválido ya ha ocurrido.

**Causa raíz:** el patrón de acumulación de errores al final de la función es correcto para propiedades independientes. No lo es para `MODO_PRUEBA`, que es un selector de entorno — su valor determina qué código se ejecuta a continuación, no solo si hay un error al final.

**Corrección (21/07/2026):** barrera temprana inmediatamente después de leer `cfg.modoPrueba` y `cfg.dryRun` (antes de cualquier `if (cfg.modoPrueba)` o asignación de `spreadsheetIdEfectivo`):

```javascript
if (cfg.modoPrueba === null) {
  Logger.log(
    'validarConfiguracion(): configuración inválida:\n' +
    errores.join('\n')
  );
  return { valido: false, errores: errores, cfg: null };
}
```

La barrera comprueba solo `cfg.modoPrueba === null` (el selector de entorno), no `cfg.dryRun`, que es un modificador de comportamiento sin incidencia en la selección de planilla. Los errores acumulados hasta ese punto (propiedades anteriores como `OPENAI_API_KEY`, `SPREADSHEET_ID`, etc.) se incluyen en el retorno.

**Estado:** Corrección verificada — CP-37 Aprobado (21/07/2026). Evidencia: `pruebas/evidencias/CP-27/05.png` a `10.png`.

---

## INC-FASE8-008 — El contenido citado de una respuesta genera tareas duplicadas

**Detectada por:** Carlos Rubén Bageta, durante la ejecución de CP-19 (21/07/2026).
**Caso de prueba afectado:** CP-19 — Respuesta nueva en hilo ya procesado.
**Caso relacionado, potencialmente afectado por la misma causa:** CP-21 — Respuesta que cita un correo ya procesado.
**Severidad:** Alta. La IA recibe y transcribe contenido histórico ya procesado como si fuera una observación nueva, generando una tarea duplicada por cada ejecución de este tipo.

**Contexto real:** se reutilizó el hilo previamente procesado en CP-28 (`thread_id 19f875267239b349`), con dos mensajes anteriores ya cerrados:
- `message_id 19f875267239b349`: "¿Podrían revisar la cláusula 4 del contrato antes del jueves?"
- `message_id 19f87541d8034391`: "Además, necesitamos una copia firmada para el lunes."

Respuesta nueva de CP-19 (`message_id 19f876c74f7f71ae`), con contenido nuevo real: "Además, avisen al cliente que el contrato actualizado ya está disponible y envíenle una copia hoy."

**Resultado de descubrimiento (correcto, no forma parte de esta incidencia):**
- `procesarCorreosDeTareas()` informó "1 mensajes elegibles, procesando 1".
- Los dos `message_id` anteriores no fueron redescubiertos.
- Confirma que `obtenerMensajesPendientesDesdeGmail()` y el control por `message_id` funcionan correctamente — el fallo no está en el descubrimiento.

**Resultado DRY_RUN:** 1 mensaje elegible; el log `[DRY_RUN]` informó **3 observaciones y 3 tareas simuladas** — ya una señal de que se estaba analizando más contenido del que corresponde a un mensaje con una sola línea de texto nuevo.

**Resultado formal — `Log Mensajes` para `19f876c74f7f71ae`:**
- `estado = PROCESADO`, `etapa = FINALIZADO`.
- `cantidad_observaciones = 2`, `cantidad_tareas = 2`.
- `resultado_gmail = ETIQUETADO_Y_ARCHIVADO`, `intentos = 1`, `codigo_http = 200`.

**`Indice Idempotencia`:** `ALI-E7FF66FDAE16DEA1-001` y `ALI-E7FF66FDAE16DEA1-002`, ambos `PROCESADO`.

**`Registro Tareas`:**
- P13 / `observacion_texto_original`: "Además, avisen al cliente que el contrato actualizado ya está disponible y envíenle una copia hoy." — contenido nuevo, correcto.
- P14 / `observacion_texto_original`: "Además, necesitamos una copia firmada para el lunes." — **reproducción literal del mensaje anterior citado** (`message_id 19f87541d8034391`), ya procesado y cerrado en `Indice Idempotencia` desde CP-28.

**Diagnóstico:** el fallo no pertenece al descubrimiento por hilo/`message_id` (eso funciona). El fallo está en `extraerContenidoNuevo()` (`codigo/script_refactorizado.gs`), que no logró recortar el historial citado del cuerpo del mensaje antes de enviarlo a la IA — el texto citado llegó completo y la IA lo interpretó como una segunda observación real.

**Causa raíz — revisada y corregida el 22/07/2026:** la versión original de esta sección (21/07/2026) atribuía el fallo a que `^`/`$` en modo multilínea de JavaScript no reconocían `\r`, afirmando que el patrón `/^El .* escribió:$/m` fallaba "sistemáticamente" con cuerpos CRLF de Gmail. **Esa afirmación es técnicamente incorrecta:** se verificó empíricamente en Node/V8 que `^`/`$` en modo multilínea sí reconocen `\r` como terminador de línea, y que el patrón original efectivamente coincide con un encabezado de cita CRLF simple (`/^El .* escribió:$/m.test('El mar, 21 jul 2026, Juan escribió:\r\n> anterior')` → `true`). Ver `auditoria/CHANGELOG.md`, entrada "Revisión correctiva de INC-FASE8-008" (22/07/2026), para el detalle completo de la revisión.

**Lo que la evidencia real demuestra, sin ambigüedad:**
1. El historial citado sobrevivió al filtro `extraerContenidoNuevo()` en la ejecución real de CP-19 (`message_id 19f876c74f7f71ae`).
2. No se capturó el cuerpo crudo completo del mensaje real, por política de seguridad del proyecto (no se registran cuerpos de correo ni datos sensibles) — la variante exacta de formato que produjo el fallo **no quedó registrada**.
3. No puede afirmarse que el CRLF fue la causa demostrada del fallo.

**Causa razonable (no una causa aislada y demostrada como lo era la hipótesis de CRLF):** los marcadores de corte anteriores eran insuficientemente robustos frente a variantes reales de Gmail no cubiertas explícitamente:
- El patrón usaba `.` (que no cruza saltos de línea), por lo que no reconocería un encabezado de fecha/remitente partido en más de una línea (nombre o dirección largos).
- No toleraba espacios/tabs iniciales antes de "El"/"On" (por ejemplo, un encabezado con sangría).
- No existía ningún marcador que cortara por la sola presencia de una línea citada (prefijo `>`), independiente de si el encabezado "escribió:"/"wrote:" fue reconocido o no.

**Impacto:** cualquier respuesta a un hilo con historial citado puede generar tareas duplicadas — una por cada observación real del historial que la IA logre extraer del texto citado, además de duplicar el consumo de la API de OpenAI. Afecta directamente al criterio de aceptación de CP-19 y, potencialmente, a CP-21 (mismo mecanismo, encabezado en español citado con prefijo `>`).

**Corrección aplicada (revisada 22/07/2026):** ver detalle en `auditoria/CHANGELOG.md`. Resumen: `extraerContenidoNuevo()` normaliza sus propios saltos de línea (CRLF/CR → LF) y espacios finales de línea antes de buscar los marcadores de corte — como endurecimiento preventivo, no como corrección de una causa CRLF demostrada. Los encabezados en español e inglés ahora toleran espacios/tabs iniciales y un encabezado partido en, como máximo, una línea adicional (nunca una cantidad arbitraria de líneas, para no consumir párrafos legítimos). Se mantiene el marcador de seguridad independiente para cualquier línea que comience con `>` (con o sin espacios/tabs iniciales). Sin depender del nombre, dirección o fecha concretos, y sin afectar texto legítimo que use la palabra "escribió" sin dos puntos al final de línea.

**Pruebas determinísticas agregadas y ampliadas (22/07/2026, ajustadas de nuevo el 22/07/2026):** archivo `pruebas/pruebas_extraer_contenido_nuevo.gs`, con 18 casos funcionales de comparación exacta (`resultado === esperadoExacto`) sobre `extraerContenidoNuevo()` — variante en español, variante con prefijo `>` en el encabezado, variante CRLF, variante en inglés, texto legítimo con la palabra "escribió", regresión exacta de CP-19, encabezado partido en dos líneas con remitente y verbo juntos (español e inglés), espacios iniciales antes de "El"/"On", espacios finales tras "escribió:", línea citada con espacios antes de ">", texto legítimo multilínea que empieza con "El " pero no es un encabezado (prueba explícita de que no se atraviesan líneas arbitrarias), texto legítimo con "2 > 1" en mitad de línea, encabezado partido en dos líneas con el verbo **solo** al inicio de la segunda línea (español e inglés — el ajuste de esta revisión), y dos casos negativos que confirman que una concatenación sin separador ("Juanescribió:"/"Janewrote:") no se reconoce como encabezado. Más 1 verificación adicional, documentada en código, de que el patrón original sí coincidía con un encabezado CRLF simple (prevención de que se reintroduzca el diagnóstico incorrecto). Total: 19/19 verificaciones `PASA`. Ejecutadas localmente antes de copiar el cambio al proyecto de Apps Script — ver `auditoria/CHANGELOG.md` para el detalle.

**No modificado:** el descubrimiento de mensajes, el control de idempotencia, la recuperación desde manifiesto, el prompt de la IA y la lógica de Gmail/Sheets. La corrección queda limitada al filtrado determinístico del cuerpo, en `extraerContenidoNuevo()`.

**Evidencia real de Sheets:** no se modificó ni se eliminó ninguna fila real. Las filas P13/P14 de `Registro Tareas`, el `Log Mensajes` de `19f876c74f7f71ae` y las entradas `ALI-E7FF66FDAE16DEA1-001`/`002` de `Indice Idempotencia` permanecen como evidencia de la incidencia. El `message_id 19f876c74f7f71ae` ya está registrado en `Indice Idempotencia` y **no puede reutilizarse** para una regresión — ver procedimiento de regresión en `pruebas/CASOS_DE_PRUEBA.md`, CP-19.

### Regresión aprobada (22/07/2026)

Ejecutada en un hilo sintético nuevo y aislado, con la versión corregida de `codigo/script_refactorizado.gs` (correcciones del 21/07/2026 y los dos ajustes del 22/07/2026) ya copiada al proyecto de prueba. Consulta: `in:inbox label:Pruebas-Automatizacion subject:CP19-REG-20260722-01`.

- Primer mensaje del hilo ("Obtenga una copia firmada del contrato para el lunes.") ya procesado previamente, registrado en `Indice Idempotencia`, etiquetado `Procesado` y archivado.
- Respuesta nueva (`message_id 19f87e72c61fcf01`): "Avise hoy al cliente que el contrato actualizado ya está disponible."
- `DRY_RUN=true`: 1 mensaje elegible, 1 observación, 1 tarea simulada (`Comercial`/`Alto`), sin escrituras; el mensaje previamente procesado no fue redescubierto.
- Ejecución formal `DRY_RUN=false`, verificada manualmente por Carlos Rubén Bageta: exactamente una fila en `Registro Tareas` para `message_id 19f87e72c61fcf01` (`tablero = Comercial`, `estado_escritura = ESCRITA`); columna J/resumen: "Informar al cliente que el contrato actualizado ya está disponible."; columna P/`observacion_texto_original`: "Avise hoy al cliente que el contrato actualizado ya está disponible."
- **Contenido histórico ausente:** no apareció "Obtenga una copia firmada del contrato para el lunes"; no se creó ninguna tarea basada en el mensaje citado; el mensaje inicial del hilo no recibió filas adicionales.
- También verificado: exactamente una fila nueva en `Comercial`; `Log Mensajes` `PROCESADO`/`FINALIZADO` con una observación y una tarea; `Indice Idempotencia` con exactamente una entrada nueva; la respuesta nueva recibió `Procesado` y fue archivada; sin duplicados ni errores.

**Conclusión de la regresión:** CP-19 PASA. El descubrimiento individual por `message_id` continúa funcionando. `extraerContenidoNuevo()` elimina correctamente el historial citado en la regresión real. Ver detalle completo en `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-19 — Regresión aprobada (22/07/2026)".

**Evidencia de la ejecución fallida original (21/07/2026) — conservada íntegra, no sustituida ni eliminada:** `message_id 19f876c74f7f71ae`, filas P13/P14 de `Registro Tareas`, `Log Mensajes` de ese `message_id`, entradas `ALI-E7FF66FDAE16DEA1-001`/`002` de `Indice Idempotencia` (ver secciones arriba en esta misma incidencia).

**CP-21:** deja de estar bloqueado por INC-FASE8-008; permanece `Pendiente` hasta su propia ejecución independiente.

**Estado:** Corrección aplicada y verificada — CP-19 Aprobado (22/07/2026).

---

## INC-FASE8-009 — Inyección de fórmulas en hojas técnicas (Log Mensajes, Registro Tareas)

**Detectada por:** Carlos Rubén Bageta, durante la ejecución de CP-23 (22/07/2026).
**Caso de prueba afectado:** CP-23 — Texto que comienza como fórmula.
**Severidad:** Alta — vulnerabilidad de inyección de fórmulas confirmada mediante persistencia real en la planilla de prueba, con evidencia real (`#ERROR!` visible en una celda de hoja técnica).

### Evidencia real

**Intento de preparación descartado (no constituye evidencia válida):** `message_id 19f8aa19567a9b82`. El asunto se envió por error sin el signo `=` inicial. Se conserva únicamente como registro del intento de preparación no válido, sin valor probatorio para CP-23.

**Ejecución válida:**
- Asunto exacto en Gmail: `=CONCAT("CP23-20260722-02","-FORMULA")`.
- `message_id 19f8ab1e4b126f56`.
- `DRY_RUN=true`: 1 mensaje elegible, 1 observación, 1 tarea simulada (`Comercial`/`Alto`), sin escrituras.
- Ejecución formal `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`: completada.

**`Log Mensajes`, fila 20, columna asunto (F20):**
- Contenido visible: `#ERROR!`.
- Barra de fórmulas: `=CONCAT("CP23-20260722-02","-FORMULA")`.
- **Esto demuestra que Google Sheets intentó ejecutar la fórmula** — el asunto del correo se escribió sin sanitizar en una hoja técnica.

**`Registro Tareas`, fila 19:**
- `task_id ALI-7576DEA84BEA5CDE-001`, `message_id 19f8ab1e4b126f56`, `tablero Comercial`, `estado_escritura ESCRITA`, `fila_destino 10`.

**`Comercial`, fila 10, columna Asunto original:** muestra literalmente `=CONCAT("CP23-20260722-02","-FORMULA")` — no se evaluó ni produjo `#ERROR!`; **la sanitización de la hoja de negocio funcionó correctamente.**

### Diagnóstico estático (confirmado por revisión de código, antes de tocar nada)

1. **`codigo/script_refactorizado.gs`, `registrarInicioProcesamiento()`:** tanto la rama que reutiliza una fila existente (escribe con `setValues()` en la línea que incluye `mensaje.getFrom()`/`mensaje.getSubject()`) como la rama que crea una fila nueva escriben el remitente y el asunto **directamente**, sin pasar por `sanitizarValoresParaSheets()`. Esta es la causa exacta del `#ERROR!` observado en `Log Mensajes` F20.
2. **`codigo/script_refactorizado.gs`, `actualizarLogMensajes()`:** escribe cualquier campo del objeto `campos` con `setValue()` sin sanitizar. Aunque la evidencia observada es sobre el asunto (escrito en `registrarInicioProcesamiento()`, no aquí), esta función también escribe texto libre (por ejemplo `error`) sin protección — mismo patrón de vulnerabilidad, sin evidencia de explotación observada todavía.
3. **`codigo/idempotencia.gs`, `persistirManifiestoTareas()`:** escribe `tarea.resumen` y `tarea.observacionTextoOriginal` — ambos texto libre generado a partir del contenido del correo — directamente en `Registro Tareas` (manifiesto `RESERVADA`), sin `sanitizarValoresParaSheets()`. `tablero`, `prioridad`, `grupoOrigen` y `responsable` están validados contra catálogos fijos (`esquema_json.gs`) y ninguno de sus valores posibles comienza con `=`, `+`, `-` ni `@` — no requieren sanitización.
4. **`codigo/escritura_sheets.gs`** ya sanitiza remitente, asunto, resumen y `observacionTextoOriginal` antes de escribir en las hojas de **negocio** (`escribirFilasPorLote()`) — confirmado por la evidencia: la fila 10 de `Comercial` conserva el texto literal, sin evaluarlo. Esta protección no debe eliminarse ni degradarse.
5. **Puntos de escritura auditados y confirmados seguros (sin cambios necesarios):** `finalizarMensaje()` → `Indice Idempotencia` (`script_refactorizado.gs`, escribe solo `messageId`/`taskId`/`estadoFinal` enum/fecha — ninguno es texto libre); `recuperacion.gs` (actualización de `estado` a `ERROR_TEMPORAL`, enum); `escritura_sheets.gs`, `marcarTareasEscritas()` (escribe estado enum, número de fila y un hash MD5 ya calculado — ninguno es texto libre nuevo).

### Impacto

Cualquier correo con un asunto (o, potencialmente, cualquier campo de texto libre no sanitizado) que comience con `=`, `+`, `-` o `@` puede ejecutarse como fórmula en `Log Mensajes` o `Registro Tareas`, con riesgo de `#ERROR!` visible (como en esta evidencia) o, en el peor caso, ejecución de funciones de Sheets con efectos secundarios (por ejemplo, funciones que interactúan con servicios externos), dependiendo del contenido exacto de la fórmula inyectada.

### Corrección requerida (registrada antes de aplicar el código)

1. `registrarInicioProcesamiento()`: aplicar `sanitizarValoresParaSheets()` a remitente y asunto en ambas ramas (fila reutilizada y fila nueva).
2. `actualizarLogMensajes()`: sanitizar todo valor de tipo `string` en `campos` antes de `setValue()`, sin alterar `Date`, `number`, `boolean` ni valores vacíos.
3. `persistirManifiestoTareas()`: sanitizar `tarea.resumen` y `tarea.observacionTextoOriginal` antes de construir la fila.
4. Reutilizar `sanitizarValoresParaSheets()` (`codigo/sanitizacion.gs`) en los tres puntos — sin crear una segunda implementación divergente.
5. No modificar el descubrimiento de mensajes, Gmail, la sanitización ya existente en `escritura_sheets.gs`, la idempotencia ni la recuperación.

### Estado documental

- CP-23: `Rechazado — INC-FASE8-009, corrección pendiente de regresión`. Se conserva toda la evidencia, incluido el intento de preparación sin `=`.
- CP-23 solo podrá aprobarse cuando tanto las hojas técnicas como la hoja de negocio almacenen literalmente los valores peligrosos sin ejecutarlos, verificado con un `message_id` nuevo (no se reutiliza `19f8ab1e4b126f56`).

**No modificado ni eliminado:** la celda F20 de `Log Mensajes` con `#ERROR!`, la fila 20 completa, la fila 19 de `Registro Tareas` (con `fila_destino=10`), la fila 10 de `Comercial`, ni el registro del intento de preparación (`19f8aa19567a9b82`) — toda la evidencia real permanece intacta.

### Regresión aprobada (22/07/2026)

Ejecutada en un mensaje nuevo, sin reutilizar el `message_id` vulnerable original (`19f8ab1e4b126f56`), con las versiones corregidas de `codigo/script_refactorizado.gs` e `codigo/idempotencia.gs` ya copiadas al proyecto de prueba.

- Asunto exacto: `=CONCAT("CP23-20260722-03","-FORMULA")`.
- `message_id 19f8afd5236e6cf7`.
- `DRY_RUN=true`: 1 mensaje elegible, 1 observación, 1 tarea simulada (`Comercial`/`Alto`), sin escrituras.
- Ejecución formal `DRY_RUN=false`, ambos permisos de Gmail desactivados: 1 mensaje elegible y procesado, ejecución completada.
- **`Log Mensajes`, fila física 21:** asunto almacenado literalmente como `=CONCAT("CP23-20260722-03","-FORMULA")` — no produjo `#ERROR!` ni ejecutó la fórmula. `estado = PROCESADO`, `etapa = FINALIZADO`, `cantidad_observaciones = 1`, `cantidad_tareas = 1`, `resultado_gmail = OMITIDO_POR_CONFIGURACION`.
- **`Registro Tareas`, fila física 20:** `task_id ALI-6FE9C44A57429639-001`, `message_id 19f8afd5236e6cf7`, `tablero Comercial`, `estado_escritura ESCRITA`, `fila_destino 11`.
- **`Comercial`, fila física 11:** el asunto peligroso se almacenó literalmente y no se ejecutó.

**Conclusión de la regresión:** la regresión real confirmó la protección del asunto peligroso en `Log Mensajes` y `Comercial`. `Registro Tareas` confirmó la creación correcta del manifiesto y su relación con `fila_destino=11`; la protección de sus campos de texto libre, `resumen` y `observacionTextoOriginal`, está cubierta por las 17/17 pruebas deterministas. **PE-01** verificado mediante esta regresión real; **PE-02** respaldado por esas 17/17 pruebas de `pruebas/pruebas_sanitizacion_hojas_tecnicas.gs` (prefijos `=`, `+`, `-`, `@`), junto con la comprobación real en Google Sheets del mecanismo de protección. Ver detalle completo en `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-23 — Regresión aprobada (22/07/2026)".

**Evidencia original vulnerable — conservada íntegra, no sustituida ni eliminada:** `message_id 19f8ab1e4b126f56`, `Log Mensajes` fila 20 con `#ERROR!`, `Registro Tareas` fila física 19 (con `fila_destino=10`), `Comercial` fila física 10 (ver secciones arriba en esta misma incidencia).

**Estado:** Corrección aplicada y verificada — CP-23 Aprobado (22/07/2026).

---

## INC-FASE8-010 — El modelo omite observaciones informativas de un correo mixto en lugar de conservarlas con tareas: []

**Detectada por:** Carlos Rubén Bageta, durante la ejecución de CP-02 (22/07/2026).
**Caso de prueba afectado:** CP-02 — Cinco observaciones, tres tareas.
**Severidad:** Media — no compromete seguridad ni integridad de datos; afecta la completitud del registro de observaciones frente al criterio de aceptación del caso.

### Evidencia real

- `message_id 19f8b6ac1946a47e`.
- `DRY_RUN=true`: 1 mensaje elegible.
- Resultado: `[DRY_RUN] 19f8b6ac1946a47e: 3 observación(es), 3 tarea(s) simulada(s) [Gestión General/Alto, Comercial/Medio, Finanzas/Medio]`.
- Sin escrituras en hojas técnicas, hojas de negocio ni Gmail.

**Correo usado:**
```text
1. El viernes tuvimos un problema con el servidor, ya se resolvió solo (informativo, sin acción).
2. Necesitamos renovar la licencia de Office antes de fin de mes.
3. El cliente ABC pidió una actualización del estado de su factura.
4. Recordatorio: la reunión de directorio fue reprogramada (informativo, sin acción).
5. Hay que preparar el informe de gastos de julio para el socio de administración.
```

**Resultado esperado de CP-02:** 5 observaciones; 3 tareas para los puntos 2, 3 y 5; los puntos 1 y 4 conservados como observaciones con `tareas: []`.
**Resultado observado:** solo 3 observaciones (correspondientes a los puntos 2, 3 y 5). Los puntos 1 y 4 — ambos informativos — fueron omitidos por completo del arreglo `observaciones`, en lugar de aparecer como observaciones con `tareas: []`.

### Diagnóstico

**Causa exacta (revisión de `codigo/prompts_ia.gs`, `codigo/esquema_json.gs` y `validarRespuestaIA()`):**

1. `construirPromptSistema()` (`codigo/prompts_ia.gs`) instruye: "Identificá TODAS las observaciones del correo... Si la observación no pide ninguna acción, su lista de tareas va vacía." Esta regla, leída de forma aislada, sí cubriría el caso — pero inmediatamente después el prompt agrega: "Si el correo completo no tiene ninguna acción pendiente (informativo, ya resuelto, publicidad), devolvé observaciones como arreglo vacío". Esta segunda regla está correctamente condicionada a "el correo completo", pero el prompt **no distingue explícitamente** el caso de un correo **mixto** (algunas ideas informativas, otras accionables) del caso de un correo **totalmente informativo**. Nada en el texto le prohíbe al modelo aplicar la lógica de "esto es informativo → no lo incluyo" observación por observación, en vez de reservar esa lógica exclusivamente para el correo completo.
2. `codigo/esquema_json.gs` (`obtenerEsquemaJsonRespuestaIA()`, `validarRespuestaIA()`): no impone ni podría imponer razonablemente una cantidad mínima de observaciones basada en el conteo de puntos de una lista numerada del cuerpo original — el esquema JSON no tiene forma de conocer cuántos "puntos" tenía el correo de origen; solo valida la estructura y los catálogos de la respuesta ya generada. **No es responsable de esta omisión ni es el lugar correcto para corregirla.**
3. `validarRespuestaIA()`: exige `texto_original` no vacío y `tareas` como arreglo por observación (línea que ya soporta arreglos vacíos), pero no puede detectar que **faltan** observaciones que el modelo debió generar y no generó — esa es información que no existe en la respuesta a validar.

**Conclusión del diagnóstico:** la causa es exclusivamente de instrucción (prompt), no de código de validación ni de esquema. La ambigüedad entre "una observación informativa" y "un correo completo informativo" permitió que el modelo generalizara incorrectamente la segunda regla a nivel de observación individual.

### Corrección requerida (registrada antes de aplicar el cambio)

Modificar `construirPromptSistema()` para establecer expresamente:
1. Si el correo contiene al menos una acción pendiente, deben conservarse TODAS las ideas u observaciones distintas del correo.
2. Los puntos informativos o ya resueltos del mismo correo deben aparecer como observaciones con `tareas: []`.
3. `observaciones: []` solo se usa cuando el correo completo no contiene ninguna acción pendiente en ninguna de sus ideas.
4. En listas numeradas o con viñetas, cada punto conceptualmente distinto debe evaluarse por separado.

Sin cambios en `obtenerEsquemaJsonRespuestaIA()` ni en `validarRespuestaIA()` — no se introduce una validación por cantidad basada en listas numeradas (heurística no confiable y fuera del alcance razonable de una validación estructural).

### Estado documental

- CP-02: `Rechazado — corrección aplicada, regresión real pendiente`. Se conserva íntegra la evidencia de esta ejecución.
- CP-02 solo podrá aprobarse cuando una regresión real, con un `message_id` nuevo, confirme las 5 observaciones esperadas (3 con tareas, 2 con `tareas: []`).

**No modificado ni eliminado:** el registro de la ejecución real (`message_id 19f8b6ac1946a47e`, resultado `[DRY_RUN]` con 3 observaciones/3 tareas) permanece como evidencia de la incidencia.

**Estado (histórico, previo a la primera corrección):** Corrección aplicada en `codigo/prompts_ia.gs` el 22/07/2026 (ver `auditoria/CHANGELOG.md`) — **verificación real posterior detectó que fue insuficiente; ver "Regresión fallida (22/07/2026)" más abajo.**

### Regresión fallida (22/07/2026) — la primera corrección de prompt no cambió el comportamiento observado

**Procedimiento:** se copió al proyecto de Apps Script de prueba la versión de `codigo/prompts_ia.gs` corregida tras el primer diagnóstico (reglas explícitas de correo mixto / arreglo vacío exclusivo / listas numeradas, agregadas el 22/07/2026). Se ejecutó CP-02 con un mensaje nuevo, sin reutilizar el `message_id` anterior.

**Evidencia real:**
- `message_id 19f8b7de84ba9e5b` (nuevo, distinto del anterior `19f8b6ac1946a47e`).
- `DRY_RUN=true`: "1 mensaje elegible, procesando 1".
- Resultado: `[DRY_RUN] 19f8b7de84ba9e5b: 3 observación(es), 3 tarea(s) simulada(s) [Gestión General/Alto, Comercial/Medio, Finanzas/Alto]`.
- Resultado esperado: 5 observaciones, 3 tareas. Los puntos informativos 1 y 4 **volvieron a ser omitidos**, con el mismo patrón exacto que la ejecución anterior (mismos dos puntos, mismo conteo 3/3).
- No hubo escrituras en Gmail ni Sheets. No se ejecutó con `DRY_RUN=false`.

**Conclusión inmediata:** la primera corrección (agregar reglas explícitas de texto al prompt) **no fue suficiente** para cambiar el comportamiento observado. El diagnóstico original ("ambigüedad del prompt entre correo mixto y correo totalmente informativo") describía correctamente una ambigüedad real en el texto anterior, pero no puede sostenerse como la causa **completa y suficiente**, dado que corregir esa ambigüedad textual no alteró el resultado en una ejecución real posterior.

### Revisión del flujo completo (22/07/2026) — más allá de la presencia textual de reglas en el prompt

Se revisó el flujo completo desde `construirPromptSistema()` hasta la respuesta procesada, no solo el texto del prompt:

1. **`codigo/cliente_openai.gs`, `consultarIAExtractora()`:** construye `userContent` como `"Asunto: " + asunto + "\nRemitente: " + remitente + "\nCuerpo (solo contenido nuevo, ya enmascarado):\n" + cuerpo` y arma `payload` con `messages: [{role: 'system', content: systemPrompt}, {role: 'user', content: userContent}]`, `response_format: {type: 'json_schema', json_schema: obtenerEsquemaJsonRespuestaIA()}` y `temperature: 0.2`. `contenidoCrudo` devuelto es `choice.message.content` — el JSON crudo del modelo, sin ninguna transformación.
2. **`codigo/script_refactorizado.gs`, `procesarUnMensajeSimulado()`:** `validarRespuestaIA(respuestaIA)` solo hace `JSON.parse(respuestaIA.contenidoCrudo)` y valida estructura/catálogos — `datos.observaciones` es exactamente el arreglo que devolvió el modelo, sin filtrarlo. El log `[DRY_RUN]` imprime `validacionIA.datos.observaciones.length` directamente.
3. **`generarTareasNormalizadas()`:** itera `datosValidados.observaciones` (el mismo arreglo) para aplanar tareas; nunca elimina ni ignora una observación.
4. **Conclusión verificada por lectura de código (no supuesta):** no existe ningún punto entre la respuesta de la IA y el log `[DRY_RUN]` que pueda descartar observaciones. El conteo de "3 observación(es)" que aparece en ambas ejecuciones reales refleja, con certeza, que el arreglo `observaciones` devuelto por el modelo tenía longitud 3, no 5. La causa está en la generación de la respuesta (el modelo, condicionado por el prompt tal como fue efectivamente recibido en la llamada), no en ningún procesamiento posterior del código.

**Causas candidatas evaluadas, sin atribuir una única causa definitiva sin evidencia:**

- **(a) Verificación de despliegue no confirmada:** no hay evidencia directa de que el proyecto de Apps Script haya usado efectivamente el texto de prompt actualizado en el momento exacto de esta llamada (por ejemplo, un archivo no guardado, guardado en el proyecto incorrecto, o una versión de despliegue distinta a la editada). El código no incluye, hasta ahora, ningún mecanismo para confirmar en el registro qué versión de prompt se usó en una llamada real — ver corrección de diagnóstico más abajo.
- **(b) Reglas de texto insuficientes como mecanismo de control para este modelo en esta tarea:** agregar reglas explícitas en prosa no cambió el resultado en dos ejecuciones independientes con el mismo patrón exacto de omisión (mismos puntos 1 y 4, mismo conteo). Esto es compatible con que el modelo necesite un ejemplo concreto (few-shot) del comportamiento esperado, no solo una regla abstracta, para un patrón de tarea estructural como "cobertura completa de una lista numerada".
- **(c) Variabilidad de muestreo (`temperature=0.2`):** se evalúa y se descarta como explicación principal — la reproducción **idéntica** del mismo patrón de omisión (mismos dos puntos, mismo conteo 3/3) en dos ejecuciones independientes es más compatible con un sesgo sistemático de seguimiento de instrucciones que con ruido aleatorio de muestreo, que tendería a producir variaciones distintas entre ejecuciones. No se modifica `temperature` en esta corrección (ver justificación en `auditoria/CHANGELOG.md`).

**No se puede confirmar ni descartar (a) sin acceso a Google Workspace, que esta corrección no realiza.** La corrección de código incorpora un identificador de versión de prompt no sensible en el registro de ejecución, para que una futura regresión real pueda confirmar qué versión de prompt participó en la llamada, sin registrar el prompt ni el cuerpo del correo.

### Corrección revisada (v2, registrada antes de aplicar el cambio)

Además de las reglas de texto ya presentes (que se mantienen, por seguir siendo correctas como descripción de la regla de negocio), se agrega:
1. Un **ejemplo completo** en el prompt: un correo mixto sintético con una lista numerada (distinto del correo real de CP-02) junto con el JSON esperado completo, mostrando explícitamamente que N puntos numerados producen N observaciones, con `numero` y `texto_original` preservados, y los puntos no accionables con `tareas: []`.
2. Un identificador de versión de prompt (`VERSION_PROMPT_SISTEMA`, constante no sensible) registrado mediante `Logger.log()` en `consultarIAExtractora()` — nunca se registra el prompt completo ni el cuerpo del correo.
3. **No se agrega** ninguna validación de código que asuma que toda lista numerada debe producir la misma cantidad de observaciones — el arreglo `pruebas/pruebas_prompt_observaciones_mixtas.gs` documenta explícitamente, como caso de prueba, que la validación actual acepta una respuesta con cobertura incompleta sin señalarlo como error (comportamiento actual conocido, no un defecto a corregir aquí sin antes analizar falsos positivos de una heurística de conteo).
4. **No se modifica** `temperature` (se mantiene en `0.2`) — ver justificación arriba.

### Estado documental (revisado)

- CP-02: continúa `Rechazado — corrección aplicada, regresión real (segunda) pendiente`. **No se aprueba.** Se conserva íntegra la evidencia de ambas ejecuciones (`19f8b6ac1946a47e` y `19f8b7de84ba9e5b`).
- INC-FASE8-010 **continúa abierta** — no se cierra con esta corrección; requiere una segunda regresión real con un tercer `message_id`.

**No modificado ni eliminado:** ninguna de las dos evidencias reales anteriores.

**Estado (histórico, previo al cierre):** Corrección v2 aplicada — verificación real pendiente (ver `auditoria/CHANGELOG.md`). **Esta verificación se realizó y resultó exitosa; ver "Cierre — segunda regresión aprobada" más abajo.**

### Cierre — segunda regresión aprobada (22/07/2026)

Ejecutada en un tercer mensaje nuevo, sin reutilizar `19f8b6ac1946a47e` ni `19f8b7de84ba9e5b`, con las versiones corregidas de `codigo/prompts_ia.gs` (v2, ejemplo few-shot acotado al correo MIXTO) e `codigo/cliente_openai.gs` ya copiadas al proyecto de prueba.

- `message_id 19f8baee9f470b10`.
- **Confirmación del prompt efectivamente usado:** el registro mostró la línea `consultarIAExtractora(): usando prompt versión v3-INC-FASE8-010-ejemplo-cobertura` — confirma que la llamada real usó el prompt corregido.
- `DRY_RUN=true`: 1 mensaje elegible, procesando 1; **5 observaciones**; 3 tareas simuladas (`Gestión General/Alto`, `Comercial/Medio`, `Finanzas/Alto`); sin escrituras.
- Ejecución formal (`MODO_PRUEBA=true`, `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`), verificada manualmente por Carlos Rubén Bageta:
  - `Log Mensajes`: `estado = PROCESADO`, `etapa = FINALIZADO`, `cantidad_observaciones = 5`, `cantidad_tareas = 3`, `resultado_gmail = OMITIDO_POR_CONFIGURACION`.
  - `Registro Tareas`: exactamente 3 filas, `estado_escritura = ESCRITA`, tableros `Gestión General`, `Comercial` y `Finanzas`.
  - Hojas de negocio: exactamente una tarea nueva en cada tablero correspondiente.
  - `Indice Idempotencia`: las tres tareas registradas como `PROCESADO`.
  - Gmail: el mensaje permaneció en Recibidos, conservó `Pruebas-Automatizacion`, no recibió etiquetas operativas, no fue archivado.
  - Configuración restaurada a `DRY_RUN=true` al finalizar.

**Conclusión:** CP-02 PASA. Las 5 observaciones esperadas se generaron correctamente (2 informativas con `tareas: []`, 3 con tarea). El ejemplo few-shot acotado al correo MIXTO resolvió el patrón de omisión observado en las dos ejecuciones fallidas anteriores. Ver detalle completo en `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-02 — Segunda regresión (aprobada) y cierre de INC-FASE8-010 (22/07/2026)".

**Evidencia histórica de las dos ejecuciones fallidas — conservada íntegra, no sustituida ni eliminada:** `message_id 19f8b6ac1946a47e` y `19f8b7de84ba9e5b` (ver secciones arriba en esta misma incidencia).

**Estado:** Corrección aplicada y verificada — CP-02 Aprobado (22/07/2026). **INC-FASE8-010 queda cerrada.**

---

## INC-FASE8-011 — El modelo no siempre completa `motivo_sin_tareas` en un correo completamente informativo (regla C-06 inversa)

**Detectada por:** Carlos Rubén Bageta, durante la segunda ejecución real del evaluador de IA aislado (Fase 1 de automatización gradual de pruebas — `pruebas/evaluador_ia_fase8.gs`), 22/07/2026.
**Caso de prueba afectado:** CP-05 — Correo informativo (`pruebas/CASOS_DE_PRUEBA.md`). **CP-05 NO fue ejecutado todavía como caso formal** (no pasó por el pipeline completo de Gmail/Sheets); la evidencia de esta incidencia proviene exclusivamente del fixture equivalente `EVAL-IA-02-INFORMATIVO` del evaluador aislado, que ejecuta `consultarIAExtractora()`/`validarRespuestaIA()` de forma aislada, sin Gmail ni Sheets.
**Distinción respecto de INC-FASE8-010 (cerrada):** INC-FASE8-010 trataba la cobertura de observaciones en un correo MIXTO (al menos una acción pendiente). Esta es una incidencia distinta: un correo COMPLETAMENTE INFORMATIVO (ninguna acción pendiente en ninguna de sus ideas).
**Severidad:** Media — no compromete seguridad ni integridad de datos; afecta la completitud del campo `motivo_sin_tareas` exigido por la regla C-06 inversa de `validarRespuestaIA()` para correos sin ninguna tarea.

### Evidencia real (evaluador aislado — NO es una ejecución formal de CP-05)

- Fixture: `EVAL-IA-02-INFORMATIVO` (`pruebas/fixtures_evaluacion_ia_fase8.gs`).
- `MODO_PRUEBA=true`, `DRY_RUN=true`.
- Versión de prompt confirmada: `v3-INC-FASE8-010-ejemplo-cobertura`.
- Resultado: **FALLA**.
- Categoría de rechazo: `INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06`.
- Diagnóstico estructural (`diagnosticoEstructuralSeguro_()` — solo conteos y booleanos, nunca texto libre del modelo):
  - `cantidadObservaciones = 1`
  - `cantidadTareasTotal = 0`
  - `requiere_revision = false`
  - `tiene_motivo_revision = false`
  - `tiene_motivo_sin_tareas = false`
  - `json_parseable = true`

**Interpretación del diagnóstico (sin inventar la forma exacta de la respuesta cruda, que nunca se registró en texto libre):** el modelo devolvió 1 observación, 0 tareas en total, y **sin** `motivo_sin_tareas` — dispara la regla C-06 inversa de `validarRespuestaIA()` ("Ninguna observación generó tareas y no se explicó el motivo"). El diagnóstico estructural no permite saber si esa observación correspondía a una idea informativa que el modelo describió igual (en lugar de usar `observaciones: []`) o a algún otro detalle de forma — solo confirma el patrón agregado (obs=1, tareas=0, sin `motivo_sin_tareas`).

### Diagnóstico

**Causa candidata (revisión de `codigo/prompts_ia.gs`):** `construirPromptSistema()` incluye un único ejemplo few-shot completo, acotado explícitamente a un correo MIXTO (agregado en INC-FASE8-010, v2). No incluye ningún ejemplo equivalente para un correo COMPLETAMENTE INFORMATIVO que muestre explícitamente la forma exacta esperada (`observaciones: []` + `motivo_sin_tareas` no vacío + `requiere_revision=false` + `motivo_revision=null`). La regla en prosa ya existe ("observaciones: [] se usa EXCLUSIVAMENTE cuando el correo COMPLETO no tiene ninguna acción pendiente... explicá por qué en motivo_sin_tareas"), pero — igual que ocurrió con INC-FASE8-010 antes de agregar su ejemplo few-shot — una regla de texto sola no garantiza que el modelo complete siempre `motivo_sin_tareas` en la práctica.

**No se puede confirmar con certeza absoluta** que la falta de un ejemplo contrastivo sea la única causa (no hay acceso al texto libre de la respuesta real, por diseño de seguridad del evaluador) — es la explicación más simple y compatible con el patrón agregado observado, y con la lección ya aprendida en INC-FASE8-010 (una regla de texto sola no bastó; hizo falta un ejemplo).

**Explícitamente NO se atribuye esta incidencia a:** `codigo/esquema_json.gs`, `validarRespuestaIA()`, la regla C-06 (que funciona exactamente como está diseñada: rechaza correctamente una respuesta con 0 tareas y sin motivo explicado), ni a `temperature=0.2` — ninguno de estos se modifica en esta corrección.

### Corrección requerida (registrada antes de aplicar el cambio)

Agregar a `construirPromptSistema()` un segundo ejemplo few-shot completo y contrastivo, para un correo COMPLETAMENTE INFORMATIVO, mostrando explícitamente `correo_relevante=true`, `requiere_revision=false`, `motivo_revision=null`, `motivo_sin_tareas` con una explicación no vacía, y `observaciones: []`. El ejemplo debe aclarar, en el propio prompt, que una observación informativa con `tareas: []` corresponde únicamente a una idea informativa dentro de un correo MIXTO, y que un correo completo sin ninguna acción pendiente usa `observaciones: []` + `motivo_sin_tareas`, sin crear ninguna observación individual. También debe aclarar que un correo informativo no debe confundirse con contenido ambiguo (`requiere_revision=true`) ni con publicidad/contenido no relevante (`correo_relevante=false`).

Se incrementa `VERSION_PROMPT_SISTEMA` a un identificador nuevo (`v4-INC-FASE8-011-informativo-sin-tareas`) para poder confirmar en una futura regresión qué versión de prompt participó en la llamada — mismo mecanismo ya usado en INC-FASE8-010.

**Sin cambios en:** `codigo/esquema_json.gs`, `validarRespuestaIA()`, la regla C-06, `temperature` (se mantiene en `0.2`), las expectativas de conteo/cobertura de `EVAL-IA-02` en el evaluador aislado, ni `categoriasRechazoSegurasPermitidas` de `EVAL-IA-04`.

### Estado documental

- **CP-05 (`pruebas/CASOS_DE_PRUEBA.md`):** permanece **Pendiente** — no fue ejecutado como caso formal y no se marca Rechazado basándose únicamente en el resultado del evaluador aislado (que no reemplaza la ejecución humana de Fase 8; ver `documentacion/AUTOMATIZACION_PRUEBAS_FASE8.md`, sección 1). Queda **bloqueado por INC-FASE8-011** hasta que esta incidencia se cierre.
- **INC-FASE8-011 queda abierta.** Criterio de cierre (unificado el 22/07/2026 — ver `auditoria/CHANGELOG.md`, "Correcciones documentales previas a la tercera corrida real"):
  1. Una tercera ejecución real del evaluador aislado (fixture `EVAL-IA-02-INFORMATIVO`, versión de prompt `v4-INC-FASE8-011-informativo-sin-tareas`) con resultado 4/4 **desbloquea** CP-05 — permite considerar su ejecución formal — pero **no cierra todavía** esta incidencia por sí sola.
  2. Debe ejecutarse después **CP-05 como caso formal**: primero `DRY_RUN=true`, luego `DRY_RUN=false`.
  3. **INC-FASE8-011 se cierra y CP-05 se aprueba solamente si el caso formal también pasa.** El evaluador aislado no reemplaza esta verificación (no toca Gmail ni Sheets); una segunda repetición del evaluador aislado, por sí sola, no es un criterio de cierre suficiente.

**No modificado ni eliminado:** el registro de esta ejecución real del evaluador (categoría `INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06`, diagnóstico estructural completo) permanece como evidencia de la incidencia.

**Estado (histórico, previo al cierre):** Abierta — corrección aplicada en `codigo/prompts_ia.gs` (ver `auditoria/CHANGELOG.md`), verificación real (tercera corrida del evaluador) pendiente. **Esta verificación se realizó (tercera corrida del evaluador aislado + ejecución formal de CP-05) y resultó exitosa; ver "Cierre — CP-05 aprobado" más abajo.**

### Cierre — CP-05 aprobado (23/07/2026)

Se completaron las dos etapas del criterio de cierre unificado (ver "Estado documental" arriba).

**Etapa 1 — Tercera corrida del evaluador aislado (desbloqueo, no cierre):**
- Versión de prompt utilizada: `v4-INC-FASE8-011-informativo-sin-tareas`.
- Resultado: **4/4 fixtures aprobados**, incluido `EVAL-IA-02-INFORMATIVO` con la forma válida esperada (0 observaciones, 0 tareas, `motivo_sin_tareas` presente, `requiere_revision=false`).
- Esto desbloqueó la ejecución formal de CP-05, sin cerrar todavía esta incidencia.

**Etapa 2 — Ejecución formal de CP-05 (`message_id 19f91473b9f5a719`, nuevo):**
- `DRY_RUN=true`: "1 mensaje elegible, procesando 1"; versión de prompt confirmada `v4-INC-FASE8-011-informativo-sin-tareas`; `resultado=SIN_TAREAS`; `correo_relevante=true`; `observaciones=0`; sin escrituras.
- Ejecución formal (`DRY_RUN=false`), verificada manualmente por Carlos Rubén Bageta:
  - `Log Mensajes`: `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones=0`, `cantidad_tareas=0`, `resultado_gmail=SOLO_ETIQUETADO`; la columna `error` contiene el `motivo_sin_tareas` esperado ("El correo es un aviso informativo sobre un cambio de horario ya decidido; no contiene ninguna acción pendiente para el equipo."), que es el comportamiento vigente e intencional de `finalizarMensajeSinTareas()` (registra `motivo_sin_tareas` vía `actualizarLogMensajes()`), no un error técnico.
  - `Registro Tareas`: ninguna fila para este `message_id`.
  - Hojas de negocio: ninguna tarea creada.
  - `Indice Idempotencia`: exactamente una entrada, `task_id` vacío, `estado_final=SIN_TAREAS`.
  - Gmail: conservó `Pruebas-Automatizacion`, recibió `Revisión manual/Sin tareas detectadas`, permaneció en Recibidos, no recibió `Procesado`, no fue archivado.
  - Configuración restaurada a `DRY_RUN=true` al finalizar.

**Conclusión:** CP-05 PASA. El correo completamente informativo produjo la forma exacta esperada por la regla C-06 (`observaciones: []` + `motivo_sin_tareas` explicado), sin generar tareas ni escrituras indebidas. La evidencia formal (Gmail/Sheets) confirma lo que la tercera corrida del evaluador aislado ya había anticipado.

**Evidencia histórica de la ejecución que originó esta incidencia — conservada íntegra, no sustituida ni eliminada:** la categoría `INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06` y el diagnóstico estructural completo de la segunda corrida del evaluador aislado (ver "Evidencia real" arriba en esta misma incidencia).

**Estado:** Corrección aplicada y verificada — CP-05 Aprobado (23/07/2026). **INC-FASE8-011 queda cerrada.**

### Verificación posterior al cierre — piloto automatizado de integración (24/07/2026)

Sin reabrir la incidencia ni reemplazar la evidencia formal del 23/07/2026, se ejecutó un caso nuevo equivalente a CP-05 mediante el automatizador de integración de Fase 2A:

- Caso: `INT-FASE8-01-INFORMATIVO`.
- `runId`: `dcd52847-c431-4625-8d0e-d3ca82f0f096`.
- `message_id`: `19f920a199a6666b`.
- Versión de prompt: `v4-INC-FASE8-011-informativo-sin-tareas`.
- Simulación: `[AUTO-FASE8] SIMULACION_OK`, con `SIN_TAREAS`, `correo_relevante=true`, `observaciones=0` y cero cambios en Gmail/Sheets.
- Formal: `[AUTO-FASE8] FORMAL_OK`.
- Verificación automática: una fila `SIN_TAREAS`/`FINALIZADO` en `Log Mensajes`, 0 observaciones, 0 tareas, `SOLO_ETIQUETADO`; ninguna fila en `Registro Tareas`; una entrada de idempotencia con `task_id` vacío y `estado_final=SIN_TAREAS`; hojas de negocio sin cambios; Gmail con `Pruebas-Automatizacion`, `INBOX` y `Revisión manual/Sin tareas detectadas`, sin `Procesado`, sin etiquetas de error y sin archivado.

**Conclusión adicional:** el primer piloto real del automatizador reprodujo y verificó automáticamente el resultado que cerró INC-FASE8-011. La incidencia permanece **cerrada — corrección aplicada y verificada**, y CP-05 permanece **Aprobado**.

---

## INC-FASE8-012 — Patrón de tarjeta no enmascara números con espacio no separable (NBSP) como separador

**Detectada por:** Carlos Rubén Bageta, durante la primera ejecución real de CP-29 (dato sensible en el cuerpo), 27/07/2026.
**Caso de prueba relacionado:** CP-29 (`pruebas/CASOS_DE_PRUEBA.md`).
**Entorno:** Prueba (proyecto de Apps Script de prueba, correo sintético — ningún dato real de un cliente).
**Severidad:** Alta (fuga de dato potencialmente sensible hacia un tercero, OpenAI, si un correo real de un empleado contuviera una tarjeta con este tipo de separador; en esta corrida el valor era sintético, no un dato real).

### Evidencia real
- Log de instrumentación temporal (`CP29_LOGUEAR_CUERPO_ENMASCARADO`, `codigo/script_refactorizado.gs`): `"CP-29: cuerpo ya enmascarado (instrumentación temporal de prueba): Por favor actualicen el medio de pago del cliente. Nueva tarjeta: 4551 8712 3456 7890. DNI del titular: [DNI_ENMASCARADO]."`
- El DNI se reemplazó correctamente por `[DNI_ENMASCARADO]`. La tarjeta quedó completa, sin reemplazar.

### Diagnóstico
1. **Hipótesis descartada — versión desactualizada de `prompts_ia.gs` (precedente CP-09):** el usuario proporcionó el contenido completo de `enmascararDatosSensibles()` de su proyecto de Apps Script; es idéntico, carácter por carácter, al de `codigo/prompts_ia.gs` en el repo. No es un problema de sincronización de archivos.
2. **Verificación local del patrón vigente contra el texto exacto del caso** (Node.js, fuera de Apps Script): `/\b(?:\d[ -]?){13,16}\b/g` reemplaza correctamente "4551 8712 3456 7890" (separado por espacios ASCII) por `[TARJETA_ENMASCARADA]`. El patrón, en abstracto, es correcto para el texto tal como aparece escrito en `CASOS_DE_PRUEBA.md`.
3. **Causa real — separador Unicode en el cuerpo real del correo:** `mensaje.getPlainBody()` puede devolver un espacio no separable (U+00A0, NBSP) en vez de un espacio ASCII (U+0020) cuando el correo se compuso o pasó por contenido HTML — comportamiento de Gmail, no del script. Ninguna función de la cadena de extracción (`extraerContenidoNuevo()`, `normalizarCuerpo()`, ambas en `codigo/script_refactorizado.gs`) normaliza espacios Unicode; solo tratan `\r\n`/`\r` y espacios/tabs ASCII colgantes de fin de línea. El NBSP llega intacto a `enmascararDatosSensibles()`.
4. **Reproducción exacta confirmada localmente:** insertando un U+00A0 real entre "8712" y "3456" en el cuerpo sintético exacto del caso, y pasándolo por la cadena completa (`extraerContenidoNuevo` → `normalizarCuerpo` → `enmascararDatosSensibles`), el resultado es idéntico al observado en la corrida real: DNI enmascarado, tarjeta intacta. Razón mecánica: `[ -]?` no incluye U+00A0, por lo que la repetición `(?:\d[ -]?){13,16}` no puede cruzar ese carácter; ninguno de los dos fragmentos que quedan a cada lado (8 dígitos cada uno) alcanza el mínimo de 13 dígitos exigido.

**Explícitamente NO se atribuye esta incidencia a:** una versión desactualizada de `prompts_ia.gs` (descartado con evidencia directa del usuario), a `extraerContenidoNuevo()`/`normalizarCuerpo()` (su responsabilidad es recortar citas/firmas y limitar longitud, no normalizar datos sensibles), ni a la instrumentación temporal de CP-29 (solo registra el resultado ya calculado por `enmascararDatosSensibles()`, sin transformarlo).

### Corrección aplicada (registrada antes del cambio en `auditoria/CHANGELOG.md`)
`codigo/prompts_ia.gs`, `enmascararDatosSensibles()`: patrón de tarjeta cambiado de `/\b(?:\d[ -]?){13,16}\b/g` a `/\b(?:\d[\s-]?){13,16}\b/g`. `\s` cubre cualquier separador Unicode de espacio en blanco (incluido U+00A0), sin cambiar el resto del comportamiento (mínimo/máximo de dígitos, guion como alternativa). Verificado localmente que separadores ASCII, guiones, ausencia de separador y el propio caso NBSP se enmascaran correctamente, y que una secuencia corta de dígitos (ej. un teléfono de 6 dígitos) sigue sin dispararse.

### Riesgo residual documentado (fuera de esta corrección)
Los patrones de DNI (`\.?`, solo punto) y CBU (`\d{22}`, sin ningún separador) comparten la misma clase de fragilidad ante formatos reales con separadores no anticipados. No ejercitados por CP-29 y sin evidencia real de falla; queda como decisión pendiente de Carlos Rubén Bageta si se endurecen en esta fase o en una revisión posterior.

**Resuelto (27/07/2026):** Carlos Rubén Bageta decidió endurecerlos de inmediato en vez de dejarlos como riesgo residual sin corregir. La verificación local previa al cambio encontró un bug de interacción real adicional (el patrón de tarjeta le ganaba un prefijo a un CBU agrupado con espacios/guiones al correr primero) — corregido reordenando los reemplazos por especificidad decreciente (CBU → tarjeta → DNI). Ver `auditoria/CHANGELOG.md`, entrada "Endurecimiento adicional de DNI/CBU en enmascararDatosSensibles()", para el detalle completo, incluido un nuevo riesgo residual documentado (falso positivo con listas numeradas largas, preexistente desde la Fase 4, no corregido — requiere rediseño del heurístico).

### Segunda corrida real (confirmación)
Mismo correo sintético, mensaje nuevo. Log: `"CP-29: cuerpo ya enmascarado (instrumentación temporal de prueba): Por favor actualicen el medio de pago del cliente. Nueva tarjeta: [TARJETA_ENMASCARADA]. DNI del titular: [DNI_ENMASCARADO]."` — ambos valores enmascarados correctamente, procesamiento continuó con normalidad.

### Estado
**Cerrada (27/07/2026).** Corrección verificada en producción real (segunda corrida) — CP-29 Aprobado. Instrumentación temporal retirada de `codigo/script_refactorizado.gs`. Riesgo residual de DNI/CBU también resuelto (ver arriba). El nuevo riesgo residual (falso positivo con listas numeradas largas) queda **aceptado por decisión explícita de Carlos Rubén Bageta (27/07/2026), sin corregir por ahora** — fuera del alcance de esta incidencia.

---

## Nota sobre la sección anterior de este documento

La propuesta original de Claude Cowork para INC-FASE8-004/005 (leer/validar permisos, reescribir `aplicarResultadoGmail()`, y hacer que `gestionarErrorMensaje()` llamara directamente a `reanudarDesdeManifiesto()`) fue revisada por Carlos Rubén Bageta, que aprobó el diagnóstico pero corrigió la estrategia de implementación de INC-FASE8-005 (ver el detalle completo en la sección de esa incidencia, arriba: la comprobación de manifiesto se movió a la **entrada** de `procesarUnMensaje()`, no al manejador de errores). El diseño efectivamente aplicado es el descrito en cada incidencia arriba, no la propuesta inicial.

## Archivos que hay que volver a copiar al proyecto de Apps Script de prueba

### Sesión INC-FASE8-002/003/004/005 (20/07/2026)

- `codigo/script_refactorizado.gs` (cambió: `validarConfiguracion()` — `cfg.permitirEtiquetado`/`cfg.permitirArchivado` estrictos, IDs de etiqueta condicionales; `procesarCorreosDeTareas()`; `procesarUnMensaje()` — nuevo chequeo de manifiesto al inicio; nueva `procesarUnMensajeSimulado()`; `aplicarResultadoGmail()` — reescrita completa; `gestionarErrorMensaje()` — chequeo de manifiesto).
- `codigo/recuperacion.gs` (cambió: comentario en `recuperarProcesamientosAbandonados()`, sin cambios de comportamiento).
- `codigo/prompts_ia.gs` (cambió: `construirPromptSistema()`, nueva sección de criterio Soporte/Desarrollo IT).

No es necesario volver a copiar de esa sesión: `esquema_json.gs`, `cliente_openai.gs`, `idempotencia.gs`, `filtros_correo.gs`, `escritura_sheets.gs`, `sanitizacion.gs`, `debug_seguro_pruebas.gs`. Sí hay que **actualizar las propiedades del script** si `PERMITIR_ETIQUETADO`/`PERMITIR_ARCHIVADO` no estuvieran configuradas con exactamente `"true"` o `"false"`.

### Lote 1 de auditoría (H-01, H-02, H-03, H-04, H-09, H-13) — 21/07/2026

- `codigo/script_refactorizado.gs` (cambió: nueva función `leerBooleanoEstricto()`; `validarConfiguracion()` — MODO_PRUEBA/DRY_RUN estrictos, GMAIL_QUERY_PRUEBA/ETIQUETA_PRUEBA obligatorias, MAX_MENSAJES_BUSQUEDA, CUENTA_OPERATIVA, hojas técnicas solamente; `obtenerHilosPendientes()`/`obtenerMensajesPendientes()` eliminadas, nueva `obtenerMensajesPendientesDesdeGmail()`; `procesarCorreosDeTareas()` actualizada; `procesarUnMensajeSimulado()` — logs [DRY_RUN] sin texto libre de IA; `extraerDatosCorreo()` — pasa cfg a construirEnlaceCorreo).
- `codigo/escritura_sheets.gs` (cambió: eliminada constante `var CUENTA_OPERATIVA`; `construirEnlaceCorreo(mensaje, cfg)` usa `cfg.cuentaOperativa`).

No es necesario volver a copiar de esta sesión: `prompts_ia.gs`, `idempotencia.gs`, `esquema_json.gs`, `cliente_openai.gs`, `filtros_correo.gs`, `sanitizacion.gs`. **Nota (INC-FASE8-006, 21/07/2026):** `recuperacion.gs` y `debug_seguro_pruebas.gs` sí deben copiarse (ver sección siguiente).

### INC-FASE8-006 (21/07/2026)

- `codigo/recuperacion.gs` — corrección bloqueante: `obtenerMetadatosMensaje(mensajeGmail, cfg)` (firma y llamada interna) y `construirEnlaceCorreo(mensajeGmail, cfg)` (llamada dentro de `obtenerMetadatosMensaje()`).
- `codigo/script_refactorizado.gs` — `pendientes.sort()` implementado en `obtenerMensajesPendientesDesdeGmail()`.
- `pruebas/debug_seguro_pruebas.gs` — `maxMensajesBusqueda: cfg.maxMensajesBusqueda` en la lista blanca de `vistaSegura` (antes era `maxHilos: cfg.maxHilos`).

`codigo/escritura_sheets.gs` no cambió en INC-FASE8-006; si ya fue copiada desde el Lote 1, no es necesario volver a copiarla.

### INC-FASE8-007 (21/07/2026)

- `codigo/script_refactorizado.gs` — barrera temprana en `validarConfiguracion()` para `MODO_PRUEBA === null`.

**Propiedades del script a agregar/verificar en el proyecto de prueba antes de reejecutar:**
- `MAX_MENSAJES_BUSQUEDA` = `20` (nueva obligatoria; MAX_HILOS puede quedarse pero ya se ignora)
- `CUENTA_OPERATIVA` = `carlosrubenbageta@alia-data.com` (o la cuenta propietaria del proyecto de prueba)
- `MODO_PRUEBA` = `true` o `false` exactamente (ahora estricto)
- `DRY_RUN` = `true` o `false` exactamente (ahora estricto)
- `GMAIL_QUERY_PRUEBA` ya configurada — ahora obligatoria cuando MODO_PRUEBA=true y validada que contenga `label:Pruebas-Automatizacion`
- `ETIQUETA_PRUEBA` = `Pruebas-Automatizacion` (nueva obligatoria cuando MODO_PRUEBA=true)

## Procedimiento de regresión (antes de reanudar CP-01 en adelante)

1. **Reejecutar la preprueba de CP-01 con `DRY_RUN=true`:** confirmar que **no aparece ninguna fila nueva** en `Registro Tareas`, `Log Mensajes` ni `Indice Idempotencia` para ese `message_id`. El único rastro esperado es la línea `[DRY_RUN] ...` en el registro de ejecución de Apps Script, con 1 observación, 1 tarea, tablero y prioridad.
2. **Confirmar la clasificación del tablero en ese mismo log `[DRY_RUN]`:** debe decir `Desarrollo IT/Crítico` o `Desarrollo IT/Alto` (no `Soporte`), verificando de paso la corrección de INC-FASE8-003.
3. **Reejecutar el mismo mensaje con `DRY_RUN=false`:** confirmar que `obtenerMensajesPendientesDesdeGmail()` sigue trayendo el mensaje (no quedó excluido por el paso simulado) y que esta vez sí se escribe una fila real en `Desarrollo IT` con `estado_escritura = ESCRITA` y `fila_destino` real.
4. **CP-10 (hoja inexistente) en `DRY_RUN=true`:** confirmar que sigue sin escribir nada (ahora por la salida temprana de `procesarUnMensajeSimulado()`, no por la lógica de hoja faltante, que ni se alcanza en modo simulado).
5. **CP-11 (mismo mensaje dos veces) combinado con `DRY_RUN=true`:** procesar el mismo mensaje dos veces en modo simulado y confirmar que ambas corridas producen el mismo log `[DRY_RUN]` sin generar ningún registro persistente ninguna de las dos veces.
6. **Confirmar que ninguna prueba con `DRY_RUN=false` cambia de comportamiento** respecto a lo ya validado en CP-27 — la corrección solo debe activarse cuando `cfg.dryRun === true`.
7. **CP-02, CP-03 u otro correo con una observación que combine un problema técnico y un pedido de aviso al cliente:** confirmar que se generan dos tareas separadas (`Desarrollo IT` + `Soporte`/`Comercial`), consistente con la última frase de RF-13.
8. **CP-31 (4 combinaciones de permisos Gmail):** ejecutar las 4 combinaciones de la tabla y los 4 casos de configuración inválida; confirmar `resultado_gmail` y `unidades_gmail_api` en cada una.
9. **CP-25 / CP-12 variante A:** forzar que `aplicarResultadoGmail()` falle una vez después de escribir tareas reales; confirmar que `gestionarErrorMensaje()` marca `ERROR_TEMPORAL` sin tocar `etapa` ni `Indice Idempotencia`, y que la ejecución siguiente (sin esperar `UMBRAL_ABANDONO_MIN`) reanuda vía `procesarUnMensaje()` -> `reanudarDesdeManifiesto()`, sin llamar a la IA ni reescribir tareas.
10. **CP-12 variante B (sin cambios):** confirmar que la vía de abandono (`recuperarProcesamientosAbandonados()`, tras `UMBRAL_ABANDONO_MIN`) sigue funcionando igual que antes de esta corrección.
11. **CP-32:** con todas las tareas ya `ESCRITA`, confirmar que la reanudación no llama a `escribirFilasPorLote()`, solo repite Gmail.
12. **CP-33 (cubre también CP-26):** con tareas en `RESERVADA`, confirmar que la reanudación escribe solo las pendientes, sin generar un manifiesto nuevo.
13. **CP-34:** forzar que la reanudación también falle; confirmar que no hay recursión, que el mensaje queda `ERROR_TEMPORAL` otra vez, y que una tercera ejecución puede reintentar.
14. **CP-35:** confirmar ausencia de filas duplicadas `message_id`+`task_id` en `Indice Idempotencia` tras las recuperaciones de los pasos anteriores.

Formato a utilizar (igual que `auditoria/INCIDENCIAS.md`, con el ID del caso de prueba agregado):

```markdown
## INC-FASE8-001 — Título

**Caso de prueba relacionado:** CP-XX
**Fecha y hora:**
**Entorno:** Prueba (planilla y Gmail de prueba, nunca productivo)
**Severidad:** Baja / Media / Alta / Crítica
**Descripción:**
**Resultado esperado (según CASOS_DE_PRUEBA.md):**
**Resultado observado:**
**Impacto:**
**Causa probable:**
**Acción inmediata:**
**Corrección propuesta:**
**Estado:** Abierta / En análisis / Resuelta
```

## Notas de uso

- Cada incidencia detectada durante la Fase 8 debe registrarse aquí **antes** de corregir el código, para mantener trazabilidad de qué falló y por qué.
- Si una incidencia requiere modificar código ya aprobado en una fase anterior (por ejemplo, un defecto en `escritura_sheets.gs`), la corrección debe reflejarse también en `auditoria/CHANGELOG.md` y, si corresponde, en el acta de la fase original, igual que se hizo con la ampliación de `Registro Tareas` (Fase 5) y las correcciones de enlace/fechas (Fase 7).
- Las incidencias `Abiertas` o `En análisis` al cierre de la Fase 8 deben quedar explícitamente listadas en el acta de aprobación, con una decisión registrada (corregir antes de la Fase 9, o aceptar el riesgo con justificación).
