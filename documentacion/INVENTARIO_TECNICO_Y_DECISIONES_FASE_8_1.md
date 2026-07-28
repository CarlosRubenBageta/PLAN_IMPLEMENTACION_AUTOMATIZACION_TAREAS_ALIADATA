# Inventario técnico y decisiones pendientes — Fase 8.1

**Origen:** deriva de `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md` (secciones 3 y 6.3), separando lo que es un dato objetivo verificable de lo que es un criterio de negocio. El objetivo es que Carlos Rubén Bageta pueda resolver la parte técnica sin tener que decidir nada todavía, y decidir solo lo que realmente requiere su criterio.

**Corrección (27/07/2026):** una revisión encontró que varias fórmulas de la versión anterior de este documento eran incorrectas (dos daban siempre cero o subcontaban por usar la propia columna auditada como ancla; los `COUNTBLANK` sin acotar contaban toda la hoja, no solo las filas con actividad; el chequeo de Estado excluía los vacíos que decía relevar; dos verificaciones quedaban conceptuales en vez de ser fórmulas cerradas) y que este documento se contradecía al decir "solo lectura" mientras sugería crear una hoja nueva dentro del archivo original. Todo corregido en esta versión.

## Antes de empezar

- **Trabajá exclusivamente sobre una copia del archivo**, nunca en el productivo — ni siquiera para agregar una hoja de relevamiento descartable. Crear una pestaña nueva ya es escribir en el archivo. `Archivo → Hacer una copia` alcanza.
- **Configuración regional:** si tus Sheets están en español/configuración regional argentina, el separador de argumentos de las fórmulas es `;`, no `,`. Todas las fórmulas de abajo están escritas con `,` (estilo internacional) — reemplazá por `;` si Sheets te marca error de sintaxis.
- **Hojas con espacio en el nombre** (`Desarrollo IT`, `Gestión General`) necesitan comillas simples en las fórmulas: `'Desarrollo IT'!A2:A1000`, no `Desarrollo IT!A2:A1000`.
- **Rangos acotados:** las fórmulas usan `2:1000` como rango de trabajo. Antes de nada, corré la fórmula de volumen (1.1) para saber cuántas filas reales tiene cada hoja; si alguna supera 1000, cambiá el `1000` de todas sus fórmulas por un número mayor (por ejemplo `5000`) para no dejar filas reales afuera. Un rango innecesariamente enorme (columnas completas sin acotar) puede volverse lento de recalcular.
- **Columnas confirmadas (27/07/2026):** Carlos Rubén Bageta confirmó que el orden real de columnas de las cinco hojas coincide exactamente con `documentacion/MAPA_COLUMNAS.md`. Las fórmulas de abajo se pueden usar tal cual, sin ajustar letras.

---

## Parte 1 — Inventario técnico (sin decisión de negocio)

Repetir por cada una de las cinco hojas operativas (`Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT`, `Gestión General`) en tu copia de relevamiento. Los ejemplos usan `Finanzas`; para las demás, reemplazá el nombre de hoja (con comillas simples si tiene espacio).

Todas las fórmulas que necesitan saber "esta fila tiene una actividad real" arman esa condición combinando varias columnas (`ID`, `Fecha de entrada`, `Asunto original`, `Resumen de tarea`) en vez de depender de una sola — así, una fila con esos tres últimos campos completos pero `ID` vacío sigue contando como una fila real, y viceversa.

### 1.1 Volumen

| Dato | Fórmula |
|---|---|
| Filas con datos (excluyendo encabezado) | `=SUMPRODUCT(--((Finanzas!A2:A1000<>"")+(Finanzas!B2:B1000<>"")+(Finanzas!F2:F1000<>"")+(Finanzas!G2:G1000<>"")>0))` |
| Filas agregadas en los últimos 12 meses (`Fecha de entrada` = columna B) | `=COUNTIFS(Finanzas!B2:B1000, ">="&EDATE(TODAY(),-12))` |

Corré esta primero: si el resultado se acerca a 1000, ampliá el rango de **todas** las fórmulas de esta hoja antes de seguir.

### 1.2 Estados (columna 10, `Estado`)

| Dato | Fórmula |
|---|---|
| Valores únicos, con conteo por valor (incluye vacíos) | `=QUERY(Finanzas!J2:J1000, "select J, count(J) group by J label count(J) 'cantidad'")` |
| Estado vacío en filas con datos | `=SUMPRODUCT(((Finanzas!A2:A1000<>"")+(Finanzas!B2:B1000<>"")+(Finanzas!F2:F1000<>"")+(Finanzas!G2:G1000<>"")>0)*(Finanzas!J2:J1000=""))` |

La primera fórmula ya no excluye vacíos (antes lo hacía por error); igual conviene ajustar el `1000` al total real de 1.1 para que el grupo "vacío" no se infle con filas sin usar más allá de tus datos. Este es el insumo directo para D2 (Parte 2) — no clasificar todavía, solo relevar qué valores existen (incluyendo variantes de mayúsculas/minúsculas, espacios y errores de tipeo).

### 1.3 Identidad (columna 1, `ID`)

| Dato | Fórmula |
|---|---|
| IDs vacíos en filas con datos | `=SUMPRODUCT(((Finanzas!B2:B1000<>"")+(Finanzas!F2:F1000<>"")+(Finanzas!G2:G1000<>"")>0)*(Finanzas!A2:A1000=""))` |
| IDs duplicados dentro de la hoja | `=SUMPRODUCT((COUNTIF(Finanzas!A2:A1000,Finanzas!A2:A1000)>1)*(Finanzas!A2:A1000<>""))` |
| IDs que también aparecen en otra hoja | `=SUMPRODUCT((Finanzas!A2:A1000<>"")*((COUNTIF(Comercial!A2:A1000,Finanzas!A2:A1000)>0)+(COUNTIF(Soporte!A2:A1000,Finanzas!A2:A1000)>0)+(COUNTIF('Desarrollo IT'!A2:A1000,Finanzas!A2:A1000)>0)+(COUNTIF('Gestión General'!A2:A1000,Finanzas!A2:A1000)>0)>0))` |

La tercera ya es una fórmula cerrada (antes quedaba como instrucción conceptual): repetila para cada una de las cinco hojas, comparando siempre contra las otras cuatro.

### 1.4 Fechas

| Dato | Fórmula |
|---|---|
| `Fecha de entrada` (columna B) vacía en filas con datos | `=SUMPRODUCT(((Finanzas!A2:A1000<>"")+(Finanzas!F2:F1000<>"")+(Finanzas!G2:G1000<>"")>0)*(Finanzas!B2:B1000=""))` |
| `Fecha de entrada` con texto no reconocible como fecha (no vacía) | `=SUMPRODUCT((Finanzas!B2:B1000<>"")*(1-ISNUMBER(Finanzas!B2:B1000)))` |
| `Fecha límite` (columna L) vacía y con texto inválido | mismas dos fórmulas de arriba, sustituyendo `B` por `L` |
| `Fecha límite` vencida (anterior a hoy) | `=COUNTIFS(Finanzas!L2:L1000, "<"&TODAY(), Finanzas!L2:L1000, "<>")` |

Antes daba un solo número mezclando "vacía" e "inválida"; ahora son dos conteos separados y con eso alcanza para tener el panorama completo.

### 1.5 Responsables y prioridad

| Dato | Fórmula |
|---|---|
| `Responsable` (columna K) vacío en filas con datos | `=SUMPRODUCT(((Finanzas!A2:A1000<>"")+(Finanzas!F2:F1000<>"")+(Finanzas!G2:G1000<>"")>0)*(Finanzas!K2:K1000=""))` |
| Valores únicos de `Responsable` | `=QUERY(Finanzas!K2:K1000, "select K, count(K) where K is not null group by K")` — sirve para ver si son nombres, roles, o una mezcla |
| `Prioridad final` (columna I) vacía en filas con datos | `=SUMPRODUCT(((Finanzas!A2:A1000<>"")+(Finanzas!F2:F1000<>"")+(Finanzas!G2:G1000<>"")>0)*(Finanzas!I2:I1000=""))` |
| Valores únicos de `Prioridad final` | `=QUERY(Finanzas!I2:I1000, "select I, count(I) where I is not null group by I")` — comparar contra el catálogo que ya usa el pipeline v3 (`codigo/esquema_json.gs` / `documentacion/REGLAS_FUNCIONALES.md`) |

### 1.6 Otros

| Dato | Fórmula |
|---|---|
| `Resumen de tarea` (columna G) vacío en filas con datos | `=SUMPRODUCT(((Finanzas!A2:A1000<>"")+(Finanzas!B2:B1000<>"")+(Finanzas!F2:F1000<>"")>0)*(Finanzas!G2:G1000=""))` |

**Posibles duplicados de contenido** (misma `Grupo origen` + `Resumen` + `Responsable` + `Fecha límite`) — necesita una columna auxiliar en tu hoja de relevamiento, por ejemplo `HuellaFinanzas`:

1. En una columna auxiliar (fila 2 en adelante): `=ARRAYFORMULA(Finanzas!D2:D1000&"|"&Finanzas!G2:G1000&"|"&Finanzas!K2:K1000&"|"&Finanzas!L2:L1000)`.
2. Conteo de huellas repetidas, en otra celda (ajustá `HuellaFinanzas2:HuellaFinanzas1000` al rango real donde pegaste la fórmula anterior): `=SUMPRODUCT((COUNTIF(HuellaFinanzas2:HuellaFinanzas1000,HuellaFinanzas2:HuellaFinanzas1000)>1)*(HuellaFinanzas2:HuellaFinanzas1000<>"|||"))`.

Filas ocultas manualmente: revisar visualmente (clic derecho sobre los números de fila → "Mostrar filas"); Sheets no tiene una fórmula directa. Filtros o rangos protegidos existentes: `Datos → Vistas y filtros` y `Datos → Hojas y rangos protegidos` — también es revisión visual.

### 1.7 `Dashboard` y `Listas`

- ¿Qué fórmulas usa `Dashboard` hoy? ¿Referencian columnas completas o rangos fijos de las cinco hojas? ¿Hay gráficos o tablas dinámicas que dependan de la posición actual de columnas/filas?
- ¿Qué contiene `Listas` hoy? ¿Ya existe algún catálogo de estados, prioridades o responsables reutilizable, o habría que crear uno nuevo?

**Salida de la Parte 1:** un informe (una copia de este documento con las tablas completadas, o una hoja de cálculo aparte) con los números y valores reales de cada punto, relevado sobre una copia del archivo. No hace falta interpretarlos todavía — eso es la Parte 2.

### Parte 1 completada (28/07/2026) — hallazgos reales

- **Volumen:** Finanzas 1, Comercial 3, Soporte 3, Desarrollo IT 18, Gestión General 2 — 27 filas activas en total.
- **Estado real por hoja:** Finanzas `Pendiente`=1; Comercial `Completada`=3; Soporte `Completada`=2 + `Pendiente`=1; Desarrollo IT `Pendiente`=18; Gestión General `Pendiente`=2. Total: `Pendiente`=22, `Completada`=5 — coincide exactamente con la fila `TOTAL` del `Dashboard` existente (27 / 22 Pendientes / 5 Completadas / 0 en el resto), confirmado por tres fuentes independientes. Ningún valor fuera del catálogo oficial de `Listas!D` apareció en los datos reales.
- **IDs:** 0 vacíos, 0 duplicados (dentro de cada hoja y entre las cinco) en las 27 filas activas.
- **Prioridad final:** vacía en el 100% de las filas activas de las cinco hojas — sin valores que homologar, es un vacío total del histórico, no variantes de texto.
- **Responsable:** coincide exactamente con el catálogo oficial de `Listas!E`, sin ningún typo ni variante — `Socio Administración`(1, Finanzas), `Socio Comercial`(3, Comercial), `Responsable Soporte`(3, Soporte), `Responsable Técnico`(15)+`Sin asignar`(2)+`Socio Dirección`(1) en Desarrollo IT, `Socio Dirección`(1)+1 vacío en Gestión General.
- **Posibles duplicados de contenido:** 2 casos reales, únicamente en Desarrollo IT (0 en el resto) — pendientes de revisión humana en la Etapa 4, no resueltos en el inventario.
- Detalle completo de fechas (vacías/inválidas/vencidas) queda en la copia de relevamiento de Carlos Rubén Bageta, no reproducido aquí. Ver `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md` para el cierre formal de la Etapa 2 con estos datos.
- **`Dashboard` (hallazgo importante):** sus fórmulas (`CONTAR.SI`/`CONTAR.SI.CONJUNTO`) leen `Finanzas!$J$5:$J$204` — es decir, los datos reales de las cinco hojas arrancan en la **fila 5** (no la 2; probablemente título/descripción en filas 1-3 y encabezados de columna en la 4), con un **tope fijo en la fila 204** (200 filas de margen). Desarrollo IT ya tiene 18 filas — si algún tablero supera las 200, `Dashboard` empezaría a excluir filas nuevas sin error visible. No bloquea esta fase, pero es un riesgo real a tener en cuenta para el diseño de `Resumen Actividades` y quedó registrado (ver RH-05/RH-10 de la propuesta). El gráfico de `Dashboard` depende de su propio cuadro resumen, no directamente de las cinco hojas — no se ve afectado por nada de lo que agregue esta fase.
- **`Listas`:** ya contiene los catálogos oficiales reales — `Estado` (columna D), `Prioridad` (columna C: Crítico/Alto/Medio/Bajo), `Responsable` (columna E), `Grupo origen` (columna B) y `Fuente` (columna A) — sin fórmulas, solo listas estáticas. Reutilizable directamente como base del catálogo de homologación de la Fase 8.1, en vez de crear uno nuevo desde cero.

---

## Parte 2 — Decisiones que sí requieren tu aprobación

Reducida a lo que genuinamente no se puede resolver mirando los datos. Para cada una se indica si la propuesta ya trae una recomendación por defecto (para que puedas simplemente ratificarla si estás de acuerdo, en vez de decidir desde cero).

| # | Decisión | Recomendación por defecto de la propuesta | Estado |
|---|---|---|---|
| D1 | ¿La nueva automatización se despliega sobre el **mismo archivo maestro** productivo (no uno nuevo)? | Sí, es el escenario recomendado (sección 6.1) — el alternativo (archivo nuevo) exige una migración física completa | **Confirmado (27/07/2026):** sí, sobre la planilla productiva actual — hoy solo tiene las cinco hojas de negocio + `Dashboard` + `Listas`, sin `Log Mensajes`/`Registro Tareas`/`Indice Idempotencia` (esas se crean durante la Fase 9, ya estaba previsto). |
| D2 | Catálogo de estados: cuáles son **terminales** (no aparecen como pendientes) y cuáles **abiertos** o **ambiguos** | Catálogo tentativo de la propuesta (sección 6.2): abiertos `Pendiente`/`En curso`/`Bloqueada`; terminales `Completada`/`Cancelada`; todo lo demás, ambiguo | **Confirmado (28/07/2026), con el catálogo oficial real de `Listas!D`, no el tentativo:** abiertos `Pendiente`/`En curso`/`Bloqueada`/`En revisión`; terminal `Completada`; ambiguo cualquier otro valor (vacío, desconocido, o `Cancelada` — no existe en `Listas!D`, no se asume terminal sin revisión si apareciera). Difiere del tentativo en dos puntos: `Cancelada` no es un valor real; `En revisión` sí existe y no estaba contemplado (confirmado como abierto). |
| D3 | ¿Se necesita poder **editar** estado/responsable/prioridad directamente desde `Resumen Actividades`, ahora o en un futuro cercano? | No por ahora — el resumen es de solo lectura (sección 5.1) | **Confirmado (27/07/2026):** solo lectura por ahora. |
| D4a | ¿Un posible duplicado de contenido **nunca se elimina automáticamente** y siempre va a revisión humana? | Sí (sección 6.7) | **Confirmado (27/07/2026)**, según el default. |
| D4b | ¿Un ID histórico válido y único **se conserva tal cual**, sin reemplazarlo? | Sí (sección 6.4) | **Confirmado (27/07/2026)**, según el default. |
| D5a | ¿Quién aprueba el informe final de conciliación histórica? | Por defecto, se asume que sos vos (mismo criterio que toda la Fase 8) | **Confirmado (27/07/2026)**, según el default. |
| D5b | ¿Quién puede modificar en el futuro el catálogo de equivalencias de estados? | Por defecto, se asume que sos vos — pero podría ser un rol distinto al de D5a si en algún momento delegás la operación diaria | **Confirmado (27/07/2026)**, según el default. |

**Decisiones que se posponen a después del inventario** (no tiene sentido resolverlas ahora, mirando datos que todavía no existen):

- Tiempo de actualización aceptable para el resumen (inmediato / 5 minutos / diario) — se decide después de medir el rendimiento real con el volumen de la Parte 1.1, no antes.
- Volumen proyectado a 1-3 años — se estima mejor una vez que se conoce la tasa de crecimiento real de los últimos 12 meses (Parte 1.1).
- ¿El resumen abre por defecto en "Todas" o en "No resueltas"? — es una preferencia de uso menor, se puede decidir junto con el resto de las vistas funcionales (sección 5.5 de la propuesta) cuando se prototipe.

---

## Cómo seguir

**Cerrado (28/07/2026): las 7 decisiones (D1, D2, D3, D4a, D4b, D5a, D5b) están confirmadas y la Parte 1 completa.** Sigue la redacción formal de la Fase 8.1 en `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`, con datos reales en vez de supuestos.
