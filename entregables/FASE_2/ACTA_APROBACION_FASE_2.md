# Acta de aprobación — Fase 2

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **El esquema representa múltiples observaciones.** Evidencia: `documentacion/ESQUEMA_JSON.md`, campo `observaciones` (array, 0..N).
- [x] **Cada observación admite cero, una o varias tareas.** Evidencia: `ESQUEMA_JSON.md`, campo `observaciones[].tareas` (array, 0..N); regla RF-02/RF-03 en `documentacion/REGLAS_FUNCIONALES.md`.
- [x] **Cada tarea tiene clasificación independiente.** Evidencia: `ESQUEMA_JSON.md`, sección 2 (diccionario de campos por tarea); RF-09 en `REGLAS_FUNCIONALES.md`.
- [x] **El mapeo a las 17 columnas está documentado.** Evidencia: `documentacion/MAPA_COLUMNAS.md`, sección 1 (mapeo columna por columna) y sección 2 (relación 1 observación → N tareas → N filas).
- [x] **Se definieron estados y etapas.** Evidencia: `documentacion/DISENO_HOJAS_TECNICAS.md`, secciones 4 y 5 (6 estados de mensaje, 12 etapas de pipeline).
- [x] **Se definieron reglas de revisión manual.** Evidencia: RF-06, RF-07 y RF-08 en `REGLAS_FUNCIONALES.md`; tabla de tratamiento por resultado en `MAPA_COLUMNAS.md`, sección 4.
- [x] **Las tres hojas técnicas están diseñadas, incluido el registro individual por tarea.** Evidencia: `DISENO_HOJAS_TECNICAS.md` — `Log Mensajes` (26 columnas, por mensaje), `Registro Tareas` (9 columnas, por tarea, con regla transaccional RESERVADA→ESCRITA), `Indice Idempotencia` (4 columnas, permanente).

> **Enmienda posterior (Fase 5, 20/07/2026):** `Registro Tareas` se amplió de 9 a 16 columnas para incluir el contenido completo de cada tarea (resumen, prioridad, grupo_origen, responsable_sugerido, fecha_limite, observación de origen), requisito descubierto al diseñar la recuperación sin reconsulta a la IA. Aprobada explícitamente por Carlos Rubén Bageta junto con el acta de la Fase 5 (`entregables/FASE_5/ACTA_APROBACION_FASE_5.md`). El resto de los criterios de esta acta permanece sin cambios.

## Observaciones de la revisión

1. Todo el diseño se basa en las especificaciones ya cerradas en el plan v3 (esquema JSON, valores permitidos, hojas técnicas, estados y etapas); esta fase las formaliza en documentos independientes y agrega el detalle de mapeo columna por columna que el plan no desarrollaba explícitamente.
2. Se identificó un pendiente que **no bloquea** esta fase: el mapeo de cada rol de `responsable_sugerido` a una persona real (nombre/correo) sigue sin definirse, tal como ya estaba registrado en `entregables/FASE_0/INVENTARIO_TECNICO.md`. Debe resolverse antes de que el script llegue a notificar o asignar tareas a una persona concreta (no antes de la Fase 3, que trabaja con roles).
3. Se identificó un pendiente técnico para la Fase 3: el `Link al correo` (columna 13) se genera hoy con `hilo.getPermalink()` (nivel hilo); al migrar a Gmail API por mensaje individual (DEC-001) debe resolverse cómo obtener o construir un enlace a nivel de mensaje. Documentado en `MAPA_COLUMNAS.md`, fila 13.
4. No se accedió a Google Workspace ni se modificó ninguna hoja productiva durante esta fase; el diseño de las hojas técnicas es exclusivamente documental.
5. Aprobado por Carlos Rubén Bageta mediante instrucción explícita en sesión de Claude Cowork (20/07/2026), sin observaciones adicionales sobre el contenido técnico.

## Puerta de aprobación

```text
APROBACIÓN FASE 2: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión ("aprueba la fase 2 por mi"), sin correcciones sobre el esquema JSON, las reglas funcionales, el diseño de hojas técnicas ni el mapa de columnas.
```

> Fase 3 habilitada.
