# Resultados de la Fase 8 — Pruebas controladas

**Plantilla creada:** 20/07/2026, Claude Cowork
**Estado de este documento:** Vacío por diseño. Debe completarse con evidencia real de ejecución en Google Workspace (Rubén o la cuenta operativa), no por Claude Cowork.

> Claude Cowork no tiene acceso a Apps Script, Gmail ni Sheets (`configuracion/MATRIZ_PERMISOS.md`). Este documento existe para que quien ejecute las pruebas registre, caso por caso, lo que realmente ocurrió. Una vez completado, puede pedirse a Claude Cowork que lo revise y redacte el acta de aprobación de la Fase 8 en base a esta evidencia.
>
> **Alcance de la aprobación (DEC-004, `auditoria/DECISIONES.md`):** la Fase 8 se aprueba con **CP-01 a CP-29** ejecutados y sin incidencias críticas abiertas. CP-30 queda diferido a la Fase 10 y no forma parte de la condición de aprobación de esta fase.

---

## Entorno de prueba

```text
Cuenta propietaria: carlosrubenbageta@alia-data.com
Archivo productivo: 1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g
Archivo de prueba: 1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o
Fecha de creación: 20/07/2026
Estado: Copia aislada creada y verificada
```

Verificado por Claude Cowork: el ID productivo coincide con el registrado en `entregables/FASE_0/INVENTARIO_TECNICO.md`, y el ID de prueba es distinto del productivo (condición que, además, `validarConfiguracion()` exige en tiempo de ejecución — caso CP-27).

**Evidencia:** `pruebas/evidencias/00_preparacion_entorno/01_planilla_prueba_creada_2026-07-20.png`

Captura revisada por Claude Cowork. Muestra:
- Planilla **"PRUEBA - Aliadata Tableros Operativos - Fase 8 - 2026-07-20"**, propietaria `carlosrubenbageta@alia-data.com`.
- URL con ID `1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o`, coincide con el registrado arriba.
- Las 8 pestañas requeridas presentes: `Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`, `Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT`, `Gestión General` (más `Listas` y `Dashboard`, heredadas del archivo productivo).
- Hoja `Indice Idempotencia` visible con encabezados `message_id | task_id | estado_final | fecha`, coincide exactamente con el orden especificado.

**`Log Mensajes` y `Registro Tareas`:** encabezados confirmados verbalmente por Carlos Rubén Bageta (20/07/2026) como coincidentes con los indicados por Claude Cowork (los de `documentacion/DISENO_HOJAS_TECNICAS.md`). **Sin captura de respaldo** — a diferencia de `Indice Idempotencia`, esta confirmación no tiene evidencia visual archivada en `pruebas/evidencias/`. Se deja registrado así, sin fabricar ni asumir un nivel de verificación mayor al que existe: si se quiere equiparar el nivel de evidencia entre las tres hojas, puede agregarse una captura de estas dos más adelante (no bloquea continuar).

## Procedimiento de ejecución (resumen operativo)

1. Preparar el entorno de prueba según `pruebas/CASOS_DE_PRUEBA.md`, sección "Configuración previa obligatoria".
2. Ejecutar los casos en el orden sugerido (los casos con instrumentación temporal — CP-08, CP-09, CP-12, CP-26, CP-29 — al final, para no interferir con los demás).
3. Para cada caso: registrar aquí el resultado observado, capturas o IDs de fila relevantes, y marcar Aprobado/Rechazado.
4. Si un caso falla, registrar el detalle en `pruebas/resultados/INCIDENCIAS_FASE_8.md` con el mismo ID de caso.
5. Al finalizar todos los casos, completar el resumen de la sección final de este documento.

## Registro de resultados

| ID | Caso | Fecha de ejecución | Resultado observado | Evidencia (fila, log, captura) | Estado |
|---|---|---|---|---|---|
| CP-01 | Una observación, una tarea | 21/07/2026: primera pasada `DRY_RUN=true` 17:55; ejecución formal `DRY_RUN=false` 18:03 | Ver detalle completo debajo de la tabla. Resumen: primera pasada confirmó 1 mensaje elegible, 1 observación, 1 tarea simulada (`Desarrollo IT`, `Crítico`), sin ninguna escritura. Ejecución formal confirmó 1 mensaje elegible, cierre sin errores, y los 11 puntos del resultado esperado verificados manualmente por Carlos Rubén Bageta. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-02 | Cinco observaciones, tres tareas | 22/07/2026 (ejecución original), 22/07/2026 (primera regresión, fallida) y 22/07/2026 (segunda regresión, aprobada) | Ejecución original (`message_id 19f8b6ac1946a47e`): 3 observaciones/3 tareas en vez de 5/3, puntos 1 y 4 omitidos (INC-FASE8-010). Primera corrección verificada con una regresión real que resultó insuficiente (`message_id 19f8b7de84ba9e5b`: mismo resultado exacto, 3/3). Corrección v2 aplicada (ejemplo few-shot acotado al correo MIXTO + identificador de versión de prompt), verificada localmente (35/35 pruebas). **Segunda regresión aprobada** (`message_id 19f8baee9f470b10`): 5 observaciones, 3 tareas correctas; registro confirmó el uso del prompt corregido (`v3-INC-FASE8-010-ejemplo-cobertura`). Ver detalle completo (las tres ejecuciones) debajo de la tabla. | Registro `[DRY_RUN]` y verificación en Sheets de las tres ejecuciones reales — evidencia conservada, no modificada | Aprobado — 22/07/2026 (segunda regresión real, INC-FASE8-010 cerrada) |
| CP-03 | Una observación, dos tareas | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: tras tres iteraciones de ajuste del fixture/automatizador, `SIMULACION_OK` confirmó 1 observación/2 tareas (`Desarrollo IT/Alto`, `Comercial/Medio`), sin escrituras; `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 2 filas en `Registro Tareas` (mismo `texto_original`), 2 entradas en `Indice Idempotencia`, filas nuevas en `Desarrollo IT` y `Comercial`, y etiqueta `Procesado` en Gmail. | Registro `[AUTO-FASE8]` de la corrida real — `runId cceca797-90ec-4493-bfbc-f3a79ad3e782`, `message_id 19f953e0047d2478` | Aprobado — 24/07/2026 |
| CP-04 | Tareas para tres hojas | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: tras un ajuste de redacción del fixture, `SIMULACION_OK` confirmó 1 observación/3 tareas (`Desarrollo IT/Alto`, `Finanzas/Alto`, `Comercial/Medio`), sin escrituras; `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 3 filas en `Registro Tareas` (mismo `texto_original`), 3 entradas en `Indice Idempotencia`, filas nuevas en `Desarrollo IT`/`Finanzas`/`Comercial`, y etiqueta `Procesado` en Gmail. | Registro `[AUTO-FASE8]` de la corrida real — `runId 26c92904-c613-4a07-b34b-01a766da3710`, `message_id 19f95bc29ad0717d` | Aprobado — 24/07/2026 |
| CP-05 | Correo informativo | 23/07/2026; regresión automatizada 24/07/2026 | Ver detalle completo debajo de la tabla. Resumen del cierre formal: `DRY_RUN=true` confirmó `resultado=SIN_TAREAS`/`observaciones=0`, sin escrituras; ejecución formal (`DRY_RUN=false`) confirmó `cantidad_observaciones=0`, `cantidad_tareas=0`, ninguna fila en `Registro Tareas`, una entrada en `Indice Idempotencia` (`estado_final=SIN_TAREAS`), etiqueta `Revisión manual/Sin tareas detectadas` aplicada, mensaje no archivado. Regresión automatizada posterior: `INT-FASE8-01-INFORMATIVO` obtuvo `SIMULACION_OK` y `FORMAL_OK` con un `message_id` nuevo y comprobó automáticamente el mismo resultado. | Cierre formal verificado manualmente por Carlos Rubén Bageta; piloto automatizado `runId dcd52847-c431-4625-8d0e-d3ca82f0f096`, `message_id 19f920a199a6666b` | Aprobado — 23/07/2026 (cierre de INC-FASE8-011; ratificado automáticamente el 24/07/2026) |
| CP-06 | Promoción de Google | 27/07/2026 | Ver detalle completo debajo de la tabla. Resumen: correo sintético autoenviado con encabezado `List-Unsubscribe` (vía script temporal usando el servicio avanzado de Gmail, ya que la ventana de redactar normal no permite fijar ese encabezado). El filtro determinístico lo descartó correctamente (`SIN_TAREAS`/`FINALIZADO`, `SOLO_ETIQUETADO`, sin `modelo`), sin generar fila en `Registro Tareas`, con una entrada en `Indice Idempotencia` y la etiqueta `Revisión manual/Sin tareas detectadas` en Gmail. Aprobó al primer intento real. | Capturas de `Log Mensajes`, `Registro Tareas`, `Indice Idempotencia` y Gmail | Aprobado — 27/07/2026 |
| CP-07 | Notificación de Apps Script | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `FORMAL_OK` confirmó automáticamente `Log Mensajes` (`SIN_TAREAS`), ninguna fila nueva en `Registro Tareas`, 1 entrada en `Indice Idempotencia` (`task_id` vacío), sin llamada a OpenAI (sin línea `consultarIAExtractora()`), y etiqueta `Revisión manual/Error de automatización` confirmada visualmente en Gmail. Disparado por asunto, no por remitente. Aprobó al primer intento. | Registro `[AUTO-FASE8]` de la corrida real — `runId 9a2f73ca-684b-48e0-9fb9-fbd5ffb57382`, `message_id 19f96cb239f5ec62` | Aprobado — 24/07/2026 |
| CP-08 | JSON inválido | 26/07/2026 (instrumentación temporal en `codigo/cliente_openai.gs`) | Ver detalle completo debajo de la tabla. Resumen: `consultarIAExtractora()` devolvió `contenidoCrudo` inválido sin llamar a la API real; `validarRespuestaIA()` lo detectó y el mensaje se cerró `REVISION_MANUAL`/`FINALIZADO`, sin fila en `Registro Tareas`, con etiqueta `Revisión manual/Error de procesamiento`. Aprobó al primer intento. | Registro de ejecución de la corrida real | Aprobado — 26/07/2026 |
| CP-09 | Error HTTP temporal | 26/07/2026 (instrumentación temporal en `codigo/cliente_openai.gs`) | Ver detalle completo debajo de la tabla. Resumen: HTTP 503 simulado en el intento 1, HTTP 200 con contenido válido en el intento 2 (solo se reemplazó el objeto `response`, el bucle real de reintentos corrió sin modificar); `Log Mensajes.intentos=2`, tarea generada normalmente en el segundo intento. Dos intentos previos se descartaron por una copia desactualizada del archivo (sin `grupo_origen`). | Registro de ejecución de la corrida real | Aprobado — 26/07/2026 |
| CP-10 | Hoja inexistente | 21/07/2026, ejecución formal ~21:18 | Hoja `Desarrollo IT` renombrada temporalmente a `Desarrollo IT__CP10_TEMP` (mismo comportamiento de hoja inexistente). Lote de 2 mensajes: uno a la hoja inexistente (`REVISION_MANUAL`/`ERROR_ESCRITURA`), otro a `Finanzas` (`PROCESADO`/`ESCRITA`). Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-11 | Mismo mensaje dos veces | 21/07/2026, ~21:43 | `procesarCorreosDeTareas()` informó `0 mensajes elegibles, procesando 0` reutilizando los dos mensajes ya cerrados de CP-10. Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-12 | Caída después de escritura parcial | 24-25/07/2026 (Variantes A y B, flujo clásico con instrumentación temporal) | Ver detalle completo debajo de la tabla. Resumen: Variante A (excepción capturada) dejó `Log Mensajes` en `ERROR_TEMPORAL`/`ESCRITURA_COMPLETADA`, recuperado vía `reanudarDesdeManifiesto()` sin volver a consultar la IA (validado además sobre 5 mensajes viejos arrastrados por la query amplia, hallazgo no planeado sin impacto en aprobaciones vigentes). Variante B (runtime interrumpido, `return` sin excepción) dejó el mensaje genuinamente en `EN_PROCESO`/`ESCRITURA_COMPLETADA`; `recuperarProcesamientosAbandonados()` lo detectó por `UMBRAL_ABANDONO_MIN` y lo reanudó por la misma vía, sin duplicar tareas. Ambas variantes convergieron al mismo resultado final (`PROCESADO`, sin duplicados, sin nueva consulta a la IA). | Registro de ejecución de ambas corridas reales — `message_id 19f96ec29b3c8486` (A), `19f9734c63bb0299` (B) | Aprobado — 25/07/2026 |
| CP-13 | Dos ejecuciones simultáneas | 26/07/2026 (dos pestañas del editor, instrumentación temporal mínima) | Ver detalle completo debajo de la tabla. Resumen: `LockService.tryLock(5000)` impidió la segunda ejecución concurrente; el rechazo se registró y terminó sin tocar Gmail/Sheets. Aprobó al primer intento. Hallazgo colateral (sin impacto en esta aprobación): archivo `Código.gs` sin usar detectado en el proyecto de prueba, con una función de mismo nombre — el usuario decidió eliminarlo. | Registro de ejecución de ambas pestañas | Aprobado — 26/07/2026 |
| CP-14 | Firma extensa | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `SIMULACION_OK` confirmó 1 observación/1 tarea (`Gestión General/Alto`), sin escrituras; `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 1 fila en `Registro Tareas`, 1 entrada en `Indice Idempotencia`, fila nueva en `Gestión General`, y etiqueta `Procesado` en Gmail. Aprobó al primer intento, pese a ser el primer cuerpo multi-párrafo del automatizador. | Registro `[AUTO-FASE8]` de la corrida real — `runId b8ed62db-4f41-418e-9acd-276d1bcdd4ee`, `message_id 19f9640b73453584` | Aprobado — 24/07/2026 |
| CP-15 | Observaciones duplicadas | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `SIMULACION_OK` confirmó 1 observación/1 tarea (`Finanzas/Alto`), sin escrituras; `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 1 fila en `Registro Tareas`, 1 entrada en `Indice Idempotencia`, fila nueva en `Finanzas`, y etiqueta `Procesado` en Gmail. Aprobó al primer intento. | Registro `[AUTO-FASE8]` de la corrida real — `runId 01fbd80c-a874-4eed-82a6-c21a14b8070f`, `message_id 19f9621b19597350` | Aprobado — 24/07/2026 |
| CP-16 | Cuerpo vacío | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `FORMAL_OK` confirmó automáticamente `Log Mensajes` (`SIN_TAREAS`), ninguna fila nueva en `Registro Tareas`, 1 entrada en `Indice Idempotencia` (`task_id` vacío), y etiqueta `Revisión manual/Sin tareas detectadas` en Gmail — primer caso rechazado por filtro determinístico (sin llamada a OpenAI). Aprobó en el segundo intento (el primero expuso un defecto del verificador, no del pipeline). | Registro `[AUTO-FASE8]` de la corrida real — `runId 7efa4045-e9c8-4815-974c-b80eca8ee56f`, `message_id 19f9677c994bf546` | Aprobado — 24/07/2026 |
| CP-17 | Fecha límite explícita | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 1 fila en `Registro Tareas`, 1 entrada en `Indice Idempotencia`, fila nueva en `Comercial` con "Fecha límite" verificada por componentes de fecha local (`2026-07-31`), y etiqueta `Procesado` en Gmail. El tester confirmó visualmente `31/07/2026` en la hoja `Comercial` — sin corrimiento de un día. Aprobó al primer intento. | Registro `[AUTO-FASE8]` de la corrida real — `runId 3a917b4c-50e3-4387-b898-4556f4edd6c7`, `message_id 19f9699bac4232c8` | Aprobado — 24/07/2026 |
| CP-18 | Fecha no explícita | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 1 fila en `Registro Tareas`, 1 entrada en `Indice Idempotencia`, fila nueva en `Desarrollo IT` con "Fecha límite" vacía (la IA no inventó ninguna fecha), y etiqueta `Procesado` en Gmail. Complemento exacto de CP-17. Aprobó al primer intento. | Registro `[AUTO-FASE8]` de la corrida real — `runId 34ca060d-42b0-4175-95e7-fc7808532a2f`, `message_id 19f96b3f0b156c2a` | Aprobado — 24/07/2026 |
| CP-19 | Respuesta nueva en hilo ya procesado | 21/07/2026 (ejecución fallida) y 22/07/2026 (regresión aprobada) | Ejecución original (21/07/2026): descubrimiento por `message_id` correcto, pero `extraerContenidoNuevo()` no recortó el historial citado (INC-FASE8-008) — la IA generó 2 tareas en vez de 1. Corrección aplicada en `codigo/script_refactorizado.gs`. Regresión (22/07/2026, hilo sintético nuevo, `message_id 19f87e72c61fcf01`): exactamente 1 tarea generada (`Comercial`), sin ninguna fila basada en el contenido histórico citado. Ver detalle completo (ambas ejecuciones) debajo de la tabla. | Ejecución fallida: `Log Mensajes` (`19f876c74f7f71ae`), `Registro Tareas` (P13/P14), `Indice Idempotencia` (`ALI-E7FF66FDAE16DEA1-001`/`002`) — evidencia real, conservada sin modificar. Regresión: `Registro Tareas`/`Log Mensajes`/`Indice Idempotencia` para `19f87e72c61fcf01` — verificación manual de Carlos Rubén Bageta, sin captura archivada | Aprobado — 22/07/2026 (regresión real, tras corrección de INC-FASE8-008) |
| CP-20 | Mensaje anterior a FECHA_INICIO_CORTE | 22/07/2026 | `FECHA_INICIO_CORTE=2026-07-23T00:00:00-03:00` (normalizada `2026-07-23T03:00:00.000Z`); mensaje sintético del 22/07/2026 (`message_id 19f8a791041de0d4`), anterior al corte. Registro: "Mensaje 19f8a791041de0d4 excluido por antigüedad (anterior a FECHA_INICIO_CORTE)."; "procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0." Sin llamada a IA; sin fila en `Log Mensajes`/`Registro Tareas`/`Indice Idempotencia`; Gmail no modificado. No requirió ejecución `DRY_RUN=false` (el filtro ocurre antes de seleccionar el camino simulado o formal). Configuración restaurada y revalidada después. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-21 | Respuesta que cita un correo ya procesado | 22/07/2026 | `DRY_RUN=true`: "1 mensaje elegible, procesando 1", `resultado=SIN_TAREAS`, `correo_relevante=false`, `observaciones=0`, sin escrituras. Ejecución formal `DRY_RUN=false`: sin fila en `Registro Tareas` para `message_id 19f8a4fee5b229ec`; `Log Mensajes` `SIN_TAREAS`/`FINALIZADO`; `Indice Idempotencia` con exactamente una entrada (`task_id` vacío, `estado_final = SIN_TAREAS`); ninguna tarea generada a partir del historial citado; Gmail archivó el mensaje; sin duplicados ni errores. `extraerContenidoNuevo()` descartó correctamente el historial citado. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-22 | Intento de manipular el prompt | 22/07/2026 | `DRY_RUN=true` (`message_id 19f8a890b34363d4`): `resultado=RESPUESTA_IA_INVALIDA`, sin escrituras — fallo seguro. Ejecución formal `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`: `Log Mensajes` `REVISION_MANUAL`/`FINALIZADO`, 0 observaciones, 0 tareas, `resultado_gmail = OMITIDO_POR_CONFIGURACION`, con `error` describiendo instrucciones sospechosas; sin fila en `Registro Tareas`; `Indice Idempotencia` con una entrada (`task_id` vacío, `REVISION_MANUAL`); Gmail no modificado. Sin tablero "Hackeado" ni tarea basada en las instrucciones maliciosas. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-23 | Texto que comienza como fórmula | 22/07/2026 (ejecución vulnerable) y 22/07/2026 (regresión aprobada) | Ejecución original: `Log Mensajes` F20 mostró `#ERROR!` con `=CONCAT("CP23-20260722-02","-FORMULA")` en la barra de fórmulas (`message_id 19f8ab1e4b126f56`) — inyección de fórmulas confirmada (INC-FASE8-009). Corrección aplicada en `registrarInicioProcesamiento()`, `actualizarLogMensajes()` y `persistirManifiestoTareas()`. Regresión (`message_id 19f8afd5236e6cf7`, asunto `=CONCAT("CP23-20260722-03","-FORMULA")`): `Log Mensajes` (fila 21) y `Comercial` (fila 11) almacenaron el asunto literalmente, sin `#ERROR!`. `Registro Tareas` (fila 20, `fila_destino=11`) confirmó la creación correcta del manifiesto — esa hoja no tiene columna de asunto; la protección de sus campos de texto libre está cubierta por las 17/17 pruebas deterministas. Ver detalle completo (ambas ejecuciones) debajo de la tabla. | Ejecución vulnerable: `Log Mensajes` fila 20 (`#ERROR!`, no modificada), Registro Tareas fila 19 (`ALI-7576DEA84BEA5CDE-001`; `fila_destino=10`), Comercial fila 10 — evidencia real, conservada. Regresión: `Log Mensajes` fila 21, `Registro Tareas` fila 20 (`ALI-6FE9C44A57429639-001`), `Comercial` fila 11 — verificación manual de Carlos Rubén Bageta, sin captura archivada | Aprobado — 22/07/2026 (regresión real, tras corrección de INC-FASE8-009) |
| CP-24 | Varias cuentas Google abiertas | 22/07/2026 | Ventana de incógnito con dos cuentas Google (personal primero, `carlosrubenbageta@alia-data.com` después, en posición `/u/1/`). Enlace "Link al correo" (`?authuser=carlosrubenbageta@alia-data.com#search/rfc822msgid:...`) resolvió automáticamente `/mail/u/1/`; búsqueda `rfc822msgid` devolvió exactamente un resultado; correo abierto en la cuenta operativa correcta, sin selección manual. Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta (sin captura archivada para esta fila) | Aprobado |
| CP-25 | Falla Gmail después de escribir filas | 26/07/2026 (flujo clásico con instrumentación temporal) | Ver detalle completo debajo de la tabla. Resumen: mismo mecanismo que CP-12 (excepción capturada en `aplicarResultadoGmail()` tras `escribirFilasPorLote()`), pero recuperado en la ejecución inmediatamente siguiente sin esperar ningún umbral de tiempo — `reanudarDesdeManifiesto()` sin volver a consultar la IA ni reescribir tareas, `Log Mensajes` a `PROCESADO`, sin duplicados. Aprobó al primer intento. | Registro de ejecución de ambas corridas reales — `message_id 19fa0743dc9d5b94` | Aprobado — 26/07/2026 |
| CP-26 | Caída después de reservar tareas | 26/07/2026 (flujo clásico con instrumentación temporal) | Ver detalle completo debajo de la tabla. Resumen: excepción capturada entre `persistirManifiestoTareas()` y `escribirFilasPorLote()` (tareas `RESERVADA`, no `ESCRITA`); la ejecución inmediatamente siguiente reanudó vía `reanudarDesdeManifiesto()`, escribió las tareas pendientes usando los mismos `task_id` ya reservados, sin volver a consultar la IA. Un primer intento con otro correo se descartó por property no creada (sin relación con el pipeline). | Registro de ejecución de ambas corridas reales — `message_id 19fa0a67abbf10f3` | Aprobado — 26/07/2026 |
| CP-27 | Modo prueba con ID productivo | 20/07/2026 19:04:22 | Configuración rechazada correctamente: `validarConfiguracion()` detectó `SPREADSHEET_ID_PRUEBA = SPREADSHEET_ID` y abortó; `procesarCorreosDeTareas()` finalizó sin tocar Gmail/Sheets/OpenAI. Configuración restaurada y revalidada como válida después (ver detalle debajo de la tabla). | `pruebas/evidencias/CP-27/01_configuracion_rechazada.png`, `02_funcion_principal_abortada.png`, `04_configuracion_restaurada.png` | Aprobado |
| CP-28 | Mensajes distintos dentro de un hilo | 21/07/2026: `DRY_RUN=true` ~22:00 y ejecución formal `DRY_RUN=false` ~22:05 | `procesarCorreosDeTareas()` informó `2 mensajes elegibles, procesando 2` en ambas modalidades. `message_id 19f875267239b349` (`Gestión General`) y `19f87541d8034391` (`Comercial`) procesados de forma independiente; el mensaje puente enviado no generó fila. Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-29 | Dato sensible en el cuerpo | 27/07/2026 (primera corrida, fallida; segunda corrida, aprobada) | Ver detalle completo debajo de la tabla. Resumen: la primera corrida mostró el DNI enmascarado correctamente pero la tarjeta "4551 8712 3456 7890" completa, sin enmascarar, por un separador NBSP que el patrón no reconocía (INC-FASE8-012). Tras la corrección en `codigo/prompts_ia.gs`, la segunda corrida (mensaje nuevo) confirmó ambos valores enmascarados (`[TARJETA_ENMASCARADA]`, `[DNI_ENMASCARADO]`) antes de llegar a la IA, con el procesamiento continuando con normalidad. Endurecimiento adicional de DNI/CBU aplicado después, por decisión de Carlos Rubén Bageta (ver `auditoria/CHANGELOG.md`). | Registro de ejecución de ambas corridas reales | Aprobado — 27/07/2026 |
| CP-30 | Log detallado purgado | | | | Diferido a Fase 10 (DEC-004, no condiciona la aprobación de esta fase) |
| CP-31 | Cuatro combinaciones PERMITIR_ETIQUETADO/PERMITIR_ARCHIVADO | 21/07/2026 | Matriz operativa completa (4/4 combinaciones) verificada, más 6 escenarios de configuración inválida (`PERMITIR_ETIQUETADO`/`PERMITIR_ARCHIVADO` ausentes o inválidos, `ID_ETIQUETA_*` ausente con etiquetado habilitado, `ID_ETIQUETA_*` ausentes con etiquetado deshabilitado). Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-32 | Recuperación con tareas ya ESCRITA | 26/07/2026 (flujo clásico con instrumentación temporal) | Ver detalle completo debajo de la tabla. Resumen: mismo mecanismo que CP-25 (excepción capturada en `aplicarResultadoGmail()` tras `escribirFilasPorLote()`); la ejecución inmediatamente siguiente reanudó vía `reanudarDesdeManifiesto()` sin volver a consultar la IA, sin duplicar tareas. Un primer intento con otro correo se descartó por property no creada (mismo problema de CP-26, sin impacto en el pipeline). | Registro de ejecución de ambas corridas reales — `message_id 19fa0d6ae4f8f334` | Aprobado — 26/07/2026 |
| CP-33 | Recuperación con tareas en RESERVADA | 26/07/2026 (flujo clásico con instrumentación temporal) | Ver detalle completo debajo de la tabla. Resumen: mismo mecanismo que CP-26 (excepción capturada entre `persistirManifiestoTareas()` y `escribirFilasPorLote()`, tareas `RESERVADA`); la ejecución inmediatamente siguiente escribió las tareas pendientes usando los mismos `task_id` ya reservados, sin volver a consultar la IA. Aprobó al primer intento. | Registro de ejecución de ambas corridas reales — `message_id 19fa0f11793dc340` | Aprobado — 26/07/2026 |
| CP-34 | Nueva falla de Gmail durante la recuperación (sin recursión) | 26/07/2026 (flujo clásico con instrumentación temporal, 3 corridas) | Ver detalle completo debajo de la tabla. Resumen: mismo gancho de CP-12/CP-25/CP-32, mantenido activo durante dos corridas consecutivas; la segunda falla se capturó por el mismo camino que la primera, con una sola línea de error (sin cadena de reintentos), y una tercera corrida recuperó el mensaje limpiamente. Aprobó al primer intento. Cierra la familia CP-12/25/26/32/33/34. | Registro de ejecución de las tres corridas reales — `message_id 19fa107c79d673bb` | Aprobado — 26/07/2026 |
| CP-35 | Sin filas duplicadas en Indice Idempotencia tras recuperaciones sucesivas | 27/07/2026 | Ver detalle completo debajo de la tabla. Resumen: corrección H-05/H-06 aplicada (`upsertIndiceIdempotencia()` + reordenamiento en `finalizarMensaje()`), verificada localmente (20 casos) y luego con una corrida real forzando dos invocaciones de `finalizarMensaje()` para el mismo mensaje — una sola fila final por `task_id`, genuinamente actualizada (`estado_final=CP35_SEGUNDA_LLAMADA`), sin duplicados. Aprobó al primer intento real. | Registro de ejecución y capturas de `Indice Idempotencia`/`Log Mensajes` | Aprobado — 27/07/2026 |
| CP-36 | Aislamiento de mensajes por hilo | 21/07/2026: `DRY_RUN=true` (repetido accidentalmente una vez, mismo resultado) y ejecución formal `DRY_RUN=false` | Ver detalle completo debajo de la tabla. Resumen: `procesarCorreosDeTareas()` informó `1 mensajes elegibles, procesando 1` en ambas modalidades; solo `message_id 19f8698d446c577a` (Mensaje A) fue procesado; el Mensaje B (mismo hilo, sin etiqueta) no generó fila alguna. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-37 | Validación estricta de MODO_PRUEBA/DRY_RUN/GMAIL_QUERY_PRUEBA | 21/07/2026 | 7 escenarios verificados: `MODO_PRUEBA=TRUE` rechazado (case-sensitive); `MODO_PRUEBA` ausente rechazado (barrera INC-FASE8-007); `DRY_RUN=TRUE` rechazado; `GMAIL_QUERY_PRUEBA` ausente rechazado; consulta sin `label:Pruebas-Automatizacion` rechazada; `ETIQUETA_PRUEBA` ausente rechazada; restauración final con planilla de prueba y `DRY_RUN=true` válida. | `pruebas/evidencias/CP-27/05.png` a `10.png` (6 capturas) | Aprobado |
| CP-38 | Recuperación tras archivado previo, sin depender de la búsqueda de Gmail | 27/07/2026 | Ver detalle completo debajo de la tabla. Resumen: la instrumentación forzó una falla después de que el mensaje ya había sido archivado de verdad en Gmail, dejándolo `ERROR_TEMPORAL` con manifiesto y fuera de `in:inbox`. La ejecución siguiente lo recuperó vía la nueva `recuperarMensajesConManifiestoPendiente()`, sin que la búsqueda normal de Gmail lo encontrara (`"0 mensajes elegibles, procesando 0"`) — confirma H-07. De paso confirmó H-11 (`unidades_gmail_api` acumulado a 2, no sobrescrito) y H-12 (`error` limpio tras el cierre exitoso). Aprobó al primer intento real. | Registro de ejecución de ambas corridas reales — `message_id 19fa40fc2e504081` | Aprobado — 27/07/2026 |
| CP-39 | Límite de reintentos Gmail y salida a error permanente | 27/07/2026 | Ver detalle completo debajo de la tabla. Resumen: 7 ejecuciones reales sucesivas — la primera generó y escribió las tareas y falló al actualizar Gmail; las 5 siguientes fueron recuperadas exclusivamente por H-07, confirmando de paso que H-14 evita un segundo intento por ejecución (`intentos_gmail` avanzó de a 1: 1→2→3→4→5→6); la séptima superó `LIMITE_REINTENTOS_GMAIL=6` y cerró `ERROR_DEFINITIVO` con las tareas conservadas. | Registro de ejecución de las 7 corridas reales — `message_id 19fa443c94a40af2` | Aprobado — 27/07/2026 |

## Detalle de CP-01 — Una observación, una tarea

```text
Fecha de ejecución: 21/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Correo sintético: "[PRUEBA-AUTOMATIZACION] Servidor de facturación caído"
```

### Primera pasada — `DRY_RUN=true`, 17:55

**Evidencia visible en el registro (según lo informado por Carlos Rubén Bageta):**
- 1 mensaje elegible encontrado.
- 1 observación detectada.
- 1 tarea simulada generada.
- Clasificación: `Desarrollo IT`.
- Prioridad: `Crítico`.
- El log confirmó explícitamente: "Sin escrituras en hojas de negocio, hojas técnicas ni Gmail".

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- Ninguna de las cuatro hojas controladas cambió.
- El mensaje conservó la etiqueta de prueba, permaneció en Recibidos, no recibió etiquetas operativas y no fue archivado.

### Ejecución formal — `DRY_RUN=false`, 18:03

**Evidencia visible en el registro:**
- 1 mensaje elegible.
- Ejecución finalizada sin errores.

**Comprobación manual confirmada por Carlos Rubén Bageta** (verificación directa en la planilla de prueba y en Gmail):
- Exactamente 1 fila nueva en `Desarrollo IT`.
- Prioridad `Crítico`.
- Exactamente 1 fila en `Registro Tareas`, con `estado_escritura = ESCRITA` y destino correcto.
- `Log Mensajes.estado = PROCESADO`.
- `Log Mensajes.etapa = FINALIZADO`.
- `cantidad_observaciones = 1`.
- `cantidad_tareas = 1`.
- `resultado_gmail = OMITIDO_POR_CONFIGURACION`.
- `unidades_gmail_api = 0`.
- Exactamente 1 fila correspondiente en `Indice Idempotencia`, con `estado_final = PROCESADO`.
- El mensaje permaneció en Recibidos, conservó la etiqueta de prueba, no recibió etiquetas operativas y no fue archivado.

**Nota (Claude Cowork):** no se dispone de número de fila, `task_id` ni capturas archivadas para esta ejecución; el registro anterior en este documento (20/07/2026) correspondía a una regresión previa a la corrección de INC-FASE8-002/003/004, con `message_id` distintos (`19f81f96fcd09cae`, `19f819a446a30718`) — no representa la ejecución formal aprobada aquí.

**Evidencia de regresión aportada por esta ejecución (ver también INC-FASE8-002, INC-FASE8-003 e INC-FASE8-004):**
- `DRY_RUN=true` no produjo ninguna escritura — confirma la corrección de INC-FASE8-002.
- El correo del servidor caído se clasificó como `Desarrollo IT` — confirma la corrección de INC-FASE8-003 (RF-13).
- Con `PERMITIR_ETIQUETADO=false`/`PERMITIR_ARCHIVADO=false`, `resultado_gmail = OMITIDO_POR_CONFIGURACION` sin excepción — confirma la corrección de INC-FASE8-004.

**Nota:** esta ejecución no forzó una falla de Gmail posterior a la escritura de tareas ni activó la recuperación desde manifiesto — **no aporta evidencia sobre INC-FASE8-005**, que permanece con verificación pendiente (requiere CP-32/CP-33/CP-34).

**Estado:** Aprobado (`PASA`).

## Detalle de CP-19 — Respuesta nueva en hilo ya procesado (INC-FASE8-008)

```text
Fecha de ejecución: 21/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
thread_id común (reutilizado de CP-28): 19f875267239b349
```

**Mensajes anteriores del hilo (ya cerrados desde CP-28):**
- `message_id 19f875267239b349`: "¿Podrían revisar la cláusula 4 del contrato antes del jueves?"
- `message_id 19f87541d8034391`: "Además, necesitamos una copia firmada para el lunes."

**Respuesta nueva de CP-19** (`message_id 19f876c74f7f71ae`): "Además, avisen al cliente que el contrato actualizado ya está disponible y envíenle una copia hoy."

### Resultado de descubrimiento (correcto)

- `procesarCorreosDeTareas()` informó "1 mensajes elegibles, procesando 1".
- Los dos `message_id` anteriores del hilo no fueron redescubiertos.
- Confirma que `obtenerMensajesPendientesDesdeGmail()` y el control por `message_id` funcionan correctamente.

### Resultado DRY_RUN

- 1 mensaje elegible; el log `[DRY_RUN]` informó **3 observaciones y 3 tareas simuladas** — señal temprana de que se estaba analizando contenido de más de un mensaje.
- Sin escrituras.

### Resultado formal (evidencia real, no modificada)

**`Log Mensajes` para `19f876c74f7f71ae`:**
- `estado = PROCESADO`, `etapa = FINALIZADO`.
- `cantidad_observaciones = 2`, `cantidad_tareas = 2`.
- `resultado_gmail = ETIQUETADO_Y_ARCHIVADO`, `intentos = 1`, `codigo_http = 200`.

**`Indice Idempotencia`:** `ALI-E7FF66FDAE16DEA1-001` y `ALI-E7FF66FDAE16DEA1-002`, ambos `PROCESADO`.

**`Registro Tareas`:**
- P13 / `observacion_texto_original`: "Además, avisen al cliente que el contrato actualizado ya está disponible y envíenle una copia hoy." — contenido nuevo, correcto.
- P14 / `observacion_texto_original`: "Además, necesitamos una copia firmada para el lunes." — reproducción literal del mensaje anterior citado (`19f87541d8034391`), ya procesado y cerrado desde CP-28.

**Conclusión:** el historial citado sobrevivió a `extraerContenidoNuevo()` y llegó a la IA como si fuera contenido nuevo. Ver diagnóstico completo en `pruebas/resultados/INCIDENCIAS_FASE_8.md`, INC-FASE8-008, y `auditoria/CHANGELOG.md`.

**Corrección aplicada (ajustada 22/07/2026):** `codigo/script_refactorizado.gs`, `extraerContenidoNuevo()` — normalización interna de saltos de línea (endurecimiento preventivo, no corrección de una causa CRLF demostrada — ver nota de revisión abajo), tolerancia a espacios iniciales y a encabezado de cita partido en, como máximo, una línea adicional (no una cantidad arbitraria), con dos formas para esa línea de continuación ("Nombre escribió:" o "escribió:" sola al inicio de línea), y marcador de corte por prefijo `>`. Verificada localmente con 18 pruebas funcionales de resultado exacto más 1 verificación adicional del patrón antiguo con CRLF (`pruebas/pruebas_extraer_contenido_nuevo.gs`), 19/19 `PASA`. **Verificación en el proyecto de Apps Script pendiente** — requiere reejecutar CP-19.

**Nota de revisión (22/07/2026):** el diagnóstico original de esta incidencia atribuía el fallo a que `^`/`$` en modo multilínea de JavaScript no reconocían `\r`, y afirmaba que el patrón anterior fallaba sistemáticamente con cuerpos CRLF de Gmail. Una revisión independiente demostró, verificando empíricamente en Node/V8, que esa afirmación es incorrecta: el patrón original sí coincidía con un encabezado CRLF simple. La causa razonable (no demostrada de forma aislada) es que los marcadores de corte no cubrían encabezados partidos en más de una línea, espacios iniciales, ni contaban con un marcador de respaldo. Ver `auditoria/CHANGELOG.md`, "Revisión correctiva de INC-FASE8-008", y `pruebas/resultados/INCIDENCIAS_FASE_8.md`, INC-FASE8-008.

**No modificado ni eliminado:** la fila `Log Mensajes` de `19f876c74f7f71ae`, las filas P13/P14 de `Registro Tareas` y las entradas `ALI-E7FF66FDAE16DEA1-001`/`002` de `Indice Idempotencia` permanecen como evidencia real de la incidencia.

**Procedimiento de regresión:** el `message_id 19f876c74f7f71ae` ya está en `Indice Idempotencia` y no puede reutilizarse. Reejecutar CP-19 con una respuesta nueva (o un hilo sintético nuevo) que genere un `message_id` distinto — ver procedimiento paso a paso en la respuesta de esta sesión.

**Estado (histórico de esta ejecución, 21/07/2026):** Rechazado — INC-FASE8-008, corrección aplicada, regresión pendiente. **Este registro se conserva íntegro como antecedente** — el veredicto final de CP-19 está en la sección siguiente.

## Detalle de CP-19 — Regresión aprobada (22/07/2026)

```text
Fecha de ejecución: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Consulta: in:inbox label:Pruebas-Automatizacion subject:CP19-REG-20260722-01
```

**Procedimiento:** se copió al proyecto de Apps Script de prueba la versión corregida de `codigo/script_refactorizado.gs` (INC-FASE8-008, correcciones del 21/07/2026 y los dos ajustes del 22/07/2026). Se creó un **hilo sintético nuevo y aislado**, distinto del hilo de la ejecución fallida original, para no reutilizar el `message_id 19f876c74f7f71ae` (ya registrado en `Indice Idempotencia`).

- Primer mensaje del hilo: "Obtenga una copia firmada del contrato para el lunes." — ya procesado previamente, registrado en `Indice Idempotencia`, etiquetado `Procesado` y archivado.
- Respuesta nueva dentro del mismo hilo (`message_id 19f87e72c61fcf01`): "Avise hoy al cliente que el contrato actualizado ya está disponible."
- Se reaplicó la etiqueta `Pruebas-Automatizacion` después de recibir la respuesta nueva.

### `DRY_RUN=true`

**Evidencia visible en el registro (según lo informado por Carlos Rubén Bageta):**
- `procesarCorreosDeTareas()` informó "1 mensajes elegibles, procesando 1".
- El log seguro indicó: 1 observación, 1 tarea simulada, `Comercial`/`Alto`, y ausencia total de escrituras en hojas de negocio, hojas técnicas y Gmail.
- El mensaje previamente procesado no fue redescubierto.

### Ejecución formal `DRY_RUN=false`

**Comprobación manual confirmada por Carlos Rubén Bageta:**

**`Registro Tareas`:**
- Exactamente una fila para `message_id 19f87e72c61fcf01`.
- `tablero = Comercial`, `estado_escritura = ESCRITA`.
- Columna J / resumen: "Informar al cliente que el contrato actualizado ya está disponible."
- Columna P / `observacion_texto_original`: "Avise hoy al cliente que el contrato actualizado ya está disponible."

**Contenido histórico ausente (verificación central de esta regresión):**
- No apareció "Obtenga una copia firmada del contrato para el lunes".
- No se creó ninguna tarea basada en el mensaje citado.
- El mensaje inicial del hilo no recibió filas adicionales.

**También verificado:**
- Exactamente una fila nueva en `Comercial`.
- `Log Mensajes`: `PROCESADO`/`FINALIZADO`, una observación y una tarea.
- `Indice Idempotencia`: exactamente una entrada nueva para el `message_id` de regresión.
- La respuesta nueva recibió `Procesado` y fue archivada.
- Sin duplicados ni errores.

**Conclusión:** CP-19 **PASA**. El descubrimiento individual por `message_id` continúa funcionando. `extraerContenidoNuevo()` elimina correctamente el historial citado en la regresión real.

**Nota (Claude Cowork):** no se dispone de números de fila concretos en `Registro Tareas`/`Log Mensajes`/`Indice Idempotencia` para esta ejecución — no fueron suministrados; solo el `message_id` de la respuesta nueva.

**Relación con INC-FASE8-008:** esta regresión confirma el cierre de la incidencia — ver `pruebas/resultados/INCIDENCIAS_FASE_8.md`, estado actualizado a "Corrección aplicada y verificada — CP-19 Aprobado".

**Relación con CP-21:** deja de estar bloqueado por INC-FASE8-008; permanece `Pendiente` hasta su propia ejecución independiente.

**Evidencia de la ejecución fallida original (21/07/2026):** se conserva íntegra en la sección anterior de este documento ("Detalle de CP-19 — Respuesta nueva en hilo ya procesado (INC-FASE8-008)") — no se sustituye ni se elimina.

**Estado (veredicto final):** Aprobado — 22/07/2026 (`PASA`).

## Detalle de CP-28 — Mensajes distintos dentro de un hilo

```text
Fecha de ejecución: 21/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Configuración: MODO_PRUEBA=true, GMAIL_QUERY_PRUEBA=in:inbox label:Pruebas-Automatizacion subject:CP28-20260721-01,
  PERMITIR_ETIQUETADO=true, PERMITIR_ARCHIVADO=true
```

**Hilo utilizado:**
1. Primer mensaje recibido — Asunto: "[PRUEBA-AUTOMATIZACION] CP28-20260721-01 Consulta sobre el contrato". Cuerpo: "¿Podrían revisar la cláusula 4 del contrato antes del jueves?"
2. Respuesta puente enviada desde la cuenta operativa: "Recibido. Revisaremos la consulta."
3. Segundo mensaje recibido dentro del mismo hilo: "Además, necesitamos una copia firmada para el lunes."

### Ejecución preliminar — `DRY_RUN=true`, ~22:00

**Evidencia visible en el registro (según lo informado por Carlos Rubén Bageta):**
- `procesarCorreosDeTareas()` informó: "2 mensajes elegibles, procesando 2".
- Dos `message_id` distintos procesados: `19f875267239b349` y `19f87541d8034391`.
- Cada mensaje produjo 1 observación y 1 tarea simulada.
- Resultados simulados: `Gestión General`/`Alto` y `Comercial`/`Alto`.
- El registro indicó expresamente ausencia de escrituras en hojas de negocio, hojas técnicas y Gmail.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- No hubo modificaciones durante la simulación.

### Ejecución formal — `DRY_RUN=false`, ~22:05

**Evidencia visible en el registro:**
- `procesarCorreosDeTareas()` informó: "2 mensajes elegibles, procesando 2".
- La ejecución terminó correctamente.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- Dos filas nuevas en `Log Mensajes`, una por cada `message_id`.
- Ambos mensajes en estado `PROCESADO` y etapa `FINALIZADO`.
- Una tarea independiente por cada mensaje en `Registro Tareas`.
- Las tareas se escribieron en `Gestión General` y `Comercial`.
- Ambos `message_id` quedaron registrados en `Indice Idempotencia`, sin duplicados.
- `resultado_gmail = ETIQUETADO_Y_ARCHIVADO` para ambos mensajes.
- Ambos mensajes recibidos obtuvieron la etiqueta `Procesado`.
- Ambos mensajes recibidos fueron archivados.
- El mensaje puente enviado no generó tareas ni filas de procesamiento.
- Ningún mensaje fue incorporado únicamente por pertenecer al mismo hilo.

**Nota (Claude Cowork):** no se dispone de número de fila ni `task_id` para ninguno de los dos mensajes — no fueron suministrados.

**Conclusión:** los mensajes recibidos dentro de un mismo hilo se descubren, procesan, escriben y modifican en Gmail de manera individual por `message_id`. No se detectaron incidencias nuevas.

**Estado:** Aprobado (`PASA`).

## Detalle de CP-11 — Mismo mensaje procesado dos veces / idempotencia

```text
Fecha de ejecución: 21/07/2026, aproximadamente 21:43
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Configuración: MODO_PRUEBA=true, DRY_RUN=false, PERMITIR_ETIQUETADO=false, PERMITIR_ARCHIVADO=false,
  GMAIL_QUERY_PRUEBA=in:inbox label:Pruebas-Automatizacion subject:CP10-20260721
```

**Contexto:** los dos mensajes de CP-10 permanecían en Recibidos y conservaban `Pruebas-Automatizacion`, por lo que seguían coincidiendo con la consulta de Gmail configurada. Ambos ya estaban cerrados en `Indice Idempotencia`.

**Evidencia visible en el registro:**
```text
procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0.
```
La ejecución terminó correctamente y no volvió a procesar ninguno de los dos mensajes.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- Ninguna fila nueva en `Finanzas`.
- Ninguna fila nueva en `Desarrollo IT`.
- Ninguna fila nueva en `Log Mensajes`.
- Ninguna fila nueva en `Registro Tareas`.
- Ninguna fila nueva ni duplicada en `Indice Idempotencia`.
- Ninguna modificación en Gmail.
- No hubo llamada a OpenAI ni generación de tareas.

**Conclusión:** `obtenerIdsYaProcesados()`/`Indice Idempotencia` excluyen mensajes ya cerrados aunque Gmail siga devolviéndolos por la consulta configurada.

**Alcance de esta verificación:** confirma la exclusión por `Indice Idempotencia` en el camino normal de descubrimiento (`obtenerMensajesPendientesDesdeGmail()`). **No verifica** la recuperación desde manifiesto (`reanudarDesdeManifiesto()`), que corresponde a CP-32/CP-33/CP-34 y permanece pendiente de ejecución.

**Restauración posterior:**
```text
MODO_PRUEBA=true
DRY_RUN=true
PERMITIR_ETIQUETADO=false
PERMITIR_ARCHIVADO=false
GMAIL_QUERY_PRUEBA=in:inbox label:Pruebas-Automatizacion
```
`ejecutarValidacionVisible()` confirmó nuevamente configuración válida con `dryRun:true`.

**Estado:** Aprobado (`PASA`).

## Detalle de CP-10 — Hoja inexistente (H-04, DEC-006)

```text
Fecha de ejecución: 21/07/2026
Ejecución formal aproximada: 21:18
Cuenta ejecutora: carlosrubenbageta@alia-data.com
```

**Procedimiento:** para preservar la evidencia previa, la hoja `Desarrollo IT` no se eliminó — se renombró temporalmente a `Desarrollo IT__CP10_TEMP`, produciendo el mismo comportamiento de hoja inexistente para `getSheetByName("Desarrollo IT")`. Se prepararon dos mensajes del mismo lote:
- Mensaje A `CP10-20260721-A`: clasificado a `Desarrollo IT`, hoja temporalmente inexistente.
- Mensaje B `CP10-20260721-B`: clasificado a `Finanzas`, hoja existente.

**Evidencia visible en el registro (según lo informado por Carlos Rubén Bageta):**
- `ejecutarValidacionVisible()` informó configuración válida aunque faltaba la hoja de negocio `Desarrollo IT` — confirma H-04/DEC-006.
- `procesarCorreosDeTareas()` encontró exactamente 2 mensajes elegibles.
- El registro indicó: "la hoja 'Desarrollo IT' no existe; 1 tarea(s) sin escribir".

### Mensaje A (`CP10-20260721-A`) — hoja de destino inexistente

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- No se escribió en `Desarrollo IT` ni en ninguna hoja alternativa.
- `Registro Tareas.estado_escritura = ERROR_ESCRITURA`; `fila_destino` quedó vacía.
- `Log Mensajes.estado = REVISION_MANUAL`; `Log Mensajes.etapa = FINALIZADO`.
- `Indice Idempotencia.estado_final = REVISION_MANUAL`.
- `resultado_gmail = SOLO_ETIQUETADO`; `unidades_gmail_api = 1`.
- Recibió la etiqueta individual `Revisión manual/Error de procesamiento`, confirmada entrando en esa etiqueta y buscando `subject:CP10-20260721-A`.
- Permaneció en Recibidos porque el archivado estaba deshabilitado.

### Mensaje B (`CP10-20260721-B`) — hoja de destino existente

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- Se escribió exactamente una fila nueva en `Finanzas`.
- `Registro Tareas.estado_escritura = ESCRITA`; `fila_destino` contiene la fila real.
- `Log Mensajes.estado = PROCESADO`; `Log Mensajes.etapa = FINALIZADO`.
- `Indice Idempotencia.estado_final = PROCESADO`.
- `resultado_gmail = SOLO_ETIQUETADO`; `unidades_gmail_api = 1`.
- Recibió la etiqueta individual `Procesado`, confirmada mediante búsqueda por etiqueta y asunto.
- Permaneció en Recibidos.

**Nota (Claude Cowork):** no se dispone de número de fila, `message_id` ni `task_id` para ninguno de los dos mensajes — no fueron suministrados.

**Conclusión:** una hoja de negocio faltante no aborta `validarConfiguracion()` (H-04/DEC-006) ni afecta el procesamiento de otros mensajes del mismo lote destinados a hojas existentes; el mensaje afectado queda en `REVISION_MANUAL` sin pérdida de datos.

**Restauración:** la hoja fue renombrada de vuelta a `Desarrollo IT` (nombre exacto), conservando sus datos anteriores.

**Estado:** Aprobado (`PASA`).

## Detalle de CP-31 — Matriz operativa de permisos Gmail (INC-FASE8-004)

```text
Fecha de ejecución: 21/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
```

**Estado general:** las cuatro combinaciones operativas de `PERMITIR_ETIQUETADO`/`PERMITIR_ARCHIVADO` y los escenarios de configuración inválida fueron verificados correctamente. CP-31 Aprobado.

### 1. `PERMITIR_ETIQUETADO=false` / `PERMITIR_ARCHIVADO=false`

Verificado previamente mediante CP-01 y CP-36 (no requirió una ejecución nueva):
- El mensaje se cerró `PROCESADO`.
- Gmail permaneció sin cambios.
- `resultado_gmail = OMITIDO_POR_CONFIGURACION`.
- `unidades_gmail_api = 0`.

### 2. `PERMITIR_ETIQUETADO=true` / `PERMITIR_ARCHIVADO=false`

Correo: `CP31-E1-20260721`.

**Evidencia visible en el registro:**
- Se procesó exactamente un mensaje.
- `resultado_gmail = SOLO_ETIQUETADO`.
- `unidades_gmail_api = 1`.
- `error` quedó vacío.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- El mensaje recibió la etiqueta `Procesado`.
- Permaneció en Recibidos.
- Conservó `Pruebas-Automatizacion`.
- `ID_ETIQUETA_PROCESADO=Label_1` corresponde a `nombre=Procesado`, `tipo=user`.
- Aplicación de la etiqueta confirmada objetivamente mediante la búsqueda `label:Procesado subject:CP31-E1-20260721`.
- Filas correctas en la hoja de negocio correspondiente, `Registro Tareas`, `Log Mensajes` e `Indice Idempotencia`.

### 3. `PERMITIR_ETIQUETADO=false` / `PERMITIR_ARCHIVADO=true`

Correo: `CP31-E2-20260721`.

**Nota operativa:** hubo una ejecución previa con cero mensajes elegibles porque `GMAIL_QUERY_PRUEBA` todavía contenía el marcador `CP31-E1-20260721` (del escenario anterior). Se corrigió a `CP31-E2-20260721` antes de la ejecución real. Esa ejecución con cero elegibles no produjo escrituras y no constituye una incidencia de código.

**Evidencia visible en el registro (ejecución corregida):**
- Se procesó exactamente un mensaje.
- `resultado_gmail = SOLO_ARCHIVADO`.
- `unidades_gmail_api = 1`.
- `error` quedó vacío.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- El mensaje salió de Recibidos.
- Conservó `Pruebas-Automatizacion`.
- No recibió `Procesado`.
- Filas correctas en la hoja de negocio correspondiente, `Registro Tareas`, `Log Mensajes` e `Indice Idempotencia`.

### 4. `PERMITIR_ETIQUETADO=true` / `PERMITIR_ARCHIVADO=true`

Correo: `CP31-E3-20260721`.

**Evidencia visible en el registro:**
- Se procesó exactamente un mensaje.
- `resultado_gmail = ETIQUETADO_Y_ARCHIVADO`.
- `unidades_gmail_api = 1`.
- `error` quedó vacío.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- Recibió `Procesado`.
- Salió de Recibidos.
- Conservó `Pruebas-Automatizacion`.
- Filas correctas en la hoja de negocio correspondiente, `Registro Tareas`, `Log Mensajes` e `Indice Idempotencia`.

**Nota (Claude Cowork):** no se dispone de `message_id`, número de fila ni `task_id` para los escenarios 2, 3 y 4 — no fueron suministrados.

### 5. Escenarios de configuración inválida

Verificados por Carlos Rubén Bageta directamente en el registro de `validarConfiguracion()`:

1. `PERMITIR_ETIQUETADO` ausente → rechazado con error explícito.
2. `PERMITIR_ETIQUETADO=si` → rechazado por no ser exactamente `"true"` o `"false"`.
3. `PERMITIR_ARCHIVADO` ausente → rechazado con error explícito.
4. `PERMITIR_ARCHIVADO=si` → rechazado por no ser exactamente `"true"` o `"false"`.
5. `PERMITIR_ETIQUETADO=true` con `ID_ETIQUETA_PROCESADO` ausente → rechazado con `Falta el ID interno de etiqueta para: Procesado`.
6. `PERMITIR_ETIQUETADO=false` con los cuatro `ID_ETIQUETA_*` ausentes → configuración válida; confirma que esos IDs no se exigen cuando no se etiquetará.
7. Restaurados los cuatro IDs originales; la validación final volvió a ser correcta con:
```text
MODO_PRUEBA=true
DRY_RUN=true
PERMITIR_ETIQUETADO=false
PERMITIR_ARCHIVADO=false
```

**Conclusión:** la matriz operativa completa (4/4) y los 6 escenarios de configuración inválida quedan verificados. CP-31 no requiere más ejecuciones.

**Estado:** Aprobado (`PASA`).

## Detalle de CP-36 — Aislamiento de mensajes por hilo (H-03, DEC-005)

```text
Fecha de ejecución: 21/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Configuración: MODO_PRUEBA=true, GMAIL_QUERY_PRUEBA=in:inbox label:Pruebas-Automatizacion subject:CP36-20260721-01,
  PERMITIR_ETIQUETADO=false, PERMITIR_ARCHIVADO=false
```

**Conversación preparada:**
- Mensaje A recibido y etiquetado con `Pruebas-Automatizacion`.
- Una respuesta puente enviada desde la cuenta receptora (mismo hilo).
- Mensaje B recibido posteriormente en el mismo hilo, sin volver a aplicar la etiqueta.

### `DRY_RUN=true`

**Evidencia visible en el registro (según lo informado por Carlos Rubén Bageta):**
- `procesarCorreosDeTareas()` informó exactamente `1 mensajes elegibles, procesando 1`.
- Solo apareció una línea `[DRY_RUN]`.
- `message_id` seleccionado: `19f8698d446c577a`.
- Resultado simulado: 1 observación, 1 tarea, `Desarrollo IT`/`Alto`.
- La ejecución se repitió accidentalmente una vez antes de cambiar la propiedad; ambas pasadas produjeron el mismo resultado.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- No hubo escrituras ni modificaciones en Gmail en ninguna de las dos pasadas.

### Ejecución formal — `DRY_RUN=false`

**Evidencia visible en el registro:**
- `procesarCorreosDeTareas()` informó exactamente `1 mensajes elegibles, procesando 1`.
- Finalizó sin errores.

**Comprobación manual confirmada por Carlos Rubén Bageta:**
- Exactamente una fila nueva en `Desarrollo IT`.
- Exactamente una fila nueva en `Registro Tareas`.
- Exactamente una fila nueva en `Log Mensajes`.
- Exactamente una fila nueva en `Indice Idempotencia`.
- Las cuatro filas corresponden al `message_id 19f8698d446c577a` (Mensaje A).
- Estado de cierre y de escritura correctos.
- No existe una segunda fila correspondiente al Mensaje B.
- Gmail permaneció sin cambios (ambos permisos deshabilitados).

**Nota (Claude Cowork):** no se dispone de número de fila, `task_id` ni capturas archivadas para esta ejecución.

**Conclusión:** `Gmail.Users.Messages.list()` respetó la consulta a nivel de mensaje individual. El Mensaje B no fue incorporado por compartir hilo con el Mensaje A. H-03/DEC-005 queda verificado para el aislamiento por mensaje.

**No verificado por esta ejecución:** el ordenamiento (`pendientes.sort()`) implementado en INC-FASE8-006 — solo un mensaje cumplió la consulta configurada, por lo que no hubo múltiples mensajes elegibles cuyo orden pudiera observarse. Ese aspecto permanece pendiente de una verificación específica (ver nota en INC-FASE8-006).

**Estado:** Aprobado (`PASA`).

## Detalle de CP-27 — Modo prueba con ID productivo

```text
Fecha y hora: 20/07/2026 19:04:22
Cuenta ejecutora: carlosrubenbageta@alia-data.com
MODO_PRUEBA: true
DRY_RUN: true
PERMITIR_ETIQUETADO: false
PERMITIR_ARCHIVADO: false
```

**Resultado esperado:** la configuración debe rechazarse cuando `SPREADSHEET_ID_PRUEBA` coincide con `SPREADSHEET_ID`. La función principal debe finalizar sin modificar Gmail, Google Sheets ni realizar llamadas operativas a OpenAI.

**Resultado observado:** efectivamente ocurrió lo esperado.

**Evidencia revisada por Claude Cowork** (las 3 capturas listadas en la tabla):
1. `01_configuracion_rechazada.png` — `ejecutarValidacionVisible()` (`pruebas/debug_seguro_pruebas.gs`) registra: *"configuración inválida: SPREADSHEET_ID_PRUEBA coincide con el SPREADSHEET_ID productivo: abortar."*
2. `02_funcion_principal_abortada.png` — `procesarCorreosDeTareas()` registra la misma detección de `validarConfiguracion()` y agrega: *"procesarCorreosDeTareas(): abortando por configuración inválida... abortar."* Confirma que la función principal también aborta, no solo la validación aislada.
3. `04_configuracion_restaurada.png` — tras restaurar `SPREADSHEET_ID_PRUEBA` a un valor distinto del productivo, `ejecutarValidacionVisible()` muestra configuración válida con `openaiApiKey: "[REDACTADA]"` (la redacción funciona correctamente) y el resto de los campos de la lista blanca, confirmando que el entorno quedó operativo para continuar con los casos siguientes.

**Nota de Claude Cowork (no bloqueante, para tener en cuenta en otros casos):** la captura 3 muestra `fechaInicioCorte: "2026-07-20T03:00:00.000Z"` configurado. Si algún correo sintético de otro caso (por ejemplo, CP-20, que depende justamente de `FECHA_INICIO_CORTE`) se envía con fecha/hora anterior a ese corte, quedaría excluido por antigüedad — tenerlo presente al interpretar resultados de casos que dependan de la fecha del mensaje.

**Estado:** Aprobado (`PASA`).

## Detalle de CP-37 — Validación estricta de MODO_PRUEBA, DRY_RUN y GMAIL_QUERY_PRUEBA

```text
Fecha y hora: 21/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Correcciones validadas: H-01, H-02 (Lote 1, 21/07/2026) + INC-FASE8-007 (barrera temprana, 21/07/2026)
```

**Escenarios verificados y resultado observado:**

1. `MODO_PRUEBA=TRUE` (mayúsculas) → rechazado. `leerBooleanoEstricto()` exige `"true"` o `"false"` exactos.
2. `MODO_PRUEBA` ausente → rechazado. Barrera INC-FASE8-007 activada: retorno inmediato con `valido: false` antes de evaluar `spreadsheetIdEfectivo` o cualquier lógica de entorno.
3. `DRY_RUN=TRUE` (mayúsculas) → rechazado. Mismo mecanismo.
4. `MODO_PRUEBA=true`, `GMAIL_QUERY_PRUEBA` ausente → rechazado. Sin fallback silencioso a `in:inbox`.
5. `MODO_PRUEBA=true`, `GMAIL_QUERY_PRUEBA=in:inbox` (sin `label:Pruebas-Automatizacion`) → rechazado: la consulta no contiene el label de aislamiento.
6. `MODO_PRUEBA=true`, `ETIQUETA_PRUEBA` ausente → rechazado.
7. Restauración final con `MODO_PRUEBA=true`, `DRY_RUN=true`, `GMAIL_QUERY_PRUEBA=in:inbox label:Pruebas-Automatizacion`, `ETIQUETA_PRUEBA=Pruebas-Automatizacion` y planilla de prueba → configuración válida.

**Evidencia:** `pruebas/evidencias/CP-27/05.png` a `10.png` (6 capturas, almacenadas en la carpeta de CP-27 por corresponder al mismo flujo de `validarConfiguracion()` / `ejecutarValidacionVisible()`).

**Nota (Claude Cowork):** las capturas no son accesibles directamente por Claude Cowork (sin acceso a Google Workspace). El resultado se registra en base al informe de Carlos Rubén Bageta (21/07/2026).

**Estado:** Aprobado (`PASA`).

## Detalle de CP-23 — Texto que comienza como fórmula (INC-FASE8-009)

```text
Fecha de ejecución: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
```

**Intento de preparación descartado (no constituye evidencia válida de CP-23):** `message_id 19f8aa19567a9b82`. El asunto se envió por error sin el signo `=` inicial. Se conserva únicamente como registro del intento no válido.

**Ejecución válida:**
- Asunto exacto en Gmail: `=CONCAT("CP23-20260722-02","-FORMULA")`.
- `message_id 19f8ab1e4b126f56`.

### `DRY_RUN=true`

- 1 mensaje elegible; 1 observación; 1 tarea simulada (`Comercial`/`Alto`); ninguna escritura.

### Ejecución formal `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`

**`Log Mensajes`, fila 20, columna asunto (F20):**
- Contenido visible: `#ERROR!`.
- Barra de fórmulas: `=CONCAT("CP23-20260722-02","-FORMULA")`.
- **Esto demuestra que Sheets intentó ejecutar la fórmula.**

**`Registro Tareas`, fila 19:**
- `task_id ALI-7576DEA84BEA5CDE-001`, `message_id 19f8ab1e4b126f56`, `tablero Comercial`, `estado_escritura ESCRITA`, `fila_destino 10`.

**`Comercial`, fila 10, columna Asunto original:**
- Muestra literalmente `=CONCAT("CP23-20260722-02","-FORMULA")`.
- No se evaluó ni produjo `#ERROR!`; la sanitización de la hoja de negocio funcionó.

**Conclusión:** confirmada una vulnerabilidad real de inyección de fórmulas en `Log Mensajes` (hoja técnica). La hoja de negocio `Comercial` ya estaba protegida por `escribirFilasPorLote()`.

### Diagnóstico y corrección

Causa raíz, corrección aplicada y pruebas: ver `pruebas/resultados/INCIDENCIAS_FASE_8.md`, INC-FASE8-009, y `auditoria/CHANGELOG.md`. Resumen: `registrarInicioProcesamiento()` escribía remitente/asunto sin sanitizar en ambas ramas (fila nueva y fila reutilizada) — causa exacta del `#ERROR!`. Se aplicó además el mismo patrón de corrección, preventivamente, a `actualizarLogMensajes()` (cualquier campo string) y a `persistirManifiestoTareas()` (`resumen`/`observacionTextoOriginal` en `Registro Tareas`), reutilizando `sanitizarValoresParaSheets()` en los tres puntos.

**Pruebas deterministas:** `pruebas/pruebas_sanitizacion_hojas_tecnicas.gs`, 17 verificaciones (los cuatro prefijos peligrosos en fila nueva; remitente y asunto en fila reutilizada; campo string posterior vía `actualizarLogMensajes()`; valor string normal sin modificar; tipos no string —`number`, `boolean`, `Date`, vacío— preservados; `resumen`/`observacionTextoOriginal` sanitizados y sin modificar cuando son normales; valor de catálogo `tablero` intacto), todas `PASA`. Ejecutadas localmente, sin acceso a Google Workspace.

**No modificado ni eliminado:** la celda F20 de `Log Mensajes` con `#ERROR!`, la fila 20 completa, la fila 19 de `Registro Tareas` (con `fila_destino=10`), la fila 10 de `Comercial`, ni el registro del intento de preparación descartado (`19f8aa19567a9b82`).

**Procedimiento de regresión:** el `message_id 19f8ab1e4b126f56` no debe reutilizarse. Reejecutar CP-23 con un mensaje nuevo (por ejemplo, asunto `=CONCAT("CP23-20260722-03","-FORMULA")`), comprobando también PE-01 y PE-02 (`pruebas/PRUEBAS_ESCRITURA.md`). CP-23 solo se aprueba cuando tanto las hojas técnicas como la hoja de negocio almacenen literalmente los valores peligrosos, sin ejecutarlos.

**Estado (histórico de esta ejecución, 22/07/2026):** Rechazado — INC-FASE8-009, corrección aplicada, regresión pendiente. **Este registro se conserva íntegro como antecedente** — el veredicto final de CP-23 está en la sección siguiente.

## Detalle de CP-23 — Regresión aprobada (22/07/2026)

```text
Fecha de ejecución: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
```

**Procedimiento:** se copiaron al proyecto de Apps Script de prueba las versiones corregidas de `codigo/script_refactorizado.gs` e `codigo/idempotencia.gs` (INC-FASE8-009). Mensaje nuevo, sin reutilizar el `message_id` vulnerable original (`19f8ab1e4b126f56`):
- Asunto exacto: `=CONCAT("CP23-20260722-03","-FORMULA")`.
- `message_id 19f8afd5236e6cf7`.

### `DRY_RUN=true`

- 1 mensaje elegible, 1 observación, 1 tarea simulada (`Comercial`/`Alto`), sin escrituras.

### Ejecución formal `DRY_RUN=false`, ambos permisos de Gmail desactivados

- 1 mensaje elegible y procesado; ejecución completada.

**`Log Mensajes`, fila física 21:**
- Asunto almacenado **literalmente** como `=CONCAT("CP23-20260722-03","-FORMULA")`.
- No produjo `#ERROR!` ni ejecutó la fórmula.
- `estado = PROCESADO`, `etapa = FINALIZADO`, `cantidad_observaciones = 1`, `cantidad_tareas = 1`, `resultado_gmail = OMITIDO_POR_CONFIGURACION`.

**`Registro Tareas`, fila física 20:**
- `task_id ALI-6FE9C44A57429639-001`, `message_id 19f8afd5236e6cf7`, `tablero Comercial`, `estado_escritura ESCRITA`, `fila_destino 11`.

**`Comercial`, fila física 11:**
- El asunto peligroso se almacenó literalmente y no se ejecutó.

**Conclusión:** la regresión real confirmó la protección del asunto peligroso en `Log Mensajes` y `Comercial`. `Registro Tareas` confirmó la creación correcta del manifiesto y su relación con `fila_destino=11`; la protección de sus campos de texto libre, `resumen` y `observacionTextoOriginal`, está cubierta por las 17/17 pruebas deterministas. La corrección de INC-FASE8-009 queda verificada con evidencia real.

**PE-01** queda verificado mediante esta regresión real. **PE-02** queda respaldado por las 17/17 pruebas deterministas de `pruebas/pruebas_sanitizacion_hojas_tecnicas.gs` (cubren los prefijos `=`, `+`, `-`, `@`), junto con la comprobación real en Google Sheets del mecanismo de protección.

**Evidencia original vulnerable — conservada íntegra, no sustituida ni eliminada:** `Log Mensajes` fila 20 con `#ERROR!`, `message_id 19f8ab1e4b126f56`; `Registro Tareas` fila física 19, con `fila_destino=10`; `Comercial` fila física 10 (ver sección anterior de este documento, "Detalle de CP-23 — Texto que comienza como fórmula (INC-FASE8-009)").

**Relación con INC-FASE8-009:** esta regresión confirma el cierre de la incidencia — ver `pruebas/resultados/INCIDENCIAS_FASE_8.md`, estado actualizado a "Corrección aplicada y verificada — CP-23 Aprobado".

**Estado (veredicto final):** Aprobado — 22/07/2026 (`PASA`).

## Detalle de CP-02 — Cinco observaciones, tres tareas (INC-FASE8-010)

```text
Fecha de ejecución: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
message_id: 19f8b6ac1946a47e
```

**Correo usado:**
```text
1. El viernes tuvimos un problema con el servidor, ya se resolvió solo (informativo, sin acción).
2. Necesitamos renovar la licencia de Office antes de fin de mes.
3. El cliente ABC pidió una actualización del estado de su factura.
4. Recordatorio: la reunión de directorio fue reprogramada (informativo, sin acción).
5. Hay que preparar el informe de gastos de julio para el socio de administración.
```

### `DRY_RUN=true`

**Evidencia visible en el registro:**
- `procesarCorreosDeTareas()` informó "1 mensaje elegible".
- Log `[DRY_RUN]`: `19f8b6ac1946a47e: 3 observación(es), 3 tarea(s) simulada(s) [Gestión General/Alto, Comercial/Medio, Finanzas/Medio]`.
- Sin escrituras en hojas técnicas, hojas de negocio ni Gmail.

**Resultado esperado vs. observado:**
- Esperado: 5 observaciones (correspondientes a los 5 puntos numerados); 3 con tareas (puntos 2, 3, 5); 2 con `tareas: []` (puntos 1, 4).
- Observado: solo 3 observaciones — los puntos 1 y 4 (informativos) fueron omitidos por completo del arreglo `observaciones`, en lugar de aparecer con `tareas: []`.

**Diagnóstico (INC-FASE8-010):** `construirPromptSistema()` (`codigo/prompts_ia.gs`) no distinguía explícitamente un correo **mixto** (con al menos una acción pendiente) de un correo **totalmente informativo**. La regla "si el correo completo no tiene ninguna acción pendiente, devolvé observaciones: []" quedaba ambigua frente a "identificá TODAS las observaciones... si no pide ninguna acción, su lista de tareas va vacía", permitiendo que el modelo aplicara la primera regla observación por observación en vez de reservarla para el correo completo. Ver diagnóstico completo en `pruebas/resultados/INCIDENCIAS_FASE_8.md`, INC-FASE8-010, y `auditoria/CHANGELOG.md`.

**Corrección aplicada:** `codigo/prompts_ia.gs`, `construirPromptSistema()` — se agregaron reglas explícitas: (a) si el correo tiene al menos una acción pendiente, conservar TODAS las ideas distintas, incluidas las informativas con `tareas: []`; (b) `observaciones: []` se reserva exclusivamente para cuando el correo completo no tiene ninguna acción pendiente; (c) en listas numeradas o con viñetas, cada punto distinto se evalúa por separado. Sin cambios en `codigo/esquema_json.gs` ni en `validarRespuestaIA()` — no se introdujo una validación por cantidad basada en listas numeradas.

**Pruebas deterministas (v1):** `pruebas/pruebas_prompt_observaciones_mixtas.gs`, 11 verificaciones sobre el texto del prompt (presencia y coherencia de las reglas para correo mixto, correo totalmente informativo y correo totalmente operativo), todas `PASA`. Estas pruebas no reemplazan una ejecución real contra el modelo — solo confirman que el prompt contiene las instrucciones correctas.

**No modificado ni eliminado:** el registro `[DRY_RUN]` de la ejecución real (`message_id 19f8b6ac1946a47e`) permanece como evidencia de la incidencia.

**Estado (histórico de esta ejecución, 22/07/2026):** Rechazado — corrección aplicada, regresión real pendiente. **Esta verificación se realizó y su resultado se documenta en la sección siguiente — no permanece "pendiente".**

## Detalle de CP-02 — Primera regresión (fallida) y corrección v2 (22/07/2026)

```text
Fecha de ejecución: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
message_id: 19f8b7de84ba9e5b (nuevo, distinto del anterior)
```

**Procedimiento:** se copió al proyecto de Apps Script de prueba la versión de `codigo/prompts_ia.gs` corregida tras el diagnóstico original (reglas explícitas de correo mixto/arreglo vacío exclusivo/listas numeradas). Se ejecutó CP-02 con un mensaje nuevo, sin reutilizar el `message_id` anterior.

### `DRY_RUN=true`

**Evidencia visible en el registro:**
- `procesarCorreosDeTareas()` informó "1 mensaje elegible, procesando 1".
- Log `[DRY_RUN]`: `19f8b7de84ba9e5b: 3 observación(es), 3 tarea(s) simulada(s) [Gestión General/Alto, Comercial/Medio, Finanzas/Alto]`.
- Sin escrituras en Gmail ni Sheets. No se ejecutó con `DRY_RUN=false`.

**Resultado:** idéntico al de la ejecución original — los puntos informativos 1 y 4 volvieron a ser omitidos, con el mismo conteo 3/3.

**Conclusión:** la primera corrección (reglas de texto en el prompt) **no fue suficiente**. Se revisó el flujo completo, no solo el texto del prompt:
- `codigo/cliente_openai.gs`, `consultarIAExtractora()`/`construirPayloadOpenAI()`: construye `userContent` y `payload` (con `response_format` de `obtenerEsquemaJsonRespuestaIA()` y `temperature: 0.2`) sin ninguna transformación adicional; `contenidoCrudo` es el JSON crudo del modelo.
- `procesarUnMensajeSimulado()` / `validarRespuestaIA()`: el conteo logueado (`validacionIA.datos.observaciones.length`) es exactamente el tamaño del arreglo `observaciones` devuelto por el modelo — **confirmado por lectura de código, no supuesto**, que no existe ningún filtrado de observaciones entre la respuesta de la IA y el log.
- **Causas candidatas evaluadas** (sin atribuir una única causa definitiva sin evidencia): (a) no hay evidencia que confirme que la llamada real usó efectivamente el prompt actualizado (posible problema de despliegue, no verificable sin acceso a Google Workspace); (b) las reglas de texto pueden ser insuficientes como mecanismo de control sin un ejemplo concreto; (c) `temperature=0.2` se descarta como explicación principal — la reproducción **idéntica** del mismo patrón en dos ejecuciones independientes es más compatible con un sesgo sistemático que con ruido de muestreo.

**Corrección v2 aplicada:**
- `codigo/prompts_ia.gs`: nuevo ejemplo completo de correo mixto con lista numerada (4 puntos → 4 observaciones, con `numero`/`texto_original` preservados y puntos informativos con `tareas: []`), distinto del correo real de CP-02. Nueva constante `VERSION_PROMPT_SISTEMA` (identificador corto, no sensible).
- `codigo/cliente_openai.gs`: `consultarIAExtractora()` registra `VERSION_PROMPT_SISTEMA` mediante `Logger.log()` en cada llamada real — nunca el prompt completo ni el cuerpo del correo. Refactor interno: extracción de `construirPayloadOpenAI()` (mismo comportamiento, ahora testeable sin llamar a la red).
- **Sin cambios** en `codigo/esquema_json.gs` ni en `validarRespuestaIA()` — no se agrega una validación de cobertura por conteo.
- **Sin cambio** de `temperature` (se mantiene en `0.2`).

**Pruebas deterministas (v2):** `pruebas/pruebas_prompt_observaciones_mixtas.gs` ampliado a 28 verificaciones — además de las 11 de presencia textual, se agregaron: construcción real del payload de la API (`construirPayloadOpenAI()`, función de producción, no un duplicado), presencia y estructura del ejemplo few-shot, presencia del identificador de versión, y dos casos de validación con `validarRespuestaIA()` sobre respuestas simuladas: un caso **positivo** (5 observaciones, 2 con `tareas: []`, pasa la validación) y un caso **negativo** (solo 3 observaciones, el mismo patrón real, que **también pasa** sin marcarse como error — demuestra de forma determinista que no existe hoy una validación de cobertura). Todas `PASA` (28/28).

**No modificado ni eliminado:** el registro `[DRY_RUN]` de ambas ejecuciones reales (`19f8b6ac1946a47e` y `19f8b7de84ba9e5b`) permanece como evidencia.

**Procedimiento de la segunda regresión:** reejecutar CP-02 con un tercer `message_id` nuevo (no reutilizar ninguno de los dos anteriores) y confirmar 5 observaciones (3 con tareas para los puntos 2/3/5, 2 con `tareas: []` para los puntos 1/4). Verificar además, en el registro de ejecución de Apps Script, que aparece la línea `consultarIAExtractora(): usando prompt versión v3-INC-FASE8-010-ejemplo-cobertura` — confirma que la llamada real usó el prompt actualizado.

**Estado (histórico de esta ejecución, 22/07/2026):** Rechazado — corrección v2 aplicada, segunda regresión real pendiente. **Esta segunda regresión ya se ejecutó y aprobó — ver la sección siguiente.**

## Detalle de CP-02 — Segunda regresión (aprobada) y cierre de INC-FASE8-010 (22/07/2026)

```text
Fecha de ejecución: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
message_id: 19f8baee9f470b10 (nuevo, distinto de los dos anteriores)
```

**Procedimiento:** se copiaron al proyecto de Apps Script de prueba las versiones corregidas de `codigo/prompts_ia.gs` (v2, ejemplo few-shot acotado al correo MIXTO) e `codigo/cliente_openai.gs`. Se ejecutó CP-02 con un tercer mensaje nuevo, sin reutilizar `19f8b6ac1946a47e` ni `19f8b7de84ba9e5b`.

### Confirmación del prompt efectivamente usado

**Evidencia visible en el registro:** la línea `consultarIAExtractora(): usando prompt versión v3-INC-FASE8-010-ejemplo-cobertura` — confirma que la llamada real usó efectivamente el prompt corregido.

### `DRY_RUN=true`

- `procesarCorreosDeTareas()` informó "1 mensaje elegible, procesando 1".
- **5 observaciones**; 3 tareas simuladas: `Gestión General/Alto`, `Comercial/Medio`, `Finanzas/Alto`.
- Sin escrituras en hojas de negocio, hojas técnicas ni Gmail.

### Ejecución formal (`MODO_PRUEBA=true`, `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`)

**Comprobación manual confirmada por Carlos Rubén Bageta:**

- **`Log Mensajes`:** `estado = PROCESADO`, `etapa = FINALIZADO`, `cantidad_observaciones = 5`, `cantidad_tareas = 3`, `resultado_gmail = OMITIDO_POR_CONFIGURACION`.
- **`Registro Tareas`:** exactamente 3 filas, `estado_escritura = ESCRITA`, tableros `Gestión General`, `Comercial` y `Finanzas`.
- **Hojas de negocio:** exactamente una tarea nueva en cada tablero correspondiente.
- **`Indice Idempotencia`:** las tres tareas registradas como `PROCESADO`.
- **Gmail:** el mensaje permaneció en Recibidos, conservó `Pruebas-Automatizacion`, no recibió etiquetas operativas, no fue archivado.
- Configuración restaurada a `DRY_RUN=true` al finalizar.

**Nota (Claude Cowork):** no se dispone de números de fila concretos en `Registro Tareas`/`Log Mensajes`/`Indice Idempotencia` ni rutas de capturas para esta ejecución — no fueron suministrados.

**Conclusión:** CP-02 PASA. Las 5 observaciones esperadas se generaron correctamente (2 informativas con `tareas: []`, 3 con tarea), confirmando que el ejemplo few-shot acotado al correo MIXTO resolvió el patrón de omisión de las dos ejecuciones anteriores.

**Evidencia de las dos ejecuciones fallidas anteriores — conservada íntegra, no sustituida ni eliminada:** `message_id 19f8b6ac1946a47e` y `19f8b7de84ba9e5b` (ver secciones anteriores de este documento).

**Relación con INC-FASE8-010:** esta regresión confirma el cierre de la incidencia — ver `pruebas/resultados/INCIDENCIAS_FASE_8.md`, estado actualizado a "Corrección aplicada y verificada — CP-02 Aprobado".

**Estado (veredicto final):** Aprobado — 22/07/2026 (`PASA`).

## Detalle de CP-24 — Varias cuentas Google abiertas (PE-06)

```text
Fecha de verificación: 22/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
Caso relacionado: PE-06 (pruebas/PRUEBAS_ESCRITURA.md)
```

**Procedimiento:** ventana de incógnito con dos cuentas Google abiertas en la misma sesión — una cuenta personal abierta primero, `carlosrubenbageta@alia-data.com` abierta después. La cuenta operativa quedó en la posición `/u/1/`, no en `/u/0/`. Se abrió el enlace ya existente de la columna "Link al correo" de una fila real, construido mediante `?authuser=carlosrubenbageta@alia-data.com#search/rfc822msgid:...` (corrección de la Fase 7, `documentacion/MAPA_ESCRITURA.md`).

**Evidencia visible (según lo informado por Carlos Rubén Bageta):**
- Gmail resolvió automáticamente la cuenta operativa como `/mail/u/1/`.
- La búsqueda por `rfc822msgid` devolvió exactamente un resultado.
- Al abrirlo se mostró el mensaje correcto (`=CONCAT("CP23-20260722-03","-FORMULA")`, de la regresión de CP-23).
- El correo se abrió en `carlosrubenbageta@alia-data.com`, no en la cuenta personal.
- No fue necesario elegir manualmente una cuenta.

**Conclusión:** el parámetro `authuser` del enlace resuelve la cuenta operativa correcta, independientemente de la posición (`/u/0/`, `/u/1/`, etc.) que esa cuenta ocupe dentro de la sesión del navegador.

**No ejecutado:** Apps Script. **No modificado:** Gmail ni Sheets. Esta verificación fue una navegación manual sobre un enlace generado por una ejecución previa (CP-23).

**Estado:** Aprobado (`PASA`).

## Detalle de CP-03 — Una observación, dos tareas (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-02-DOS-TAREAS
runId: cceca797-90ec-4493-bfbc-f3a79ad3e782
message_id: 19f953e0047d2478 (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** a diferencia de los demás casos de este documento (ejecutados manualmente en el proyecto productivo/de prueba directo), CP-03 se ejecutó íntegramente a través del automatizador de integración de Fase 2A (`pruebas/automatizador_integracion_fase8.gs`, fixture `INT-FASE8-02-DOS-TAREAS`), que corre el pipeline real (Gmail → IA → Sheets → Gmail) contra el proyecto de Apps Script de prueba, verificando automáticamente cada paso. Antes de esta corrida aprobada, tres corridas reales previas expusieron y permitieron corregir dos falsos negativos del verificador y una ambigüedad del texto sintético — ninguno fue un defecto del pipeline productivo (`codigo/*.gs`); el detalle completo de las tres está en `auditoria/CHANGELOG.md` y `documentacion/AUTOMATIZACION_INTEGRACION_FASE8.md` (secciones 9.1.1 a 9.1.3):

1. `runId 5fbcd128-04a8-4fc8-88a7-78aa279ebd10` / `message_id 19f948e5d35b5276`: `SIMULACION_OK`, pero `FORMAL_FALLIDO` — falso negativo del verificador, que asumía los encabezados de una hoja de negocio en la fila 1 en vez del preámbulo real (fila 4). Corregido con `localizarFilaEncabezadosNegocio_()`.
2. `runId 3b2883e9-5f26-4269-a3c1-1cbe4d14a7ed` / `message_id 19f94b94245ce658`: `SIMULACION_OK` pese a clasificar `Desarrollo IT` + `Soporte` en vez de `Desarrollo IT` + `Comercial` — la simulación no comparaba la clasificación obtenida contra el fixture. Corregido con `verificarClasificacionSimulada_()` y una redacción del cuerpo que nombra explícitamente al "equipo comercial".
3. `runId d873deb0-3d57-49f7-a88f-e51ef70e12a7` / `message_id 19f95060d93922fb`: con la corrección anterior ya aplicada y funcionando, `SIMULACION_FALLIDO` (`SIMULACION_CANTIDAD_OBSERVACIONES:2`) — el cuerpo sintético todavía se leía como dos pedidos paralelos en vez de un único tema con dos acciones. Corregido con la redacción final del cuerpo.

Ninguno de los tres `message_id` anteriores se reutilizó ni se reclasificó como aprobado; esta corrida usa un `message_id` nuevo.

### Simulación (`simularYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado.
- `[DRY_RUN] 19f953e0047d2478: 1 observación(es), 2 tarea(s) simulada(s) [Desarrollo IT/Alto, Comercial/Medio]` — coincide exactamente con lo exigido por CP-03.
- `verificarClasificacionSimulada_()` confirmó cantidad de observaciones, cantidad de tareas y multiset de tablero contra `fixture.esperado`, sin discrepancias.
- El automatizador comprobó que no hubo cambios en Gmail ni en las ocho hojas (técnicas y de negocio).
- Resultado final: `[AUTO-FASE8] SIMULACION_OK`.

### Ejecución formal y comprobaciones automáticas (`ejecutarFormalYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el mismo `message_id`, con el mismo `runId`/nonce/fingerprint que la simulación (sin re-preparar sesión).
- `Log Mensajes`: exactamente una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=2`, `resultado_gmail=SOLO_ETIQUETADO`.
- `Registro Tareas`: exactamente 2 filas para el mensaje; `task_id` no vacío y distinto en cada una; `estado_escritura=ESCRITA` en ambas; tableros exactamente `Desarrollo IT` y `Comercial`; mismo `observacion_texto_original` (no vacío) en ambas filas.
- `Indice Idempotencia`: exactamente 2 entradas, `estado_final=PROCESADO`, cuyos `task_id` coinciden exactamente con los de `Registro Tareas`.
- Una fila nueva en `Desarrollo IT` y una en `Comercial`, vinculadas por la columna `ID` a esos `task_id`; `Finanzas`, `Soporte` y `Gestión General` permanecieron idénticas al baseline.
- Gmail conservó `Pruebas-Automatizacion` e `INBOX`, recibió `Procesado`, no recibió ninguna etiqueta de revisión/error y no fue archivado.
- Resultado final: `[AUTO-FASE8] FORMAL_OK`.

**Conclusión:** CP-03 PASA. La observación con dos acciones concretas (revisar el error técnico → `Desarrollo IT`; avisar al cliente → `Comercial`) generó exactamente las dos tareas esperadas en los tableros correctos, con el mismo `texto_original`, sin ninguna escritura indebida en las hojas no involucradas.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-04 — Tareas para tres hojas (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-04-TRES-TAREAS
runId: 26c92904-c613-4a07-b34b-01a766da3710
message_id: 19f95bc29ad0717d (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03, se ejecutó íntegramente a través del automatizador de integración de Fase 2A (`pruebas/automatizador_integracion_fase8.gs`, fixture `INT-FASE8-04-TRES-TAREAS`), que reutiliza `verificarResultadoFormal_()`/`verificarClasificacionSimulada_()` **sin ningún cambio de código** — ya generalizados a N tareas por CP-03. Una primera corrida real (`message_id 19f95a4113a1fb97`) clasificó correctamente los tres tableros pero como 4 observaciones en vez de 1 (una cláusula de encuadre del cuerpo se leyó como una observación informativa separada); `verificarClasificacionSimulada_()` bloqueó la formal correctamente y esa evidencia se conserva sin reutilizar el `message_id` (detalle completo en `auditoria/CHANGELOG.md` y `documentacion/AUTOMATIZACION_INTEGRACION_FASE8.md`, sección 9.2.1). Tras reescribir el cuerpo como una única instrucción imperativa continua, esta corrida (con un `message_id` nuevo) aprobó al primer intento.

### Simulación (`simularYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado.
- `[DRY_RUN] 19f95bc29ad0717d: 1 observación(es), 3 tarea(s) simulada(s) [Desarrollo IT/Alto, Finanzas/Alto, Comercial/Medio]` — coincide exactamente con lo exigido por CP-04.
- `verificarClasificacionSimulada_()` confirmó cantidad de observaciones, cantidad de tareas y multiset de tablero contra `fixture.esperado`, sin discrepancias.
- El automatizador comprobó que no hubo cambios en Gmail ni en las ocho hojas (técnicas y de negocio).
- Resultado final: `[AUTO-FASE8] SIMULACION_OK`.

### Ejecución formal y comprobaciones automáticas (`ejecutarFormalYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el mismo `message_id`, con el mismo `runId`/nonce/fingerprint que la simulación (sin re-preparar sesión).
- `Log Mensajes`: exactamente una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=3`, `resultado_gmail=SOLO_ETIQUETADO`.
- `Registro Tareas`: exactamente 3 filas para el mensaje; `task_id` no vacío y distinto en cada una; `estado_escritura=ESCRITA` en las tres; tableros exactamente `Desarrollo IT`, `Finanzas` y `Comercial`; mismo `observacion_texto_original` (no vacío) en las tres filas.
- `Indice Idempotencia`: exactamente 3 entradas, `estado_final=PROCESADO`, cuyos `task_id` coinciden exactamente con los de `Registro Tareas`.
- Una fila nueva en cada una de `Desarrollo IT`, `Finanzas` y `Comercial`, vinculadas por la columna `ID` a esos `task_id`.
- Gmail conservó `Pruebas-Automatizacion` e `INBOX`, recibió `Procesado`, no recibió ninguna etiqueta de revisión/error y no fue archivado.
- Resultado final: `[AUTO-FASE8] FORMAL_OK`.

**Conclusión:** CP-04 PASA. La observación con tres acciones concretas (revisar el error técnico → `Desarrollo IT`; procesar la devolución → `Finanzas`; confirmarle al cliente → `Comercial`) generó exactamente las tres tareas esperadas en los tableros correctos, con el mismo `texto_original`.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-15 — Observaciones duplicadas (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-05-OBSERVACIONES-DUPLICADAS
runId: 01fbd80c-a874-4eed-82a6-c21a14b8070f
message_id: 19f9621b19597350 (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03 y CP-04, se ejecutó íntegramente a través del automatizador de integración de Fase 2A. Este fixture reutiliza la generalización a N tareas de `verificarResultadoFormal_()`/`verificarClasificacionSimulada_()` en **N=1** (ya confirmada en N=2 por CP-03 y N=3 por CP-04), y es la primera corrida real que ejercita RF-04 (`documentacion/REGLAS_FUNCIONALES.md`) — consolidación de observaciones que piden literalmente la misma acción. El cuerpo enviado repite el mismo pedido dos veces **sin ningún marcador de cita/respuesta** (a diferencia del enunciado original de CP-03, que usa un bloque citado tipo "El [fecha] escribió:\n> ..."): ese patrón lo recorta `extraerContenidoNuevo()` antes de llegar a la IA, lo que hubiera probado el recorte de citas (ya cubierto por 19/19 pruebas locales) en vez de la consolidación de RF-04. Ver `auditoria/CHANGELOG.md` para el detalle completo de esta decisión de diseño.

### Simulación (`simularYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado.
- `[DRY_RUN] 19f9621b19597350: 1 observación(es), 1 tarea(s) simulada(s) [Finanzas/Alto]` — coincide exactamente con lo exigido por CP-15, resolviendo al primer intento la ambigüedad reconocida de antemano (¿la IA consolidaría también a nivel de observación, o dejaría 2 observaciones con 1 tarea combinada?): consolidó también la observación.
- `verificarClasificacionSimulada_()` confirmó cantidad de observaciones, cantidad de tareas y tablero contra `fixture.esperado`, sin discrepancias.
- El automatizador comprobó que no hubo cambios en Gmail ni en las ocho hojas (técnicas y de negocio).
- Resultado final: `[AUTO-FASE8] SIMULACION_OK`.

### Ejecución formal y comprobaciones automáticas (`ejecutarFormalYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el mismo `message_id`, con el mismo `runId`/nonce/fingerprint que la simulación (sin re-preparar sesión).
- `Log Mensajes`: exactamente una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`.
- `Registro Tareas`: exactamente 1 fila para el mensaje; `task_id` no vacío; `estado_escritura=ESCRITA`; tablero exactamente `Finanzas`.
- `Indice Idempotencia`: exactamente 1 entrada, `estado_final=PROCESADO`.
- Una fila nueva en `Finanzas`, vinculada por la columna `ID` a ese `task_id`.
- Gmail conservó `Pruebas-Automatizacion` e `INBOX`, recibió `Procesado`, no recibió ninguna etiqueta de revisión/error y no fue archivado.
- Resultado final: `[AUTO-FASE8] FORMAL_OK`.

**Conclusión:** CP-15 PASA. El mismo pedido repetido dos veces en el cuerpo se consolidó en una única tarea (`Finanzas`), no en dos filas duplicadas — confirma que RF-04 está correctamente codificada en el prompt real y que el modelo la sigue.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-12 (Variante A) — Caída después de escritura parcial (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 24/07/2026
message_id (caso principal): 19f96ec29b3c8486 (nuevo)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP12_FORZAR_FALLO_GMAIL
en aplicarResultadoGmail() (codigo/script_refactorizado.gs) — ya retirado del código.
```

**Antecedente:** a diferencia de CP-03/CP-04/CP-14-18/CP-07, este es un caso **clásico** de Fase 8 (ejecutado con `procesarCorreosDeTareas()` directamente, no vía el automatizador de integración de Fase 2A). Corrige el criterio original de este caso (INC-FASE8-005): la recuperación real ocurre en la **entrada** de `procesarUnMensaje()` (comprobación de manifiesto persistido), no solo vía `recuperarProcesamientosAbandonados()`/`UMBRAL_ABANDONO_MIN`.

### Primera corrida (falla simulada activa)

- Correo sintético nuevo: "Hay que revisar el error técnico que generó una factura duplicada, y el equipo comercial debe avisarle al cliente que ya estamos trabajando en la solución." (`message_id 19f96ec29b3c8486`).
- La IA clasificó 2 observaciones / 2 tareas (no 1/2 como se había diseñado, pero no afecta la validez de la prueba).
- `escribirFilasPorLote()` escribió las 2 tareas (`ESCRITA` en `Registro Tareas`, con `fila_destino` real).
- `aplicarResultadoGmail()` lanzó la excepción sintética; `gestionarErrorMensaje()` encontró el manifiesto ya persistido y dejó `Log Mensajes.estado = ERROR_TEMPORAL`, con `etapa = ESCRITURA_COMPLETADA` preservada (no reseteada) — **sin** fila nueva en `Indice Idempotencia`.

### Hallazgo no planeado: 7 mensajes viejos arrastrados por la query amplia

`GMAIL_QUERY_PRUEBA` no aísla por marcador único (a diferencia del automatizador de Fase 2A): la primera corrida real informó "8 mensajes elegibles, procesando 8", no 1. Los otros 7 eran mensajes de rondas anteriores de este proyecto, nunca cerrados en `Indice Idempotencia` porque solo habían pasado por simulaciones del automatizador de Fase 2A (que nunca persisten) — entre ellos, el primer intento fallido de CP-04 (`19f95a4113a1fb97`), el del segundo hallazgo real de tableros equivocados (`19f94b94245ce658`), y el primer intento retirado de CP-16 (`19f9661d038ea8de`).

- **5 de los 7** tenían manifiesto propio (2-3 tareas cada uno) y quedaron en el mismo `ERROR_TEMPORAL`/`ESCRITURA_COMPLETADA`, con sus tareas escritas por primera vez en las hojas de negocio.
- **2 de los 7** (incluido `19f9661d038ea8de`, el primer intento retirado de CP-16) no tenían manifiesto (`SIN_TAREAS`/filtro determinístico); `gestionarErrorMensaje()` los clasificó `ERROR_DEFINITIVO` (mi error sintético no coincide con el patrón `timeout|rate limit|50x`) y los cerró de forma permanente, con 0 tareas. **No afecta la aprobación de CP-16**, que se basa en un `message_id` distinto ya cerrado con éxito.

### Segunda corrida (instrumentación desactivada, con consentimiento del usuario para incluir los 6 mensajes en `ERROR_TEMPORAL`)

Log recibido: para cada uno de los 6 mensajes en `ERROR_TEMPORAL` (incluido `19f96ec29b3c8486`), `"procesarUnMensaje(): existe manifiesto para <id>; se reanuda sin volver a consultar la IA."` seguido de `"reanudarDesdeManifiesto(): todas las tareas de <id> ya estaban ESCRITA; se repite únicamente la actualización de Gmail."` — **sin** ninguna línea `consultarIAExtractora()` y **sin** ningún error, para ninguno de los 6.

- `Log Mensajes`: las mismas 6 filas pasaron a `estado = PROCESADO` (ninguna fila nueva).
- `Indice Idempotencia`: 15 entradas nuevas en total (3+3+2+2+3+2, según la cantidad de tareas de cada mensaje) — para `19f96ec29b3c8486` específicamente, 2 entradas (`ALI-401AEE58B20AFA0C-001/002`).
- Ninguna hoja de negocio recibió filas adicionales a las ya escritas en la primera corrida.
- Los 2 mensajes `ERROR_DEFINITIVO` no reaparecieron como elegibles (correctamente excluidos para siempre).

**Conclusión:** CP-12 (Variante A) PASA. Confirma, en producción real, que una excepción capturada después de `escribirFilasPorLote()` no duplica tareas ni vuelve a consultar la IA en el reintento — y lo hace sobre 6 mensajes reales distintos, no solo uno, gracias al hallazgo no planeado.

**Estado (veredicto final):** Aprobado (Variante A) — 24/07/2026 (`PASA`). **Variante B pendiente** (requiere fabricar manualmente un estado intermedio en las hojas, técnica distinta de fault injection).

## Detalle de CP-12 (Variante B) — Runtime realmente interrumpido (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 24-25/07/2026
message_id: 19f9734c63bb0299 (nuevo)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP12B_DETENER_TRAS_ESCRITURA
en procesarUnMensaje() (codigo/script_refactorizado.gs), justo después de
actualizarLogMensajes(..., { etapa: ETAPAS.ESCRITURA_COMPLETADA }) — ya retirado del código.
```

**Diferencia con la Variante A:** la Variante A simula una excepción **capturada** dentro de la misma ejecución (el `try/catch` del llamador se entera y `gestionarErrorMensaje()` corre, dejando `ERROR_TEMPORAL`). La Variante B simula el runtime muriendo **sin que ningún `catch` actúe** — el único mecanismo capaz de eso es un `return` simple (nunca un `throw`), dejando el mensaje genuinamente en `EN_PROCESO`, recuperable solo por `recuperarProcesamientosAbandonados()`/`UMBRAL_ABANDONO_MIN` (no por la comprobación de manifiesto en la entrada de `procesarUnMensaje()`, que nunca llega a intervenir porque el mensaje no vuelve a considerarse "elegible" hasta que la recuperación por abandono lo libera).

### Primera corrida (instrumentación activa)

- Correo sintético nuevo: "[PRUEBA-AUTOMATIZACION] Enlace roto en la página de contacto" / "Hay que corregir el enlace roto en la página de contacto, y el equipo comercial debe informarle al cliente que ya se solucionó el problema de acceso." (`message_id 19f9734c63bb0299`).
- Log real: "1 mensajes elegibles, procesando 1" → `consultarIAExtractora()` → "CP-12-B: deteniendo procesarUnMensaje() tras ESCRITURA_COMPLETADA, simulando runtime interrumpido (instrumentación temporal de prueba)." → ejecución completada sin error ("Aviso", no "Error" — confirma que no se propagó ninguna excepción).
- La IA clasificó 2 observaciones / 2 tareas (`Desarrollo IT`: "Corregir el enlace roto en la página de contacto"; `Comercial`: "Informar al cliente que se solucionó el problema de acceso").
- `escribirFilasPorLote()` escribió las 2 tareas (`ESCRITA` en `Registro Tareas`, con `fila_destino` real en ambas hojas de negocio) antes del corte.
- Confirmado en `Log Mensajes`: `estado=EN_PROCESO` (nunca tocado desde `registrarInicioProcesamiento()`), `etapa=ESCRITURA_COMPLETADA`, `cantidad_observaciones=2`, `cantidad_tareas=2` — **sin** fila nueva en `Indice Idempotencia`, tal como se esperaba de un runtime interrumpido sin `catch`.

### Preparación manual del abandono

- Property `CP12B_DETENER_TRAS_ESCRITURA` puesta en `false` (para no afectar mensajes reales futuros).
- Única edición manual: celda `fecha_inicio` de la fila del mensaje en `Log Mensajes`, atrasada a `24/7/2026 23:18:51` (~40 minutos antes de la ejecución original, por encima de `UMBRAL_ABANDONO_MIN=20`).

### Segunda corrida (recuperación por abandono)

Log recibido:
```text
Mensaje abandonado 19f9734c63bb0299 con manifiesto persistido (etapa ESCRITURA_COMPLETADA); reanudando sin volver a consultar la IA.
reanudarDesdeManifiesto(): todas las tareas de 19f9734c63bb0299 ya estaban ESCRITA; se repite únicamente la actualización de Gmail.
recuperarProcesamientosAbandonados(): 1 reanudado(s) desde manifiesto, 0 reabierto(s) para reprocesamiento completo.
procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0.
```

- `recuperarProcesamientosAbandonados()` detectó el mensaje por `UMBRAL_ABANDONO_MIN`, confirmó `etapa=ESCRITURA_COMPLETADA` dentro de `ETAPAS_CON_MANIFIESTO`, y llamó a `reanudarDesdeManifiesto()` — **sin** ninguna línea `consultarIAExtractora()` en esta corrida.
- `reanudarDesdeManifiesto()` encontró las 2 tareas ya `ESCRITA` (ninguna pendiente) y repitió únicamente `aplicarResultadoGmail()`.
- El resumen de recuperación ("1 reanudado(s) desde manifiesto, 0 reabierto(s)") confirma que tomó la vía de manifiesto, no la de reprocesamiento completo.
- El bucle normal de elegibilidad de la misma ejecución informó correctamente "0 mensajes elegibles" — el mensaje ya había sido cerrado por la recuperación, antes de llegar a ese punto.
- `Log Mensajes`: `estado=PROCESADO`, `etapa=FINALIZADO`, `resultado_gmail=SOLO_ETIQUETADO`, `cantidad_tareas` sin cambios (2, no 4).
- Confirmado visualmente en `Desarrollo IT` y `Comercial`: exactamente 1 fila cada una para este mensaje (`ALI-0A0C9963ED166AAE-001` y `-002`) — sin duplicación de las filas ya escritas en la primera corrida.

**Conclusión:** CP-12 (Variante B) PASA. Confirma, en producción real, que un runtime interrumpido sin excepción (mensaje genuinamente `EN_PROCESO`) se recupera correctamente vía `recuperarProcesamientosAbandonados()` → `reanudarDesdeManifiesto()`, sin duplicar tareas ni volver a consultar la IA — el mismo resultado final que la Variante A, por la vía de recuperación original (abandono por tiempo) en lugar de la vía nueva (excepción capturada).

**Estado (veredicto final):** Aprobado (Variante B) — 25/07/2026 (`PASA`). **CP-12 completo: ambas variantes Aprobadas**, con el mismo resultado final de convergencia.

## Detalle de CP-25 — Falla Gmail después de escribir filas (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 26/07/2026
message_id: 19fa0743dc9d5b94 (nuevo)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP25_FORZAR_FALLO_GMAIL
en aplicarResultadoGmail() (codigo/script_refactorizado.gs) — mismo punto y mecanismo
que CP-12 (Variante A), property exclusiva — ya retirado del código.
```

**Relación con CP-12:** CP-25 ejercita exactamente el mismo mecanismo que CP-12 (Variante A) — la corrección de INC-FASE8-005 — pero es, en la práctica, el caso que reproduce la incidencia real original reportada por Carlos Rubén Bageta el 20/07/2026 (`message_id` `19f81f96fcd09cae`/`19f819a446a30718`, ambos ya cerrados en el proyecto de prueba como `ERROR_DEFINITIVO`, sin relación con esta corrida). Por la disciplina de este proyecto, se ejecutó de forma independiente con su propio `message_id` nuevo, sin reutilizar la evidencia de CP-12.

### Primera corrida (falla simulada activa)

- Correo sintético nuevo: "El servidor de reportes internos dejó de actualizarse desde ayer a la tarde, hay que revisarlo. Mientras tanto, el equipo comercial tiene que avisarle a los clientes que el envío de reportes mensuales va a demorar unos días." (`message_id 19fa0743dc9d5b94`).
- Log: "1 mensajes elegibles, procesando 1" (sin mensajes viejos arrastrados, a diferencia de la primera corrida de CP-12) → `consultarIAExtractora()` → "Error procesando mensaje 19fa0743dc9d5b94: CP-25: falla de Gmail simulada por instrumentación temporal de prueba (retirar tras la corrida)."
- La IA clasificó 2 observaciones / 2 tareas (`Desarrollo IT`: "Revisar el servidor de reportes internos"; `Comercial`: "Avisar a los clientes sobre la demora en el envío de reportes mensuales").
- `escribirFilasPorLote()` escribió las 2 tareas (`ESCRITA` en `Registro Tareas`) antes de la excepción simulada.
- `Log Mensajes`: `estado=ERROR_TEMPORAL`, `etapa=ESCRITURA_COMPLETADA` (preservada), `cantidad_observaciones=2`, `cantidad_tareas=2` — sin fila nueva en `Indice Idempotencia`.
- Confirmado visualmente: 1 fila nueva en `Desarrollo IT` y 1 fila nueva en `Comercial` para este mensaje.

### Segunda corrida (instrumentación desactivada, ejecutada de inmediato)

Log recibido:
```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
procesarUnMensaje(): existe manifiesto para 19fa0743dc9d5b94; se reanuda sin volver a consultar la IA.
reanudarDesdeManifiesto(): todas las tareas de 19fa0743dc9d5b94 ya estaban ESCRITA; se repite únicamente la actualización de Gmail.
```

- A diferencia de CP-12 (Variante B), esta corrida se ejecutó **inmediatamente, sin esperar ningún umbral de tiempo** — el mensaje siguió "elegible" para el bucle normal (está `ERROR_TEMPORAL`, no cerrado en `Indice Idempotencia`), y la recuperación ocurrió enteramente en la comprobación de manifiesto a la entrada de `procesarUnMensaje()`, no vía `recuperarProcesamientosAbandonados()`/`UMBRAL_ABANDONO_MIN` (ese camino es exclusivo de mensajes `EN_PROCESO`, no `ERROR_TEMPORAL`).
- Sin ninguna línea `consultarIAExtractora()` en esta corrida.
- `Log Mensajes`: pasó a `estado=PROCESADO` (misma fila).
- Confirmado visualmente: `Desarrollo IT` y `Comercial` mantienen exactamente 1 fila cada una para este mensaje — sin duplicar las ya escritas en la primera corrida.

**Conclusión:** CP-25 PASA. Confirma, en producción real y con su propio `message_id`, el mismo resultado que CP-12 (Variante A): una excepción capturada después de `escribirFilasPorLote()` deja el mensaje en `ERROR_TEMPORAL` sin cerrarlo, y la siguiente ejecución — sin necesidad de esperar nada — lo recupera vía `reanudarDesdeManifiesto()` sin duplicar tareas ni volver a consultar la IA. Aprobó al primer intento, sin ningún hallazgo adicional.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-26 — Caída después de reservar tareas (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 26/07/2026
message_id: 19fa0a67abbf10f3 (nuevo; un primer intento con message_id 19fa09b2d765e4bc se descartó, ver nota abajo)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP26_FORZAR_FALLO_ESCRITURA
en procesarUnMensaje() (codigo/script_refactorizado.gs), justo después de persistirManifiestoTareas()
y actualizarLogMensajes(..., { etapa: ETAPAS.TAREAS_RESERVADAS }) — ya retirado del código.
```

**Diferencia con CP-12/CP-25:** ambos interrumpen después de `escribirFilasPorLote()` (tareas ya `ESCRITA`). CP-26 interrumpe **antes**, dejando las tareas `RESERVADA` (`task_id` asignado, sin fila en la hoja de negocio). Esto ejercita una rama distinta de `reanudarDesdeManifiesto()` (`codigo/recuperacion.gs`, líneas 129-148: `pendientes.length > 0`) que sí escribe durante la recuperación, en vez de la rama "todas ya `ESCRITA`" (que solo repite Gmail).

### Intento descartado (sin usarse como evidencia)

La primera corrida real, con el correo "Encuesta de satisfacción pendiente" (`message_id 19fa09b2d765e4bc`), terminó "Se ha completado la ejecución" sin ningún error: la property `CP26_FORZAR_FALLO_ESCRITURA` nunca se había llegado a crear en Script Properties (ausente, no en `false`), por lo que el gancho nunca se activó. El mensaje se procesó de punta a punta normalmente (`PROCESADO`/`FINALIZADO`, 2 tareas `ESCRITA` en `Desarrollo IT`/`Comercial`) y quedó cerrado en `Indice Idempotencia` — no representa el escenario de CP-26 y no se reutilizó; se repitió el envío con un correo nuevo tras crear la property correctamente.

### Primera corrida (falla simulada activa, con la property ya creada)

- Correo sintético nuevo: "El certificado de seguridad del sitio web vence la próxima semana, hay que renovarlo antes de esa fecha. Avisale también al equipo comercial para que informen a los clientes que el sitio seguirá funcionando sin interrupciones." (`message_id 19fa0a67abbf10f3`).
- Log: "1 mensajes elegibles, procesando 1" → `consultarIAExtractora()` → "Error procesando mensaje 19fa0a67abbf10f3: CP-26: falla simulada por instrumentación temporal de prueba, justo después de reservar tareas y antes de escribir filas (retirar tras la corrida). messageId=19fa0a67abbf10f3".
- La IA clasificó 2 observaciones / 2 tareas (`Desarrollo IT`: "Renovar el certificado de seguridad del sitio web"; `Comercial`: "Informar al equipo comercial sobre la renovación del certificado").
- `persistirManifiestoTareas()` asignó `task_id` (`ALI-A40A5B99A249A690-001/002`) y los reservó antes de la excepción simulada; `escribirFilasPorLote()` nunca llegó a correr.
- `Log Mensajes`: `estado=ERROR_TEMPORAL`, **`etapa=TAREAS_RESERVADAS`**, `cantidad_observaciones=2`, `cantidad_tareas=2` — sin fila nueva en `Indice Idempotencia`.
- `Registro Tareas`: 2 filas nuevas, `estado_escritura=RESERVADA`, `fecha_reserva` completada, `fila_destino`/`fecha_escritura` vacías.
- Confirmado visualmente: **ninguna** fila nueva en `Desarrollo IT` ni `Comercial`.

### Segunda corrida (instrumentación desactivada, ejecutada de inmediato)

Log recibido:
```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
procesarUnMensaje(): existe manifiesto para 19fa0a67abbf10f3; se reanuda sin volver a consultar la IA.
```

- Sin ninguna línea `consultarIAExtractora()`. A diferencia de la rama "todas ya `ESCRITA`" (CP-12/CP-25), esta rama de `reanudarDesdeManifiesto()` no tiene un log de confirmación propio — la ejecución tardó ~8 segundos (vs. ~1 segundo de una repetición de solo Gmail), consistente con una escritura real ocurriendo durante la recuperación.
- `Log Mensajes`: pasó a `estado=PROCESADO`.
- Confirmado visualmente: 1 fila nueva en `Desarrollo IT` y 1 en `Comercial`, con los **mismos `task_id`** ya reservados en la primera corrida (`ALI-A40A5B99A249A690-001/002`) — sin generar un manifiesto nuevo.

**Conclusión:** CP-26 PASA. Confirma, en producción real, que una excepción capturada entre `persistirManifiestoTareas()` y `escribirFilasPorLote()` deja las tareas `RESERVADA` sin escribir, y que la recuperación posterior las escribe usando el manifiesto ya persistido (mismos `task_id`), sin volver a consultar la IA ni duplicar el manifiesto.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-32 — Recuperación con tareas ya ESCRITA (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 26/07/2026
message_id: 19fa0d6ae4f8f334 (nuevo; un primer intento con message_id 19fa0d04df5d38e3 se descartó, ver nota abajo)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP32_FORZAR_FALLO_GMAIL
en aplicarResultadoGmail() (codigo/script_refactorizado.gs) — mismo punto y mecanismo
que CP-12 (Variante A) y CP-25 — ya retirado del código.
```

**Relación con CP-25:** el enunciado de CP-32 (`pruebas/CASOS_DE_PRUEBA.md`) describe el escenario como "un manifiesto persistido cuyas tareas ya están todas `ESCRITA`... (por ejemplo, tras CP-25)" — mecánicamente es el mismo mecanismo y resultado esperado que CP-25 ya probó y aprobó. Siguiendo la misma disciplina aplicada a CP-25 respecto de CP-12, se ejecutó con su propia instrumentación, su propio correo y su propio `message_id`.

### Intento descartado (sin usarse como evidencia)

La primera corrida real, con el correo "Actualización de precios pendiente" (`message_id 19fa0d04df5d38e3`), terminó "Se ha completado la ejecución" sin ningún error — mismo problema visto en el primer intento de CP-26: la property `CP32_FORZAR_FALLO_GMAIL` no se había llegado a crear en Script Properties. El mensaje se procesó de punta a punta normalmente (`PROCESADO`/`FINALIZADO`) y quedó cerrado — no representa el escenario de CP-32 y no se reutilizó.

### Primera corrida (falla simulada activa, con la property ya creada)

- Correo sintético nuevo: "El dominio del sitio web vence en dos semanas, hay que renovarlo antes de esa fecha. El equipo comercial debe confirmarle al cliente que el sitio no tendrá interrupciones durante la renovación." (`message_id 19fa0d6ae4f8f334`).
- Log: "1 mensajes elegibles, procesando 1" → `consultarIAExtractora()` → "Error procesando mensaje 19fa0d6ae4f8f334: CP-32: falla de Gmail simulada por instrumentación temporal de prueba (retirar tras la corrida)."
- `escribirFilasPorLote()` escribió las 2 tareas (`ESCRITA` en `Registro Tareas`) antes de la excepción simulada.
- `Log Mensajes`: `estado=ERROR_TEMPORAL`, `etapa=ESCRITURA_COMPLETADA`, `cantidad_tareas=2` — sin fila nueva en `Indice Idempotencia`.

### Segunda corrida (instrumentación desactivada, ejecutada de inmediato)

Log recibido:
```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
procesarUnMensaje(): existe manifiesto para 19fa0d6ae4f8f334; se reanuda sin volver a consultar la IA.
reanudarDesdeManifiesto(): todas las tareas de 19fa0d6ae4f8f334 ya estaban ESCRITA; se repite únicamente la actualización de Gmail.
```

- Sin ninguna línea `consultarIAExtractora()`.
- `Log Mensajes`: pasó a `estado=PROCESADO`.
- Confirmado: sin filas duplicadas en `Desarrollo IT`/`Comercial` para este mensaje.

**Conclusión:** CP-32 PASA. Confirma, con evidencia real propia, el mismo resultado ya validado por CP-25: una excepción capturada después de `escribirFilasPorLote()` deja el mensaje en `ERROR_TEMPORAL` sin cerrarlo, y la ejecución inmediatamente siguiente lo recupera vía `reanudarDesdeManifiesto()` sin duplicar tareas ni volver a consultar la IA.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-33 — Recuperación con tareas en RESERVADA (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 26/07/2026
message_id: 19fa0f11793dc340 (nuevo)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP33_FORZAR_FALLO_ESCRITURA
en procesarUnMensaje() (codigo/script_refactorizado.gs) — mismo punto y mecanismo
que CP-26 — ya retirado del código.
```

**Relación con CP-26:** el título de CP-33 (`pruebas/CASOS_DE_PRUEBA.md`) cita explícitamente "/ CP-26" — mecánicamente es el mismo mecanismo y resultado esperado que CP-26 ya probó y aprobó. Siguiendo la misma disciplina aplicada a CP-32 respecto de CP-25, se ejecutó con su propia instrumentación, su propio correo y su propio `message_id`. A diferencia de CP-26 y de CP-32, esta vez la property se creó correctamente desde el primer intento.

### Primera corrida (falla simulada activa)

- Correo sintético nuevo: "Hay que programar la migración del servidor de archivos para el próximo fin de semana, y el equipo comercial debe avisarle a los clientes sobre una posible interrupción breve del servicio." (`message_id 19fa0f11793dc340`).
- Log: "1 mensajes elegibles, procesando 1" → `consultarIAExtractora()` → "Error procesando mensaje 19fa0f11793dc340: CP-33: falla simulada por instrumentación temporal de prueba, justo después de reservar tareas y antes de escribir filas (retirar tras la corrida). messageId=19fa0f11793dc340".
- `persistirManifiestoTareas()` asignó `task_id` y los reservó antes de la excepción simulada; `escribirFilasPorLote()` nunca llegó a correr.
- `Log Mensajes`: `estado=ERROR_TEMPORAL`, `etapa=TAREAS_RESERVADAS`, `cantidad_tareas=2` — sin fila nueva en `Indice Idempotencia`.
- `Registro Tareas`: 2 filas nuevas, `estado_escritura=RESERVADA`, sin `fila_destino`.
- Confirmado: **ninguna** fila nueva en `Desarrollo IT` ni `Comercial`.

### Segunda corrida (instrumentación desactivada, ejecutada de inmediato)

Log recibido:
```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
procesarUnMensaje(): existe manifiesto para 19fa0f11793dc340; se reanuda sin volver a consultar la IA.
```

- Sin ninguna línea `consultarIAExtractora()`; ~5 segundos de ejecución, consistente con una escritura real ocurriendo durante la recuperación (misma rama de `reanudarDesdeManifiesto()` sin log propio ya vista en CP-26).
- `Log Mensajes`: pasó a `estado=PROCESADO`.
- Confirmado: 1 fila nueva en `Desarrollo IT` y 1 en `Comercial`, con los **mismos `task_id`** ya reservados en la primera corrida — sin generar un manifiesto nuevo.

**Conclusión:** CP-33 PASA. Confirma, con evidencia real propia, el mismo resultado ya validado por CP-26: una excepción capturada entre `persistirManifiestoTareas()` y `escribirFilasPorLote()` deja las tareas `RESERVADA` sin escribir, y la recuperación posterior las escribe usando el manifiesto ya persistido (mismos `task_id`), sin volver a consultar la IA.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-34 — Nueva falla de Gmail durante la recuperación, sin recursión (flujo clásico, instrumentación temporal)

```text
Fecha de ejecución: 26/07/2026
message_id: 19fa107c79d673bb (nuevo)
Instrumentación: mismo gancho de CP-12/CP-25/CP-32 en aplicarResultadoGmail()
(codigo/script_refactorizado.gs), property CP34_FORZAR_FALLO_GMAIL — mantenida
en 'true' durante dos corridas consecutivas — ya retirado del código.
```

**Diseño:** a diferencia de CP-25/CP-32 (una sola falla, luego recuperación limpia), CP-34 exige que la misma falla se dispare **también** en el intento de recuperación. El código de la instrumentación es idéntico al de esos casos; la diferencia está enteramente en el procedimiento (la property no se desactiva entre la primera y la segunda corrida).

### Corrida 1 (falla simulada activa)

- Correo sintético nuevo: "El equipo de la oficina tiene la garantía por vencer este mes, hay que gestionar la renovación con el proveedor. El equipo comercial debe avisarle al cliente que el soporte técnico seguirá disponible durante el trámite." (`message_id 19fa107c79d673bb`).
- Log: "1 mensajes elegibles, procesando 1" → `consultarIAExtractora()` → "Error procesando mensaje 19fa107c79d673bb: CP-34: falla de Gmail simulada por instrumentación temporal de prueba (retirar tras la corrida)."
- `Log Mensajes`: `estado=ERROR_TEMPORAL`, `etapa=ESCRITURA_COMPLETADA`, `cantidad_tareas=2`; 2 tareas `ESCRITA` en `Registro Tareas`.

### Corrida 2 (property sin tocar, sigue en `true`, ejecutada de inmediato)

Log recibido:
```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
procesarUnMensaje(): existe manifiesto para 19fa107c79d673bb; se reanuda sin volver a consultar la IA.
reanudarDesdeManifiesto(): todas las tareas de 19fa107c79d673bb ya estaban ESCRITA; se repite únicamente la actualización de Gmail.
Error procesando mensaje 19fa107c79d673bb: CP-34: falla de Gmail simulada por instrumentación temporal de prueba (retirar tras la corrida).
```

- La recuperación arrancó normalmente (sin `consultarIAExtractora()`, detectó las tareas ya `ESCRITA`), pero al repetir `aplicarResultadoGmail()` la falla simulada se disparó de nuevo — capturada por el mismo camino que la primera vez.
- **Una sola** línea `"Error procesando mensaje..."` en todo el log de esta corrida — sin cadena de reintentos dentro de la misma ejecución.
- Confirmado: `Log Mensajes` quedó **sin cambios** respecto de la corrida 1 (`estado=ERROR_TEMPORAL`, `etapa=ESCRITURA_COMPLETADA`).

### Corrida 3 (`CP34_FORZAR_FALLO_GMAIL=false`, ejecutada de inmediato)

Log recibido:
```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
procesarUnMensaje(): existe manifiesto para 19fa107c79d673bb; se reanuda sin volver a consultar la IA.
reanudarDesdeManifiesto(): todas las tareas de 19fa107c79d673bb ya estaban ESCRITA; se repite únicamente la actualización de Gmail.
```

- Sin ninguna línea de error esta vez — `aplicarResultadoGmail()` tuvo éxito.
- `Log Mensajes`: pasó a `estado=PROCESADO`.
- Confirmado: sin filas duplicadas en las hojas de negocio.

**Conclusión:** CP-34 PASA. Confirma, en producción real, que una segunda falla de Gmail durante el intento de recuperación se captura por el mismo camino que la primera (`gestionarErrorMensaje()` detecta el manifiesto, mantiene `ERROR_TEMPORAL` sin cerrarlo, retorna sin recursividad), sin generar ninguna cadena de reintentos dentro de la misma ejecución, y que un tercer intento posterior recupera el mensaje limpiamente.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

**Con CP-34 cierra la familia completa de recuperación desde manifiesto (INC-FASE8-005):** CP-12 (Variante A: excepción capturada; Variante B: runtime interrumpido), CP-25 (reproducción del incidente real original), CP-26 (falla en etapa RESERVADA), CP-32 (recuperación con tareas ya ESCRITA, evidencia propia), CP-33 (recuperación con tareas en RESERVADA, evidencia propia) y CP-34 (segunda falla durante la recuperación, sin recursión) — las seis variantes del mecanismo validadas en producción real, cada una con su propio `message_id`.

## Detalle de CP-08 — JSON inválido de la IA (instrumentación temporal en `codigo/cliente_openai.gs`)

```text
Fecha de ejecución: 26/07/2026
Instrumentación: gancho gateado por cfg.modoPrueba + property CP08_FORZAR_JSON_INVALIDO
en consultarIAExtractora() (codigo/cliente_openai.gs, NO script_refactorizado.gs) —
ya retirado del código.
```

**Diseño distinto de la familia CP-12/25/26/32/33/34:** esta prueba no interrumpe una ejecución en curso — reemplaza directamente el resultado de `consultarIAExtractora()` (sin llamar a la API real de OpenAI, sin costo ni token real) para ejercitar `validarRespuestaIA()` con una respuesta que no es JSON válido. Es una prueba de una sola corrida: `finalizarMensajeSinTareas()` cierra el mensaje de inmediato, sin manifiesto persistido ni recuperación posterior.

**Nota de trazabilidad:** el mensaje de log de esta instrumentación no incluyó el `messageId` (a diferencia de los ganchos de la familia CP-12/25/26/32/33/34, cuyos mensajes de error sí lo hacían) — una omisión menor de diseño en esta ronda, sin impacto en la validez de la prueba: el estado final se confirmó igualmente por los campos de `Log Mensajes`/`Registro Tareas`/`Indice Idempotencia`/Gmail.

### Corrida única

- Log: "1 mensajes elegibles, procesando 1" → "CP-08: devolviendo contenidoCrudo inválido por instrumentación temporal de prueba (sin llamar a la API real de OpenAI)." — **sin** ninguna línea `"consultarIAExtractora(): usando prompt versión..."`, confirmando que el bypass se disparó antes de cualquier consulta real a OpenAI.
- `validarRespuestaIA()` intentó `JSON.parse('esto no es json')`, capturó la excepción y devolvió `{ valida: false, motivo: 'La IA no devolvió JSON válido: ...' }`.
- `procesarUnMensaje()` verificó `!validacionIA.valida` y llamó a `finalizarMensajeSinTareas(mensajeDescriptor, ESTADOS.REVISION_MANUAL, validacionIA.motivo, cfg, 'RevisionErrorProcesamiento')`.
- Confirmado: `Log Mensajes.estado=REVISION_MANUAL`, `etapa=FINALIZADO`; sin fila nueva en `Registro Tareas`; `Indice Idempotencia` con una entrada nueva (`task_id` vacío); etiqueta de Gmail `Revisión manual/Error de procesamiento` aplicada; sin filas nuevas en ninguna hoja de negocio.

**Conclusión:** CP-08 PASA. Confirma, en producción real y sin gastar ninguna llamada real de OpenAI, que `validarRespuestaIA()` detecta correctamente un `contenidoCrudo` que no es JSON válido y que el pipeline deriva el mensaje a revisión manual con la etiqueta correcta, sin crear ninguna fila de tarea.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-09 — Error HTTP temporal (instrumentación temporal en `codigo/cliente_openai.gs`)

```text
Fecha de ejecución: 26/07/2026
Instrumentación: gancho gateado por cfg.modoPrueba + property CP09_FORZAR_HTTP_TEMPORAL
en consultarIAExtractora() (codigo/cliente_openai.gs) — reemplaza solo el objeto
response de UrlFetchApp.fetch(), preservando el bucle real de reintentos — ya
retirado del código.
```

**Diseño:** a diferencia de CP-08 (reemplazo total de la función), CP-09 conserva intacto el bucle de reintentos real (`for (var intento = 1; intento <= MAX_INTENTOS_IA; intento++)`), solo sustituyendo el objeto `response` en el punto de la llamada real a `UrlFetchApp.fetch()`: HTTP 503 en el intento 1, HTTP 200 con contenido válido en el intento 2. Como el reintento es interno a una sola invocación de la función, la prueba se valida con una única ejecución de `procesarCorreosDeTareas()`.

### Intentos descartados (sin usarse como evidencia)

Dos corridas previas (correos "Blabla" y "blablabla2") terminaron con `Log Mensajes.estado=REVISION_MANUAL`, `error="Grupo origen fuera de catálogo en observación 0, tarea 0: \"undefined\"."`. Causa: el proyecto de prueba tenía copiada una versión de `codigo/cliente_openai.gs` anterior a una corrección hecha durante el diseño de esta instrumentación (un chequeo local ad-hoc, antes de la primera corrida real, había detectado que la tarea simulada no incluía el campo obligatorio `grupo_origen`; se corrigió y se reverificó localmente, pero el archivo desactualizado ya estaba copiado en Apps Script). Confirmado el contenido exacto del archivo (con `grupo_origen: 'Desarrollo IT'` presente) antes de la tercera corrida. Ninguno de los dos intentos descartados representa el escenario de CP-09; ambos quedaron cerrados sin reutilizarse.

### Corrida aprobada

- Correo sintético nuevo: "[PRUEBA-AUTOMATIZACION] Consulta sobre horario de atención".
- Log: "1 mensajes elegibles, procesando 1" → `consultarIAExtractora(): usando prompt versión...` → "CP-09: simulando HTTP 503 en el intento 1..." → "CP-09: simulando HTTP 200 en el intento 2..." → **sin ninguna línea de error**.
- Confirmado: `Log Mensajes.intentos=2`, `estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`; 1 fila nueva en `Registro Tareas`; 1 fila nueva en `Desarrollo IT`; etiqueta `Procesado` aplicada en Gmail.

**Conclusión:** CP-09 PASA. Confirma, en producción real y sin ninguna llamada real a OpenAI, que el bucle de reintentos de `consultarIAExtractora()` maneja correctamente un HTTP 503 (temporal) seguido de un HTTP 200 exitoso: se registran 2 intentos y la tarea se genera normalmente en el segundo intento.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-13 — Dos ejecuciones simultáneas (instrumentación temporal mínima)

```text
Fecha de ejecución: 26/07/2026
Instrumentación: delay artificial de 15s gateado por MODO_PRUEBA + property
CP13_EXTENDER_LOCK, en procesarCorreosDeTareas() (codigo/script_refactorizado.gs),
justo después de obtener el ScriptLock — ya retirado del código.
```

**Diseño:** a diferencia de todos los casos anteriores, CP-13 no ejercita ninguna lógica de negocio nueva — el mecanismo bajo prueba (`LockService.getScriptLock().tryLock(5000)`) ya existía sin cambios. La única instrumentación fue un delay artificial para hacer confiable el timing de dos clics manuales, sin depender de que el procesamiento real tardara por casualidad más de 5 segundos.

### Corrida (dos pestañas del editor de Apps Script)

Pestaña 1 (ejecutada primero, obtuvo el lock):
```text
23:44:56  Aviso           Se ha iniciado la ejecución
23:44:57  Información     CP-13: manteniendo el lock 15 segundos adicionales (instrumentación temporal de prueba) para dar tiempo a disparar una segunda ejecución.
23:45:13  Información     procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0.
23:45:13  Aviso           Se ha completado la ejecución
```

Pestaña 2 (ejecutada ~8 segundos después, no obtuvo el lock):
```text
23:45:04  Aviso           Se ha iniciado la ejecución
23:45:10  Información     procesarCorreosDeTareas(): no se pudo obtener el lock; ejecución en curso. Se omite esta corrida.
23:45:10  Aviso           Se ha completado la ejecución
```

La pestaña 2 no registró ninguna otra línea — ni `validarConfiguracion()`, ni ningún acceso real a Gmail/Sheets — confirmando que el rechazo por lock ocurre antes de cualquier efecto observable.

### Hallazgo colateral: archivo `Código.gs` sin usar en el proyecto de prueba

Al revisar la captura de la pestaña 2, se detectó que el proyecto de prueba todavía contenía un archivo `Código.gs` — confirmado por el usuario como el script original pre-Fase-1 que motivó todo este proyecto de refactorización, nunca modificado durante el proceso — con su **propia** definición de `procesarCorreosDeTareas()` (sin `LockService`, sin ninguna corrección de Fase 1-8). Dos funciones con el mismo nombre en distintos archivos `.gs` del mismo proyecto generan una colisión silenciosa de espacio de nombres: una sobrescribe a la otra sin ningún aviso, y cuál "gana" depende de un detalle no garantizado (orden de archivos). En esta corrida "ganó" la versión correcta, pero esto no era una garantía estructural — de haber sido al revés, todas las pruebas de Fase 8 podrían haber estado validando código que no es el que realmente se ejecuta.

No afecta la validez de esta aprobación (la corrida real ya demostró el comportamiento correcto), pero es un riesgo real hacia adelante. El usuario, tras confirmar que `Código.gs` es efectivamente el original sin usar (y que el repositorio ya preserva ese mismo original en `codigo/script_actual.gs` para referencia histórica), decidió eliminarlo del proyecto de prueba para eliminar la colisión de raíz.

**Conclusión:** CP-13 PASA. Confirma, en producción real, que el control de concurrencia por `LockService` impide efectivamente que dos ejecuciones simultáneas de `procesarCorreosDeTareas()` procesen el mismo lote de mensajes; la ejecución que no obtiene el lock termina de inmediato sin ningún acceso real a Gmail ni Sheets.

**Estado (veredicto final):** Aprobado — 26/07/2026 (`PASA`).

## Detalle de CP-07 — Notificación de Apps Script (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-10-ERROR-AUTOMATIZACION-APPS-SCRIPT
runId: 9a2f73ca-684b-48e0-9fb9-fbd5ffb57382
message_id: 19f96cb239f5ec62 (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03/CP-04/CP-15/CP-14/CP-16/CP-17/CP-18, se ejecutó íntegramente a través del automatizador de integración de Fase 2A. Reutiliza FC-01 (`pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`): un asunto que coincide con la regla obligatoria de notificaciones de fallos de Apps Script (regla 1 de `evaluarFiltroDeterministico()`, `codigo/filtros_correo.gs`) — condición OR entre remitente y asunto; se usó el asunto porque el remitente exigido (`noreply-apps-scripts-notifications@google.com`) no es una dirección que el tester pueda enviar realmente (a diferencia de CP-06, diferido por este mismo motivo). Reutiliza sin cambios en `verificarResultadoFormal_()`/`verificarClasificacionSimulada_()`, ya que `RevisionErrorAutomatizacion` ya era una clave de etiqueta soportada de forma genérica; solo hizo falta una fábrica de efecto formal dedicada (`efectoFormalErrorAutomatizacionCorrecto_`) que aplicara `L_ERRAUTO` en vez de `L_SINTAREAS`.

### Simulación y ejecución formal

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado. El log **no muestra ninguna línea** `consultarIAExtractora()` — confirma, igual que CP-16, que el filtro determinístico rechazó el mensaje antes de llegar a la IA, sin generar ningún costo de OpenAI.
- No se recibió por separado el texto del log de `SIMULACION_OK` de esta corrida (sí el de la ejecución formal). Esto no impide la aprobación: por construcción, `ejecutarFormalYVerificar_()` exige una sesión en `SIMULACION_OK` para el mismo `message_id`/nonce/fingerprint antes de autorizar la formal — el `FORMAL_OK` recibido confirma, sin ambigüedad, que la simulación también aprobó.
- Log recibido de la ejecución formal: `procesarCorreosDeTareasConConfiguracion_(): recuperación de abandonados omitida por opciones.omitirRecuperacion.`; `procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.`; `[AUTO-FASE8] FORMAL_OK runId=9a2f73ca-684b-48e0-9fb9-fbd5ffb57382 caso=INT-FASE8-10-ERROR-AUTOMATIZACION-APPS-SCRIPT messageId=19f96cb239f5ec62`.
- Por construcción de `verificarResultadoFormal_()` (sección 7), este `FORMAL_OK` certifica: `Log Mensajes` (`estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones`/`cantidad_tareas` en blanco, `resultado_gmail=SOLO_ETIQUETADO`, `error` no vacío); `Registro Tareas` sin ninguna fila nueva; `Indice Idempotencia` con 1 entrada (`estado_final=SIN_TAREAS`, `task_id` vacío); ninguna hoja de negocio modificada; Gmail conservó `Pruebas-Automatizacion` e `INBOX`, sin `Procesado` ni las otras etiquetas de revisión/error, sin archivar.
- **Confirmación visual directa del tester:** el mensaje recibió la etiqueta `Revisión manual/Error de automatización` en Gmail — exactamente la esperada, distinta de `Revisión manual/Sin tareas detectadas` (la de CP-16).

**Conclusión:** CP-07 PASA. Confirma, en producción real, que la regla obligatoria de notificaciones de fallos de Apps Script dispara correctamente por asunto, aplica la etiqueta distinta correspondiente, y no genera ninguna llamada real a OpenAI.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-18 — Fecha no explícita (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA
runId: 34ca060d-42b0-4175-95e7-fc7808532a2f
message_id: 19f96b3f0b156c2a (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03/CP-04/CP-15/CP-14/CP-16/CP-17, se ejecutó íntegramente a través del automatizador de integración de Fase 2A. Reutiliza PE-05 (`pruebas/PRUEBAS_ESCRITURA.md`): complemento exacto de CP-17 — una tarea sin ninguna fecha mencionada en el cuerpo. Reutiliza sin cambios `efectoFormalUnaTareaConFechaFabrica_` (creada para CP-17) con un tablero distinto (`Desarrollo IT`); no hizo falta ningún cambio de código en `verificarResultadoFormal_()`, ya que la rama `fechaLimiteEsperada=null` (sección 7.3) ya se había agregado y probado localmente durante la ampliación de CP-17.

### Simulación y ejecución formal

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado; `consultarIAExtractora(): usando prompt versión v4-INC-FASE8-011-informativo-sin-tareas` confirma que este fixture llegó a la IA.
- No se recibió por separado el texto del log de `SIMULACION_OK` de esta corrida (sí el de la ejecución formal). Esto no impide la aprobación: por construcción, `ejecutarFormalYVerificar_()` exige una sesión en `SIMULACION_OK` para el mismo `message_id`/nonce/fingerprint antes de autorizar la formal — el `FORMAL_OK` recibido confirma, sin ambigüedad, que la simulación también aprobó.
- Log recibido de la ejecución formal: `procesarCorreosDeTareasConConfiguracion_(): recuperación de abandonados omitida por opciones.omitirRecuperacion.`; `procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.`; `consultarIAExtractora(): usando prompt versión v4-INC-FASE8-011-informativo-sin-tareas`; `[AUTO-FASE8] FORMAL_OK runId=34ca060d-42b0-4175-95e7-fc7808532a2f caso=INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA messageId=19f96b3f0b156c2a`.
- Por construcción de `verificarResultadoFormal_()` (secciones 7 y 7.3), este `FORMAL_OK` certifica: `Log Mensajes` (`estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` con exactamente 1 fila (`task_id` no vacío, `estado_escritura=ESCRITA`, tablero `Desarrollo IT`); `Indice Idempotencia` con 1 entrada (`estado_final=PROCESADO`); una fila nueva en `Desarrollo IT` vinculada por `ID`, con la columna "Fecha límite" vacía; Gmail con `Procesado` aplicado, sin etiquetas de error/revisión, sin archivar.

**Conclusión:** CP-18 PASA. Junto con CP-17, confirma en producción real ambos lados de la verificación de la columna "Fecha límite" (sección 7.3): con fecha explícita se escribe la fecha correcta (CP-17); sin fecha en el cuerpo, la IA no inventa una y la celda queda vacía (CP-18).

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-17 — Fecha límite explícita (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-08-FECHA-LIMITE-EXPLICITA
runId: 3a917b4c-50e3-4387-b898-4556f4edd6c7
message_id: 19f9699bac4232c8 (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03/CP-04/CP-15/CP-14/CP-16, se ejecutó íntegramente a través del automatizador de integración de Fase 2A. Reutiliza PE-04 (`pruebas/PRUEBAS_ESCRITURA.md`): una tarea con fecha límite explícita y concreta ("antes del 31 de julio de 2026"), no una referencia relativa de día — el prompt real trae un ejemplo few-shot donde una referencia relativa ("antes del viernes") se clasifica con `fecha_limite: null`. Primer fixture cuyo `esperado` verifica el contenido de la columna "Fecha límite" de una hoja de negocio (`fixture.esperado.fechaLimiteEsperada`, sección 7.3) — hasta esta ampliación, `verificarResultadoFormal_()` solo verificaba la columna `ID`.

### Simulación y ejecución formal

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado; `consultarIAExtractora(): usando prompt versión v4-INC-FASE8-011-informativo-sin-tareas` confirma que este fixture sí llega a la IA (a diferencia de CP-16).
- No se recibió por separado el texto del log de `SIMULACION_OK` de esta corrida (sí el de la ejecución formal). Esto no impide la aprobación: por construcción, `ejecutarFormalYVerificar_()` exige una sesión en `SIMULACION_OK` para el mismo `message_id`/nonce/fingerprint antes de autorizar la formal — el `FORMAL_OK` recibido confirma, sin ambigüedad, que la simulación también aprobó.
- Log recibido de la ejecución formal: `procesarCorreosDeTareasConConfiguracion_(): recuperación de abandonados omitida por opciones.omitirRecuperacion.`; `procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.`; `consultarIAExtractora(): usando prompt versión v4-INC-FASE8-011-informativo-sin-tareas`; `[AUTO-FASE8] FORMAL_OK runId=3a917b4c-50e3-4387-b898-4556f4edd6c7 caso=INT-FASE8-08-FECHA-LIMITE-EXPLICITA messageId=19f9699bac4232c8`.
- Por construcción de `verificarResultadoFormal_()` (secciones 7 y 7.3), este `FORMAL_OK` certifica: `Log Mensajes` (`estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` con exactamente 1 fila (`task_id` no vacío, `estado_escritura=ESCRITA`, tablero `Comercial`); `Indice Idempotencia` con 1 entrada (`estado_final=PROCESADO`); una fila nueva en `Comercial` vinculada por `ID`, con la columna "Fecha límite" coincidiendo por componentes de fecha local con `2026-07-31`; Gmail con `Procesado` aplicado, sin etiquetas de error/revisión, sin archivar.
- **Confirmación visual directa del tester:** la celda "Fecha límite" de la fila nueva en la hoja `Comercial` muestra `31/07/2026` — exactamente la fecha esperada. Primera corrida de este automatizador con una confirmación visual directa de un valor de columna, más allá del veredicto automático de `verificarResultadoFormal_()`.

**Conclusión:** CP-17 PASA. Confirma, en producción real, que `construirFechaLocal()` (`codigo/escritura_sheets.gs`) escribe la fecha límite correcta en la hoja de negocio, sin el corrimiento de un día documentado en `documentacion/MAPA_ESCRITURA.md`, sección 2.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-16 — Cuerpo vacío (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-07-CUERPO-VACIO
runId: 7efa4045-e9c8-4815-974c-b80eca8ee56f
message_id: 19f9677c994bf546 (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03/CP-04/CP-15/CP-14, se ejecutó íntegramente a través del automatizador de integración de Fase 2A. Reutiliza el escenario FC-07 (`pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`): una respuesta que solo contiene una cita, sin ningún texto propio antes. Es el primer fixture cuyo rechazo depende de `evaluarFiltroDeterministico()` (regla 6: cuerpo vacío tras `extraerContenidoNuevo()`) en lugar de una clasificación de la IA — el primer caso de este automatizador cuya corrida real no generó ninguna llamada a la API de OpenAI.

**Primer intento (`message_id 19f9661d038ea8de`, retirado, nunca reutilizado):** el pipeline real rechazó correctamente el mensaje por el filtro determinístico, sin ninguna llamada a la IA (`[DRY_RUN] 19f9661d038ea8de: descartado por filtro determinístico (Cuerpo vacío tras extraer contenido nuevo...). Sin escrituras.`) — pero `verificarClasificacionSimulada_()` reportó `SIMULAR_FALLIDO` (`SIMULACION_CANTIDAD_OBSERVACIONES:null,SIMULACION_CANTIDAD_TAREAS:null`): un defecto del verificador (no del pipeline), que solo contemplaba las categorías que sí clasifican con la IA (`SIN_TAREAS`/`TAREAS_SIMULADAS`), nunca `NO_ELEGIBLE` (rechazo por filtro, que devuelve cantidades en `null` por diseño). Corregido antes del segundo intento — detalle completo en `auditoria/CHANGELOG.md` y `documentacion/AUTOMATIZACION_INTEGRACION_FASE8.md` (secciones 7.2/9.5.1).

### Segundo intento — simulación y ejecución formal

- No se recibió por separado el texto del log de `SIMULACION_OK` de este segundo intento (sí el de la ejecución formal). Esto no impide la aprobación: por construcción, `ejecutarFormalYVerificar_()` exige una sesión en `SIMULACION_OK` para el mismo `message_id`/nonce/fingerprint antes de autorizar la formal (`SIN_SIMULACION_OK` en caso contrario) — el `FORMAL_OK` recibido confirma, sin ambigüedad, que la simulación (con el verificador ya corregido) también aprobó.
- Log recibido de la ejecución formal: `procesarCorreosDeTareasConConfiguracion_(): recuperación de abandonados omitida por opciones.omitirRecuperacion.`; `procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.`; `[AUTO-FASE8] FORMAL_OK runId=7efa4045-e9c8-4815-974c-b80eca8ee56f caso=INT-FASE8-07-CUERPO-VACIO messageId=19f9677c994bf546`.
- Por construcción de `verificarResultadoFormal_()` (sección 7), este `FORMAL_OK` certifica: `Log Mensajes` con exactamente una fila, `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones`/`cantidad_tareas` en blanco (nunca se llega a `MANIFIESTO_PERSISTIDO`), `resultado_gmail=SOLO_ETIQUETADO`; `Registro Tareas` sin ninguna fila nueva para el mensaje; `Indice Idempotencia` con exactamente 1 entrada (`estado_final=SIN_TAREAS`, `task_id` vacío); ninguna hoja de negocio con filas nuevas; Gmail conservó `Pruebas-Automatizacion` e `INBOX`, recibió `Revisión manual/Sin tareas detectadas`, sin `Procesado` ni ninguna etiqueta de error, sin archivar.

**Conclusión:** CP-16 PASA. Confirma, en producción real, que `evaluarFiltroDeterministico()` rechaza correctamente un mensaje cuyo cuerpo queda vacío tras recortar una cita, ANTES de invocar a la IA (sin costo de OpenAI), y que el automatizador de integración lo verifica correctamente de punta a punta tras la corrección de `verificarClasificacionSimulada_()`.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-14 — Firma extensa (aprobado vía automatizador de integración Fase 2A)

```text
Fecha de ejecución: 24/07/2026
Caso automatizado: INT-FASE8-06-FIRMA-EXTENSA
runId: b8ed62db-4f41-418e-9acd-276d1bcdd4ee
message_id: 19f9640b73453584 (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Antecedente:** al igual que CP-03/CP-04/CP-15, se ejecutó íntegramente a través del automatizador de integración de Fase 2A. Este fixture reutiliza la generalización a N=1 (ya confirmada por CP-15), reutilizando sin cambios el mismo doble de prueba (`efectoFormalUnaTareaFabrica_`) con un tablero distinto (`Gestión General`). Es el primer fixture con cuerpo **multi-párrafo** (consulta breve + firma de correo + aviso legal de ~15 líneas), a diferencia de los anteriores (un único párrafo continuo) — dos riesgos se reconocieron de antemano y ambos se resolvieron sin iteración: (1) que Gmail reenvuelva alguna línea larga de forma distinta a la esperada y dispare `CUERPO_NO_COINCIDE`; (2) que la IA fabrique una observación/tarea a partir del texto de la firma/aviso legal, en lugar de excluirlo como indica el prompt real (`codigo/prompts_ia.gs`).

### Simulación (`simularYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado.
- La barrera de cuerpo (`CUERPO_NO_COINCIDE`) no se disparó pese al bloque de firma extenso multi-párrafo.
- `[DRY_RUN] 19f9640b73453584: 1 observación(es), 1 tarea(s) simulada(s) [Gestión General/Alto]` — coincide exactamente con lo exigido por CP-14: la firma/aviso legal no generó ninguna observación ni tarea adicional.
- `verificarClasificacionSimulada_()` confirmó cantidad de observaciones, cantidad de tareas y tablero contra `fixture.esperado`, sin discrepancias.
- El automatizador comprobó que no hubo cambios en Gmail ni en las ocho hojas (técnicas y de negocio).
- Resultado final: `[AUTO-FASE8] SIMULACION_OK`.

### Ejecución formal y comprobaciones automáticas (`ejecutarFormalYVerificarCasoIntegracionFase8Visible()`)

- El núcleo informó exactamente 1 mensaje elegible y procesó el mismo `message_id`, con el mismo `runId`/nonce/fingerprint que la simulación (sin re-preparar sesión).
- `Log Mensajes`: exactamente una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`.
- `Registro Tareas`: exactamente 1 fila para el mensaje; `task_id` no vacío; `estado_escritura=ESCRITA`; tablero exactamente `Gestión General`.
- `Indice Idempotencia`: exactamente 1 entrada, `estado_final=PROCESADO`.
- Una fila nueva en `Gestión General`, vinculada por la columna `ID` a ese `task_id`.
- Gmail conservó `Pruebas-Automatizacion` e `INBOX`, recibió `Procesado`, no recibió ninguna etiqueta de revisión/error y no fue archivado.
- Resultado final: `[AUTO-FASE8] FORMAL_OK`.

**Conclusión:** CP-14 PASA. La consulta real (confirmar la reunión) generó exactamente 1 tarea en `Gestión General`; la firma y el aviso legal de ~15 líneas no generaron ninguna tarea falsa — confirma que la exclusión de firmas/avisos legales está correctamente codificada en el prompt real y que el modelo la sigue.

**Estado (veredicto final):** Aprobado — 24/07/2026 (`PASA`).

## Detalle de CP-05 — Correo informativo (aprobado, cierre de INC-FASE8-011)

```text
Fecha de ejecución: 23/07/2026
Cuenta ejecutora: carlosrubenbageta@alia-data.com
message_id: 19f91473b9f5a719 (nuevo)
```

**Antecedente:** este caso estuvo bloqueado por INC-FASE8-011 (`pruebas/resultados/INCIDENCIAS_FASE_8.md`) — un correo completamente informativo no siempre disparaba `motivo_sin_tareas` (regla C-06 inversa). Antes de esta ejecución formal, una tercera corrida del evaluador de IA aislado (`pruebas/evaluador_ia_fase8.gs`), con la versión de prompt corregida `v4-INC-FASE8-011-informativo-sin-tareas`, dio **4/4 fixtures aprobados** (incluido `EVAL-IA-02-INFORMATIVO`, con la forma válida esperada) — esto desbloqueó, sin cerrarla todavía, la ejecución formal de este caso.

### `DRY_RUN=true`

- `procesarCorreosDeTareas()` informó "1 mensaje elegible, procesando 1".
- Versión de prompt confirmada: `v4-INC-FASE8-011-informativo-sin-tareas`.
- `resultado=SIN_TAREAS`, `correo_relevante=true`, `observaciones=0`.
- Sin escrituras en hojas de negocio, hojas técnicas ni Gmail.

### Ejecución formal (`DRY_RUN=false`)

**Comprobación manual confirmada por Carlos Rubén Bageta:**

- **`Log Mensajes`:** `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones=0`, `cantidad_tareas=0`, `resultado_gmail=SOLO_ETIQUETADO`. La columna `error` contiene el `motivo_sin_tareas` esperado: "El correo es un aviso informativo sobre un cambio de horario ya decidido; no contiene ninguna acción pendiente para el equipo." **Aclaración:** este contenido en la columna `error` es el comportamiento vigente e intencional de `finalizarMensajeSinTareas()`, que registra `motivo_sin_tareas` mediante `actualizarLogMensajes()` — no representa un error técnico.
- **`Registro Tareas`:** ninguna fila para este `message_id`.
- **Hojas de negocio:** ninguna tarea creada.
- **`Indice Idempotencia`:** exactamente una entrada, `task_id` vacío, `estado_final=SIN_TAREAS`.
- **Gmail:** conservó `Pruebas-Automatizacion`, recibió `Revisión manual/Sin tareas detectadas`, permaneció en Recibidos, no recibió `Procesado`, no fue archivado.
- Configuración restaurada a `DRY_RUN=true` al finalizar.

**Nota (Claude Cowork):** no se dispone de números de fila concretos en `Log Mensajes`/`Indice Idempotencia` ni rutas de capturas para esta ejecución — no fueron suministrados.

**Conclusión:** CP-05 PASA. El correo completamente informativo produjo `observaciones: []` con `motivo_sin_tareas` explicado, sin generar ninguna tarea ni escritura indebida — confirma que el segundo ejemplo few-shot (INC-FASE8-011) corrigió el patrón observado en la segunda corrida del evaluador aislado.

**Relación con INC-FASE8-011:** esta ejecución formal confirma el cierre de la incidencia — ver `pruebas/resultados/INCIDENCIAS_FASE_8.md`, estado actualizado a "Corrección aplicada y verificada — CP-05 Aprobado".

**Estado (veredicto final):** Aprobado — 23/07/2026 (`PASA`).

### Regresión automatizada posterior al cierre — piloto de Fase 2A (24/07/2026)

```text
Caso automatizado: INT-FASE8-01-INFORMATIVO
runId: dcd52847-c431-4625-8d0e-d3ca82f0f096
message_id: 19f920a199a6666b (nuevo)
Versión de prompt: v4-INC-FASE8-011-informativo-sin-tareas
```

**Simulación automatizada:**

- El núcleo informó exactamente 1 mensaje elegible y procesó el `message_id` preparado.
- Resultado del pipeline: `SIN_TAREAS`, `correo_relevante=true`, `observaciones=0`.
- El automatizador comprobó que no hubo cambios en Gmail, en las tres hojas técnicas ni en las cinco hojas de negocio.
- Resultado final: `[AUTO-FASE8] SIMULACION_OK`.

**Ejecución formal y comprobaciones automáticas:**

- El núcleo informó exactamente 1 mensaje elegible y procesó el mismo `message_id`.
- `Log Mensajes`: exactamente una fila, `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones=0`, `cantidad_tareas=0`, `resultado_gmail=SOLO_ETIQUETADO`.
- `Registro Tareas`: ninguna fila para el mensaje.
- `Indice Idempotencia`: exactamente una entrada, `task_id` vacío, `estado_final=SIN_TAREAS`.
- Las cinco hojas de negocio permanecieron idénticas al baseline.
- Gmail conservó `Pruebas-Automatizacion` e `INBOX`, recibió `Revisión manual/Sin tareas detectadas`, no recibió `Procesado` ni etiquetas de error y no fue archivado.
- Resultado final: `[AUTO-FASE8] FORMAL_OK`.

**Alcance probatorio:** esta corrida es evidencia adicional de regresión y la primera validación real del piloto automatizado de integración. No reemplaza la ejecución formal manual del 23/07/2026 ni cambia la fecha de aprobación original de CP-05.

**Estado:** CP-05 permanece Aprobado; INC-FASE8-011 permanece cerrada.

## Detalle de CP-29 — Dato sensible en el cuerpo (primera corrida real, bug encontrado — INC-FASE8-012)

```text
Fecha de ejecución: 27/07/2026
message_id: no registrado por el usuario en esta corrida; el mensaje ya quedó cerrado/
procesado y no se reutiliza para la segunda corrida.
Instrumentación: gancho gateado por cfg.modoPrueba + property CP29_LOGUEAR_CUERPO_ENMASCARADO
en extraerDatosCorreo() (codigo/script_refactorizado.gs) — registra únicamente el cuerpo ya
enmascarado; sigue activa, pendiente de la segunda corrida.
```

### Primera corrida (falla real — dato sensible sin enmascarar)

- Correo sintético exacto de `pruebas/CASOS_DE_PRUEBA.md`: "Por favor actualicen el medio de pago del cliente. Nueva tarjeta: 4551 8712 3456 7890. DNI del titular: 30.123.456."
- Log: `"CP-29: cuerpo ya enmascarado (instrumentación temporal de prueba): Por favor actualicen el medio de pago del cliente. Nueva tarjeta: 4551 8712 3456 7890. DNI del titular: [DNI_ENMASCARADO]."`
- El DNI se reemplazó correctamente. **La tarjeta quedó completa, sin enmascarar** — el procesamiento continuó con normalidad a partir de ahí (`consultarIAExtractora()` corrió a continuación en el mismo log, versión de prompt `v4-INC-FASE8-011-informativo-sin-tareas`).
- Diagnóstico completo en `pruebas/resultados/INCIDENCIAS_FASE_8.md`, INC-FASE8-012: se descartó una versión desactualizada de `prompts_ia.gs` (el usuario confirmó contenido idéntico, carácter por carácter, al del repo — precedente de CP-09 descartado con evidencia directa esta vez). La causa real: `mensaje.getPlainBody()` puede devolver un espacio no separable (NBSP, U+00A0) entre grupos de dígitos cuando el correo pasó por contenido HTML — carácter visualmente indistinguible de un espacio normal — que el patrón de tarjeta vigente (`[ -]?`, solo espacio ASCII o guion) no reconocía como separador. Reproducido localmente de forma exacta insertando un NBSP real en el mismo texto del caso.

### Corrección aplicada (antes de la segunda corrida)

`codigo/prompts_ia.gs`, `enmascararDatosSensibles()`: patrón de tarjeta cambiado de `/\b(?:\d[ -]?){13,16}\b/g` a `/\b(?:\d[\s-]?){13,16}\b/g` (`\s` cubre cualquier separador Unicode de espacio en blanco, incluido NBSP). Verificado localmente con 7 casos a través de la cadena real completa (`extraerContenidoNuevo` → `normalizarCuerpo` → `enmascararDatosSensibles`): el texto exacto de CP-29 con espacio ASCII, el mismo con NBSP reproduciendo el bug original, los tres separadores en NBSP, guiones, sin separador, un control negativo (teléfono de 6 dígitos, no debe enmascararse) y un control de que el patrón de CBU no cambió — los 7 pasan.

**Conclusión:** CP-29 **no pasa** en esta primera corrida — dato sensible expuesto. La causa ya está corregida en el repo; falta una segunda corrida real (mensaje nuevo, `message_id` distinto) para confirmar antes de aprobar.

**Estado (veredicto parcial):** Pendiente — corrección aplicada, segunda corrida real pendiente (ver INC-FASE8-012).

### Segunda corrida (con la corrección de INC-FASE8-012 aplicada)

Mismo correo sintético, mensaje nuevo (el primer intento ya había quedado cerrado/procesado). Log recibido:

```text
procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1.
CP-29: cuerpo ya enmascarado (instrumentación temporal de prueba): Por favor actualicen el medio de pago del cliente. Nueva tarjeta: [TARJETA_ENMASCARADA]. DNI del titular: [DNI_ENMASCARADO].
consultarIAExtractora(): usando prompt versión v4-INC-FASE8-011-informativo-sin-tareas
```

- Ambos valores quedaron enmascarados correctamente antes de llegar a la IA extractora.
- El procesamiento continuó con normalidad hasta completar la ejecución, sin errores.

**Conclusión:** CP-29 PASA. Confirma, en producción real, que la corrección de INC-FASE8-012 (tolerancia a NBSP en el patrón de tarjeta) resuelve el caso original sin reintroducir el problema. Instrumentación temporal retirada de `codigo/script_refactorizado.gs` (`extraerDatosCorreo()`).

### Endurecimiento adicional de DNI/CBU (decisión post-aprobación, 27/07/2026)

Por decisión de Carlos Rubén Bageta, se aprovechó el hallazgo de INC-FASE8-012 para endurecer también los patrones de DNI y CBU (la misma clase de fragilidad frente a separadores no anticipados), en vez de dejarlo solo como riesgo residual documentado. La verificación local previa al cambio encontró un bug de interacción real: el patrón de tarjeta, al ser un rango greedy (13-16 dígitos), le ganaba un prefijo a cualquier CBU de 22 dígitos agrupado con espacios/guiones si corría antes que el patrón de CBU. Corregido reordenando los reemplazos por especificidad decreciente (CBU → tarjeta → DNI). Verificado localmente con 15 casos contra el código real del archivo (incluida la regresión exacta de CP-29, el caso NBSP original, los nuevos casos de DNI/CBU con espacios/guiones/NBSP, un caso combinado con los tres patrones y separadores mixtos, y controles negativos) — los 15 pasan. Detalle completo en `auditoria/CHANGELOG.md`.

**Riesgo residual documentado, no corregido:** la misma verificación expuso un falso positivo preexistente desde la Fase 4 (no introducido por esta corrección): una secuencia larga de números cortos separados por espacios (ej. una lista numerada extensa) puede coincidir falsamente con el patrón de tarjeta o de CBU. Es un falso positivo de sobre-enmascarado (degrada la calidad de la extracción de la IA en ese caso puntual), no una fuga de datos — de severidad baja, muy distinta de la fuga real que motivó INC-FASE8-012. Resolverlo bien requiere un heurístico más estricto (rediseño), no un ajuste simple. **Decisión (27/07/2026, Carlos Rubén Bageta): aceptado como riesgo residual conocido, no se corrige por ahora.**

**Estado (veredicto final):** Aprobado — 27/07/2026 (`PASA`).

## Detalle de CP-06 — Promoción de Google (reutiliza FC-04, técnica nueva de envío)

```text
Fecha de ejecución: 27/07/2026
message_id: 19fa1c3a956fb554 (nuevo, autoenviado)
Técnica: script temporal de una sola vez, servicio avanzado de Gmail
(Gmail.Users.Messages.send() con MIME crudo en base64url), para fijar un
encabezado List-Unsubscribe que la ventana de redactar normal de Gmail no
permite establecer. Sin instrumentación en codigo/ — el pipeline productivo
corrió sin ninguna modificación.
```

**Por qué esta técnica y no un remitente de Google:** el enunciado original de CP-06 ("Promoción de Google") y la referencia a FC-09 (`drive-shares-noreply@google.com`) sugerían necesitar un remitente `google.com` falsificado, algo que Gmail no permite producir desde una cuenta normal. Revisando `codigo/filtros_correo.gs` se confirmó que **FC-04 es una alternativa igual de válida** (el propio enunciado de CP-06 dice "reutiliza FC-04 o FC-09") y su regla solo depende del encabezado `List-Unsubscribe`, sin ninguna condición sobre el remitente. Ese encabezado tampoco es producible desde la ventana de redactar normal, pero sí mediante el servicio avanzado de Gmail (ya habilitado en este proyecto desde DEC-005), enviando un mensaje MIME crudo con el encabezado incluido directamente.

**Correo sintético enviado:**
```text
Asunto: [PRUEBA-AUTOMATIZACION] Descubri las novedades de este mes
Cuerpo: Hola! Te compartimos las novedades y promociones de este mes. Sin accion requerida.
Encabezado adicional: List-Unsubscribe: <mailto:baja@ejemplo-prueba.com>
```

### Resultado

- `Log Mensajes`: `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones=0`, `cantidad_tareas=0`, `resultado_gmail=SOLO_ETIQUETADO`, `intentos=0`, sin `codigo_http` ni `modelo` (cero llamadas a OpenAI). Columna `error`: "Encabezado List-Unsubscribe presente (boletín, promoción o comunicación masiva)." — coincide textualmente con el mensaje de `codigo/filtros_correo.gs`.
- `Registro Tareas`: ninguna fila para este `message_id`.
- `Indice Idempotencia`: exactamente una entrada, `task_id` vacío, `estado_final=SIN_TAREAS`.
- Gmail: etiquetas `Recibidos` y `Pruebas-Automatizacion` conservadas, `Revisión manual/Sin tareas detectadas` aplicada, **sin** `Procesado`.

**Nota sobre el primer log recibido:** la primera ejecución mostró una línea `"CP-29: cuerpo ya enmascarado..."` — instrumentación temporal ya retirada del repo (`codigo/script_refactorizado.gs`) tras la aprobación de CP-29. Confirmó que el proyecto de prueba tenía una copia desactualizada de ese archivo (mismo patrón que CP-09). No afectó este resultado: esa línea es solo un log de depuración leftover, sin relación con la lógica de extracción ni con el filtro determinístico que decide este caso. Corregido volviendo a copiar el archivo actual al proyecto de prueba.

**Conclusión:** CP-06 PASA. Confirma, en producción real, que el filtro determinístico basado en `List-Unsubscribe` (RF de la Fase 6) descarta correctamente un correo promocional antes de llegar a la IA, sin generar ninguna tarea ni escritura indebida — mismo comportamiento ya confirmado por CP-07 y CP-16 para sus respectivas reglas.

**Estado (veredicto final):** Aprobado — 27/07/2026 (`PASA`).

## Detalle de CP-35 — Sin filas duplicadas en Indice Idempotencia tras recuperaciones sucesivas (H-05/H-06)

```text
Fecha de ejecución: 27/07/2026
message_id: 19fa1dc793d189d7 (nuevo)
task_id: ALI-373E343149F446E3-001
Instrumentación: gancho gateado por cfg.modoPrueba + property CP35_DUPLICAR_FINALIZACION
en finalizarMensaje() (codigo/script_refactorizado.gs) — ya retirado del código.
```

**Antecedente:** este caso estuvo bloqueado desde la auditoría del 20/07/2026 (H-05/H-06, `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 9) porque `finalizarMensaje()` siempre agregaba una fila nueva a `Indice Idempotencia` sin comprobar duplicados por `message_id`+`task_id`, y porque `Log Mensajes` se marcaba `FINALIZADO` antes de confirmar esa escritura. Corrección aplicada en esta sesión: nueva función `upsertIndiceIdempotencia()` (indexada por la clave compuesta, análoga a `obtenerIdsYaProcesados()`) y `finalizarMensaje()` reordenado para confirmar el upsert antes de `actualizarLogMensajes()`.

### Verificación local previa a la corrida real
20 verificaciones con mocks de Sheets/`PropertiesService` sobre el código real extraído del archivo: inserción nueva sin tareas, inserción nueva con tareas, doble invocación mismo mensaje/mismo estado (no duplica), doble invocación mismo mensaje/distinto estado (el valor final refleja la segunda llamada), lote mixto con claves nuevas y existentes en la misma llamada, orden de llamadas (el upsert corre antes que `actualizarLogMensajes()`), y comportamiento de la instrumentación temporal (exactamente una llamada extra, sin recursión sin límite, e inerte fuera de `cfg.modoPrueba`) — las 20 pasan.

### Corrida real
- Correo sintético normal (genera 1 tarea). Log: `"procesarCorreosDeTareas(): 1 mensajes elegibles, procesando 1."` → `consultarIAExtractora()` → `"CP-35: forzando una segunda invocación real de finalizarMensaje()..."` — **exactamente una vez**, confirmando que el guard contra recursión funcionó (no hay una segunda línea, ni una cadena).
- `Indice Idempotencia`: **una sola fila** para `message_id 19fa1dc793d189d7` + `task_id ALI-373E343149F446E3-001`, con `estado_final = CP35_SEGUNDA_LLAMADA` — el valor de la *segunda* invocación, no el de la primera (`PROCESADO`), confirmando que fue una actualización real y no un no-op ni una fila fantasma.
- `Log Mensajes`: la misma fila (no duplicada), `estado = CP35_SEGUNDA_LLAMADA`, `etapa = FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`.

**Conclusión:** CP-35 PASA. Confirma, en producción real, que dos invocaciones de `finalizarMensaje()` para el mismo mensaje/tareas producen una sola fila final en `Indice Idempotencia` (actualizada, no duplicada) y que `Log Mensajes` no se marca `FINALIZADO` como una operación separada e inconsistente — cierra H-05 y H-06.

**Estado (veredicto final):** Aprobado — 27/07/2026 (`PASA`). **Con esto queda cerrado el último punto que condicionaba la aprobación de la Fase 8.**

## Detalle de CP-38 — Recuperación tras archivado previo, sin depender de la búsqueda de Gmail (H-07)

```text
Fecha de ejecución: 27/07/2026
message_id: 19fa40fc2e504081
Instrumentación: gancho gateado por cfg.modoPrueba + property CP38_FORZAR_FALLO_POSTERIOR
en procesarUnMensaje() (codigo/script_refactorizado.gs) — ya retirado del código.
PERMITIR_ARCHIVADO=true (temporal, ya revertido).
```

**Antecedente:** este caso estuvo bloqueado desde la auditoría del 20/07/2026 (H-07, `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 10) porque un mensaje archivado por `aplicarResultadoGmail()` antes de que fallara un paso posterior quedaba `ERROR_TEMPORAL` para siempre: la única vía de recuperación existente (`reanudarDesdeManifiesto()` disparado desde la entrada de `procesarUnMensaje()`) dependía de que `obtenerMensajesPendientesDesdeGmail()` volviera a encontrar el mensaje, cosa que no ocurre si ya salió de `in:inbox`. Corrección aplicada en la sesión del 27/07/2026 (DEC-010): nueva función `recuperarMensajesConManifiestoPendiente(cfg)` que escanea `Log Mensajes` directamente, sin pasar por ninguna búsqueda de Gmail.

### Verificación local previa a la corrida real
5 verificaciones con mocks de Sheets/`PropertiesService` sobre el código real extraído del archivo (ver `auditoria/CHANGELOG.md`, entrada del 27/07/2026): reanuda un `ERROR_TEMPORAL` con manifiesto sin cerrar; ignora uno sin manifiesto, uno ya cerrado en `Indice Idempotencia`, y uno que no está en `ERROR_TEMPORAL`; cuenta correctamente los mensajes reanudados — las 5 pasan.

### Corrida real
- **Primera ejecución** (instrumentada, `PERMITIR_ARCHIVADO=true`): el mensaje se procesó normalmente, `aplicarResultadoGmail()` lo archivó de verdad, y justo después la instrumentación forzó la excepción simulada — el mensaje quedó `ERROR_TEMPORAL` con manifiesto persistido y ya fuera de `in:inbox`.
- **Segunda ejecución** (recuperación, instrumentación desactivada): log completo —
  ```text
  recuperarMensajesConManifiestoPendiente(): 19fa40fc2e504081 en ERROR_TEMPORAL con
    manifiesto persistido; reanudando sin depender de la búsqueda de Gmail.
  reanudarDesdeManifiesto(): todas las tareas de 19fa40fc2e504081 ya estaban ESCRITA;
    se repite únicamente la actualización de Gmail.
  recuperarMensajesConManifiestoPendiente(): 1 mensaje(s) reanudado(s).
  procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0.
  ```
  La línea `"0 mensajes elegibles, procesando 0"` es la confirmación clave: la búsqueda normal de Gmail no encontró el mensaje (estaba archivado), y aun así se recuperó — prueba directa de que la recuperación ocurrió exclusivamente por la nueva función de H-07, no por el chequeo de manifiesto ya existente en la entrada de `procesarUnMensaje()` (que solo actúa sobre mensajes que la búsqueda sí trae).

### Verificación en planilla real (confirmada por Carlos Rubén Bageta)
- `Log Mensajes` (`message_id 19fa40fc2e504081`): `estado=PROCESADO`, `etapa=FINALIZADO`, `error` vacío (confirma H-12), `unidades_gmail_api=2` (confirma H-11: 1 de la corrida que archivó + 1 de la recuperación, acumulado, no sobrescrito).
- `Indice Idempotencia`: 2 filas nuevas (una por tarea), `estado_final=PROCESADO`.
- `Registro Tareas`: sin duplicar — las mismas 2 filas `ESCRITA` de la corrida original.

**Conclusión:** CP-38 PASA. Confirma, en producción real, que un mensaje archivado antes de una falla posterior se recupera igual en la ejecución siguiente, sin depender de que la búsqueda de Gmail lo encuentre — cierra H-07. Confirma además, como efecto colateral de este mismo escenario, H-11 (acumulación de `unidades_gmail_api`) y H-12 (limpieza de `error` en cierres exitosos). H-10 (exclusión de `ANULADA`) no fue ejercitado por este escenario (ninguna tarea estaba `ANULADA`) y permanece verificado solo localmente con mocks.

**Estado (veredicto final):** Aprobado — 27/07/2026 (`PASA`). Instrumentación temporal retirada de `codigo/script_refactorizado.gs`.

## Detalle de CP-39 — Límite de reintentos Gmail y salida a error permanente (H-08, DEC-007)

```text
Fecha de ejecución: 27/07/2026
message_id: 19fa443c94a40af2
LIMITE_REINTENTOS_GMAIL: 6 (valor configurado en el proyecto de prueba)
Instrumentación: gancho gateado por cfg.modoPrueba + property CP39_FORZAR_FALLO_GMAIL_REPETIDO
en aplicarResultadoGmail() (codigo/script_refactorizado.gs) — ya retirado del código.
7 ejecuciones manuales sucesivas, sin espera adicional entre corridas.
```

**Antecedente:** este caso estuvo bloqueado desde la auditoría del 20/07/2026 (H-08, DEC-007) hasta que se agregaron la columna `intentos_gmail` y la propiedad `LIMITE_REINTENTOS_GMAIL`, verificadas localmente (`documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 11). Al preparar el procedimiento de este caso —antes de instrumentar o correr nada— se detectó H-14 (ver `auditoria/CHANGELOG.md`, DEC-012): con H-07 ya activo, un mensaje `ERROR_TEMPORAL` con manifiesto que no se archiva (exactamente este escenario) se encontraba dos veces por ejecución, duplicando `intentos_gmail`. Corregido y verificado localmente antes de esta corrida.

### Corrida real

- **Ejecución 1** (12:58:53): `"1 mensajes elegibles, procesando 1"` → `consultarIAExtractora()` → tareas generadas y escritas → `aplicarResultadoGmail()` interrumpida por la instrumentación → `Error procesando mensaje ...: CP-39: falla de Gmail simulada...` → `intentos_gmail: 0→1`, `estado=ERROR_TEMPORAL`.
- **Ejecuciones 2 a 6** (12:59:14 a 12:59:52): cada una repite el mismo patrón — `recuperarMensajesConManifiestoPendiente(): ... en ERROR_TEMPORAL con manifiesto persistido; reanudando sin depender de la búsqueda de Gmail` → `reanudarDesdeManifiesto(): ...ya estaban ESCRITA; se repite únicamente la actualización de Gmail` → falla de nuevo → **`procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0`** (confirma H-14: la búsqueda normal no vuelve a encontrar el mensaje en la misma ejecución). `intentos_gmail` avanza de a 1 por corrida: 2, 3, 4, 5, 6.
- **Ejecución 7** (13:07:03): mismo patrón, pero esta vez `gestionarErrorMensaje(): 19fa443c94a40af2 superó LIMITE_REINTENTOS_GMAIL (6); cierre ERROR_DEFINITIVO con las tareas ya escritas conservadas` — `intentos_gmail: 6→7`, `7 > 6`, cierra.

### Verificación en planilla real (confirmada por Carlos Rubén Bageta)

- `Log Mensajes` (`message_id 19fa443c94a40af2`): `estado=ERROR_DEFINITIVO`, `etapa=FINALIZADO`, `error` con el texto de la instrumentación **conservado** (confirma H-12: se limpia solo en `PROCESADO`), `intentos_gmail=7`.
- `Indice Idempotencia`: 2 filas nuevas (una por tarea), `estado_final=ERROR_DEFINITIVO`.
- `Registro Tareas`: sin duplicar — las mismas 2 filas `ESCRITA` de la corrida original.

**Nota sobre `resultado_gmail`/`unidades_gmail_api`:** a diferencia de CP-38 (donde la instrumentación corre después de una llamada real exitosa a Gmail), el gancho de CP-39 interrumpe `aplicarResultadoGmail()` **antes** de la llamada real a `Gmail.Users.Messages.modify()`. Por eso ninguna de las 7 ejecuciones hizo una llamada real a la API de Gmail, y `resultado_gmail`/`unidades_gmail_api` no cambiaron respecto de su valor inicial — comportamiento esperado de este mecanismo específico, no un defecto.

**Conclusión:** CP-39 PASA. Confirma, en producción real, que `gestionarErrorMensaje()` cierra `ERROR_DEFINITIVO` al superar `LIMITE_REINTENTOS_GMAIL`, conservando las tareas ya escritas (no se revierten) — cierra H-08. Confirma además, en producción real, que H-14 evita el doble intento por ejecución que se había detectado leyendo el código antes de correr este caso.

**Estado (veredicto final):** Aprobado — 27/07/2026 (`PASA`). Instrumentación temporal retirada de `codigo/script_refactorizado.gs`. **Con esto, los dos casos de regresión de los Lotes 2/3 (DEC-009) — CP-38 y CP-39 — están Aprobados.**

## Resumen final (completar al terminar)

```text
Total de casos: 39
Total de casos que condicionan la aprobación de esta fase: 36 (CP-01 a CP-29, CP-31 a CP-37)
  [Corregido 21/07/2026: el conteo anterior indicaba 37, error aritmético — 29 (CP-01 a CP-29) + 7 (CP-31 a CP-37) = 36. No cambia el alcance ni el estado de ningún caso.]
  CP-10, CP-36, CP-37 incorporados desde Lote 1 (DEC-009, 21/07/2026)
Diferido a Fase 10 (no condiciona esta fase): 1 (CP-30, DEC-004)
Bloqueado que todavía condiciona la Fase 8: 0 (CP-35 pasó a Aprobado el 27/07/2026, ver nota de auditoría abajo — ya no queda ningún caso Bloqueado que condicione esta fase)
Bloqueados pendientes de Lotes 2/3 (no condicionan esta fase): 0
  [Corregido 27/07/2026: CP-38 pasó de Bloqueado a Aprobado (corrida real, H-07, ver detalle); el conteo pasa de 2 a 1.]
  [Corregido 27/07/2026: CP-39 pasó de Bloqueado a Aprobado (corrida real, H-08, ver detalle); el conteo pasa de 1 a 0. No queda ningún caso bloqueado pendiente de los Lotes 2/3.]
Aprobados: 36 (CP-01, CP-02, CP-03, CP-04, CP-05, CP-06, CP-07, CP-08, CP-09, CP-10, CP-11, CP-12, CP-13, CP-14, CP-15, CP-16, CP-17, CP-18, CP-19, CP-20, CP-21, CP-22, CP-23, CP-24, CP-25, CP-26, CP-27, CP-28, CP-29, CP-31, CP-32, CP-33, CP-34, CP-35, CP-36, CP-37)
Rechazados: 0
  CP-19 pasó de Rechazado (21/07/2026, INC-FASE8-008) a Aprobado (22/07/2026, regresión real con message_id nuevo). El registro de la ejecución fallida original se conserva íntegro en el detalle de CP-19.
  CP-23 pasó de Rechazado (22/07/2026, INC-FASE8-009) a Aprobado (22/07/2026, regresión real con message_id nuevo). El registro de la ejecución vulnerable original se conserva íntegro en el detalle de CP-23.
  CP-02 pasó de Rechazado (22/07/2026, INC-FASE8-010) a Aprobado (22/07/2026, segunda regresión real con message_id nuevo). El registro de las dos ejecuciones fallidas originales se conserva íntegro en el detalle de CP-02.
  CP-05 pasó de Pendiente — bloqueado por INC-FASE8-011 a Aprobado (23/07/2026, ejecución formal con message_id 19f91473b9f5a719, tras una tercera corrida del evaluador de IA aislado con resultado 4/4). El registro histórico de la incidencia se conserva íntegro en `pruebas/resultados/INCIDENCIAS_FASE_8.md`.
  CP-03 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f953e0047d2478, tras tres iteraciones reales de ajuste del fixture/automatizador — ninguna un defecto del pipeline productivo). El registro de las tres corridas previas se conserva íntegro en `auditoria/CHANGELOG.md` y en el detalle de CP-03.
  CP-04 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f95bc29ad0717d, tras un ajuste de redacción del fixture — no un defecto del pipeline productivo). El registro de la corrida previa se conserva íntegro en `auditoria/CHANGELOG.md` y en el detalle de CP-04.
  CP-15 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f9621b19597350, al primer intento, sin necesitar ajuste de redacción). Confirma además, en producción real, que RF-04 (consolidación de observaciones duplicadas) está correctamente codificada en el prompt y que el modelo la sigue.
  CP-14 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f9640b73453584, al primer intento, sin necesitar ajuste de redacción, pese a ser el primer fixture con cuerpo multi-párrafo). Confirma además, en producción real, la exclusión de firmas/avisos legales por parte de la IA.
  CP-16 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f9677c994bf546, en el segundo intento — el primero expuso un defecto del verificador (`verificarClasificacionSimulada_()` no contemplaba `NO_ELEGIBLE`), nunca un defecto del pipeline productivo, que ya rechazaba correctamente el mensaje). Confirma además, en producción real, que el filtro determinístico rechaza un cuerpo vacío antes de la IA, sin generar ninguna llamada a OpenAI — primer caso de este automatizador con esa característica.
  CP-17 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f9699bac4232c8, al primer intento, sin necesitar ningún ajuste de redacción). Confirma además, en producción real, que `construirFechaLocal()` no produce el corrimiento de un día en la columna "Fecha límite" — el tester confirmó visualmente `31/07/2026` en la hoja `Comercial`.
  CP-18 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f96b3f0b156c2a, al primer intento, sin necesitar ningún ajuste de redacción). Complemento exacto de CP-17: confirma que, sin fecha en el cuerpo, la columna "Fecha límite" queda vacía en vez de que la IA invente una fecha.
  CP-07 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f96cb239f5ec62, al primer intento, sin necesitar ningún ajuste). Confirma además, en producción real, que la regla obligatoria de notificaciones de fallos de Apps Script dispara correctamente por asunto (sin necesitar el remitente exigido, no enviable) y aplica la etiqueta `Revisión manual/Error de automatización`, distinta de la de CP-16 — sin generar ninguna llamada real a OpenAI.
  CP-12 pasó de Pendiente a Aprobado (25/07/2026, ambas variantes ejecutadas en el flujo clásico con instrumentación temporal — Variante A: message_id 19f96ec29b3c8486, excepción capturada, ERROR_TEMPORAL recuperado vía manifiesto; Variante B: message_id 19f9734c63bb0299, runtime interrumpido sin excepción, EN_PROCESO recuperado vía recuperarProcesamientosAbandonados()/UMBRAL_ABANDONO_MIN. Ambas convergieron al mismo resultado final, sin duplicar tareas ni volver a consultar la IA). El registro de ambas corridas se conserva íntegro en el detalle de CP-12.
  CP-25 pasó de Pendiente a Aprobado (26/07/2026, flujo clásico con instrumentación temporal, message_id 19fa0743dc9d5b94 -- mismo mecanismo que CP-12 Variante A, pero recuperado en la ejecucion inmediatamente siguiente sin esperar ningun umbral de tiempo, ya que ERROR_TEMPORAL sigue "elegible" para el bucle normal. reanudarDesdeManifiesto() confirmo sin volver a consultar la IA ni reescribir tareas, sin duplicados en Desarrollo IT/Comercial. Aprobo al primer intento). El registro de ambas corridas se conserva integro en el detalle de CP-25.
  CP-26 pasó de Pendiente a Aprobado (26/07/2026, flujo clásico con instrumentación temporal, message_id 19fa0a67abbf10f3 -- interrumpe en un punto anterior a CP-12/CP-25: entre persistirManifiestoTareas() y escribirFilasPorLote(), dejando las tareas RESERVADA en vez de ESCRITA. reanudarDesdeManifiesto() escribio las tareas pendientes usando los mismos task_id ya reservados, sin volver a consultar la IA ni generar un manifiesto nuevo. Un primer intento con otro correo se descarto por una property no creada, sin relacion con el pipeline). El registro de ambas corridas se conserva integro en el detalle de CP-26.
  CP-32 pasó de Pendiente a Aprobado (26/07/2026, flujo clásico con instrumentación temporal, message_id 19fa0d6ae4f8f334 -- mismo mecanismo ya probado por CP-25, ejecutado con su propia evidencia siguiendo la misma disciplina aplicada a CP-25 respecto de CP-12. reanudarDesdeManifiesto() confirmo sin volver a consultar la IA ni reescribir tareas, sin duplicados. Un primer intento con otro correo se descarto por una property no creada, mismo problema visto en CP-26). El registro de ambas corridas se conserva integro en el detalle de CP-32.
  CP-33 pasó de Pendiente a Aprobado (26/07/2026, flujo clásico con instrumentación temporal, message_id 19fa0f11793dc340 -- mismo mecanismo ya probado por CP-26, ejecutado con su propia evidencia siguiendo la misma disciplina aplicada a CP-32 respecto de CP-25. Aprobo al primer intento: reanudarDesdeManifiesto() escribio las tareas RESERVADA pendientes usando los mismos task_id ya reservados, sin volver a consultar la IA ni generar un manifiesto nuevo). El registro de ambas corridas se conserva integro en el detalle de CP-33.
  CP-34 pasó de Pendiente a Aprobado (26/07/2026, flujo clásico con instrumentación temporal, message_id 19fa107c79d673bb, 3 corridas -- mismo gancho de CP-12/CP-25/CP-32 mantenido activo durante dos corridas consecutivas. La segunda falla se capturo por el mismo camino que la primera, con una sola linea de error (sin cadena de reintentos, Log Mensajes sin cambios); la tercera corrida recupero el mensaje limpiamente sin duplicar tareas. Aprobo al primer intento. Cierra la familia completa de recuperacion desde manifiesto: CP-12, CP-25, CP-26, CP-32, CP-33 y CP-34). El registro de las tres corridas se conserva integro en el detalle de CP-34.
  CP-08 pasó de Pendiente a Aprobado (26/07/2026, instrumentación temporal en codigo/cliente_openai.gs -- distinto de la familia de recuperación: consultarIAExtractora() devolvió contenidoCrudo inválido sin llamar a la API real de OpenAI. validarRespuestaIA() lo detecto y el mensaje se cerro REVISION_MANUAL/FINALIZADO de inmediato (sin manifiesto), sin fila en Registro Tareas, con etiqueta Revisión manual/Error de procesamiento. Aprobo al primer intento). El registro de la corrida se conserva integro en el detalle de CP-08.
  CP-09 pasó de Pendiente a Aprobado (26/07/2026, instrumentación temporal en codigo/cliente_openai.gs, opción b -- HTTP 503 simulado en el intento 1 y HTTP 200 con contenido válido en el intento 2, preservando intacto el bucle real de reintentos (solo se reemplazó el objeto response de UrlFetchApp.fetch()). Log Mensajes.intentos=2, tarea generada normalmente en el segundo intento, sin duplicados. Dos intentos previos se descartaron por una copia desactualizada del archivo en el proyecto de prueba, sin relación con el pipeline). El registro de la corrida se conserva integro en el detalle de CP-09.
  CP-13 pasó de Pendiente a Aprobado (26/07/2026, instrumentación temporal mínima -- un delay artificial de 15s en procesarCorreosDeTareas() para hacer confiable el timing de dos ejecuciones manuales casi simultáneas. Una pestaña obtuvo el lock y proceso normalmente; la otra registro unicamente el rechazo por lock y termino sin tocar Gmail/Sheets. Aprobo al primer intento. Hallazgo colateral sin impacto en esta aprobacion: se detecto un archivo Código.gs sin usar en el proyecto de prueba con una funcion de mismo nombre, generando una colision de espacio de nombres -- el usuario decidio eliminarlo). El registro de ambas pestañas se conserva integro en el detalle de CP-13.
  CP-29 pasó de Pendiente a Aprobado (27/07/2026, instrumentación temporal en codigo/script_refactorizado.gs -- primera corrida real reveló un dato sensible sin enmascarar (tarjeta), causa raíz en un separador NBSP no tolerado por el patrón (INC-FASE8-012); corregido en codigo/prompts_ia.gs y confirmado en una segunda corrida real con mensaje nuevo, ambos valores enmascarados correctamente. Endurecimiento adicional de DNI/CBU aplicado después por decisión de Carlos Rubén Bageta, con un bug de interacción encontrado y corregido en la propia verificación local -- ver auditoria/CHANGELOG.md). El registro de ambas corridas se conserva íntegro en el detalle de CP-29.
  CP-06 pasó de Pendiente a Aprobado (27/07/2026, message_id 19fa1c3a956fb554, sin instrumentación de código -- correo sintético autoenviado con encabezado List-Unsubscribe mediante un script temporal usando el servicio avanzado de Gmail, tras confirmar que la regla que dispara RevisionSinTareas para FC-04 depende solo de ese encabezado y no del remitente como se creía originalmente. El filtro determinístico lo descartó correctamente antes de llegar a la IA, sin generar tarea ni escritura indebida. Aprobó al primer intento real). El registro de la corrida se conserva íntegro en el detalle de CP-06.
Pendientes (ejecutables con estado Pendiente, no corridos aún): 0
  [Corregido 27/07/2026: CP-29 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 2 a 1.]
  [Corregido 27/07/2026: CP-06 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 1 a 0. No quedan casos Pendientes ejecutables sin corregir.]
  [Corregido 22/07/2026: esta lista omitía a CP-27, ya aprobado desde el 20/07/2026 (CP-27 — Modo prueba con ID productivo); no cambia el alcance ni el estado de ningún caso.]
  [Corregido 23/07/2026 (semántica): CP-35 estaba contabilizado dentro de "Pendientes"; su estado individual es Bloqueado (ver nota de auditoría abajo), no Pendiente. Se lo separa como bloqueado que todavía condiciona la Fase 8. Pendientes pasa de 20 a 19; no cambia el estado individual de ningún caso.]
  [Corregido 24/07/2026: CP-03 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 19 a 18.]
  [Corregido 24/07/2026: CP-04 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 18 a 17.]
  [Corregido 24/07/2026: CP-15 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 17 a 16.]
  [Corregido 24/07/2026: CP-14 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 16 a 15.]
  [Corregido 24/07/2026: CP-16 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 15 a 14.]
  [Corregido 24/07/2026: CP-17 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 14 a 13.]
  [Corregido 24/07/2026: CP-18 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 13 a 12.]
  [Corregido 24/07/2026: CP-07 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 12 a 11.]
  [Nota 24/07/2026: CP-12 tiene su Variante A Aprobada (ejecución real, ver `pruebas/CASOS_DE_PRUEBA.md` y el detalle de este documento) — no se mueve a "Aprobados" ni se resta de "Pendientes" porque el caso completo exige que ambas variantes converjan al mismo resultado (igual criterio que CP-31, contado como Aprobado recién con las 4 combinaciones). La Variante B permanece pendiente.]
  [Corregido 25/07/2026: CP-12 completó su Variante B (ver detalle) y pasa de Pendiente a Aprobado — ambas variantes convergieron al mismo resultado final; Pendientes pasa de 11 a 10. Reemplaza la nota anterior (24/07/2026), que dejaba a CP-12 fuera de "Aprobados" mientras la Variante B seguía pendiente.]
  CP-01, CP-02, CP-03, CP-04, CP-05, CP-07, CP-10, CP-11, CP-12, CP-14, CP-15, CP-16, CP-17, CP-18, CP-19, CP-20, CP-21, CP-22, CP-23, CP-24, CP-27, CP-28, CP-31, CP-36 y CP-37 aprobados
  CP-21 ya no está bloqueado por INC-FASE8-008 (CP-19 Aprobado) y fue ejecutado y aprobado el 22/07/2026
  CP-05 ya no está bloqueado por INC-FASE8-011 (cerrada) y fue ejecutado y aprobado el 23/07/2026
  CP-03 fue ejecutado y aprobado el 24/07/2026
  CP-04 fue ejecutado y aprobado el 24/07/2026
  CP-15 fue ejecutado y aprobado el 24/07/2026
  CP-14 fue ejecutado y aprobado el 24/07/2026
  CP-16 fue ejecutado y aprobado el 24/07/2026
  CP-17 fue ejecutado y aprobado el 24/07/2026
  CP-18 fue ejecutado y aprobado el 24/07/2026
  CP-07 fue ejecutado y aprobado el 24/07/2026
  CP-12 completó ambas variantes y fue aprobado el 25/07/2026
  CP-25 fue ejecutado y aprobado el 26/07/2026
  CP-26 fue ejecutado y aprobado el 26/07/2026
  CP-32 fue ejecutado y aprobado el 26/07/2026
  CP-33 fue ejecutado y aprobado el 26/07/2026
  CP-34 fue ejecutado y aprobado el 26/07/2026
  CP-08 fue ejecutado y aprobado el 26/07/2026
  CP-09 fue ejecutado y aprobado el 26/07/2026
  CP-13 fue ejecutado y aprobado el 26/07/2026
  CP-29 fue ejecutado y aprobado el 27/07/2026 (segunda corrida real, tras corrección de INC-FASE8-012)
  CP-06 fue ejecutado y aprobado el 27/07/2026
  CP-35 pasó de Bloqueado a Aprobado el 27/07/2026, tras aplicar y verificar en producción real la corrección de H-05/H-06 (ver detalle) — cierra el último punto que condicionaba la Fase 8
Casos sin aprobación que todavía condicionan la Fase 8: 0. **Todos los 36 casos que condicionan la aprobación de la Fase 8 (CP-01 a CP-29, CP-31 a CP-37) están Aprobados. La Fase 8 puede darse por completa según el criterio de DEC-004/DEC-009.**
Sin aprobación total (CP-30, no condiciona esta fase): 1

Nota (auditoría 20/07/2026): CP-35 pasó a "bloqueado" — no podía considerarse
una verificación válida del criterio "no existen duplicados" hasta que
finalizarMensaje() implementara upsert (ver documentacion/RECUPERACION_INTERRUPCIONES.md,
sección 9). Se recomendó no cerrar la Fase 8 sin resolver este punto.

**Resuelto (27/07/2026):** `finalizarMensaje()` ahora hace upsert por la clave
compuesta `message_id+task_id` (nueva función `upsertIndiceIdempotencia()`) y
confirma esa escritura antes de marcar `Log Mensajes` como `FINALIZADO` (cierra
H-05 y H-06). Verificado localmente (20 casos con mocks de Sheets) y luego en
producción real forzando una doble invocación de `finalizarMensaje()` para el
mismo mensaje — una sola fila final por `task_id`, genuinamente actualizada,
sin duplicados. CP-35 pasa de Bloqueado a Aprobado. Con esto, todos los casos
que condicionan la Fase 8 están Aprobados.
**Actualizado (27/07/2026):** Carlos Rubén Bageta decidió aplicar los Lotes 2/3 en vez de diferirlos (DEC-007 actualizada, DEC-010, DEC-011, todas "Aprobada y aplicada"). **CP-38 pasó de Bloqueado a Aprobado** el mismo día, confirmado con corrida real (ver "Detalle de CP-38" arriba) — recuperó un mensaje archivado sin depender de la búsqueda de Gmail, tal como predice H-07, con `Log Mensajes`/`Indice Idempotencia`/`Registro Tareas` verificados en la planilla real. **CP-39 también pasó de Bloqueado a Aprobado** el mismo día (ver "Detalle de CP-39" arriba) — 7 ejecuciones reales confirmaron que `gestionarErrorMensaje()` cierra `ERROR_DEFINITIVO` al superar `LIMITE_REINTENTOS_GMAIL`, con las tareas conservadas. Al preparar CP-39 se detectó y corrigió además H-14 (doble intento por ejecución, DEC-012), confirmado en la propia corrida real de CP-39. **Con esto, los dos casos de regresión de los Lotes 2/3 (DEC-009) están Aprobados — no queda ningún caso pendiente que condicione el cierre formal de la Fase 8.**

Nota (Lote 1, 21/07/2026): volver a copiar al proyecto de Apps Script de prueba:
  codigo/script_refactorizado.gs  (validarConfiguracion, obtenerMensajesPendientesDesdeGmail,
    procesarUnMensajeSimulado, extraerDatosCorreo)
  codigo/escritura_sheets.gs      (eliminada constante CUENTA_OPERATIVA,
    construirEnlaceCorreo firma actualizada)
Nota (INC-FASE8-006, 21/07/2026): también volver a copiar:
  codigo/recuperacion.gs          (obtenerMetadatosMensaje + construirEnlaceCorreo reciben cfg)
  pruebas/debug_seguro_pruebas.gs (maxMensajesBusqueda en lugar de maxHilos en la vista segura)

¿Todos los casos críticos (CP-01 a CP-29, CP-31 a CP-37) pasaron?
¿Se detectaron duplicados?
¿Se generaron tareas falsas?
¿Las tareas llegaron a la hoja correcta?
¿Los errores quedaron trazados en Log Mensajes?
¿El modo prueba impidió toda escritura/archivado productivo?
¿El script pudo reejecutarse de forma segura (CP-11, CP-13)?
```
