# Acta de aprobación — Fase 5

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **Reejecutar el mismo mensaje no duplica filas.** Evidencia: `persistirManifiestoTareas()` en `codigo/idempotencia.gs` consulta `obtenerManifiestoPersistido()` antes de escribir; si ya existe un manifiesto para el `message_id`, lo reutiliza en lugar de generar un segundo con IDs distintos.
- [x] **Una caída después de una escritura parcial puede recuperarse identificando exactamente qué tareas quedaron `RESERVADA`.** Evidencia: `reanudarDesdeManifiesto()` en `codigo/recuperacion.gs` filtra el manifiesto por `estado_escritura != ESCRITA` y solo reescribe esas.
- [x] **Las recuperaciones no vuelven a consultar la IA.** Evidencia: `reanudarDesdeManifiesto()` no llama a `consultarIAExtractora()` en ningún punto; solo relee metadatos livianos del mensaje (`obtenerMetadatosMensaje()`).
- [x] **Los registros abandonados se detectan.** Evidencia: `recuperarProcesamientosAbandonados()`, umbral `UMBRAL_ABANDONO_MIN` (confirmado en Fase 3: 20 minutos).
- [x] **Se documenta el procedimiento de recuperación.** Evidencia: `documentacion/RECUPERACION_INTERRUPCIONES.md`.

## Entregables

- `codigo/idempotencia.gs` — formato de ID definitivo, `persistirManifiestoTareas()` consolidado, `obtenerManifiestoPersistido()`.
- `codigo/recuperacion.gs` — `recuperarProcesamientosAbandonados()` con bifurcación por etapa, `reanudarDesdeManifiesto()`.
- `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`, `documentacion/RECUPERACION_INTERRUPCIONES.md`.
- `codigo/script_refactorizado.gs` actualizado: delega a los módulos anteriores; corrige un bug real (`registrarInicioProcesamiento()` duplicaba filas en `Log Mensajes` al reprocesar un mensaje abandonado).
- `documentacion/DISENO_HOJAS_TECNICAS.md` (Fase 2) modificado: `Registro Tareas` se amplía de 9 a 16 columnas.

## Observaciones de la revisión

1. **Enmienda a un entregable de la Fase 2 (`Registro Tareas`):** el diseño original no incluía el contenido de cada tarea (resumen, prioridad, grupo de origen, responsable, fecha límite, texto de la observación), solo su estado de escritura. Sin ese contenido, "retomar desde el manifiesto persistido sin volver a consultar la IA" —requisito explícito de esta fase— habría sido imposible en la práctica. Se amplió `Registro Tareas` a 16 columnas para que sea, en los hechos, el manifiesto persistido que exige el plan. Detalle: `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`, sección 5.
2. **Corrección de un bug detectado durante esta fase, no introducido por ella:** `registrarInicioProcesamiento()` (Fase 3) insertaba una fila nueva en `Log Mensajes` en cada invocación, sin verificar si el mensaje ya tenía una fila de un intento previo. Esto habría generado filas duplicadas al reprocesar un mensaje abandonado en etapa temprana. Corregido con una búsqueda previa por `message_id` (actualiza si existe, inserta solo si es la primera vez).
3. Se aclaró explícitamente el alcance de la garantía de determinismo de IDs: aplica desde que el manifiesto se persiste, no antes (un mensaje reabierto sin manifiesto persistido se reprocesa como si fuera nuevo, sin que esto viole la idempotencia).
4. **Limitación reconocida, fuera de alcance de esta fase:** un mensaje cerrado como `REVISION_MANUAL` por agotar los reintentos de la IA no se reabre automáticamente; es el comportamiento pedido explícitamente por el plan v3 ("no reintentar indefinidamente"), no una omisión.
5. No se accedió a Google Workspace ni se ejecutó código contra recursos reales durante esta fase.
6. Aprobado por Carlos Rubén Bageta mediante instrucción explícita en sesión de Claude Cowork (20/07/2026), incluyendo conformidad explícita con la ampliación de `Registro Tareas` (observación 1), entregable de la Fase 2 modificado retroactivamente por esta fase.

## Puerta de aprobación

```text
APROBACIÓN FASE 5: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión, incluyendo conformidad explícita con la ampliación de Registro Tareas de 9 a 16 columnas (enmienda al entregable de la Fase 2). Sin correcciones sobre el resto del código ni la documentación.
```

> Fase 6 habilitada.
