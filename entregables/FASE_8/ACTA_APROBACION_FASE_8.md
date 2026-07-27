# Acta de aprobación — Fase 8

**Estado de esta acta:** Actualizada el 27/07/2026 para reflejar la ejecución real ya completada. Los 36 casos que condicionan la aprobación de esta fase (CP-01 a CP-29, CP-31 a CP-37) están **Aprobados**, con evidencia real registrada en `pruebas/resultados/RESULTADOS_FASE_8.md` y las correcciones aplicadas documentadas en `auditoria/CHANGELOG.md` y `pruebas/resultados/INCIDENCIAS_FASE_8.md`. Esta redacción reemplaza la versión anterior (20/07/2026), que declaraba la fase pendiente de ejecución real — quedó desactualizada durante todo el período de ejecución (20/07/2026 a 27/07/2026) sin que nadie la corrigiera hasta esta revisión.

## Resumen de la ejecución real (20/07/2026 a 27/07/2026)

Carlos Rubén Bageta ejecutó los 36 casos condicionantes contra un proyecto de Apps Script y una planilla de prueba aislados (ID distinto del productivo), reportando cada resultado real a esta sesión. El proceso descubrió y corrigió 12 incidencias reales (INC-FASE8-001 a INC-FASE8-012, `pruebas/resultados/INCIDENCIAS_FASE_8.md`) que la revisión de código por sí sola no había detectado — entre ellas: inyección de fórmulas en hojas técnicas (INC-FASE8-009), una brecha de recuperación tras fallas de Gmail (INC-FASE8-005), y un patrón de enmascarado de datos sensibles que no toleraba un separador Unicode real producido por Gmail (INC-FASE8-012). El detalle completo de cada caso, con `message_id`/`runId` reales, está en `pruebas/resultados/RESULTADOS_FASE_8.md`.

Ninguno de estos documentos contiene resultados fabricados: cada aprobación cita un `message_id` o `runId` real y el estado observado en las hojas técnicas o en Gmail.

## Alcance de la aprobación (DEC-004, DEC-009)

**DEC-004 (20/07/2026):** CP-30 ("Log detallado purgado") queda diferido a la Fase 10 y no bloquea la aprobación de esta fase — depende de un procedimiento de purga que recién se documenta en esa fase.

**DEC-009 (21/07/2026):** CP-31 a CP-39 se incorporaron como casos de regresión obligatorios surgidos de la auditoría del 20/07/2026. El cierre de la Fase 8 requiere CP-01 a CP-37 aprobados (**cumplido**) **más la confirmación de que los Lotes 2 y 3 de esa auditoría (hallazgos H-07, H-08, H-10, H-11, H-12) hayan sido evaluados explícitamente por Carlos Rubén Bageta — aprobados o diferidos de forma consciente, con el mismo criterio aplicado a CP-30/DEC-004.**

**Estado de esa última condición: pendiente.** DEC-007 (Lote 2, H-07) figura todavía como "Propuesta — pendiente de aprobación (no aplicada en código)" en `auditoria/DECISIONES.md`; no hay una decisión registrada sobre el Lote 3. CP-38 y CP-39 permanecen Bloqueados en consecuencia. A diferencia de CP-30, su disposición (aplicar los Lotes 2/3 o diferirlos formalmente) todavía no fue decidida — por eso la puerta de aprobación de esta acta no se marca `APROBADA` sin calificación hasta que eso se resuelva.

## Evidencia archivada — limitación reconocida

`pruebas/evidencias/` contiene únicamente capturas de la preparación del entorno, CP-01 y CP-27. La mayoría de los casos (CP-02 a CP-26, CP-28, CP-29, CP-31 a CP-37) se verificaron mediante capturas de pantalla compartidas directamente en la conversación con Claude Cowork (`Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`, Gmail) y quedaron documentados como relato con `message_id`/`runId` reales en `pruebas/resultados/RESULTADOS_FASE_8.md`, pero esas capturas no se archivaron como imagen en el repositorio. Un auditor que solo tenga el repositorio, sin el historial de la conversación, no puede reproducir la verificación visual por sí mismo para esos casos — sí puede verificar la sintaxis de todo el código y la coherencia interna de lo descripto en las hojas técnicas. Esto no demuestra que los resultados sean incorrectos, pero limita su verificabilidad independiente: los `message_id` y `runId` citados aportan trazabilidad, pero no prueban por sí solos que la ejecución ocurrió tal como se describe. Esta limitación queda reconocida aquí en vez de dejarse implícita.

## Puerta de aprobación

```text
APROBACIÓN FASE 8: TÉCNICAMENTE COMPLETA — CONDICIONADA (ver "Alcance de la aprobación" arriba)
Los 36 casos que condicionan esta fase (CP-01 a CP-29, CP-31 a CP-37) están Aprobados.
Condición pendiente de DEC-009: resolución explícita de los Lotes 2/3 (H-07, H-08, H-10, H-11, H-12).
Responsable:
Fecha:
Observaciones:
```

> La Fase 9 puede empezar a planificarse, pero no debería iniciar la ventana de corte productiva hasta que: (a) los Lotes 2/3 queden explícitamente aprobados o diferidos por Carlos Rubén Bageta (DEC-009), y (b) esta acta se firme con responsable y fecha una vez resuelto (a).
