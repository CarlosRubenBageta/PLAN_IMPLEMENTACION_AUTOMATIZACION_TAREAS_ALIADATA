# Acta de aprobación — Fase 3

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **El código se encuentra modularizado.** Evidencia: `codigo/script_refactorizado.gs`, 26 funciones de responsabilidad única (listadas y agrupadas en `documentacion/ARQUITECTURA_PROPUESTA.md`, sección 2), frente a 2 funciones en `script_actual.gs`.
- [x] **Existe control de concurrencia.** Evidencia: `LockService.getScriptLock()` con `tryLock(5000)` y liberación en `finally` (`procesarCorreosDeTareas()`).
- [x] **Existe procesamiento aislado por mensaje.** Evidencia: `try/catch` individual alrededor de cada `procesarUnMensaje()`, delegado a `gestionarErrorMensaje()`; una excepción no interrumpe el resto de la tanda (`documentacion/FLUJO_TRANSACCIONAL.md`, sección 4).
- [x] **Existe búsqueda paginada y limitada.** Evidencia: `obtenerHilosPendientes()` usa `GmailApp.search(consulta, 0, MAX_HILOS)`, limitado desde el origen (a diferencia de D-08 en `DIAGNOSTICO_ERRORES.md`).
- [x] **El orden transaccional de 12 pasos está implementado y documentado.** Evidencia: `procesarUnMensaje()` en el código; detalle paso a paso en `documentacion/FLUJO_TRANSACCIONAL.md`.
- [x] **La actualización de Gmail se realiza por mensaje individual.** Evidencia: `aplicarResultadoGmail()` usa `Gmail.Users.Messages.modify()` con el `messageId`, no `hilo.addLabel()`/`hilo.moveToArchive()`.
- [x] **No existe escritura en producción.** El archivo es un borrador local; no fue pegado en el editor de Apps Script ni ejecutado. Ningún recurso de Google Workspace fue modificado durante esta fase.
- [x] **El script puede revisarse sin credenciales.** El archivo no contiene ninguna clave; `OPENAI_API_KEY` se lee de `PropertiesService` igual que en la versión actual.

## Entregables

- `codigo/script_refactorizado.gs` (borrador, marcado explícitamente como no apto para producción).
- `documentacion/ARQUITECTURA_PROPUESTA.md`.
- `documentacion/FLUJO_TRANSACCIONAL.md`.

## Observaciones de la revisión

1. El código implementa 8 elementos marcados explícitamente `PENDIENTE (Fase N)` en comentarios: prompt endurecido y política de reintentos (Fase 4), heurística de extracción de contenido nuevo y enmascarado de datos sensibles (Fase 4), formato definitivo del ID de tarea y recuperación fina desde la etapa exacta interrumpida (Fase 5), reglas completas de elegibilidad (Fase 6), y mapa/sanitización definitiva de escritura (Fase 7). Ninguno de estos pendientes es necesario para cumplir los criterios de aceptación de esta fase (estructura, concurrencia, aislamiento, orden transaccional).
2. Se identificó y resolvió un pendiente abierto en la Fase 2 (`MAPA_COLUMNAS.md`, fila 13, "Link al correo"): `construirEnlaceCorreo()` usa el deep-link `#search/rfc822msgid:<Message-ID>` de Gmail para enlazar al mensaje individual, no al hilo completo.
3. Se identificó una brecha explícita en la recuperación: si la ejecución falla después de escribir las tareas pero antes de actualizar Gmail, la versión actual de `recuperarProcesamientosAbandonados()` reabre el mensaje para reprocesamiento completo en lugar de repetir únicamente el paso de Gmail (regla de recuperación del plan v3). Queda documentada como tarea obligatoria de la Fase 5 (`documentacion/FLUJO_TRANSACCIONAL.md`, sección 3).
4. Se identificaron 5 parámetros de configuración (`MAX_MENSAJES_POR_EJECUCION`, `MAX_CARACTERES_CUERPO`, `MAX_HILOS`, `TIEMPO_INTERNO_MAX_MS`, `UMBRAL_ABANDONO_MIN`) que `entregables/FASE_0/INVENTARIO_TECNICO.md` marcó como "pendientes de aprobación antes de la Fase 3". **Resuelto:** Carlos Rubén Bageta confirmó los cinco valores propuestos sin cambios (20/07/2026), tras revisión técnica de Claude Cowork que no encontró razón para modificarlos (coherentes con la cadencia del activador de 10 minutos y el límite duro de 6 minutos de Apps Script). Actualizado en `entregables/FASE_0/INVENTARIO_TECNICO.md`.
5. No se accedió a Google Workspace ni se ejecutó ningún código contra recursos reales durante esta fase.
6. Aprobado por Carlos Rubén Bageta mediante instrucción explícita en sesión de Claude Cowork (20/07/2026), condicionada a la confirmación de los parámetros de la observación 4, ya resuelta.

## Puerta de aprobación

```text
APROBACIÓN FASE 3: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión, condicionada a confirmar los 5 parámetros de configuración de la observación 4 (resuelto en la misma instrucción, ver entregables/FASE_0/INVENTARIO_TECNICO.md). Sin correcciones sobre el código ni la documentación de arquitectura/flujo transaccional.
```

> Fase 4 habilitada.
