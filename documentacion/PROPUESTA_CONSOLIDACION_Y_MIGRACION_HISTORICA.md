# Propuesta de consolidación de actividades e incorporación del histórico

**Proyecto:** Automatización de tareas de Aliadata  
**Fecha:** 27/07/2026  
**Estado:** Propuesta para revisión de Claude Cowork y aprobación de Carlos Rubén Bageta  
**Alcance de este documento:** análisis y diseño; no autoriza cambios en Google Workspace ni en el código productivo

---

## 1. Resumen ejecutivo

Se incorporan dos necesidades:

1. disponer de una hoja única desde la cual consultar todas las actividades de `Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT` y `Gestión General`, con su estado vigente y trazabilidad hasta la fila de origen;
2. garantizar que todas las actividades históricas no resueltas de la planilla productiva original queden incluidas en la operación posterior al despliegue de la automatización.

La recomendación es:

- crear una hoja protegida y de solo lectura llamada provisionalmente `Resumen Actividades`, alimentada en forma automática desde las cinco hojas operativas;
- mantener las cinco hojas operativas como única fuente de verdad del estado de negocio;
- comenzar con una consolidación mediante fórmulas nativas de Google Sheets, probada primero en una copia aislada;
- no usar una macro manual como mecanismo principal, porque produciría una foto potencialmente desactualizada y agregaría una operación humana evitable;
- prever un mecanismo híbrido con Apps Script únicamente si una prueba de rendimiento real demuestra que las fórmulas no cumplen los tiempos acordados;
- tratar la información histórica como una normalización y conciliación controlada, no como un reprocesamiento de correos ni como una carga en las hojas técnicas del pipeline;
- crear un registro separado, `Registro Migración Histórica`, para preservar la identidad, procedencia, decisiones y excepciones de los elementos históricos;
- no insertar registros históricos en `Log Mensajes`, `Registro Tareas` ni `Indice Idempotencia`, porque esas hojas representan mensajes y tareas generadas por el proceso de Gmail;
- incorporar una etapa específica previa al despliegue productivo —propuesta como **Fase 8.1**— para inventario, diseño, simulación y aprobación; las escrituras productivas se ejecutarían dentro de la ventana controlada de la Fase 9.

La recomendación parte de un dato importante: el plan vigente prevé desplegar la nueva automatización sobre el archivo maestro original, que ya contiene las cinco hojas de negocio. Si esto se confirma, la mayoría de las actividades históricas no necesita copiarse a otro lugar: ya está en la fuente operativa que alimentará el resumen. El trabajo necesario es inventariarla, identificar inequívocamente lo no resuelto, normalizar lo mínimo indispensable, asignar identidad estable cuando falte y demostrar mediante conciliación que ningún elemento abierto fue omitido.

---

## 2. Diagnóstico del estado actual

### 2.1 Estructura relevante

El archivo maestro productivo contiene:

- `Finanzas`;
- `Comercial`;
- `Soporte`;
- `Desarrollo IT`;
- `Gestión General`;
- `Listas`;
- `Dashboard`.

Las cinco hojas operativas comparten 17 columnas, documentadas en `documentacion/MAPA_COLUMNAS.md`:

1. ID;
2. Fecha de entrada;
3. Fuente;
4. Grupo origen;
5. Remitente;
6. Asunto original;
7. Resumen de tarea;
8. Prioridad sugerida IA;
9. Prioridad final;
10. Estado;
11. Responsable;
12. Fecha límite;
13. Link al correo;
14. Link a Drive;
15. Derivada a;
16. Última actualización;
17. Observaciones.

El estado actual de una actividad se conserva en la columna 10 de su hoja operativa. Por lo tanto, la hoja consolidada debe leer las hojas de negocio, no `Registro Tareas`: esta última refleja el manifiesto y el estado técnico de escritura (`RESERVADA`, `ESCRITA`, etc.), pero no es la fuente del estado funcional actualizado por las personas.

### 2.2 Separación necesaria entre negocio y pipeline técnico

Las hojas técnicas actuales tienen semánticas específicas:

- `Log Mensajes`: una fila por mensaje procesado por el pipeline;
- `Registro Tareas`: una fila por tarea generada desde un mensaje y su manifiesto de recuperación;
- `Indice Idempotencia`: barrera permanente contra el reprocesamiento de mensajes de Gmail.

Una actividad histórica existente antes del corte:

- puede no tener `message_id`;
- puede no haber sido creada desde Gmail;
- no tiene por qué contar con un manifiesto del nuevo pipeline;
- no debe hacer que un mensaje futuro resulte inelegible.

En consecuencia, registrar el histórico en cualquiera de esas tres hojas falsearía su semántica y podría afectar la idempotencia o la recuperación.

### 2.3 Problema funcional

Actualmente una persona debe recorrer cinco hojas para conocer el estado general. Esto genera:

- mayor tiempo de consulta;
- riesgo de omitir un área;
- dificultad para filtrar globalmente por estado, prioridad, responsable o fecha;
- ausencia de una vista única que combine el histórico con las nuevas tareas automatizadas;
- dificultad para demostrar que todos los pendientes previos al corte continúan visibles.

### 2.4 Restricciones de diseño ya vigentes

La solución debe respetar:

- las 17 columnas actuales de las hojas operativas;
- el archivo maestro productivo y su respaldo;
- `FECHA_INICIO_CORTE`, que impide reprocesar correos históricos;
- la idempotencia por `message_id` y `task_id`;
- el principio de no leer las cinco hojas para decidir si un mensaje ya fue procesado;
- la prohibición de escribir en producción durante simulaciones;
- la protección contra fórmulas inyectadas;
- la reversibilidad del despliegue;
- la aprobación humana antes de modificar el archivo productivo;
- la referencia `fila_destino` de `Registro Tareas`, que hace desaconsejable reordenar físicamente las hojas operativas.

---

## 3. Supuestos y decisiones que deben confirmarse

La propuesta usa los siguientes supuestos. Deben verificarse antes de implementar:

1. **Archivo de destino:** la nueva automatización se desplegará sobre el mismo archivo maestro productivo original, no sobre una planilla nueva.
2. **Estructura:** las cinco hojas conservan las mismas 17 columnas y el mismo orden.
3. **Fuente de verdad:** el estado de negocio seguirá editándose en las hojas operativas; `Resumen Actividades` será una vista, no una segunda base editable.
4. **Edición desde el resumen:** no se requiere inicialmente cambiar estado, responsable o prioridad directamente desde la hoja consolidada.
5. **Estados reales:** todavía debe inventariarse el conjunto exacto de valores históricos presentes en la columna `Estado`.
6. **Definición de resuelto:** Carlos Rubén Bageta debe aprobar qué valores son terminales. Hasta entonces, todo valor vacío, desconocido o no terminal se considerará candidato a “no resuelto”.
7. **Identidad histórica:** debe confirmarse si todas las filas históricas tienen ID, si esos IDs son únicos y si alguna fórmula, dashboard o integración depende de su formato.
8. **Volumen:** debe medirse la cantidad real de filas por hoja y la tasa de crecimiento esperada.
9. **Dashboard actual:** antes de crear una vista nueva se debe revisar si `Dashboard` contiene fórmulas o referencias que puedan reutilizarse o verse afectadas.
10. **Orden físico:** las hojas de negocio no se ordenarán ni compactarán como parte de esta iniciativa.
11. **Histórico descartable:** la identificación de correos automáticos que el plan prevé mover a `Registros descartados` en la Fase 9 es un proceso distinto. No debe confundirse “histórico no resuelto” con “fila automática descartable”.
12. **Responsables:** debe confirmarse si los responsables históricos son nombres de personas, roles o ambos, y cómo se homologarán con los valores del nuevo proceso.

### Preguntas de negocio obligatorias

Antes de escribir en producción deben responderse:

- ¿Cuáles son exactamente los estados terminales?
- ¿Una actividad `Cancelada`, `Descartada`, `No aplica` o equivalente debe permanecer visible en el resumen general?
- ¿El resumen debe mostrar todas las actividades o abrir por defecto una vista filtrada de no resueltas?
- ¿Quién puede modificar el catálogo de equivalencias de estados?
- ¿Se conservarán los IDs históricos actuales cuando sean válidos?
- ¿Qué hacer ante dos filas históricas aparentemente duplicadas pero con estados diferentes?
- ¿Se necesita editar desde el resumen en una etapa futura?
- ¿Cuál es el tiempo de actualización aceptable: inmediato, hasta cinco minutos o diario?
- ¿Qué volumen de filas se espera dentro de uno y tres años?
- ¿Quién aprobará el informe final de conciliación histórica?

---

## 4. Alternativas para la hoja consolidada

### 4.1 Alternativa A — Fórmulas nativas de Google Sheets

Consiste en apilar rangos de las cinco hojas mediante funciones como `VSTACK`, `HSTACK`, `FILTER`, `LET` o equivalentes, agregando columnas calculadas de procedencia.

**Ventajas**

- actualización prácticamente inmediata al cambiar una fila fuente;
- no requiere un activador nuevo;
- no necesita permisos adicionales;
- no genera una segunda copia persistida de las actividades;
- bajo riesgo de duplicación: cada fila visible proviene directamente de una fila fuente;
- reversión simple: eliminar o deshabilitar la hoja de vista no afecta los datos;
- mantiene una única fuente de verdad;
- permite filtros, vistas filtradas, segmentadores y tablas dinámicas.

**Desventajas**

- las fórmulas con columnas completas pueden degradar el rendimiento;
- la fórmula central es un punto sensible que debe protegerse;
- los enlaces dinámicos a la fila fuente necesitan conocer el `gid` de cada hoja;
- una modificación accidental de nombres o posiciones de columnas puede romper la vista;
- no es adecuada para edición bidireccional.

**Controles necesarios**

- usar rangos acotados o dinámicos, no columnas completas sin medición;
- proteger encabezados y fórmula;
- ocultar o proteger una hoja auxiliar de configuración si contiene `gid`;
- agregar validación automática de encabezados;
- medir tiempo de apertura y recálculo con el volumen real;
- documentar una fórmula de restauración.

### 4.2 Alternativa B — Macro manual

Una macro recorrería las cinco hojas y copiaría sus filas al resumen cuando una persona la ejecute.

**Ventajas**

- implementación conceptual simple;
- permite generar una foto estática;
- no recalcula continuamente.

**Desventajas**

- el resumen queda desactualizado entre ejecuciones;
- depende de una acción manual;
- puede duplicar filas si no implementa upsert;
- mezcla lógica, estado y copia física;
- necesita controles de concurrencia con el pipeline;
- una interrupción puede dejar una actualización parcial;
- ofrece peor trazabilidad que una vista directa.

**Conclusión:** no recomendada como mecanismo operativo principal. Una macro puede ser útil para exportar una foto cerrada de auditoría, pero no para mostrar el estado actual.

### 4.3 Alternativa C — Apps Script programado

Un proceso con activador reconstruye o actualiza una hoja materializada.

**Ventajas**

- control total sobre columnas, enlaces y formato;
- posibilidad de aplicar upsert por ID;
- rendimiento de lectura potencialmente mejor si la vista es grande;
- permite generar métricas o campos derivados complejos.

**Desventajas**

- introduce otro activador, cuotas y fallos operativos;
- el estado puede quedar desactualizado hasta la siguiente ejecución;
- exige `LockService`, recuperación y conciliación;
- aumenta el alcance de pruebas y mantenimiento;
- puede competir con el pipeline principal por tiempo y acceso a Sheets;
- una reconstrucción completa debe ser transaccional o usar una hoja temporal;
- no debe desplegarse como una función añadida informalmente al proceso actual.

**Conclusión:** alternativa de escalamiento, no primera elección sin evidencia de un problema de rendimiento.

### 4.4 Alternativa D — Escritura dual desde el pipeline

El pipeline escribiría simultáneamente la tarea en su tablero y en el resumen.

**Ventajas**

- la nueva tarea aparece durante la misma transacción;
- el resumen puede consultarse sin fórmulas complejas.

**Desventajas críticas**

- solo cubre tareas nuevas, no cambios manuales posteriores de estado;
- obliga a sincronizar dos copias;
- amplía el modelo transaccional e introduce nuevos puntos de interrupción;
- duplica datos;
- no resuelve por sí sola el histórico;
- puede dejar tablero y resumen divergentes;
- exigiría rehacer recuperación, idempotencia y pruebas de Fase 8.

**Conclusión:** no recomendada.

### 4.5 Alternativa E — Arquitectura híbrida

Se comienza con fórmulas. Si las métricas de rendimiento no se cumplen, se migra a una vista materializada por Apps Script con:

- reconstrucción en hoja temporal;
- sustitución controlada al finalizar;
- `LockService`;
- actualización programada;
- actualización nocturna de reconciliación completa;
- alertas por desvíos;
- conservación de las hojas de negocio como fuente de verdad.

**Conclusión:** recomendada como estrategia evolutiva, no como implementación inicial obligatoria.

### 4.6 Comparación resumida

| Alternativa | Actualización | Duplicados | Complejidad | Concurrencia | Histórico | Recomendación |
|---|---|---:|---:|---:|---:|---|
| Fórmulas | Inmediata | Muy bajo | Baja | Muy baja | Automático si ya está en las hojas | **Inicial recomendada** |
| Macro manual | Bajo demanda | Medio/alto | Media | Media | Requiere copia | No |
| Apps Script programado | Diferida | Bajo con upsert | Alta | Alta | Posible | Solo si el rendimiento lo exige |
| Escritura dual | Parcialmente inmediata | Medio | Muy alta | Muy alta | No resuelto | No |
| Híbrida | Inmediata al inicio; materializada si escala | Bajo | Gradual | Controlable | Sí | **Estrategia evolutiva** |

---

## 5. Solución recomendada para `Resumen Actividades`

### 5.1 Principios

1. Las hojas operativas siguen siendo la fuente de verdad.
2. El resumen es de solo lectura.
3. Cada fila del resumen representa exactamente una fila fuente.
4. El resumen no asigna IDs ni modifica estados.
5. Las personas acceden a la actividad mediante un enlace a su fila de origen.
6. El resumen no participa de la idempotencia del pipeline.
7. La vista no ordena ni mueve físicamente las filas de origen.

### 5.2 Columnas propuestas

La vista debe incluir las 17 columnas originales más:

| Columna adicional | Propósito |
|---|---|
| `Hoja origen` | Área donde vive la actividad |
| `Fila origen` | Número visible de fila al momento de consultar |
| `Abrir origen` | Enlace a la celda `A` de la fila fuente |
| `Origen del registro` | `Automatización v3`, `Histórico/pre-corte` o `Revisión de origen` |
| `Estado normalizado` | Categoría homologada para filtros; no reemplaza el valor fuente |
| `Alerta de datos` | Indica ID vacío/duplicado, estado desconocido, fecha inválida u otra excepción |

La primera implementación puede mostrar las 17 columnas sin cambiar sus nombres. Las columnas derivadas deben colocarse al inicio o al final y documentarse para no confundirlas con datos editables.

### 5.3 Determinación de origen

El origen no debe inferirse únicamente por la fecha. Regla recomendada:

1. si el `ID` existe como `task_id` en `Indice Idempotencia`, marcar `Automatización v3`;
2. si existe en `Registro Migración Histórica`, marcar `Histórico/pre-corte`;
3. si no coincide con ninguno, marcar `Revisión de origen`.

**Corrección (27/07/2026):** la regla 1 verificaba originalmente contra `Registro Tareas` con `estado_escritura` confirmando una escritura. Se cambia a `Indice Idempotencia` porque es la única de las tres hojas técnicas del pipeline con retención indefinida (`PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, política de retención v3) — `Registro Tareas` está sujeto a la purga de información ampliada a los 6 meses (Fase 10, CP-30, todavía sin procedimiento exacto definido). Con `Registro Tareas`, una tarea legítimamente generada por v3 podría dejar de reconocerse como tal una vez purgada. La verificación de `estado_escritura` deja de ser necesaria: toda fila que `Resumen Actividades` ya muestra existe físicamente en una hoja de negocio, y una fila solo llega ahí a través de una escritura real — por lo tanto, la sola presencia de su `ID` como `task_id` en `Indice Idempotencia` ya confirma el origen, sin distinguir por `estado_escritura`.

Esta consulta es solo de presentación. No altera ninguna hoja técnica.

### 5.4 Fórmula conceptual

La fórmula deberá:

1. leer el rango de datos de cada hoja sin el encabezado;
2. excluir filas totalmente vacías;
3. agregar nombre y fila de origen;
4. apilar los cinco conjuntos;
5. consultar catálogos auxiliares para origen y estado normalizado;
6. devolver todas las actividades, no solo las pendientes;
7. dejar los filtros de “no resueltas” como vista filtrada independiente.

La fórmula exacta debe generarse después de obtener:

- última fila máxima razonable de cada tablero;
- `gid` real de cada hoja;
- configuración regional de fórmulas;
- catálogo definitivo de estados;
- estructura y dependencias del `Dashboard` actual.

No se recomienda pegar una fórmula genérica antes de verificar esos datos.

### 5.5 Vistas funcionales sugeridas

Sobre `Resumen Actividades`:

- `Todas`;
- `No resueltas`;
- `Vencidas`;
- `Sin responsable`;
- `Bloqueadas`;
- `Por responsable`;
- `Por área`;
- `Históricas no resueltas`;
- `Revisión de datos`.

Estas deben implementarse como vistas filtradas, tablas dinámicas o secciones del `Dashboard`, no como copias adicionales de datos.

### 5.6 Protección y operación

- proteger la fórmula y encabezados;
- permitir filtros sin permitir edición de celdas calculadas;
- mostrar un aviso: “Editar la actividad en la hoja de origen”;
- bloquear el uso de ordenamientos que modifiquen las hojas fuente;
- documentar propietario y procedimiento de restauración;
- registrar cualquier cambio de fórmula en `auditoria/CHANGELOG.md`;
- validar periódicamente que:
  - cantidad de filas del resumen =
    suma de filas no vacías de las cinco hojas;
  - cada fila tenga una hoja y fila fuente;
  - cada ID automatizado se pueda relacionar con `Registro Tareas`;
  - no existan claves de vista duplicadas sin alerta.

### 5.7 Umbral para migrar a Apps Script

No debe decidirse por intuición. En la copia de prueba se medirán:

- tiempo de apertura;
- tiempo hasta reflejar un cambio de estado;
- tiempo de aplicación de filtros;
- comportamiento con el volumen actual y con una proyección de crecimiento.

Criterio inicial propuesto, sujeto a aprobación: si el resumen tarda reiteradamente más de 5 segundos en quedar utilizable con el volumen real, o si interfiere de forma apreciable con la edición normal, se evalúa la vista materializada. Este es un criterio de experiencia de usuario del proyecto, no un límite oficial de Google Sheets.

---

## 6. Estrategia para incorporar actividades históricas no resueltas

### 6.1 Escenarios

#### Escenario recomendado: despliegue sobre el archivo maestro original

Las actividades históricas ya viven en las mismas cinco hojas que seguirá usando el nuevo proceso. No deben copiarse: hacerlo crearía duplicados.

“Incorporarlas” significa:

- inventariarlas;
- clasificarlas como resueltas, no resueltas o ambiguas;
- asegurar que las no resueltas aparezcan en el resumen;
- asignarles identidad estable cuando sea necesario;
- conservar una trazabilidad separada;
- homologar los valores que sean indispensables para operar y filtrar;
- demostrar mediante conciliación que ninguna quedó afuera.

#### Escenario alternativo: despliegue sobre un archivo nuevo

Si se decide cambiar de archivo, debe ejecutarse una migración física controlada. En ese caso:

- solo se copian automáticamente filas aprobadas para migración;
- se preserva el registro original;
- se asigna un ID canónico con prefijo histórico;
- se registra fila fuente y destino;
- ninguna fila se elimina del archivo original;
- se concilia antes y después;
- el archivo original queda congelado como respaldo de solo lectura.

Este escenario requiere una decisión formal porque modifica el plan vigente.

### 6.2 Definición segura de “no resuelto”

No debe usarse una regla como `Estado <> "Completada"` sin inventariar los datos.

Procedimiento:

1. obtener todos los valores únicos reales de la columna `Estado`, incluyendo vacíos, diferencias de mayúsculas, espacios y errores ortográficos;
2. presentar el catálogo a Carlos Rubén Bageta;
3. clasificar cada valor como:
   - `ABIERTO`;
   - `TERMINAL`;
   - `AMBIGUO`;
4. registrar la equivalencia aprobada;
5. considerar **incluible** todo registro `ABIERTO` o `AMBIGUO`;
6. nunca excluir automáticamente una fila con estado vacío o desconocido;
7. enviar los ambiguos a revisión manual sin ocultarlos del resumen.

Catálogo canónico inicial para discusión —no aprobado todavía—:

- abiertos: `Pendiente`, `En curso`, `Bloqueada`;
- terminales: `Completada`, `Cancelada`;
- ambiguos: vacío, valores desconocidos, errores o categorías no homologadas.

La garantía de inclusión se logra con una regla fail-safe: solo se excluye del conjunto “no resuelto” aquello cuyo estado fuente mapea explícitamente a una categoría terminal aprobada.

### 6.3 Perfilado obligatorio

Por cada hoja se debe relevar:

- cantidad total de filas con actividad;
- cantidad por estado literal;
- cantidad por estado normalizado;
- IDs vacíos;
- IDs duplicados dentro de la hoja;
- IDs duplicados entre hojas;
- fechas inválidas;
- fechas límite vencidas;
- responsables vacíos o desconocidos;
- prioridades vacías o fuera de catálogo;
- filas sin resumen;
- fórmulas y referencias existentes;
- filas ocultas;
- filtros o rangos protegidos;
- posibles duplicados de contenido;
- actividades históricas que ya provienen de la automatización anterior;
- filas correspondientes a correos automáticos candidatos a `Registros descartados`.

El perfilado inicial debe ser de solo lectura sobre producción. Cualquier transformación se prueba en una copia aislada.

### 6.4 Identidad de registros históricos

Se propone reservar:

```text
HIST-{CODIGO_HOJA}-{IDENTIFICADOR_ESTABLE}
```

Ejemplos de código de hoja:

- `FIN`;
- `COM`;
- `SOP`;
- `DIT`;
- `GES`.

Reglas:

1. conservar el ID histórico original si es no vacío, único, estable y no colisiona con el espacio `ALI-...`;
2. si falta o colisiona, asignar un nuevo ID `HIST-...`;
3. preservar siempre el ID original en `Registro Migración Histórica`;
4. no basar la identidad únicamente en el número de fila, porque puede cambiar;
5. generar el identificador una sola vez y persistirlo;
6. usar un hash de campos normalizados más un sufijo de colisión o un UUID controlado;
7. no reutilizar el formato `ALI-{HASH_MENSAJE_16}-{INDICE}`, reservado para el pipeline v3;
8. no generar `message_id` artificial.

El algoritmo definitivo debe probar estabilidad, colisiones y repetición segura antes de usarse.

### 6.5 Registro técnico separado

Crear una hoja protegida `Registro Migración Histórica`, independiente de las tres hojas técnicas del pipeline.

Columnas propuestas:

| # | Columna | Propósito |
|---:|---|---|
| 1 | `batch_id` | Identifica la corrida de migración/normalización |
| 2 | `historical_record_id` | ID técnico permanente del registro histórico |
| 3 | `legacy_id_original` | Valor original de la columna ID |
| 4 | `canonical_task_id` | ID finalmente usado en la hoja operativa |
| 5 | `hoja_origen` | Hoja original |
| 6 | `fila_origen_snapshot` | Fila al momento del inventario |
| 7 | `hash_contenido` | Huella para conciliación, no para borrar automáticamente |
| 8 | `estado_original` | Valor sin homologar |
| 9 | `estado_normalizado` | Categoría aprobada |
| 10 | `clasificacion` | `ABIERTO`, `TERMINAL` o `AMBIGUO` |
| 11 | `accion` | `CONSERVAR`, `NORMALIZAR`, `MIGRAR`, `REVISAR`, `DESCARTAR_APROBADO` |
| 12 | `motivo_excepcion` | Explicación estructurada |
| 13 | `hoja_destino` | Si existe migración física |
| 14 | `fila_destino` | Si existe migración física |
| 15 | `fecha_ejecucion` | Timestamp |
| 16 | `aprobado_por` | Responsable de la decisión |
| 17 | `estado_validacion` | `PENDIENTE`, `VALIDADO`, `RECHAZADO` |

Retención recomendada: permanente, por ser la trazabilidad de incorporación del histórico.

### 6.6 Homologación

#### Estados

- conservar el valor original en el registro histórico;
- usar un catálogo aprobado para `Estado normalizado`;
- no reemplazar masivamente valores en producción hasta validar fórmulas, filtros y `Dashboard`;
- si se normaliza la celda fuente, registrar antes y después.

#### Prioridades

- preservar `Prioridad sugerida IA` histórica si existe;
- tratar `Prioridad final` como valor funcional de mayor autoridad;
- mapear variantes a los valores canónicos solo con una tabla aprobada;
- valores desconocidos se revisan, no se fuerzan.

#### Responsables

- distinguir rol de persona;
- no sobrescribir nombres históricos con roles automáticamente;
- definir un catálogo de equivalencias;
- usar `Sin asignar` cuando corresponda por decisión explícita, no por ausencia interpretada.

#### Fechas

- conservar la fecha original;
- convertir a objetos `Date` solo cuando el parseo sea inequívoco;
- registrar fechas inválidas como excepción;
- no inventar fechas límite.

#### Área y hoja

- la hoja física determina inicialmente el área;
- si `Derivada a` indica otra área, no mover automáticamente la fila;
- cualquier reclasificación física requiere aprobación y conciliación.

### 6.7 Detección de duplicados

Aplicar niveles:

1. **ID exacto:** si el mismo ID aparece más de una vez, marcar colisión.
2. **Huella exacta:** comparar una huella de campos normalizados, por ejemplo área, resumen, responsable, fecha límite y observaciones.
3. **Similitud semántica:** solo para sugerir posibles duplicados; nunca para eliminar automáticamente.
4. **Cruce histórico/nuevo:** si una tarea v3 parece representar una tarea histórica abierta, mantener ambas hasta revisión humana.

Regla fundamental: un posible duplicado no se elimina ni se marca resuelto automáticamente. Se envía a revisión con ambas referencias visibles.

### 6.8 Qué no debe hacerse

- no reprocesar correos anteriores a `FECHA_INICIO_CORTE`;
- no inventar `message_id`;
- no insertar histórico en `Indice Idempotencia`;
- no insertar histórico en `Log Mensajes`;
- no crear manifiestos ficticios en `Registro Tareas`;
- no copiar todas las filas si el destino es el mismo archivo;
- no considerar resuelto un estado vacío;
- no ordenar ni compactar las hojas de origen;
- no borrar filas duplicadas sin aprobación;
- no modificar producción durante el modo simulación;
- no mezclar este proceso con el saneamiento de notificaciones automáticas sin reglas separadas.

---

## 7. Flujo propuesto

### Etapa 0 — Decisión y preparación

1. Confirmar los supuestos de la sección 3.
2. Resolver el estado formal de la Fase 8 y DEC-009 antes de abrir el corte productivo.
3. Registrar esta iniciativa como ampliación aprobada del plan.
4. Designar responsable funcional de la conciliación.

### Etapa 1 — Inventario de solo lectura

1. Leer las cinco hojas y sus encabezados.
2. Medir volumen y perfil de calidad.
3. Inventariar valores de estados, prioridades y responsables.
4. Revisar dependencias de `Dashboard`, `Listas`, fórmulas y protecciones.
5. Generar un informe sin modificar producción.

**Salida:** informe de perfilado y preguntas cerradas.

### Etapa 2 — Catálogos y reglas

1. Aprobar estados terminales, abiertos y ambiguos.
2. Aprobar mapeos de prioridad y responsable.
3. Aprobar formato de ID histórico.
4. Aprobar reglas de posibles duplicados.
5. Aprobar criterios de inclusión y excepciones.

**Salida:** matriz de homologación firmada.

### Etapa 3 — Simulación en copia aislada

1. Crear una copia actualizada del archivo productivo.
2. Ejecutar el perfilado sobre la copia.
3. Crear `Registro Migración Histórica`.
4. Simular asignación de IDs y normalizaciones.
5. Crear `Resumen Actividades`.
6. Probar filtros, enlaces, conteos y rendimiento.
7. Generar informe de acciones propuestas sin tocar producción.

**Salida:** reporte de simulación y diferencias.

### Etapa 4 — Revisión humana

1. Resolver estados ambiguos.
2. Resolver colisiones de ID.
3. Resolver posibles duplicados.
4. Aprobar cada transformación productiva.
5. Firmar el reporte de conciliación previo.

### Etapa 5 — Respaldo y ejecución productiva

Dentro de la Fase 9:

1. crear y verificar un respaldo inmediatamente anterior;
2. registrar `batch_id`, fecha, responsable y conteos;
3. crear las hojas nuevas protegidas;
4. aplicar únicamente las transformaciones aprobadas;
5. no reordenar hojas operativas;
6. generar el resumen;
7. ejecutar conciliación automática;
8. detenerse ante cualquier diferencia no explicada;
9. obtener aprobación humana antes de continuar el despliegue.

### Etapa 6 — Conciliación

Por hoja y total:

```text
TOTAL_FUENTE
= TERMINALES
+ ABIERTOS
+ AMBIGUOS

INCLUIBLES_NO_RESUELTOS
= ABIERTOS
+ AMBIGUOS

INCLUIBLES_NO_RESUELTOS
= VISIBLES_EN_RESUMEN
+ EXCEPCIONES_BLOQUEANTES
```

Para aprobar, `EXCEPCIONES_BLOQUEANTES` debe ser cero o cada excepción debe contar con una decisión explícita que no implique omitir silenciosamente una actividad no resuelta.

También se verificará:

- total del resumen contra la suma de las cinco hojas;
- todos los históricos no resueltos visibles;
- todos los IDs únicos o marcados como excepción;
- enlaces a origen correctos;
- ausencia de filas nuevas en las tres hojas técnicas del pipeline por causa del histórico;
- ninguna modificación de Gmail;
- ninguna tarea nueva creada por OpenAI;
- ninguna fila fuente borrada.

### Etapa 7 — Reversión

La reversión debe poder:

1. deshabilitar o eliminar `Resumen Actividades` sin tocar las hojas fuente;
2. restaurar desde el respaldo preejecución si se modificaron IDs o estados;
3. conservar el informe de la corrida fallida;
4. restaurar `Dashboard` o `Listas` si fueron afectados;
5. confirmar que el pipeline de Gmail continúa con su índice intacto;
6. no reactivar automáticamente una migración parcial.

---

## 8. Impacto sobre la arquitectura y el código

### 8.1 Código productivo actual

Para la alternativa inicial por fórmulas no es necesario modificar:

- descubrimiento de Gmail;
- OpenAI;
- generación de tareas;
- escritura por lotes;
- recuperación;
- idempotencia;
- etiquetado o archivado.

Esto reduce el riesgo de regresión sobre las fases ya probadas.

### 8.2 Código administrativo nuevo

Si se automatiza el inventario o la normalización, debe ser un módulo administrativo separado del activador productivo, con funciones explícitas como:

- `analizarHistoricoSoloLectura()`;
- `simularNormalizacionHistorica()`;
- `aplicarNormalizacionHistoricaAprobada()`;
- `conciliarHistorico()`;
- `reconstruirResumenMaterializado()` —solo si se aprueba la alternativa Apps Script.

Barreras obligatorias:

- ID de archivo autorizado;
- modo simulación por defecto;
- confirmación de `batch_id`;
- lista cerrada de hojas;
- validación exacta de encabezados;
- `LockService` para cualquier escritura;
- ausencia de acceso a Gmail y OpenAI;
- registro estructurado sin exponer contenido sensible innecesario;
- detención fail-closed ante catálogo desconocido o diferencia de conteos.

Este módulo no debe instalarse como activador periódico salvo que se apruebe formalmente la vista materializada.

### 8.3 Hojas técnicas

Nueva hoja propuesta:

- `Registro Migración Histórica`.

Nueva hoja funcional:

- `Resumen Actividades`.

Opcional:

- `Configuración Resumen`, protegida u oculta, con catálogos y `gid`;
- preferentemente reutilizar `Listas` si puede hacerse sin romper sus dependencias actuales.

No modificar:

- `Indice Idempotencia`;
- semántica de `Log Mensajes`;
- semántica de `Registro Tareas`.

### 8.4 Documentación a actualizar si se aprueba

- `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`;
- `README.md`;
- `documentacion/ARQUITECTURA_PROPUESTA.md`;
- `documentacion/MAPA_COLUMNAS.md`;
- `documentacion/DISENO_HOJAS_TECNICAS.md`;
- `documentacion/FLUJO_TRANSACCIONAL.md`;
- `documentacion/REGLAS_FUNCIONALES.md`;
- `documentacion/MATRIZ_RIESGOS.md`;
- `configuracion/MATRIZ_PERMISOS.md`, si se agrega un script;
- `auditoria/DECISIONES.md`;
- `auditoria/CHANGELOG.md`;
- procedimiento de despliegue y reversión de Fase 9;
- manual operativo de Fase 10.

---

## 9. Riesgos y controles

| ID | Riesgo | Impacto | Control |
|---|---|---|---|
| RH-01 | Omitir una actividad no resuelta por un estado desconocido | Alto | Solo excluir estados terminales explícitamente aprobados |
| RH-02 | Duplicar el histórico al copiarlo en el mismo archivo | Alto | Confirmar escenario; en el archivo original, no copiar |
| RH-03 | Contaminar idempotencia con registros sin mensaje | Crítico | Registro histórico separado; prohibición de escribir en las tres hojas técnicas |
| RH-04 | Divergencia entre resumen y hoja fuente | Alto | Vista por fórmula; fuente única; conciliación |
| RH-05 | Fórmula lenta por rangos completos | Medio | Rangos medidos, prueba de rendimiento, alternativa materializada |
| RH-06 | Fórmula borrada o modificada | Medio | Protección, respaldo y fórmula documentada |
| RH-07 | Enlace apunta a fila incorrecta tras movimientos | Medio | No reordenar fuentes; enlace calculado; validación periódica |
| RH-08 | IDs históricos vacíos o duplicados | Alto | Perfilado, prefijo `HIST-`, registro de mapeo y prueba de colisiones |
| RH-09 | Falso positivo de duplicación elimina trabajo válido | Alto | Nunca eliminar automáticamente; revisión humana |
| RH-10 | Normalización rompe Dashboard o fórmulas | Alto | Inventario de dependencias y prueba en copia |
| RH-11 | Script de consolidación compite con el pipeline | Medio/alto | Preferir fórmulas; si hay script, activador separado, lock y horario |
| RH-12 | Modificación irreversible del histórico | Alto | Respaldo inmediato, registro antes/después y reversión probada |
| RH-13 | Resumen se convierte en segunda fuente editable | Alto | Protección y enlaces de edición a origen |
| RH-14 | Mezclar saneamiento de correos automáticos con pendientes | Alto | Clasificaciones y aprobaciones separadas |
| RH-15 | Datos históricos sensibles quedan más expuestos en el resumen | Medio | Mismos permisos que el archivo; evitar columnas adicionales innecesarias; proteger vistas |

---

## 10. Casos de prueba

### Consolidación

| ID | Caso | Resultado esperado |
|---|---|---|
| CR-01 | Una fila en cada hoja | Cinco filas en el resumen, cada una con origen correcto |
| CR-02 | Cambio de estado en origen | El resumen refleja el nuevo estado dentro del SLA aprobado |
| CR-03 | Nueva tarea v3 | Aparece una vez y marcada `Automatización v3` |
| CR-04 | Actividad histórica | Aparece una vez y marcada `Histórico/pre-corte` |
| CR-05 | ID vacío | La fila aparece; se marca alerta, no se omite |
| CR-06 | ID duplicado | Ambas filas aparecen con alerta |
| CR-07 | Estado desconocido | Se clasifica `AMBIGUO` y aparece en no resueltas |
| CR-08 | Estado terminal aprobado | Aparece en “Todas” y se excluye de “No resueltas” |
| CR-09 | Enlace a origen | Abre la hoja y fila correctas |
| CR-10 | Fila con texto que comienza `=`, `+`, `-` o `@` | Se muestra como texto, no ejecuta una fórmula nueva |
| CR-11 | Hoja sin datos | El resumen funciona sin error |
| CR-12 | Cambio de nombre o encabezado | La validación falla de forma visible, no mezcla columnas |
| CR-13 | Usuario intenta editar el resumen | La protección impide modificar la vista |
| CR-14 | Volumen real y proyectado | Cumple el tiempo de uso aprobado |
| CR-15 | Recuento global | Coincide con la suma de filas no vacías de las cinco hojas |

### Histórico

| ID | Caso | Resultado esperado |
|---|---|---|
| MH-01 | Estado abierto conocido | Incluido como no resuelto |
| MH-02 | Estado terminal conocido | Excluido de pendientes, conservado en “Todas” |
| MH-03 | Estado vacío | Incluido y enviado a revisión |
| MH-04 | Estado desconocido | Incluido y enviado a revisión |
| MH-05 | ID histórico válido y único | Se conserva |
| MH-06 | ID histórico vacío | Se asigna `HIST-...` una sola vez |
| MH-07 | ID histórico duplicado | No se sobrescribe; se genera excepción |
| MH-08 | Dos filas de contenido similar | Se marcan como posibles duplicados, no se eliminan |
| MH-09 | Fecha inválida | Se conserva el original y se registra excepción |
| MH-10 | Responsable desconocido | No se inventa un responsable |
| MH-11 | Simulación | Cero escrituras en producción |
| MH-12 | Ejecución repetida del mismo lote | No crea nuevos IDs ni duplica registros |
| MH-13 | Interrupción parcial | Reversión o reanudación por `batch_id`, sin pérdida |
| MH-14 | Verificación de hojas técnicas | Ninguna fila histórica en `Log Mensajes`, `Registro Tareas` o `Indice Idempotencia` |
| MH-15 | Reconciliación | Todos los abiertos y ambiguos están visibles o explicados |
| MH-16 | Reversión | Restaura valores previos y mantiene evidencia de auditoría |
| MH-17 | Histórico ya presente en archivo original | No se copia ni duplica |
| MH-18 | Correo automático histórico | Se separa del análisis de pendientes y sigue el saneamiento aprobado de Fase 9 |

---

## 11. Criterios de aceptación

### Hoja consolidada

- [ ] Las cinco hojas están incluidas.
- [ ] Cada fila no vacía aparece exactamente una vez.
- [ ] El estado mostrado coincide con la celda fuente.
- [ ] Cada fila identifica hoja y fila de origen.
- [ ] Los enlaces abren el registro correcto.
- [ ] La vista es de solo lectura.
- [ ] Se puede filtrar por estado, área, responsable, prioridad, origen y fecha.
- [ ] Existe una vista de no resueltas.
- [ ] Los IDs vacíos, duplicados o desconocidos no desaparecen.
- [ ] Los conteos concilian con las hojas fuente.
- [ ] El rendimiento cumple el criterio aprobado.
- [ ] La reversión fue probada en copia.

### Histórico

- [ ] Existe un inventario completo por hoja.
- [ ] Los estados reales fueron homologados y aprobados.
- [ ] Todo registro abierto o ambiguo está incluido.
- [ ] No se excluyó ninguna fila por un estado vacío o desconocido.
- [ ] Los IDs históricos son únicos o tienen excepción explícita.
- [ ] Los datos originales están preservados.
- [ ] No se eliminaron posibles duplicados automáticamente.
- [ ] La simulación produjo cero escrituras productivas.
- [ ] La ejecución tiene respaldo y `batch_id`.
- [ ] La conciliación antes/después cierra sin diferencias inexplicadas.
- [ ] Las excepciones tienen decisión humana.
- [ ] No se modificó Gmail.
- [ ] No se llamó a OpenAI.
- [ ] No se escribieron registros históricos en las tres hojas técnicas del pipeline.
- [ ] La convivencia entre histórico y nuevas tareas fue probada.

---

## 12. Incorporación al cronograma

### Recomendación

Crear una ampliación formal:

```text
Fase 8.1 — Consolidación e incorporación controlada del histórico
```

**Objetivo:** cerrar diseño, inventario, homologaciones, simulación y aprobación antes de modificar producción.

**Entregables propuestos:**

- `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`;
- `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md`;
- `documentacion/DISENO_RESUMEN_ACTIVIDADES.md`;
- `pruebas/CASOS_CONSOLIDACION_HISTORICA.md`;
- `pruebas/resultados/RESULTADOS_CONSOLIDACION_HISTORICA.md`;
- `auditoria/ACTA_APROBACION_FASE_8_1.md`;
- informe de inventario de solo lectura;
- reporte de simulación y conciliación.

**Puerta propuesta:**

```text
APROBACIÓN FASE 8.1: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

### Relación con la Fase 9

**Corrección (27/07/2026):** una revisión previa había resumido esta relación como una lista abreviada de 7 puntos. Al intentar combinarla con los 19 pasos ya vigentes del procedimiento de Fase 9 (`PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 9. Despliegue controlado"), esa forma abreviada llevó a ubicar mal la aprobación humana del lote histórico. Se reemplaza por el procedimiento completo e intercalado, con las **dos aprobaciones separadas y no intercambiables** explícitas.

#### Aprobación A — cierre del lote histórico (antes de tocar el código nuevo)

1. Confirmar respaldo final del archivo.
2. Abrir la ventana de corte y registrar `FECHA_INICIO_CORTE`.
3. Verificar la última ejecución de la versión antigua y desactivar su activador.
4. Crear las hojas técnicas del pipeline (`Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`).
5. Crear `Registro Migración Histórica`.
6. Aplicar únicamente las normalizaciones históricas ya aprobadas en la Fase 8.1.
7. Crear `Resumen Actividades`.
8. Ejecutar la conciliación histórico/resumen.
9. Detenerse ante cualquier diferencia no explicada.
10. **Aprobación A: obtener aprobación humana del lote histórico y su conciliación — condición para continuar con el despliegue del código.** No debe confundirse con la aprobación final de Fase 9 (Aprobación B): esta cierra específicamente el trabajo de datos, antes de que el pipeline nuevo exista en el archivo.

#### Continúa el procedimiento de despliegue del pipeline (ya vigente en Fase 9, sin cambios en su lógica)

11. Copiar el código aprobado a Apps Script; habilitar el servicio avanzado de Gmail y verificar `appsscript.json`; configurar propiedades del script (`MODO_PRUEBA=false`, `DRY_RUN=false`).
12. Crear etiquetas y registrar sus IDs internos; verificar nombres de hojas; autorizar permisos; ejecutar `validarConfiguracion()`.
13. Ejecutar una prueba manual y procesar uno o dos correos controlados; verificar filas, log, etiquetado y archivado por mensaje.
14. Ejecutar por separado el saneamiento de correos automáticos (procedimiento ya vigente de Fase 9 — distinto de la incorporación histórica; ver RH-14).
15. Configurar las alertas hacia la cuenta técnica externa.
16. **Aprobación B: obtener la aprobación final de despliegue** — la que ya exige la puerta de Fase 9 vigente, confirmando además que ninguna diferencia detectada en el paso 9 quedó sin explicar.
17. Reactivar el activador (versión nueva) y verificar su primera ejecución.
18. Confirmar que se procesó todo correo posterior a `FECHA_INICIO_CORTE`.
19. Supervisar las primeras ejecuciones.

La Fase 9 no debería usar la nueva automatización para reprocesar el histórico. `FECHA_INICIO_CORTE` debe conservar su función actual.

#### Entregables adicionales de la Fase 9

Distintos de los entregables propios de la Fase 8.1 (sección 12, más abajo) — estos surgen recién durante la corrida productiva real, no durante la simulación:

- reporte de conciliación histórico/resumen de la corrida real (distinto del reporte de simulación de la Fase 8.1);
- procedimiento de creación y restauración de `Resumen Actividades` en el archivo productivo;
- registro del lote histórico efectivamente aplicado (`batch_id`, fecha, responsable, conteos de la corrida real).

### Relación con la Fase 10

Durante estabilización:

- revisar diariamente la conciliación del resumen;
- medir rendimiento;
- confirmar que cambios de estado se reflejan;
- monitorear actividades sin origen identificable;
- revisar duplicados candidatos;
- decidir si las fórmulas siguen siendo suficientes;
- documentar el procedimiento operativo y de restauración.

---

## 13. Decisiones propuestas para registro

Si Carlos Rubén Bageta aprueba la orientación, deberían registrarse decisiones separadas:

### DEC propuesta — Fuente única y resumen de solo lectura

Las cinco hojas operativas continúan como fuente de verdad. `Resumen Actividades` es una vista protegida y no editable, inicialmente implementada mediante fórmulas. No se implementa escritura dual.

### DEC propuesta — Tratamiento del histórico

El histórico no se reprocesa desde Gmail ni se inserta en las hojas técnicas del pipeline. Se inventaría, homologa y concilia mediante `Registro Migración Histórica`.

### DEC propuesta — Regla fail-safe de no resueltos

Solo se excluyen del conjunto de no resueltos los estados expresamente clasificados como terminales. Vacíos y desconocidos se incluyen y pasan a revisión.

### DEC propuesta — Momento de implementación

El diseño y la simulación se realizan en Fase 8.1; las modificaciones productivas se ejecutan dentro de la ventana controlada de Fase 9, después del respaldo y antes de la activación definitiva.

---

## 14. Recomendación final

No se recomienda una macro manual posterior a la puesta en producción como solución principal. La opción más segura y mantenible es una vista consolidada por fórmulas, de solo lectura y con trazabilidad a la fuente. Esta alternativa muestra el estado vigente sin duplicar datos ni ampliar el modelo transaccional ya probado.

La incorporación del histórico debe aprovechar que las actividades ya residen en el archivo productivo original. Antes de copiar cualquier dato, debe confirmarse el escenario de despliegue. Si se conserva el archivo maestro —como indica el plan actual—, el objetivo no es migrar filas sino garantizar identidad, clasificación, visibilidad y conciliación de todas las no resueltas.

La condición central de aceptación será demostrable:

> Toda actividad histórica cuyo estado no sea inequívocamente terminal debe estar visible en `Resumen Actividades`, identificada como histórica o en revisión, y trazada hasta su fila original; ninguna debe ingresar al índice de mensajes procesados.

---

## 15. Solicitud concreta para la revisión de Claude Cowork

Se solicita revisar esta propuesta contra el código y documentación vigentes y responder:

1. si la vista por fórmulas preserva correctamente la arquitectura actual;
2. si existe alguna dependencia no contemplada de `Dashboard`, `Listas` o las 17 columnas;
3. si el despliegue sigue confirmado sobre el archivo maestro original;
4. si `Registro Migración Histórica` debe considerarse hoja técnica permanente;
5. si la Fase 8.1 es la ubicación correcta o conviene otra numeración;
6. qué cambios documentales y casos de prueba adicionales serían necesarios;
7. si identifica algún riesgo sobre `fila_destino`, idempotencia, recuperación o rendimiento;
8. qué decisiones requieren aprobación explícita de Carlos Rubén Bageta antes de implementar.

Claude Cowork no debe implementar cambios productivos a partir de este documento sin una instrucción y aprobación posteriores.
