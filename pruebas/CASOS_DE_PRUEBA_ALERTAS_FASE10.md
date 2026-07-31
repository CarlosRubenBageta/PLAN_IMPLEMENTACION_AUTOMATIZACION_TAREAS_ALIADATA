# Casos de prueba — Alertas DEC-017 (`codigo/alertas.gs`, Fase 10)

**Fecha de detalle:** 30/07/2026
**Elaborado por:** Claude Cowork
**Estado:** Casos detallados con pasos concretos. **Ejecución real pendiente** — Claude Cowork no tiene acceso a Google Workspace ni a OpenAI (`configuracion/MATRIZ_PERMISOS.md`); cada caso lo corre Carlos Rubén Bageta en el **proyecto de prueba de la Fase 8** ("PRUEBA - Automatización de tareas Aliadata - Fase 8") y reporta el resultado (correo recibido o no, log de la ejecución).

> Igual que en `pruebas/CASOS_DE_PRUEBA.md`: ningún caso fue ejecutado por Claude Cowork — todas las filas de "Estado" quedan `Pendiente` hasta que se corran de verdad. **Nunca correr nada de este documento contra el proyecto o la planilla productivos** (`1-qrNy_5VOZHbdC9bj7m3Zqv3TTEmPPRwPynMYP20VBQUyR2IChVGVinA` / `1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g`).

---

## Configuración previa obligatoria (antes de correr cualquier caso)

1. **Copiar `codigo/alertas.gs` al proyecto de prueba** (10º archivo — hasta ahora tenía los 9 de siempre) **Y volver a copiar el contenido actualizado de `codigo/script_refactorizado.gs`, `codigo/recuperacion.gs` y `codigo/escritura_sheets.gs`**, reemplazando lo que hay — son los 3 archivos que integran las llamadas a `alertas.gs`. **Hallazgo real (30/07/2026, CA-01):** copiar solo `alertas.gs` sin actualizar estos 3 no tira ningún error — el proyecto de prueba sigue teniendo la versión de `script_refactorizado.gs` del ensayo de reversión del 28/07/2026, anterior a estos cambios, así que simplemente nunca llega a llamar a nada de `alertas.gs` (silencioso, sin log, sin excepción). Confirmar los 4 archivos actualizados antes de cada caso, no solo antes del primero.
2. Confirmar en Propiedades del script del proyecto de prueba (adicionales a las ya configuradas desde la Fase 8 — `MODO_PRUEBA=true`, `SPREADSHEET_ID_PRUEBA`, `GMAIL_QUERY_PRUEBA`, `ETIQUETA_PRUEBA`, `PERMITIR_ARCHIVADO=false`, `PERMITIR_ETIQUETADO=false`):
   ```text
   DRY_RUN=false
   CUENTA_ALERTAS=carlosrubenbageta@alia-data.com
   COOLDOWN_ALERTAS_MIN=1
   ```
   - **`DRY_RUN=false` es obligatorio para probar esto** — no es un descuido. Casi todos los ganchos de alerta están dentro de código que `DRY_RUN=true` salta por diseño (INC-FASE8-002), o quedan explícitamente protegidos con `if (!cfg.dryRun)`. Con `DRY_RUN=true` **ningún caso de este documento va a mandar nada**, y eso no significaría que el código esté roto — sería el propio `DRY_RUN` haciendo su trabajo. Como `PERMITIR_ARCHIVADO`/`PERMITIR_ETIQUETADO` siguen en `false`, `DRY_RUN=false` sigue sin tocar Gmail de verdad (etiquetas/archivado) ni la planilla productiva — solo escribe en la copia de prueba.
   - `COOLDOWN_ALERTAS_MIN=1` (en vez del default 60) es solo para poder repetir casos sin esperar una hora entre intentos. **Restaurarlo a `60` (o quitarlo) al terminar toda la ronda**, no dejarlo en 1 de forma permanente ni copiarlo así al real.
3. Confirmar que `CONTADOR_FALLOS_CONSECUTIVOS` no existe o está en `0` en Propiedades del script antes de empezar (si quedó algo de una ronda anterior, ponerlo en `0` a mano).
4. **Identidad confirmada (30/07/2026):** este proyecto de prueba autoriza/ejecuta como `tareas@alia-data.com` (no como la cuenta personal de Carlos Rubén Bageta) — `GMAIL_QUERY_PRUEBA=in:inbox label:Pruebas-Automatizacion` no tiene calificador de cuenta, así que busca en la bandeja de quien esté autenticado al ejecutar. **Todo correo sintético de este documento (CA-03, CA-05) va a `tareas@alia-data.com`, etiquetado `Pruebas-Automatizacion` ahí — no a la bandeja personal.** Al ejecutar manualmente desde el editor, autorizar/loguearse como `tareas@alia-data.com` cuando lo pida.

**Regla para cada caso:** después de confirmar el resultado (llegó/no llegó el correo esperado), **revertir el cambio de esa configuración de inmediato** antes de pasar al siguiente caso — no acumular varios cambios de configuración a la vez, para que cada caso pruebe exactamente una cosa.

---

## CA-01 — Clave API ausente

**Setup:** borrar (o renombrar) temporalmente `OPENAI_API_KEY` en Propiedades del script.
**Acción:** ejecutar `procesarCorreosDeTareas()` manualmente desde el editor. No hace falta ningún correo sintético — aborta antes de leer Gmail.
**Resultado esperado:** la ejecución termina casi de inmediato (aborta en `validarConfiguracion()`, sin tocar Gmail ni Sheets). Llega a `carlosrubenbageta@alia-data.com` un correo `[Automatización Aliadata] Falta la clave de OpenAI (OPENAI_API_KEY)`, con `Tipo de evento: CLAVE_API_AUSENTE` en el cuerpo.
**Reversión:** restaurar el valor real de `OPENAI_API_KEY` apenas se confirma el correo.
**Estado:** Aprobado — 30/07/2026. Corrida real en el proyecto de prueba (`OPENAI_API_KEY` borrada). Log real: `validarConfiguracion(): configuración inválida: Falta OPENAI_API_KEY.` → `procesarCorreosDeTareas(): abortando por configuración inválida...` → `enviarAlertaTecnica(): alerta "CLAVE_API_AUSENTE" enviada a carlosrubenbageta@alia-data.com.` (20:19:48–20:19:53, ejecución `Completada`). Correo real recibido: `[Automatización Aliadata] Falta la clave de OpenAI (OPENAI_API_KEY)`, cuerpo `Falta OPENAI_API_KEY.` + `Tipo de evento: CLAVE_API_AUSENTE` + hora ISO real. **Primer intento sin resultado** (dos corridas, 19:56 y 20:05, sin correo ni log de `alertas.gs`) — causa real: el proyecto de prueba tenía `alertas.gs` copiado pero `script_refactorizado.gs`/`recuperacion.gs`/`escritura_sheets.gs` seguían en su versión previa al ensayo de reversión del 28/07/2026, sin las llamadas nuevas — silencioso, sin error, porque el código viejo es válido por sí mismo. Corregido volviendo a copiar los 3 archivos (ver nota agregada en "Configuración previa obligatoria" arriba). Aprobado por Carlos Rubén Bageta.

## CA-02 — Hoja técnica inexistente

**Setup:** en la planilla de prueba, renombrar temporalmente `Indice Idempotencia` (ej. a `Indice Idempotencia TEMP`).
**Acción:** ejecutar `procesarCorreosDeTareas()`.
**Resultado esperado:** aborta en `validarConfiguracion()`. Correo `[Automatización Aliadata] Falta una hoja técnica en la planilla configurada`, tipo `HOJA_INEXISTENTE`.
**Reversión:** renombrar la hoja de vuelta a `Indice Idempotencia` de inmediato.
**Estado:** Aprobado — 30/07/2026. Corrida real en el proyecto de prueba (`Indice Idempotencia` renombrada temporalmente). Log real: `validarConfiguracion(): configuración inválida: No existe la hoja técnica "Indice Idempotencia"...` → `procesarCorreosDeTareas(): abortando...` → `enviarAlertaTecnica(): alerta "HOJA_INEXISTENTE" enviada a carlosrubenbageta@alia-data.com.` (20:35:04–20:35:08, ejecución `Completada`). Correo real confirmado por Carlos Rubén Bageta (asunto y `Tipo de evento: HOJA_INEXISTENTE` correctos). Hoja restaurada a su nombre real. Aprobado por Carlos Rubén Bageta.

## CA-03 — Hoja de negocio inexistente al escribir (dispara 3 alertas de una)

**Objetivo:** un solo mensaje que fuerza `HOJA_INEXISTENTE` (de negocio, no técnica), `FALLO_DE_ESCRITURA` y `AUMENTO_REVISION_MANUAL` a la vez — las 3 comparten la misma causa real (una tarea generada que no se pudo escribir).

**Setup:**
1. Bajar temporalmente `UMBRAL_REVISION_MANUAL_ALERTA` a `1`.
2. En la planilla de prueba, renombrar temporalmente `Desarrollo IT` (ej. a `Desarrollo IT TEMP`).
3. Enviar un correo sintético **nuevo** (nunca reusar un `message_id` ya usado en Fase 8) **a `tareas@alia-data.com`**, etiquetado ahí `Pruebas-Automatizacion`, con contenido que la IA vaya a clasificar en `Desarrollo IT` — se puede reusar el texto de CP-01 de `pruebas/CASOS_DE_PRUEBA.md` ("Servidor de facturación caído", RF-13) como base.

**Acción:** ejecutar `procesarCorreosDeTareas()`.
**Resultado esperado:** la IA procesa el mensaje y genera la tarea, pero al intentar escribirla en `Desarrollo IT` la hoja no existe. `Log Mensajes` cierra ese mensaje en `REVISION_MANUAL`. Llegan **3 correos**: `HOJA_INEXISTENTE`, `FALLO_DE_ESCRITURA`, y `AUMENTO_REVISION_MANUAL` (por el umbral bajado a 1).
**Reversión:** renombrar la hoja de vuelta a `Desarrollo IT`; restaurar `UMBRAL_REVISION_MANUAL_ALERTA` a `3` (o borrar la propiedad para que use el default).
**Estado:** Aprobado — 30/07/2026, con un hallazgo real en el camino. Primer intento (20:50): `HOJA_INEXISTENTE` y `FALLO_DE_ESCRITURA` llegaron bien, pero el tercer correo no — el mensaje quedó en `ERROR_TEMPORAL` (no `REVISION_MANUAL`) porque `aplicarResultadoGmail()` (código preexistente, no de `alertas.gs`) intentó aplicar una etiqueta real de Gmail y falló (`labelId not found`): **`PERMITIR_ETIQUETADO` estaba en `true` en el proyecto de prueba** (debía estar en `false` según `configuracion/PARAMETROS_EJEMPLO.md`) apuntando a un ID de etiqueta desactualizado. Corregido `PERMITIR_ETIQUETADO=false`. En el reintento, una ejecución se canceló a los ~196s por una recarga de página en medio de una corrida manual (no un problema del código — lección: nunca recargar la pestaña de una ejecución manual en curso). Reintento limpio (21:12): `recuperarMensajesConManifiestoPendiente()` retomó el mensaje sin depender de Gmail, los 3 correos llegaron (`HOJA_INEXISTENTE`, `FALLO_DE_ESCRITURA` con sufijo "(recuperación)", `AUMENTO_REVISION_MANUAL`), confirmados por Carlos Rubén Bageta con captura de la bandeja. `Log Mensajes` cerró el mensaje en `REVISION_MANUAL`. Aprobado por Carlos Rubén Bageta.

## CA-04 — Planilla inaccesible (falta de permisos)

**Setup:** cambiar temporalmente `SPREADSHEET_ID_PRUEBA` a un ID que la cuenta del proyecto de prueba no pueda abrir (un ID inventado o inexistente alcanza — **nunca** usar el ID productivo para esto, ni ningún archivo real ajeno).
**Acción:** ejecutar `procesarCorreosDeTareas()`.
**Resultado esperado:** aborta en `validarConfiguracion()` ("No se pudo abrir la planilla configurada..."). Correo tipo `FALTA_DE_PERMISOS`.
**Reversión:** restaurar el `SPREADSHEET_ID_PRUEBA` real de inmediato.
**Estado:** Aprobado — 30/07/2026, con un incidente real en el camino (sin impacto). Al preparar el ID inválido, Carlos Rubén Bageta pegó por error el valor de `SPREADSHEET_ID` (el productivo real, `1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g`) en `SPREADSHEET_ID_PRUEBA`, y ejecutó `procesarCorreosDeTareas()` así (21:21:52). La salvaguarda de `validarConfiguracion()` que debería frenar exactamente esto (CP-27, verificada línea por línea en el código real del proyecto de prueba — presente y correcta) no se disparó; la ejecución llegó a `"0 mensajes elegibles, procesando 0"` contra lo que habría sido la planilla productiva real. **Sin impacto real:** al no haber ningún mensaje elegible en ese momento, no se leyó ni escribió nada más allá de la búsqueda vacía. Causa exacta no reconstruible (el valor ya fue sobrescrito) — la hipótesis más probable es una diferencia mínima entre el valor pegado y el real (no una falla del código, que se confirmó correcto). **Corregido** restaurando `SPREADSHEET_ID_PRUEBA` a su valor real de prueba (`1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o`) más `XX` agregado para este caso. Con eso, corrida limpia (21:36:03–21:36:07): `validarConfiguracion(): ... Illegal spreadsheet id or key...` → `enviarAlertaTecnica(): alerta "FALTA_DE_PERMISOS" enviada...`. Correo real confirmado por Carlos Rubén Bageta. **Advertencia para toda prueba futura:** verificar a simple vista que `SPREADSHEET_ID_PRUEBA` ≠ `SPREADSHEET_ID` antes de cada ejecución real — el error humano de copiar el ID equivocado es un riesgo real, ya ocurrió una vez. Aprobado por Carlos Rubén Bageta.

## CA-05 — Error crítico de configuración (rediseñado en el camino)

**Diseño original (descartado, documentado por lo que enseñó):** cambiar `OPENAI_MODEL` a un valor inválido y procesar un correo real, esperando que la falla de OpenAI llegara sin control a `gestionarErrorMensaje()` → `ERROR_DEFINITIVO` → alerta. **Corrida real (30/07/2026):** el mensaje cerró en `estado=REVISION_MANUAL`/`etapa=FINALIZADO` — limpio, sin colgarse — con `error="Fallo de comunicación con la IA: The model \`modelo-inexistente-000\` does not exist..."`, `codigo_http=404`. **Hallazgo real:** el pipeline ya manejaba esto de antes de `alertas.gs` — `consultarIAExtractora()` captura el fallo de OpenAI sin relanzarlo, y `validarRespuestaIA()` lo manda directo a `REVISION_MANUAL` vía `finalizarMensajeSinTareas()`, nunca pasa por `gestionarErrorMensaje()` ni por `ERROR_DEFINITIVO`. Ninguno de los 7 alertas se disparó — no por un bug, sino porque ese camino de código nunca tuvo un gancho de alerta (no se me había ocurrido que un fallo de IA no fuera una excepción sin controlar). Con solo 1 mensaje a revisión manual (umbral en 3), tampoco llegó a `AUMENTO_REVISION_MANUAL`. Sin impacto — el sistema se comportó bien, el diseño del caso estaba mal planteado.

**Diseño corregido, el que efectivamente se probó:**
**Setup:** borrar (no solo cambiar de valor) la propiedad `OPENAI_MODEL`.
**Acción:** ejecutar `procesarCorreosDeTareas()`. No hace falta correo — aborta en `validarConfiguracion()` antes de leer Gmail, igual que CA-01/CA-02, pero con un texto de error ("Falta OPENAI_MODEL.") que no matchea ninguno de los otros 3 patrones específicos → cae en el `ERROR_CRITICO` genérico.
**Resultado esperado:** correo `[Automatización Aliadata] La configuración del pipeline es inválida; la ejecución se abortó sin tocar Gmail ni Sheets`, tipo `ERROR_CRITICO`.
**Reversión:** restaurar `OPENAI_MODEL=gpt-4o-mini`.
**Estado:** Aprobado — 30/07/2026. Log real (21:51:16–21:51:20): `validarConfiguracion(): configuración inválida: Falta OPENAI_MODEL.` → `abortando...` → `enviarAlertaTecnica(): alerta "ERROR_CRITICO" enviada a carlosrubenbageta@alia-data.com.` Correo real confirmado por Carlos Rubén Bageta, contenido exacto. `OPENAI_MODEL` restaurado. Aprobado por Carlos Rubén Bageta.

## CA-06 — Tres fallos consecutivos

**Setup:** igual que CA-01 (`OPENAI_API_KEY` ausente); confirmar `CONTADOR_FALLOS_CONSECUTIVOS` en `0` antes de arrancar.
**Acción:** ejecutar `procesarCorreosDeTareas()` **tres veces seguidas**, una tras otra.
**Resultado esperado:** 1ª y 2ª corrida → solo `CLAVE_API_AUSENTE` cada vez. 3ª corrida → `CLAVE_API_AUSENTE` **y además** `TRES_FALLOS_CONSECUTIVOS` (con `UMBRAL_FALLOS_CONSECUTIVOS` en su default de 3).
**Reversión:** restaurar `OPENAI_API_KEY`; confirmar que `CONTADOR_FALLOS_CONSECUTIVOS` vuelve a `0` en la siguiente corrida exitosa (el propio código lo resetea solo — no hace falta tocarlo a mano, pero vale la pena confirmarlo).
**Estado:** Aprobado — 30/07/2026, validado por acumulación natural en vez del repetir-3-veces-la-misma-falla planeado arriba: CA-01, CA-02 y el primer intento de CA-03 fueron 3 ejecuciones reales seguidas, cada una con algún error (`CLAVE_API_AUSENTE`, `HOJA_INEXISTENTE`, y el error de Gmail real de CA-03) — el contador es agnóstico al tipo de falla, así que llegó a 3 igual. Correo real recibido a las 20:50: `[Automatización Aliadata] 3 ejecuciones consecutivas con al menos un error`, `Umbral configurado: 3`. Confirma que el contador cuenta fallas de ejecución en general, no solo repeticiones idénticas — cobertura equivalente o mejor que el caso planeado originalmente. Aprobado por Carlos Rubén Bageta.

## CA-07 — Cooldown (no debe duplicar el mismo correo)

**Objetivo:** confirmar que el cooldown realmente frena un reenvío inmediato de la misma alerta — sin esto, un problema persistente mandaría un correo cada 10 minutos sin parar.

**Setup:** ninguno nuevo — se hace inmediatamente a continuación de CA-01, con `OPENAI_API_KEY` todavía ausente.
**Acción:** ejecutar `procesarCorreosDeTareas()` una segunda vez, sin esperar.
**Resultado esperado:** la ejecución vuelve a abortar igual que la primera vez (correcto — el cooldown no cambia esa parte), pero **no debe llegar un segundo correo** `CLAVE_API_AUSENTE` — confirmar en la bandeja que sigue habiendo solo uno.
**Verificación adicional (opcional, confirma el otro lado del cooldown):** esperar 60-90 segundos (alcanza con `COOLDOWN_ALERTAS_MIN=1` de la configuración previa) y correr una tercera vez → ahí sí debería llegar un segundo correo.
**Reversión:** restaurar `OPENAI_API_KEY`.
**Estado:** Aprobado — 30/07/2026. Adaptado para usar el mecanismo de `OPENAI_MODEL` ausente (CA-05) en vez de `OPENAI_API_KEY`, por orden práctico de la ronda — mismo mecanismo de fondo. Dos corridas seguidas (21:57:13 y 21:57:16), log real de la segunda: `enviarAlertaTecnica(): alerta "ERROR_CRITICO" suprimida por cooldown (1 min desde el último envío). Detalle: Falta OPENAI_MODEL.` — texto explícito de supresión, no solo inferido de la bandeja. Bandeja confirmada por Carlos Rubén Bageta: un solo correo `ERROR_CRITICO` pese a las 2 corridas. La verificación opcional (esperar y confirmar que sí reenvía pasado el cooldown) no se hizo — innecesaria, el log ya es concluyente por sí solo. De paso, la segunda corrida sumó otra confirmación real de `TRES_FALLOS_CONSECUTIVOS` (contador acumulado desde CA-05). `OPENAI_MODEL` restaurado. Aprobado por Carlos Rubén Bageta.

---

## Ronda completa — 30/07/2026

**Los 7 casos, Aprobados:** CA-01 (clave API ausente), CA-02 (hoja técnica inexistente), CA-03 (hoja de negocio + fallo de escritura + revisión manual anormal, 3 alertas de una), CA-04 (falta de permisos), CA-05 (error crítico, rediseñado en el camino), CA-06 (tres fallos consecutivos, validado por acumulación natural), CA-07 (cooldown). Detalle completo de cada uno arriba, con logs y correos reales.

**Hallazgos reales no relacionados con `alertas.gs` descubiertos durante la ronda** (documentados en detalle en cada caso, no repetir aquí): el proyecto de prueba tenía `script_refactorizado.gs`/`recuperacion.gs`/`escritura_sheets.gs` desactualizados al empezar (CA-01); `PERMITIR_ETIQUETADO=true` con un ID de etiqueta desactualizado causaba un error real de Gmail no relacionado con las alertas (CA-03); un error humano de copiar el ID productivo en `SPREADSHEET_ID_PRUEBA` no fue frenado por la salvaguarda CP-27 en una corrida puntual, sin impacto real pero sin causa raíz confirmada (CA-04); recargar la página durante una ejecución manual la cancela (lección operativa, no un bug).

---

## No incluido en esta ronda

**Runtime terminado inesperadamente** (evento 1 de 8, plan v3 sección "Fase 10"): no forma parte de este documento porque `codigo/alertas.gs` no toca ese mecanismo — sigue siendo la notificación nativa de Apps Script + filtro de reenvío, ya probada de punta a punta con una falla real el 28/07/2026 (`auditoria/DECISIONES.md`, DEC-017). No hace falta repetirla.

**Fallo de escritura por una causa distinta de "hoja inexistente"** (ej. un error real de la API de Sheets durante `setValues()`, no capturado hoy en `escribirFilasPorLote()`): no hay un caso dedicado — se acepta como cobertura parcial. Si en algún momento se quiere aislar esto, requeriría proteger un rango contra la propia cuenta del proyecto de prueba justo antes de escribir, que es más intrusivo que los demás casos.

## Al terminar toda la ronda

1. Confirmar que las 8 propiedades tocadas volvieron a su valor real: `OPENAI_API_KEY`, `SPREADSHEET_ID_PRUEBA`, `OPENAI_MODEL`, `UMBRAL_REVISION_MANUAL_ALERTA` (o borrada), `COOLDOWN_ALERTAS_MIN` (volver a `60` o borrarla), y los nombres de hoja (`Indice Idempotencia`, `Desarrollo IT`).
2. Reportar a Claude Cowork el resultado de cada caso (llegó/no llegó el correo esperado, con el asunto y tipo de evento reales) para registrar `pruebas/resultados/RESULTADOS_ALERTAS_FASE10.md` con evidencia real — mismo criterio que Fase 8: nada se marca `Aprobado` sin una corrida real confirmada.
3. Recién con todos los casos aprobados, evaluar copiar `codigo/alertas.gs` al proyecto productivo (paso aparte, con aprobación explícita — ver `auditoria/DECISIONES.md`, DEC-017, corrección del 30/07/2026).
