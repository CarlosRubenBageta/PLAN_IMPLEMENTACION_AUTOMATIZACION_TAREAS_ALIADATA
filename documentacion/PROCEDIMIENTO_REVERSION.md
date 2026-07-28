# Procedimiento de reversión — Fase 9

**Redactado:** 28/07/2026, durante la planificación de la Fase 9.
**Revisado:** 28/07/2026, tras auditoría externa (`auditoria/AUDITORIA_PROCEDIMIENTOS_DESPLIEGUE_REVERSION_FASE_9.md`) — dos errores reales de secuencia corregidos (BLQ-02, BLQ-03), ver notas "(auditoría)".
**Estado:** ninguno de los tres escenarios fue ensayado sobre recursos reales todavía (ver "Pendiente" al final) — este documento sigue siendo preparación, no un procedimiento probado.

Complementa el protocolo genérico de `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "8. Protocolo de reversión" — acá se detalla **qué hacer según en qué punto exacto de `documentacion/PROCEDIMIENTO_DESPLIEGUE.md` ocurrió el problema**, porque la reversión correcta no es la misma antes y después de la Aprobación B.

**Regla general, corregida respecto a la versión anterior de este documento:** un activador de Apps Script no contiene una copia del código — ejecuta la función vigente en el proyecto en ese momento, bajo la cuenta que lo creó (`tareas@alia-data.com` para el activador productivo). Esto significa dos cosas que valen para los tres escenarios:
1. **Nunca "reactivar el activador antiguo" como forma de volver a la versión anterior después de que el código ya fue reemplazado (paso B.1 de `PROCEDIMIENTO_DESPLIEGUE.md`).** Si el código ya es v3, cualquier activador que apunte a `procesarCorreosDeTareas` ejecuta v3, sin importar hace cuánto se creó ese activador o con qué nombre se lo recuerde. Restaurar el código siempre va **antes** que tocar el activador.
2. Ningún paso de abajo pierde tareas ya escritas. Como mucho, se dejan de escribir filas nuevas hasta resolver el problema.

---

## Escenario 1 — Falla durante la Aprobación A (lote histórico), antes de tocar código

**Cuándo aplica:** algo sale mal entre los pasos A.1 y A.11 de `PROCEDIMIENTO_DESPLIEGUE.md` — la conciliación no cierra, aparece una fila con `accion` distinta de `CONSERVAR`, o el saneamiento (A.4) encuentra un problema.

1. **No avanzar a la Aprobación A.**
2. Eliminar las hojas creadas hasta el momento que resulten problemáticas: `Resumen Actividades`, `Registro Migración Histórica`, y las hojas técnicas si están vacías. Las cinco hojas de negocio solo pudieron haber cambiado por el saneamiento de A.4 — si el problema es posterior a ese paso, restaurarlas desde el respaldo fresco de A.1, no intentar deshacer manualmente.
3. **El código del proyecto real todavía es la versión vieja en este escenario** (B.1 no ocurrió) — no hace falta restaurar nada de código. Si el activador antiguo se desactivó (A.3) y va a pasar más de un ciclo (10 minutos) antes de resolver el problema, recrearlo tal cual estaba (mismo dueño `tareas@alia-data.com`, misma función, misma frecuencia) para no dejar de procesar correos entrantes.
4. Documentar la causa en `auditoria/CHANGELOG.md` antes de reintentar la ventana de corte en otro momento.

## Escenario 2 — Falla durante el despliegue del pipeline, antes de la Aprobación B

**Cuándo aplica:** la Aprobación A ya se firmó y el código v3 ya se copió (paso B.1 de `PROCEDIMIENTO_DESPLIEGUE.md`), pero algo falla entre B.2 y B.11 — por ejemplo, `validarConfiguracion()` no pasa, o los correos controlados (B.9-B.10) no se procesan correctamente.

**Corrección (auditoría, BLQ-02 y BLQ-03) respecto a la versión anterior de este documento:** acá ya no alcanza con "reactivar el activador antiguo" — el código ya es v3. Y si B.8-B.10 ya llegaron a ejecutarse (aunque sea con fallas), pueden existir mensajes que v3 ya procesó parcialmente (tareas escritas, pero todavía en `INBOX` porque no llegó a etiquetar/archivar) — si se reactivara el flujo viejo sin revisar esto, el script antiguo (que no conoce `Indice Idempotencia`, solo mira la etiqueta `Procesado`) podría volver a tomar esos mismos mensajes y crear tareas duplicadas con un ID nuevo.

1. **No avanzar a la Aprobación B.**
2. Si hay una ejecución de v3 en curso, esperar a que termine o forzar su corte (no hay activador nuevo todavía en este escenario — B.13 es posterior — así que solo importa si se estuvo probando manualmente).
3. **Cuarentena antes que nada:** revisar `Log Mensajes` y `Registro Tareas` en busca de mensajes que hayan llegado a `MANIFIESTO_PERSISTIDO` o una etapa posterior pero no estén `FINALIZADO`/etiquetados. Para cada uno: quitarle `INBOX` y aplicar una etiqueta de cuarentena, para que ni el script viejo (si se reactivara) ni un reintento de v3 lo vuelvan a tomar por accidente.
4. Recién con la cuarentena hecha, decidir: si la corrección es rápida (minutos), corregir y reintentar desde el paso B que falló. Si va a tardar más y hace falta volver a procesar correos mientras tanto:
   a. Restaurar el código de la versión vieja (`codigo/script_actual.gs`) sobre el proyecto real — **antes** de crear cualquier activador.
   b. Recién entonces recrear el activador de la versión vieja, como `tareas@alia-data.com`.
5. El lote histórico (`Resumen Actividades`, `Registro Migración Histórica`) **no se revierte** solo porque el despliegue del pipeline tuvo un problema — son artefactos de solo lectura, independientes, ya aprobados en la Aprobación A.
6. Si el problema no se puede resolver en la misma sesión: documentar exactamente qué pasos de B.1-B.11 están hechos, dejar constancia de la cuarentena activa, y retomar en otra ventana.

## Escenario 3 — Falla crítica después de la Aprobación B (ya en producción)

**Cuándo aplica:** el pipeline nuevo ya está activo (activador creado en B.13) y procesando correos reales.

**Se considera falla crítica (plan v3, sección 8):** duplicación masiva, escritura en hojas incorrectas, eliminación o pérdida de mensajes, exposición de credenciales, clasificación masivamente errónea, o bloqueo continuo.

Secuencia (corregida contra BLQ-02/BLQ-03 — cuarentena y restauración de código **antes** de tocar el activador):

1. **Desactivar (eliminar) el activador v3.** Apps Script (proyecto real) → Activadores.
2. Confirmar que no queda ninguna ejecución en curso.
3. **Registrar la incidencia** en `auditoria/CHANGELOG.md`, con severidad y alcance estimado.
4. **Copiar el log y las filas afectadas** antes de tocar nada más — `Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`, y las filas de negocio involucradas, a una hoja o archivo aparte (evidencia, no se toca el original).
5. **Identificar y poner en cuarentena mensajes parciales:** cualquier mensaje que v3 haya procesado (tareas ya escritas) pero que todavía siga alcanzable por la búsqueda del script viejo (`label:inbox -label:Procesado`) — quitarle `INBOX` y etiquetarlo aparte, para que el script viejo no lo vuelva a tomar al reactivarse.
6. **Restaurar el snapshot completo de la versión anterior:** los 9 archivos de `codigo/*.gs` (v3) se reemplazan por `codigo/script_actual.gs` (o el snapshot de proyecto completo del paso A.1 de `PROCEDIMIENTO_DESPLIEGUE.md`, que incluye también `appsscript.json` y servicios avanzados). Confirmar que no quedan los 8 módulos adicionales de v3 (`esquema_json.gs`, `recuperacion.gs`, etc.) sueltos en el proyecto — dejarlos podría mantener funciones o variables v3 en el espacio global, interfiriendo con la versión restaurada (auditoría, ALT-02).
7. **Verificar las propiedades del script** — la versión vieja no usa las mismas propiedades que v3 (no tiene `MODO_PRUEBA`, `LIMITE_REINTENTOS_GMAIL`, etc.); confirmar que no queda ninguna dependencia rota. No es necesario borrar las propiedades v3 (son inertes para el script viejo), pero si se rota `OPENAI_API_KEY` (punto 9 abajo) hay que actualizarla donde el script viejo la lea.
8. **Ejecutar una prueba manual de la versión restaurada — con la misma advertencia que B.8 de `PROCEDIMIENTO_DESPLIEGUE.md`:** `script_actual.gs` no tiene modo `DRY_RUN` (auditoría, ALT-14). Ejecutarlo manualmente procesa hasta los hilos reales que encuentre, escribe, etiqueta y archiva — no es una prueba inocua, es ya parte de la recuperación productiva. Por eso el paso 5 (cuarentena) tiene que estar hecho antes de llegar acá.
9. **Si la causa involucró exposición de credenciales:** rotar `OPENAI_API_KEY` de inmediato y revisar si hace falta revocar/reautorizar el acceso OAuth del proyecto.
10. **Recrear el activador con `tareas@alia-data.com` como creador**, mismo patrón que tenía (cada 10 minutos, `procesarCorreosDeTareas`). Verificar dueño, función y frecuencia inmediatamente.
11. **Mover los mensajes en cuarentena a revisión manual** — no se reprocesan automáticamente; se resuelven a mano, uno por uno.
12. **Si la falla fue clasificación masivamente errónea o filas alteradas:** reparar de forma auditable (nueva fila o corrección registrada), nunca por borrado silencioso de lo que ya existía.
13. **Documentar la causa completa** antes de planificar un nuevo intento de despliegue.
14. **No reintentar el despliegue** hasta corregir el problema de raíz y volver a pasar por `PROCEDIMIENTO_DESPLIEGUE.md` desde el principio — una falla crítica en producción invalida la confianza en todo lo desplegado en esa ventana, no solo en el paso puntual que falló.

**Sobre `Resumen Actividades` y `Registro Migración Histórica` en este escenario:** si la falla crítica no los afectó directamente (son de solo lectura; la mayoría de las fallas críticas listadas son del pipeline de escritura), no hace falta revertirlos. Si sí los afectó, tratarlos con el mismo procedimiento ya probado en la Fase 8.1: eliminar y reconstruir con la fórmula documentada — no hay pérdida de información real porque nunca fueron la fuente de verdad de nada.

---

## Pendiente

- [ ] **Ningún escenario fue ensayado sobre recursos reales** (auditoría, BLQ-07) — a diferencia de la reversión de la Fase 8.1 (probada de punta a punta en la copia aislada). Antes de fijar `FECHA_INICIO_CORTE`, ensayar al menos el Escenario 3 sobre una copia controlada del proyecto Apps Script real y una copia de la planilla: reemplazo v3 → versión anterior, verificación de que no quedan módulos v3 residuales, recreación del activador con la cuenta correcta, una cuarentena simulada de un mensaje parcial, y confirmación de que no se duplica una tarea. Medir cuánto tiempo toma de punta a punta.
- [ ] El resultado del simulacro debe anexarse a `auditoria/ACTA_DESPLIEGUE.md` (todavía no existe, ver `PROCEDIMIENTO_DESPLIEGUE.md`).
