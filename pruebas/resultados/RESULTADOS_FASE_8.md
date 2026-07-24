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
| CP-06 | Promoción de Google | | | | Pendiente |
| CP-07 | Notificación de Apps Script | | | | Pendiente |
| CP-08 | JSON inválido | | | | Pendiente |
| CP-09 | Error HTTP temporal | | | | Pendiente |
| CP-10 | Hoja inexistente | 21/07/2026, ejecución formal ~21:18 | Hoja `Desarrollo IT` renombrada temporalmente a `Desarrollo IT__CP10_TEMP` (mismo comportamiento de hoja inexistente). Lote de 2 mensajes: uno a la hoja inexistente (`REVISION_MANUAL`/`ERROR_ESCRITURA`), otro a `Finanzas` (`PROCESADO`/`ESCRITA`). Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-11 | Mismo mensaje dos veces | 21/07/2026, ~21:43 | `procesarCorreosDeTareas()` informó `0 mensajes elegibles, procesando 0` reutilizando los dos mensajes ya cerrados de CP-10. Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-12 | Caída después de escritura parcial | | Criterio revisado por auditoría de INC-FASE8-005: el caso tal como estaba redactado asumía recuperación vía `UMBRAL_ABANDONO_MIN`, sin contemplar el cierre inmediato de `gestionarErrorMensaje()`. Ejecutar recién después de aplicar la corrección de INC-FASE8-005. | | Pendiente (bloqueado por INC-FASE8-005) |
| CP-13 | Dos ejecuciones simultáneas | | | | Pendiente |
| CP-14 | Firma extensa | | | | Pendiente |
| CP-15 | Observaciones duplicadas | 24/07/2026 (automatizador de integración Fase 2A) | Ver detalle completo debajo de la tabla. Resumen: `SIMULACION_OK` confirmó 1 observación/1 tarea (`Finanzas/Alto`), sin escrituras; `FORMAL_OK` confirmó automáticamente `Log Mensajes`, 1 fila en `Registro Tareas`, 1 entrada en `Indice Idempotencia`, fila nueva en `Finanzas`, y etiqueta `Procesado` en Gmail. Aprobó al primer intento. | Registro `[AUTO-FASE8]` de la corrida real — `runId 01fbd80c-a874-4eed-82a6-c21a14b8070f`, `message_id 19f9621b19597350` | Aprobado — 24/07/2026 |
| CP-16 | Cuerpo vacío | | | | Pendiente |
| CP-17 | Fecha límite explícita | | | | Pendiente |
| CP-18 | Fecha no explícita | | | | Pendiente |
| CP-19 | Respuesta nueva en hilo ya procesado | 21/07/2026 (ejecución fallida) y 22/07/2026 (regresión aprobada) | Ejecución original (21/07/2026): descubrimiento por `message_id` correcto, pero `extraerContenidoNuevo()` no recortó el historial citado (INC-FASE8-008) — la IA generó 2 tareas en vez de 1. Corrección aplicada en `codigo/script_refactorizado.gs`. Regresión (22/07/2026, hilo sintético nuevo, `message_id 19f87e72c61fcf01`): exactamente 1 tarea generada (`Comercial`), sin ninguna fila basada en el contenido histórico citado. Ver detalle completo (ambas ejecuciones) debajo de la tabla. | Ejecución fallida: `Log Mensajes` (`19f876c74f7f71ae`), `Registro Tareas` (P13/P14), `Indice Idempotencia` (`ALI-E7FF66FDAE16DEA1-001`/`002`) — evidencia real, conservada sin modificar. Regresión: `Registro Tareas`/`Log Mensajes`/`Indice Idempotencia` para `19f87e72c61fcf01` — verificación manual de Carlos Rubén Bageta, sin captura archivada | Aprobado — 22/07/2026 (regresión real, tras corrección de INC-FASE8-008) |
| CP-20 | Mensaje anterior a FECHA_INICIO_CORTE | 22/07/2026 | `FECHA_INICIO_CORTE=2026-07-23T00:00:00-03:00` (normalizada `2026-07-23T03:00:00.000Z`); mensaje sintético del 22/07/2026 (`message_id 19f8a791041de0d4`), anterior al corte. Registro: "Mensaje 19f8a791041de0d4 excluido por antigüedad (anterior a FECHA_INICIO_CORTE)."; "procesarCorreosDeTareas(): 0 mensajes elegibles, procesando 0." Sin llamada a IA; sin fila en `Log Mensajes`/`Registro Tareas`/`Indice Idempotencia`; Gmail no modificado. No requirió ejecución `DRY_RUN=false` (el filtro ocurre antes de seleccionar el camino simulado o formal). Configuración restaurada y revalidada después. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-21 | Respuesta que cita un correo ya procesado | 22/07/2026 | `DRY_RUN=true`: "1 mensaje elegible, procesando 1", `resultado=SIN_TAREAS`, `correo_relevante=false`, `observaciones=0`, sin escrituras. Ejecución formal `DRY_RUN=false`: sin fila en `Registro Tareas` para `message_id 19f8a4fee5b229ec`; `Log Mensajes` `SIN_TAREAS`/`FINALIZADO`; `Indice Idempotencia` con exactamente una entrada (`task_id` vacío, `estado_final = SIN_TAREAS`); ninguna tarea generada a partir del historial citado; Gmail archivó el mensaje; sin duplicados ni errores. `extraerContenidoNuevo()` descartó correctamente el historial citado. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-22 | Intento de manipular el prompt | 22/07/2026 | `DRY_RUN=true` (`message_id 19f8a890b34363d4`): `resultado=RESPUESTA_IA_INVALIDA`, sin escrituras — fallo seguro. Ejecución formal `DRY_RUN=false`, `PERMITIR_ETIQUETADO=false`, `PERMITIR_ARCHIVADO=false`: `Log Mensajes` `REVISION_MANUAL`/`FINALIZADO`, 0 observaciones, 0 tareas, `resultado_gmail = OMITIDO_POR_CONFIGURACION`, con `error` describiendo instrucciones sospechosas; sin fila en `Registro Tareas`; `Indice Idempotencia` con una entrada (`task_id` vacío, `REVISION_MANUAL`); Gmail no modificado. Sin tablero "Hackeado" ni tarea basada en las instrucciones maliciosas. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-23 | Texto que comienza como fórmula | 22/07/2026 (ejecución vulnerable) y 22/07/2026 (regresión aprobada) | Ejecución original: `Log Mensajes` F20 mostró `#ERROR!` con `=CONCAT("CP23-20260722-02","-FORMULA")` en la barra de fórmulas (`message_id 19f8ab1e4b126f56`) — inyección de fórmulas confirmada (INC-FASE8-009). Corrección aplicada en `registrarInicioProcesamiento()`, `actualizarLogMensajes()` y `persistirManifiestoTareas()`. Regresión (`message_id 19f8afd5236e6cf7`, asunto `=CONCAT("CP23-20260722-03","-FORMULA")`): `Log Mensajes` (fila 21) y `Comercial` (fila 11) almacenaron el asunto literalmente, sin `#ERROR!`. `Registro Tareas` (fila 20, `fila_destino=11`) confirmó la creación correcta del manifiesto — esa hoja no tiene columna de asunto; la protección de sus campos de texto libre está cubierta por las 17/17 pruebas deterministas. Ver detalle completo (ambas ejecuciones) debajo de la tabla. | Ejecución vulnerable: `Log Mensajes` fila 20 (`#ERROR!`, no modificada), Registro Tareas fila 19 (`ALI-7576DEA84BEA5CDE-001`; `fila_destino=10`), Comercial fila 10 — evidencia real, conservada. Regresión: `Log Mensajes` fila 21, `Registro Tareas` fila 20 (`ALI-6FE9C44A57429639-001`), `Comercial` fila 11 — verificación manual de Carlos Rubén Bageta, sin captura archivada | Aprobado — 22/07/2026 (regresión real, tras corrección de INC-FASE8-009) |
| CP-24 | Varias cuentas Google abiertas | 22/07/2026 | Ventana de incógnito con dos cuentas Google (personal primero, `carlosrubenbageta@alia-data.com` después, en posición `/u/1/`). Enlace "Link al correo" (`?authuser=carlosrubenbageta@alia-data.com#search/rfc822msgid:...`) resolvió automáticamente `/mail/u/1/`; búsqueda `rfc822msgid` devolvió exactamente un resultado; correo abierto en la cuenta operativa correcta, sin selección manual. Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta (sin captura archivada para esta fila) | Aprobado |
| CP-25 | Falla Gmail después de escribir filas | | Criterio revisado por auditoría de INC-FASE8-005: es, en la práctica, el caso que reproduce esta incidencia. Ejecutar recién después de aplicar la corrección propuesta. | | Pendiente (bloqueado por INC-FASE8-005) |
| CP-26 | Caída después de reservar tareas | | | | Pendiente |
| CP-27 | Modo prueba con ID productivo | 20/07/2026 19:04:22 | Configuración rechazada correctamente: `validarConfiguracion()` detectó `SPREADSHEET_ID_PRUEBA = SPREADSHEET_ID` y abortó; `procesarCorreosDeTareas()` finalizó sin tocar Gmail/Sheets/OpenAI. Configuración restaurada y revalidada como válida después (ver detalle debajo de la tabla). | `pruebas/evidencias/CP-27/01_configuracion_rechazada.png`, `02_funcion_principal_abortada.png`, `04_configuracion_restaurada.png` | Aprobado |
| CP-28 | Mensajes distintos dentro de un hilo | 21/07/2026: `DRY_RUN=true` ~22:00 y ejecución formal `DRY_RUN=false` ~22:05 | `procesarCorreosDeTareas()` informó `2 mensajes elegibles, procesando 2` en ambas modalidades. `message_id 19f875267239b349` (`Gestión General`) y `19f87541d8034391` (`Comercial`) procesados de forma independiente; el mensaje puente enviado no generó fila. Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-29 | Dato sensible en el cuerpo | | | | Pendiente |
| CP-30 | Log detallado purgado | | | | Diferido a Fase 10 (DEC-004, no condiciona la aprobación de esta fase) |
| CP-31 | Cuatro combinaciones PERMITIR_ETIQUETADO/PERMITIR_ARCHIVADO | 21/07/2026 | Matriz operativa completa (4/4 combinaciones) verificada, más 6 escenarios de configuración inválida (`PERMITIR_ETIQUETADO`/`PERMITIR_ARCHIVADO` ausentes o inválidos, `ID_ETIQUETA_*` ausente con etiquetado habilitado, `ID_ETIQUETA_*` ausentes con etiquetado deshabilitado). Ver detalle completo debajo de la tabla. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-32 | Recuperación con tareas ya ESCRITA | | Nuevo caso (INC-FASE8-005, 20/07/2026). Ídem. | | Pendiente |
| CP-33 | Recuperación con tareas en RESERVADA | | Nuevo caso (INC-FASE8-005, 20/07/2026). Ídem. | | Pendiente |
| CP-34 | Nueva falla de Gmail durante la recuperación (sin recursión) | | Nuevo caso (INC-FASE8-005, 20/07/2026). Ídem. | | Pendiente |
| CP-35 | Sin filas duplicadas en Indice Idempotencia tras recuperaciones sucesivas | | Auditoría 20/07/2026 (H-05/H-06): deja de ser prueba obligatoria de aprobación hasta que `finalizarMensaje()` implemente upsert (`documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 9). Sin esa corrección, este caso solo confirmaría "no ocurrió esta vez", no que esté estructuralmente prevenido. | | Bloqueado — requiere corrección de idempotencia |
| CP-36 | Aislamiento de mensajes por hilo | 21/07/2026: `DRY_RUN=true` (repetido accidentalmente una vez, mismo resultado) y ejecución formal `DRY_RUN=false` | Ver detalle completo debajo de la tabla. Resumen: `procesarCorreosDeTareas()` informó `1 mensajes elegibles, procesando 1` en ambas modalidades; solo `message_id 19f8698d446c577a` (Mensaje A) fue procesado; el Mensaje B (mismo hilo, sin etiqueta) no generó fila alguna. | Verificación manual de Carlos Rubén Bageta sobre el registro real (sin captura archivada para esta fila) | Aprobado |
| CP-37 | Validación estricta de MODO_PRUEBA/DRY_RUN/GMAIL_QUERY_PRUEBA | 21/07/2026 | 7 escenarios verificados: `MODO_PRUEBA=TRUE` rechazado (case-sensitive); `MODO_PRUEBA` ausente rechazado (barrera INC-FASE8-007); `DRY_RUN=TRUE` rechazado; `GMAIL_QUERY_PRUEBA` ausente rechazado; consulta sin `label:Pruebas-Automatizacion` rechazada; `ETIQUETA_PRUEBA` ausente rechazada; restauración final con planilla de prueba y `DRY_RUN=true` válida. | `pruebas/evidencias/CP-27/05.png` a `10.png` (6 capturas) | Aprobado |
| CP-38 | Recuperación tras archivado previo, sin depender de la búsqueda de Gmail | | Nuevo caso (auditoría 20/07/2026, H-07). Requiere `recuperarMensajesConManifiestoPendiente()`. | | Bloqueado — requiere corrección |
| CP-39 | Límite de reintentos Gmail y salida a error permanente | | Nuevo caso (auditoría 20/07/2026, H-08/DEC-007). Requiere columna `intentos_gmail` y `LIMITE_REINTENTOS_GMAIL`. | | Bloqueado — requiere DEC-007 |

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

## Resumen final (completar al terminar)

```text
Total de casos: 39
Total de casos que condicionan la aprobación de esta fase: 36 (CP-01 a CP-29, CP-31 a CP-37)
  [Corregido 21/07/2026: el conteo anterior indicaba 37, error aritmético — 29 (CP-01 a CP-29) + 7 (CP-31 a CP-37) = 36. No cambia el alcance ni el estado de ningún caso.]
  CP-10, CP-36, CP-37 incorporados desde Lote 1 (DEC-009, 21/07/2026)
Diferido a Fase 10 (no condiciona esta fase): 1 (CP-30, DEC-004)
Bloqueado que todavía condiciona la Fase 8: 1 (CP-35 — ver nota de auditoría abajo)
Bloqueados pendientes de Lotes 2/3 (no condicionan esta fase): 2 (CP-38, CP-39)
Aprobados: 19 (CP-01, CP-02, CP-03, CP-04, CP-05, CP-10, CP-11, CP-15, CP-19, CP-20, CP-21, CP-22, CP-23, CP-24, CP-27, CP-28, CP-31, CP-36, CP-37)
Rechazados: 0
  CP-19 pasó de Rechazado (21/07/2026, INC-FASE8-008) a Aprobado (22/07/2026, regresión real con message_id nuevo). El registro de la ejecución fallida original se conserva íntegro en el detalle de CP-19.
  CP-23 pasó de Rechazado (22/07/2026, INC-FASE8-009) a Aprobado (22/07/2026, regresión real con message_id nuevo). El registro de la ejecución vulnerable original se conserva íntegro en el detalle de CP-23.
  CP-02 pasó de Rechazado (22/07/2026, INC-FASE8-010) a Aprobado (22/07/2026, segunda regresión real con message_id nuevo). El registro de las dos ejecuciones fallidas originales se conserva íntegro en el detalle de CP-02.
  CP-05 pasó de Pendiente — bloqueado por INC-FASE8-011 a Aprobado (23/07/2026, ejecución formal con message_id 19f91473b9f5a719, tras una tercera corrida del evaluador de IA aislado con resultado 4/4). El registro histórico de la incidencia se conserva íntegro en `pruebas/resultados/INCIDENCIAS_FASE_8.md`.
  CP-03 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f953e0047d2478, tras tres iteraciones reales de ajuste del fixture/automatizador — ninguna un defecto del pipeline productivo). El registro de las tres corridas previas se conserva íntegro en `auditoria/CHANGELOG.md` y en el detalle de CP-03.
  CP-04 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f95bc29ad0717d, tras un ajuste de redacción del fixture — no un defecto del pipeline productivo). El registro de la corrida previa se conserva íntegro en `auditoria/CHANGELOG.md` y en el detalle de CP-04.
  CP-15 pasó de Pendiente a Aprobado (24/07/2026, ejecución vía el automatizador de integración de Fase 2A con message_id 19f9621b19597350, al primer intento, sin necesitar ajuste de redacción). Confirma además, en producción real, que RF-04 (consolidación de observaciones duplicadas) está correctamente codificada en el prompt y que el modelo la sigue.
Pendientes (ejecutables con estado Pendiente, no corridos aún): 16
  [Corregido 22/07/2026: esta lista omitía a CP-27, ya aprobado desde el 20/07/2026 (CP-27 — Modo prueba con ID productivo); no cambia el alcance ni el estado de ningún caso.]
  [Corregido 23/07/2026 (semántica): CP-35 estaba contabilizado dentro de "Pendientes"; su estado individual es Bloqueado (ver nota de auditoría abajo), no Pendiente. Se lo separa como bloqueado que todavía condiciona la Fase 8. Pendientes pasa de 20 a 19; no cambia el estado individual de ningún caso.]
  [Corregido 24/07/2026: CP-03 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 19 a 18.]
  [Corregido 24/07/2026: CP-04 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 18 a 17.]
  [Corregido 24/07/2026: CP-15 pasó de Pendiente a Aprobado (ver arriba); Pendientes pasa de 17 a 16.]
  CP-01, CP-02, CP-03, CP-04, CP-05, CP-10, CP-11, CP-15, CP-19, CP-20, CP-21, CP-22, CP-23, CP-24, CP-27, CP-28, CP-31, CP-36 y CP-37 aprobados
  CP-21 ya no está bloqueado por INC-FASE8-008 (CP-19 Aprobado) y fue ejecutado y aprobado el 22/07/2026
  CP-05 ya no está bloqueado por INC-FASE8-011 (cerrada) y fue ejecutado y aprobado el 23/07/2026
  CP-03 fue ejecutado y aprobado el 24/07/2026
  CP-04 fue ejecutado y aprobado el 24/07/2026
  CP-15 fue ejecutado y aprobado el 24/07/2026
Casos sin aprobación que todavía condicionan la Fase 8: 17 (16 Pendientes + CP-35 Bloqueado)
Sin aprobación total (Pendientes + CP-35 + CP-38 + CP-39 + CP-30): 20

Nota (auditoría 20/07/2026): CP-35 pasó a "bloqueado" — no puede considerarse
una verificación válida del criterio "no existen duplicados" hasta que
finalizarMensaje() implemente upsert (ver documentacion/RECUPERACION_INTERRUPCIONES.md,
sección 9). Se recomienda no cerrar la Fase 8 sin resolver este punto, aunque
la decisión final le corresponde a Carlos Rubén Bageta.
CP-38 y CP-39 permanecen bloqueados hasta la aprobación de los Lotes 2/3.

Nota (Lote 1, 21/07/2026): volver a copiar al proyecto de Apps Script de prueba:
  codigo/script_refactorizado.gs  (validarConfiguracion, obtenerMensajesPendientesDesdeGmail,
    procesarUnMensajeSimulado, extraerDatosCorreo)
  codigo/escritura_sheets.gs      (eliminada constante CUENTA_OPERATIVA,
    construirEnlaceCorreo firma actualizada)
Nota (INC-FASE8-006, 21/07/2026): también volver a copiar:
  codigo/recuperacion.gs          (obtenerMetadatosMensaje + construirEnlaceCorreo reciben cfg)
  pruebas/debug_seguro_pruebas.gs (maxMensajesBusqueda en lugar de maxHilos en la vista segura)

¿Todos los casos críticos (CP-01 a CP-29, CP-31 a CP-35) pasaron?
¿Se detectaron duplicados?
¿Se generaron tareas falsas?
¿Las tareas llegaron a la hoja correcta?
¿Los errores quedaron trazados en Log Mensajes?
¿El modo prueba impidió toda escritura/archivado productivo?
¿El script pudo reejecutarse de forma segura (CP-11, CP-13)?
```
