# Acta de aprobación — Fase 4

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **La salida admite cero, una o varias tareas.** Evidencia: `obtenerEsquemaJsonRespuestaIA()` en `codigo/esquema_json.gs` define `observaciones[].tareas` como arreglo sin mínimo; `validarRespuestaIA()` acepta `tareas: []`.
- [x] **El JSON se valida localmente.** Evidencia: `validarRespuestaIA()` se ejecuta siempre en `procesarUnMensaje()`, incluso cuando la API ya aplicó Structured Outputs con `json_schema` estricto (defensa en profundidad, no se confía en una sola capa).
- [x] **Los valores fuera de catálogo son rechazados.** Evidencia: `validarRespuestaIA()` invalida **toda la respuesta** (no solo el campo) ante un `tablero`, `prioridad`, `grupo_origen` o `responsable_sugerido` fuera de las listas cerradas; además, el `enum` del JSON Schema estricto impide que la API los devuelva en primer lugar.
- [x] **Los errores temporales se reintentan.** Evidencia: `consultarIAExtractora()` en `codigo/cliente_openai.gs`, 3 intentos con espera 0/2.000/8.000 ms para HTTP 429, 5xx y errores de red.
- [x] **Los errores definitivos pasan a revisión manual.** Evidencia: `procesarUnMensaje()` deriva cualquier fallo de `validarRespuestaIA()` a `finalizarMensajeSinTareas(..., ESTADOS.REVISION_MANUAL, ..., 'RevisionErrorProcesamiento')`.
- [x] **Las instrucciones incluidas en correos no alteran el comportamiento (CP-22).** Evidencia: tres capas documentadas en `documentacion/PROMPT_OPERATIVO.md`, sección 3 (prompt endurecido + `enum` estricto a nivel de API + validación local independiente). La verificación empírica contra correos con intentos de inyección reales corresponde a la Fase 8 (caso CP-22).
- [x] **Los datos sensibles se enmascaran antes del envío (CP-29).** Evidencia: `enmascararDatosSensibles()` en `codigo/prompts_ia.gs`, aplicado en `extraerDatosCorreo()` antes de construir `userContent`. Verificación empírica: Fase 8 (caso CP-29).
- [x] **La clave API no está presente en ningún archivo.** Evidencia: `cfg.openaiApiKey` proviene siempre de `PropertiesService.getScriptProperties()`; ningún archivo nuevo de esta fase contiene valores ni ejemplos de clave.

## Entregables

- `codigo/esquema_json.gs` — valores permitidos, JSON Schema estricto (Structured Outputs), `validarRespuestaIA()`.
- `codigo/prompts_ia.gs` — `construirPromptSistema()` endurecido, `enmascararDatosSensibles()` ampliado.
- `codigo/cliente_openai.gs` — `consultarIAExtractora()` con política de reintentos, clasificación de errores, métricas por llamada y costo estimado.
- `documentacion/PROMPT_OPERATIVO.md` — prompt completo, trazabilidad de requisitos, defensa en profundidad contra instrucciones maliciosas, política de minimización de datos.
- `documentacion/POLITICA_REINTENTOS.md` — esquema de reintentos, clasificación de errores, tabla de tarifas, recomendación sobre el modelo definitivo.
- `codigo/script_refactorizado.gs` actualizado: delega las funciones superadas a los archivos anteriores y corrige un vacío detectado (no se estaban persistiendo `cuerpo_truncado`, `longitud_original`, `longitud_normalizada`, `costo_estimado` e `intentos` en `Log Mensajes`).

## Observaciones de la revisión

1. **Mejora técnica no solicitada explícitamente pero alineada con el título de la fase:** se adoptó `response_format: {type: "json_schema", strict: true}` (Structured Outputs de OpenAI) en lugar del `json_object` genérico usado en el borrador de Fase 3, agregando una capa de garantía a nivel de API (los `enum` de tablero/prioridad/grupo_origen/responsable_sugerido) además de la validación local, que se mantiene como barrera independiente.
2. **Corrección de un vacío de la Fase 3:** `procesarUnMensaje()` calculaba `cuerpoTruncado`, `longitudOriginal`, `longitudNormalizada` (en `extraerDatosCorreo()`) y ahora también `costoEstimado`/`intentos` (en `consultarIAExtractora()`), pero no los escribía en `Log Mensajes`. Corregido en esta fase.
3. **Resuelto:** el modelo definitivo de OpenAI, pendiente desde la Fase 0, queda confirmado como `gpt-4o-mini` por Carlos Rubén Bageta (20/07/2026, instrucción explícita en sesión de Claude Cowork), coincidiendo con la recomendación técnica de la sección 6 de `documentacion/POLITICA_REINTENTOS.md`. Sin cambios de código: `cfg.openaiModel` y `TARIFAS_OPENAI_USD_POR_1K_TOKENS` en `codigo/cliente_openai.gs` ya usaban `gpt-4o-mini` como referencia.
4. **Limitación reconocida y documentada:** un mensaje que agota los 3 reintentos de la IA se cierra como `REVISION_MANUAL` sin reintento automático en ejecuciones posteriores (`documentacion/POLITICA_REINTENTOS.md`, sección 3). Es el comportamiento que pide el plan v3 ("no reintentar indefinidamente"), pero implica recuperación manual si el fallo fue realmente transitorio.
5. No se accedió a Google Workspace ni se llamó a la API de OpenAI durante esta fase; todo el trabajo fue de redacción de código y documentación.
6. Aprobado por Carlos Rubén Bageta mediante instrucción explícita en sesión de Claude Cowork (20/07/2026), condicionado a confirmar el modelo definitivo de OpenAI (observación 3, ya resuelta).

## Puerta de aprobación

```text
APROBACIÓN FASE 4: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión. Modelo definitivo de OpenAI confirmado: gpt-4o-mini (resuelto en la misma instrucción). Sin correcciones sobre el código ni la documentación de prompt/reintentos.
```

> Fase 5 habilitada.
