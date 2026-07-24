# Diagnóstico de errores y puntos de falla — Fase 1

**Fecha de análisis:** 20/07/2026
**Analizado por:** Claude Cowork (revisión documental de `codigo/script_actual.gs`)
**Método:** lectura estática completa del script (145 líneas) + evidencia registrada en el acta de Fase 0 y en el plan v3 (sección 3.2). No se ejecutó ni modificó código productivo.

---

## D-01. Puntos sin `try/catch`

| # | Línea(s) | Código expuesto | Consecuencia si falla |
|---|---|---|---|
| D-01.1 | L31-32 | `hilo.getMessages()` y acceso a `mensajes[mensajes.length - 1]` | Si el hilo no tiene mensajes accesibles, excepción no controlada interrumpe **todo el bucle** (afecta a los hilos restantes de la tanda) |
| D-01.2 | L35-39 | `ultimoMensaje.getFrom/getSubject/getPlainBody/getDate()` | Igual que arriba: una excepción aquí detiene el procesamiento de los hilos siguientes en la misma ejecución |
| D-01.3 | L48 | `sheetMaestro.getSheetByName(nombreTablero)` | No lanza excepción (devuelve `null`), pero el `null` se resuelve silenciosamente en L52-53 sin registro |
| D-01.4 | L82 | `hojaDestino.appendRow(nuevaFila)` | Sin `try/catch`: si falla la escritura (p. ej. hoja protegida, cuota excedida), la excepción interrumpe el bucle **después** de haber consumido la llamada a la IA, y el hilo **no llega a L85** por lo que tampoco se etiqueta ni se archiva → en la próxima ejecución se reprocesa desde cero (ver D-05 Duplicación) |
| D-01.5 | L85-86 | `hilo.addLabel(...)`, `hilo.moveToArchive()` | Sin `try/catch`: si la fila ya se escribió (L82) pero el etiquetado falla, el correo queda **duplicado en la próxima corrida** (la fila ya existe, pero el hilo sigue sin la etiqueta `Procesado`) |
| D-01.6 | L135 | `JSON.parse(json.choices[0].message.content)` | Este `JSON.parse` está dentro del `try` de L130-144, pero si el modelo devuelve JSON válido con estructura inesperada (campos faltantes), no hay validación de esquema: los `undefined` resultantes se escriben directamente en la fila (p. ej. L65, L69, L72) |

**Conclusión:** el único bloque `try/catch` sólido cubre la llamada HTTP a OpenAI (L130-144) y el manejo de la etiqueta al inicio (L10-15). El resto del flujo por hilo (L29-90) no tiene aislamiento de errores: una excepción en cualquier punto interrumpe el `for` y deja indeterminados los hilos restantes de esa tanda.

---

## D-02. Operaciones no idempotentes

| # | Operación | Línea | Por qué no es idempotente |
|---|---|---|---|
| D-02.1 | Generación de ID | L59 | `Math.random()` no depende del contenido del mensaje: reprocesar el mismo correo genera un ID distinto y una fila distinta, no una actualización |
| D-02.2 | `appendRow()` | L82 | Agrega siempre una fila nueva; no hay verificación previa de "¿esta tarea ya existe?" |
| D-02.3 | Selección del criterio de "ya procesado" | L19 | Se basa en la etiqueta del **hilo**, no en el ID del **mensaje**; no hay clave estable de idempotencia por mensaje individual |

Ningún punto del script consulta un registro propio antes de escribir. La única barrera contra el reproceso es la etiqueta de Gmail (ver D-06), que es insuficiente por operar a nivel de hilo.

---

## D-03. Riesgos de concurrencia

- No existe `LockService.getScriptLock()` ni equivalente en ninguna parte del script.
- El activador corre cada 10 minutos (registrado en `entregables/FASE_0/REGISTRO_ACTIVADOR.md`); si una ejecución se retrasa (por ejemplo, por latencia de OpenAI) y se solapa con la siguiente, ambas pueden:
  - buscar los mismos hilos sin etiqueta (L19) antes de que la primera alcance a etiquetarlos (L85);
  - generar dos filas para el mismo correo (duplicación, ver D-05);
  - competir por `appendRow()` sobre la misma hoja.
- El error observado `The JavaScript runtime exited unexpectedly` (ver D-07) es un agravante: una ejecución que muere a mitad de camino dejó hilos sin etiquetar que la ejecución siguiente vuelve a tomar, aumentando la ventana de solape.

---

## D-04. Riesgos de duplicación

Encadenando D-01, D-02 y D-03, se identifican tres rutas concretas de duplicación:

1. **Falla tras escribir, antes de etiquetar** (D-01.4/D-01.5): la fila queda creada pero el hilo sigue elegible para la próxima búsqueda → se vuelve a crear otra fila para el mismo correo.
2. **Ejecuciones solapadas** (D-03): dos ejecuciones concurrentes procesan el mismo hilo antes de que cualquiera lo etiquete.
3. **Caída del runtime a mitad de tanda** (D-07): los hilos ya escritos pero no etiquetados quedan en el mismo estado que el caso 1.

No hay ningún mecanismo (ID determinístico, registro de mensajes procesados, lock) que corte estas tres rutas. Es el riesgo de mayor severidad identificado en esta fase (ver `MATRIZ_RIESGOS.md`, R-01).

---

## D-05. Uso de IDs aleatorios

- L59: `"ALI-" + Math.floor(Math.random() * 90000 + 10000)`.
- Rango de 10.000 a 99.999 (90.000 valores posibles). Sin verificación de colisión contra IDs existentes.
- No es determinístico: no permite detectar si una tarea ya fue creada para un mensaje dado, ni sirve como clave de idempotencia.

---

## D-06. Dependencia de etiquetas del hilo

- El criterio de "correo nuevo" es `label:inbox -label:Procesado` (L19), evaluado a **nivel de hilo** por la propia semántica de `GmailApp`.
- Consecuencia documentada en el plan v3 (sección 3.2, línea 128) y confirmada en la revisión de Fase 0 (acta, observación 3): una respuesta nueva en un hilo ya etiquetado como `Procesado` vuelve a la bandeja de entrada, pero el hilo conserva la etiqueta, por lo que la búsqueda de L19 lo excluye. El contenido de esa respuesta **nunca se analiza**.
- Agravante: el script solo lee el último mensaje del hilo (L32), así que incluso en un hilo que sí resulta elegible, cualquier mensaje intermedio nunca se procesa individualmente.

---

## D-07. Uso de `appendRow()`

- L82: una llamada a `appendRow()` por correo procesado, dentro del bucle `for` (hasta 10 por ejecución, L27).
- Implicaciones:
  - Costo de cuota mayor que una escritura por lotes (`setValues()` sobre un rango).
  - No hay agrupación ni transacción: si la ejecución se interrumpe entre dos llamadas a `appendRow()`, algunas filas de la tanda quedan escritas y otras no, sin registro de cuáles.

---

## D-08. Recuperación no paginada de hilos

- L19: `GmailApp.search("label:inbox -label:" + NOMBRE_ETIQUETA_PROCESADO)` no recibe parámetros de `start`/`max`; Apps Script resuelve la búsqueda completa y **recién después** el script aplica el límite de 10 en L27-29.
- Con una bandeja de entrada grande o un backlog acumulado (por ejemplo, tras una interrupción prolongada), esto implica traer a memoria todos los hilos coincidentes en cada ejecución, con impacto en tiempo y cuota antes de procesar un solo correo.

---

## D-09. Análisis de `The JavaScript runtime exited unexpectedly`

- Evidencia: el plan v3 (sección 3.2) registra ejecuciones con este error exacto; no hay capturas de pila disponibles en la interfaz de Apps Script para este tipo de fallo (limitación de la plataforma, no del script).
- Causas más probables dado el código revisado (no confirmables sin acceso a los registros de ejecución reales, pendiente de Fase 8/9):
  - Timeout o agotamiento de memoria durante el procesamiento de un cuerpo de correo muy extenso (no hay truncamiento del cuerpo en la versión actual — `getPlainBody()` en L37 se usa sin límite, a diferencia del `MAX_CARACTERES_CUERPO` ya decidido para la versión futura, plan v3 sección 4.2).
  - Una excepción no capturada dentro del `for` (D-01) que además dispare un comportamiento anómalo del runtime en vez de una excepción JS normal.
  - Combinación con D-03: una ejecución que muere a mitad de tanda es indistinguible, desde el estado de Gmail, de una ejecución exitosa parcial, lo que alimenta directamente el riesgo de duplicación (D-04).
- Impacto directo: cualquier hilo tomado en L29-30 antes del fallo, cuya fila ya se haya escrito (L82) pero cuyo etiquetado (L85) no se haya alcanzado, vuelve a aparecer como "no procesado" en la siguiente ejecución.

---

## D-10. Notificaciones automáticas procesadas como tareas

- Confirmado en el plan v3 (sección 3.2, líneas 119-120) y en la observación 3 del acta de Fase 0: se registraron como tareas correos automáticos de Google y notificaciones de fallos de Apps Script.
- Causa raíz en el código: la búsqueda de L19 no distingue el origen del mensaje (remitente automatizado vs. remitente humano); todo hilo no etiquetado en la bandeja de entrada es candidato a convertirse en fila. El filtrado depende enteramente del criterio de la IA (prompt L97-106), que no tiene ninguna regla explícita para descartar remitentes automáticos (`mailer-daemon`, `noreply`, notificaciones de Apps Script, etc.).
- Consecuencia: filas de "tarea" sin acción real asociada, que consumen espacio en los tableros y requieren limpieza manual.

---

## Resumen de severidad (para alimentar `MATRIZ_RIESGOS.md`)

| Hallazgo | Severidad | Motivo |
|---|---|---|
| D-04 Duplicación (rutas 1-3) | Crítica | Combina falta de idempotencia, ausencia de lock y falta de aislamiento de errores |
| D-09 Runtime exited unexpectedly | Alta | Causa raíz no confirmable sin logs reales; agrava directamente D-04 |
| D-06 Dependencia de etiqueta de hilo | Alta | Pérdida silenciosa de contenido (respuestas nuevas) |
| D-10 Notificaciones como tareas | Media | Degrada la calidad de los tableros, no hay pérdida de datos |
| D-01 Falta de try/catch por hilo | Alta | Amplifica el impacto de cualquier otro fallo puntual |
| D-08 Búsqueda no paginada | Media | Impacto en cuota/tiempo, no en integridad de datos |
| D-07 `appendRow()` por fila | Baja | Ineficiencia, no compromete la corrección si no hay interrupción |
| D-05 IDs aleatorios | Media | Sin colisión conocida, pero impide idempotencia y trazabilidad |

## Referencias cruzadas

- Detalle de arquitectura y numeración de líneas: `documentacion/ARQUITECTURA_ACTUAL.md`.
- Matriz de riesgos con causa/impacto/mitigación: `documentacion/MATRIZ_RIESGOS.md`.
- Decisión ya adoptada que mitiga D-06/D-08 en el rediseño: `auditoria/DECISIONES.md`, DEC-001 (Gmail API por mensaje).
