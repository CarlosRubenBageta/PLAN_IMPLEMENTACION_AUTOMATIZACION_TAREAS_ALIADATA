# Procedimiento de despliegue — Fase 9

**Redactado:** 28/07/2026, durante la planificación de la Fase 9 (`PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, sección "Fase 9").
**Revisado:** 28/07/2026, tras auditoría externa (`auditoria/AUDITORIA_PROCEDIMIENTOS_DESPLIEGUE_REVERSION_FASE_9.md`, veredicto NO-GO condicionado) — correcciones verificadas independientemente e incorporadas, ver notas "(auditoría)" en cada punto corregido.
**Fecha/hora real del corte:** `FECHA_INICIO_CORTE = 2026-07-30T13:05:00-03:00` (ver `auditoria/CHANGELOG.md`, 30/07/2026) — **en ejecución real**.
**Estado:** GO decidido por Carlos Rubén Bageta el 30/07/2026 — los puntos marcados `⚠ REQUIERE DECISIÓN`/`⚠ REQUIERE CÓDIGO NUEVO` que seguían abiertos se aceptan como riesgo residual, mitigado con verificación manual cuidadosa en cada paso (no resueltos con código nuevo). A.1 completo — ver CHANGELOG para el detalle real de la ejecución.

Este documento traduce el checklist de la Fase 9 del plan v3 en pasos concretos, con los identificadores reales ya confirmados. No reemplaza al plan v3 (ahí están los criterios de aceptación y las dos aprobaciones formales) — es el instructivo operativo para ejecutarlo.

## 0. Identificadores reales (ya confirmados, `entregables/FASE_0/`)

```text
Archivo maestro (Google Sheets): 1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g
Zona horaria del archivo: (GMT-03:00) Buenos Aires → America/Argentina/Buenos_Aires
Proyecto Apps Script real: 1-qrNy_5VOZHbdC9bj7m3Zqv3TTEmPPRwPynMYP20VBQUyR2IChVGVinA
Cuenta operativa: tareas@alia-data.com
Cuenta técnica de alertas: carlosrubenbageta@alia-data.com (DEC-017 corregida — ver B.12, ⚠ REQUIERE DECISIÓN)
Hojas de negocio (nombre exacto): Finanzas, Comercial, Soporte, Desarrollo IT, Gestión General
Otras hojas ya existentes: Listas, Dashboard
```

**Advertencia sobre `gid`:** los `gid` de cada hoja usados en la copia de prueba ("Copia de Aliadata - Tableros Operativos Fase 1": Finanzas=2059391676, Comercial=390138063, Soporte=1987525587, Desarrollo IT=704403620, Gestión General=102851714) **no necesariamente son los mismos en el archivo maestro real** — hay que releerlos ahí antes de reconstruir `Resumen Actividades` en producción (paso A.6). Mismo criterio para cualquier otro valor "copiado" de la prueba: verificar, no asumir.

**Advertencia sobre el activador (auditoría, BLQ-02/BLQ-05 — confirmado contra documentación oficial de Google, [Installable Triggers](https://developers.google.com/apps-script/guides/triggers/installable)):** *"Installable triggers always run under the account of the person who created them"* y *"A given account can't see triggers installed from a second account"*. Dos consecuencias que este documento respeta en todos sus pasos:
1. Un activador no contiene una copia del código — ejecuta la función vigente en ese momento en el proyecto, sea cual sea. "Reactivar el activador antiguo" después de haber pegado el código v3 (paso B.1) **reactivaría v3**, no la versión vieja.
2. Como el activador productivo debe ejecutarse como `tareas@alia-data.com` (necesita leer *su* Gmail), cualquier notificación nativa de fallas de ese activador pertenece a esa cuenta — no puede redirigirse a `carlosrubenbageta@alia-data.com` solo por ser editor del proyecto o por configurar una propiedad del script. Ver B.12.

## 1. Archivos y release a copiar

```text
codigo/script_refactorizado.gs   (orquestador principal)
codigo/esquema_json.gs
codigo/filtros_correo.gs
codigo/sanitizacion.gs
codigo/escritura_sheets.gs
codigo/idempotencia.gs
codigo/cliente_openai.gs
codigo/prompts_ia.gs
codigo/recuperacion.gs
```

`codigo/script_actual.gs` (la versión vieja) **no se copia** al proyecto real — es el que hoy corre en producción y se reemplaza en B.1. Sí debe quedar accesible tal cual está hoy (ya lo está, en el repo) para poder restaurarlo en una reversión.

**⚠ REQUIERE DECISIÓN — release reproducible (auditoría, ALT-01):** no existe todavía un `appsscript.json` de la versión v3 versionado en el repo (el único manifiesto guardado, `respaldos/script/appsscript_actual.json`, es el de la versión vieja). Tampoco hay un commit/tag específico que identifique "esto es exactamente lo que se copió a producción", ni un hash por archivo. "Comparar longitud/última línea contra el repo" (como decía la versión anterior de este documento) no alcanza para detectar una modificación intermedia. Antes del corte real, decidir si se arma ese release formal (commit dedicado + `appsscript.json` v3 + hashes SHA-256 de los 9 archivos) o si se acepta un control más liviano — es una decisión de proceso, no algo que este documento puede resolver por sí solo.

---

## Aprobación A — cierre del lote histórico

**Regla:** ningún paso de esta sección toca el código del pipeline. Es Fase 8.1 llevada a producción (Etapas 5-7) — saneamiento, hojas nuevas y conciliación, nada más. El pipeline v3 no existe todavía en el archivo real al terminar esta sección.

### A.1 — Confirmar respaldo final

El respaldo de la Fase 0 (19/07/2026) tiene más de una semana. Antes de abrir la ventana de corte, hacer un respaldo fresco y **completo** (auditoría, ALT-02 — no alcanza con exportar los `.gs`):
- Archivo maestro: `Archivo → Hacer una copia`, nombre sugerido `RESPALDO - Aliadata Tableros Operativos - Pre corte v3 - [fecha real]`.
- Proyecto Apps Script completo: `Archivo → Hacer una copia` del proyecto (no solo copiar el texto de los `.gs`) — así se conserva también `appsscript.json`, los servicios avanzados habilitados y la configuración del runtime tal como están hoy.
- Propiedades del script: registrar la lista de propiedades existentes hoy (nombres, y valores para las no sensibles) — **nunca** el valor de `OPENAI_API_KEY` en ningún archivo Markdown.
- Activador actual: dueño, función y frecuencia exactos (ya están en `entregables/FASE_0/REGISTRO_ACTIVADOR.md`; confirmar que siguen iguales).
- Registrar todo en un anexo nuevo, mismo criterio que `entregables/FASE_0/CHECKLIST_RESPALDO.md`.

### A.2 — Abrir la ventana de corte

1. Registrar `FECHA_INICIO_CORTE` en el momento real en que se ejecuta este paso, **formato RFC 3339 con offset** (ej. `2026-08-15T09:00:00-03:00`, auditoría ALT-anexo a BLQ-04) — no una fecha ambigua sin zona horaria.
2. **Inventariar la bandeja pendiente de la versión antigua** antes de tocar nada (auditoría, BLQ-04/ALT-12): lista de `message_id` presentes en `label:inbox -label:Procesado` en este momento. Esta lista es la base para la conciliación de B.15 — sin ella, "confirmar que no quedó nada sin procesar" es una impresión visual, no una verificación.

### A.3 — Verificar la última ejecución de la versión antigua y desactivar su activador

1. Apps Script (proyecto real) → **Activadores** → revisar la última ejecución antes del corte (fecha/hora, resultado) y confirmar que no hay una ejecución en curso en ese momento.
2. Eliminar (no solo desactivar) el activador de `procesarCorreosDeTareas` (versión vieja). Anotar el timestamp exacto — es el punto de referencia para la conciliación de A.2/B.15.
3. Por DEC-002, este activador debía permanecer activo hasta este momento exacto — confirmado por Carlos Rubén Bageta el 28/07/2026 (`auditoria/CHANGELOG.md`) que siguió activo sin interrupciones desde la Fase 0.

### A.4 — Saneamiento de correos automáticos (relocado — auditoría, BLQ-06)

**Se movió acá desde el paso B.11 original.** La versión anterior de este documento lo ubicaba después de procesar los primeros correos controlados con v3 (B.9-B.10) — es decir, después de que `Registro Tareas.fila_destino` ya apuntara a filas físicas reales escritas por v3. Mover o quitar filas de las cinco hojas de negocio en ese momento desplaza el número de fila de todo lo que esté debajo, invalidando esas referencias. Acá, en cambio, todavía no se escribió ninguna fila nueva (el pipeline v3 ni siquiera existe en el proyecto) — es el único punto seguro para tocar físicamente las hojas de negocio.

Procedimiento mínimo (adaptado de la auditoría, sección 6 — **este runbook no fue ensayado todavía, revisar con Carlos Rubén Bageta antes de ejecutarlo por primera vez**):

1. Crear un `discard_batch_id` único para este lote.
2. Crear la hoja `Registros descartados`: las 17 columnas originales de negocio + `discard_batch_id`, `hoja_origen`, `fila_origen_previa`, `id_original`, `regla_deteccion`, `motivo_aprobado`, `responsable_aprobacion`, `fecha_aprobacion`, `fecha_movimiento`.
3. Detectar candidatos **sin modificar nada todavía**: remitente `noreply-apps-scripts-notifications@google.com`, notificaciones de Google Workspace, NotebookLM — por remitente y asunto, no por palabras genéricas dentro del cuerpo.
4. Presentar la tabla completa de candidatos (ID, hoja, fila, remitente, asunto) a Carlos Rubén Bageta para aprobar o rechazar **cada fila**, no el lote entero de una vez.
5. Copiar primero las filas aprobadas a `Registros descartados`; verificar cantidad y contenido copiado contra el original.
6. Recién después, retirar esas filas de las hojas de origen — **de abajo hacia arriba dentro de cada hoja**, para no desplazar filas todavía no procesadas del mismo lote.
7. Conciliar: `FILAS_ANTES = FILAS_REMANENTES + FILAS_DESCARTADAS_DEL_LOTE`, por hoja y en total.
8. Confirmar `Dashboard` y `Listas` sin regresión tras el movimiento.
9. Registrar el lote en `auditoria/CHANGELOG.md` (mismo criterio que cualquier otra decisión productiva de este proyecto).

### A.5 — Crear las hojas técnicas del pipeline

`Log Mensajes` (27 columnas), `Registro Tareas` (16 columnas), `Indice Idempotencia` (4 columnas) — esquema exacto y orden de columnas: `documentacion/DISENO_HOJAS_TECNICAS.md`, copiado carácter por carácter, no de memoria. **Corrección (auditoría, ALT-16):** la columna 27 `intentos_gmail` (DEC-007) pertenece a `Log Mensajes`, **no** a `Registro Tareas` — la versión anterior de este documento lo decía al revés.

Proteger `Indice Idempotencia` contra edición manual (`Datos → Hojas y rangos protegidos`, ya lo exige `documentacion/DISENO_HOJAS_TECNICAS.md`, sección 3) — la versión anterior de este documento no lo incluía explícitamente acá (auditoría, ALT-11). La protección debe permitir que el activador (ejecutando como `tareas@alia-data.com`) siga escribiendo ahí con normalidad.

**Por qué esta hoja va antes que `Resumen Actividades` (siguiente paso), a diferencia de la versión anterior de este documento:** la columna `Origen del registro` de `Resumen Actividades` compara contra `Indice Idempotencia` por nombre de hoja — si esa hoja no existe todavía, la fórmula da un error real (`#REF!` de hoja inexistente), no un simple "0 coincidencias". Crearla primero, aunque esté vacía, evita ese error.

### A.6 — Crear `Resumen Actividades`

Misma fórmula validada (`LET`+`VSTACK`+`HSTACK`+`FILTER`) más las columnas `Estado normalizado`, `Abrir origen` y `Origen del registro` — texto exacto en `documentacion/FORMULAS_FASE_8_1_PRODUCCION.md` (ver sección 2 de ese documento antes de continuar; **algunas de esas fórmulas todavía no están capturadas ahí textualmente, ver la nota al principio de ese archivo**).

1. Releer los 5 `gid` reales de este archivo. **No reutilizar los de la copia.**
2. Pegar la fórmula con esos `gid` actualizados.
3. **Esperado, no es un error:** la columna `Origen del registro` puede mostrar temporalmente un error o clasificar todo como `Revisión de origen` hasta que el paso siguiente (`Registro Migración Histórica`) exista — mismo comportamiento que ya se observó y documentó durante la prueba de reversión de la Fase 8.1 (`Registro Migración Histórica` mostrando `#REF!` hasta que `Resumen Actividades` reapareciera). Se resuelve solo, sin intervención, en cuanto A.7 termine.
4. Confirmar visualmente que el total y el desglose por `Estado normalizado` son razonables (no hay un número "correcto" fijo esperado — a diferencia de la copia, con 27 filas en la Fase 8.1, este archivo real puede tener más filas activas hoy).

### A.7 — Crear `Registro Migración Histórica`

Misma fórmula única validada en la copia, texto exacto en `documentacion/FORMULAS_FASE_8_1_PRODUCCION.md`. Como los nombres de las cinco hojas de negocio son idénticos entre la copia y el archivo real (verificados carácter por carácter en la Fase 0), la fórmula no debería necesitar ajustes de referencias — copiarla y confirmar que arma 17 columnas con el mismo criterio (`accion=CONSERVAR` salvo lo ya resuelto en la Etapa 4 de la Fase 8.1).

**⚠ REQUIERE DECISIÓN — materialización (auditoría, BLQ-01):** hoy esta hoja queda alimentada por una fórmula viva, igual que en la copia de prueba. La auditoría sugiere que, una vez conciliado el lote (A.9), sus 17 columnas se **materialicen como valores fijos** (copiar y pegar solo valores, no fórmula) antes de proteger la hoja — porque su función es ser evidencia de un lote ya aprobado, y una fórmula viva podría recalcularse si algo cambia en las hojas fuente más adelante, dejando de representar exactamente lo que se aprobó. `Resumen Actividades`, en cambio, sí debe seguir siendo dinámica (es una vista, no un registro de auditoría). Esto es un cambio de diseño respecto a lo aprobado en la Fase 8.1 (DEC-013/DEC-014) — decidir con Carlos Rubén Bageta antes de aplicarlo, no asumirlo.

### A.8 — Aplicar las normalizaciones históricas ya aprobadas

**No hay ninguna transformación de datos que ejecutar aparte.** Las filas simuladas en la Fase 8.1 dieron `accion=CONSERVAR` en el 100% de los casos (incluidos los 2 posibles duplicados de Desarrollo IT, decisión explícita: conservar ambas). "Aplicar las normalizaciones" se agota en construir `Registro Migración Histórica` (A.7) — no hay valores que reescribir en las cinco hojas de negocio. Si al recalcular en producción aparece alguna fila nueva con `accion` distinta de `CONSERVAR`, **detenerse** (A.10) antes de continuar.

### A.9 — Proteger `Resumen Actividades`

`Datos → Hojas y rangos protegidos` → toda la hoja, edición restringida a administradores. Mismo procedimiento ya probado en la copia (Etapa 3) — sin esto, un doble clic en `Abrir origen` rompe la fórmula de matriz para todos los usuarios.

### A.10 — Ejecutar la conciliación histórico/resumen

Base numérica (recalcular con los conteos reales de este archivo, no asumir que siguen siendo los 27 de la Fase 8.1):

```text
TOTAL_FUENTE = TERMINALES + ABIERTOS + AMBIGUOS
INCLUIBLES_NO_RESUELTOS = ABIERTOS + AMBIGUOS
INCLUIBLES_NO_RESUELTOS = VISIBLES_NO_RESUELTOS_EN_RESUMEN + EXCEPCIONES_BLOQUEANTES
```

**Extensión recomendada (auditoría, ALT-10):** una igualdad numérica sola no distingue "una fila omitida y otra duplicada" de un resultado realmente sin diferencias — los dos casos pueden dar el mismo total. Antes de firmar la Aprobación A, agregar como mínimo:
- comparar el conjunto de `(Hoja origen, Fila origen, ID)` entre las cinco hojas fuente y `Resumen Actividades` — cero faltantes, cero extras, cero duplicados;
- cero celdas con error de fórmula (`#REF!`, `#N/A`, `#VALUE!`) en ninguna de las dos hojas nuevas;
- probar al menos un enlace `Abrir origen` por hoja de negocio;
- confirmar `Dashboard` y `Listas` sin regresión.

(Una comparación por hash de las 17 columnas, como también sugiere la auditoría, queda como mejora futura — no es indispensable si la comparación por conjunto de arriba cierra limpia.)

### A.11 — Detenerse ante cualquier diferencia no explicada

No continuar a la Aprobación A hasta que cualquier discrepancia de A.4, A.8 o A.10 tenga una explicación concreta y registrada.

### A.12 — Aprobación A

Registrar en `auditoria/CHANGELOG.md` y en la puerta de aprobación de la Fase 9: responsable, fecha/hora, conteos finales de la conciliación. Esto cierra el trabajo de datos — recién después se toca código.

---

## Despliegue del pipeline

### B.1 — Copiar el código aprobado

Los 9 archivos de la sección 1, del repo al editor de Apps Script del proyecto real, reemplazando el contenido de la versión vieja.

**A partir de este paso, el activador de la versión antigua ya no puede "reactivarse" para volver atrás** — el nombre de función `procesarCorreosDeTareas` ahora es v3. Cualquier reversión desde acá en adelante sigue `documentacion/PROCEDIMIENTO_REVERSION.md`, Escenario 2 o 3, que restauran el código **antes** de tocar el activador.

### B.2 — Habilitar el servicio avanzado de Gmail

Editor de Apps Script → ícono `+` junto a "Servicios" → **Gmail API** → Añadir. Confirmar en `appsscript.json` que aparece bajo `dependencies.enabledAdvancedServices` y que `oauthScopes` incluye `https://www.googleapis.com/auth/gmail.modify` (`configuracion/MATRIZ_PERMISOS.md`) — y de paso confirmar que el resto de los alcances de esa misma sección (Sheets, `UrlFetchApp`, `PropertiesService`, `LockService`) también están declarados, no solo Gmail (auditoría, ALT-01).

### B.3 — Autorizar permisos (antes de tocar etiquetas — auditoría, ALT-06)

**Orden corregido respecto a la versión anterior de este documento**, que listaba etiquetas antes de autorizar: la primera llamada a un servicio nuevo dispara el diálogo de consentimiento por sí sola, así que "listar etiquetas" ya autorizaba de hecho, de forma implícita y desordenada.

1. Crear una función administrativa mínima, de solo lectura, por ejemplo:
   ```javascript
   function autorizarYVerificar() {
     Logger.log('Cuenta activa: ' + Session.getActiveUser().getEmail());
   }
   ```
2. Ejecutarla manualmente desde el editor, **logueado como `tareas@alia-data.com`**, y aceptar el diálogo de permisos.
3. Confirmar en el log que la cuenta activa es efectivamente `tareas@alia-data.com` (no la cuenta personal del operador).
4. Borrar esta función temporal del proyecto una vez confirmado (no debe quedar código de prueba en el release final).

No usar `procesarCorreosDeTareas()` para autorizar — dispararía el pipeline real de una vez.

### B.4 — Crear las etiquetas de Gmail y registrar sus IDs internos

En la cuenta real `tareas@alia-data.com`, crear en Gmail (además de `Procesado`, que ya existe): `Revisión manual` como etiqueta padre, y como subetiquetas suyas `Sin tareas detectadas`, `Error de procesamiento`, `Error de automatización` — usando la opción de Gmail **"Anidar etiqueta en"** al crear cada una (auditoría, ALT-07: no asumir que escribir el nombre con `/` alcanza por sí solo; usar el flujo que Gmail ofrezca en su interfaz actual).

Con la autorización de B.3 ya hecha, listar los IDs internos:

```javascript
function listarIdsEtiquetas() {
  var labels = Gmail.Users.Labels.list('me').labels;
  labels.forEach(function (l) { Logger.log(l.name + ' -> ' + l.id); });
}
```

Verificar el par `nombre ↔ ID` de cada una contra el listado (no asumir el orden) y copiar a su propiedad:

```text
ID_ETIQUETA_PROCESADO                        (etiqueta "Procesado")
ID_ETIQUETA_REVISION_SIN_TAREAS               (etiqueta "Revisión manual/Sin tareas detectadas")
ID_ETIQUETA_REVISION_ERROR_PROCESAMIENTO      (etiqueta "Revisión manual/Error de procesamiento")
ID_ETIQUETA_REVISION_ERROR_AUTOMATIZACION     (etiqueta "Revisión manual/Error de automatización")
```

Borrar `listarIdsEtiquetas()` del proyecto una vez capturados los IDs.

### B.5 — Configurar las propiedades del script

`Configuración del proyecto → Propiedades de secuencia de comandos`. **18 propiedades** (no 20 — corrección, auditoría ALT-04) más los 4 IDs de etiqueta de B.4, **22 en total**:

```text
OPENAI_API_KEY               = (ya configurada — no tocar, nunca copiar su valor a ningún archivo)
OPENAI_MODEL                 = gpt-4o-mini
SPREADSHEET_ID                = 1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g
ZONA_HORARIA                  = America/Argentina/Buenos_Aires
MAX_MENSAJES_POR_EJECUCION    = 10
MAX_MENSAJES_BUSQUEDA         = 20
MAX_CARACTERES_CUERPO         = 8000
TIEMPO_INTERNO_MAX_MS         = 240000
UMBRAL_ABANDONO_MIN           = 20
LIMITE_REINTENTOS_GMAIL       = 6
VERSION_SCRIPT                 = 3.0.0
CUENTA_ALERTAS                 = carlosrubenbageta@alia-data.com (informativa — la ruta real de alertas es el filtro de Gmail de B.11, no esta propiedad; el código no la lee)
CUENTA_OPERATIVA               = tareas@alia-data.com
FECHA_INICIO_CORTE             = (la registrada en el paso A.2, formato RFC 3339 con offset)
MODO_PRUEBA                    = false
DRY_RUN                        = false
PERMITIR_ARCHIVADO             = true
PERMITIR_ETIQUETADO            = true
```

`SPREADSHEET_ID_PRUEBA`, `GMAIL_QUERY_PRUEBA`, `ETIQUETA_PRUEBA` **no se configuran** en producción (solo aplican cuando `MODO_PRUEBA=true`).

**⚠ REQUIERE CÓDIGO NUEVO (auditoría, BLQ-04):** `validarConfiguracion()` hoy acepta `FECHA_INICIO_CORTE` ausente sin error — el comentario del propio código dice explícitamente que su ausencia "no es un error de configuración en esta fase de borrador", pero nunca se volvió obligatoria para producción. Si esta propiedad falta el día del corte real, **v3 procesará como elegible cualquier mensaje presente en la bandeja**, sin ningún aviso. Verificado también: cuando la fecha sí está presente y excluye un mensaje, el código solo hace `Logger.log(...)` — no queda ninguna fila auditable en `Log Mensajes` ni en ningún otro lado. Mientras esto no se corrija en código, la única mitigación es el inventario manual de A.2/B.15 (comparación por lista de `message_id`, no por conteo).

### B.6 — Verificar nombres de hojas

Reconfirmar los 5 nombres exactos (`entregables/FASE_0/INVENTARIO_TECNICO.md`) siguen igual.

### B.7 — Ejecutar `validarConfiguracion()`

Manualmente desde el editor. **Precisión sobre lo que esta función realmente confirma (auditoría, ALT-03/ALT-05)** — no ejecuta un preflight completo, y no genera un "log completo" narrativo, sino que retorna un objeto (`{valido, errores, cfg}`) que hay que inspeccionar:
- si `valido=false`: revisar `errores` (sí es una lista legible en el log).
- si `valido=true`: la función **no** validó permisos de Gmail API, ni los 5 nombres de hojas de negocio, ni que los encabezados/orden de columnas de las hojas técnicas sean correctos (solo que las 3 hojas técnicas existan por nombre) — un encabezado corrido, como ya pasó una vez con `Registro Migración Histórica` en la Fase 8.1, no lo detectaría acá.

Como mitigación manual (sin construir código nuevo todavía): revisar a simple vista los encabezados de `Log Mensajes`, `Registro Tareas` e `Indice Idempotencia` contra `documentacion/DISENO_HOJAS_TECNICAS.md` antes de seguir. Construir un `preflightDespliegue()` de solo lectura que cubra todo esto es una mejora recomendada por la auditoría — no está hecho todavía, requiere código nuevo no probado.

### B.8 — Ejecutar una prueba manual

Correr `procesarCorreosDeTareas()` una vez, manualmente. **Con `MODO_PRUEBA=false`, `DRY_RUN=false`, y ambos permisos de escritura habilitados, esto ya procesa correos reales de la bandeja actual, no es una simulación (auditoría, ALT-08).** Antes de este paso, tener clara la lista de mensajes que hay hoy en `label:inbox -label:Procesado` (la misma capturada en A.2) para poder identificar exactamente qué tocó esta corrida.

### B.9 — Procesar uno o dos correos controlados

Con la bandeja ya conocida (B.8), identificar específicamente **qué `message_id`** se van a usar como prueba controlada — no "cualquiera que haya" — y verificar el resultado contra ese ID exacto, no contra una impresión general de "algo se procesó".

### B.10 — Verificar filas, log, etiquetado, archivado e idempotencia

Para cada correo controlado del paso B.9, verificar **por `message_id` exacto** (auditoría, ALT-09):
- fila(s) en la hoja de negocio correcta;
- una fila en `Log Mensajes` con `estado=PROCESADO` (o el estado que corresponda si el mensaje no generó tareas — no asumir siempre `PROCESADO`);
- fila(s) en `Registro Tareas` y en `Indice Idempotencia`, en la cantidad exacta esperada;
- `version_script=3.0.0`;
- etiqueta aplicada y mensaje archivado — por mensaje individual, no por hilo (DEC-001);
- enlace al correo correcto.

**Prueba de idempotencia (recomendado, no requiere código nuevo — solo repetir el paso a mano):** ejecutar `procesarCorreosDeTareas()` una segunda vez sin que llegue correo nuevo, y confirmar que el mismo `message_id` no generó ninguna fila adicional en ninguna hoja.

### B.11 — Configurar las alertas — ✅ resuelto (corrige DEC-017), probado de punta a punta

**DEC-017 (28/07/2026) quedó invalidada por un hallazgo real de la auditoría** (activador siempre ejecuta y notifica bajo la cuenta que lo creó — `tareas@alia-data.com` para el productivo, no `carlosrubenbageta@alia-data.com`). **Elegida y probada la opción 1 (filtro/reenvío), 28/07/2026, con una falla real controlada** — no una configuración "que debería andar": se creó un proyecto Apps Script descartable, se forzó una excepción real con un activador propio, y se confirmó que el correo de notificación llegó tanto a `tareas@alia-data.com` como, reenviado, a `carlosrubenbageta@alia-data.com`.

**Datos reales confirmados de la notificación nativa de fallas de Apps Script:**
```text
Remitente: noreply-apps-scripts-notifications@google.com
Asunto:    Summary of failures for Google Apps Script: [nombre del proyecto]
```
(Es el mismo remitente que genera las filas de "posible duplicado" que el saneamiento de A.4 excluye de las hojas de negocio — mismo canal automático, dos usos distintos: acá se aprovecha a propósito para alertar.)

**Prerrequisito, ya resuelto:** la dirección de reenvío `carlosrubenbageta@alia-data.com` necesita estar verificada en `tareas@alia-data.com → Configuración → Reenvío y correo POP/IMAP` antes de poder usarse en un filtro. Ya estaba verificada (confirmado 28/07/2026 sin necesitar un código nuevo).

**Configurar en el archivo/proyecto real, antes del corte (repetir lo ya hecho en la cuenta real si no se hizo directamente ahí):**
1. En Gmail de `tareas@alia-data.com`, buscar `from:noreply-apps-scripts-notifications@google.com` → ícono de filtro → Crear filtro.
2. Acción: **Reenviarlo a** `carlosrubenbageta@alia-data.com`, y opcionalmente **Aplicarle la etiqueta** `Alertas Apps Script`.
3. **También activar, en el proyecto Apps Script real, la notificación de fallas en modo "Inmediatamente"** al crear el activador productivo (B.13) — sin esto, aunque el filtro esté bien armado, Apps Script podría no mandar el correo hasta un resumen diario/semanal (esto fue lo que retrasó la primera prueba: el activador de prueba no tenía la frecuencia en inmediato).

**Alcance real de esta solución — no confundir con cobertura completa:** cubre "runtime terminado inesperadamente" (cualquier excepción no controlada en una ejecución del activador). Los otros 7 eventos de alerta de la Fase 10 (aumento anormal de revisión manual, clave API ausente, etc.) siguen sin código propio — brecha documentada, no resuelta por este paso.

### B.12 — Aprobación B

Confirmar además que ninguna diferencia detectada antes de la Aprobación A (paso A.11) quedó sin explicar, y que la ruta de alertas elegida en B.11 ya fue probada. Registrar en `auditoria/CHANGELOG.md` y la puerta de aprobación de la Fase 9.

### B.13 — Reactivar el activador (versión nueva)

Apps Script → Activadores → Añadir activador → `procesarCorreosDeTareas` → basado en tiempo → cada 10 minutos → **creado logueado como `tareas@alia-data.com`** (no como el operador personal, por la misma razón explicada en la sección 0). Verificar dueño, función y frecuencia inmediatamente después de crearlo, y su primera ejecución real.

### B.14 — Confirmar que se procesó todo correo posterior a `FECHA_INICIO_CORTE`

**⚠ REQUIERE CÓDIGO NUEVO para hacerse con garantías (auditoría, BLQ-04/ALT-12):** hoy no existe una conciliación por `message_id` — la única verificación posible es manual: comparar la lista de `message_id` capturada en A.2 más los que llegaron entre A.3 y este paso, contra lo que efectivamente aparece en `Log Mensajes`. Dado que la primera ejecución procesa como máximo 10 mensajes (`MAX_MENSAJES_POR_EJECUCION`) y la búsqueda trae como máximo 20 (`MAX_MENSAJES_BUSQUEDA`), puede hacer falta más de un ciclo de 10 minutos para drenar un backlog grande — "verificar la primera ejecución" no alcanza para confirmar que se vació. Repetir la comparación después de varios ciclos, hasta que la lista de pendientes llegue a cero.

### B.15 — Supervisar las primeras ejecuciones

Entra en la cadencia de revisión de la Fase 10 (día 1: todas las ejecuciones).

---

## Pendiente antes de fijar `FECHA_INICIO_CORTE` real (checklist de salida, adaptado de la auditoría)

- [x] `documentacion/FORMULAS_FASE_8_1_PRODUCCION.md` completo con el texto exacto de cada fórmula (28/07/2026 — las 4 confirmadas verbatim contra la copia de prueba).
- [ ] Decidir con Carlos Rubén Bageta si `Registro Migración Histórica` se materializa como valores fijos tras la conciliación (A.7, ⚠ REQUIERE DECISIÓN).
- [ ] Runbook de saneamiento (A.4) revisado con Carlos Rubén Bageta y ensayado al menos una vez antes de la primera ejecución real.
- [x] Decidir la ruta real de alertas (B.11) y probarla de punta a punta — resuelto y probado con una falla real, 28/07/2026 (filtro de Gmail, ver B.11).
- [ ] Decidir si se exige `FECHA_INICIO_CORTE` en código (B.5, ⚠ REQUIERE CÓDIGO NUEVO) o si se acepta el control manual descrito ahí como mitigación suficiente.
- [ ] Decidir el alcance del release reproducible (sección 1, ⚠ REQUIERE DECISIÓN).
- [ ] `documentacion/PROCEDIMIENTO_REVERSION.md` ensayado al menos una vez sobre una copia (sigue pendiente, ver ese documento).
- [ ] `auditoria/ACTA_DESPLIEGUE.md` creada (todavía no existe).
