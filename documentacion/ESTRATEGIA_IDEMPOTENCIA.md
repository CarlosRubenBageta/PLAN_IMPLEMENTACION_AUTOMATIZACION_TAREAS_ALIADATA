# Estrategia de idempotencia — Fase 5

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 5 — Manifiesto de tareas / Formato de ID / Reglas" (líneas 1032-1068)
**Código asociado:** `codigo/idempotencia.gs`

---

## 1. Principio central: el manifiesto se persiste antes de asignar IDs, y se asigna una sola vez

```text
1. Obtener la respuesta de la IA.
2. Validarla y normalizar las tareas (generarTareasNormalizadas(), sin ID todavía).
3. Persistir el manifiesto en Registro Tareas, con estado RESERVADA — AQUÍ se
   asignan los IDs, en ese mismo paso, nunca antes ni después.
4. En una recuperación: NO volver a consultar la IA; retomar desde el
   manifiesto ya persistido (obtenerManifiestoPersistido()).
```

Esto elimina el riesgo de que una nueva ejecución (por reintento o por recuperación) altere el orden, consolide o divida tareas de forma distinta a la primera vez, y por lo tanto cambie la numeración o el ID de una tarea ya escrita.

## 2. Formato de ID definitivo

```text
ALI-{HASH_MENSAJE_16}-{INDICE_PERSISTIDO}
```

| Componente | Origen | Ejemplo |
|---|---|---|
| `HASH_MENSAJE_16` | Primeros 16 caracteres hexadecimales (mayúsculas) del SHA-256 del `message_id` completo de Gmail | `A8F23C91D04B7E12` |
| `INDICE_PERSISTIDO` | Correlativo de la tarea dentro del manifiesto (1, 2, 3...), formateado a 3 dígitos, asignado **únicamente** al persistir el manifiesto (`persistirManifiestoTareas()`) | `003` |

Ejemplo completo: `ALI-A8F23C91D04B7E12-003`.

El `message_id` completo se conserva además como clave técnica independiente en `Log Mensajes` y `Registro Tareas` — el hash de 16 caracteres es solo la porción legible del `task_id`, no reemplaza la clave técnica real.

## 3. Invariante de determinismo: alcance exacto de la garantía

> "El mismo mensaje y el mismo manifiesto deben generar siempre los mismos IDs."

Esta garantía aplica **una vez que el manifiesto existe**, no antes. En concreto:

- Si un mensaje ya tiene un manifiesto persistido en `Registro Tareas`, cualquier operación posterior (recuperación, reintento del paso de Gmail) debe leer ese manifiesto (`obtenerManifiestoPersistido()`) y **reutilizar** los mismos `task_id`, nunca generar otros nuevos.
- Si un mensaje **no** tiene manifiesto persistido (se abandonó antes de llegar a la etapa `MANIFIESTO_PERSISTIDO`), reprocesarlo desde cero es seguro y equivalente a un mensaje nuevo: no hay ningún ID previo que preservar, porque ninguno llegó a asignarse. Es posible, en teoría, que una segunda consulta a la IA para el mismo correo produzca una cantidad distinta de observaciones/tareas (la IA no es perfectamente determinista); esto no es un defecto de idempotencia, porque el primer intento nunca persistió nada con lo que pudiera entrar en conflicto.

Esta distinción es la que permite que `recuperarProcesamientosAbandonados()` (`codigo/recuperacion.gs`) tome una de dos rutas completamente distintas según la etapa alcanzada (ver `documentacion/RECUPERACION_INTERRUPCIONES.md`).

## 4. Verificación de idempotencia sin leer las 5 hojas de destino

Regla explícita del plan v3: *"comprobar si el ID ya existe contra `Registro Tareas` y el `Indice Idempotencia`, no leyendo las 5 hojas de destino, cuya lectura crecería linealmente con el histórico."*

`persistirManifiestoTareas()` cumple esto llamando primero a `obtenerManifiestoPersistido(messageId, cfg)`, que lee únicamente `Registro Tareas` filtrando por `message_id` (columna 2). Si ya existe un manifiesto para ese mensaje, se reutiliza tal cual (mismos `task_id`, mismo contenido) en lugar de generar uno nuevo. Las 5 hojas de negocio (`Finanzas`, `Comercial`, etc.) nunca se consultan para esta verificación — su lectura completa crecería con cada tarea histórica, mientras que `Registro Tareas` se filtra por `message_id`, acotado al mensaje en curso.

`obtenerIdsYaProcesados()` (`codigo/script_refactorizado.gs`), por su parte, sigue usando exclusivamente `Indice Idempotencia` para decidir si un mensaje **completo** ya fue cerrado (criterio de exclusión en `obtenerMensajesPendientes()`).

## 5. Por qué `Registro Tareas` necesitó columnas adicionales (hallazgo de esta fase)

El diseño original de `Registro Tareas` (Fase 2) tenía 9 columnas centradas en el **estado de escritura** (`task_id`, `message_id`, `thread_id`, `tablero`, `estado_escritura`, `fila_destino`, `fecha_reserva`, `fecha_escritura`, `hash_contenido`), pero no el **contenido** de la tarea (`resumen`, `prioridad`, `grupo_origen`, `responsable_sugerido`, `fecha_limite`, texto de la observación de origen).

Sin ese contenido, una recuperación que "retoma desde el manifiesto persistido sin volver a consultar la IA" no tendría con qué reconstruir la fila de negocio (columna `Resumen de tarea`, `Prioridad sugerida IA`, etc. de `documentacion/MAPA_COLUMNAS.md`) — la única alternativa sería volver a llamar a la IA, exactamente lo que esta fase prohíbe. Por eso `Registro Tareas` se amplió a 16 columnas en esta fase (detalle completo: `documentacion/DISENO_HOJAS_TECNICAS.md`, sección 2). Este es un ajuste a un entregable de la Fase 2, no una nueva hoja: se documenta explícitamente en el acta de esta fase.

## 6. Registro de IDs de mensaje y de hilo

Cumplido en `Log Mensajes` (`message_id`, `thread_id`, columnas 1-2, ya presentes desde la Fase 2) y en `Registro Tareas` (`message_id`, `thread_id`, columnas 2-3). Ninguna hoja depende de recalcular o derivar estos valores: se copian tal cual del mensaje de Gmail en el momento de `registrarInicioProcesamiento()` / `persistirManifiestoTareas()`.

## 7. `DRY_RUN=true` está completamente fuera del sistema de idempotencia (corrección INC-FASE8-002)

Una ejecución con `DRY_RUN=true` (`procesarUnMensajeSimulado()`, `codigo/script_refactorizado.gs`) no crea manifiesto en `Registro Tareas`, no actualiza `Log Mensajes` y no escribe en `Indice Idempotencia`. Esto es deliberado y central al diseño: como `obtenerMensajesPendientes()` excluye un mensaje por la sola **presencia** de su `message_id` en `Indice Idempotencia` (sin mirar el valor de `estado_final`), cualquier escritura ahí durante una simulación —aunque fuera con un estado distinto como "SIMULADO"— dejaría el mensaje permanentemente inelegible para un procesamiento real posterior. Por eso la corrección de INC-FASE8-002 no introduce estados intermedios persistentes para el modo simulado: la única forma de garantizar que un mensaje probado en `DRY_RUN` pueda procesarse después con `DRY_RUN=false` es no escribir nada en ninguna de las tres hojas técnicas durante la simulación.

Por la misma razón, `recuperarProcesamientosAbandonados()` (que sí persiste al recuperar mensajes reales interrumpidos, Fase 5) se omite por completo cuando `cfg.dryRun` es `true` (`procesarCorreosDeTareas()`): una simulación nunca debe "recuperar" ni cerrar un mensaje real abandonado por una ejecución anterior.

## Referencias cruzadas

- Procedimiento completo de recuperación y reanudación fina: `documentacion/RECUPERACION_INTERRUPCIONES.md`.
- Diseño de columnas de `Registro Tareas`: `documentacion/DISENO_HOJAS_TECNICAS.md`, sección 2.
- Riesgo mitigado: `documentacion/MATRIZ_RIESGOS.md`, R-01 (duplicación de filas).
- Hallazgo de diagnóstico que originó este rediseño: `documentacion/DIAGNOSTICO_ERRORES.md`, D-05 (IDs aleatorios).
