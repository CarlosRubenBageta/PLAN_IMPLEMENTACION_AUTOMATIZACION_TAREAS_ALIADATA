# Auditoría de los procedimientos de despliegue y reversión — Fase 9

**Fecha de auditoría:** 28/07/2026  
**Documentos auditados:** `documentacion/PROCEDIMIENTO_DESPLIEGUE.md` y `documentacion/PROCEDIMIENTO_REVERSION.md`  
**Resultado:** **NO-GO condicionado** — no ejecutar todavía en producción  
**Alcance:** revisión documental y estática del repositorio. No se accedió a Google Workspace, Gmail, Google Sheets, Apps Script ni OpenAI; no se ensayó el procedimiento sobre recursos reales.

---

## 1. Resumen ejecutivo

La estructura general es acertada: separa el cierre del histórico de la activación del pipeline, establece dos aprobaciones humanas y distingue tres momentos de reversión. También identifica correctamente que los `gid` de la copia de prueba no deben reutilizarse sin verificación.

Sin embargo, el procedimiento todavía no alcanza el nivel necesario para una ejecución productiva controlada. Se encontraron **siete bloqueantes**:

1. las fórmulas exactas de `Resumen Actividades` y `Registro Migración Histórica` no están persistidas en el repositorio;
2. el Escenario 2 de reversión propone reactivar el “activador antiguo” después de reemplazar el código, pero un activador ejecuta el código vigente del proyecto, no una versión histórica;
3. la reversión reactiva la versión antigua antes de aislar mensajes parcialmente procesados por v3, lo que puede duplicar tareas;
4. `FECHA_INICIO_CORTE` no es obligatoria para el código y la conciliación de correos del corte no tiene un método verificable por `message_id`;
5. la alerta nativa no puede dirigirse a Carlos del modo descrito si el activador productivo debe ser creado por `tareas@alia-data.com`;
6. el saneamiento B.11 no está definido y su ubicación actual puede invalidar referencias de fila y evidencia histórica;
7. el rollback completo no fue ensayado, aunque el plan exige un procedimiento de reversión probado.

Por lo tanto, **no se recomienda fijar todavía `FECHA_INICIO_CORTE`**. Primero deben cerrarse los siete bloqueantes y los hallazgos altos indicados en este informe.

---

## 2. Alcance y evidencia revisada

Se contrastaron los procedimientos contra:

- `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, en especial Fases 8.1, 9 y protocolo de reversión;
- los nueve archivos productivos de `codigo/*.gs`;
- `codigo/script_actual.gs`;
- `configuracion/PARAMETROS_EJEMPLO.md`;
- `configuracion/MATRIZ_PERMISOS.md`;
- `documentacion/DISENO_HOJAS_TECNICAS.md`;
- `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`;
- `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`;
- `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md`;
- `auditoria/CHANGELOG.md` y `auditoria/DECISIONES.md`;
- los respaldos e inventarios de la Fase 0.

También se verificaron dos comportamientos actuales en documentación oficial de Google:

- los activadores instalables siempre se ejecutan con la cuenta de quien los creó, y otra cuenta no puede ver ni administrar esos activadores como propios;
- las notificaciones de falla pertenecen al activador/cuenta y solo permiten ajustar su frecuencia mientras el activador está activo;
- para crear subetiquetas en Gmail, la interfaz documentada usa la opción **“Anidar etiqueta en”**, no la suposición de que escribir `/` sea suficiente.

Referencias:

- [Installable Triggers — Google Apps Script](https://developers.google.com/apps-script/guides/triggers/installable)
- [Create & manage labels in Gmail](https://support.google.com/mail/answer/118708)

---

## 3. Fortalezas confirmadas

1. **Separación de aprobaciones.** La Aprobación A cierra datos históricos y la B habilita el pipeline. Evita mezclar dos riesgos distintos.
2. **Respaldo fresco.** Se reconoce correctamente que el respaldo de la Fase 0 ya no es suficiente para el corte.
3. **Uso de identificadores reales.** Están documentados el archivo maestro, el proyecto, las cuentas y los nombres de las hojas.
4. **Advertencia sobre `gid`.** Es correcta y necesaria: los IDs de pestaña de la copia no se deben trasladar a producción.
5. **Propiedades sensibles.** Se evita copiar `OPENAI_API_KEY` al repositorio o a registros.
6. **IDs internos de etiquetas.** El procedimiento distingue nombres visibles de IDs de Gmail API.
7. **Reversión por momento de falla.** Los tres escenarios son una mejora real respecto del protocolo genérico del plan.
8. **Preservación de evidencia.** El rollback evita borrar tareas ya escritas y pide copiar logs y filas afectadas.

Estas fortalezas deben conservarse en la versión corregida.

---

## 4. Hallazgos bloqueantes

### BLQ-01 — Las fórmulas productivas no están versionadas

**Evidencia**

- A.5 indica copiar la “misma fórmula única validada” y remite a `auditoria/CHANGELOG.md`.
- A.7 describe una fórmula `LET` + `VSTACK` + `HSTACK` + `FILTER`.
- En el repositorio se encontró la descripción de esas fórmulas, pero no su texto literal completo, encabezados, celdas de destino, separadores regionales ni placeholders de `gid`.
- El changelog confirma además que `Registro Migración Histórica` depende de `Resumen Actividades`: durante la prueba de reversión mostró `#REF!` hasta que se restauró `Resumen Actividades`. El orden A.5 → A.7 crea primero la hoja dependiente.
- `Registro Migración Histórica` tiene función de evidencia de un lote (`batch_id`, decisiones y excepciones), pero se lo deja alimentado por una fórmula viva. Sin una materialización controlada, el registro puede recalcularse cuando cambien las hojas fuente y dejar de representar exactamente el lote aprobado.

**Riesgo**

El operador tendría que reconstruir de memoria o recuperar desde una copia externa una fórmula que ya tuvo errores de encabezado y de columna durante la prueba. La ejecución no es reproducible ni auditable.

**Mejora obligatoria**

Crear un artefacto versionado, por ejemplo `documentacion/FORMULAS_FASE_8_1_PRODUCCION.md`, que incluya:

- fórmula exacta y completa de cada hoja;
- celda donde se pega cada fórmula;
- fila de encabezados completa y ordenada;
- configuración regional esperada y separador `;`;
- placeholders explícitos para los cinco `gid`;
- rangos máximos y política de crecimiento;
- fórmula exacta de `Estado normalizado`, `Abrir origen` y `Origen del registro`;
- resultado esperado ante una dependencia todavía no creada;
- instrucciones de restauración.

Reordenar la construcción a:

1. `Indice Idempotencia` con encabezados;
2. `Resumen Actividades`;
3. `Registro Migración Histórica`;
4. validación de cero `#REF!`, `#N/A`, `#VALUE!` u otros errores.

Usar la fórmula de migración como área de preparación y, una vez conciliado el lote, materializar sus 17 columnas como valores inmutables, asignar `batch_id`, proteger la hoja y conservar la fórmula utilizada en el documento versionado. `Resumen Actividades` sí debe permanecer dinámico.

---

### BLQ-02 — El Escenario 2 no puede “reactivar la versión antigua” sin restaurar antes el código

**Evidencia**

- B.1 reemplaza el código del proyecto por v3.
- En el Escenario 2, paso 2, se propone reactivar el activador de la versión antigua.
- La función mantiene el mismo nombre: `procesarCorreosDeTareas`.

**Riesgo**

Un activador de Apps Script no contiene una copia del código. Si se reactiva o recrea después de B.1, ejecutará la función `procesarCorreosDeTareas` que exista en ese momento: v3. El procedimiento podría activar precisamente la versión que se intentaba retirar.

**Mejora obligatoria**

En cualquier falla posterior a B.1:

1. detener y confirmar que no hay ejecuciones activas;
2. restaurar el snapshot completo de la versión anterior;
3. verificar inventario de archivos y manifiesto;
4. ejecutar un preflight seguro;
5. recién entonces recrear el activador con `tareas@alia-data.com`.

No usar la expresión “reactivar el activador antiguo” como sinónimo de restaurar la versión anterior.

---

### BLQ-03 — El rollback puede duplicar mensajes parcialmente escritos por v3

**Evidencia**

- El script antiguo procesa todo hilo que siga en `INBOX` y no tenga `Procesado`.
- v3 puede haber escrito tareas y fallar antes de actualizar Gmail.
- En el Escenario 3, el activador antiguo se reactiva en el paso 7 y los mensajes problemáticos se mueven a revisión manual recién en el paso 8.
- El Escenario 2 no define cuarentena por `message_id`.

**Riesgo**

Un mensaje con tareas ya escritas por v3, pero todavía en `INBOX`, puede ser tomado por el script antiguo y crear otra tarea con un ID aleatorio. `Indice Idempotencia` no protege frente a la versión antigua, porque esa versión no lo consulta.

**Mejora obligatoria**

Antes de restaurar el servicio:

1. detener el activador y esperar que no haya ejecuciones activas;
2. identificar en `Log Mensajes` y `Registro Tareas` todos los mensajes no terminales y todos los que alcanzaron `MANIFIESTO_PERSISTIDO` o una etapa posterior;
3. guardar evidencia;
4. quitar `INBOX` a esos mensajes y aplicar una etiqueta de cuarentena/revisión por mensaje;
5. verificar que ninguno quede alcanzable por la consulta del script antiguo;
6. restaurar código y activador;
7. resolver manualmente cada mensaje en cuarentena.

La cuarentena debe ocurrir **antes**, no después, de reactivar la versión anterior.

---

### BLQ-04 — La barrera temporal del corte no es fail-closed ni demostrable

**Evidencia**

- El procedimiento trata `FECHA_INICIO_CORTE` como obligatoria.
- `validarConfiguracion()` permite que esté ausente; solo valida el formato si existe.
- El plan afirma que los mensajes anteriores al corte se registran como excluidos en el log.
- El código actual solo hace `Logger.log(...)` y omite el mensaje; no crea una fila auditable en `Log Mensajes`.
- B.15 pide “comparar contra el timestamp”, pero no define inventario, conjunto de IDs ni consulta de conciliación.

**Riesgo**

- Si falta la propiedad, v3 puede considerar elegible cualquier mensaje presente en la bandeja.
- Un conteo o inspección visual no demuestra que todos los mensajes posteriores al corte fueron tratados una sola vez.
- Un mensaje omitido y uno duplicado pueden compensarse en un conteo total.

**Mejora obligatoria**

Antes del despliegue:

- cambiar la validación para que `FECHA_INICIO_CORTE` sea obligatoria cuando `MODO_PRUEBA=false`;
- exigir formato RFC 3339 con offset, por ejemplo `2026-07-28T14:30:00-03:00`;
- registrar también su equivalente UTC;
- decidir y documentar la semántica exacta del límite (`<` excluido, `>=` incluido);
- crear un inventario de `message_id` alcanzados por la ventana de corte;
- conciliar por ID cada mensaje contra uno de estos resultados: procesado por la versión anterior, terminal en v3, en revisión justificada o pendiente no aceptable;
- resolver la contradicción entre el plan y el código sobre el registro de excluidos por antigüedad.

La Aprobación B no debe basarse solo en que la bandeja parezca vacía.

---

### BLQ-05 — La alerta a Carlos no funciona del modo descrito

**Evidencia**

- B.14 exige que el activador pertenezca a `tareas@alia-data.com`.
- B.12 indica iniciar sesión como `carlosrubenbageta@alia-data.com` y activar la notificación nativa.
- Google documenta que un activador instalable corre como su creador y que otra cuenta no ve sus activadores como propios.
- `CUENTA_ALERTAS` no es leída por ningún archivo de `codigo/*.gs`.

**Riesgo**

La notificación nativa del activador creado por `tareas@alia-data.com` no queda redirigida automáticamente a Carlos por configurar una propiedad ni por ser editor del proyecto. El control puede considerarse implementado sin estarlo.

**Mejora obligatoria**

Elegir y probar una ruta real:

- opción inmediata: filtro/reenviado desde `tareas@alia-data.com` hacia Carlos para el remitente y asunto de fallas de Apps Script;
- opción robusta: monitor externo o código de alertas independiente de la ejecución principal;
- opción organizacional: buzón/grupo de monitoreo administrado.

Después, provocar una falla controlada con un activador temporal creado por `tareas@alia-data.com`, comprobar recepción en Carlos y eliminar el activador temporal. `CUENTA_ALERTAS` debe implementarse o declararse explícitamente “informativa/no consumida”; hoy no configura ninguna alerta.

---

### BLQ-06 — B.11 carece de procedimiento y está ubicado en un punto riesgoso

**Evidencia**

- B.11 mueve filas reales después de que B.9-B.10 ya pudieron escribir tareas v3.
- `Registro Tareas.fila_destino` guarda el número físico de la fila escrita.
- La propuesta histórica desaconseja reordenar físicamente las hojas por esa referencia.
- `Registro Migración Histórica` se alimenta por fórmula desde `Resumen Actividades`; si después se retiran filas fuente, la evidencia del lote puede recalcularse y desaparecer.
- No existe esquema de `Registros descartados`, inventario de candidatos, aprobación fila por fila, hash, conciliación ni rollback.

**Riesgo**

Mover filas después del canary puede desplazar `fila_destino`, alterar enlaces, cambiar conteos ya aprobados y borrar de la vista viva la evidencia histórica que justificaba el movimiento.

**Mejora obligatoria**

Tratar el saneamiento como un sublote de datos separado, antes de cualquier escritura v3 y antes de construir las fórmulas finales:

1. inventario de candidatos de solo lectura;
2. criterio determinístico y motivo por fila;
3. aprobación humana fila por fila;
4. respaldo;
5. copia verificable a `Registros descartados`;
6. comprobación de conteo y hash;
7. retiro de las fuentes, de abajo hacia arriba por hoja;
8. conciliación de las cinco hojas, `Dashboard` y `Listas`;
9. acta propia y prueba de reversión;
10. recién después, construir `Resumen Actividades` y `Registro Migración Histórica`.

Si se decide mantener B.11 en su ubicación actual, no debe mover físicamente filas; haría falta otro mecanismo aprobado que no invalide referencias.

---

### BLQ-07 — El rollback no fue ensayado y no cumple todavía el criterio de aceptación

**Evidencia**

- `PROCEDIMIENTO_REVERSION.md` lo marca como pendiente.
- La Fase 9 exige: “Existe un procedimiento de reversión probado”.
- Solo se ensayó la eliminación/restauración de hojas de Fase 8.1 en una copia; no se ensayó restaurar el proyecto, manifiesto, propiedades, permisos, Gmail y activador.

**Riesgo**

La primera ejecución del rollback completo ocurriría durante un incidente productivo.

**Mejora obligatoria**

Ejecutar un simulacro sobre una copia controlada del proyecto y de la planilla que cubra:

- reemplazo v3 → versión anterior;
- eliminación de todos los archivos v3 sobrantes;
- restauración de `appsscript.json`;
- verificación de propiedades sin exponer secretos;
- recreación del activador con la cuenta correcta;
- cuarentena previa de un mensaje parcial simulado;
- comprobación de que no se duplica una tarea;
- medición de tiempo de recuperación;
- evidencia y responsable.

El resultado debe anexarse a `auditoria/ACTA_DESPLIEGUE.md` o a un acta específica de simulacro.

---

## 5. Hallazgos de prioridad alta

### ALT-01 — No existe un release reproducible del proyecto completo

Los nueve `.gs` no constituyen por sí solos el proyecto completo. Falta un `appsscript.json` v3 aprobado y versionado. B.2 modifica el manifiesto en vivo, pero no define el contenido completo de servicios y alcances. Si se declara `oauthScopes` explícitamente, debe contener todos los alcances requeridos, no solo `gmail.modify`.

Además, el trabajo todavía no está commiteado. Antes del corte se debe generar:

- commit limpio y revisado;
- tag o identificador de release coherente con `VERSION_SCRIPT=3.0.0`;
- inventario de los nueve `.gs` más `appsscript.json`;
- hash SHA-256, tamaño y última línea de cada archivo;
- resultado de pruebas asociado al mismo commit.

“Comparar longitud/última línea” no es suficiente para detectar una modificación intermedia.

### ALT-02 — El backup y la restauración del proyecto son incompletos

A.1 acepta exportar solo los `.gs`. El rollback debe poder restaurar exactamente:

- lista y contenido de todos los archivos;
- `appsscript.json`;
- servicios avanzados;
- propiedades presentes antes del corte, sin guardar el valor de la clave en Markdown;
- dueño, función y frecuencia del activador;
- zona horaria y runtime.

Durante la restauración se deben borrar o apartar los archivos v3 que no existían en la versión anterior. Dejar los ocho módulos junto a `script_actual.gs` puede mantener funciones y variables v3 en el espacio global.

### ALT-03 — `validarConfiguracion()` da menos garantías que las atribuidas

El procedimiento dice que la función confirma propiedades, etiquetas, permisos y hojas. El código actual:

- no exige `FECHA_INICIO_CORTE`;
- comprueba que los cuatro IDs de etiquetas no estén vacíos, pero no que existan ni que correspondan a los nombres esperados;
- no valida permisos de Gmail API;
- no valida la cuenta efectiva;
- no valida los cinco nombres de hojas de negocio;
- solo valida la existencia de las tres hojas técnicas, no sus encabezados ni orden;
- no emite un log de éxito con los controles realizados.

Esto es especialmente riesgoso porque varias funciones usan posiciones fijas de columna. Una hoja con encabezados corridos puede existir y aun así quedar corrupta.

Se recomienda crear un `preflightDespliegue()` de solo lectura que falle de forma cerrada y produzca una tabla segura de controles, sin imprimir valores sensibles.

### ALT-04 — La cantidad de propiedades está mal documentada

B.3 lista **18** propiedades y B.4 agrega **4** IDs: son **22 configuraciones**, no 20. De esas 22, el código no consume `CUENTA_ALERTAS`; las otras 21 sí participan en la configuración productiva.

Conviene reemplazar el conteo por una matriz con:

- nombre;
- obligatoria/condicional;
- valor esperado;
- función que la consume;
- forma de verificación;
- si puede registrarse o debe permanecer secreta.

### ALT-05 — B.7 no puede verificar lo que afirma

Ejecutar `validarConfiguracion()` manualmente no genera, en caso exitoso, un log con las propiedades leídas. La función retorna un objeto, pero el procedimiento pide revisar un “log completo” que no existe.

El criterio debe ser un resultado explícito como `PREFLIGHT_OK`, acompañado por controles nominales y sin valores secretos.

### ALT-06 — La autorización está ordenada y redactada de forma insegura

B.4 ejecuta `Gmail.Users.Labels.list()` antes del paso B.6 de autorización; esa ejecución puede disparar el consentimiento antes de lo indicado. B.6, a su vez, dice ejecutar “cualquier función”, lo que podría iniciar el pipeline real.

Orden recomendado:

1. crear etiquetas en Gmail;
2. ejecutar una función administrativa de solo lectura para autorizar;
3. listar y validar IDs;
4. guardar las propiedades;
5. eliminar la función temporal del proyecto;
6. ejecutar el preflight.

No usar `procesarCorreosDeTareas()` como función de autorización.

### ALT-07 — La creación de subetiquetas debe usar el flujo documentado

Gmail documenta crear la etiqueta padre y marcar **“Anidar etiqueta en”** al crear cada subetiqueta. El texto “el `/` crea la jerarquía automáticamente” no debe ser el control operativo.

Después de crearlas, validar por API el par exacto `nombre ↔ ID`, no solo copiar todos los IDs desde el log.

### ALT-08 — La prueba B.8 puede procesar correos reales no controlados

Con `MODO_PRUEBA=false`, `DRY_RUN=false`, etiquetado y archivado habilitados, ejecutar el pipeline “con la bandeja real en su estado normal” puede procesar hasta diez mensajes reales antes del canary definido en B.9.

Se necesita una de estas barreras:

- una función de canary por `message_id` exacto, implementada y probada;
- un modo de canary productivo con consulta allowlist;
- una bandeja previamente inventariada y aislada con evidencia.

Primero debe existir un preflight sin escrituras; después, un único mensaje controlado; recién luego se habilita el procesamiento general.

### ALT-09 — El canary verifica solo el camino feliz y no prueba idempotencia

B.10 debe incluir, como mínimo:

- `message_id` y `thread_id` esperados;
- una fila de `Log Mensajes`;
- N filas exactas en `Registro Tareas`;
- N filas exactas en `Indice Idempotencia`;
- N filas exactas en hojas de negocio;
- `version_script=3.0.0`;
- `resultado_gmail` esperado;
- enlace al correo correcto;
- reejecución del mismo `message_id` con cero filas adicionales.

Si el mensaje controlado no produce tareas, el resultado esperado no puede ser siempre `estado=PROCESADO`.

### ALT-10 — La conciliación A.9 es solo numérica

Las igualdades propuestas no detectan sustituciones uno-a-uno, por ejemplo una fila omitida y otra duplicada. Además, “VISIBLES_EN_RESUMEN” es ambiguo porque el resumen contiene también terminales.

Agregar:

- igualdad de conjuntos por `(Hoja origen, Fila origen, ID)`;
- faltantes, extras y duplicados igual a cero;
- conteos por hoja y por estado literal/normalizado;
- hash o comparación de las 17 columnas;
- `VISIBLES_NO_RESUELTOS_EN_RESUMEN` como término explícito;
- cero errores de fórmula;
- prueba de un enlace por hoja;
- `Dashboard` y `Listas` sin regresión;
- hojas técnicas vacías antes del canary.

### ALT-11 — Faltan protecciones de hojas técnicas

`DISENO_HOJAS_TECNICAS.md` exige proteger `Indice Idempotencia`, pero A.4 no lo incluye. Debe definirse quién puede editar:

- `Indice Idempotencia`;
- encabezados de `Log Mensajes`;
- encabezados de `Registro Tareas`;
- `Registro Migración Histórica`;
- `Registros descartados`;
- `Resumen Actividades`.

La protección debe permitir que el activador creado por `tareas@alia-data.com` escriba donde corresponde.

### ALT-12 — B.15 no define cuándo termina el drenaje

La primera ejecución procesa como máximo diez mensajes y la búsqueda obtiene como máximo veinte. “Verificar la primera ejecución” no demuestra que el backlog se drenó.

Definir:

- inventario inicial de IDs;
- cantidad por estado después de cada ciclo;
- cero mensajes sin clasificación terminal o excepción aprobada;
- tiempo máximo de drenaje;
- condición de rollback si el backlog crece o no disminuye;
- revisión de varias ejecuciones consecutivas sin duplicados.

### ALT-13 — La reversión no contiene ramas específicas para credenciales y datos incorrectos

El plan considera falla crítica la exposición de credenciales, clasificación masivamente errónea, alteración de filas y bloqueo continuo. El procedimiento abrevia la lista y no define acciones específicas.

Agregar:

- rotación inmediata de `OPENAI_API_KEY` ante exposición;
- revocación/reautorización OAuth si corresponde;
- cuarentena de lotes clasificados incorrectamente;
- reparación auditable de filas erróneas, sin borrado silencioso;
- severidad, responsable, RTO, criterio de escalamiento y autoridad para declarar rollback.

### ALT-14 — La prueba manual de la versión restaurada también puede escribir

`script_actual.gs` no tiene `DRY_RUN`. Ejecutarlo manualmente como “prueba” procesa hasta diez hilos reales, escribe filas, etiqueta y archiva.

Antes de esa ejecución se debe completar la cuarentena y conocer exactamente qué mensajes siguen en `INBOX`. La primera ejecución restaurada es parte de la recuperación productiva, no un test inocuo.

### ALT-15 — Faltan entregables previos a la ventana

El plan exige `auditoria/ACTA_DESPLIEGUE.md`, reporte real de conciliación y registro de `batch_id`. `auditoria/ACTA_DESPLIEGUE.md` todavía no existe.

La plantilla debe crearse antes del corte con espacios separados para:

- Aprobación del saneamiento;
- Aprobación A;
- Aprobación B;
- activación;
- conciliación final de correos;
- resultado del simulacro de rollback;
- decisión final GO/NO-GO.

### ALT-16 — A.4 asigna `intentos_gmail` a la hoja equivocada

La redacción de A.4 vincula “columnas ampliadas de la Fase 5 + `intentos_gmail`” con `Registro Tareas`. Según `DISENO_HOJAS_TECNICAS.md` y el código:

- `Log Mensajes`: 27 columnas; `intentos_gmail` es la columna 27;
- `Registro Tareas`: 16 columnas; no contiene `intentos_gmail`;
- `Indice Idempotencia`: 4 columnas.

La instrucción debe reemplazarse por una tabla literal de encabezados y cantidad esperada por hoja. El preflight debe comparar nombre, posición y número de columnas antes de permitir cualquier escritura.

---

## 6. Procedimiento mínimo propuesto para B.11

Este esquema no autoriza todavía el saneamiento; define la información que debe tener su runbook.

### 6.1 Preparación

1. Ejecutarlo con el activador antiguo detenido y antes de cualquier escritura v3.
2. Crear un `discard_batch_id` único.
3. Confirmar respaldo fresco y restaurable.
4. Crear `Registros descartados` con las 17 columnas originales más:
   - `discard_batch_id`;
   - `hoja_origen`;
   - `fila_origen_previa`;
   - `id_original`;
   - `regla_deteccion`;
   - `motivo_aprobado`;
   - `responsable_aprobacion`;
   - `fecha_aprobacion`;
   - `fecha_movimiento`;
   - `hash_fila_original`.

### 6.2 Inventario y aprobación

1. Detectar candidatos sin modificar datos.
2. No clasificar por palabras genéricas: usar remitente, asunto, fuente, enlace y revisión humana.
3. Presentar una tabla por fila con `ID`, hoja, fila, remitente, asunto, estado y motivo.
4. Aprobar o rechazar cada candidato expresamente.
5. Congelar el conjunto aprobado por ID y hash.

### 6.3 Movimiento

1. Copiar primero las filas aprobadas a `Registros descartados`.
2. Verificar cantidad, 17 valores originales y hash.
3. Solo después retirar de las fuentes.
4. Procesar filas de abajo hacia arriba en cada hoja para evitar desplazamientos durante el lote.
5. No ejecutar si cambió un ID, fila o hash desde la aprobación.

### 6.4 Conciliación

Para cada hoja y para el total:

```text
FILAS_ANTES = FILAS_REMANENTES + FILAS_DESCARTADAS_DEL_LOTE
```

Además:

- cero IDs aprobados todavía presentes en las fuentes;
- cero IDs no aprobados retirados;
- cero diferencias de valor entre origen capturado y destino;
- `Dashboard` y `Listas` verificados;
- enlaces y fórmulas sin error;
- acta firmada.

### 6.5 Reversión

1. Detener cualquier escritura.
2. Restaurar las filas por hoja usando el mapa del lote o restaurar la copia completa si no puede preservarse el orden.
3. Verificar conteos, IDs, hashes, `Dashboard` y `Listas`.
4. Conservar el lote fallido y su evidencia; no borrar el registro.

---

## 7. Secuencia corregida de despliegue

### Etapa 0 — Condiciones previas

1. Cerrar los siete bloqueantes.
2. Versionar fórmulas y `appsscript.json`.
3. Crear release limpio con hashes.
4. Crear `ACTA_DESPLIEGUE`.
5. Ensayar rollback completo.
6. Probar la ruta real de alertas.
7. Definir responsables, ventana, RTO y criterio de aborto.

### Etapa 1 — Barrera de corte

1. Verificar última ejecución exitosa y ausencia de una ejecución activa.
2. Inventariar la bandeja pendiente de la versión anterior.
3. Registrar `FECHA_INICIO_CORTE` en RFC 3339 con offset.
4. Eliminar el activador antiguo y registrar hora/propietario.
5. Confirmar nuevamente que no quedó una ejecución activa.
6. Capturar el conjunto de mensajes que deberá reconciliarse.

### Etapa 2 — Saneamiento separado

1. Ejecutar el runbook aprobado de `Registros descartados`.
2. Conciliar y firmar una aprobación específica del sublote.
3. No continuar si hubo cambios no explicados.

### Etapa 3 — Cierre histórico

1. Crear y validar hojas técnicas y protecciones.
2. Crear `Resumen Actividades` con fórmula versionada y `gid` reales.
3. Preparar `Registro Migración Histórica` con fórmula versionada.
4. Ejecutar conciliación de conjuntos, hashes y conteos.
5. Materializar el lote histórico como valores, asignar `batch_id` y protegerlo.
6. Verificar `Dashboard`, `Listas`, enlaces y errores de fórmula.
7. Firmar Aprobación A.

### Etapa 4 — Instalación del pipeline

1. Restauración lista y cronometrada antes de tocar el código.
2. Sustituir el inventario completo del proyecto por el release exacto.
3. Instalar el manifiesto aprobado.
4. Configurar propiedades con una matriz de 22 entradas.
5. Autorizar con una función de solo lectura.
6. Validar nombres e IDs de etiquetas.
7. Ejecutar `preflightDespliegue()` y exigir `PREFLIGHT_OK`.

### Etapa 5 — Canary

1. Procesar un único `message_id` controlado mediante una barrera técnica.
2. Verificar todas las hojas, Gmail, versión y enlace.
3. Repetir el mismo ID y demostrar cero duplicados.
4. Si falla, detener, poner en cuarentena y aplicar el rollback corregido.
5. Firmar Aprobación B solo con evidencia completa.

### Etapa 6 — Activación y drenaje

1. Crear el activador desde `tareas@alia-data.com`.
2. Verificar dueño, función y frecuencia.
3. Probar la ruta de notificación.
4. Conciliar por `message_id` toda la ventana.
5. Supervisar ejecuciones hasta cumplir el criterio de drenaje.
6. Registrar GO final.

---

## 8. Secuencia corregida de rollback

Aplicable a cualquier falla posterior a B.1:

1. **STOP:** eliminar/desactivar el activador v3.
2. Confirmar que no hay ejecuciones activas.
3. Capturar logs, hojas técnicas, filas de negocio y estado Gmail.
4. Identificar mensajes parciales o con tareas ya escritas.
5. Poner esos mensajes en cuarentena por ID y quitar `INBOX`.
6. Verificar que el script antiguo no podrá encontrarlos.
7. Restaurar el snapshot completo: archivos, manifiesto y configuración necesaria.
8. Verificar que no queden módulos v3 residuales.
9. Ejecutar preflight seguro de la versión restaurada.
10. Recrear el activador con `tareas@alia-data.com`.
11. Supervisar la primera ejecución productiva restaurada.
12. Conciliar los mensajes acumulados durante la caída.
13. Resolver manualmente la cuarentena.
14. Rotar credenciales si la causa involucró exposición.
15. Firmar el cierre del incidente y no reintentar v3 hasta corregir y volver a aprobar.

---

## 9. Checklist de salida de NO-GO

No fijar `FECHA_INICIO_CORTE` hasta completar todos:

- [ ] Fórmulas exactas versionadas y probadas desde el repositorio.
- [ ] `Registro Migración Histórica` materializado como lote inmutable y protegido.
- [ ] Orden de dependencia `Resumen Actividades` → `Registro Migración Histórica` corregido.
- [ ] Runbook B.11 completo, ensayado y reubicado antes de escrituras v3.
- [ ] `FECHA_INICIO_CORTE` obligatoria en producción y con formato inequívoco.
- [ ] Conciliación por `message_id` implementada.
- [ ] Contradicción sobre el log de mensajes pre-corte resuelta.
- [ ] `preflightDespliegue()` valida cuenta, hojas, encabezados, etiquetas, permisos y corte.
- [ ] Ruta real de alertas hacia Carlos probada extremo a extremo.
- [ ] `CUENTA_ALERTAS` implementada o marcada como informativa.
- [ ] `appsscript.json` v3 versionado con todos los servicios y alcances.
- [ ] Release 3.0.0 limpio, commiteado y con hashes.
- [ ] Backup completo del proyecto y restauración exacta verificados.
- [ ] Cuarentena previa al rollback documentada.
- [ ] Simulacro de rollback completo aprobado.
- [ ] Canary aislado por `message_id` y prueba de idempotencia definidos.
- [ ] Protecciones de hojas técnicas aplicadas y probadas.
- [ ] Encabezados confirmados: `Log Mensajes` 27, `Registro Tareas` 16, `Indice Idempotencia` 4.
- [ ] `auditoria/ACTA_DESPLIEGUE.md` preparada.
- [ ] Responsable GO/NO-GO, RTO y umbrales de rollback definidos.

---

## 10. Veredicto final

El plan tiene una base conceptual sólida, pero **no debe ejecutarse todavía**. La mayor debilidad no es `FECHA_INICIO_CORTE` pendiente: es que varias garantías centrales —reversión a la versión antigua, no duplicación durante rollback, trazabilidad del corte, alertas externas y saneamiento histórico— no son realizables con los pasos actuales.

La recomendación es cerrar primero los bloqueantes BLQ-01 a BLQ-07, actualizar ambos procedimientos y ejecutar un simulacro integral. Solo después corresponde fijar la ventana de corte y solicitar el GO de producción.
