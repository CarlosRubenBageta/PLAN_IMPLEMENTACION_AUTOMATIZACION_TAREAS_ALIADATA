# Mapa de escritura — Fase 7

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 7 — Reglas / Mapeo de columnas" (líneas 1176-1212)
**Código asociado:** `codigo/escritura_sheets.gs`, `codigo/sanitizacion.gs`

---

## 1. Mapeo de columnas con tipo real de dato

| # | Campo | Tipo escrito en la celda | Origen |
|---|---|---|---|
| 1 | ID | string | `tarea.taskId` (Fase 5) |
| 2 | Fecha de entrada | **Date real** (Fase 7) | `tarea.datosCorreo.fecha` (`mensaje.getDate()`) |
| 3 | Fuente | string constante | `"Gmail"` |
| 4 | Grupo origen | string | `tarea.grupoOrigen` |
| 5 | Remitente | string, sanitizado | `sanitizarValoresParaSheets(tarea.datosCorreo.remitente)` |
| 6 | Asunto original | string, sanitizado | `sanitizarValoresParaSheets(tarea.datosCorreo.asunto)` |
| 7 | Resumen de tarea | string, sanitizado | `sanitizarValoresParaSheets(tarea.resumen)` |
| 8 | Prioridad sugerida IA | string | `tarea.prioridad` |
| 9 | Prioridad final | vacío | Edición manual |
| 10 | Estado | string constante | `"Pendiente"` |
| 11 | Responsable | string | `tarea.responsable` |
| 12 | Fecha límite | **Date real o vacío** (Fase 7) | `construirFechaLocal(tarea.fechaLimite)` si no es `null` |
| 13 | Link al correo | string (URL) | `construirEnlaceCorreo()`, corregido en esta fase |
| 14 | Link a Drive | vacío | Fuera de alcance |
| 15 | Derivada a | vacío | Fuera de alcance |
| 16 | Última actualización | **Date real** (Fase 7) | `new Date()` al momento de escribir |
| 17 | Observaciones | string, sanitizado | `sanitizarValoresParaSheets(tarea.observacionTextoOriginal)` |

## 2. Cambio respecto al borrador de Fase 3: fechas como objetos `Date`, no strings

El borrador de Fase 3 escribía las columnas de fecha con `Utilities.formatDate(...)`, que devuelve un **string** ya formateado (por ejemplo, `"24/07/2026"`), no un valor de fecha real. Esto contradice la regla explícita de esta fase:

> "Escribir `Fecha límite` como fecha real (objeto `Date`) con formato visual `dd/MM/yyyy`; el formato ISO `YYYY-MM-DD` es solo de intercambio con la IA."

Se corrigió para las tres columnas de fecha (2, 12, 16): ahora se escriben objetos `Date` genuinos. Sheets muestra estos valores con el **formato de columna ya existente** en la planilla (regla "conservar formatos y validaciones existentes" — el código nunca llama a `setNumberFormat()` ni a ningún método que sobrescriba el formato de la hoja productiva). Como valores de fecha reales, además, permiten ordenar y filtrar correctamente en Sheets, algo que una columna de texto con apariencia de fecha no permite de forma confiable.

### Corrimiento de un día evitado (`construirFechaLocal()`)

`new Date("2026-07-24")` (fecha sin hora) se interpreta, por especificación de ECMAScript, como **medianoche UTC**, incluso dentro de Apps Script. En la zona horaria del proyecto (`America/Argentina/Buenos_Aires`, UTC-3), esa medianoche UTC corresponde a las 21:00 del día anterior en hora local — si Sheets muestra la fecha usando la zona horaria del proyecto, podría desplazar la fecha límite un día hacia atrás.

`construirFechaLocal()` evita esto construyendo la fecha con componentes explícitos (`new Date(año, mes - 1, día)`), que en Apps Script se interpretan en la zona horaria configurada del proyecto (no en UTC — es un comportamiento propio de Apps Script, distinto de un entorno Node.js genérico). Este es un detalle no obvio y se documenta explícitamente en el código (`codigo/escritura_sheets.gs`).

## 3. Corrección de un bug real: enlace al correo dependiente de la posición de sesión

El borrador de Fase 3 construía el enlace como:

```text
https://mail.google.com/mail/u/0/#search/rfc822msgid:<Message-ID>
```

El segmento `/u/0/` asume que la cuenta `tareas@alia-data.com` es la **primera** cuenta de Google iniciada en el navegador de quien abre el enlace. Si esa persona tiene varias cuentas y `tareas@alia-data.com` está en otra posición (`/u/1/`, `/u/2/`...), el enlace abre la bandeja equivocada. El plan v3 (Fase 7) lo prohíbe explícitamente: *"no usar rutas dependientes de la posición de sesión como `/u/0`"* — este es exactamente el criterio de aceptación CP-24 ("el enlace al correo funciona con varias cuentas de Google iniciadas").

**Corrección aplicada:**

```text
https://mail.google.com/mail/?authuser=tareas@alia-data.com#search/rfc822msgid:<Message-ID>
```

`?authuser=<email>` identifica la cuenta por **dirección**, no por posición: Gmail resuelve el enlace a la cuenta correcta sin importar en qué orden esté iniciada sesión. Es el mismo mecanismo que preserva el enlace específico al mensaje (`rfc822msgid:`), resuelto en la Fase 3 (`documentacion/MAPA_COLUMNAS.md`, fila 13) — esta fase solo corrige la dependencia de sesión, no revierte esa mejora.

## 4. Regla dura: ninguna hoja por defecto ante un destino inexistente

`script_actual.gs` (L52-53) reasignaba silenciosamente a `"Gestión General"` cuando la IA devolvía un tablero inexistente (riesgo R-11 en `documentacion/MATRIZ_RIESGOS.md`). Esta fase lo prohíbe explícitamente: *"No utilizar una hoja por defecto silenciosa ante errores"* / *"Si una hoja no existe, enviar el mensaje a revisión manual."*

En la práctica, este escenario ya está doblemente prevenido antes de llegar a la escritura: el `enum` del JSON Schema estricto (Fase 4) y `validarRespuestaIA()` garantizan que `tarea.tablero` sea uno de los 5 nombres válidos, y `validarConfiguracion()` (Fase 3) verifica al inicio de cada ejecución que las 5 hojas de negocio existan. Aun así, `escribirFilasPorLote()` valida la existencia de la hoja en el momento mismo de escribir, como red de seguridad ante un cambio manual de la planilla durante una ejecución larga.

**Decisión de diseño (no especificada literalmente en el plan, elegida por Claude Cowork):** si falta la hoja de una tarea pero **otras** tareas del mismo mensaje sí tienen hoja válida, esas otras tareas se escriben igual (no se descarta el lote completo), y el **mensaje** se cierra como `REVISION_MANUAL` con la etiqueta `Revisión manual/Error de procesamiento` en lugar de `Procesado`. Esto evita perder escrituras válidas y a la vez respeta que el correo, en su conjunto, necesita revisión humana. Ver `codigo/script_refactorizado.gs`, variable `huboFallaEscritura` en `procesarUnMensaje()` (y su equivalente en `reanudarDesdeManifiesto()`, `codigo/recuperacion.gs`).

## 5. Validación de 17 columnas por fila

`validarFilaCompleta()` (`codigo/sanitizacion.gs`) verifica que cada fila construida tenga exactamente 17 elementos antes de agregarla al lote de `setValues()`. Es una red de seguridad contra defectos de código (por ejemplo, un futuro cambio que agregue u omita una columna sin actualizar todas las referencias), no una validación de datos de negocio: si falla, se lanza una excepción que cierra el mensaje como error (vía `gestionarErrorMensaje()`), porque indicaría un defecto del script, no un dato inválido del correo.

## 6. Sanitización contra inyección de fórmulas

Ya cubierta en el borrador de Fase 3 y confirmada aquí sin cambios: `sanitizarValoresParaSheets()` antepone un apóstrofo a cualquier valor de texto que comience con `=`, `+`, `-` o `@`, aplicado a remitente, asunto, resumen y observaciones (columnas 5, 6, 7 y 17), exactamente las 4 columnas que la regla de esta fase exige.

## 7. Registro de hojas de destino e IDs escritos

Satisfecho por diseño ya existente, sin código adicional: `Registro Tareas` (`documentacion/DISENO_HOJAS_TECNICAS.md`) ya registra `tablero` (hoja de destino) y `task_id` por cada tarea, actualizados por `marcarTareasEscritas()` con `fila_destino` real tras la escritura.

## Referencias cruzadas

- Casos de prueba concretos (inyección de fórmulas, enlace multi-cuenta): `pruebas/PRUEBAS_ESCRITURA.md`.
- Diseño de `Registro Tareas` y su rol como manifiesto: `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`.
- Riesgos mitigados: `documentacion/MATRIZ_RIESGOS.md`, R-09 (inyección de fórmulas), R-11 (hoja inexistente).
- Hallazgo de diagnóstico original: `documentacion/DIAGNOSTICO_ERRORES.md`, D-07 (`appendRow()` por fila, ya resuelto en Fase 3 con escritura por lotes).
