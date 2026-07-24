# Arquitectura propuesta — Fase 3

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 3. Refactor estructural del script" (líneas 822-923)
**Entregable de código asociado:** `codigo/script_refactorizado.gs` (**borrador**, no desplegado, no probado contra Google Workspace)

> Esta fase reestructura el script en funciones pequeñas y aisladas. No finaliza el prompt de IA (Fase 4), el algoritmo de IDs (Fase 5), las reglas de elegibilidad (Fase 6) ni la sanitización de escritura (Fase 7): esos puntos quedan como *placeholders* explícitos, marcados `PENDIENTE (Fase N)` en el propio código.

---

## 1. Diferencia estructural respecto a `script_actual.gs`

| Aspecto | `script_actual.gs` | `script_refactorizado.gs` |
|---|---|---|
| Funciones | 2 (`procesarCorreosDeTareas`, `consultarIAClasificadora`) | 26, cada una con una responsabilidad única |
| Concurrencia | Ninguna | `LockService.getScriptLock()` con `tryLock(5000)` y liberación en `finally` |
| Aislamiento de errores | Un `try/catch` global insuficiente (ver `DIAGNOSTICO_ERRORES.md`, D-01) | `try/catch` por mensaje en `procesarCorreosDeTareas()`, delegado a `gestionarErrorMensaje()` |
| Búsqueda de Gmail | `GmailApp.search()` sin límite de origen (D-08) | `GmailApp.search(consulta, 0, MAX_HILOS)`, paginada desde el origen |
| Nivel de control | Hilo (`GmailApp`) | Mensaje individual (Gmail API / `Gmail.Users.Messages.modify()`, DEC-001) |
| IDs | `Math.random()` (D-05) | `generarIdDeterministico()`, hash SHA-256 de `messageId:numeroObservacion:indiceTarea` |
| Escritura en Sheets | `appendRow()` por correo (D-07) | `escribirFilasPorLote()`: una llamada `setValues()` por tablero |
| Validación de configuración | Ninguna | `validarConfiguracion()` al inicio; aborta sin tocar Gmail/Sheets si falla |
| Modo de prueba | No existe | `MODO_PRUEBA`, `DRY_RUN`, `SPREADSHEET_ID_PRUEBA`, con aborto si `SPREADSHEET_ID_PRUEBA` coincide con el productivo |
| Recuperación | No existe | `recuperarProcesamientosAbandonados()` detecta registros `EN_PROCESO` vencidos |

## 2. Mapa de funciones

Agrupadas por responsabilidad (no por orden de ejecución; el orden de ejecución está en `documentacion/FLUJO_TRANSACCIONAL.md`):

### 2.1. Configuración y entrada
- `validarConfiguracion()` — lee y valida todas las propiedades del script antes de cualquier acción.
- `procesarCorreosDeTareas()` — punto de entrada del activador; adquiere el lock, valida configuración, orquesta la tanda.

### 2.2. Obtención de mensajes
- `obtenerHilosPendientes()` — búsqueda paginada (`in:inbox`, sin filtro de etiqueta).
- `obtenerMensajesPendientes()` — aplana hilos a mensajes individuales y descarta ya procesados (vía `Indice Idempotencia`) y anteriores a `FECHA_INICIO_CORTE`.
- `obtenerIdsYaProcesados()` — lee `Indice Idempotencia` como fuente de verdad de idempotencia.

### 2.3. Extracción y normalización
- `procesarUnMensaje()` — orquestador de los 12 pasos para un mensaje.
- `extraerDatosCorreo()` — arma el objeto de datos del correo, incluyendo normalización, contenido nuevo y enmascarado.
- `normalizarCuerpo()` — trunca a `MAX_CARACTERES_CUERPO`, registra si hubo truncamiento.
- `extraerContenidoNuevo()` — descarta historial citado, encabezados de reenvío y firmas (heurística; **placeholder** de ajuste fino en Fase 4).
- `enmascararDatosSensibles()` — enmascara patrones sensibles antes de enviarlos a la IA (**placeholder**, lista de patrones a completar en Fase 4).
- `construirEnlaceCorreo()` — genera el enlace al **mensaje individual** vía `#search/rfc822msgid:<Message-ID>`, resolviendo el pendiente dejado abierto en la Fase 2 (`MAPA_COLUMNAS.md`, fila 13).

### 2.4. Filtro y clasificación
- `evaluarFiltroDeterministico()` — descarta remitentes automáticos conocidos antes de invocar a la IA (**placeholder** estructural; reglas completas en Fase 6).
- `consultarIAExtractora()` — llama a OpenAI con el esquema de la Fase 2; incluye un reintento simple ante error 5xx (**placeholder**; política definitiva en Fase 4).
- `validarRespuestaIA()` — valida tipos y valores contra las listas cerradas del esquema (tableros, prioridades, grupos, responsables).
- `generarTareasNormalizadas()` — aplana `observaciones[].tareas[]` en una lista plana de tareas, asignando `taskId` a cada una.

### 2.5. Idempotencia y persistencia
- `generarIdDeterministico()` — hash SHA-256 truncado; determinístico por diseño (**placeholder** de formato final en Fase 5).
- `persistirManifiestoTareas()` — deja constancia de las tareas previstas antes de reservarlas (**placeholder** de recuperación fina en Fase 5).
- `reservarTareas()` — escribe todas las tareas como `RESERVADA` en `Registro Tareas` **antes** de escribir en los tableros de negocio.

### 2.6. Escritura en Sheets
- `agruparFilasPorHoja()` — agrupa tareas por tablero de destino.
- `sanitizarValoresParaSheets()` — neutraliza valores que empiezan con `=`, `+`, `-`, `@` (mitigación básica de R-09; mapa definitivo en Fase 7).
- `escribirFilasPorLote()` — una llamada `setValues()` por tablero, no `appendRow()` por tarea.
- `marcarTareasEscritas()` — actualiza `Registro Tareas` de `RESERVADA` a `ESCRITA` con `fila_destino`.

### 2.7. Gmail y cierre
- `aplicarResultadoGmail()` — etiqueta y archiva **por mensaje individual** vía `Gmail.Users.Messages.modify()`.
- `registrarInicioProcesamiento()` / `actualizarLogMensajes()` — mantienen `Log Mensajes` actualizado en cada etapa.
- `gestionarErrorMensaje()` — clasifica errores (`ERROR_TEMPORAL` vs. `ERROR_DEFINITIVO`) sin tocar Gmail hasta que el registro esté cerrado.
- `recuperarProcesamientosAbandonados()` — detecta y reabre registros `EN_PROCESO` vencidos.

## 3. Parámetros de configuración usados en el borrador

Todos definidos en `configuracion/PARAMETROS_EJEMPLO.md`. Se listan aquí los que **la INVENTARIO_TECNICO.md de la Fase 0 marcó como "pendientes de aprobación antes de la Fase 3"**, para que la puerta de aprobación de esta fase los revise explícitamente:

| Parámetro | Valor usado en el borrador | Estado |
|---|---|---|
| `MAX_MENSAJES_POR_EJECUCION` | 10 (heredado de `script_actual.gs`) | Propuesta, no confirmada formalmente |
| `MAX_CARACTERES_CUERPO` | 8.000 | Propuesta, no confirmada formalmente |
| `MAX_HILOS` | 20 (valor de ejemplo) | Propuesta, no confirmada formalmente |
| `TIEMPO_INTERNO_MAX_MS` | 240.000 (4 min, con margen sobre el límite de 6 min de Apps Script) | Propuesta, no confirmada formalmente |
| `UMBRAL_ABANDONO_MIN` | 20 | Propuesta, no confirmada formalmente |

**Esto no bloquea la Fase 3** (el código es un borrador local, no ejecutado), pero sí debe resolverse — con valores confirmados por Rubén — antes de que este script pase a pruebas controladas (Fase 8) o despliegue (Fase 9).

## 4. Elementos NO resueltos en esta fase (documentados como placeholders en el código)

| Elemento | Función afectada | Fase que lo finaliza |
|---|---|---|
| Prompt operativo endurecido contra instrucciones maliciosas | `construirPromptSistema()` | Fase 4 |
| Política de reintentos ante fallos de la IA | `consultarIAExtractora()` | Fase 4 |
| Heurística de extracción de contenido nuevo | `extraerContenidoNuevo()` | Fase 4 |
| Lista de patrones de enmascaramiento | `enmascararDatosSensibles()` | Fase 4 |
| Formato definitivo del ID de tarea | `generarIdDeterministico()` | Fase 5 |
| Recuperación fina desde la etapa exacta interrumpida | `recuperarProcesamientosAbandonados()`, `persistirManifiestoTareas()` | Fase 5 |
| Reglas completas de elegibilidad determinística | `evaluarFiltroDeterministico()` | Fase 6 |
| Mapa y política definitiva de sanitización | `sanitizarValoresParaSheets()` | Fase 7 |

## 5. Cumplimiento de las reglas técnicas obligatorias (plan v3, Fase 3)

- [x] `validarConfiguracion()` al inicio; aborta sin tocar Gmail/Sheets si falla.
- [x] `SpreadsheetApp.openById()` en lugar de `getActiveSpreadsheet()` (permite operar sobre la planilla de prueba en `MODO_PRUEBA`).
- [x] Búsqueda de Gmail limitada desde el origen (`GmailApp.search(consulta, 0, MAX_HILOS)`).
- [x] Descarte de ya procesados por `message_id` contra `Log Mensajes`/`Indice Idempotencia`, no por etiqueta de hilo.
- [x] Descarte de mensajes anteriores a `FECHA_INICIO_CORTE`.
- [x] Etiquetado y archivado por mensaje individual vía Gmail API, con registro de unidades de cuota.
- [x] Soporte de `MODO_PRUEBA` y `DRY_RUN`, con aborto si `SPREADSHEET_ID_PRUEBA` coincide con el productivo.
- [x] `LockService` con liberación en `finally`.
- [x] `try/catch` por mensaje.
- [x] Límite de mensajes por ejecución y límite de tiempo interno.
- [x] Sin `Math.random()` para IDs.
- [x] Sin `appendRow()` por tarea (escritura por lotes).
- [x] `Procesado` no se aplica antes de completar todas las escrituras (ver `documentacion/FLUJO_TRANSACCIONAL.md`).
- [x] No se archiva antes de registrar el resultado final.

## Referencias cruzadas

- Orden transaccional detallado de los 12 pasos: `documentacion/FLUJO_TRANSACCIONAL.md`.
- Esquema de datos y reglas funcionales que este código implementa: `documentacion/ESQUEMA_JSON.md`, `documentacion/REGLAS_FUNCIONALES.md`.
- Diseño de las hojas técnicas que este código lee/escribe: `documentacion/DISENO_HOJAS_TECNICAS.md`.
- Riesgos mitigados: `documentacion/MATRIZ_RIESGOS.md` (R-01, R-03, R-04, R-06, R-07, R-09, R-13).
