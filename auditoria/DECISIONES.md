# Registro de decisiones

## DEC-001 — Adoptar Gmail API (servicio avanzado) para tratamiento por mensaje

**Fecha:** 2026-07-19  
**Responsable:** Rubén  
**Estado:** Aprobada  
**Contexto:** Las etiquetas de GmailApp operan a nivel de hilo; un hilo con mensajes en estados distintos genera ambigüedad (auditoría externa, punto 5.1).  
**Decisión:** Usar el servicio avanzado de Gmail en Apps Script para etiquetar y archivar por ID individual de mensaje.  
**Motivo:** El uso estándar no tiene costo adicional para el volumen previsto y elimina la ambigüedad por hilo.  
**Impacto:** Requiere habilitar el servicio en `appsscript.json`, autorizar alcances OAuth adicionales y usar IDs internos de etiquetas.  
**Acciones derivadas:** Documentar habilitación (plan v3, sección 7.3); registrar consumo de unidades de cuota; pruebas CP-28.

## DEC-002 — Mantener el activador productivo activo hasta la ventana de corte

**Fecha:** 2026-07-19  
**Responsable:** Rubén (por adopción de la auditoría externa, punto 5.4)  
**Estado:** Aprobada  
**Contexto:** Desactivar el activador al inicio del proyecto dejaría correos sin procesar durante el desarrollo.  
**Decisión:** La versión vigente sigue operando; la desactivación ocurre solo al abrir la ventana de corte (Fase 9), registrando `FECHA_INICIO_CORTE`.  
**Motivo:** Continuidad operativa sin pérdida de correos entre versiones.  
**Impacto:** La Fase 0 no toca el activador; el corte se planifica en la Fase 9.  
**Acciones derivadas:** Checklist de despliegue con ventana de corte; caso CP-20.

## DEC-003 — Usar la carpeta seleccionada como raíz del proyecto

**Fecha:** 2026-07-19  
**Responsable:** Rubén (ratificada el 2026-07-19)  
**Estado:** Aprobada  
**Contexto:** El plan (sección 6) nombra la raíz `Automatizacion_Tareas_Aliadata/`; la carpeta de trabajo seleccionada ya contiene el plan y las auditorías.  
**Decisión:** La carpeta `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA/` actúa como raíz del proyecto con la estructura interna del plan.  
**Motivo:** Evitar un nivel de anidamiento innecesario y duplicación de documentos.  
**Impacto:** Ninguno funcional; solo nomenclatura.  
**Acciones derivadas:** Ninguna pendiente. La carpeta seleccionada es la raíz oficial del proyecto `Automatizacion_Tareas_Aliadata`.

## DEC-004 — CP-30 diferido a la Fase 10; no bloquea la aprobación de la Fase 8

**Fecha:** 2026-07-20  
**Responsable:** Carlos Rubén Bageta (instrucción explícita en sesión de Claude Cowork)  
**Estado:** Aprobada  
**Contexto:** El acta de la Fase 8 (`entregables/FASE_8/ACTA_APROBACION_FASE_8.md`), tal como fue redactada inicialmente, exigía ejecutar los 30 casos de `pruebas/CASOS_DE_PRUEBA.md` antes de habilitar la Fase 9. Sin embargo, CP-30 ("Log detallado purgado") verifica un procedimiento de purga que recién se documenta en la Fase 10 (`MANUAL_OPERATIVO.md`); exigir su aprobación antes de la Fase 9 crea una dependencia circular imposible de resolver en ese orden.  
**Decisión:** CP-30 queda diferido a la Fase 10 y no bloquea la aprobación de la Fase 8. La Fase 8 requiere la aprobación de CP-01 a CP-29 y la ausencia de incidencias críticas abiertas (registradas en `pruebas/resultados/INCIDENCIAS_FASE_8.md`).  
**Motivo:** Evitar una condición de aprobación que ningún estado del proyecto podría satisfacer, sin renunciar a la verificación del caso: se ejecuta cuando su prerrequisito (el procedimiento de purga) exista.  
**Impacto:** El acta de la Fase 8 y el criterio de aceptación "todos los casos críticos pasan" se interpretan como CP-01 a CP-29. CP-30 se retoma como parte de los entregables/criterios de la Fase 10.  
**Acciones derivadas:** Actualizar `entregables/FASE_8/ACTA_APROBACION_FASE_8.md` y `pruebas/resultados/RESULTADOS_FASE_8.md` para reflejar esta condición; incorporar CP-30 a los criterios de verificación de la Fase 10 cuando se redacte esa fase.

## DEC-005 — Migrar el descubrimiento de mensajes a Gmail API por mensaje individual

**Fecha:** 2026-07-20 (propuesta) / 2026-07-21 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (aprobación explícita de Lote 1, 21/07/2026)  
**Estado:** Aprobada y aplicada (Lote 1, 21/07/2026)  
**Contexto:** `obtenerHilosPendientes()` usa `GmailApp.search(consulta, 0, cfg.maxHilos)`, que devuelve **hilos** que coinciden con la consulta. `obtenerMensajesPendientes()` luego toma `hilo.getMessages()` — **todos** los mensajes del hilo — sin verificar que cada mensaje individual coincida con la consulta. Para `in:inbox` (producción) esto es tolerable porque el objetivo es "todo lo que esté en la bandeja". Para `GMAIL_QUERY_PRUEBA` (por ejemplo, `in:inbox label:Pruebas-Automatizacion`), esto es un problema real de aislamiento: un hilo que coincide porque **algún** mensaje tiene la etiqueta de prueba puede contener otros mensajes que no la tienen, no están en la bandeja, o fueron enviados — y ese código los procesaría igual, por pertenecer al hilo. Es la misma limitación de granularidad de hilo ya identificada en la Fase 1 (D-06, R-07), ahora manifestada en el paso de **descubrimiento**, no solo en el de etiquetado/archivado (que DEC-001 ya resolvió por mensaje).  
**Decisión propuesta:** Reemplazar `GmailApp.search()` + `hilo.getMessages()` por `Gmail.Users.Messages.list({q: consulta, maxResults: cfg.maxMensajesBusqueda})` (Gmail API, servicio avanzado ya habilitado por DEC-001), que devuelve IDs de **mensajes individuales** que satisfacen la consulta completa. Cada ID se hidrata luego con `GmailApp.getMessageById(id)` para obtener el objeto `GmailMessage` compatible con el resto del código. **Nota (INC-FASE8-006, 21/07/2026):** esta entrada indicaba originalmente "sin cambios" para `extraerDatosCorreo()` y `construirEnlaceCorreo()`; esa descripción era inexacta — el Lote 1 (H-09 / DEC-008) actualizó ambas funciones para recibir `cfg` y leer `cfg.cuentaOperativa`. La corrección INC-FASE8-006 propagó además `cfg` a `obtenerMetadatosMensaje()` y a la llamada interna de `construirEnlaceCorreo()` en `recuperacion.gs`.  
**Motivo:** Garantizar que ningún mensaje se procese, archive o etiquete únicamente por pertenecer a un hilo coincidente, sin coincidir él mismo con la consulta — crítico para el aislamiento de pruebas y correcto también para producción.  
**Impacto:** Cambia `obtenerHilosPendientes()`/`obtenerMensajesPendientes()` (`codigo/script_refactorizado.gs`). No cambia la extracción de datos ni la escritura. Consumo de cuota de Gmail API adicional (una llamada `list()` en vez de una búsqueda de `GmailApp`), a registrar igual que las demás unidades de Gmail API (sección 7.3.6 del plan).  
**Acciones derivadas:** Aplicada el 21/07/2026. `obtenerHilosPendientes()` y `obtenerMensajesPendientes()` eliminadas. Nueva función `obtenerMensajesPendientesDesdeGmail(cfg)` implementada en `codigo/script_refactorizado.gs`. CP-36 pasa de Bloqueado a Pendiente de verificación. **Verificado (21/07/2026):** CP-36 ejecutado con un hilo de dos mensajes (A etiquetado, B sin etiqueta); `Gmail.Users.Messages.list()` solo trajo el ID de A, confirmando el aislamiento por mensaje individual. CP-36 Aprobado. Ver `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-36". Nota: esta verificación cubre el aislamiento por mensaje, no el ordenamiento (`sort()`) agregado en INC-FASE8-006, que sigue sin un caso de regresión con múltiples mensajes elegibles.

## DEC-006 — Acotar `validarConfiguracion()` a las hojas técnicas; la ausencia de una hoja de negocio se resuelve en la escritura

**Fecha:** 2026-07-20 (propuesta) / 2026-07-21 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (aprobación explícita de Lote 1, 21/07/2026)  
**Estado:** Aprobada y aplicada (Lote 1, 21/07/2026)  
**Contexto:** `validarConfiguracion()` (`codigo/script_refactorizado.gs`, líneas 233-243) exige que existan las 5 hojas de negocio **y** las 3 hojas técnicas antes de procesar cualquier mensaje. Esto contradice el diseño de `escribirFilasPorLote()` (Fase 7), que fue construido específicamente para tratar una hoja de negocio faltante como una falla recuperable por mensaje (`ERROR_ESCRITURA` → revisión manual), no como un aborto global. En la práctica, **CP-10 no puede ejecutarse tal como está diseñado**: borrar una hoja de negocio para probar ese camino haría abortar `validarConfiguracion()` antes de procesar ningún mensaje, sin llegar nunca a `escribirFilasPorLote()`.  
**Decisión propuesta:** `validarConfiguracion()` exige únicamente las 3 hojas técnicas (`Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`). La existencia de cada hoja de negocio se comprueba en el momento de escribir (`escribirFilasPorLote()`, ya implementado desde la Fase 7), mensaje por mensaje.  
**Motivo:** Hacer ejecutable el criterio de aceptación de la Fase 7 tal como fue diseñado, sin renunciar a la seguridad: ninguna hoja de negocio faltante causa pérdida de datos (el mensaje se envía a revisión manual, no se descarta).  
**Impacto:** Si todas las hojas de negocio faltaran (configuración gravemente incorrecta), el script igual llamaría a la IA para cada mensaje antes de descubrir que no puede escribir — más costoso que abortar de entrada, pero sin pérdida de datos. `codigo/script_refactorizado.gs`, `validarConfiguracion()`.  
**Acciones derivadas:** Aplicada el 21/07/2026. `validarConfiguracion()` en `codigo/script_refactorizado.gs` ahora solo valida `Object.values(HOJAS_TECNICAS)` (3 hojas técnicas). La validación de hojas de negocio permanece en `escribirFilasPorLote()`. CP-10 pasa de Bloqueado a Pendiente de verificación. **Verificado (21/07/2026):** CP-10 ejecutado renombrando temporalmente `Desarrollo IT` (hoja inexistente para `getSheetByName`), en un lote con un segundo mensaje destinado a `Finanzas` (hoja existente). `ejecutarValidacionVisible()` confirmó configuración válida pese a la hoja de negocio faltante; el mensaje sin hoja de destino cerró `REVISION_MANUAL`/`ERROR_ESCRITURA` sin pérdida de datos, mientras el segundo mensaje se procesó con normalidad (`PROCESADO`/`ESCRITA`). CP-10 Aprobado. Ver `pruebas/resultados/RESULTADOS_FASE_8.md`, sección "Detalle de CP-10".

## DEC-007 — Límite de reintentos para fallas de Gmail posteriores al manifiesto

**Fecha:** 2026-07-20 (propuesta) / 2026-07-27 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (decisión explícita, 27/07/2026 — aplicar los Lotes 2/3 ahora en vez de diferirlos, resolviendo la última condición abierta de DEC-009)  
**Estado:** Aprobada y aplicada (27/07/2026)  
**Contexto:** La corrección de INC-FASE8-005 permite que un mensaje con manifiesto persistido y una falla de Gmail se reintente indefinidamente: cada ejecución que lo encuentre (por búsqueda o por la nueva vía de recuperación de H-07/DEC-010) intentará `reanudarDesdeManifiesto()` de nuevo, sin límite. Si la falla es permanente (por ejemplo, un permiso de Gmail revocado, o un mensaje que estructuralmente no puede etiquetarse), el mensaje quedaría reintentándose para siempre, sin nunca cerrarse ni alertar a un humano.  
**Decisión:** Contar los intentos de recuperación de Gmail por mensaje (nueva columna `intentos_gmail` en `Log Mensajes`, distinta de `intentos`, que ya se usa para reintentos de la IA). Al superar `LIMITE_REINTENTOS_GMAIL` (valor inicial propuesto: 5), el mensaje se cierra como `ERROR_DEFINITIVO` con las tareas ya escritas conservadas en los tableros de negocio (no se revierten), y se escribe `Indice Idempotencia` para no reintentarlo más — quedando como caso de revisión manual humana permanente.  
**Motivo:** Evitar reintentos indefinidos que consuman cuota de Gmail/Sheets sin resolución, y garantizar que toda falla eventualmente llegue a un estado terminal visible.  
**Impacto:** Nueva columna en `Log Mensajes` (cambio a un entregable ya aprobado en la Fase 2/5, mismo patrón que la ampliación de `Registro Tareas` en la Fase 5). Nueva propiedad de configuración obligatoria.  
**Acciones derivadas:** Aplicada el 27/07/2026. `documentacion/DISENO_HOJAS_TECNICAS.md` — columna 27 `intentos_gmail`. `codigo/script_refactorizado.gs`: `validarConfiguracion()` valida `LIMITE_REINTENTOS_GMAIL`; `registrarInicioProcesamiento()` inicializa la columna en `0`; `gestionarErrorMensaje()` cuenta el intento y cierra `ERROR_DEFINITIVO` con el manifiesto conservado al superar el límite; nuevo helper compartido `obtenerValorNumericoLogMensajes()` (también usado por H-11/DEC-011). Verificado localmente con mocks de Sheets (bajo el límite, en el límite exacto, y superándolo). **Confirmado con corrida real (27/07/2026):** CP-39 Aprobado — `LIMITE_REINTENTOS_GMAIL=6` en el proyecto de prueba, 7 ejecuciones reales, `gestionarErrorMensaje()` cerró `ERROR_DEFINITIVO` en la séptima con las 2 tareas ya escritas conservadas. Instrumentación temporal retirada. Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 11, y `pruebas/CASOS_DE_PRUEBA.md`.

## DEC-010 — Recuperación de mensajes con manifiesto que ya no están en la búsqueda de Gmail (H-07)

**Fecha:** 2026-07-20 (propuesta) / 2026-07-27 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (decisión explícita, 27/07/2026, junto con DEC-007/DEC-011)  
**Estado:** Aprobada y aplicada (27/07/2026)  
**Contexto:** Un mensaje con manifiesto persistido que queda en `ERROR_TEMPORAL` depende de que `obtenerMensajesPendientesDesdeGmail()` lo vuelva a traer para que el chequeo de manifiesto en la entrada de `procesarUnMensaje()` se dispare de nuevo. Si el mensaje ya no está en la bandeja/consulta configurada (por ejemplo, porque `aplicarResultadoGmail()` lo archivó antes de que fallara un paso posterior), esa búsqueda nunca lo vuelve a traer y el mensaje queda en `ERROR_TEMPORAL` para siempre.  
**Decisión:** Nueva función `recuperarMensajesConManifiestoPendiente(cfg)` (`codigo/recuperacion.gs`) que busca directamente en `Log Mensajes` los mensajes `ERROR_TEMPORAL` con manifiesto persistido y sin fila en `Indice Idempotencia`, y los reanuda vía `reanudarDesdeManifiesto()` sin depender de ninguna búsqueda de Gmail.  
**Motivo:** Cerrar una brecha real de recuperación — sin esto, un mensaje archivado antes de una falla posterior queda huérfano indefinidamente, sin alertar a nadie.  
**Impacto:** Nueva función, llamada desde `procesarCorreosDeTareasConConfiguracion_()` junto a `recuperarProcesamientosAbandonados()`, con los mismos guards de `DRY_RUN`/`omitirRecuperacion`. Sin cambios de esquema.  
**Acciones derivadas:** Aplicada el 27/07/2026. Verificado localmente con mocks de Sheets: reanuda un `ERROR_TEMPORAL` con manifiesto sin cerrar; no toca uno sin manifiesto, uno ya cerrado en `Indice Idempotencia`, ni uno que no está en `ERROR_TEMPORAL`. **Confirmado con corrida real (27/07/2026):** CP-38 Aprobado — recuperó `message_id 19fa40fc2e504081` (archivado antes de una falla posterior) sin que la búsqueda de Gmail lo encontrara. Instrumentación temporal retirada. Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 10, y `pruebas/CASOS_DE_PRUEBA.md`.

## DEC-011 — Ajustes menores de la recuperación: ANULADA excluida, unidades_gmail_api acumulado, error limpiado en cierres exitosos (H-10, H-11, H-12)

**Fecha:** 2026-07-20 (propuesta) / 2026-07-27 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (decisión explícita, 27/07/2026, junto con DEC-007/DEC-010)  
**Estado:** Aprobada y aplicada (27/07/2026)  
**Contexto:** Tres ajustes menores de la auditoría del 20/07/2026, sin riesgo de pérdida de datos, agrupados porque todos tocan la misma zona de código (recuperación/cierre de mensajes): (H-10) `reanudarDesdeManifiesto()` trataba una tarea `ANULADA` como pendiente de escribir; (H-11) `unidades_gmail_api` se sobrescribía en vez de acumularse entre llamadas; (H-12) `Log Mensajes.error` no se limpiaba tras una recuperación exitosa, dejando un mensaje `PROCESADO` con un error de un intento previo.  
**Decisión:** (H-10) el filtro de pendientes en `reanudarDesdeManifiesto()` pasa a una lista explícita (`RESERVADA`/`ERROR_ESCRITURA` únicamente). (H-11) `aplicarResultadoGmail()` acumula `unidades_gmail_api` vía el nuevo helper `obtenerValorNumericoLogMensajes()`. (H-12) `finalizarMensaje()` limpia `error` **solo** cuando `estadoFinal === PROCESADO` — no `SIN_TAREAS`, a diferencia de la propuesta original: `finalizarMensajeSinTareas()` escribe ahí, a propósito, el `motivo_sin_tareas`, y `finalizarMensajeSinTareas()` nunca cierra con `PROCESADO`, así que restringir a ese único estado resuelve el escenario real de H-12 sin borrar el texto legítimo.  
**Motivo:** Corrección de precisión sobre la propuesta original (H-12), confirmada al revisar el flujo real de `finalizarMensajeSinTareas()` antes de aplicar el cambio, no solo la propuesta en abstracto.  
**Impacto:** Bajo — ninguno de los tres cambia comportamiento observable salvo en los casos exactos que corrige (recuperación de tareas `ANULADA`, conteo de cuota, texto de `error` tras un cierre exitoso).  
**Acciones derivadas:** Aplicada el 27/07/2026 en `codigo/recuperacion.gs` (H-10) y `codigo/script_refactorizado.gs` (H-11, H-12). Verificado localmente con mocks de Sheets: `ANULADA` excluida de pendientes; `unidades_gmail_api` acumulado (1 previo + 1 nuevo = 2); `error` limpiado en `PROCESADO`, conservado intacto en `SIN_TAREAS` y `ERROR_DEFINITIVO`. Sin instrumentación ni corrida real propia — se verifican junto con CP-38/CP-39 (comparten código con H-07/H-08). Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 12.

## DEC-012 — Deduplicar mensajes ya atendidos por la recuperación dentro de la misma ejecución (H-14)

**Fecha:** 2026-07-27 (detectado y aprobado el mismo día, antes de instrumentar CP-39)  
**Responsable:** Carlos Rubén Bageta (decisión explícita, 27/07/2026 — corregir antes de correr CP-39, en vez de correrlo con el conteo distorsionado)  
**Estado:** Aprobada y aplicada (27/07/2026)  
**Contexto:** Al preparar el procedimiento de CP-39 — leyendo el código antes de instrumentar o correr nada — se detectó que H-07 (`recuperarMensajesConManifiestoPendiente()`) y el chequeo de manifiesto ya existente en la entrada de `procesarUnMensaje()` (INC-FASE8-005) no son mutuamente excluyentes: un mensaje `ERROR_TEMPORAL` con manifiesto que no llega a archivarse (`in:inbox` durante toda la prueba, el escenario exacto de CP-39) se encuentra dos veces en la misma ejecución — una vez por H-07, otra por la búsqueda normal de Gmail + el chequeo de `procesarUnMensaje()`. Si ambos intentos fallan, `gestionarErrorMensaje()` se llama dos veces por ejecución, duplicando `intentos_gmail`/`unidades_gmail_api` y gastando el doble de cuota real de Gmail de lo que DEC-007 asumía (un intento real por ejecución manual). No lo expuso la corrida real de CP-38 (ese caso sí archiva el mensaje).  
**Decisión:** `recuperarProcesamientosAbandonados(cfg)` y `recuperarMensajesConManifiestoPendiente(cfg)` devuelven los `message_id` que efectivamente intentaron reanudar vía `reanudarDesdeManifiesto()` en esa ejecución. `procesarCorreosDeTareasConConfiguracion_()` junta ambas listas y filtra esos ids del resultado de `obtenerMensajesPendientesDesdeGmail()` antes del bucle principal.  
**Motivo:** Evitar un segundo intento real (y redundante) contra la API de Gmail para un mensaje que la recuperación ya atendió en la misma corrida, y restaurar la premisa original de `LIMITE_REINTENTOS_GMAIL` (H-08/DEC-007): un intento real por ejecución manual.  
**Impacto:** Sin cambios de esquema. Los mensajes reabiertos sin manifiesto (`reabiertosCompletos`) no se excluyen — deliberadamente deben seguir siendo encontrados por la búsqueda normal en la misma ejecución para reprocesarse desde cero (comportamiento preexistente, no relacionado con este hallazgo). Ninguna de las 37 aprobadas cambia de comportamiento: el filtro solo actúa cuando la reanudación de la MISMA ejecución vuelve a fallar; cuando tiene éxito, el mensaje ya queda excluido por `Indice Idempotencia` (escrita antes de que corra la búsqueda normal), así que el filtro es un no-op en ese caso.  
**Acciones derivadas:** Aplicada el 27/07/2026 en `codigo/recuperacion.gs` y `codigo/script_refactorizado.gs`. Verificado localmente con mocks de Sheets (18 verificaciones, código real extraído): ambas funciones de recuperación devuelven exactamente los ids reanudados vía manifiesto; el filtro nuevo excluye correctamente esos ids de la búsqueda normal en la misma ejecución, sin falsos positivos y sin alterar `DRY_RUN`/`omitirRecuperacion`. **Confirmado con corrida real (27/07/2026, vía CP-39):** de la ejecución 2 en adelante, cada corrida mostró `"0 mensajes elegibles, procesando 0"` tras la recuperación de H-07 — `intentos_gmail` avanzó exactamente 1 por ejecución (2, 3, 4, 5, 6), sin el doble incremento que exhibía el código antes de esta corrección. Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 14, y `pruebas/CASOS_DE_PRUEBA.md`, CP-39.

## DEC-008 — CUENTA_OPERATIVA como propiedad del script, no constante hardcodeada

**Fecha:** 2026-07-20 (propuesta) / 2026-07-21 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (aprobación explícita de Lote 1, 21/07/2026)  
**Estado:** Aprobada y aplicada (Lote 1, 21/07/2026)  
**Contexto:** `codigo/escritura_sheets.gs` declara `var CUENTA_OPERATIVA = 'tareas@alia-data.com';` como constante fija en el código, usada por `construirEnlaceCorreo()` para el parámetro `authuser`. Es la única identidad operativa del proyecto que vive en código en vez de en `PropertiesService`, rompiendo la convención del resto del proyecto (todo dato de configuración, incluida la cuenta, debería vivir en propiedades).  
**Decisión propuesta:** Mover `CUENTA_OPERATIVA` a una propiedad obligatoria del script, leída y validada una vez en `validarConfiguracion()` y conservada en `cfg.cuentaOperativa`.  
**Motivo:** Consistencia con el resto de la configuración; permite cambiar de cuenta operativa (por ejemplo, para pruebas con una cuenta distinta) sin tocar código.  
**Impacto:** Bajo — un valor de texto, sin lógica adicional.  
**Acciones derivadas:** Aplicada el 21/07/2026. `var CUENTA_OPERATIVA = 'tareas@alia-data.com'` eliminada de `codigo/escritura_sheets.gs`. `construirEnlaceCorreo(mensaje, cfg)` usa `cfg.cuentaOperativa`. `validarConfiguracion()` lee y valida la propiedad obligatoria `CUENTA_OPERATIVA`. Ver `configuracion/PARAMETROS_EJEMPLO.md`.

## DEC-009 — CP-31 a CP-39 como casos de regresión que condicionan el cierre de la Fase 8

**Fecha:** 2026-07-21  
**Responsable:** Carlos Rubén Bageta (aprobación explícita de Lote 1, 21/07/2026)  
**Estado:** Aprobada  
**Contexto:** La auditoría del 20/07/2026 generó hallazgos H-01 a H-13 y, como consecuencia, nuevos casos de prueba CP-31 a CP-39 que verifican las correcciones aplicadas. Hasta que el código que los activa no existía, estos casos eran ejecutables solo en parte o no lo eran en absoluto. Con la aplicación del Lote 1 (H-01, H-02, H-03, H-04, H-09, H-13), los casos CP-10, CP-36 y CP-37 pasan a ser ejecutables. Los casos CP-38 y CP-39 permanecen bloqueados hasta que los Lotes 2 y 3 sean aprobados.  
**Decisión:** CP-31 a CP-39 son casos de regresión obligatorios de la Fase 8. Su ejecución y aprobación condicionan el cierre de las incidencias relacionadas (INC-FASE8-004, INC-FASE8-005 y las correcciones del Lote 1). El cierre de la Fase 8 queda supeditado a la aprobación de CP-01 a CP-37 (los ejecutables al cierre del Lote 1) sin incidencias críticas abiertas, más la confirmación de que los Lotes 2 y 3 han sido evaluados explícitamente (aprobados o diferidos de forma consciente por Rubén).  
**Motivo:** Registrar formalmente que el alcance de prueba de la Fase 8 creció con la auditoría. Sin este registro, CP-31 a CP-39 podrían quedar huérfanos de una condición de aprobación.  
**Impacto:** El resumen de `pruebas/resultados/RESULTADOS_FASE_8.md` pasa de 34 casos que condicionan la aprobación a hasta 37 (CP-10, CP-36, CP-37 pasaron de bloqueados a pendientes con el Lote 1; CP-38 y CP-39 permanecen bloqueados).  
**Acciones derivadas:** `pruebas/CASOS_DE_PRUEBA.md` y `pruebas/resultados/RESULTADOS_FASE_8.md` actualizados.

## DEC-013 — `Resumen Actividades`: fuente única de verdad y vista de solo lectura

**Fecha:** 2026-07-27 (propuesta) / 2026-07-28 (aprobada)  
**Responsable:** Carlos Rubén Bageta (aprobación explícita de la orientación general de la Fase 8.1, 28/07/2026, tras confirmar D1/D3 en `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`)  
**Estado:** Aprobada — diseño completo, implementación pendiente de las Etapas 2 a 4 de la Fase 8.1  
**Contexto:** Una persona debe recorrer hoy cinco hojas (`Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT`, `Gestión General`) para conocer el estado general de las actividades, sin una vista única que combine el histórico con las tareas nuevas de la automatización. `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md` evaluó cinco alternativas (fórmulas nativas, macro manual, Apps Script programado, escritura dual, híbrida) para resolverlo.  
**Decisión:** Las cinco hojas operativas continúan como única fuente de verdad. `Resumen Actividades` es una vista protegida y no editable (D3: sin edición desde el resumen, ni ahora ni en el corto plazo), implementada inicialmente con fórmulas nativas de Google Sheets — no una macro manual (desactualizable entre ejecuciones) ni escritura dual (duplica datos, no resuelve el histórico). Se migra a una vista materializada por Apps Script únicamente si una prueba de rendimiento real con el volumen del inventario (27 filas activas al 28/07/2026) demuestra que las fórmulas no cumplen un criterio de tiempo de uso a definir en la Etapa 2.  
**Motivo:** Evitar duplicar datos, no ampliar el modelo transaccional ya probado en la Fase 8, y mantener la reversión simple (deshabilitar la vista no afecta las hojas fuente).  
**Impacto:** Nuevas hojas `Resumen Actividades` y `Registro Migración Histórica` en el archivo productivo (ver DEC-014). Sin cambios en `codigo/*.gs` del pipeline — confirmado en la propuesta, sección 8.1: descubrimiento de Gmail, OpenAI, generación de tareas, escritura por lotes, recuperación, idempotencia, etiquetado y archivado quedan intactos.  
**Acciones derivadas:** Diseño en `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`, corregido dos veces tras revisión externa (dos aprobaciones separadas en la Fase 9 en vez de una; entregables de Fase 8.1 y Fase 9 separados). Sección "Fase 8.1" agregada a `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`. **Pendiente:** Etapas 2 a 4 (matriz de homologación formal, simulación en copia aislada, revisión humana) antes de implementar en producción.

## DEC-014 — Tratamiento del histórico: sin reprocesamiento, registro técnico separado, origen vía `Indice Idempotencia`

**Fecha:** 2026-07-27 (propuesta) / 2026-07-28 (aprobada)  
**Responsable:** Carlos Rubén Bageta  
**Estado:** Aprobada — diseño completo, implementación pendiente  
**Contexto:** Una actividad histórica previa al corte puede no tener `message_id`, puede no haber sido creada desde Gmail, y no tiene por qué contar con un manifiesto del pipeline v3. Registrarla en `Log Mensajes`, `Registro Tareas` o `Indice Idempotencia` falsearía la semántica de esas hojas (una fila por mensaje procesado / una fila por tarea con manifiesto / barrera permanente contra reprocesamiento) y podría afectar la idempotencia real del pipeline.  
**Decisión:** El histórico no se reprocesa desde Gmail ni se inserta en ninguna de las tres hojas técnicas del pipeline. Se inventaría, homologa y concilia mediante una hoja nueva y separada, `Registro Migración Histórica` (17 columnas propuestas, incluida `batch_id`, `historical_record_id`, `legacy_id_original`, `clasificacion`, `accion`, `estado_validacion`). El origen de cada fila de `Resumen Actividades` (`Automatización v3` / `Histórico/pre-corte` / `Revisión de origen`) se determina verificando el `ID` como `task_id` en **`Indice Idempotencia`**, no en `Registro Tareas` como decía el diseño original.  
**Motivo (corrección del diseño original, 27/07/2026):** `Registro Tareas` tiene purga de información ampliada a los 6 meses (Fase 10, CP-30, procedimiento exacto todavía sin definir) — una tarea legítimamente generada por v3 podría dejar de reconocerse como tal una vez purgada. `Indice Idempotencia` tiene retención indefinida (política de retención v3, este mismo documento). Toda fila que `Resumen Actividades` muestra existe físicamente en una hoja de negocio, y solo llega ahí mediante una escritura real — la sola presencia de su `ID` como `task_id` en `Indice Idempotencia` alcanza para confirmar el origen, sin necesitar revisar `estado_escritura`.  
**Impacto:** Nueva hoja técnica `Registro Migración Histórica`, de retención permanente. Sin cambios en `Log Mensajes`, `Registro Tareas` ni `Indice Idempotencia` — ni en su esquema ni en el código que los escribe.  
**Acciones derivadas:** Corrección aplicada en `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`, sección 5.3, tras revisión externa. Ver `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md` para la confirmación de que `Listas` ya contiene catálogos reutilizables de apoyo (`Estado`, `Prioridad`, `Responsable`).

## DEC-015 — Regla fail-safe de no resueltos y catálogo real de `Estado`

**Fecha:** 2026-07-27 (propuesta) / 2026-07-28 (aprobada con datos reales)  
**Responsable:** Carlos Rubén Bageta (D2, `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`)  
**Estado:** Aprobada  
**Contexto:** No podía usarse una regla como "Estado <> Completada" sin inventariar los valores reales — el catálogo tentativo original (sección 6.2 de la propuesta) fue escrito antes de tener datos reales.  
**Decisión:** Solo se excluyen del conjunto de "no resueltos" los estados expresamente clasificados como terminales; vacíos y desconocidos se incluyen siempre y pasan a revisión. Catálogo real, confirmado el 28/07/2026 contra `Listas!D` y verificado sin excepciones contra los valores reales de las cinco hojas (27 filas activas, `Pendiente`=22 y `Completada`=5, coincidente con la fila `TOTAL` del `Dashboard` productivo): **abiertos** `Pendiente`, `En curso`, `Bloqueada`, `En revisión`; **terminal** `Completada`; **ambiguo** cualquier otro valor (incluye `Cancelada`, que no es un valor real hoy).  
**Motivo:** El catálogo tentativo original difería del real en dos puntos: incluía `Cancelada` como terminal (no existe en `Listas!D`) y no contemplaba `En revisión` (existe, confirmada como abierta por Carlos Rubén Bageta).  
**Impacto:** Ninguno sobre el código del pipeline — esta regla aplica solo a la clasificación de `Resumen Actividades`/`Registro Migración Histórica`.  
**Acciones derivadas:** Catálogo actualizado en `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md` (D2 sustituye a la sección 6.2 tentativa) y en `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`.

## DEC-016 — Momento de implementación: diseño en Fase 8.1, ejecución productiva en la ventana de corte de Fase 9

**Fecha:** 2026-07-27 (propuesta) / 2026-07-28 (aprobada)  
**Responsable:** Carlos Rubén Bageta  
**Estado:** Aprobada — Fase 8.1 agregada formalmente a `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, entre la Fase 8 y la Fase 9  
**Contexto:** La incorporación del histórico y `Resumen Actividades` no tenían un lugar formal en el cronograma — corrían el riesgo de ejecutarse como una actividad improvisada durante la ventana de corte de la Fase 9, sin las mismas garantías (simulación previa en copia aislada, aprobación humana propia) que el resto del proyecto.  
**Decisión:** El diseño, inventario, homologación y simulación se realizan en la nueva **Fase 8.1** (Etapas 0 a 4), antes de tocar producción. Las modificaciones productivas (crear `Registro Migración Histórica`, aplicar normalizaciones aprobadas, crear `Resumen Actividades`, conciliar) se ejecutan dentro de la ventana controlada de la **Fase 9** (Etapas 5 a 7), después del respaldo y **antes** de desplegar el código nuevo — con una aprobación humana propia ("Aprobación A") distinta de la aprobación final de despliegue ("Aprobación B").  
**Motivo (corrección tras revisión externa, 27/07/2026):** una síntesis previa del procedimiento combinado ubicaba la aprobación del lote histórico después de "ejecutar los correos controlados", contradiciendo la propia propuesta (sección 7, Etapa 5), que exige aprobar la conciliación histórica antes de continuar con el despliegue del código. Corregido con el procedimiento completo de 19 pasos intercalados, dos aprobaciones separadas y explícitas.  
**Impacto:** Procedimiento de la Fase 9 en `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md` reescrito con Aprobación A/B; criterios de aceptación y entregables de la Fase 9 ampliados con los puntos propios de la incorporación histórica.  
**Acciones derivadas:** `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md` actualizado (nueva sección Fase 8.1, procedimiento de Fase 9 reescrito). `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`, sección "Relación con la Fase 9", es la fuente de detalle completo.
