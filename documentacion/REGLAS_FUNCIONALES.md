# Reglas funcionales — Fase 2

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, secciones 4.3-4.9 y "Fase 2" (líneas 173-249, 637-791)

---

## RF-01. Cardinalidad general

```text
Un correo → 0, 1 o varias observaciones
Una observación → 0, 1 o varias tareas
Una tarea → una fila en un tablero
```

Ningún correo produce automáticamente una fila: solo la produce si al menos una observación genera al menos una tarea. Contrasta con el script actual, donde toda respuesta de la IA con forma correcta genera exactamente una fila (`script_actual.gs`, L45-89).

## RF-02. Una observación puede generar cero tareas

Ejemplo: una observación que describe contexto pero no pide ninguna acción ("el sistema estuvo lento el jueves, ya se resolvió solo") no debe forzar una tarea. La IA debe poder devolver `"tareas": []` para esa observación sin que eso invalide el resto del correo.

## RF-03. Una observación puede generar varias tareas

Ejemplo: "revisar el error de facturación y avisar al cliente cuando esté resuelto" son dos acciones distintas, potencialmente con responsables y tableros distintos (Desarrollo IT / Comercial). Ambas tareas se registran bajo la misma observación (mismo `numero` y `texto_original`), pero como entradas independientes en `tareas[]`.

## RF-04. Consolidación de observaciones equivalentes

Si dos observaciones distintas del mismo correo describen literalmente la misma acción (por ejemplo, el mismo pedido repetido en el cuerpo y en una firma citada), deben consolidarse en una sola tarea. El criterio de "misma acción" se basa en la equivalencia del `resumen` resultante, no en la redacción original de cada observación.

**No aplica** entre tareas de observaciones distintas que solo se parecen superficialmente: si hay duda razonable de que son acciones distintas (por ejemplo, distinto responsable o distinto tablero), deben permanecer separadas (RF-04b).

## RF-04b. Tareas diferentes permanecen separadas

Dos tareas con `tablero`, `grupo_origen` o `responsable_sugerido` distintos nunca se consolidan, aunque el texto del `resumen` sea parecido. La separación por hoja de destino es más importante que la brevedad del tablero.

## RF-05. Fecha límite

- Se completa **solo** si el correo la menciona explícitamente (fecha concreta o expresión inequívoca como "para el viernes 25/07"). No se infiere a partir de la prioridad ni de convenciones internas.
- Formato de intercambio: ISO 8601 `YYYY-MM-DD` (campo `fecha_limite` del esquema JSON).
- El script (Fase 4/5) valida el formato recibido, lo convierte a un objeto `Date` y lo escribe en la columna `Fecha límite` con formato visual `dd/MM/yyyy`, igual que el resto de columnas de fecha del tablero (consistente con `Utilities.formatDate(..., "dd/MM/yyyy")` ya usado en `script_actual.gs`, L63).
- Un valor no parseable como fecha ISO válida se trata como si fuera `null` y se registra el descarte en el log (no bloquea la tarea, pero sí queda auditado).

## RF-06. Revisión manual ante ambigüedad

- Si la IA no puede determinar con confianza razonable la clasificación (tablero, prioridad, responsable) o el contenido es ambiguo sobre si describe una tarea real, debe devolver `requiere_revision: true` junto con `motivo_revision` (texto explicando la ambigüedad).
- En ese caso **no se crean tareas** para ese correo (`observaciones` permanece vacío o sus tareas no se materializan), y el mensaje se etiqueta `Revisión manual/Error de procesamiento` (ver tabla de tratamiento en `MAPA_COLUMNAS.md`, sección "Tratamiento por resultado").
- La ambigüedad no incluye la simple falta de fecha límite o de responsable explícito: para esos casos existen los valores `null` y `"Sin asignar"` respectivamente, que no requieren revisión manual.

## RF-07. Correos sin tareas detectadas

- Un correo relevante (`correo_relevante: true`) puede legítimamente no generar ninguna tarea (por ejemplo, un aviso puramente informativo). Se distingue de RF-06 en que aquí no hay ambigüedad: la IA está segura de que no hay acción pendiente.
- Se registra `motivo_sin_tareas` con la explicación y el mensaje se etiqueta `Revisión manual/Sin tareas detectadas` (permite auditoría humana periódica de que el criterio es correcto, sin bloquear el flujo).

## RF-08. Correos no relevantes

- `correo_relevante: false` se reserva para contenido que no es un pedido operativo dirigido al equipo (publicidad, boletines, confirmaciones automáticas no accionables). Idealmente estos casos son interceptados por el filtro determinístico de la Fase 6 **antes** de invocar a la IA; este campo es una segunda barrera, no la primera línea de defensa (ver `MATRIZ_RIESGOS.md`, R-02).
- Mismo tratamiento operativo que RF-07 (`Revisión manual/Sin tareas detectadas`), salvo que la causa registrada distingue "no relevante" de "relevante sin tareas" para fines de auditoría y mejora del filtro.

## RF-09. Clasificación por tarea, no por correo

Cada tarea dentro de `tareas[]` tiene su propio `tablero`, `prioridad`, `grupo_origen`, `responsable_sugerido` y `fecha_limite`, independientes del resto de tareas del mismo correo. No existe una clasificación "a nivel de correo" que se herede a todas sus tareas.

## RF-10. Contenido analizado y contenido excluido

Reglas heredadas del plan v3 (sección 4.2), vigentes para el diseño de esta fase:

- Se analizan: asunto, remitente, cuerpo en texto plano normalizado y truncado a `MAX_CARACTERES_CUERPO` (propuesta 8.000 caracteres, pendiente de aprobación formal antes de Fase 3), fecha, enlace al correo.
- De las respuestas en un hilo, se analiza únicamente el **contenido nuevo** (se descarta el historial citado, encabezados de reenvío y firmas).
- No se analizan adjuntos de ningún tipo (PDF, Word, planillas, imágenes, `.eml`) en esta fase.

## RF-11. Alcance temporal

- El script procesará únicamente mensajes nuevos a partir de `FECHA_INICIO_CORTE` (parámetro que se fija en la Fase 9, ventana de corte).
- No se reprocesan automáticamente mensajes históricos ya etiquetados `Procesado` por la versión anterior.
- Mensajes anteriores a `FECHA_INICIO_CORTE` que aparezcan en la bandeja se excluyen y se registran como "excluidos por antigüedad" en el log.

## RF-12. Tratamiento por mensaje individual

Todas las reglas anteriores se aplican **por mensaje**, no por hilo (adopción de Gmail API, `auditoria/DECISIONES.md` DEC-001). Dos mensajes del mismo hilo pueden tener resultados distintos (uno genera tareas, una respuesta posterior no), y cada uno se etiqueta y archiva de forma independiente.

## RF-13. Criterio para distinguir "Soporte" de "Desarrollo IT"

Regla aprobada por Carlos Rubén Bageta el 20/07/2026, a raíz de INC-FASE8-003 (`pruebas/resultados/INCIDENCIAS_FASE_8.md`): hasta esta fecha, ningún documento del proyecto definía qué distingue estos dos tableros, y la IA clasificó un reporte de servidor caído (CP-01) como `Soporte` en lugar de `Desarrollo IT`.

- **`Soporte`:** consultas de uso, ayuda funcional, configuración, accesos y acompañamiento operativo al usuario. No hay una falla técnica real detrás del pedido.
- **`Desarrollo IT`:** bugs, servidores, infraestructura, bases de datos, APIs, integraciones, despliegues, rendimiento, seguridad y correcciones técnicas.
- Un servidor, sistema o servicio caído corresponde **siempre** a `Desarrollo IT`, **aunque lo reporte un cliente**. Quién reporta el problema no determina el tablero; lo determina la naturaleza técnica del problema.
- Si el mismo correo además pide informar o comunicarse con el cliente sobre ese incidente, esa comunicación genera una **tarea separada** en `Soporte` o `Comercial`, distinta de la tarea técnica en `Desarrollo IT` (coherente con RF-03: una observación puede generar varias tareas, cada una con su propia clasificación).

Implementada en el prompt de sistema (`codigo/prompts_ia.gs`, sección "CRITERIO PARA DISTINGUIR Soporte DE Desarrollo IT").

---

## Pendientes de confirmación humana (no bloquean la Fase 2)

Los siguientes puntos usan valores de **rol**, ya definidos y cerrados en esta fase (`Socio Administración`, `Socio Comercial`, `Responsable Soporte`, `Responsable Técnico`, `Socio Dirección`, `Sin asignar`), pero la asignación de **personas reales** a cada rol sigue pendiente:

- Mapeo rol → nombre/correo real de cada responsable (registrado como pendiente en `entregables/FASE_0/INVENTARIO_TECNICO.md`, sección "Parámetros a definir").
- Este mapeo no es necesario para completar el diseño funcional de la Fase 2 (que trabaja con roles, no con personas), pero **debe resolverse antes de la Fase 3** si el script llega a notificar o asignar tareas a una persona concreta fuera de la columna `Responsable`.

## Referencias cruzadas

- Estructura exacta del JSON: `documentacion/ESQUEMA_JSON.md`.
- Mapeo a columnas del tablero y tabla de tratamiento por resultado: `documentacion/MAPA_COLUMNAS.md`.
- Estados y etapas técnicas que instrumentan estas reglas: `documentacion/DISENO_HOJAS_TECNICAS.md`.
