# Automatización de pruebas de integración de Fase 8 — Fase 2A (MVP)

**Fecha:** 23/07/2026
**Primer piloto real aprobado:** 24/07/2026
**Elaborado por:** Claude Cowork
**Origen:** pedido de Carlos Rubén Bageta de automatizar, dentro del proyecto de Apps Script de prueba, la ejecución de un caso de integración de Fase 8 de punta a punta (Gmail → IA → Sheets → Gmail), con autorización separada de la ejecución formal.
**Código asociado:** `pruebas/fixtures_integracion_fase8.gs`, `pruebas/automatizador_integracion_fase8.gs`, `pruebas/pruebas_automatizador_integracion_fase8.gs`, y la refacción mínima de `codigo/script_refactorizado.gs`.
**Registro del cambio:** `auditoria/CHANGELOG.md`, entradas "Fase 2A MVP: automatizador de integración de Fase 8" y "Ampliación incremental del automatizador de integración: fixture INT-FASE8-02-DOS-TAREAS (CP-03)".

---

## 1. Alcance de la Fase 2A

Automatiza, dentro del proyecto de Apps Script de **prueba**:

- preparación del caso (marcador único, asunto y cuerpo a enviar);
- parametrización segura **en memoria** (un `cfg` clonado, nunca ScriptProperties);
- simulación `DRY_RUN` y verificación de cero cambios;
- autorización **separada** de la ejecución formal (dos invocaciones distintas);
- ejecución formal (`DRY_RUN=false` solo en memoria);
- comprobación automática de `Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`, hojas de negocio y Gmail.

**No** automatiza (queda para Fase 3): el envío del correo desde la cuenta externa. En Fase 2A el mensaje se envía **manualmente** desde el remitente del fixture (piloto: `sichar@gmail.com`) a la cuenta Workspace de prueba.

Este automatizador **no reemplaza** el criterio humano de aprobación de un caso de prueba: automatiza la mecánica y las comprobaciones, pero la decisión de marcar un CP como Aprobado sigue siendo de Carlos Rubén Bageta, sobre la evidencia que el automatizador conserva.

## 2. Regla de seguridad principal: sin snapshot/restore de propiedades

El automatizador **nunca** modifica temporalmente ScriptProperties de ejecución (`DRY_RUN`, `GMAIL_QUERY_PRUEBA`, permisos, etc.) ni implementa snapshot/restore. Motivo: un timeout de Apps Script puede interrumpir la ejecución antes de un `finally`, dejando una configuración peligrosa **persistida** (por ejemplo, `DRY_RUN=false` o `PERMITIR_ARCHIVADO=true` en una planilla equivocada).

En su lugar, toda la parametrización vive en un `cfg` clonado en memoria (sección 5). Como nunca se escribe configuración, un timeout no puede dejar un estado inseguro persistido: la configuración base del proyecto de prueba (`DRY_RUN=true`, permisos conservadores) permanece intacta pase lo que pase.

## 3. Refacción mínima del pipeline y su justificación (`codigo/script_refactorizado.gs`)

Para reutilizar el pipeline real sin duplicarlo, se extrajo de `procesarCorreosDeTareas()` un núcleo privado:

```
procesarCorreosDeTareasConConfiguracion_(cfg, opciones)
```

- El núcleo **no** adquiere el `ScriptLock` ni lee `ScriptProperties`: recibe un `cfg` ya validado y unas `opciones`.
- `opciones.omitirRecuperacion` (boolean): cuando es `true`, no ejecuta `recuperarProcesamientosAbandonados()`, aunque `cfg.dryRun` sea `false`. Lo usa el automatizador E2E, que procesa un único mensaje recién enviado y no debe arrastrar mensajes abandonados de otras corridas.
- `procesarCorreosDeTareas()` **conserva su firma y comportamiento externo**: adquiere el `ScriptLock`, llama a `validarConfiguracion()` y delega en el núcleo con `opciones={}` — lo que preserva la recuperación de abandonados en producción (se ejecuta salvo en `DRY_RUN`, igual que antes).

**Por qué era técnicamente necesario tocar `codigo/*.gs`:** el requisito explícito es reutilizar `procesarUnMensaje()`, `obtenerMensajesPendientesDesdeGmail()` y la lógica de escritura sin duplicarlas, y a la vez que el automatizador controle el lock, la recuperación y el `cfg`. La única forma de lograr ambas cosas sin copiar la lógica del bucle era extraer ese bucle a una función invocable con un `cfg` en memoria. La extracción es puramente estructural: el cuerpo del bucle es idéntico al anterior; solo se movió, y se agregó el gate `omitirRecuperacion`. La prueba K4 (`pruebas/pruebas_automatizador_integracion_fase8.gs`) confirma que la producción conserva exactamente la recuperación de abandonados, y K1–K3 verifican el nuevo gate. No se duplicó ninguna función del pipeline (verificado además por `grep` estático).

## 4. Barreras fail-closed

Antes de cualquier acceso o mutación, el automatizador exige (si algo falla, aborta y **no** toca nada):

- `MODO_PRUEBA` exactamente `"true"` y `DRY_RUN` base exactamente `"true"`.
- `ScriptApp.getScriptId()` exactamente igual al proyecto de prueba autorizado (constante `INTEGRACION_SCRIPT_ID_AUTORIZADO`; ver sección 7, paso 0).
- `Session.getEffectiveUser().getEmail()` igual a la cuenta autorizada (`carlosrubenbageta@alia-data.com`).
- `SPREADSHEET_ID_PRUEBA` presente, distinto de `SPREADSHEET_ID` y exactamente `1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o`.
- `ETIQUETA_PRUEBA` exactamente `Pruebas-Automatizacion`.
- Validación por `Gmail.Users.Labels.list` **y** `Gmail.Users.Labels.get` de que los IDs configurados (`ID_ETIQUETA_*`) correspondan exactamente a los nombres `Procesado`, `Revisión manual/Sin tareas detectadas`, `Revisión manual/Error de procesamiento`, `Revisión manual/Error de automatización`.
- Consulta Gmail construida **internamente** (nunca libre): `in:inbox label:"Pruebas-Automatizacion" "<marcador>"`. Se consultan como máximo dos resultados y se exige exactamente uno.
- Verificación **independiente** del mensaje encontrado: asunto exacto; **contenido exacto tras canonicalizar envolturas de transporte** (CRLF/CR, espacios finales y saltos finales; un LF simple introducido dentro del mismo párrafo equivale a un espacio, mientras dos o más LF conservan el límite de párrafo; palabras, firmas y contenido adicional siguen rechazándose; el cuerpo no se registra); **remitente exacto** (dirección extraída y normalizada del encabezado `From`, igualdad case-insensitive — no se acepta la dirección como subcadena ni solo en el nombre visible); INBOX presente; etiqueta de prueba presente.
- **Versión de prompt:** `VERSION_PROMPT_SISTEMA` debe satisfacer `fixture.versionPromptMinima` según el orden autocontenido `ORDEN_VERSIONES_PROMPT_INTEGRACION`; una versión desconocida o inferior aborta **sin llamar al núcleo/OpenAI**.
- **Resultado del núcleo comprobable:** el núcleo devuelve un resumen estructurado; la simulación y la formal exigen exactamente 1 mensaje elegible, 1 message_id intentado y que sea el preparado. Un resumen `undefined`, cero mensajes o un id distinto aborta fail-closed (una simulación que no procesó el mensaje no genera `SIMULACION_OK`).
- Aborto si el `message_id` ya aparece en `Log Mensajes`, `Registro Tareas`, `Indice Idempotencia` o un manifiesto. Estas lecturas (y las del baseline y la verificación) son **fail-closed**: un fallo de lectura aborta con una categoría cerrada (`LECTURA_PREEXISTENCIA_FALLIDA`, `LECTURA_BASELINE_FALLIDA`), nunca se interpreta como "no existe".
- Aborto si no se obtiene el `ScriptLock`.
- Aborto si existe otra sesión E2E pendiente (hay que cancelarla primero).
- Aborto si existe un activador de `procesarCorreosDeTareas` que pueda competir durante la prueba.
- **Baseline real:** por cada una de las tres hojas técnicas **y** las cinco hojas de negocio de `TABLEROS_VALIDOS` se hashea el contenido de **valores y fórmulas** (no solo la cantidad de filas), más el conjunto de etiquetas del mensaje; solo se retienen hashes y conteos. En DRY_RUN cualquier cambio de valor, fórmula, fila o etiqueta impide `SIMULACION_OK`; entre la simulación y la formal, un baseline distinto aborta la formal; y en la formal SIN_TAREAS se verifica que las cinco hojas de negocio queden idénticas al baseline.
- **Encabezados obligatorios:** la verificación formal aborta explícitamente (`ENCABEZADO_AUSENTE:...`) si falta cualquier encabezado requerido de Log Mensajes / Registro Tareas / Indice Idempotencia — nunca convierte un encabezado ausente en cero filas o en una comprobación omitida.

## 5. `cfg` en memoria

Se parte de `validarConfiguracion()` (que ya exige modo prueba y `DRY_RUN=true`), se **clona** el `cfg` (incluido el subobjeto `idsEtiquetas`) y se sobrescriben **solo en memoria**:

| Campo | Valor en memoria | Motivo |
|---|---|---|
| `gmailQueryEfectiva` | `in:inbox label:"Pruebas-Automatizacion" "<marcador>"` | Aísla el caso a un único mensaje. |
| `dryRun` | `true` (simular) / `false` (formal) | El único lugar donde `dryRun` cambia. |
| `permitirEtiquetado` | `true` | El resultado esperado del piloto es `SOLO_ETIQUETADO`. |
| `permitirArchivado` | `false` | Nunca archivar el mensaje de prueba. |
| `maxMensajesPorEjecucion` | `1` | Un único mensaje por corrida. |
| `maxMensajesBusqueda` | `2` | Como máximo dos resultados en la búsqueda. |
| `fechaInicioCorte` | `null` | Sin filtro de antigüedad: la query por marcador ya acota. |

Nunca se escriben estos valores en `PropertiesService` (verificado por la prueba I5).

## 6. Catálogo de fixtures y selección (`AUTO_FASE8_CASO`)

`pruebas/fixtures_integracion_fase8.gs` declara `FIXTURES_INTEGRACION_FASE8`, el catálogo de casos sintéticos de integración de punta a punta. Cada uno declara el asunto/cuerpo a enviar, la versión mínima de prompt requerida y la forma exacta del resultado esperado (`esperado`), por nombre de campo/etiqueta.

| `id` | Equivalente a | Resultado esperado |
|---|---|---|
| `INT-FASE8-01-INFORMATIVO` | CP-05 | Correo completamente informativo: `SIN_TAREAS`, 0 observaciones, 0 tareas, `observaciones: []`; Gmail recibe `Revisión manual/Sin tareas detectadas`. **Piloto real aprobado (24/07/2026).** |
| `INT-FASE8-02-DOS-TAREAS` | CP-03 | Una única observación con dos acciones concretas: `PROCESADO`, 1 observación, 2 tareas (`Desarrollo IT` + `Comercial`) que comparten el mismo `observacion_texto_original`; Gmail recibe `Procesado`. **CP-03 Aprobado (24/07/2026)**, tras tres corridas reales previas que expusieron y permitieron corregir dos falsos negativos del verificador y una ambigüedad del fixture (secciones 9.1.1 a 9.1.3). |
| `INT-FASE8-04-TRES-TAREAS` | CP-04 | Una única observación con tres acciones concretas: `PROCESADO`, 1 observación, 3 tareas (`Desarrollo IT` + `Finanzas` + `Comercial`) que comparten el mismo `observacion_texto_original`; Gmail recibe `Procesado`. Reutiliza `verificarResultadoFormal_()`/`verificarClasificacionSimulada_()` sin ningún cambio de código (ya generalizados a N tareas por CP-03). **CP-04 Aprobado (24/07/2026)**, tras una corrida real previa que expuso y permitió corregir una ambigüedad del fixture (sección 9.2.1). |
| `INT-FASE8-05-OBSERVACIONES-DUPLICADAS` | CP-15 | El mismo pedido repetido dos veces sin marcador de cita: `PROCESADO`, 1 observación, 1 tarea (`Finanzas`) consolidada por RF-04 (`documentacion/REGLAS_FUNCIONALES.md`). Primera prueba real de la generalización N-tareas en N=1, y primera prueba de RF-04 en un fixture real de este automatizador. **CP-15 Aprobado (24/07/2026)**, al primer intento, sin necesitar ajuste de redacción (sección 9.3.1). |
| `INT-FASE8-06-FIRMA-EXTENSA` | CP-14 | Una consulta real breve seguida de una firma de correo y un aviso legal extenso (~15 líneas): `PROCESADO`, 1 observación, 1 tarea (`Gestión General`), sin ninguna tarea fabricada desde la firma/aviso legal (regla explícita del prompt, `codigo/prompts_ia.gs`). Primer fixture con cuerpo multi-párrafo (consulta + firma). **CP-14 Aprobado (24/07/2026)**, al primer intento, sin necesitar ajuste (sección 9.4.1). |
| `INT-FASE8-07-CUERPO-VACIO` | CP-16 | Equivalente a FC-07 (`pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`): una respuesta que solo contiene una cita ("El ... escribió:" + línea citada con `>`), sin ningún texto propio antes. Tras `extraerContenidoNuevo()` el contenido queda vacío, y `evaluarFiltroDeterministico()` (regla 6) lo rechaza como `RevisionSinTareas` **antes** de invocar a la IA: `SIN_TAREAS`, 0 observaciones, 0 tareas. Primer fixture cuyo rechazo es determinístico (filtro), no una clasificación de la IA — la corrida real de este caso **no generó ninguna llamada a OpenAI**. Reutiliza `efectoFormalSinTareasCorrecto_` sin ningún cambio de código. **CP-16 Aprobado (24/07/2026)**, en el segundo intento — el primero expuso y permitió corregir una brecha de `verificarClasificacionSimulada_()` (nunca del pipeline productivo, sección 9.5.1). |

La propiedad `AUTO_FASE8_CASO` (`ScriptProperties` del proyecto de prueba) selecciona el fixture activo por `id`; si está ausente, se usa `FIXTURE_INTEGRACION_POR_DEFECTO` (`INT-FASE8-01-INFORMATIVO`). El automatizador **solo lee** esta propiedad — nunca la escribe ni modifica ninguna otra propiedad de configuración productiva. Para ejecutar el caso de CP-03, configurar `AUTO_FASE8_CASO=INT-FASE8-02-DOS-TAREAS`; para CP-04, `AUTO_FASE8_CASO=INT-FASE8-04-TRES-TAREAS`; para CP-16, `AUTO_FASE8_CASO=INT-FASE8-07-CUERPO-VACIO`; en todos los casos, antes de llamar a `prepararCasoIntegracionFase8Visible()` (ver procedimiento, sección 9).

## 7. Verificación del resultado formal: caso sin tareas vs. caso con tareas

`verificarResultadoFormal_()` se generalizó (24/07/2026, CP-03/`INT-FASE8-02-DOS-TAREAS`) para admitir fixtures con una o más tareas, activado por el campo `fixture.esperado.tareasEsperadas` (arreglo de `{tablero}`, uno por tarea esperada):

- **Sin `tareasEsperadas`** (como `INT-FASE8-01-INFORMATIVO`): comportamiento **idéntico** al previo a esta ampliación — se exigen 0 filas en `Registro Tareas` y las cinco hojas de negocio de `TABLEROS_VALIDOS` idénticas al baseline.
- **Con `tareasEsperadas`** (como `INT-FASE8-02-DOS-TAREAS` y futuros fixtures con tareas):
  - **`Registro Tareas`:** exactamente N filas para el `message_id`; `task_id` no vacío y distinto en cada fila; `estado_escritura=ESCRITA`; el multiset de `tablero` coincide exactamente con `tareasEsperadas` (detecta un tablero faltante, adicional o duplicado en una sola comparación); `observacion_texto_original` no vacío e idéntico entre todas las filas del mismo mensaje — nunca se registra su contenido, solo si coincide o diverge.
  - **`Indice Idempotencia`:** exactamente N entradas cuyo conjunto de `task_id` coincide exactamente (sin duplicados) con el manifiesto de `Registro Tareas`, todas con el `estado_final` esperado.
  - **Hojas de negocio (`TABLEROS_VALIDOS`):** un tablero sin tareas esperadas debe seguir idéntico al baseline (igual que antes); un tablero con tareas esperadas debe tener exactamente `filas del baseline + tareas esperadas para ese tablero`, con las filas previas al baseline exactamente intactas (comparación de prefijo) y las filas nuevas vinculadas por la columna `ID` a los `task_id` del manifiesto de ese tablero — ni de más ni de menos.
  - Todo por **nombre de encabezado** (nunca número de columna fijo), incluida la columna `ID` de las hojas de negocio (`documentacion/MAPA_COLUMNAS.md`).

`capturarBaseline_()` retiene, además del hash agregado (lo único que se persiste en `sesion.hashBaseline` y se registra en logs), el contenido crudo (`valores`) de cada hoja **únicamente en memoria del proceso en curso** — necesario para la comparación de prefijo, nunca serializado a `UserProperties` ni a logs.

### 7.1. Detección de la fila real de encabezados de una hoja de negocio

**Falso negativo real corregido (24/07/2026, `messageId 19f948e5d35b5276`):** la primera versión de esta verificación asumía que los encabezados de una hoja de negocio estaban en la fila 1 (`contenido.valores[0]`). Las hojas reales `Comercial` y `Desarrollo IT` tienen un **preámbulo** antes de los encabezados — título en fila 1, fila auxiliar en fila 2, fila vacía en fila 3, encabezados recién en fila 4 —, por lo que la columna `ID` nunca se encontraba y la verificación abortaba con `ENCABEZADO_AUSENTE` aunque el pipeline hubiera escrito las filas correctamente: un **falso negativo del verificador**, no un defecto del pipeline real.

`localizarFilaEncabezadosNegocio_()` corrige esto: busca, sin asumir ningún número de fila fijo, la **única** fila del baseline (`base.valores`, previo a la ejecución formal) que contiene, como mínimo, los 7 encabezados exactos `ID`, `Fecha de entrada`, `Fuente`, `Grupo origen`, `Remitente`, `Asunto original`, `Resumen de tarea`. Fail-closed: si no hay ninguna fila candidata (`FILA_ENCABEZADOS_NEGOCIO_AUSENTE:<tablero>`) o hay más de una (`FILA_ENCABEZADOS_NEGOCIO_AMBIGUA:<tablero>`), la verificación aborta y **nunca declara `FORMAL_OK`**. Una vez localizada, esa fila determina el índice de la columna `ID` usado para vincular las filas nuevas con los `task_id` del manifiesto (sección 7). Esta detección es compatible tanto con una hoja que tiene el preámbulo real (encabezados en cualquier fila) como con una que no lo tiene (encabezados en la fila 1).

### 7.2. Verificación de la clasificación simulada (antes de autorizar la formal)

**Falso negativo real corregido (24/07/2026, `messageId 19f94b94245ce658`):** hasta esta corrección, `simularYVerificar_()` solo comprobaba hechos de proceso del núcleo (`verificarResumenNucleo_()`: exactamente un mensaje elegible, un intentado, el `message_id` correcto) — nunca comparaba **qué clasificó realmente la IA** contra lo que el fixture exige. Una simulación podía declarar `SIMULACION_OK` aunque la IA hubiera clasificado las tareas en tableros distintos de los esperados por el fixture (en el caso real: `Desarrollo IT` + `Soporte` en lugar de `Desarrollo IT` + `Comercial`), porque esa discrepancia semántica nunca se verificaba antes de la formal, y la comparación por tablero de la sección 7 solo se ejecuta **dentro** de la formal — que en este caso nunca llegó a correr.

Dos cambios cierran esta brecha:

- **`codigo/script_refactorizado.gs` (núcleo, cambio mínimo e imprescindible):** `procesarUnMensajeSimulado()` ahora **retorna** `{ resultado, cantidadObservaciones, cantidadTareas, tableros }` además de sus logs `[DRY_RUN]` existentes (sin cambiarlos); `procesarUnMensaje()` propaga ese retorno solo en la rama `DRY_RUN`; `procesarCorreosDeTareasConConfiguracion_()` acumula esos retornos en un nuevo campo `resultadosSimulados` de su resumen (vacío en producción, donde `procesarUnMensaje()` no devuelve nada). `procesarCorreosDeTareas()` (producción) no cambia: sigue ignorando el resumen completo. Este es el único cambio en `codigo/` de toda esta corrección, y fue imprescindible porque no existía ninguna otra vía para obtener la clasificación de forma estructurada y segura sin parsear texto de `Logger`.
- **`pruebas/automatizador_integracion_fase8.gs` (automatizador):** `verificarClasificacionSimulada_(resumen, fixture)` compara, contra `fixture.esperado`, la cantidad de observaciones (`cantidad_observaciones`), la cantidad de tareas (`cantidad_tareas`) y el **multiset** de tablero (derivado de `esperado.tareasEsperadas`, ordenado antes de comparar — detecta un tablero faltante, adicional o duplicado en una sola comparación, igual que la verificación formal de la sección 7). `simularYVerificar_()` invoca esta verificación inmediatamente después de `verificarResumenNucleo_()` y, ante cualquier discrepancia, retorna `{ok: false, etapa: 'SIMULAR', errores: [...]}` **sin tocar `sesion`** — el estado permanece en `PREPARADO`, exactamente como cualquier otro fallo de simulación, por lo que `ejecutarFormalYVerificar_()` sigue exigiendo `SIMULACION_OK` (`SIN_SIMULACION_OK`) y la ejecución formal queda bloqueada. Categorías cerradas emitidas: `SIMULACION_SIN_RESULTADO_CLASIFICADO`, `SIMULACION_CANTIDAD_OBSERVACIONES:<valor>`, `SIMULACION_CANTIDAD_TAREAS:<valor>`, `SIMULACION_TABLEROS_NO_COINCIDEN`. Nunca se registra el contenido de `resumen`/`tableros` como texto libre: solo estas categorías y los conteos ya numéricos.

Esta verificación es puramente estructural (cantidades y nombres de tablero, ya públicos como valores de catálogo) — no reemplaza ni duplica la comparación por nombre de columna de `Registro Tareas`/hojas de negocio de la sección 7, que sigue siendo la verificación autorizada de lo que realmente se escribió en la formal.

**Refinamiento (24/07/2026, `INT-FASE8-07-CUERPO-VACIO`/CP-16, `messageId 19f9661d038ea8de`, ver sección 9.5.1):** `procesarUnMensajeSimulado()` devuelve `cantidadObservaciones`/`cantidadTareas` en `null` (nunca `0`) para las tres categorías en las que el mensaje nunca llega a una clasificación real de la IA (`NO_ELEGIBLE`: filtro determinístico; `RESPUESTA_IA_INVALIDA`; `REQUIERE_REVISION`) — distinto de `SIN_TAREAS`, que sí clasifica (aunque con cero tareas). Un fixture cuyo resultado real es una de esas tres categorías declara `esperado.resultadoSimulado` con ese valor exacto; `verificarClasificacionSimulada_()` entonces exige que `datos.resultado` coincida y que `cantidadObservaciones`/`cantidadTareas`/`tableros` sean `null`/`null`/`[]`, en vez de la comparación numérica genérica (pensada para `SIN_TAREAS`/`TAREAS_SIMULADAS`). Categoría cerrada adicional: `SIMULACION_RESULTADO_NO_COINCIDE:<valor>`. Ausente ese campo (los seis fixtures anteriores), el comportamiento es idéntico al previo a este refinamiento.

## 8. Flujo en dos invocaciones (autorización separada)

1. **`prepararCasoIntegracionFase8Visible()`** — genera `run_id` y marcador únicos, guarda estado no sensible en `UserProperties` (estado `PREPARADO`) y devuelve el **asunto y cuerpo sintéticos** que el tester debe enviar. No accede a Gmail ni Sheets.
2. *(manual)* El tester envía el correo desde el remitente del fixture, se asegura de que reciba la etiqueta `Pruebas-Automatizacion` (por filtro o manualmente) y quede en Recibidos.
3. **`simularYVerificarCasoIntegracionFase8Visible()`** — ejecuta todas las barreras (incluidas cuerpo, remitente exacto y versión de prompt), localiza el mensaje, corre el pipeline en `DRY_RUN` (un único mensaje, omitiendo recuperación), exige que el resumen del núcleo confirme que se intentó exactamente el mensaje preparado, exige que la clasificación obtenida (cantidad de observaciones, cantidad de tareas y multiset de tablero) coincida con `fixture.esperado` (`verificarClasificacionSimulada_()`, sección 7.2), comprueba **cero cambios** en Gmail y Sheets, y solo entonces guarda en `UserProperties`: `run_id`, `message_id`, fingerprint **completo** de fixture/cfg, hash del baseline, estado `SIMULACION_OK` y un **nonce**. No autoriza automáticamente la ejecución formal.
4. **`ejecutarFormalYVerificarCasoIntegracionFase8Visible()`** — exige una sesión `SIMULACION_OK` para el mismo `message_id`, nonce y fingerprint sin cambios, vuelve a ejecutar todas las barreras, exige que el baseline no haya cambiado, **persiste `FORMAL_EN_CURSO` justo antes del pipeline** (resistente a timeout), corre el pipeline formal (`dryRun=false` solo en memoria, un único mensaje, omitiendo recuperación), exige el resumen del núcleo, verifica automáticamente el resultado y **conserva** filas y etiquetas como evidencia. Si se captura una excepción, deja la sesión en `FORMAL_FALLIDO` (evidencia intacta). Si un timeout duro interrumpe la ejecución, la sesión queda en `FORMAL_EN_CURSO`, que **bloquea toda reejecución automática** hasta revisión humana. Nunca limpia Gmail, Sheets ni idempotencia.

**Fingerprint completo:** cubre id, asunto base, cuerpo, remitente, versión de prompt y el objeto esperado completo del fixture, además del cfg controlado (menos `dryRun`, que cambia legítimamente entre simulación y formal). Un cambio en el cuerpo o en las expectativas entre simulación y formal bloquea la ejecución formal.

Funciones auxiliares visibles: **`mostrarEstadoCasoIntegracionFase8Visible()`** — **deliberadamente de solo lectura**: solo lee el estado de sesión de `UserProperties`, no accede a Gmail/Sheets/OpenAI/pipeline ni muta nada, por lo que no aplica las barreras fail-closed (no hay acceso ni mutación que proteger). **`cancelarSesionIntegracionFase8Visible()`** — verifica proyecto y cuenta autorizados **antes** de borrar el estado de sesión (para que un proyecto/cuenta no autorizados no puedan eliminar una `FORMAL_EN_CURSO` pendiente de revisión); nunca toca Gmail/Sheets/idempotencia.

La selección del fixture se lee de la propiedad `AUTO_FASE8_CASO` (o el fixture por defecto). El automatizador **no** cambia ninguna propiedad de configuración productiva; solo lee esa propiedad.

**Reinicio tras un `FORMAL_EN_CURSO`:** si una corrida formal quedó en `FORMAL_EN_CURSO` (timeout duro), primero **revisar la evidencia real** (`Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`, hojas de negocio y Gmail del `message_id` de la sesión) para saber hasta dónde llegó el pipeline; recién después de esa revisión, ejecutar `cancelarSesionIntegracionFase8Visible()` (desde el proyecto/cuenta autorizados) para desbloquear y poder preparar un caso nuevo. Nunca se borra la evidencia de Gmail/Sheets/idempotencia: cancelar solo limpia el estado de sesión del automatizador.

## 9. Procedimiento de la primera corrida del piloto

0. **Una sola vez:** completar en `pruebas/automatizador_integracion_fase8.gs` la constante `INTEGRACION_SCRIPT_ID_AUTORIZADO` con el Script ID real del proyecto de Apps Script de prueba (editor → Configuración del proyecto → "ID de secuencia de comandos"). Mientras contenga el centinela, el automatizador se niega a ejecutarse (barrera fail-closed A9).
1. Copiar al proyecto de Apps Script de **prueba** (nunca al productivo): `codigo/script_refactorizado.gs` (por la refacción del núcleo), `pruebas/fixtures_integracion_fase8.gs` y `pruebas/automatizador_integracion_fase8.gs`. Opcional (solo para correr la suite determinista dentro de Apps Script): `pruebas/pruebas_automatizador_integracion_fase8.gs`.
2. Confirmar en las propiedades del script de prueba: `MODO_PRUEBA="true"`, `DRY_RUN="true"`, `SPREADSHEET_ID_PRUEBA=1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o`, `ETIQUETA_PRUEBA="Pruebas-Automatizacion"`, y los cuatro `ID_ETIQUETA_*` correctos. Verificar que **no** haya un activador de `procesarCorreosDeTareas` habilitado durante la prueba.
3. Ejecutar `prepararCasoIntegracionFase8Visible()`. Anotar el asunto y el cuerpo devueltos.
4. Desde `sichar@gmail.com`, enviar a la cuenta de prueba un correo con **exactamente** ese asunto y ese contenido (el automatizador canonicaliza únicamente diferencias de transporte: CRLF/CR, espacios finales, saltos finales y LF simples introducidos dentro de un mismo párrafo en lugar de un espacio). Los límites de párrafo se preservan; palabras distintas, frases o firmas adicionales y cambios de párrafo provocan `CUERPO_NO_COINCIDE`. No pegar firmas ni contenido adicional. Asegurarse de que reciba la etiqueta `Pruebas-Automatizacion` y quede en Recibidos.
5. Ejecutar `simularYVerificarCasoIntegracionFase8Visible()`. Debe informar `SIMULACION_OK` sin cambios en Gmail/Sheets.
6. Revisar el resultado; si es correcto, ejecutar `ejecutarFormalYVerificarCasoIntegracionFase8Visible()`. Debe informar `FORMAL_OK`.
7. La ejecución formal **sí** realiza una llamada real a OpenAI (costo del orden de la de una corrida del evaluador de IA, ~USD 0,0005) y etiqueta el mensaje real. La evidencia (fila en `Log Mensajes`, entrada en `Indice Idempotencia`, etiqueta en Gmail) queda conservada para que Carlos Rubén Bageta la revise.

**Aserciones del piloto (INT-FASE8-01, equivalente a CP-05).** Dry-run: exactamente un mensaje elegible; cero cambios en Gmail y en las tres hojas técnicas y de negocio. Formal: `Log Mensajes` con una fila para el `message_id`, `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones=0`, `cantidad_tareas=0`, `resultado_gmail=SOLO_ETIQUETADO` (la columna `error` puede estar no vacía porque contiene `motivo_sin_tareas`, que el automatizador **no** registra en logs); `Registro Tareas` con cero filas; `Indice Idempotencia` con exactamente una entrada, `task_id` vacío, `estado_final=SIN_TAREAS`; Gmail conserva `Pruebas-Automatizacion` e `INBOX`, recibe `Revisión manual/Sin tareas detectadas`, no recibe `Procesado` ni etiquetas de error, no se archiva.

### 9.1. Procedimiento para CP-03 (`INT-FASE8-02-DOS-TAREAS`)

**CP-03 Aprobado — 24/07/2026** (ver sección 9.1.4). El procedimiento que llevó a esa corrida (pasos 0-6 de arriba), con dos diferencias:

- Antes del paso 3 (`prepararCasoIntegracionFase8Visible()`), configurar en el proyecto de prueba la propiedad `AUTO_FASE8_CASO=INT-FASE8-02-DOS-TAREAS` (sección 6).
- El asunto/cuerpo a enviar (paso 4) serán los de este fixture: `[PRUEBA-AUTOMATIZACION][INTEGRACION] Error de facturación del cliente [<marcador>]` con el cuerpo "El error de facturación del cliente todavía no fue resuelto: hace falta que el equipo técnico lo revise y que, apenas quede resuelto, el equipo comercial le avise al cliente." — un único párrafo, sin línea en blanco. (Redacción ajustada dos veces el 24/07/2026: sección 9.1.2 nombra explícitamente al "equipo comercial"; sección 9.1.3 ancla el error de facturación como un único tema en vez de dos pedidos paralelos.)

**Aserciones del piloto (INT-FASE8-02, equivalente a CP-03).** Dry-run: exactamente un mensaje elegible; cero cambios en Gmail y en las ocho hojas (técnicas y de negocio). Formal: `Log Mensajes` con una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=2`, `resultado_gmail=SOLO_ETIQUETADO`; `Registro Tareas` con exactamente 2 filas para el `message_id` (`task_id` no vacío y distinto en cada una, `estado_escritura=ESCRITA`, tableros exactamente `Desarrollo IT` y `Comercial`, mismo `observacion_texto_original` en ambas); `Indice Idempotencia` con exactamente 2 entradas (`estado_final=PROCESADO`), cuyos `task_id` coinciden exactamente con los de `Registro Tareas`; una fila nueva en `Desarrollo IT` y una en `Comercial` (vinculadas por `ID` a esos `task_id`); `Finanzas`, `Soporte` y `Gestión General` sin cambios; Gmail conserva `Pruebas-Automatizacion` e `INBOX`, recibe `Procesado`, no recibe etiquetas de revisión/error, no se archiva.

Tras una corrida real satisfactoria, la aprobación de CP-03 (si corresponde) se registra por separado en `pruebas/CASOS_DE_PRUEBA.md`/`pruebas/resultados/RESULTADOS_FASE_8.md`, con el mismo criterio humano de revisión que el resto de los casos de prueba — este automatizador no aprueba casos por sí solo.

#### 9.1.1. Primer intento real (24/07/2026) — falso negativo del verificador, evidencia conservada

```text
runId: 5fbcd128-04a8-4fc8-88a7-78aa279ebd10
messageId: 19f948e5d35b5276
simulación: SIMULACION_OK
formal: FORMAL_FALLIDO (falso negativo del verificador — ver más abajo)
```

La simulación aprobó y la ejecución formal **procesó el mensaje correctamente** (1 mensaje intentado, pipeline ejecutado), pero `verificarResultadoFormal_()` reportó `FORMAL_FALLIDO` con `errores=ENCABEZADO_AUSENTE:Comercial:ID, ENCABEZADO_AUSENTE:Desarrollo IT:ID`. La causa fue un defecto del propio verificador (sección 7.1): asumía que los encabezados de una hoja de negocio estaban en la fila 1, y las hojas reales `Comercial`/`Desarrollo IT` tienen un preámbulo que los corre a la fila 4. **No hay evidencia de que el pipeline haya fallado** — el falso negativo fue exclusivamente de la verificación automática.

Esta evidencia se conserva íntegra y **no se vuelve a ejecutar este `message_id`**; tampoco se reclasifica como aprobado. La corrección (`localizarFilaEncabezadosNegocio_()`, sección 7.1) ya está aplicada; CP-03 requiere una **corrida real nueva completa** (`SIMULACION_OK` + `FORMAL_OK`), con un `message_id` distinto, para poder evaluarse.

#### 9.1.2. Segundo intento real (24/07/2026) — falso negativo de clasificación, evidencia conservada

```text
runId: 3b2883e9-5f26-4269-a3c1-1cbe4d14a7ed
messageId: 19f94b94245ce658
simulación: SIMULACION_OK (falso negativo — ver más abajo)
formal: no ejecutada
```

La simulación clasificó 1 observación y 2 tareas, pero en los tableros `Desarrollo IT`/`Alto` y `Soporte`/`Medio` — CP-03 exige `Desarrollo IT` y `Comercial`. El automatizador informó `SIMULACION_OK` pese a la discrepancia semántica, porque hasta esa corrida `simularYVerificar_()` no comparaba la clasificación obtenida contra `fixture.esperado` (sección 7.2): la única verificación existente (`verificarResumenNucleo_()`) confirma hechos de proceso (cuántos mensajes, cuál `message_id`), no qué clasificó la IA. La ejecución formal **no llegó a correr** — no hay evidencia de un defecto del pipeline, solo de una verificación de simulación incompleta.

La corrección (`verificarClasificacionSimulada_()`, sección 7.2) ya está aplicada, y el cuerpo del fixture se ajustó (sección 9.1) para nombrar explícitamente al "equipo comercial" y eliminar la ambigüedad que permitió esa clasificación. Esta evidencia se conserva íntegra y **no se vuelve a ejecutar este `message_id`**; tampoco se reclasifica como aprobado. CP-03 sigue requiriendo una **corrida real nueva completa** (`SIMULACION_OK` + `FORMAL_OK`), con un `message_id` distinto, para poder evaluarse — y esa nueva simulación deberá clasificar exactamente `Desarrollo IT` + `Comercial`: esta corrección **no** relaja el resultado exigido por CP-03 para aceptar `Soporte` en su lugar.

#### 9.1.3. Tercer intento real (24/07/2026) — 2 observaciones en vez de 1, bloqueado correctamente

```text
runId: d873deb0-3d57-49f7-a88f-e51ef70e12a7
messageId: 19f95060d93922fb
simulación: SIMULACION_FALLIDO (SIMULACION_CANTIDAD_OBSERVACIONES:2)
formal: no ejecutada (bloqueada correctamente)
```

Con el cuerpo ya corregido para nombrar al "equipo comercial" (sección 9.1.2), esta corrida clasificó correctamente los tableros (`Desarrollo IT/Alto`, `Comercial/Medio`), pero como **2 observaciones** en lugar de la 1 que exige CP-03. A diferencia de los dos hallazgos anteriores, esta vez `verificarClasificacionSimulada_()` (sección 7.2) **funcionó exactamente como estaba previsto**: detectó la discrepancia y bloqueó la ejecución formal, que nunca llegó a correr — no hay evidencia de ningún defecto nuevo del automatizador ni del núcleo, solo una redacción del fixture que todavía admitía una lectura de "dos pedidos" en lugar de "un tema con dos acciones".

El cuerpo se reescribió una vez más para anclar el error de facturación como un único tema del que se desprenden las dos acciones, conservando la mención a "equipo comercial". Esta evidencia se conserva íntegra y **no se vuelve a ejecutar este `message_id`**; tampoco se reclasifica como aprobado. CP-03 sigue requiriendo una **corrida real nueva completa** (`SIMULACION_OK` + `FORMAL_OK`), con un `message_id` distinto, para poder evaluarse.

#### 9.1.4. Cuarto intento real (24/07/2026) — corrida completa exitosa, CP-03 Aprobado

```text
runId: cceca797-90ec-4493-bfbc-f3a79ad3e782
messageId: 19f953e0047d2478 (nuevo)
simulación: SIMULACION_OK
formal: FORMAL_OK
```

Con la redacción final del cuerpo (sección 9.1.3) ya aplicada, esta corrida clasificó exactamente 1 observación / 2 tareas en `Desarrollo IT` y `Comercial` — coincide en su totalidad con lo que exige CP-03. `simularYVerificarCasoIntegracionFase8Visible()` informó `SIMULACION_OK`; `ejecutarFormalYVerificarCasoIntegracionFase8Visible()` informó `FORMAL_OK` sobre el mismo `runId`/`messageId`, sin re-preparar la sesión. `verificarResultadoFormal_()` confirmó automáticamente: `Log Mensajes` (`estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=2`, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` con exactamente 2 filas (`task_id` no vacío y distinto, `estado_escritura=ESCRITA`, tableros exactamente `Desarrollo IT` + `Comercial`, mismo `observacion_texto_original`); `Indice Idempotencia` con 2 entradas (`estado_final=PROCESADO`); una fila nueva en `Desarrollo IT` y una en `Comercial` vinculadas por `ID`; `Finanzas`, `Soporte` y `Gestión General` sin cambios; Gmail con `Procesado` aplicado, sin etiquetas de error/revisión, sin archivar.

**CP-03 pasa de Pendiente a Aprobado — 24/07/2026.** Detalle completo en `pruebas/CASOS_DE_PRUEBA.md` y `pruebas/resultados/RESULTADOS_FASE_8.md`; las tres corridas reales previas (secciones 9.1.1 a 9.1.3) se conservan íntegras como parte del historial de esta aprobación, no como incidencias abiertas.

### 9.2. Procedimiento para CP-04 (`INT-FASE8-04-TRES-TAREAS`)

**CP-04 Aprobado — 24/07/2026** (ver sección 9.2.2). El procedimiento que llevó a esa corrida (pasos 0-6 de la sección 9), con dos diferencias:

- Antes del paso 3 (`prepararCasoIntegracionFase8Visible()`), configurar en el proyecto de prueba la propiedad `AUTO_FASE8_CASO=INT-FASE8-04-TRES-TAREAS` (sección 6).
- El asunto/cuerpo a enviar (paso 4) serán los de este fixture: `[PRUEBA-AUTOMATIZACION][INTEGRACION] Cobro duplicado a un cliente [<marcador>]` con el cuerpo "Hay que resolver el cobro duplicado que sufrió un cliente: revisar técnicamente el error de facturación, procesar en el área de Finanzas la devolución del monto cobrado de más, y que el equipo comercial le confirme al cliente cuando quede solucionado." — un único párrafo, sin línea en blanco. (Redacción ajustada el 24/07/2026, sección 9.2.1: la primera versión abría con una cláusula de encuadre separable que se extrajo como una observación informativa adicional; ahora es una única instrucción imperativa continua.)

**Aserciones del piloto (INT-FASE8-04, equivalente a CP-04).** Dry-run: exactamente un mensaje elegible; cero cambios en Gmail y en las ocho hojas (técnicas y de negocio); clasificación esperada 1 observación / 3 tareas en `Desarrollo IT` + `Finanzas` + `Comercial`. Formal: `Log Mensajes` con una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=3`, `resultado_gmail=SOLO_ETIQUETADO`; `Registro Tareas` con exactamente 3 filas para el `message_id` (`task_id` no vacío y distinto en cada una, `estado_escritura=ESCRITA`, tableros exactamente `Desarrollo IT`/`Finanzas`/`Comercial`, mismo `observacion_texto_original`); `Indice Idempotencia` con exactamente 3 entradas (`estado_final=PROCESADO`), cuyos `task_id` coinciden exactamente con los de `Registro Tareas`; una fila nueva en cada una de `Desarrollo IT`, `Finanzas` y `Comercial` (vinculadas por `ID` a esos `task_id`); Gmail conserva `Pruebas-Automatizacion` e `INBOX`, recibe `Procesado`, no recibe etiquetas de revisión/error, no se archiva.

Tras una corrida real satisfactoria, la aprobación de CP-04 (si corresponde) se registra por separado en `pruebas/CASOS_DE_PRUEBA.md`/`pruebas/resultados/RESULTADOS_FASE_8.md`, con el mismo criterio humano de revisión que el resto de los casos de prueba.

#### 9.2.1. Primer intento real (24/07/2026) — 4 observaciones en vez de 1, bloqueado correctamente

```text
messageId: 19f95a4113a1fb97
simulación: SIMULACION_FALLIDO (SIMULACION_CANTIDAD_OBSERVACIONES:4)
formal: no ejecutada (bloqueada correctamente)
```

Esta corrida clasificó correctamente los tres tableros (`Desarrollo IT/Alto`, `Finanzas/Alto`, `Comercial/Medio`) — confirma que nombrar explícitamente "Finanzas" y "equipo comercial" funciona igual que en CP-03 — pero como **4 observaciones** en lugar de la 1 que exige CP-04. `verificarClasificacionSimulada_()` (sección 7.2) detectó la discrepancia y bloqueó la ejecución formal, que nunca llegó a correr. Hipótesis (no confirmable sin acceso a los datos crudos de la IA): la cláusula de encuadre inicial ("...todavía no está resuelto:") se extrajo como una observación informativa separada, además de las 3 accionables. El cuerpo se reescribió como una única instrucción imperativa continua, sin ninguna cláusula separable. Esta evidencia se conserva íntegra y **no se vuelve a ejecutar este `message_id`**; tampoco se reclasifica como aprobado. CP-04 sigue requiriendo una **corrida real nueva completa** (`SIMULACION_OK` + `FORMAL_OK`), con un `message_id` distinto, para poder evaluarse.

#### 9.2.2. Segundo intento real (24/07/2026) — corrida completa exitosa, CP-04 Aprobado

```text
runId: 26c92904-c613-4a07-b34b-01a766da3710
messageId: 19f95bc29ad0717d (nuevo)
simulación: SIMULACION_OK
formal: FORMAL_OK
```

Con la redacción final del cuerpo (sección 9.2) ya aplicada, esta corrida clasificó exactamente 1 observación / 3 tareas en `Desarrollo IT`, `Finanzas` y `Comercial` — coincide en su totalidad con lo que exige CP-04, al primer intento tras el ajuste. `simularYVerificarCasoIntegracionFase8Visible()` informó `SIMULACION_OK`; `ejecutarFormalYVerificarCasoIntegracionFase8Visible()` informó `FORMAL_OK` sobre el mismo `runId`/`messageId`, sin re-preparar la sesión. `verificarResultadoFormal_()` confirmó automáticamente: `Log Mensajes` (`estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=3`, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` con exactamente 3 filas (`task_id` no vacío y distinto, `estado_escritura=ESCRITA`, tableros exactamente `Desarrollo IT`/`Finanzas`/`Comercial`, mismo `observacion_texto_original`); `Indice Idempotencia` con 3 entradas (`estado_final=PROCESADO`); una fila nueva en cada una de `Desarrollo IT`, `Finanzas` y `Comercial` vinculadas por `ID`; Gmail con `Procesado` aplicado, sin etiquetas de error/revisión, sin archivar.

**CP-04 pasa de Pendiente a Aprobado — 24/07/2026.** Detalle completo en `pruebas/CASOS_DE_PRUEBA.md` y `pruebas/resultados/RESULTADOS_FASE_8.md`; la corrida real previa (sección 9.2.1) se conserva íntegra como parte del historial de esta aprobación, no como incidencia abierta.

### 9.3. Procedimiento para CP-15 (`INT-FASE8-05-OBSERVACIONES-DUPLICADAS`)

**CP-15 Aprobado — 24/07/2026** (ver sección 9.3.1). El procedimiento que llevó a esa corrida (pasos 0-6 de la sección 9), con dos diferencias:

- Antes del paso 3 (`prepararCasoIntegracionFase8Visible()`), configurar en el proyecto de prueba la propiedad `AUTO_FASE8_CASO=INT-FASE8-05-OBSERVACIONES-DUPLICADAS` (sección 6).
- El asunto/cuerpo a enviar (paso 4) serán los de este fixture: `[PRUEBA-AUTOMATIZACION][INTEGRACION] Pedido repetido [<marcador>]` con el cuerpo "Necesitamos el informe de gastos de julio antes del viernes. Como te comentaba antes: necesitamos el informe de gastos de julio antes del viernes." — un único párrafo, sin línea en blanco. A diferencia del enunciado original de CP-15 (`pruebas/CASOS_DE_PRUEBA.md`), este cuerpo **no** usa un bloque de cita tipo respuesta ("El [fecha] escribió:\n> ..."), porque ese patrón coincide con un marcador de corte de `extraerContenidoNuevo()` y se recortaría antes de llegar a la IA — probando el recorte de citas (ya cubierto localmente) en vez de la consolidación de RF-04, que es lo que este fixture busca ejercitar.

**Ambigüedad reconocida antes de la corrida (ya resuelta, ver sección 9.3.1):** el fixture esperaba `cantidad_observaciones=1` (consolidación también a nivel de observación), pero el prompt no trae un ejemplo few-shot de esta regla y admitía una lectura alternativa (`cantidad_observaciones=2`, `cantidad_tareas=1`). La corrida real confirmó la primera lectura.

**Aserciones del piloto (INT-FASE8-05, equivalente a CP-15).** Dry-run: exactamente un mensaje elegible; cero cambios en Gmail y en las ocho hojas (técnicas y de negocio); clasificación esperada 1 observación / 1 tarea en `Finanzas`. Formal: `Log Mensajes` con una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`; `Registro Tareas` con exactamente 1 fila para el `message_id`; `Indice Idempotencia` con 1 entrada (`estado_final=PROCESADO`); una fila nueva en `Finanzas` (vinculada por `ID`); Gmail conserva `Pruebas-Automatizacion` e `INBOX`, recibe `Procesado`, no recibe etiquetas de revisión/error, no se archiva.

Tras una corrida real satisfactoria, la aprobación de CP-15 (si corresponde) se registra por separado en `pruebas/CASOS_DE_PRUEBA.md`/`pruebas/resultados/RESULTADOS_FASE_8.md`, con el mismo criterio humano de revisión que el resto de los casos de prueba.

#### 9.3.1. Primer intento real (24/07/2026) — corrida completa exitosa, CP-15 Aprobado

```text
runId: 01fbd80c-a874-4eed-82a6-c21a14b8070f
messageId: 19f9621b19597350 (nuevo)
simulación: SIMULACION_OK
formal: FORMAL_OK
```

Esta corrida clasificó exactamente 1 observación / 1 tarea en `Finanzas` — coincide en su totalidad con lo que exige CP-15, al primer intento, sin necesitar ningún ajuste de redacción del fixture. Resuelve la ambigüedad reconocida de antemano: la IA real consolidó (RF-04) el pedido repetido también a nivel de observación, no la lectura alternativa. `simularYVerificarCasoIntegracionFase8Visible()` informó `SIMULACION_OK`; `ejecutarFormalYVerificarCasoIntegracionFase8Visible()` informó `FORMAL_OK` sobre el mismo `runId`/`messageId`, sin re-preparar la sesión. `verificarResultadoFormal_()` confirmó automáticamente: `Log Mensajes` (`estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` con exactamente 1 fila (`task_id` no vacío, `estado_escritura=ESCRITA`, tablero `Finanzas`); `Indice Idempotencia` con 1 entrada (`estado_final=PROCESADO`); una fila nueva en `Finanzas` vinculada por `ID`; Gmail con `Procesado` aplicado, sin etiquetas de error/revisión, sin archivar.

**CP-15 pasa de Pendiente a Aprobado — 24/07/2026.** Además de aprobar el caso, esta corrida confirma en producción real que RF-04 (consolidación de observaciones duplicadas) está correctamente codificada en el prompt y que el modelo la sigue. Detalle completo en `pruebas/CASOS_DE_PRUEBA.md` y `pruebas/resultados/RESULTADOS_FASE_8.md`.

### 9.4. Procedimiento para CP-14 (`INT-FASE8-06-FIRMA-EXTENSA`)

**CP-14 Aprobado — 24/07/2026** (ver sección 9.4.1). El procedimiento que llevó a esa corrida (pasos 0-6 de la sección 9), con dos diferencias:

- Antes del paso 3 (`prepararCasoIntegracionFase8Visible()`), configurar en el proyecto de prueba la propiedad `AUTO_FASE8_CASO=INT-FASE8-06-FIRMA-EXTENSA` (sección 6).
- El asunto/cuerpo a enviar (paso 4) serán los de este fixture: `[PRUEBA-AUTOMATIZACION][INTEGRACION] Consulta rápida [<marcador>]`, con el cuerpo (varios párrafos, a diferencia de los fixtures anteriores):

```text
¿Podemos confirmar la reunión interna de mañana a las 15hs para revisar el estado general del equipo?

--
Juan Pérez
Gerente de Cuentas | Aliadata
Tel: +54 9 261 555-5555
Este mensaje es confidencial y está dirigido a su destinatario.
Si no es el destinatario, notifique al remitente y elimínelo.
Las opiniones expresadas son del autor, no de Aliadata.
Por favor considere el impacto ambiental antes de imprimir.
Aliadata no garantiza que este mensaje esté libre de virus.
El uso indebido de esta comunicación puede ser ilegal.
Este correo puede ser monitoreado con fines de calidad.
Aliadata S.A. — Mendoza, Argentina.
CUIT 30-12345678-9.
www.alia-data.com
No responda si el mensaje llegó por error.
```

**Riesgo reconocido antes de la corrida (ya resuelto, ver sección 9.4.1):** es el primer fixture con cuerpo multi-párrafo (los anteriores eran un único párrafo continuo). Si Gmail re-envuelve alguna línea larga de forma distinta a lo esperado, la barrera `CUERPO_NO_COINCIDE` podría bloquear la simulación aunque la canonicalización de transporte (probada con el piloto CP-05) esté funcionando correctamente. La corrida real confirmó que no se disparó.

**Aserciones del piloto (INT-FASE8-06, equivalente a CP-14).** Dry-run: exactamente un mensaje elegible; cero cambios en Gmail y en las ocho hojas (técnicas y de negocio); clasificación esperada 1 observación / 1 tarea en `Gestión General`. Formal: `Log Mensajes` con una fila, `estado=PROCESADO`, `etapa=FINALIZADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`; `Registro Tareas` con exactamente 1 fila para el `message_id`; `Indice Idempotencia` con 1 entrada (`estado_final=PROCESADO`); una fila nueva en `Gestión General` (vinculada por `ID`); Gmail conserva `Pruebas-Automatizacion` e `INBOX`, recibe `Procesado`, no recibe etiquetas de revisión/error, no se archiva.

Tras una corrida real satisfactoria, la aprobación de CP-14 (si corresponde) se registra por separado en `pruebas/CASOS_DE_PRUEBA.md`/`pruebas/resultados/RESULTADOS_FASE_8.md`, con el mismo criterio humano de revisión que el resto de los casos de prueba.

#### 9.4.1. Primer intento real (24/07/2026) — corrida completa exitosa, CP-14 Aprobado

```text
runId: b8ed62db-4f41-418e-9acd-276d1bcdd4ee
messageId: 19f9640b73453584 (nuevo)
simulación: SIMULACION_OK
formal: FORMAL_OK
```

Esta corrida clasificó exactamente 1 observación / 1 tarea en `Gestión General` — coincide en su totalidad con lo que exige CP-14, al primer intento, sin necesitar ningún ajuste. Resuelve los dos riesgos reconocidos de antemano: la barrera de cuerpo no se disparó pese al bloque de firma multi-párrafo, y la IA real no fabricó ninguna tarea a partir de la firma/aviso legal. `simularYVerificarCasoIntegracionFase8Visible()` informó `SIMULACION_OK`; `ejecutarFormalYVerificarCasoIntegracionFase8Visible()` informó `FORMAL_OK` sobre el mismo `runId`/`messageId`, sin re-preparar la sesión. `verificarResultadoFormal_()` confirmó automáticamente: `Log Mensajes` (`estado=PROCESADO`, `cantidad_observaciones=1`, `cantidad_tareas=1`, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` con exactamente 1 fila (`task_id` no vacío, `estado_escritura=ESCRITA`, tablero `Gestión General`); `Indice Idempotencia` con 1 entrada (`estado_final=PROCESADO`); una fila nueva en `Gestión General` vinculada por `ID`; Gmail con `Procesado` aplicado, sin etiquetas de error/revisión, sin archivar.

**CP-14 pasa de Pendiente a Aprobado — 24/07/2026.** Detalle completo en `pruebas/CASOS_DE_PRUEBA.md` y `pruebas/resultados/RESULTADOS_FASE_8.md`.

### 9.5. Procedimiento para CP-16 (`INT-FASE8-07-CUERPO-VACIO`)

**CP-16 Aprobado — 24/07/2026** (ver sección 9.5.2; el primer intento falló por un defecto del verificador, ya corregido — ver sección 9.5.1). El procedimiento que llevó a esas corridas (pasos 0-6 de la sección 9), con dos diferencias:

- Antes del paso 3 (`prepararCasoIntegracionFase8Visible()`), configurar en el proyecto de prueba la propiedad `AUTO_FASE8_CASO=INT-FASE8-07-CUERPO-VACIO` (sección 6).
- El asunto/cuerpo a enviar (paso 4) serán los de este fixture: `[PRUEBA-AUTOMATIZACION][INTEGRACION] RE: Reunión de mañana [<marcador>]`, con el cuerpo:

```text
El lun, 21 jul 2026, Juan escribió:
> Confirmamos la reunión de mañana a las 15hs, ¿les parece?
```

Es decir: **solo** una cabecera de cita ("El ... escribió:") seguida de una línea citada con `>`, sin ninguna línea de texto propio antes. Equivalente a FC-07 (`pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`).

**Particularidad de este fixture (distinta de todos los anteriores):** el rechazo no depende de que la IA clasifique el correo como sin tareas — depende de que `extraerContenidoNuevo()` deje el contenido vacío tras recortar la cita, y de que `evaluarFiltroDeterministico()` (regla 6, `codigo/filtros_correo.gs`) rechace ese cuerpo vacío como `RevisionSinTareas` **antes** de llegar a `consultarIAExtractora()`. En consecuencia, **esta es la primera corrida real de este automatizador que no genera ninguna llamada real a la API de OpenAI** (ni costo asociado), siempre que el rechazo ocurra donde se espera. Si en cambio el correo llegara a la IA (por ejemplo, si Gmail antepusiera algo al cuerpo que impidiera el recorte), el resultado ya no coincidiría con `fixture.esperado` y la simulación fallaría de forma fail-closed (sección 7.2), sin autorizar la formal.

**Aserciones del piloto (INT-FASE8-07, equivalente a CP-16).** Dry-run: exactamente un mensaje elegible; cero cambios en Gmail y en las ocho hojas (técnicas y de negocio); clasificación esperada 0 observaciones / 0 tareas (`SIN_TAREAS`). Formal: `Log Mensajes` con una fila, `estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones`/`cantidad_tareas` en blanco (nunca se llega a `MANIFIESTO_PERSISTIDO`), `resultado_gmail=SOLO_ETIQUETADO`; `Registro Tareas` sin ninguna fila nueva; `Indice Idempotencia` con 1 entrada (`estado_final=SIN_TAREAS`, `task_id` vacío); ninguna hoja de negocio recibe filas nuevas; Gmail conserva `Pruebas-Automatizacion` e `INBOX`, recibe `Revisión manual/Sin tareas detectadas`, no recibe `Procesado` ni etiquetas de error, no se archiva. Reutiliza `efectoFormalSinTareasCorrecto_` sin ningún cambio de código (mismo efecto que `INT-FASE8-01-INFORMATIVO`).

Tras una corrida real satisfactoria, la aprobación de CP-16 (si corresponde) se registra por separado en `pruebas/CASOS_DE_PRUEBA.md`/`pruebas/resultados/RESULTADOS_FASE_8.md`, con el mismo criterio humano de revisión que el resto de los casos de prueba.

#### 9.5.1. Primer intento real (24/07/2026) — hallazgo real en el verificador, ya corregido

```text
messageId: 19f9661d038ea8de
DRY_RUN: descartado por filtro determinístico (Cuerpo vacío tras extraer contenido nuevo...). Sin escrituras.
simulación: SIMULAR_FALLIDO — errores=SIMULACION_CANTIDAD_OBSERVACIONES:null,SIMULACION_CANTIDAD_TAREAS:null
```

El pipeline real funcionó exactamente como se buscaba: el filtro determinístico rechazó el mensaje antes de llegar a la IA, sin ninguna llamada real a OpenAI (confirma la particularidad de este fixture, más arriba). El fallo estuvo en `verificarClasificacionSimulada_()` (sección 7.2), que solo contemplaba los dos resultados que sí clasifican con la IA (`SIN_TAREAS`/`TAREAS_SIMULADAS`) — nunca `NO_ELEGIBLE` (filtro determinístico), que `procesarUnMensajeSimulado()` devuelve, por diseño, con `cantidadObservaciones`/`cantidadTareas` en `null` (no en `0`). Corrección: el fixture declara `esperado.resultadoSimulado='NO_ELEGIBLE'`; `verificarClasificacionSimulada_()` verifica esa forma exacta (resultado + `null`/`null`/`[]`) para esa categoría, sin afectar la comparación numérica existente para ningún fixture que no declare ese campo (los seis fixtures anteriores). Detalle completo, incluida una segunda brecha detectada en el propio arnés de pruebas locales (`clasificacionSimuladaPorDefecto_()` derivaba un `SIN_TAREAS` genérico en vez de reproducir `NO_ELEGIBLE`), en `auditoria/CHANGELOG.md`.

**Este `message_id` no se reutiliza.** El siguiente intento requiere cancelar la sesión pendiente (`cancelarSesionIntegracionFase8Visible()`), volver a copiar **ambos** `pruebas/fixtures_integracion_fase8.gs` y `pruebas/automatizador_integracion_fase8.gs` al proyecto de Apps Script, y preparar una sesión nueva (mismo asunto/cuerpo del fixture, marcador y `message_id` nuevos).

#### 9.5.2. Segundo intento real (24/07/2026) — corrida completa exitosa, CP-16 Aprobado

```text
runId: 7efa4045-e9c8-4815-974c-b80eca8ee56f
messageId: 19f9677c994bf546 (nuevo, nunca antes usado)
formal: FORMAL_OK
```

Tras la corrección de la sección 9.5.1, el segundo intento completó `FORMAL_OK` para un `message_id` nuevo. No se recibió por separado el texto del log de `SIMULACION_OK` de este intento — pero por construcción, `ejecutarFormalYVerificar_()` exige una sesión en `SIMULACION_OK` para el mismo `message_id`/nonce/fingerprint antes de autorizar la formal, por lo que este `FORMAL_OK` confirma sin ambigüedad que la simulación (con el verificador ya corregido) también aprobó. `verificarResultadoFormal_()` confirmó automáticamente: `Log Mensajes` (`estado=SIN_TAREAS`, `etapa=FINALIZADO`, `cantidad_observaciones`/`cantidad_tareas` en blanco, `resultado_gmail=SOLO_ETIQUETADO`); `Registro Tareas` sin ninguna fila nueva; `Indice Idempotencia` con 1 entrada (`estado_final=SIN_TAREAS`, `task_id` vacío); ninguna hoja de negocio modificada; Gmail con `Revisión manual/Sin tareas detectadas` aplicada, sin `Procesado` ni etiquetas de error, sin archivar.

**CP-16 pasa de Pendiente a Aprobado — 24/07/2026.** Confirma en producción real, además de la clasificación esperada, que el rechazo por filtro determinístico no generó ninguna llamada real a la API de OpenAI. Detalle completo en `pruebas/CASOS_DE_PRUEBA.md` y `pruebas/resultados/RESULTADOS_FASE_8.md`.

## 10. Sanitización de logs y estado de sesión

Los logs del automatizador contienen únicamente categorías, IDs, estados, conteos y valores de catálogo (prefijo `[AUTO-FASE8]`). **Nunca** cuerpos de correo, prompts, `motivo_sin_tareas`, `motivo_revision`, API keys ni `cfg` completo. El estado de sesión en `UserProperties` guarda solo datos no sensibles (`run_id`, `fixtureId`, marcador, asunto sintético, `message_id`, fingerprint, hash de baseline, nonce, estado). Las pruebas I1–I5 verifican que ni la API key, ni el cuerpo del fixture, ni el texto libre de la columna `error` aparecen en logs o en el estado guardado, y que nunca se escribe una propiedad de configuración.

## 11. Pruebas locales

`pruebas/pruebas_automatizador_integracion_fase8.gs` (`ejecutarPruebasAutomatizadorIntegracionFase8()`) cubre, con dobles de Properties, Gmail, Sheets, Logger, Lock y reloj, y sin acceder a Google Workspace ni OpenAI: todas las barreras fail-closed (proyecto/cuenta/planilla/etiqueta/props, IDs de etiqueta que no coinciden con sus nombres por `list` y por `get`, query construida internamente, cero/dos mensajes, remitente/asunto/label/INBOX incorrectos, `message_id` ya usado, sesión pendiente, sin lock, activador en conflicto); el flujo simular→formal correcto; que cualquier delta (baseline, nonce, fingerprint, message_id) entre simulación y formal bloquea la ejecución formal; que la simulación correcta genera nonce; que un error formal se reporta sin eliminar evidencia; la comparación de Sheets por encabezados (columnas reordenadas); la sanitización; y, en el núcleo del pipeline, que producción conserva la recuperación de abandonados y que el E2E siempre la omite.

Tras la revisión correctiva del 23/07/2026 se agregaron pruebas para: el resumen estructurado del núcleo (cero elegibles / otro message_id / `undefined` no generan `SIMULACION_OK`); la verificación exacta del contenido tras canonicalización de transporte; el remitente exacto (dirección como subcadena o solo en el nombre visible aborta); la versión de prompt (inferior/desconocida aborta sin llamar al núcleo); el baseline real (mutación de una celda existente sin agregar filas, mutación de fórmula, y mutación en cada una de las cinco hojas de negocio, todas detectadas); las lecturas fail-closed (fallo al leer el manifiesto o una hoja del baseline aborta con categoría cerrada); los encabezados obligatorios (cada encabezado ausente de Log Mensajes / Registro Tareas / Indice Idempotencia hace fallar la formal); el estado resistente a timeout (excepción formal → `FORMAL_FALLIDO` con evidencia intacta; `FORMAL_EN_CURSO` bloquea la repetición); el fingerprint completo (cambio de cuerpo/expectativas bloquea la formal); y las barreras de las funciones visibles (cancelar desde proyecto/cuenta no autorizados no borra la sesión).

La corrección del 24/07/2026 (canonicalización) agregó la reproducción exacta del piloto real: un cuerpo de 318 caracteres pasó de 6 a 9 líneas porque Gmail sustituyó tres espacios por LF al envolver líneas largas. Un LF simple dentro del mismo párrafo se considera equivalente a un espacio; las secuencias de dos o más LF se conservan exactamente como límites de párrafo. Las regresiones negativas confirman que palabras o frases distintas, contenido o firmas adicionales, espacios internos sustantivos y límites de párrafo alterados siguen rechazándose.

La ampliación del 24/07/2026 (CP-03/`INT-FASE8-02-DOS-TAREAS`) agregó pruebas para la verificación multi-tarea de la sección 7: camino correcto (1 observación/2 tareas); tablero faltante, adicional y duplicado; `task_id` vacío y duplicado; `estado_escritura` incorrecto; fila de negocio faltante, adicional y en tablero equivocado; divergencia de `task_id` entre el manifiesto y el índice, y entre el manifiesto y la hoja de negocio; `observacion_texto_original` divergente entre las dos tareas; índice con entrada faltante, duplicada y con estado incorrecto; etiquetas de Gmail incorrectas (sin la de resultado, y con una prohibida presente); sanitización (el `observacion_texto_original` nunca llega a los logs); y no regresión de `INT-FASE8-01-INFORMATIVO`.

La corrección del 24/07/2026 (falso negativo real, `messageId 19f948e5d35b5276`, sección 7.1) agregó pruebas para `localizarFilaEncabezadosNegocio_()`: detección correcta con el preámbulo real (encabezados en fila 4); cero filas candidatas; dos filas candidatas; encabezado parcial; el pipeline corrompiendo una fila del preámbulo al escribir (detectado por el prefijo del baseline); y compatibilidad con una hoja cuyo encabezado está en la fila 1 (sin preámbulo) — además de actualizar los dobles de prueba para reproducir el preámbulo real (título / fila auxiliar / fila vacía / encabezados en fila 4 / datos desde fila 5). Resultado de esa ejecución local: 138/138 verificaciones OK.

La corrección del 24/07/2026 (falso negativo de clasificación, `messageId 19f94b94245ce658`, sección 7.2) agregó pruebas para `verificarClasificacionSimulada_()`: multiset de tablero exacto aprueba la simulación; `Soporte` en lugar de `Comercial` (reproduce el caso real) rechaza con `SIMULACION_TABLEROS_NO_COINCIDEN`; tarea faltante, adicional y duplicada; conteo de observaciones incorrecto; ninguna escritura en Registro Tareas/Indice/hojas de negocio durante una simulación fallida por clasificación; la formal permanece bloqueada (`SIN_SIMULACION_OK`) tras esa simulación fallida; y el propio fail-closed de `verificarClasificacionSimulada_()` cuando el núcleo no devuelve `resultadosSimulados`. También se extendió el doble del núcleo (`crearAmbFalsoIntegracion_`) para derivar automáticamente la clasificación simulada por defecto desde `fixture.esperado` del fixture activo (sin overrides), de modo que el camino correcto de cualquier fixture siga aprobando sin tener que listar sus datos esperados en el doble. Resultado de esa ejecución local: 147/147 verificaciones OK (las 138 anteriores sin cambios + 9 nuevas).

La ampliación del 24/07/2026 (CP-04/`INT-FASE8-04-TRES-TAREAS`) agregó el fixture y dobles de prueba **separados** de los de CP-03 (`crearEstadoTresTareas_`, `efectoFormalTresTareasFabrica_`, `prepararSimuladoTresTareas_`) — deliberadamente no se generalizaron los dobles existentes de 2 tareas a N, para no arriesgar la cobertura ya aprobada de CP-03. Nuevas pruebas (sección P): camino correcto (1 observación, 3 tareas en `Desarrollo IT`/`Finanzas`/`Comercial`); la simulación aprueba sin tocar Registro Tareas/Indice/hojas de negocio; tablero equivocado (`Soporte` en lugar de `Finanzas`) entre los tres; y tablero duplicado (`Desarrollo IT` dos veces, falta `Comercial`) — no se repite exhaustivamente cada escenario ya cubierto por las pruebas M2-M18 de CP-03, dado que esa cobertura ya valida de forma genérica la lógica de comparación de multiset; lo nuevo que hacía falta confirmar era específicamente que la generalización también funciona a N=3. Resultado de esa ejecución local: 151/151 verificaciones OK (las 147 anteriores sin cambios + 4 nuevas).

La ampliación del 24/07/2026 (CP-15/`INT-FASE8-05-OBSERVACIONES-DUPLICADAS`) agregó el fixture y un doble de prueba dedicado para 1 tarea (`crearEstadoUnaTarea_`, `efectoFormalUnaTareaFabrica_`, `prepararSimuladoUnaTarea_`), separado de los de 2 y 3 tareas por el mismo criterio que CP-04. Nuevas pruebas (sección Q): camino correcto (1 observación, 1 tarea en `Finanzas`) y la simulación aprueba sin tocar Registro Tareas/Indice/hojas de negocio — confirman que la generalización N-tareas también funciona en N=1 (ya probada en N=2 y N=3). La consolidación de RF-04 en sí (si la IA real reporta 1 o 2 observaciones para el pedido repetido) solo puede confirmarse con una corrida real, no con estas pruebas locales. Resultado de esa ejecución local: 153/153 verificaciones OK (las 151 anteriores sin cambios + 2 nuevas).

La ampliación del 24/07/2026 (CP-14/`INT-FASE8-06-FIRMA-EXTENSA`) agregó el fixture (primer cuerpo multi-párrafo: consulta + firma/aviso legal) y `crearEstadoFirmaExtensa_`/`prepararSimuladoFirmaExtensa_`, reutilizando **sin cambios** `efectoFormalUnaTareaFabrica_` (creada para CP-15) con un tablero distinto (`Gestión General`). Una prueba de camino correcto (sección R) confirma que la generalización N=1 también aprueba con este fixture. La exclusión de firmas/avisos legales por parte de la IA real (regla ya codificada en el prompt) solo puede confirmarse con una corrida real. Resultado de esa ejecución local: 154/154 verificaciones OK (las 153 anteriores sin cambios + 1 nueva).

La ampliación del 24/07/2026 (CP-16/`INT-FASE8-07-CUERPO-VACIO`) agregó el fixture (equivalente a FC-07: una respuesta que solo contiene una cita, sin texto propio) y `crearEstadoCuerpoVacio_`/`prepararSimuladoCuerpoVacio_`, reutilizando **sin cambios** `efectoFormalSinTareasCorrecto_` (el mismo efecto por defecto ya usado por `INT-FASE8-01-INFORMATIVO`) — no hizo falta ninguna fábrica de efecto formal nueva, porque el resultado esperado (0 observaciones, 0 tareas) es idéntico. Una prueba de camino correcto (sección S) confirma que `evaluarFiltroDeterministico()` rechaza este cuerpo con `RevisionSinTareas` en el camino simulado/formal del automatizador. Que el rechazo real ocurra efectivamente en el filtro (y no llegue a la IA) solo puede confirmarse con una corrida real. Resultado de esa ejecución local: 155/155 verificaciones OK (las 154 anteriores sin cambios + 1 nueva).

La corrección del 24/07/2026 (primer hallazgo real de CP-16, `messageId 19f9661d038ea8de`, sección 7.2/9.5.1) agregó el campo `esperado.resultadoSimulado` al fixture `INT-FASE8-07-CUERPO-VACIO` y amplió `verificarClasificacionSimulada_()` para verificar, contra la categoría `NO_ELEGIBLE`, que `cantidadObservaciones`/`cantidadTareas` sean `null` (nunca `0`) — la forma real que devuelve `procesarUnMensajeSimulado()` cuando el filtro determinístico rechaza un mensaje antes de la IA. También corrigió el doble compartido `clasificacionSimuladaPorDefecto_()` (usado por todos los fixtures sin `clasificacionSimuladaOverride`), que derivaba un `SIN_TAREAS` genérico en vez de reproducir `NO_ELEGIBLE` — por lo que la prueba S1 aprobaba localmente sin haber podido detectar esta discrepancia antes de la corrida real. Nuevas pruebas (S2-S4): `verificarClasificacionSimulada_()` directamente, con `NO_ELEGIBLE`/`null`/`null` (aprueba), un resultado distinto al esperado (`SIMULACION_RESULTADO_NO_COINCIDE`) y cantidades numéricas en vez de `null` (rechaza). Ningún fixture anterior (los seis restantes, sin `resultadoSimulado`) cambia de comportamiento. Resultado de la última ejecución local: **158/158 verificaciones OK** (las 155 anteriores sin cambios + 3 nuevas). Las otras cuatro suites locales del proyecto (`ejecutarPruebasEvaluadorIAFase8()`: 60/60; `ejecutarPruebasExtraerContenidoNuevo()`: 19/19; `ejecutarPruebasPromptObservacionesMixtas()`: 46/46; `ejecutarPruebasSanitizacionHojasTecnicas()`: 17/17) se re-ejecutaron sin cambios de código y no muestran regresiones. Verificación de duplicación (nombres de función de nivel superior y `id` de fixtures): sin duplicados.

## 12. Resultado real del primer piloto (24/07/2026)

El piloto `INT-FASE8-01-INFORMATIVO`, equivalente funcionalmente a CP-05 pero ejecutado con un mensaje nuevo, completó satisfactoriamente el flujo de Fase 2A:

```text
runId: dcd52847-c431-4625-8d0e-d3ca82f0f096
message_id: 19f920a199a6666b
prompt: v4-INC-FASE8-011-informativo-sin-tareas
simulación: SIMULACION_OK
formal: FORMAL_OK
```

La simulación procesó exactamente un mensaje y produjo `SIN_TAREAS`, `correo_relevante=true`, `observaciones=0`, sin modificar Gmail ni Sheets. La ejecución formal procesó el mismo mensaje y el automatizador verificó:

- una fila en `Log Mensajes`, `SIN_TAREAS`/`FINALIZADO`, 0 observaciones, 0 tareas y `SOLO_ETIQUETADO`;
- ninguna fila en `Registro Tareas`;
- una entrada en `Indice Idempotencia`, con `task_id` vacío y `estado_final=SIN_TAREAS`;
- las cinco hojas de negocio sin cambios respecto del baseline;
- Gmail con `Pruebas-Automatizacion`, `INBOX` y `Revisión manual/Sin tareas detectadas`, sin `Procesado`, sin etiquetas de error y sin archivado.

Este resultado valida el MVP con servicios reales y aporta una regresión automatizada adicional a CP-05/INC-FASE8-011. La aprobación formal original de CP-05 y el cierre de la incidencia siguen fechados el 23/07/2026; el piloto del 24/07 los ratifica y no los reemplaza.

## 13. Exclusión del despliegue productivo

Los tres archivos de `pruebas/` de esta fase (`fixtures_integracion_fase8.gs`, `automatizador_integracion_fase8.gs`, `pruebas_automatizador_integracion_fase8.gs`) **nunca** deben copiarse al proyecto de Apps Script productivo, igual que el resto de `pruebas/*.gs`. Las barreras fail-closed (en especial el Script ID autorizado y `MODO_PRUEBA`/`DRY_RUN` base) son una defensa técnica adicional ante un despliegue accidental, no un sustituto de la exclusión manual explícita de estos archivos en la lista de copia de la Fase 9. La refacción de `codigo/script_refactorizado.gs` **sí** forma parte del código productivo (es una extracción estructural sin cambio de comportamiento externo) y debe copiarse junto con el resto de `codigo/*.gs`.
