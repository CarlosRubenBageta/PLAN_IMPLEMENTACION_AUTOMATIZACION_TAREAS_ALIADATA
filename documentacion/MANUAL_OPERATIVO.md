# Manual operativo — Automatización de tareas Aliadata (v3, producción)

> Entregable de la Fase 10 (`PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 10. Monitoreo y estabilización"). Describe el sistema **tal como está corriendo en producción desde el 30/07/2026** — no es una guía de diseño ni de despliegue (para eso: `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`) ni de reversión (`documentacion/PROCEDIMIENTO_REVERSION.md`), aunque enlaza a ambos donde corresponde.

## 1. Qué hace el sistema, en una página

El pipeline v3 lee los correos de `tareas@alia-data.com`, usa IA (OpenAI, `gpt-4o-mini`) para extraer tareas accionables, las escribe en las hojas de negocio del archivo maestro de Google Sheets, y etiqueta/archiva cada correo en Gmail según el resultado. Corre solo, sin intervención humana, cada 10 minutos, vía un activador de tiempo de Google Apps Script.

- **Cuenta operativa (lee Gmail, escribe Sheets):** `tareas@alia-data.com`.
- **Archivo maestro:** "Aliadata - Tableros Operativos Fase 1", ID `1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g`.
- **Proyecto Apps Script:** ID `1-qrNy_5VOZHbdC9bj7m3Zqv3TTEmPPRwPynMYP20VBQUyR2IChVGVinA` (accesible desde `Extensiones → Apps Script` abriendo el archivo maestro).
- **Activador:** función `procesarCorreosDeTareas`, basado en tiempo, cada 10 minutos, creado como `tareas@alia-data.com`.
- **Versión desplegada:** `3.0.0` (columna `version_script` de `Log Mensajes`).

**Regla que vale para todo lo demás en este manual:** para administrar el activador, ver "Datos del proyecto", o cualquier acción que Google reserve al dueño del recurso, hay que iniciar sesión **como `tareas@alia-data.com` directamente** — tener acceso de editor sobre el archivo/proyecto compartido no alcanza (confirmado varias veces durante el corte del 30/07/2026, ver `auditoria/CHANGELOG.md`).

## 2. Dónde está todo

| Qué | Nombre / ubicación |
|---|---|
| Hojas de negocio (destino de las tareas) | `Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT`, `Gestión General` |
| Hojas técnicas (estado interno del pipeline) | `Log Mensajes` (27 columnas), `Registro Tareas` (16), `Indice Idempotencia` (4) — protegidas, solo administradores |
| Vistas de solo lectura (fórmula, no tocar a mano) | `Resumen Actividades`, `Registro Migración Histórica`, `Dashboard`, `Listas` |
| Correos automáticos descartados en el saneamiento previo al corte | `Registros descartados` |
| Etiquetas de Gmail que aplica el pipeline | `Procesado`, `Revisión manual/Sin tareas detectadas`, `Revisión manual/Error de procesamiento`, `Revisión manual/Error de automatización` |
| Config real (API keys, umbrales, etc.) | Apps Script → Configuración del proyecto → Propiedades de secuencia de comandos. Descripción de cada propiedad (valores de ejemplo, nunca los reales): `configuracion/PARAMETROS_EJEMPLO.md` |
| Esquema completo de columnas de las hojas técnicas | `documentacion/DISENO_HOJAS_TECNICAS.md` |

## 3. Glosario — `Log Mensajes` (la hoja que hay que mirar todos los días)

Cada fila es un correo. Dos columnas cuentan la historia de esa fila: `estado` (a dónde llegó) y `etapa` (qué tan lejos avanzó del proceso interno de 12 pasos).

**`estado` — valores posibles:**

| Estado | Significa |
|---|---|
| `EN_PROCESO` | Se está procesando ahora mismo, o quedó a medio camino por una caída del runtime. Si lleva más de `UMBRAL_ABANDONO_MIN` minutos así, la próxima ejecución lo recupera solo. |
| `PROCESADO` | Éxito: se generaron una o más tareas y se escribieron todas correctamente. |
| `SIN_TAREAS` | El correo no tenía nada accionable (aviso informativo, notificación automática, etc.) — comportamiento esperado, no es un error. |
| `REVISION_MANUAL` | El pipeline no pudo decidir solo (respuesta de la IA inválida, la IA pidió revisión explícita, o alguna tarea no se pudo escribir) — requiere que una persona lo revise a mano en Gmail. |
| `ERROR_TEMPORAL` | Falló algo recuperable (timeout, límite de tasa, error 5xx). Queda elegible para reintentarse solo en una próxima ejecución. |
| `ERROR_DEFINITIVO` | Falló algo no recuperable, o se agotaron los reintentos (`LIMITE_REINTENTOS_GMAIL`, hoy `6`). Cierra el mensaje; las tareas que sí llegaron a escribirse se conservan. |

**`etapa` — orden esperado (INICIO es el primer paso, FINALIZADO el último):** `INICIO` → `CORREO_EXTRAIDO` → `FILTRO_COMPLETADO` → `IA_INICIADA` → `IA_COMPLETADA` → `RESPUESTA_VALIDADA` → `MANIFIESTO_PERSISTIDO` → `TAREAS_RESERVADAS` → `ESCRITURA_INICIADA` → `ESCRITURA_COMPLETADA` → `GMAIL_ACTUALIZADO` → `FINALIZADO`.

Una fila con `estado=FINALIZADO`... no — cuidado, `FINALIZADO` es un valor de `etapa`, no de `estado`. **Toda fila cerrada (`PROCESADO`, `SIN_TAREAS`, `REVISION_MANUAL`, `ERROR_DEFINITIVO`) debería tener `etapa=FINALIZADO`.** Una fila con `estado` distinto de `EN_PROCESO`/`ERROR_TEMPORAL` pero `etapa` que NO es `FINALIZADO` es rara y vale la pena mirarla con atención — o una fila que directamente no existe para una ejecución que sabés que corrió (ver la anomalía de la sección 6).

**Otras columnas útiles al revisar:** `error` (motivo en texto, cuando aplica), `cantidad_tareas`, `resultado_gmail` (p. ej. `ETIQUETADO_Y_ARCHIVADO`), `costo_estimado` (USD, esa llamada a OpenAI), `intentos_gmail` (cuenta hacia `LIMITE_REINTENTOS_GMAIL`).

## 4. Revisión diaria — cómo hacerla

Cadencia (plan v3, sección "Fase 10"): **día 1 → revisar todas las ejecuciones; días 2-3 → dos veces al día; días 4-7 → diaria; después → semanal.**

Dos vistas complementarias:

1. **Apps Script → Ejecuciones** (vista nativa, no es una hoja): lista cada corrida del activador, con duración y estado (`Completado`/`Falló`/`En ejecución`). Sirve para detectar ejecuciones que tardan mucho más de lo normal (la mayoría termina en pocos segundos cuando no hay mensajes nuevos) o que terminan en `Falló`. **Esta vista puede quedar desactualizada en pantalla** — si una fila parece trabada, recargar la página completa antes de asumir que sigue así.
2. **`Log Mensajes`:** una fila por correo realmente procesado. Revisar que `estado` tenga sentido para cada asunto/remitente, que no haya `ERROR_DEFINITIVO` ni `REVISION_MANUAL` sin explicación, y que los correos reales del día efectivamente generaron fila (ver sección 6 si una ejecución no dejó ninguna).

**No confundir "0 mensajes elegibles, procesando 0" con un error.** Es el resultado normal cuando no llegó correo nuevo desde la última corrida — la mayoría de las ejecuciones de un día tranquilo son así.

## 5. Catálogo de alertas (Fase 10, DEC-017)

El plan v3 exige 8 eventos de alerta hacia una **cuenta técnica externa** (nunca `tareas@alia-data.com`, para que una alerta no reingrese al flujo como si fuera un correo a procesar). Estado real de cada uno:

| # | Evento | Estado (30/07/2026) | Qué hacer si llega |
|---|---|---|---|
| 1 | Runtime terminado inesperadamente | **Activo en producción.** Notificación nativa de Apps Script, reenviada por filtro de Gmail hacia `carlosrubenbageta@alia-data.com` (probada con una falla real, 28/07/2026 — `auditoria/CHANGELOG.md`) | Abrir Apps Script → Ejecuciones, ubicar la corrida fallida, leer el stack trace. |
| 2 | Error crítico | **Activo en producción** (`codigo/alertas.gs`, probado — CA-05 — y desplegado 30/07/2026) | Abrir `Log Mensajes` o Ejecuciones para el detalle; revisar `validarConfiguracion()` si el correo indica un problema de configuración. |
| 3 | Tres fallos consecutivos | ídem (CA-06) | Señal de un problema sostenido, no un blip — revisar Ejecuciones de las últimas corridas. |
| 4 | Aumento anormal de revisión manual | ídem (CA-03) | Revisar `Log Mensajes` filtrando `estado=REVISION_MANUAL` de esa ejecución. |
| 5 | Clave API ausente | ídem (CA-01) | Revisar/restaurar `OPENAI_API_KEY` en Propiedades del script. |
| 6 | Falta de permisos | ídem (CA-04) | Revisar `SPREADSHEET_ID`, permisos de la cuenta operativa, o el ID de etiqueta si el error menciona Gmail. |
| 7 | Fallo de escritura | ídem (CA-03) | Revisar que la hoja de destino exista y no esté protegida contra la cuenta operativa. |
| 8 | Hoja inexistente | ídem (CA-02, CA-03) | Confirmar el nombre exacto de la hoja (técnica o de negocio) mencionada en el correo. |

**Los 8 eventos están activos en producción desde el 30/07/2026** (7 nuevos vía `codigo/alertas.gs`, probados en el proyecto de prueba — `pruebas/CASOS_DE_PRUEBA_ALERTAS_FASE10.md` — y verificados con un envío real en el proyecto real). Todas mandan un correo con asunto `[Automatización Aliadata] ...` a `CUENTA_ALERTAS`, con un cooldown de `COOLDOWN_ALERTAS_MIN` (60 min en producción) por tipo de evento para no saturar la bandeja si el problema persiste.

`CUENTA_ALERTAS` es hoy `carlosrubenbageta@alia-data.com` — **uso temporal**, según quedó registrado en DEC-017 (`auditoria/DECISIONES.md`).

## 6. Anomalía conocida — observada, resuelta sola, sin causa raíz confirmada al 100%

**Una ejecución puede tardar varios minutos y aun así terminar bien.** Observado el 30/07/2026: la corrida de `18:21:48` quedó "En ejecución" más de 11 minutos en vivo, sin dejar ninguna fila en `Log Mensajes` mientras tanto — pero al revisar más tarde la vista Apps Script → Ejecuciones, terminó **`Completada`**, duración final **763.434 s** (~12m43s), no `Falló`. No bloqueó las corridas siguientes (la de `18:31:48` corrió y cerró normal, 6.872 s). Como no dejó ninguna fila en `Log Mensajes` pero cerró sin error, la lectura más consistente es 0 mensajes elegibles esa corrida, con la lentitud concentrada en la búsqueda contra la API de Gmail — lentitud transitoria de Google, no un cuelgue del script. De las 14 ejecuciones revisadas ese rango horario, es la única fuera de lo normal (el resto: 3-16 s) — un outlier aislado, no un patrón repetido (detalle: `auditoria/CHANGELOG.md`, entrada "Fase 10: primera ejecución automática real confirmada").

**Qué hacer si se repite:** abrir esa ejecución puntual en Apps Script → Ejecuciones y leer su log real (línea "N mensajes elegibles, procesando M") para confirmar si de verdad encontró 0 mensajes o si hay algo más. Si además empieza a pasar seguido (no una vez aislada), ahí sí vale la pena mirar Google Cloud Console (Stackdriver/Cloud Logging) para un diagnóstico más profundo.

## 7. Ante una falla crítica

Protocolo completo y los 3 escenarios según en qué punto ocurra: `documentacion/PROCEDIMIENTO_REVERSION.md`. Resumen de los 10 pasos genéricos (plan v3, sección 8):

1. Desactivar el activador. 2. Registrar la incidencia. 3. Copiar el log y las filas afectadas. 4. Restaurar el script anterior. 5. Verificar las propiedades del script. 6. Ejecutar una prueba manual. 7. Reactivar el activador anterior. 8. Mover los mensajes problemáticos a revisión manual. 9. Documentar la causa. 10. No reintentar el despliegue hasta corregir el problema.

**Regla dura que corrige un error del procedimiento original:** un activador no contiene una copia del código, ejecuta lo que esté vigente en el proyecto en ese momento. Restaurar el código siempre va **antes** de tocar cualquier activador — nunca "reactivar el activador viejo" como forma de revertir si el código todavía es v3.

**Advertencia vigente:** el simulacro completo de reversión (cuarentena simulada + medición de tiempo real) todavía no se ensayó sobre el entorno real — solo el mecanismo de restaurar código, sobre el proyecto de prueba (28/07/2026). Riesgo residual aceptado explícitamente en la puerta de aprobación de la Fase 9.

## 8. Referencias

- Plan maestro: `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`
- Qué se desplegó y cómo: `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`
- Reversión: `documentacion/PROCEDIMIENTO_REVERSION.md`
- Esquema de columnas de las hojas técnicas: `documentacion/DISENO_HOJAS_TECNICAS.md`
- Política de reintentos: `documentacion/POLITICA_REINTENTOS.md`
- Historial real, día a día, de todo lo que pasó en producción: `auditoria/CHANGELOG.md`
- Decisiones con su motivo y (cuando aplica) su corrección posterior: `auditoria/DECISIONES.md`
- Estado de cada fase y qué falta: `README.md`
