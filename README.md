# Automatización de tareas — Gmail → Tableros Aliadata

Proyecto de actualización de la automatización que procesa los correos de `tareas@alia-data.com` y genera tareas en los tableros de Google Sheets.

**Plan maestro vigente:** `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md` (versión 3.0, auditada)  
**Responsable funcional:** Rubén  
**Regla de trabajo:** una fase por vez; ninguna fase avanza sin aprobación humana registrada en su puerta de aprobación.

## Estructura de la carpeta

Esta carpeta seleccionada actúa como raíz del proyecto (equivale a `Automatizacion_Tareas_Aliadata/` del plan).

```text
├── PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md   ← plan vigente
├── PLAN_..._v2.md / PLAN_...md                                ← versiones históricas
├── AUDITORIA_PLAN_..._v2.md                                   ← auditoría técnica externa
├── configuracion/      ← parámetros de ejemplo y matriz de permisos
├── codigo/             ← archivos .gs (pendiente: pegar script_actual.gs)
├── respaldos/          ← respaldos de script y planilla (pendiente: acción humana)
├── pruebas/            ← casos de prueba y correos sintéticos
├── documentacion/      ← documentos generados por las Fases 1 a 10
├── auditoria/          ← CHANGELOG, DECISIONES, INCIDENCIAS
└── entregables/        ← entregables por fase (FASE_0/ creado)
```

## Estado de fases

| Fase | Estado |
|---|---|
| 0. Preparación y respaldo | **APROBADA** (20/07/2026, acta firmada) |
| 1. Diagnóstico | **APROBADA** (20/07/2026, acta firmada) |
| 2. Diseño funcional | **APROBADA** (20/07/2026, acta firmada) |
| 3. Refactor estructural | **APROBADA** (20/07/2026, acta firmada) |
| 4. Extracción con IA | **APROBADA** (20/07/2026, acta firmada; modelo confirmado: gpt-4o-mini) |
| 5. Idempotencia | **APROBADA** (20/07/2026, acta firmada; incluye enmienda a Registro Tareas de Fase 2) |
| 6. Filtros determinísticos | **APROBADA** (20/07/2026, acta firmada) |
| 7. Escritura en Sheets | **APROBADA** (20/07/2026, acta firmada) |
| 8. Pruebas | **APROBADA** (27/07/2026) — 36/36 casos condicionantes + CP-38/CP-39 (Lotes 2/3, H-07/H-08), todos con corrida real; ver acta |
| 8.1. Consolidación e incorporación del histórico | **APROBADA** (28/07/2026) — Etapas 0 a 4 completas con datos reales y simulación validada en copia aislada; los 7 criterios de aceptación satisfechos (ver `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 8.1"). Nueva fase, no contemplada en el plan original — ver `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md` y DEC-013 a DEC-016 |
| 9. Despliegue controlado | **APROBADA** (30/07/2026) — corte productivo real ejecutado: Aprobación A y B firmadas, pipeline v3 corriendo en producción (`tareas@alia-data.com`), primer correo real procesado con éxito. Detalle completo en `auditoria/CHANGELOG.md` y `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`. Pendiente como riesgo residual aceptado: simulacro completo de reversión (`documentacion/PROCEDIMIENTO_REVERSION.md`) |
| 10. Monitoreo y estabilización | En curso — cadencia de supervisión iniciada el 30/07/2026 (día 1: todas las ejecuciones) |

**Para retomar el proyecto en una sesión nueva:** indicar a Cowork que lea este README y `entregables/FASE_8/ACTA_APROBACION_FASE_8.md`.

**Acción pendiente de Rubén para cerrar formalmente la Fase 8:** ninguna condición técnica pendiente — solo falta firmar el acta (responsable y fecha) en `entregables/FASE_8/ACTA_APROBACION_FASE_8.md`.

**Acción pendiente de Rubén para cerrar formalmente la Fase 8.1:** ninguna condición técnica pendiente — solo falta firmar (responsable y fecha) en la puerta de aprobación de `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 8.1".

**Acción pendiente de Rubén para cerrar formalmente la Fase 9:** ninguna condición técnica bloqueante — solo falta firmar (responsable y fecha) en la puerta de aprobación de `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 9". Queda como riesgo residual aceptado el simulacro completo de reversión (`documentacion/PROCEDIMIENTO_REVERSION.md`, sección "Pendiente").

**Acción en curso — Fase 10:** supervisión diaria de las ejecuciones reales del pipeline v3 (día 1: todas las ejecuciones; días 2-3: dos veces al día; días 4-7: diaria).

## Reglas de seguridad esenciales

- El activador productivo de v3 **ya está activo** en `tareas@alia-data.com` desde el corte del 30/07/2026 (el activador de la versión anterior fue eliminado ese mismo día, ver `auditoria/CHANGELOG.md`).
- Nunca guardar credenciales (`OPENAI_API_KEY`) en archivos de esta carpeta.
- No modificar recursos de Google Workspace sin aprobación explícita de Rubén.
