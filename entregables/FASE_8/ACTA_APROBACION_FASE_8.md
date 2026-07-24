# Acta de aprobación — Fase 8

**Estado de esta acta:** No puede completarse todavía. A diferencia de las Fases 1 a 7 (documentación y código, verificables por lectura), la Fase 8 exige **ejecutar realmente** el script contra Gmail, Sheets y OpenAI en un entorno de prueba aislado. Claude Cowork no tiene acceso a Google Workspace ni puede ejecutar Apps Script (`configuracion/MATRIZ_PERMISOS.md`: "Editar proyecto Apps Script: No (genera código local)"), por lo que **no puede generar los resultados que esta fase requiere** sin fabricarlos — y no lo hace.

## Lo que Claude Cowork preparó en esta sesión (20/07/2026)

- `pruebas/CASOS_DE_PRUEBA.md`: los 30 casos (CP-01 a CP-30) detallados con datos de entrada concretos (correos sintéticos, procedimientos de fault injection donde corresponde), configuración previa obligatoria del entorno de prueba, y advertencias de seguridad contra loguear `cfg`/`options` sin redactar.
- `pruebas/resultados/RESULTADOS_FASE_8.md`: entorno de prueba ya registrado con evidencia real (planilla de prueba creada y verificada, ID distinto del productivo); los 29 casos que condicionan la aprobación (CP-01 a CP-29) permanecen `Pendiente` de ejecución.
- `pruebas/resultados/INCIDENCIAS_FASE_8.md`: **una incidencia real registrada y resuelta** — INC-FASE8-001 (exposición de una `OPENAI_API_KEY` exclusiva del entorno de prueba en un log de instrumentación temporal, sin impacto en producción; clave revocada y reemplazada, corrección de redacción de secretos incorporada en `pruebas/debug_seguro_pruebas.gs`).

Ninguno de estos documentos contiene resultados fabricados. Los 29 casos que condicionan esta fase permanecen `Pendiente` de ejecución real (CP-30 diferido a la Fase 10 por `auditoria/DECISIONES.md`, DEC-004 — ver sección "Alcance de la aprobación" más abajo).

## Alcance de la aprobación (DEC-004)

Redacción original de esta acta detectada como inconsistente por Carlos Rubén Bageta: exigir la ejecución de los 30 casos antes de habilitar la Fase 9 era una condición imposible de cumplir, porque CP-30 ("Log detallado purgado") depende de un procedimiento de purga que recién se documenta en la Fase 10 (`MANUAL_OPERATIVO.md`) — no puede ejecutarse antes de que ese procedimiento exista.

**Corrección (DEC-004, 20/07/2026):** CP-30 queda diferido a la Fase 10 y no bloquea la aprobación de esta fase. La Fase 8 requiere la aprobación de **CP-01 a CP-29** y la ausencia de incidencias críticas abiertas en `pruebas/resultados/INCIDENCIAS_FASE_8.md`. El criterio de aceptación del plan v3 "todos los casos críticos pasan" se interpreta, en consecuencia, como CP-01 a CP-29.

## Lo que falta y quién debe hacerlo

Acción exclusiva de Rubén (o de quien tenga acceso a la cuenta operativa y al proyecto de Apps Script), según `configuracion/MATRIZ_PERMISOS.md`:

1. Copiar los archivos `codigo/*.gs` (todos los de las Fases 3 a 7: `script_refactorizado.gs`, `esquema_json.gs`, `prompts_ia.gs`, `cliente_openai.gs`, `idempotencia.gs`, `recuperacion.gs`, `filtros_correo.gs`, `escritura_sheets.gs`, `sanitizacion.gs`) a un proyecto de Apps Script de **prueba** (no el productivo).
2. Habilitar el servicio avanzado de Gmail API y autorizar los alcances OAuth necesarios (sección 7.3 del plan v3).
3. Crear una copia de la planilla productiva para pruebas, con las 5 hojas de negocio y las 3 hojas técnicas vacías.
4. Configurar las propiedades del script en modo prueba, exactamente como se detalla en `pruebas/CASOS_DE_PRUEBA.md`.
5. Ejecutar cada uno de los 30 casos, registrando el resultado real en `pruebas/resultados/RESULTADOS_FASE_8.md` y cualquier falla en `pruebas/resultados/INCIDENCIAS_FASE_8.md`.
6. Reportar la evidencia completa de vuelta a esta sesión (o a una nueva) para que Claude Cowork revise los resultados y redacte esta acta con base en evidencia real.

## Por qué esto no es una demora evitable

Los criterios de aceptación de esta fase —"todos los casos críticos pasan", "no existen duplicados", "no se generan tareas falsas", "el modo prueba impide toda escritura y archivado productivos"— son afirmaciones sobre **comportamiento real del sistema**, no sobre la existencia de código o documentación. Firmar esta acta sin ejecución real equivaldría a certificar como probado un script que nunca corrió, lo cual contradice el propósito mismo de la Fase 8 y el principio de respaldo/reversibilidad que sostiene todo el plan desde la Fase 0.

## Puerta de aprobación

```text
APROBACIÓN FASE 8: PENDIENTE (bloqueada por falta de ejecución real)
Responsable:
Fecha:
Observaciones:
```

> La Fase 9 no puede iniciarse hasta que: (a) los casos CP-01 a CP-29 se ejecuten realmente (CP-30 diferido a la Fase 10, DEC-004), (b) `pruebas/resultados/RESULTADOS_FASE_8.md` esté completo con evidencia real y sin incidencias críticas abiertas, y (c) esta acta indique APROBADA con responsable y fecha.
