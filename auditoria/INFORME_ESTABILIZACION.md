# Informe de estabilización — Fase 10

**Período cubierto:** 30/07/2026 (corte productivo, Fase 9) a completar — ventana de 7 días según `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 10".
**Redactado:** 04/08/2026 — **borrador, día 6 de 7.** Falta el día 7 (05/08/2026) y algunas confirmaciones puntuales con conteo real antes de darlo por completo — ver sección 7.
**Elaborado por:** Claude Cowork, con datos reales aportados por Carlos Rubén Bageta a lo largo de la semana.

---

## 1. Resumen ejecutivo

El pipeline v3 corre en producción desde el 30/07/2026 (Fase 9). Durante esta primera semana:

- **Funcionó de forma continua**, sin ningún corte real confirmado — incluye correo real procesado el mismo día de hoy (04/08).
- **Dos anomalías reales aparecieron y se resolvieron**, ninguna con impacto en datos de negocio: una ejecución real pero anormalmente lenta el día 1 (763 s, terminó bien sola) y un registro fantasma en el panel de Ejecuciones de Google (más de 4 días mostrando "En ejecución" sin estar corriendo de verdad — confirmado sin impacto, ver sección 5).
- **Las 8 alertas automáticas de la Fase 10 quedaron activas en producción** el 30/07 (DEC-017 cerrada) — antes solo estaba cubierto 1 de los 8 eventos.
- **Hubo un bache real en la cadencia de revisión activa diaria**, del 31/07 al 03/08, porque Carlos Rubén Bageta se enfermó. El sistema siguió funcionando solo durante ese período — confirmado retroactivamente el 04/08 con datos reales de `Log Mensajes`, no asumido.
- **Un hallazgo de contaminación de datos de prueba** (correos sintéticos de la ronda de pruebas de alertas terminaron procesados también por el pipeline productivo real) se encontró y corrigió el 04/08 — ver sección 5.

---

## 2. Indicadores diarios (plan v3, sección "Fase 10")

Basado en las filas reales de `Log Mensajes` revisadas hasta el 04/08/2026 (32 filas visibles, `message_id` 2 a 33). **Los números de esta tabla son un conteo a simple vista sobre lo ya visto en esta semana de trabajo, no una fórmula `COUNTIF` corrida sobre la hoja completa — antes de cerrar el informe, conviene confirmarlos con una fórmula real** (ver sección 7).

| Indicador | Observado |
|---|---|
| Mensajes procesados (`PROCESADO`) | ~24 |
| Mensajes a revisión manual (`REVISION_MANUAL`) | 4 |
| Mensajes sin tareas (`SIN_TAREAS`) | 2 (más 2 de correos de prueba, ver sección 5) |
| Errores (`ERROR_TEMPORAL`/`ERROR_DEFINITIVO`) | 0 visibles en las filas revisadas |
| Duplicados detectados | Sin evidencia de duplicados — pendiente confirmar revisando `Indice Idempotencia` por claves repetidas |
| Ejecuciones terminadas inesperadamente | 1 registro fantaso en el panel de Ejecuciones (31/07, sin impacto real — sección 5); ninguna con estado `Falló` real confirmado |
| Duración de ejecución | La gran mayoría, 3 a 16 s; una anomalía real de 763 s (día 1, resuelta sola) |
| Consumo de OpenAI | Modelo `gpt-4o-mini` en todas las filas reales; costo por corrida individual entre ~USD 0,0004 y USD 0,0016 según las filas ya vistas — **falta sumar el total real de la semana** |
| Consumo de cuota de Gmail API | No cuantificado todavía — columna `unidades_gmail_api` de `Log Mensajes`, pendiente de sumar |

**Por día:**
- **30/07:** día del corte. 2 mensajes reales (`[PRUEBA-DESPLIEGUE-FASE9]` controlado, `Reinicio de operaciones`) + 2 de prueba de alertas que se colaron (ver sección 5).
- **31/07:** 2 mensajes, ambos `REVISION_MANUAL` (Daniel Sevilla).
- **01/08:** el día de mayor volumen visto — más de 20 mensajes reales, mezcla de `PROCESADO` y `REVISION_MANUAL`, varias hojas de negocio.
- **02/08 y 03/08:** sin filas nuevas vistas en lo revisado hasta ahora — **pendiente confirmar si realmente no hubo correo esos días, o si falta revisar esas filas específicas.**
- **04/08:** 1 mensaje real, 14 tareas de una sola vez (Daniel Sevilla), `PROCESADO`.

---

## 3. Alertas automáticas — estado

**Las 8 quedan activas en producción**, confirmado con corrida real (ver `auditoria/CHANGELOG.md`, entradas del 30/07/2026):

1. Runtime terminado inesperadamente — activo desde la Fase 9 (28/07), notificación nativa reenviada por filtro.
2. a 8. Error crítico, tres fallos consecutivos, aumento anormal de revisión manual, clave API ausente, falta de permisos, fallo de escritura, hoja inexistente — `codigo/alertas.gs`, los 7 casos de prueba (`pruebas/CASOS_DE_PRUEBA_ALERTAS_FASE10.md`) Aprobados con corrida real, desplegado al proyecto real y verificado con un envío real (correo recibido en `carlosrubenbageta@alia-data.com`).

Ninguna alerta real (no de prueba) se disparó durante la semana — consistente con que no hubo errores reales detectados en `Log Mensajes`.

---

## 4. Revisión recomendada — cumplimiento real vs. lo planeado

| Día | Cadencia planeada | Cumplida |
|---|---|---|
| 1 (30/07) | Todas las ejecuciones | Sí — revisión activa completa, con hallazgo y resolución de la anomalía de 763 s |
| 2-3 (31/07, 01/08) | Dos veces al día | No — Carlos Rubén Bageta se enfermó |
| 4-6 (02, 03, 04/08) | Diaria | No hasta el 04/08 — retomada ese día con revisión retroactiva de todo el bache |
| 7 (05/08, a confirmar) | Diaria | Pendiente |

**La cadencia activa no se cumplió como estaba planeada del 31/07 al 03/08 por una razón real y ajena al sistema (enfermedad).** Esto no equivale a que el sistema haya quedado sin supervisión real: al retomar el 04/08, se revisó con datos reales (no se asumió que todo estuvo bien) todo el período — `Log Ejecuciones` y `Log Mensajes` reales de esos días, más la bandeja de alertas — antes de escribir este informe. No se encontró ningún problema real sin resolver de ese período, más allá de los dos hallazgos de la sección 5, ambos ya corregidos.

---

## 5. Hallazgos reales durante la ventana

Detalle completo de cada uno en `auditoria/CHANGELOG.md` — acá solo el resumen:

1. **[30/07] Ejecución lenta pero real** (`18:21:48`, 763,434 s) — al principio parecía trabada; terminó sola, `Completada`. Outlier aislado entre 14 ejecuciones revisadas ese rango horario, sin repetirse. Sin causa raíz al 100 %, sin indicio de que sea un patrón.
2. **[31/07, detectado el 04/08] Registro fantasma en Ejecuciones** — una ejecución mostraba "En ejecución" con más de 4 días de duración, imposible dado el límite de tiempo de la plataforma. Confirmado sin impacto real cruzando contra `Log Mensajes` (procesamiento real continuo todos los días del bache). Resuelto cosméticamente (`Finalizar` → `Cancelada`).
3. **[30/07, detectado el 04/08] Contaminación de datos de prueba** — dos correos sintéticos de la ronda de pruebas de `alertas.gs` (enviados a `tareas@alia-data.com` para el proyecto de prueba) fueron también procesados por el pipeline productivo real, porque la búsqueda de producción no filtra por etiqueta. Uno sin impacto (`SIN_TAREAS`); el otro escribió una tarea falsa en `Desarrollo IT` (fila 10), ya movida a `Registros descartados` (`discard_batch_id=DESCARTE-20260804-01`).

Ninguno de los tres comprometió datos de negocio reales ni dejó al sistema sin procesar correo real.

---

## 6. Criterios de aceptación (plan v3)

| Criterio | Estado |
|---|---|
| No se registran duplicados | Sin evidencia de duplicados en lo revisado — **falta confirmación explícita contra `Indice Idempotencia`** |
| No se procesan correos automáticos como tareas | Sin casos vistos en la semana — el saneamiento previo al corte (Fase 9, A.4) ya había limpiado el historial |
| Los mensajes con error llegan a revisión manual | Sí, confirmado (4 filas `REVISION_MANUAL` reales en la semana) |
| Las tareas se distribuyen correctamente | Sí, confirmado — tareas reales en múltiples hojas de negocio (Desarrollo IT, y otras según lo revisado) |
| Las alertas llegan a la cuenta técnica externa | **Cumplido** (sección 3) |
| El volumen de revisión manual es razonable | Parece razonable (4 de ~28 mensajes reales, sin alerta de aumento anormal disparada) — sin un umbral numérico formalmente definido para comparar |
| El sistema permanece estable durante siete días | En curso — día 6 de 7 al redactar esto; sin cortes reales confirmados hasta ahora |

---

## 7. Pendiente antes de dar este informe por completo

- [ ] Confirmar el día 7 (05/08/2026) sin novedades.
- [ ] Reemplazar los conteos "a simple vista" de la sección 2 por una fórmula real (`COUNTIF`/`COUNTIFS`) sobre `Log Mensajes` completo, por si hay filas anteriores a la `message_id` 2 revisada acá o algo fuera del rango visto.
- [ ] Confirmar explícitamente en `Indice Idempotencia` que no hay ninguna clave `message_id`+`task_id` duplicada.
- [ ] Confirmar qué pasó (o no) los días 02/08 y 03/08 — sin filas nuevas vistas, aclarar si realmente no hubo correo esos días.
- [ ] Sumar el consumo real de OpenAI (`costo_estimado`) y de cuota de Gmail (`unidades_gmail_api`) de toda la semana.
- [ ] Con todo lo anterior confirmado, firmar la puerta de aprobación de la Fase 10 en el plan v3.
