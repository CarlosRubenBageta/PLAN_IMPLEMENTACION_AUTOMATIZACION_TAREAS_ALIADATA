# Parámetros de configuración — ejemplo

> **REGLA:** este archivo contiene únicamente valores de EJEMPLO. Nunca copiar aquí la `OPENAI_API_KEY` ni ningún valor real sensible. Los valores reales viven en: Apps Script → Configuración del proyecto → Propiedades de secuencia de comandos.

## Propiedades del script

| Propiedad | Ejemplo | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | `(solo en propiedades del script)` | Clave de OpenAI. Jamás en archivos, logs ni capturas. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo a utilizar (aprobado en Fase 4). |
| `SPREADSHEET_ID` | `1AbC...xyz` | ID del archivo maestro de Google Sheets. |
| `ZONA_HORARIA` | `America/Argentina/Buenos_Aires` | Debe coincidir con el archivo maestro. |
| `MAX_MENSAJES_POR_EJECUCION` | `10` | Límite por ejecución. |
| `MAX_MENSAJES_BUSQUEDA` | `20` | Límite de IDs individuales a obtener de `Gmail.Users.Messages.list()` (H-03, Lote 1, 21/07/2026). Reemplaza `MAX_HILOS`. |
| ~~`MAX_HILOS`~~ | ~~`20`~~ | **Obsoleta desde 21/07/2026 (H-03, Lote 1).** Puede conservarse en propiedades del script sin efecto; ya no se lee ni se valida. Reemplazada por `MAX_MENSAJES_BUSQUEDA`. |
| `MAX_CARACTERES_CUERPO` | `8000` | Truncamiento del cuerpo antes de enviarlo a la IA. |
| `TIEMPO_INTERNO_MAX_MS` | `240000` | Menor que el límite de Apps Script (6 min). |
| `UMBRAL_ABANDONO_MIN` | `20` | Minutos para considerar abandonado un registro `EN_PROCESO`. |
| `FECHA_INICIO_CORTE` | `(se completa en Fase 9)` | Inicio de la ventana de corte del despliegue. |
| `VERSION_SCRIPT` | `3.0.0` | Registrada en cada fila de `Log Mensajes`. |
| `CUENTA_ALERTAS` | `alertas-tecnicas@ejemplo.com` | Cuenta técnica externa. Nunca `tareas@alia-data.com`. |
| `CUENTA_OPERATIVA` | `tareas@alia-data.com` | **Implementada (DEC-008, Lote 1, 21/07/2026):** obligatoria, leída en `validarConfiguracion()` → `cfg.cuentaOperativa`. La constante `var CUENTA_OPERATIVA` fue eliminada de `codigo/escritura_sheets.gs`. En entorno de prueba: usar la cuenta propietaria del proyecto de Apps Script de prueba. |
| `LIMITE_REINTENTOS_GMAIL` | `5` | **Propuesta (DEC-007, no aplicada todavía):** cantidad máxima de intentos de recuperación de Gmail por mensaje (columna nueva propuesta `Log Mensajes.intentos_gmail`) antes de cerrar el mensaje como `ERROR_DEFINITIVO` definitivo. Ver `documentacion/RECUPERACION_INTERRUPCIONES.md`, sección 9. |

## Modo de prueba aislado

> **Estado (Lote 1, 21/07/2026):** `MODO_PRUEBA`, `DRY_RUN`, `GMAIL_QUERY_PRUEBA` y `ETIQUETA_PRUEBA` son ahora propiedades implementadas y estrictas. Los hallazgos de la auditoría del 20/07/2026 fueron aprobados (H-01, H-02) y aplicados en `validarConfiguracion()`.

| Propiedad | Ejemplo | Descripción |
|---|---|---|
| `MODO_PRUEBA` | `true` | En producción: `false`. **Obligatoria y estricta (H-01, Lote 1):** debe ser exactamente `"true"` o `"false"` via `leerBooleanoEstricto()`. Un valor ausente o mal escrito aborta sin fallback. |
| `DRY_RUN` | `true` | Simula sin escribir. **Obligatoria y estricta (H-01, Lote 1):** igual que `MODO_PRUEBA`. |
| `SPREADSHEET_ID_PRUEBA` | `1XyZ...abc` | Copia de la planilla. **Nunca** el ID productivo (el script aborta, CP-27). |
| `GMAIL_QUERY_PRUEBA` | `in:inbox label:Pruebas-Automatizacion` | **Obligatoria sin fallback cuando `MODO_PRUEBA=true` (H-02, Lote 1).** Validada en `validarConfiguracion()`: debe contener `label:<ETIQUETA_PRUEBA>`; si falta o no contiene la etiqueta, `validarConfiguracion()` aborta. Guardada en `cfg.gmailQueryEfectiva`. |
| `ETIQUETA_PRUEBA` | `Pruebas-Automatizacion` | **Obligatoria cuando `MODO_PRUEBA=true` (H-02, Lote 1).** Se usa para validar que `GMAIL_QUERY_PRUEBA` garantice aislamiento. |
| `PERMITIR_ARCHIVADO` | `false` | En modo prueba no se archivan mensajes reales. **Obligatoria y estricta** (corrección INC-FASE8-004 + H-01): debe ser exactamente `true` o `false` via `leerBooleanoEstricto()`; cualquier otro valor aborta. |
| `PERMITIR_ETIQUETADO` | `false` | En modo prueba no se aplican etiquetas productivas. **Obligatoria y estricta**, igual que `PERMITIR_ARCHIVADO`. Si es `false`, los IDs de etiqueta (`ID_ETIQUETA_*`, tabla siguiente) no son obligatorios. |

## Etiquetas de Gmail (registrar ID interno al crearlas — Fase 9)

> **Nota (auditoría de propiedades, 20/07/2026):** la tabla siguiente lista los nombres de etiqueta y su ID interno, pero no declaraba explícitamente la propiedad del script donde vive cada ID. `codigo/script_refactorizado.gs` (`validarConfiguracion()`) los lee bajo estos nombres exactos:

| Etiqueta | Propiedad del script | ID interno (Gmail API) |
|---|---|---|
| `Procesado` | `ID_ETIQUETA_PROCESADO` | _(pendiente)_ |
| `Revisión manual/Sin tareas detectadas` | `ID_ETIQUETA_REVISION_SIN_TAREAS` | _(pendiente)_ |
| `Revisión manual/Error de procesamiento` | `ID_ETIQUETA_REVISION_ERROR_PROCESAMIENTO` | _(pendiente)_ |
| `Revisión manual/Error de automatización` | `ID_ETIQUETA_REVISION_ERROR_AUTOMATIZACION` | _(pendiente)_ |
| `Pruebas-Automatizacion` | _(no tiene propiedad propia; se usa vía `GMAIL_QUERY_PRUEBA`)_ | _(pendiente)_ |

Estas 4 propiedades solo son obligatorias cuando `PERMITIR_ETIQUETADO=true` (corrección INC-FASE8-004); con `PERMITIR_ETIQUETADO=false`, `validarConfiguracion()` no las exige.
