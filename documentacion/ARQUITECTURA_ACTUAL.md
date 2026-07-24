# Arquitectura actual — Fase 1

**Fecha de análisis:** 20/07/2026
**Analizado por:** Claude Cowork (revisión documental de `codigo/script_actual.gs`, sin acceso a Google Workspace)
**Fuente:** `codigo/script_actual.gs` (145 líneas), idéntico a `respaldos/script/script_actual_2026-07-19.gs` (verificado en Fase 0)

> Este documento describe el sistema **tal como está hoy**, sin proponer cambios. Las referencias `L<n>` apuntan a la línea de `script_actual.gs`.

---

## 1. Resumen del flujo

El script tiene dos funciones: `procesarCorreosDeTareas()` (L5-91, activador cada 10 minutos) y `consultarIAClasificadora()` (L94-145, llamada auxiliar a OpenAI).

```text
Activador de tiempo (cada 10 min)
  └─ procesarCorreosDeTareas()
       1. Obtener/crear etiqueta "Procesado"            (L8-15)
       2. Buscar hilos: label:inbox -label:Procesado     (L19)
       3. Limitar a los primeros 10 hilos                (L27-29)
       4. Por cada hilo:
            a. Tomar el ÚLTIMO mensaje del hilo          (L31-32)
            b. Armar datosCorreo (remitente/asunto/cuerpo/fecha/link) (L34-40)
            c. Llamar a consultarIAClasificadora()        (L43)
            d. Resolver hoja destino (o "Gestión General") (L47-54)
            e. Generar ID con Math.random()               (L59)
            f. appendRow() en la hoja destino              (L82)
            g. Etiquetar "Procesado" y archivar el hilo    (L85-86)
```

## 2. Operaciones de Gmail

| Operación | Línea | Detalle | Alcance |
|---|---|---|---|
| Obtener/crear etiqueta | L11 | `GmailApp.getUserLabelByName` / `createLabel("Procesado")` | Por nombre, nivel cuenta |
| Búsqueda de hilos | L19 | `GmailApp.search("label:inbox -label:Procesado")` | **Nivel hilo**, sin paginar |
| Lectura de mensajes | L31-32 | `hilo.getMessages()`, se usa solo `mensajes[length-1]` (el último) | Nivel mensaje, pero solo se lee uno |
| Lectura de campos | L35-39 | `getFrom()`, `getSubject()`, `getPlainBody()`, `getDate()` | Sobre el último mensaje únicamente |
| Enlace al hilo | L39 | `hilo.getPermalink()` | Nivel hilo (no identifica el mensaje individual) |
| Etiquetado | L85 | `hilo.addLabel(etiquetaProcesado)` | **Nivel hilo completo** |
| Archivado | L86 | `hilo.moveToArchive()` | **Nivel hilo completo** |

**Observación clave:** todas las operaciones de control (búsqueda, etiquetado, archivado) actúan sobre el **hilo**, mientras que el contenido que se analiza y registra proviene de un **único mensaje** (el último) dentro de ese hilo. Este desajuste es la causa raíz del riesgo de pérdida de respuestas nuevas (ver `MATRIZ_RIESGOS.md`, R-07).

## 3. Operaciones de Sheets

| Operación | Línea | Detalle |
|---|---|---|
| Acceso a la planilla activa | L6 | `SpreadsheetApp.getActiveSpreadsheet()` — el script debe estar vinculado (contenedor) a la planilla |
| Resolución de hoja destino | L48 | `sheetMaestro.getSheetByName(nombreTablero)`, usando el valor devuelto por la IA sin validar contra una lista propia |
| Hoja de reserva por defecto | L52-53 | Si `getSheetByName` devuelve `null`, se reasigna silenciosamente a `"Gestión General"` — no hay registro de que ocurrió una reasignación |
| Escritura de fila | L82 | `hojaDestino.appendRow(nuevaFila)` — una llamada por correo, sin agrupar ni usar `setValues()` en lote |
| Columnas escritas | L61-79 | 17 valores posicionales; 6 de ellos (`Prioridad final`, `Link a Drive`, `Derivada a`, `Observaciones`) se dejan vacíos por diseño en esta versión |

No existe ninguna hoja técnica (log, índice de idempotencia, manifiesto de ejecución): la única persistencia del procesamiento son las filas de negocio y la etiqueta de Gmail.

## 4. Llamadas a OpenAI

| Aspecto | Línea | Detalle |
|---|---|---|
| Endpoint | L95 | `https://api.openai.com/v1/chat/completions` vía `UrlFetchApp.fetch` |
| Modelo | L111 | `gpt-4o-mini`, fijo en el código (no es parámetro) |
| Autenticación | L2, L123 | `OPENAI_API_KEY` leída de `PropertiesService.getScriptProperties()`; no se valida su presencia antes de usarla |
| Prompt del sistema | L97-106 | Fija 6 campos de salida (`tablero`, `prioridad`, `grupo_origen`, `responsable_sugerido`, `resumen`, `fecha_limite`); asume **una sola clasificación por correo** |
| Forzado de formato | L116 | `response_format: {type: "json_object"}` — reduce pero no elimina el riesgo de JSON inválido o con campos fuera de rango |
| Manejo de errores HTTP | L127, L130-144 | `muteHttpExceptions: true` + `try/catch` alrededor del `fetch` y el primer `JSON.parse` |
| Segundo `JSON.parse` | L135 | `JSON.parse(json.choices[0].message.content)` — **fuera** de un `try/catch` propio (ver `DIAGNOSTICO_ERRORES.md`, D-02) |
| Reintentos | — | No existen: una respuesta inválida o un error de red descarta el correo en esa ejecución sin reintento ni cola de reproceso |

## 5. Estructura de la fila generada (17 columnas, L57 y L61-79)

1. ID (`Math.random()`, L59)
2. Fecha de entrada
3. Fuente (constante `"Gmail"`)
4. Grupo origen (IA)
5. Remitente
6. Asunto original
7. Resumen de tarea (IA)
8. Prioridad sugerida IA
9. Prioridad final (vacío)
10. Estado (constante `"Pendiente"`)
11. Responsable (IA)
12. Fecha límite (IA u opcional)
13. Link al correo (a nivel hilo, no mensaje)
14. Link a Drive (vacío)
15. Derivada a (vacío)
16. Última actualización (timestamp de ejecución)
17. Observaciones (vacío)

## 6. Elementos que no existen en la versión actual

- `LockService` u otro mecanismo de exclusión mutua entre ejecuciones.
- Registro técnico de ejecución (log ampliado, manifiesto, índice de idempotencia).
- Validación de configuración al inicio (`validarConfiguracion()`).
- Paginación o límite temprano en `GmailApp.search()`.
- Tratamiento por mensaje individual (Gmail API); todo el control es por hilo (`GmailApp`).
- Filtro determinístico de correos automáticos/notificaciones de Apps Script.
- Sanitización de valores antes de `appendRow()` (riesgo de inyección de fórmulas).
- Sistema de reintentos o cola de reproceso ante fallos de la IA o de escritura.

## 7. Referencias cruzadas

- Diagnóstico de errores y puntos de falla: `documentacion/DIAGNOSTICO_ERRORES.md`.
- Matriz de riesgos con causa/impacto/mitigación: `documentacion/MATRIZ_RIESGOS.md`.
- Decisiones ya adoptadas que afectan el rediseño (Fase 2 en adelante): `auditoria/DECISIONES.md` (DEC-001: adopción de Gmail API por mensaje).
- Problemas confirmados por el responsable funcional: plan v3, sección 3.2 (líneas 114-135 del plan).
