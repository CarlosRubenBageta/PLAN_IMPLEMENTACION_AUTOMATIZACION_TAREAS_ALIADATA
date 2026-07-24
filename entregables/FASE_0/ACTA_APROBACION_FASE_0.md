# Acta de aprobación — Fase 0

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **Existe una copia verificable de la planilla.** Evidencia: registro completo en `INVENTARIO_TECNICO.md` (nombre, ID `1x2Vlkum…kI_js`, ubicación en Drive, fecha 19/07/2026 23:37) y constancia en `respaldos/planilla/RESPALDO_PLANILLA_2026-07-19.md`. Declarada abierta y verificada por el responsable. La existencia en Drive solo es verificable por el responsable.
- [x] **Existe una copia completa del script.** Evidencia: `codigo/script_actual.gs` (145 líneas, flujo completo) y `respaldos/script/script_actual_2026-07-19.gs`, verificadas **idénticas** con `diff`; manifiesto `respaldos/script/appsscript_actual.json` (JSON válido: V8, zona horaria Buenos Aires, sin servicios avanzados). Sin claves API incrustadas: la clave se lee de `PropertiesService`.
- [x] **Se conoce qué cuenta creó el activador.** Evidencia: `REGISTRO_ACTIVADOR.md` — cuenta propietaria `tareas@alia-data.com`, función `procesarCorreosDeTareas`, cada 10 minutos. Nota: la fecha de creación no está disponible en la interfaz actual de Apps Script (limitación conocida, no bloquea el criterio).
- [x] **El activador productivo permanece activo y la versión vigente sigue procesando correos.** Evidencia: estado ACTIVO registrado, captura `respaldos/activador_ejecuciones_2026-07-20.png` y 5 ejecuciones "Completada" del 20/07/2026 (0,9–4,2 s).
- [x] **Se puede volver a la versión anterior en menos de 15 minutos.** Evidencia: `CHECKLIST_RESTAURACION.md` validado documentalmente (procedimiento de 6 pasos, ~13 minutos estimados, restauración real no ejecutada por diseño de la Fase 0). Los insumos necesarios (código, manifiesto, planilla de respaldo) existen y fueron verificados.

## Observaciones de la revisión

1. Se corrigió una discrepancia documental menor: la copia fechada del script estaba en `codigo/` y la copia sin fecha en `respaldos/script/`; se reordenaron para coincidir con el inventario. Contenido idéntico verificado antes del movimiento; sin pérdida de información. Registrado en `auditoria/CHANGELOG.md`.
2. Se creó la constancia `respaldos/planilla/RESPALDO_PLANILLA_2026-07-19.md` prevista en el checklist de respaldo (los datos ya estaban en el inventario).
3. La revisión del código respalda el diagnóstico del plan: búsqueda `label:inbox -label:Procesado` (pierde respuestas en hilos procesados), `Math.random()` para IDs, `appendRow()`, hoja `Gestión General` como destino por defecto silencioso, sin `LockService` ni log técnico. Insumo directo para la Fase 1.
4. El respaldo de la planilla fue creado por `carlosrubenbageta@alia-data.com` (no la cuenta operativa); sin impacto, se deja constancia.
5. Pendientes que no bloquean la Fase 0 (ya asignados a fases posteriores): modelo definitivo de OpenAI (Fase 4), parámetros de la sección 14 (antes de Fase 3/8/9), responsables definitivos (Fase 2).

## Puerta de aprobación

```text
APROBACIÓN FASE 0: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Se verificaron los respaldos, el inventario técnico, el activador activo y el procedimiento documental de restauración. No se modificaron recursos productivos.
```

> La Fase 1 no puede iniciarse hasta que esta acta indique APROBADA con responsable y fecha.
