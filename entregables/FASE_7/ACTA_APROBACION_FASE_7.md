# Acta de aprobación — Fase 7

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **Cada tarea crea una fila.** Evidencia: `escribirFilasPorLote()` en `codigo/escritura_sheets.gs`, una fila por tarea dentro del lote de cada hoja.
- [x] **Un correo puede generar filas en varias hojas.** Evidencia: `agruparFilasPorHoja()` + `escribirFilasPorLote()` iteran por tablero; caso PE-07 en `pruebas/PRUEBAS_ESCRITURA.md`.
- [x] **Todas las filas contienen 17 valores.** Evidencia: `validarFilaCompleta()` en `codigo/sanitizacion.gs`, invocada antes de agregar cada fila al lote; caso PE-09.
- [x] **Se evita la escritura parcial no recuperable.** Evidencia: regla transaccional RESERVADA→ESCRITA (Fase 5) + manejo explícito de hoja inexistente sin destino por defecto silencioso (sección 4 de `documentacion/MAPA_ESCRITURA.md`).
- [x] **Ningún valor se interpreta como fórmula (CP-23).** Evidencia: `sanitizarValoresParaSheets()`, casos PE-01 a PE-03.
- [x] **El enlace al correo funciona con varias cuentas de Google iniciadas (CP-24).** Evidencia: `construirEnlaceCorreo()` corregido (`?authuser=<email>` en lugar de `/u/0/`); caso PE-06.
- [x] **No se producen filas duplicadas.** Evidencia: mecanismo de idempotencia ya validado en la Fase 5 (`persistirManifiestoTareas()` reutiliza manifiestos existentes); sin cambios en esta fase.

## Entregables

- `codigo/escritura_sheets.gs` — `agruparFilasPorHoja()`, `escribirFilasPorLote()` (con validación de hoja y fechas reales), `marcarTareasEscritas()`, `construirEnlaceCorreo()` corregido.
- `codigo/sanitizacion.gs` — `sanitizarValoresParaSheets()`, `validarFilaCompleta()`.
- `documentacion/MAPA_ESCRITURA.md`, `pruebas/PRUEBAS_ESCRITURA.md`.
- `codigo/script_refactorizado.gs` y `codigo/recuperacion.gs` actualizados: delegan a los nuevos módulos; `procesarUnMensaje()` y `reanudarDesdeManifiesto()` envían el mensaje a revisión manual si alguna tarea no pudo escribirse.

## Observaciones de la revisión

1. **Corrección de un bug real, no introducido por esta fase pero detectado al revisarla:** el enlace al correo (columna 13) generado desde la Fase 3 usaba la ruta `/mail/u/0/`, dependiente de la posición de sesión — exactamente lo que el plan v3 prohíbe explícitamente en esta fase y que el criterio CP-24 verifica. Corregido con `?authuser=tareas@alia-data.com`, que resuelve la cuenta por dirección en lugar de por posición. La mejora de la Fase 3 (enlace al mensaje individual, no al hilo) se conserva.
2. **Corrección de un defecto real, también heredado de la Fase 3:** las columnas de fecha (`Fecha de entrada`, `Fecha límite`, `Última actualización`) se escribían como texto pre-formateado (`Utilities.formatDate()`), no como objetos `Date` reales, contradiciendo la regla explícita de esta fase. Corregido; además se evitó un corrimiento de un día en `Fecha límite` que habría ocurrido al parsear una fecha ISO sin hora como UTC en una zona horaria UTC-3 (detalle técnico documentado en `MAPA_ESCRITURA.md`, sección 2).
3. **Decisión de diseño no especificada literalmente en el plan:** si falta una hoja de destino para alguna tarea de un mensaje, las tareas con hoja válida igual se escriben, y el mensaje completo se cierra como `REVISION_MANUAL` (no se descarta el lote entero ni se usa una hoja de reemplazo). Aplicada tanto en el flujo normal (`procesarUnMensaje()`) como en la recuperación (`reanudarDesdeManifiesto()`).
4. Este escenario (hoja inexistente) ya está prevenido por dos validaciones anteriores (enum del JSON Schema estricto en Fase 4, verificación de existencia de las 5 hojas en `validarConfiguracion()` en Fase 3); el chequeo de esta fase es una red de seguridad adicional, no la única barrera.
5. No se accedió a Google Workspace ni se escribió en ninguna hoja real durante esta fase.
6. Aprobado por Carlos Rubén Bageta mediante instrucción explícita en sesión de Claude Cowork (20/07/2026), sin observaciones adicionales sobre el contenido técnico.

## Puerta de aprobación

```text
APROBACIÓN FASE 7: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión. Sin correcciones sobre el código ni la documentación de escritura.
```

> Fase 8 habilitada.
