# Checklist de respaldo — Fase 0

**Ejecuta: Rubén** (requiere acceso a Google Workspace; Cowork no interviene).

## Planilla

- [x] Abrir el archivo maestro de Google Sheets.
- [x] Archivo → Hacer una copia → nombre: `RESPALDO - Aliadata Tableros Operativos - Pre automatización v3 - 2026-07-19`.
- [x] Guardar la copia en una carpeta de Drive de respaldos (`Mi unidad > ALIADATA > Respaldos > Automatizacion_Tareas`).
- [x] Registrar nombre, ID y fecha de la copia en `respaldos/planilla/RESPALDO_PLANILLA_2026-07-19.md` (y en el inventario técnico).
- [x] Abrir la copia y verificar que las 5 hojas y sus filas estén completas (declarado "Verificado" en el inventario).

## Script

- [x] Abrir el proyecto de Apps Script.
- [x] Copiar el contenido completo de cada archivo del proyecto (código + manifiesto `appsscript_actual.json`).
- [x] Guardar como `codigo/script_actual.gs`.
- [x] Guardar copia fechada en `respaldos/script/script_actual_2026-07-19.gs` (verificada idéntica a la copia de trabajo con `diff`).
- [x] Verificar que el respaldo no contenga la clave API (verificado: solo referencia a `PropertiesService`; sin claves incrustadas).

## Entorno

- [x] Completar `entregables/FASE_0/INVENTARIO_TECNICO.md`.
- [x] Completar `entregables/FASE_0/REGISTRO_ACTIVADOR.md` (el activador queda ACTIVO; captura en `respaldos/activador_ejecuciones_2026-07-20.png`).
- [x] Registrar la lista completa de etiquetas de Gmail en el inventario (`Procesado`).

## Cierre

- [x] Verificar los criterios de aceptación en `ACTA_APROBACION_FASE_0.md` (revisión documental completada; aprobación final pendiente del responsable).
- [x] Actualizar `auditoria/CHANGELOG.md` con los respaldos realizados.
