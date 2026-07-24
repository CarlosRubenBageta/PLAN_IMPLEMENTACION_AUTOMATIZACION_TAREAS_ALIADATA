# Política de reintentos — Fase 4

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 4 — Requisitos técnicos / Política de reintentos sugerida" (líneas 969-992)
**Código asociado:** `codigo/cliente_openai.gs` (`consultarIAExtractora()`)

---

## 1. Esquema de reintentos

```text
Intento 1 → inmediato        (espera 0 ms)
Intento 2 → espera breve     (espera 2.000 ms)
Intento 3 → espera mayor     (espera 8.000 ms)
Después de 3 intentos → Revisión manual/Error de procesamiento
```

Implementado en `consultarIAExtractora()` como un bucle de hasta `MAX_INTENTOS_IA = 3`, con `ESPERA_MS_POR_INTENTO = [0, 2000, 8000]`. No hay un cuarto intento: se cumple explícitamente "no reintentar indefinidamente".

## 2. Clasificación de errores

| Condición | Clasificación | ¿Se reintenta? |
|---|---|---|
| HTTP 429 (límite de tasa / cuota agotada) | Temporal | Sí, hasta agotar los 3 intentos |
| HTTP 5xx (error del servidor de OpenAI) | Temporal | Sí, hasta agotar los 3 intentos |
| Error de red (timeout, DNS, conexión) | Temporal | Sí, hasta agotar los 3 intentos |
| HTTP 400 (payload inválido) | Definitivo | No — un payload mal formado no se corrige reintentando |
| HTTP 401/403 (autenticación/autorización) | Definitivo | No — reintentar no soluciona una clave inválida o revocada |
| HTTP 404 | Definitivo | No |
| Respuesta HTTP 200 sin `choices` | Definitivo | No — la API respondió correctamente pero sin contenido utilizable |
| Rechazo del modelo (`message.refusal`) | Definitivo | No — el modelo rechazó explícitamente responder; reintentar con el mismo contenido no cambia el resultado |
| JSON de transporte inválido (cuerpo de la respuesta no parseable) | Depende del código HTTP acompañante | Solo si el HTTP era 429/5xx |
| `finish_reason = "length"` (respuesta cortada) | Se marca `truncada: true`, tratado como inválido por `validarRespuestaIA()` | No se reintenta automáticamente en esta fase (ver "Limitación reconocida") |

La función `esErrorTemporalHttp(codigoHttp)` centraliza el criterio 429/5xx; cualquier ajuste futuro a la clasificación se hace en un solo lugar.

## 3. Camino después de agotar los reintentos

`consultarIAExtractora()` devuelve el último resultado fallido (`exito: false`) al llamador. `procesarUnMensaje()` (en `codigo/script_refactorizado.gs`) pasa ese resultado a `validarRespuestaIA()`, que lo marca inválido, y el mensaje se cierra como:

- `REVISION_MANUAL` con etiqueta `Revisión manual/Error de procesamiento` — si el fallo fue de comunicación con la IA, JSON inválido o rechazo del modelo.

Esto es consistente con la tabla de tratamiento de `documentacion/MAPA_COLUMNAS.md`, sección 4 ("Error de procesamiento" → no crea filas, etiqueta `Revisión manual/Error de procesamiento`, archiva).

**No existe reintento entre ejecuciones distintas del activador para este tipo de fallo**: al cerrarse el mensaje con estado terminal, queda registrado en `Indice Idempotencia` y no se reprocesa automáticamente. Si el fallo fue realmente transitorio (por ejemplo, una interrupción de OpenAI de varios minutos), la recuperación es manual: revisar la etiqueta `Revisión manual/Error de procesamiento` y, si corresponde, reprocesar el mensaje a mano. **Limitación reconocida**, documentada para la Fase 5/10: una futura mejora podría permitir reabrir mensajes `REVISION_MANUAL` por error de IA desde `Indice Idempotencia` bajo criterio humano.

## 4. Registro por llamada (Log Mensajes)

Cada llamada a `consultarIAExtractora()` registra, sobre la fila de `Log Mensajes` del mensaje en curso:

| Campo | Origen |
|---|---|
| `modelo` | `cfg.openaiModel` |
| `tokens_entrada` / `tokens_salida` / `tokens_totales` | `cuerpoRespuesta.usage` de la respuesta de OpenAI |
| `costo_estimado` | `calcularCostoEstimado()`, según `TARIFAS_OPENAI_USD_POR_1K_TOKENS` |
| `request_id` | Encabezado `x-request-id` de la respuesta HTTP |
| `codigo_http` | Código de la última respuesta HTTP recibida |
| `duracion_llamada_ia` | Tiempo transcurrido entre el envío y la recepción de la respuesta |
| `intentos` | Cuántos de los 3 intentos se consumieron |

Nunca se registra el cuerpo del correo ni el contenido de la respuesta completa de la IA en `Log Mensajes` (solo métricas), conforme a la política de minimización de datos (`documentacion/PROMPT_OPERATIVO.md`, sección 4).

## 5. Tabla de tarifas y costo estimado

```javascript
var TARIFAS_OPENAI_USD_POR_1K_TOKENS = {
  'gpt-4o-mini': { entrada: 0.00015, salida: 0.0006 }
};
```

**Advertencia explícita:** esta tabla es un valor de referencia al momento de escribir este documento (20/07/2026) y **debe actualizarse manualmente** si OpenAI cambia sus tarifas o si se confirma un modelo distinto (ver punto pendiente, sección 6). Si el modelo configurado no está en la tabla, `calcularCostoEstimado()` devuelve `null` en lugar de inventar un costo, y deja constancia en el log de ejecución de Apps Script.

## 6. Punto pendiente de confirmación humana: modelo definitivo de OpenAI

`entregables/FASE_0/INVENTARIO_TECNICO.md` registra desde la Fase 0: *"Modelo definitivo elegido: Pendiente de definición en la Fase 4."* Esta fase **no cierra** esa decisión unilateralmente porque afecta directamente el costo operativo y la calidad de clasificación, y es una decisión de negocio, no solo técnica.

**Recomendación de Claude Cowork:** mantener `gpt-4o-mini` (el mismo modelo que corre hoy en `script_actual.gs`) por tres razones:

1. Soporta Structured Outputs (`response_format: json_schema` con `strict: true`), requisito central de esta fase.
2. Es el modelo de menor costo de la familia GPT-4o compatible con Structured Outputs, adecuado para un volumen de hasta 10 mensajes cada 10 minutos.
3. Mantiene continuidad con el comportamiento observado en producción durante la Fase 0 (sin necesidad de recalibrar expectativas de calidad de clasificación).

Esta recomendación **queda sujeta a confirmación explícita** en la puerta de aprobación de esta fase; no se considera una decisión cerrada.

## Referencias cruzadas

- Prompt operativo completo y las tres capas de defensa contra instrucciones maliciosas: `documentacion/PROMPT_OPERATIVO.md`.
- Esquema JSON estricto y validación local: `codigo/esquema_json.gs`.
- Riesgos mitigados: `documentacion/MATRIZ_RIESGOS.md`, R-05 (respuesta inválida de la IA).
