# Matriz de homologación histórica — Fase 8.1

**Origen:** Etapa 2 de la Fase 8.1 (`PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`), según el flujo propuesto en `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`, sección 7. Consolida, con datos reales relevados sobre una copia aislada del archivo productivo (`documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`), las cinco aprobaciones que exige esa etapa.

**Fecha de cierre:** 28/07/2026. **Responsable:** Carlos Rubén Bageta.

---

## 1. Catálogo de estados

**Fuente:** `Listas!D` (catálogo oficial real, no el tentativo original de la propuesta). Ver DEC-015 (`auditoria/DECISIONES.md`).

| Categoría | Valores |
|---|---|
| Abierto | `Pendiente`, `En curso`, `Bloqueada`, `En revisión` |
| Terminal | `Completada` |
| Ambiguo (fail-safe) | Cualquier otro valor — vacío, desconocido, o `Cancelada` (no existe en `Listas!D`, no se asume terminal sin revisión si apareciera) |

**Confirmado contra datos reales:** las 27 filas activas de las cinco hojas usan únicamente `Pendiente` (22) y `Completada` (5) — ningún valor fuera de este catálogo. Coincide exactamente con la fila `TOTAL` del `Dashboard` productivo existente.

## 2. Prioridad

**Fuente:** `Listas!C` — catálogo oficial: `Crítico`, `Alto`, `Medio`, `Bajo`.

**Hallazgo real:** `Prioridad final` está **vacía en el 100% de las filas activas** de las cinco hojas (1/1 Finanzas, 3/3 Comercial, 3/3 Soporte, 18/18 Desarrollo IT, 2/2 Gestión General — 27 de 27 en total).

**Decisión:** no hay valores que homologar — no es un problema de variantes o errores de tipeo, es un vacío total del histórico. `Resumen Actividades` debe mostrar estas filas con `Prioridad final` vacía tal cual (no inventar un valor por defecto, mismo principio que rige para fechas y responsables en la propuesta, sección 6.6). Sin impacto en el catálogo de `Prioridad sugerida IA`/`Prioridad final` que ya usa el pipeline v3 (`codigo/esquema_json.gs`), que no se modifica.

## 3. Responsable

**Fuente:** `Listas!E` — catálogo oficial: `Socio Administración`, `Socio Comercial`, `Responsable Soporte`, `Responsable Técnico`, `Socio Dirección`, `Contador externo`, `Proveedor externo`, `Cliente`, `Sin asignar`, `Equipo completo`.

**Valores reales encontrados (28/07/2026):**

| Hoja | Responsable real | Cantidad |
|---|---|---|
| Finanzas | `Socio Administración` | 1 |
| Comercial | `Socio Comercial` | 3 |
| Soporte | `Responsable Soporte` | 3 |
| Desarrollo IT | `Responsable Técnico` | 15 |
| Desarrollo IT | `Sin asignar` | 2 |
| Desarrollo IT | `Socio Dirección` | 1 |
| Gestión General | `Socio Dirección` | 1 |
| Gestión General | *(vacío)* | 1 |

Subtotales verificados contra el total de filas activas de cada hoja (Desarrollo IT: 15+2+1=18; Gestión General: 1+1 vacío=2).

**Decisión:** los seis valores reales encontrados coinciden **exactamente**, sin ninguna variante de mayúsculas, espacios o error de tipeo, con el catálogo oficial de `Listas!E`. No se requiere ninguna tabla de equivalencias — se usan tal cual. La única fila con `Responsable` vacío (Gestión General) se muestra sin inventar un valor, consistente con la sección 6.6 de la propuesta ("usar `Sin asignar` cuando corresponda por decisión explícita, no por ausencia interpretada" — acá la ausencia queda como vacío, no se reclasifica automáticamente a `Sin asignar`, ya que eso sería una decisión editorial no pedida).

## 4. Formato de ID histórico

**Regla (propuesta, sección 6.4):** conservar el `ID` original si es no vacío, único, estable y no colisiona con el espacio `ALI-...` del pipeline v3. Si falta o colisiona, asignar `HIST-{CODIGO_HOJA}-{IDENTIFICADOR_ESTABLE}` (códigos de hoja: `FIN`, `COM`, `SOP`, `DIT`, `GES`), generado una sola vez y persistido en `Registro Migración Histórica`.

**Confirmado contra datos reales:** **0 IDs vacíos y 0 IDs duplicados** (dentro de cada hoja y entre las cinco hojas) en la totalidad de las 27 filas activas (`documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`, sección 1.3).

**Decisión:** con los datos actuales, el mecanismo `HIST-{CODIGO_HOJA}-{ID}` **no tiene ningún caso real que resolver hoy** — todos los IDs existentes se conservan tal cual (D4b). La regla y el algoritmo de generación quedan documentados como resguardo para datos futuros (nuevas filas históricas que pudieran aparecer antes del corte, o crecimiento del volumen), no como algo a ejecutar en esta corrida.

## 5. Reglas de posibles duplicados

**Regla (D4a, DEC-013):** un posible duplicado de contenido nunca se elimina automáticamente; siempre va a revisión humana con ambas referencias visibles. Niveles de detección (propuesta, sección 6.7): ID exacto, huella exacta (`Grupo origen` + `Resumen` + `Responsable` + `Fecha límite`), similitud semántica (solo sugerencia), cruce histórico/nuevo.

**Confirmado contra datos reales:** **2 casos reales de huella exacta repetida, únicamente en `Desarrollo IT`** (0 en las otras cuatro hojas), sobre un total de 18 filas activas en esa hoja.

**Revisión humana (Etapa 4, 28/07/2026):** identificadas y resueltas. El par real es `ALI-62176` (`Fecha de entrada` 12/07/2026) y `ALI-23135` (`Fecha de entrada` 14/07/2026) — mismo `Grupo origen` (Desarrollo IT), mismo `Resumen de tarea` exacto ("El script 'Automatizacion para generar tareas' ha fallado en varias ocasiones y requiere atención inmediata."), mismo `Responsable` (`Responsable Técnico`), misma `Fecha límite` (vacía en ambas); `ID` distinto en cada una. Ambas son notificaciones automáticas de Apps Script (remitente `noreply-apps-scripts-notifications@google.com`) sobre el mismo problema recurrente, recibidas con 2 días de diferencia — no una misma actividad cargada dos veces por error.

Otras dos filas con el mismo texto de resumen (`ALI-71447`, `Fecha límite` 07/06/2026; `ALI-13077`, `Fecha límite` 10/07/2026) **no** forman parte del duplicado: sus fechas límite difieren entre sí y de las dos anteriores, así que no coinciden en la huella completa — confirma que la detección por huella de 4 campos funciona correctamente (el texto solo no alcanza para considerarlas duplicadas).

**Decisión (Carlos Rubén Bageta, 28/07/2026): `CONSERVAR` ambas** (`ALI-62176` y `ALI-23135`). No se elimina ni se fusiona ninguna fila — quedan como dos actividades independientes en `Resumen Actividades`, consistente con D4a.

## 6. Criterios de inclusión y excepciones

**Regla fail-safe (DEC-015):** solo se excluyen del conjunto de "no resueltos" los estados expresamente clasificados como terminales (únicamente `Completada`, sección 1 de esta matriz). Vacíos, desconocidos y cualquier valor no contemplado se incluyen siempre y pasan a revisión — nunca se excluyen silenciosamente.

**Excepciones documentadas en esta matriz** (ninguna bloquea la inclusión, todas quedan visibles en `Resumen Actividades` con su alerta correspondiente):

- 27 de 27 filas activas con `Prioridad final` vacía (sección 2).
- 1 fila (Gestión General) con `Responsable` vacío (sección 3).
- 2 filas (Desarrollo IT) marcadas como posible duplicado de contenido, pendientes de revisión humana (sección 5).

---

## Cierre

Las 5 partes de la Etapa 2 quedan aprobadas con datos reales. Sigue la Etapa 3 (simulación completa en una copia aislada del archivo: crear `Registro Migración Histórica` y `Resumen Actividades`, probar filtros/enlaces/conteos/rendimiento) y la Etapa 4 (revisión humana de los puntos marcados como excepción arriba, en particular los 2 posibles duplicados de Desarrollo IT).

**Aprobado por:** Carlos Rubén Bageta — 28/07/2026.
