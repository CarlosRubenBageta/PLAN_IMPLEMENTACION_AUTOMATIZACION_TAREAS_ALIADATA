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
**Acciones derivadas:** Aplicada el 27/07/2026. `documentacion/DISENO_HOJAS_TECNICAS.md` — columna 27 `intentos_gmail`. `codigo/script_refactorizado.gs`: `validarConfiguracion()` valida `LIMITE_REINTENTOS_GMAIL`; `registrarInicioProcesamiento()` inicializa la columna en `0`; `gestionarErrorMensaje()` cuenta el intento y cierra `ERROR_DEFINITIVO` con el manifiesto conservado al superar el límite; nuevo helper compartido `obtenerValorNumericoLogMensajes()` (también usado por H-11/DEC-011). Verificado localmente con mocks de Sheets (bajo el límite, en el límite exacto, y superándolo). **Verificación pendiente:** instrumentación temporal + corrida real, CP-39 (`pruebas/CASOS_DE_PRUEBA.md`); Carlos Rubén Bageta debe agregar la columna y la propiedad al proyecto de prueba antes de esa corrida. Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 11.

## DEC-010 — Recuperación de mensajes con manifiesto que ya no están en la búsqueda de Gmail (H-07)

**Fecha:** 2026-07-20 (propuesta) / 2026-07-27 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (decisión explícita, 27/07/2026, junto con DEC-007/DEC-011)  
**Estado:** Aprobada y aplicada (27/07/2026)  
**Contexto:** Un mensaje con manifiesto persistido que queda en `ERROR_TEMPORAL` depende de que `obtenerMensajesPendientesDesdeGmail()` lo vuelva a traer para que el chequeo de manifiesto en la entrada de `procesarUnMensaje()` se dispare de nuevo. Si el mensaje ya no está en la bandeja/consulta configurada (por ejemplo, porque `aplicarResultadoGmail()` lo archivó antes de que fallara un paso posterior), esa búsqueda nunca lo vuelve a traer y el mensaje queda en `ERROR_TEMPORAL` para siempre.  
**Decisión:** Nueva función `recuperarMensajesConManifiestoPendiente(cfg)` (`codigo/recuperacion.gs`) que busca directamente en `Log Mensajes` los mensajes `ERROR_TEMPORAL` con manifiesto persistido y sin fila en `Indice Idempotencia`, y los reanuda vía `reanudarDesdeManifiesto()` sin depender de ninguna búsqueda de Gmail.  
**Motivo:** Cerrar una brecha real de recuperación — sin esto, un mensaje archivado antes de una falla posterior queda huérfano indefinidamente, sin alertar a nadie.  
**Impacto:** Nueva función, llamada desde `procesarCorreosDeTareasConConfiguracion_()` junto a `recuperarProcesamientosAbandonados()`, con los mismos guards de `DRY_RUN`/`omitirRecuperacion`. Sin cambios de esquema.  
**Acciones derivadas:** Aplicada el 27/07/2026. Verificado localmente con mocks de Sheets: reanuda un `ERROR_TEMPORAL` con manifiesto sin cerrar; no toca uno sin manifiesto, uno ya cerrado en `Indice Idempotencia`, ni uno que no está en `ERROR_TEMPORAL`. **Verificación pendiente:** instrumentación temporal + corrida real, CP-38 (`pruebas/CASOS_DE_PRUEBA.md`). Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 10.

## DEC-011 — Ajustes menores de la recuperación: ANULADA excluida, unidades_gmail_api acumulado, error limpiado en cierres exitosos (H-10, H-11, H-12)

**Fecha:** 2026-07-20 (propuesta) / 2026-07-27 (aprobada y aplicada)  
**Responsable:** Carlos Rubén Bageta (decisión explícita, 27/07/2026, junto con DEC-007/DEC-010)  
**Estado:** Aprobada y aplicada (27/07/2026)  
**Contexto:** Tres ajustes menores de la auditoría del 20/07/2026, sin riesgo de pérdida de datos, agrupados porque todos tocan la misma zona de código (recuperación/cierre de mensajes): (H-10) `reanudarDesdeManifiesto()` trataba una tarea `ANULADA` como pendiente de escribir; (H-11) `unidades_gmail_api` se sobrescribía en vez de acumularse entre llamadas; (H-12) `Log Mensajes.error` no se limpiaba tras una recuperación exitosa, dejando un mensaje `PROCESADO` con un error de un intento previo.  
**Decisión:** (H-10) el filtro de pendientes en `reanudarDesdeManifiesto()` pasa a una lista explícita (`RESERVADA`/`ERROR_ESCRITURA` únicamente). (H-11) `aplicarResultadoGmail()` acumula `unidades_gmail_api` vía el nuevo helper `obtenerValorNumericoLogMensajes()`. (H-12) `finalizarMensaje()` limpia `error` **solo** cuando `estadoFinal === PROCESADO` — no `SIN_TAREAS`, a diferencia de la propuesta original: `finalizarMensajeSinTareas()` escribe ahí, a propósito, el `motivo_sin_tareas`, y `finalizarMensajeSinTareas()` nunca cierra con `PROCESADO`, así que restringir a ese único estado resuelve el escenario real de H-12 sin borrar el texto legítimo.  
**Motivo:** Corrección de precisión sobre la propuesta original (H-12), confirmada al revisar el flujo real de `finalizarMensajeSinTareas()` antes de aplicar el cambio, no solo la propuesta en abstracto.  
**Impacto:** Bajo — ninguno de los tres cambia comportamiento observable salvo en los casos exactos que corrige (recuperación de tareas `ANULADA`, conteo de cuota, texto de `error` tras un cierre exitoso).  
**Acciones derivadas:** Aplicada el 27/07/2026 en `codigo/recuperacion.gs` (H-10) y `codigo/script_refactorizado.gs` (H-11, H-12). Verificado localmente con mocks de Sheets: `ANULADA` excluida de pendientes; `unidades_gmail_api` acumulado (1 previo + 1 nuevo = 2); `error` limpiado en `PROCESADO`, conservado intacto en `SIN_TAREAS` y `ERROR_DEFINITIVO`. Sin instrumentación ni corrida real propia — se verifican junto con CP-38/CP-39 (comparten código con H-07/H-08). Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 12.

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
