# Fórmulas de producción — Fase 8.1

**Redactado:** 28/07/2026, en respuesta al hallazgo BLQ-01 de `auditoria/AUDITORIA_PROCEDIMIENTOS_DESPLIEGUE_REVERSION_FASE_9.md`: las fórmulas de `Resumen Actividades` y `Registro Migración Histórica` estaban descritas en prosa (`auditoria/CHANGELOG.md`) pero nunca capturadas textualmente en ningún archivo del repositorio.

**Estado (actualizado 28/07/2026):** las 4 fórmulas de las secciones 1-4 son ahora **VERBATIM** — Carlos Rubén Bageta las pegó todas, tal como están en la copia de prueba. Ya no queda ninguna reconstruida ni propuesta sin confirmar.

---

## 1. `Resumen Actividades`, celda A2 — **VERBATIM**

Pegado por Carlos Rubén Bageta en el chat el 28/07/2026, confirmado como el texto real de la celda:

```text
=LET(datos; VSTACK(HSTACK(ARRAYFORMULA(SI(Finanzas!A5:A<>"";"Finanzas";"")); ARRAYFORMULA(FILA(Finanzas!A5:A)); Finanzas!A5:Q);HSTACK(ARRAYFORMULA(SI(Comercial!A5:A<>"";"Comercial";""));ARRAYFORMULA(FILA(Comercial!A5:A)); Comercial!A5:Q);HSTACK(ARRAYFORMULA(SI(Soporte!A5:A<>"";"Soporte";"")); ARRAYFORMULA(FILA(Soporte!A5:A)); Soporte!A5:Q);HSTACK(ARRAYFORMULA(SI('Desarrollo IT'!A5:A<>"";"Desarrollo IT";"")); ARRAYFORMULA(FILA('Desarrollo IT'!A5:A)); 'Desarrollo IT'!A5:Q);HSTACK(ARRAYFORMULA(SI('Gestión General'!A5:A<>"";"Gestión General";"")); ARRAYFORMULA(FILA('Gestión General'!A5:A)); 'Gestión General'!A5:Q));FILTER(datos; CHOOSECOLS(datos; 3) <> ""))
```

**Separador regional:** `;` (configuración regional en español/Argentina). Si Sheets rechaza el separador, probar con `,`.

**Layout de columnas que produce (19 columnas, A:S) — importante, no es intuitivo:**

| Columna | Contenido |
|---|---|
| A | `Hoja origen` (texto: "Finanzas", "Comercial", etc. — **no es el `ID`**) |
| B | `Fila origen` (número de fila en la hoja de origen) |
| C | `ID` (columna 1 de las 17 originales — recién acá empieza el pasaje directo de `hoja!A5:Q`) |
| D–S | Resto de las 17 columnas originales del tablero, en el mismo orden que `documentacion/MAPA_COLUMNAS.md` (D=Fecha de entrada, E=Fuente, F=Grupo origen, G=Remitente, H=Asunto original, I=Resumen de tarea, J=Prioridad sugerida IA, K=Prioridad final, L=Estado, M=Responsable, N=Fecha límite, O=Link al correo, P=Link a Drive, Q=Derivada a, R=Última actualización, S=Observaciones) |

**Bug real que causó este layout (documentado para no repetirlo):** al diseñar la columna `Origen del registro` (sección 3), la primera versión comparó contra la columna `A` asumiendo que ahí estaba el `ID` (por `MAPA_COLUMNAS.md`, que numera `ID` como columna 1 — pero esa numeración es de las hojas de origen, no de `Resumen Actividades`, que antepone dos columnas). El `ID` real está en `C`. Ver `auditoria/CHANGELOG.md`, entrada "Columna 'Origen del registro' construida y validada", 28/07/2026.

**Condición de filtro:** `CHOOSECOLS(datos; 3) <> ""` — usa la columna 3 (`ID`, ver arriba) como ancla de "esta fila tiene datos reales". Funciona porque el inventario de la Fase 8.1 confirmó 0 `ID` vacíos en las 27 filas reales — si alguna vez apareciera una fila con `ID` vacío pero datos en otras columnas, quedaría excluida silenciosamente. No es un problema hoy, pero vale la pena tenerlo presente.

**Resultado esperado ante una dependencia todavía no creada:** ninguna — esta fórmula no depende de `Registro Migración Histórica` ni de `Indice Idempotencia` (esas dependencias están en las columnas T-V, ver abajo). Si `Indice Idempotencia` no existe todavía cuando se pega esta fórmula completa (con la columna `Origen del registro` incluida), la columna V específicamente mostrará error de referencia — pero A:S deberían poblarse sin problema.

---

## 2. `Resumen Actividades`, columnas `Estado normalizado` (T) y `Abrir origen` (U) — **VERBATIM**

Pegadas por Carlos Rubén Bageta el 28/07/2026, texto real de la copia de prueba.

Estado normalizado, celda T2 — usa `REGEXMATCH` en vez de una cadena de `O(...)`, mismo resultado (catálogo real, DEC-015):

```text
=ARRAYFORMULA(SI(L2:L=""; ""; SI(L2:L="Completada"; "TERMINAL"; SI(REGEXMATCH(L2:L; "^(Pendiente|En curso|Bloqueada|En revisión)$"); "ABIERTO"; "AMBIGUO"))))
```

Abrir origen, celda U2 — `HIPERVINCULO` (nombre en español de `HYPERLINK`) a la fila real de origen usando el `gid` de cada hoja — **los 5 `gid` de abajo (2059391676, 390138063, 1987525587, 704403620, 102851714) son los de la copia de prueba, no reutilizar en producción** (ver `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`, advertencia de la sección 0):

```text
=ARRAYFORMULA(SI(C2:C=""; ""; HIPERVINCULO("#gid=" & SI(A2:A="Finanzas"; 2059391676; SI(A2:A="Comercial"; 390138063; SI(A2:A="Soporte"; 1987525587; SI(A2:A="Desarrollo IT"; 704403620; SI(A2:A="Gestión General"; 102851714; ""))))) & "&range=A" & B2:B; "Abrir origen")))
```

**Hallazgo real de fragilidad (Etapa 3, ya documentado en `auditoria/CHANGELOG.md`):** un doble clic accidental en una celda de esta columna entra en modo edición y pega un valor fijo, lo que rompe la expansión de la fórmula de matriz para las 27 filas (`#REF!` desde la celda origen), no solo la celda tocada. Mitigado protegiendo toda la hoja (`Datos → Hojas y rangos protegidos`) — ver `PROCEDIMIENTO_DESPLIEGUE.md`, paso A.9.

---

## 3. `Resumen Actividades`, columna `Origen del registro` (V) — **VERBATIM**

Pegada por Carlos Rubén Bageta el 28/07/2026. Usa columna `C` para el `ID` en las tres posiciones (guarda de vacío incluida) — versión corregida tras el bug documentado en la sección 1. `CONTAR.SI` es el nombre en español de `COUNTIF`.

```text
=ARRAYFORMULA(SI(C2:C="";"";SI(CONTAR.SI('Indice Idempotencia'!B2:B1000;C2:C)>0;"Automatización v3";SI(CONTAR.SI('Registro Migración Histórica'!C2:C1000;C2:C)>0;"Histórico/pre-corte";"Revisión de origen"))))
```

**Requiere que `Indice Idempotencia` y `Registro Migración Histórica` ya existan como hojas** (aunque estén vacías) — si falta cualquiera de las dos, esta columna específicamente muestra error de referencia hasta que se cree. No afecta al resto de `Resumen Actividades`. Ver el orden recomendado en `PROCEDIMIENTO_DESPLIEGUE.md` (A.5 antes que A.6).

**Resultado esperado en producción, el día del corte:** con `Indice Idempotencia` recién creada y vacía (nadie procesó todavía ningún mensaje con v3), **todas las filas deberían dar `Histórico/pre-corte`**, igual que en la copia de prueba — 0 en `Automatización v3` es lo esperado, no un error.

---

## 4. `Registro Migración Histórica`, fórmula principal (celda A2) — **VERBATIM**

Pegada por Carlos Rubén Bageta el 28/07/2026. Una sola `ARRAYFORMULA(HSTACK(...))` con 17 argumentos, uno por columna, en el mismo orden que el esquema de 17 columnas (`auditoria/CHANGELOG.md`).

```text
=ARRAYFORMULA(HSTACK(SI('Resumen Actividades'!C2:C="";"";"SIM-20260728");'Resumen Actividades'!C2:C;'Resumen Actividades'!C2:C;'Resumen Actividades'!C2:C;'Resumen Actividades'!A2:A;'Resumen Actividades'!B2:B;SI('Resumen Actividades'!C2:C="";"";'Resumen Actividades'!F2:F&"|"&'Resumen Actividades'!I2:I&"|"&'Resumen Actividades'!M2:M&"|"&'Resumen Actividades'!N2:N);'Resumen Actividades'!L2:L;'Resumen Actividades'!L2:L;'Resumen Actividades'!T2:T;SI('Resumen Actividades'!C2:C="";"";"CONSERVAR");SI(('Resumen Actividades'!C2:C="ALI-62176")+('Resumen Actividades'!C2:C="ALI-23135");"Posible duplicado de contenido revisado 28/07/2026 — CONSERVAR ambas (notificaciones automáticas distintas del mismo problema)";"");SI('Resumen Actividades'!C2:C="";"";"");SI('Resumen Actividades'!C2:C="";"";"");SI('Resumen Actividades'!C2:C="";"";FECHA(2026;7;28));SI('Resumen Actividades'!C2:C="";"";"Carlos Rubén Bageta");SI('Resumen Actividades'!C2:C="";"";"PENDIENTE")))
```

**Aclaración de nombres, para no confundirla con una fórmula equivocada (verificado contra `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`, sección 6.5, antes de asumir nada):** las columnas 8 y 9 (`estado_original`, `estado_normalizado`) parecen "iguales" porque ambas traen `'Resumen Actividades'!L2:L` (el `Estado` crudo, ej. `Pendiente`) — es correcto: en esta hoja, `estado_normalizado` significa "categoría ya homologada", y como el catálogo real no tuvo ninguna variante que homologar (`MATRIZ_HOMOLOGACION_HISTORICA.md`, sección 1), coincide con el original. La columna 10 (`clasificacion`) es la que trae el balde `ABIERTO`/`TERMINAL`/`AMBIGUO` (`'Resumen Actividades'!T2:T`) — es un nombre distinto al de la columna `Estado normalizado` de `Resumen Actividades` (sección 2 de este documento), que sí es ese mismo balde. Dos hojas, mismo tipo de nombre, significado distinto — no son la misma cosa.

**⚠ Antes de reutilizar esta fórmula en producción:** el valor `"SIM-20260728"` (columna `batch_id`) es un identificador de **simulación** — no debe copiarse tal cual al archivo real. Reemplazar por un `batch_id` que identifique el lote real (por ejemplo, con la fecha real de `FECHA_INICIO_CORTE`), y quitar el condicional `("ALI-62176")+("ALI-23135")` de `motivo_excepcion` si en producción no aparecen exactamente esos dos IDs — revisar contra los duplicados reales que arroje la conciliación de producción (`PROCEDIMIENTO_DESPLIEGUE.md`, paso A.10), no asumir que van a ser los mismos dos.

**Nota de proceso (ya documentada en `auditoria/CHANGELOG.md`):** la primera versión de la fila de encabezados de esta hoja quedó corrida una columna por faltar `batch_id` — la fórmula de datos nunca estuvo mal, solo los títulos. Verificar los 17 encabezados contra el esquema antes de dar por buena la hoja.

---

## 5. Instrucciones de restauración

Si cualquiera de estas hojas se pierde o se rompe en la copia de prueba o en producción:

1. Confirmar que las hojas de las que depende cada fórmula existen (`Indice Idempotencia` para la sección 3; `Resumen Actividades` para `Registro Migración Histórica`).
2. Volver a pegar la fórmula correspondiente en la celda de origen indicada (siempre fila 2, columna según cada sección).
3. Esperar el recálculo — no hace falta ninguna acción adicional; las fórmulas son puramente de lectura sobre las hojas fuente.
4. Si la hoja restaurada es `Resumen Actividades`, volver a aplicar la protección de hoja (`Datos → Hojas y rangos protegidos`) — se pierde al eliminar y recrear la hoja.

## 6. Rangos y política de crecimiento

Todas las fórmulas de arriba usan rangos abiertos (`A5:A`, `A5:Q`, etc.) sobre las hojas de negocio — no tienen un límite superior fijo, a diferencia de las fórmulas de `Dashboard`, que sí están topadas en `$5:$204` (hallazgo de la Etapa 1, Fase 8.1). Esto significa que `Resumen Actividades` seguirá capturando filas nuevas más allá de la fila 204 aunque `Dashboard` deje de reflejarlas — vale la pena tenerlo presente como una discrepancia posible entre ambas vistas si el volumen de alguna hoja de negocio crece mucho.

Las referencias cruzadas hacia `Indice Idempotencia` y `Registro Migración Histórica` (sección 3) sí están topadas en `2:1000` — ampliar ese límite si alguna de las dos hojas creciera más allá de 999 filas de datos.
