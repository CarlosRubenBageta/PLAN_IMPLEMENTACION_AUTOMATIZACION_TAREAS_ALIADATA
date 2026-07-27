# Acta de aprobación — Fase 8

**Estado de esta acta:** Actualizada el 27/07/2026 para reflejar la ejecución real ya completada. Los 36 casos que condicionan la aprobación de esta fase (CP-01 a CP-29, CP-31 a CP-37) están **Aprobados**, con evidencia real registrada en `pruebas/resultados/RESULTADOS_FASE_8.md` y las correcciones aplicadas documentadas en `auditoria/CHANGELOG.md` y `pruebas/resultados/INCIDENCIAS_FASE_8.md`. Esta redacción reemplaza la versión anterior (20/07/2026), que declaraba la fase pendiente de ejecución real — quedó desactualizada durante todo el período de ejecución (20/07/2026 a 27/07/2026) sin que nadie la corrigiera hasta esta revisión. **Actualizada nuevamente el mismo día:** los Lotes 2/3 (DEC-009) quedaron decididos y aplicados (DEC-007 actualizada, DEC-010, DEC-011), y CP-38 y CP-39 se confirmaron Aprobados con corrida real. Sin condiciones pendientes: la puerta de aprobación pasa de "CONDICIONADA" a **APROBADA**.

## Resumen de la ejecución real (20/07/2026 a 27/07/2026)

Carlos Rubén Bageta ejecutó los 36 casos condicionantes contra un proyecto de Apps Script y una planilla de prueba aislados (ID distinto del productivo), reportando cada resultado real a esta sesión. El proceso descubrió y corrigió 12 incidencias reales (INC-FASE8-001 a INC-FASE8-012, `pruebas/resultados/INCIDENCIAS_FASE_8.md`) que la revisión de código por sí sola no había detectado — entre ellas: inyección de fórmulas en hojas técnicas (INC-FASE8-009), una brecha de recuperación tras fallas de Gmail (INC-FASE8-005), y un patrón de enmascarado de datos sensibles que no toleraba un separador Unicode real producido por Gmail (INC-FASE8-012). El detalle completo de cada caso, con `message_id`/`runId` reales, está en `pruebas/resultados/RESULTADOS_FASE_8.md`.

Ninguno de estos documentos contiene resultados fabricados: cada aprobación cita un `message_id` o `runId` real y el estado observado en las hojas técnicas o en Gmail.

## Alcance de la aprobación (DEC-004, DEC-009)

**DEC-004 (20/07/2026):** CP-30 ("Log detallado purgado") queda diferido a la Fase 10 y no bloquea la aprobación de esta fase — depende de un procedimiento de purga que recién se documenta en esa fase.

**DEC-009 (21/07/2026):** CP-31 a CP-39 se incorporaron como casos de regresión obligatorios surgidos de la auditoría del 20/07/2026. El cierre de la Fase 8 requiere CP-01 a CP-37 aprobados (**cumplido**) **más la confirmación de que los Lotes 2 y 3 de esa auditoría (hallazgos H-07, H-08, H-10, H-11, H-12) hayan sido evaluados explícitamente por Carlos Rubén Bageta — aprobados o diferidos de forma consciente, con el mismo criterio aplicado a CP-30/DEC-004.**

**Estado de esa última condición: resuelta.** Carlos Rubén Bageta decidió explícitamente aplicar los Lotes 2/3 (no diferirlos): DEC-007 pasó a "Aprobada y aplicada" (27/07/2026), y se registraron DEC-010 (H-07) y DEC-011 (H-10, H-11, H-12), todas "Aprobada y aplicada" en `auditoria/DECISIONES.md`. Con eso, la condición literal de DEC-009 (evaluación explícita de los Lotes 2/3) queda cumplida.

Restaba, además, confirmar con corrida real que el código aplicado efectivamente cierra las brechas que motivaron H-07 y H-08 — el mismo criterio de verificación que se exigió a los otros 36 casos, nunca aprobados solo por texto de log. **Ambos quedaron confirmados con corrida real el 27/07/2026:**
- **CP-38 (H-07):** recuperó un mensaje archivado (`message_id 19fa40fc2e504081`) sin depender de la búsqueda de Gmail, tal como predice el hallazgo, con `Log Mensajes`/`Indice Idempotencia`/`Registro Tareas` verificados en la planilla real.
- **CP-39 (H-08):** 7 ejecuciones reales sobre `message_id 19fa443c94a40af2` — `gestionarErrorMensaje()` cerró `ERROR_DEFINITIVO` al superar `LIMITE_REINTENTOS_GMAIL`, con las 2 tareas ya escritas conservadas, sin duplicados.

Al preparar la corrida de CP-39 se detectó y corrigió además un hallazgo adicional (**H-14**, DEC-012): con H-07 activo, un mensaje `ERROR_TEMPORAL` con manifiesto que no se archiva podía reanudarse dos veces por ejecución, duplicando `intentos_gmail`. Corregido antes de instrumentar CP-39 y confirmado en su propia corrida real. **Con esto, la condición de DEC-009 queda completamente resuelta — no queda ningún caso pendiente que condicione el cierre formal de la Fase 8.**

## Evidencia archivada — limitación reconocida

`pruebas/evidencias/` contiene únicamente capturas de la preparación del entorno, CP-01 y CP-27. La mayoría de los casos (CP-02 a CP-26, CP-28, CP-29, CP-31 a CP-37) se verificaron mediante capturas de pantalla compartidas directamente en la conversación con Claude Cowork (`Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`, Gmail) y quedaron documentados como relato con `message_id`/`runId` reales en `pruebas/resultados/RESULTADOS_FASE_8.md`, pero esas capturas no se archivaron como imagen en el repositorio. Un auditor que solo tenga el repositorio, sin el historial de la conversación, no puede reproducir la verificación visual por sí mismo para esos casos — sí puede verificar la sintaxis de todo el código y la coherencia interna de lo descripto en las hojas técnicas. Esto no demuestra que los resultados sean incorrectos, pero limita su verificabilidad independiente: los `message_id` y `runId` citados aportan trazabilidad, pero no prueban por sí solos que la ejecución ocurrió tal como se describe. Esta limitación queda reconocida aquí en vez de dejarse implícita.

## Puerta de aprobación

```text
APROBACIÓN FASE 8: APROBADA (ver "Alcance de la aprobación" arriba)
Los 36 casos que condicionan esta fase (CP-01 a CP-29, CP-31 a CP-37) están Aprobados.
Lotes 2/3 (DEC-009): decisión tomada, aplicada y confirmada con corrida real para ambos casos de regresión — CP-38 (H-07) y CP-39 (H-08) — Aprobados el 27/07/2026.
Hallazgo adicional H-14 (detectado al preparar CP-39): corregido y confirmado en la misma corrida.
CP-30 permanece diferido a la Fase 10 (DEC-004), sin condicionar esta aprobación.
Sin condiciones pendientes.
Responsable: [a completar por Carlos Rubén Bageta]
Fecha: [a completar por Carlos Rubén Bageta]
Observaciones: ver "Evidencia archivada — limitación reconocida" — limitación de trazabilidad de capturas, no bloquea esta aprobación.
```

> Con la puerta de aprobación resuelta, la Fase 9 (ventana de corte productiva) puede planificarse. Queda como paso administrativo pendiente que esta acta se firme con responsable y fecha.
