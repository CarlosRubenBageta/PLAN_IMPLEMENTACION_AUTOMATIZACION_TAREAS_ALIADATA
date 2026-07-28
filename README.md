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
| 9 a 10 | Pendientes |

**Para retomar el proyecto en una sesión nueva:** indicar a Cowork que lea este README y `entregables/FASE_8/ACTA_APROBACION_FASE_8.md`.

**Acción pendiente de Rubén para cerrar formalmente la Fase 8:** ninguna condición técnica pendiente — solo falta firmar el acta (responsable y fecha) en `entregables/FASE_8/ACTA_APROBACION_FASE_8.md`.

**Acción pendiente de Rubén para cerrar formalmente la Fase 8.1:** ninguna condición técnica pendiente — solo falta firmar (responsable y fecha) en la puerta de aprobación de `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 8.1".

**Acción pendiente para planificar la Fase 9:** con las Fases 8 y 8.1 aprobadas, puede planificarse la ventana de corte de la Fase 9 (que incorpora también la ejecución productiva del histórico, con dos aprobaciones separadas — ver "Fase 9" en el plan v3).

## Reglas de seguridad esenciales

- El activador productivo **permanece activo** hasta la ventana de corte (Fase 9).
- Nunca guardar credenciales (`OPENAI_API_KEY`) en archivos de esta carpeta.
- No modificar recursos de Google Workspace sin aprobación explícita de Rubén.
