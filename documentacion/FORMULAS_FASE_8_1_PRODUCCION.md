# Fórmulas de producción — Fase 8.1

**Redactado:** 28/07/2026, en respuesta al hallazgo BLQ-01 de `auditoria/AUDITORIA_PROCEDIMIENTOS_DESPLIEGUE_REVERSION_FASE_9.md`: las fórmulas de `Resumen Actividades` y `Registro Migración Histórica` estaban descritas en prosa (`auditoria/CHANGELOG.md`) pero nunca capturadas textualmente en ningún archivo del repositorio.

**Estado honesto de este documento — léase antes de usarlo:** Claude no tiene acceso directo a Google Sheets. Todo lo que sigue es o bien texto que Carlos Rubén Bageta pegó literalmente en el chat (marcado **VERBATIM**), o bien la última versión que Claude propuso y Carlos confirmó que *funciona* semánticamente, pero cuyo texto final exacto no fue vuelto a pegar tal como quedó en la celda real, porque en el camino hizo falta "cambiar ligeramente algunas sintaxis" (marcado **NO VERBATIM — confirmar contra la celda real**). No completar el despliegue productivo sin antes reemplazar cada fórmula marcada así por el texto real, copiado directamente de la barra de fórmulas de la copia de prueba.

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

## 2. `Resumen Actividades`, columnas `Estado normalizado` (T) y `Abrir origen` (U) — **NO VERBATIM, confirmar contra la celda real**

Estas dos columnas fueron diseñadas y confirmadas funcionando (Etapa 3, Fase 8.1), pero el texto que sigue es la última versión que Claude propuso — Carlos ajustó sintaxis sobre la marcha y el resultado final tal como quedó en la celda **no fue vuelto a pegar en el chat**.

**Antes de usar esta sección en producción:** en la copia de prueba, hacer clic en `Resumen Actividades!T2` y `!U2`, copiar el contenido exacto de la barra de fórmulas, y reemplazar lo de abajo.

Estado normalizado (propuesta, columna T2), clasifica `Estado` — columna L de la sección 1 — contra el catálogo real (DEC-015):

```text
=ARRAYFORMULA(SI(A2:A="";"";
  SI(L2:L="Completada";"TERMINAL";
  SI(O(L2:L="Pendiente";L2:L="En curso";L2:L="Bloqueada";L2:L="En revisión");"ABIERTO";
  "AMBIGUO"))))
```

Abrir origen (propuesta, columna U2), `HYPERLINK` a la fila real de origen usando el `gid` de cada hoja — **los 5 `gid` de abajo son los de la copia de prueba, no reutilizar en producción** (ver `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`, advertencia de la sección 0):

```text
=ARRAYFORMULA(SI(A2:A="";"";
  HYPERLINK("#gid="&
    SI(A2:A="Finanzas";"2059391676";
    SI(A2:A="Comercial";"390138063";
    SI(A2:A="Soporte";"1987525587";
    SI(A2:A="Desarrollo IT";"704403620";
    "102851714"))))
    &"&range=A"&B2:B;
    "Abrir origen")))
```

**Hallazgo real de fragilidad (Etapa 3, ya documentado en `auditoria/CHANGELOG.md`):** un doble clic accidental en una celda de esta columna entra en modo edición y pega un valor fijo, lo que rompe la expansión de la fórmula de matriz para las 27 filas (`#REF!` desde la celda origen), no solo la celda tocada. Mitigado protegiendo toda la hoja (`Datos → Hojas y rangos protegidos`) — ver `PROCEDIMIENTO_DESPLIEGUE.md`, paso A.9.

---

## 3. `Resumen Actividades`, columna `Origen del registro` (V) — **NO VERBATIM, confirmar contra la celda real**

Última versión corregida (usa columna `C` para el `ID`, no `A` — ver el bug documentado en la sección 1). Semánticamente confirmada: las 27 filas dieron `Histórico/pre-corte` tras la corrección, 0 en las otras dos categorías. El texto exacto que quedó en la celda **no fue vuelto a pegar en el chat** tras la corrección.

```text
=ARRAYFORMULA(SI(A2:A="";"";
  SI(COUNTIF('Indice Idempotencia'!B2:B1000;C2:C)>0;"Automatización v3";
  SI(COUNTIF('Registro Migración Histórica'!C2:C1000;C2:C)>0;"Histórico/pre-corte";
  "Revisión de origen"))))
```

**Requiere que `Indice Idempotencia` y `Registro Migración Histórica` ya existan como hojas** (aunque estén vacías) — si falta cualquiera de las dos, esta columna específicamente muestra error de referencia hasta que se cree. No afecta al resto de `Resumen Actividades`. Ver el orden recomendado en `PROCEDIMIENTO_DESPLIEGUE.md` (A.5 antes que A.6).

**Resultado esperado en producción, el día del corte:** con `Indice Idempotencia` recién creada y vacía (nadie procesó todavía ningún mensaje con v3), **todas las filas deberían dar `Histórico/pre-corte`**, igual que en la copia de prueba — 0 en `Automatización v3` es lo esperado, no un error.

---

## 4. `Registro Migración Histórica`, fórmula principal — **FALTA POR COMPLETO**

A diferencia de las anteriores, esta fórmula **nunca fue pegada en el chat en ningún momento** — solo se describió en prosa ("las 17 columnas pobladas por fórmula desde `Resumen Actividades`, mediante una fórmula única `HSTACK`"). Este documento no puede darla por buena de memoria ni reconstruirla — sería inventar contenido que después alguien podría copiar a producción sin saber que es una reconstrucción, no el original.

**Antes de poder usar este documento para el despliegue real:** Carlos Rubén Bageta necesita pegar acá el contenido exacto de la celda `A2` de `Registro Migración Histórica` (barra de fórmulas, copia de prueba), incluyendo el encabezado final de las 17 columnas (recordar el bug ya corregido una vez: la primera versión tenía los encabezados corridos una columna por faltar `batch_id`).

```text
(pendiente — pegar acá el texto real de Registro Migración Histórica!A2)
```

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
