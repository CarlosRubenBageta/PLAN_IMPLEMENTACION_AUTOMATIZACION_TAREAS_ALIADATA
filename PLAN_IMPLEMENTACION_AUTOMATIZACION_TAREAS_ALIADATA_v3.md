# Plan maestro de implementación  
## Automatización de tareas desde Gmail hacia tableros de Aliadata

**Archivo:** `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md`  
**Versión:** 3.0 — incorpora la auditoría técnica externa del 2026-07-19 (`AUDITORIA_PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v2.md`)  
**Responsable funcional:** Rubén  
**Cuenta operativa:** `tareas@alia-data.com`  
**Entorno:** Google Workspace + Gmail + Google Sheets + Apps Script + API de OpenAI  
**Modalidad de ejecución recomendada:** semiautomática, por fases y con aprobación humana entre fases

---

## 0. Historial de cambios

### Versión 3.0 (2026-07-19) — incorpora la auditoría técnica externa

1. **Gmail API por mensaje (auditoría 5.1):** se adopta el servicio avanzado de Gmail para etiquetar y archivar por mensaje individual, con habilitación en `appsscript.json`, alcances OAuth documentados, uso de IDs internos de etiquetas y registro del consumo de unidades de cuota (sección 7.3, Fases 3, 8 y 9).
2. **Modelo transaccional de registro (5.2):** la hoja única `Log Procesamiento` se reemplaza por `Log Mensajes` (una fila por mensaje) y `Registro Tareas` (una fila por tarea, con estados `RESERVADA`/`ESCRITA`), lo que permite recuperar escrituras parciales con precisión (Fase 2).
3. **Manifiesto persistido e IDs estables (5.3):** la clasificación validada se persiste como manifiesto antes de escribir; los IDs se asignan una sola vez y las recuperaciones no vuelven a consultar la IA. El hash del ID de mensaje se amplía a 16 caracteres y el formato pasa a `ALI-{HASH_MENSAJE_16}-{INDICE_PERSISTIDO}` (Fase 5).
4. **Ventana de corte (5.4):** el activador productivo permanece activo durante todo el desarrollo; se desactiva únicamente al abrir la ventana de corte en la Fase 9, registrando `FECHA_INICIO_CORTE` para no perder correos entre versiones (Fases 0 y 9).
5. **Modo de prueba aislado (5.5):** parámetros `MODO_PRUEBA`, `DRY_RUN`, `SPREADSHEET_ID_PRUEBA`, `GMAIL_QUERY_PRUEBA`, `PERMITIR_ARCHIVADO` y `PERMITIR_ETIQUETADO`, con aborto obligatorio si el modo prueba apunta a la planilla productiva (Fase 8).
6. **Contenido nuevo de respuestas (5.6):** `extraerContenidoNuevo()` elimina historial citado, encabezados de reenvío y firmas para no recrear tareas antiguas (Fases 3 y 4).
7. **Orden transaccional de 12 pasos (5.7):** secuencia obligatoria por mensaje y recuperación por etapa; si falla Gmail tras la escritura, solo se reintenta la actualización de Gmail (Fase 3).
8. **Seguridad (6.1–6.3):** protección del prompt contra instrucciones maliciosas incluidas en correos, sanitización de valores tipo fórmula antes de escribir en Sheets y enmascaramiento de datos sensibles antes de enviarlos a OpenAI (Fases 4 y 7, sección 9).
9. **Índice permanente de idempotencia (7.1):** hoja `Indice Idempotencia` de conservación indefinida; la retención de 6 meses aplica solo a la información ampliada del log.
10. **Enlace al correo (7.2):** se reemplaza la URL dependiente de `/u/0` por `getPermalink()` o un enlace explícito de la cuenta operativa (Fase 7).
11. **Fechas (7.3):** ISO 8601 como formato de intercambio con la IA; la escritura usa objetos `Date` con formato visual `dd/MM/yyyy` (Fases 2 y 7).
12. **Registro ampliado (7.4) y validación previa (7.5):** columnas de modelo, tokens, costo, request ID y duración; función `validarConfiguracion()` que aborta sin tocar Gmail ni Sheets ante configuración inválida (Fases 2 y 3).
13. **Saneamiento histórico (7.6) y alertas externas (7.7):** revisión de filas generadas por correos automáticos y envío de alertas a una cuenta técnica externa, nunca a `tareas@alia-data.com` (Fases 9 y 10).
14. **Casos de prueba CP-21 a CP-30** (Fase 8).

### Versión 2.0 (2026-07-19) — primera auditoría interna

1. **Búsqueda de mensajes:** se reemplaza la búsqueda por hilos sin etiqueta `Procesado` por una búsqueda `in:inbox` sin filtro de etiqueta. Las etiquetas de Gmail se aplican a nivel de hilo, por lo que el esquema anterior perdía las respuestas nuevas en hilos ya procesados. El descarte de mensajes ya tratados se realiza por idempotencia sobre el ID individual del mensaje.
2. **ID determinístico:** se define el método de abreviación del ID de mensaje (hash SHA-256 truncado) para eliminar el riesgo de colisión.
3. **Detección de ambigüedad:** se agregan los campos `requiere_revision` y `motivo_revision` al esquema JSON de la IA.
4. **Identificadores técnicos sin acentos:** estados, etapas y nombres de archivo normalizados a ASCII.
5. **Formato de `fecha_limite`:** ISO 8601 (`YYYY-MM-DD`).
6. **Ubicación del log:** hojas técnicas en el archivo maestro, con política de retención.
7. **Límite de cuerpo:** parámetro `MAX_CARACTERES_CUERPO`, valor inicial 8.000.
8. **Cuotas y costos de OpenAI:** HTTP 429 y cuota agotada como `ERROR_TEMPORAL` con reintento; consumo en los indicadores de monitoreo.
9. **Verificación de duplicados** contra el registro técnico, no leyendo las 5 hojas de destino.
10. **Consistencia documental:** estructura de carpetas completa; `script_refactorizado.gs` unificado; formato del `Link al correo` definido.
11. **Fecha de corte** para excluir mensajes históricos, y casos de prueba CP-19 y CP-20.

---

## 1. Propósito del documento

Este documento será la guía maestra para que Claude Cowork —y, cuando corresponda, Claude Code— pueda asistir en la actualización de la automatización que procesa los correos recibidos en `tareas@alia-data.com`.

La automatización deberá:

1. Leer el asunto y el cuerpo de cada mensaje nuevo.
2. Identificar todas las observaciones presentes.
3. Determinar si cada observación genera cero, una o varias tareas.
4. Crear una fila independiente por cada tarea.
5. Enviar cada tarea a la hoja correspondiente.
6. Evitar duplicados.
7. Registrar el procesamiento y los errores.
8. Archivar todos los mensajes procesados.
9. Trasladar a `Revisión manual` los mensajes sin tareas, con errores o con clasificación dudosa.
10. Recuperarse de interrupciones o ejecuciones incompletas.

---

## 2. Regla de ejecución para Claude Cowork

Claude Cowork debe trabajar **una fase por vez**.

No debe avanzar automáticamente a la fase siguiente sin que el responsable humano confirme que:

- los entregables fueron revisados;
- los criterios de aceptación se cumplieron;
- existe un respaldo actualizado;
- no se afectó el entorno productivo;
- se autorizó expresamente el siguiente paso.

### Regla principal

> Ninguna acción irreversible o que modifique el entorno productivo debe ejecutarse sin aprobación explícita de Rubén.

### Acciones que requieren aprobación humana

- Desactivar o crear activadores.
- Reemplazar el script productivo.
- Modificar hojas productivas.
- Crear, eliminar o renombrar etiquetas de Gmail.
- Archivar mensajes reales.
- Eliminar o mover filas existentes.
- Ejecutar pruebas con correos reales.
- Cambiar permisos de Google Workspace.
- Habilitar servicios avanzados o modificar los alcances de OAuth.
- Utilizar credenciales.
- Desplegar una nueva versión.
- Reactivar la automatización.

---

## 3. Estado actual del sistema

### 3.1. Flujo vigente

Actualmente, el script:

1. Busca hilos en la bandeja de entrada sin la etiqueta `Procesado`.
2. Recupera el último mensaje de cada hilo.
3. Envía asunto, remitente y cuerpo a OpenAI.
4. Recibe una única clasificación.
5. Crea una sola fila por correo.
6. Aplica la etiqueta `Procesado`.
7. Archiva el hilo.

### 3.2. Problemas confirmados

- Un correo puede contener varias observaciones, pero solo se genera una fila.
- Una observación puede generar varias tareas, pero el esquema actual solo admite una.
- Las tareas de un mismo correo pueden corresponder a hojas distintas.
- Se procesaron como tareas correos automáticos de Google.
- Las notificaciones de fallos de Apps Script fueron clasificadas como tareas.
- Se registraron ejecuciones con el error:

```text
The JavaScript runtime exited unexpectedly.
```

- El control actual depende de una etiqueta aplicada al hilo.
- Las etiquetas de Gmail operan a nivel de hilo: una respuesta nueva en un hilo ya etiquetado como `Procesado` vuelve a la bandeja de entrada pero queda excluida de la búsqueda, y su contenido se pierde.
- No existe control de idempotencia por ID de mensaje.
- No existe una hoja técnica de auditoría.
- Los identificadores actuales se generan aleatoriamente.
- Se utiliza `appendRow()` para cada registro.
- La búsqueda de Gmail recupera todos los hilos coincidentes antes de limitar el bucle.
- No existe aislamiento completo de errores por mensaje.
- No existe recuperación formal ante interrupciones.

---

## 4. Decisiones funcionales confirmadas

### 4.1. Fuente de correos

Se procesarán todos los mensajes nuevos de la bandeja de entrada de:

```text
tareas@alia-data.com
```

La cuenta está dedicada exclusivamente al relevamiento de tareas.

**Regla de búsqueda:** la búsqueda de Gmail será `in:inbox`, **sin filtrar por etiqueta**. El descarte de mensajes ya tratados se realiza comprobando el ID individual de cada mensaje contra las hojas técnicas (`Log Mensajes` e `Indice Idempotencia`). Esto garantiza que las respuestas nuevas en hilos ya procesados también generen tareas.

### 4.2. Contenido analizado

Se analizarán:

- asunto;
- remitente;
- cuerpo en texto plano, normalizado y truncado a un máximo configurable (`MAX_CARACTERES_CUERPO`, valor inicial: 8.000 caracteres; todo truncamiento se registra en el log);
- de las respuestas, únicamente el **contenido nuevo**: se elimina el historial citado, los encabezados de reenvío y las firmas mediante `extraerContenidoNuevo()` (v3);
- fecha;
- enlace al correo.

No se analizarán, en esta fase:

- archivos PDF;
- documentos Word;
- planillas;
- imágenes;
- capturas;
- correos `.eml` adjuntos.

### 4.3. Cardinalidad

```text
Un correo → una o varias observaciones
Una observación → cero, una o varias tareas
Una tarea → una fila
```

### 4.4. Hojas de destino

Los nombres exactos son:

```text
Finanzas
Comercial
Soporte
Desarrollo IT
Gestión General
```

### 4.5. Estructura de los tableros

Se mantienen las 17 columnas existentes y el mismo orden:

1. ID
2. Fecha de entrada
3. Fuente
4. Grupo origen
5. Remitente
6. Asunto original
7. Resumen de tarea
8. Prioridad sugerida IA
9. Prioridad final
10. Estado
11. Responsable
12. Fecha límite
13. Link al correo
14. Link a Drive
15. Derivada a
16. Última actualización
17. Observaciones

### 4.6. Uso de las columnas de texto

- **Resumen de tarea:** acción concreta, breve y ejecutable.
- **Observaciones:** texto original de la observación que originó la tarea.

No se agregará una columna adicional llamada `Resumen`.

### 4.7. Tratamiento de mensajes

**Nota (v3):** las etiquetas y el archivado se aplican **por mensaje individual** mediante el servicio avanzado de Gmail (Gmail API). La tabla describe el resultado para cada mensaje, no para el hilo completo.

| Resultado | Crea filas | Etiqueta | Archiva |
|---|---:|---|---:|
| Tareas válidas | Sí | `Procesado` | Sí |
| Sin tareas detectadas | No | `Revisión manual/Sin tareas detectadas` | Sí |
| Error de procesamiento | No | `Revisión manual/Error de procesamiento` | Sí |
| Notificación de Apps Script | No | `Revisión manual/Error de automatización` | Sí |
| Correo promocional o informativo | No | `Revisión manual/Sin tareas detectadas` | Sí |
| Clasificación inválida | No | `Revisión manual/Error de procesamiento` | Sí |

### 4.8. Alcance temporal

El nuevo script procesará únicamente mensajes nuevos.

No se reprocesarán automáticamente mensajes históricos con la etiqueta `Procesado`.

**Ventana de corte (v3):** dado que los mensajes procesados por el script anterior no figuran en las nuevas hojas técnicas, se definirá el parámetro `FECHA_INICIO_CORTE`, registrado al abrir la ventana de corte del despliegue (Fase 9). La versión antigua permanece activa hasta ese momento, de modo que ningún correo quede sin procesar entre versiones. Los mensajes con fecha anterior a `FECHA_INICIO_CORTE` no se procesarán, aunque aparezcan en la bandeja de entrada; se registrarán en el log como excluidos por antigüedad.

### 4.9. Activador

El activador actual:

- se ejecuta cada diez minutos;
- fue creado desde `tareas@alia-data.com`.

---

## 5. Arquitectura objetivo

```text
Mensaje nuevo (búsqueda in:inbox, sin filtro de etiqueta)
    ↓
Control por ID individual de Gmail
(descarte de ya procesados y de anteriores a FECHA_INICIO_CORTE)
    ↓
Registro inicial en Log Mensajes
    ↓
Extracción y limpieza del contenido
(solo contenido nuevo; enmascaramiento de datos sensibles)
    ↓
Filtro determinístico de elegibilidad
    ↓
Análisis con IA
    ↓
Observaciones detectadas
    ↓
0, 1 o N tareas por observación
    ↓
Validación programática
    ↓
Persistencia del manifiesto de tareas
    ↓
IDs determinísticos (asignados una sola vez)
    ↓
Reserva de tareas (RESERVADA) en Registro Tareas
    ↓
Agrupamiento por hoja
    ↓
Escritura por lotes (valores sanitizados) → tareas ESCRITAS
    ↓
Etiquetado y archivado por mensaje (Gmail API)
    ↓
Cierre del registro de auditoría
```

---

## 6. Estructura recomendada de la carpeta local

Crear una carpeta exclusiva para el proyecto:

```text
Automatizacion_Tareas_Aliadata/
├── PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md
├── README.md
├── configuracion/
│   ├── PARAMETROS_EJEMPLO.md
│   └── MATRIZ_PERMISOS.md
├── codigo/
│   ├── appsscript.json
│   ├── script_actual.gs
│   ├── script_refactorizado.gs
│   ├── prompts_ia.gs
│   ├── esquema_json.gs
│   ├── cliente_openai.gs
│   ├── filtros_correo.gs
│   ├── gmail_api.gs
│   ├── idempotencia.gs
│   ├── recuperacion.gs
│   ├── escritura_sheets.gs
│   ├── sanitizacion.gs
│   ├── validaciones.gs
│   └── utilidades.gs
├── respaldos/
│   ├── script/
│   └── planilla/
├── pruebas/
│   ├── CASOS_DE_PRUEBA.md
│   ├── correos_sinteticos/
│   └── resultados/
├── documentacion/
│   ├── ARQUITECTURA.md
│   ├── ESQUEMA_JSON.md
│   ├── PROCEDIMIENTO_DESPLIEGUE.md
│   ├── PROCEDIMIENTO_REVERSION.md
│   └── MANUAL_OPERATIVO.md
│   (más los documentos generados en cada fase: ARQUITECTURA_ACTUAL.md,
│    MATRIZ_RIESGOS.md, DIAGNOSTICO_ERRORES.md, REGLAS_FUNCIONALES.md, etc.)
├── auditoria/
│   ├── CHANGELOG.md
│   ├── DECISIONES.md
│   └── INCIDENCIAS.md
└── entregables/
```

---

## 7. Permisos y accesos requeridos

### 7.1. Para Claude Cowork

Claude Cowork podrá recibir acceso únicamente a la carpeta local:

```text
Automatizacion_Tareas_Aliadata/
```

Permisos recomendados:

- lectura;
- creación de archivos;
- edición de archivos;
- generación de documentación;
- comparación de versiones.

No necesita acceso a otras carpetas del equipo.

### 7.2. Para Google Workspace

La cuenta operativa deberá poder:

- leer correos de `tareas@alia-data.com`;
- crear y aplicar etiquetas;
- archivar mensajes;
- acceder al archivo maestro de Google Sheets;
- editar las hojas de destino;
- editar el proyecto de Apps Script;
- crear, eliminar o modificar activadores;
- consultar el historial de ejecuciones.

### 7.3. Para Apps Script

El proyecto necesitará autorización para:

- Gmail;
- el servicio avanzado de Gmail (Gmail API) (v3);
- Google Sheets;
- propiedades del script;
- llamadas HTTP externas;
- bloqueo de ejecuciones;
- utilidades de fecha y formato.

#### Habilitación del servicio avanzado de Gmail (v3)

1. En el editor de Apps Script: **Servicios → agregar `Gmail API`**.
2. Verificar que `appsscript.json` incluya el servicio en `enabledAdvancedServices` y el alcance `https://www.googleapis.com/auth/gmail.modify` en `oauthScopes`.
3. Reautorizar el proyecto con la cuenta `tareas@alia-data.com` y documentar los alcances concedidos.
4. Crear o recuperar los **IDs internos de las etiquetas** (los métodos de la API operan con IDs, no con nombres).
5. Aplicar o quitar etiquetas —incluida `INBOX` para archivar— **por mensaje individual** mediante `Gmail.Users.Messages.modify()`.
6. El uso estándar no tiene costo adicional para el volumen previsto; mantener el procesamiento dentro de las cuotas estándar de la API y **registrar el consumo de unidades de cuota** en el log.

### 7.4. Para OpenAI

La propiedad:

```text
OPENAI_API_KEY
```

debe permanecer en:

```text
Apps Script → Configuración del proyecto → Propiedades de secuencia de comandos
```

Reglas:

- no copiar la clave en el Markdown;
- no copiar la clave en archivos `.gs`;
- no incluirla en capturas;
- no compartirla con Cowork;
- no registrarla en logs;
- no subirla a repositorios.

### 7.5. Método recomendado para modificar Apps Script

Primera implementación:

1. Claude genera y revisa los archivos `.gs` localmente.
2. Rubén copia manualmente el código validado al editor de Apps Script.
3. Rubén autoriza los permisos.
4. Rubén ejecuta las pruebas controladas.
5. Rubén reactiva el activador.

Alternativa futura:

- utilizar `clasp`;
- autenticar la cuenta de Google;
- vincular el proyecto local con Apps Script;
- utilizar control de versiones.

No implementar `clasp` en la primera fase salvo aprobación explícita.

---

# FASES DE IMPLEMENTACIÓN

---

## Fase 0. Preparación, respaldo y congelamiento del entorno

### Objetivo

Asegurar que cualquier cambio pueda revertirse sin pérdida de información.

### Entradas

- Script actual.
- Archivo maestro de Google Sheets.
- Capturas del activador.
- Historial de ejecuciones.
- Lista actual de etiquetas.
- Nombres exactos de las hojas.

### Tareas

- [ ] Crear una copia del archivo de Google Sheets.
- [ ] Exportar o copiar el script actual.
- [ ] Guardar el script como `codigo/script_actual.gs`.
- [ ] Registrar fecha, hora y usuario propietario del activador.
- [ ] Registrar frecuencia del activador.
- [ ] Registrar ID del archivo de Google Sheets.
- [ ] Registrar zona horaria del proyecto.
- [ ] Registrar los nombres exactos de las hojas.
- [ ] Registrar las etiquetas existentes.
- [ ] **Mantener activo el activador productivo** (v3): la versión vigente sigue procesando correos durante el desarrollo; la desactivación se realiza recién al abrir la ventana de corte, en la Fase 9.
- [ ] Crear `auditoria/CHANGELOG.md`.
- [ ] Crear `auditoria/DECISIONES.md`.
- [ ] Crear `auditoria/INCIDENCIAS.md`.

### Acciones permitidas a Cowork

- Crear carpetas y archivos locales.
- Copiar y organizar documentación.
- Preparar checklists.
- Comparar versiones del código.

### Acciones que requieren aprobación

- Desactivar el activador.
- Copiar datos productivos.
- Modificar el archivo de Sheets.
- Crear o eliminar etiquetas.

### Entregables

- Respaldo del script.
- Respaldo de la planilla.
- Inventario técnico.
- Registro del activador.
- Checklist de restauración.

### Criterios de aceptación

- [ ] Existe una copia verificable de la planilla.
- [ ] Existe una copia completa del script.
- [ ] Se conoce qué cuenta creó el activador.
- [ ] El activador productivo permanece activo y la versión vigente sigue procesando correos.
- [ ] Se puede volver a la versión anterior en menos de 15 minutos.

### Puerta de aprobación

```text
APROBACIÓN FASE 0: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

### Prompt sugerido para Cowork

```text
Trabaja únicamente en la Fase 0 del archivo
PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md.

Crea la estructura de carpetas, los archivos de auditoría y los checklists
de respaldo. No modifiques ningún recurso de Google Workspace, no uses
credenciales, no desactives el activador (la versión productiva sigue
operando hasta la ventana de corte de la Fase 9) y no avances a la Fase 1.
Al finalizar, presenta los entregables, las acciones realizadas y las
acciones que requieren intervención humana.
```

---

## Fase 1. Diagnóstico técnico e inventario de riesgos

### Objetivo

Documentar con precisión los puntos débiles del script actual y establecer una línea base.

### Tareas

- [ ] Analizar el flujo actual.
- [ ] Identificar operaciones de Gmail.
- [ ] Identificar operaciones de Sheets.
- [ ] Identificar llamadas a OpenAI.
- [ ] Identificar puntos sin `try/catch`.
- [ ] Identificar operaciones no idempotentes.
- [ ] Identificar riesgos de concurrencia.
- [ ] Identificar riesgos de duplicación.
- [ ] Identificar uso de IDs aleatorios.
- [ ] Identificar uso de `appendRow()`.
- [ ] Identificar recuperación no paginada de hilos.
- [ ] Identificar dependencia de etiquetas del hilo.
- [ ] Analizar los errores `runtime exited unexpectedly`.
- [ ] Documentar las notificaciones automáticas procesadas como tareas.
- [ ] Elaborar la matriz de riesgos.

### Matriz mínima de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Duplicación de filas | Alta | Alta | ID determinístico + registro por tarea |
| Procesamiento de publicidad | Alta | Media | Filtro determinístico |
| Caída del runtime | Media | Alta | Manifiesto persistido + recuperación por etapa |
| Ejecuciones simultáneas | Media | Alta | `LockService` |
| Respuesta inválida de IA | Media | Alta | JSON Schema + validación |
| Falla parcial de escritura | Media | Alta | Reserva y estado por tarea |
| Instrucciones maliciosas en el correo | Media | Alta | Prompt endurecido + validación local |
| Inyección de fórmulas en Sheets | Media | Media | Sanitización previa a `setValues()` |
| Cuerpo excesivamente largo | Baja/Media | Media | Normalización y límite |
| Hoja inexistente | Baja | Alta | Validación previa |
| Clave API ausente | Baja | Alta | `validarConfiguracion()` al inicio |

### Entregables

- `documentacion/ARQUITECTURA_ACTUAL.md`
- `documentacion/MATRIZ_RIESGOS.md`
- `documentacion/DIAGNOSTICO_ERRORES.md`

### Criterios de aceptación

- [ ] Cada riesgo tiene causa, impacto y mitigación.
- [ ] Se documentaron los puntos exactos del código involucrados.
- [ ] No se modificó el entorno productivo.
- [ ] Se definió qué problemas debe resolver el refactor.

### Puerta de aprobación

```text
APROBACIÓN FASE 1: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión, sin correcciones sobre los entregables de diagnóstico y matriz de riesgos.
```

> Entregables generados: `documentacion/ARQUITECTURA_ACTUAL.md`, `documentacion/DIAGNOSTICO_ERRORES.md`, `documentacion/MATRIZ_RIESGOS.md`. Acta firmada: `entregables/FASE_1/ACTA_APROBACION_FASE_1.md`.

### Prompt sugerido para Cowork

```text
Ejecuta únicamente la Fase 1 del plan maestro. Analiza script_actual.gs,
documenta la arquitectura vigente, el diagnóstico y la matriz de riesgos.
No generes aún el script definitivo y no avances a la Fase 2.
```

---

## Fase 2. Diseño funcional y esquema de datos

### Objetivo

Definir formalmente cómo se representarán los correos, las observaciones, las tareas y los estados de procesamiento.

### Diseño de salida esperado de la IA

```json
{
  "correo_relevante": true,
  "requiere_revision": false,
  "motivo_revision": null,
  "motivo_sin_tareas": null,
  "observaciones": [
    {
      "numero": 1,
      "texto_original": "Observación literal o resumida fielmente.",
      "tareas": [
        {
          "resumen": "Acción concreta y ejecutable.",
          "tablero": "Desarrollo IT",
          "prioridad": "Alto",
          "grupo_origen": "Soporte",
          "responsable_sugerido": "Responsable Técnico",
          "fecha_limite": null
        }
      ]
    }
  ]
}
```

### Reglas funcionales

- No inventar tareas.
- Una observación puede generar cero tareas.
- Una observación puede generar varias tareas.
- Varias observaciones pueden consolidarse si generan exactamente la misma acción.
- Tareas diferentes deben permanecer separadas.
- Cada tarea debe poder asignarse a una hoja distinta.
- La fecha límite solo se completa si está explícitamente mencionada.
- `fecha_limite` se expresa en formato ISO 8601 (`YYYY-MM-DD`) como **formato de intercambio**; el script la valida, la convierte a objeto `Date` y la escribe con formato visual `dd/MM/yyyy` (v3).
- Una clasificación ambigua debe enviarse a revisión manual: la IA lo indica devolviendo `requiere_revision: true` junto con `motivo_revision`. En ese caso no se crean tareas y el mensaje recibe `Revisión manual/Error de procesamiento`.

### Valores permitidos

#### Tableros

```text
Finanzas
Comercial
Soporte
Desarrollo IT
Gestión General
```

#### Prioridades

```text
Crítico
Alto
Medio
Bajo
```

#### Grupos de origen

```text
Administración
Ventas
Soporte
Desarrollo IT
Gestión General
```

#### Responsables

```text
Socio Administración
Socio Comercial
Responsable Soporte
Responsable Técnico
Socio Dirección
Sin asignar
```

### Hojas técnicas (v3)

Las hojas técnicas se crean **dentro del mismo archivo maestro de Google Sheets** y reemplazan a la hoja única `Log Procesamiento` de la versión 2. El registro por tarea es lo que permite recuperar con precisión una escritura parcial (si se generan 5 tareas y solo se escriben 3, el registro identifica exactamente cuáles).

#### Hoja 1 — `Log Mensajes` (una fila por mensaje)

```text
message_id
thread_id
fecha_inicio
fecha_fin
remitente
asunto
estado
etapa
cantidad_observaciones
cantidad_tareas
resultado_gmail
intentos
codigo_http
error
modelo
tokens_entrada
tokens_salida
tokens_totales
costo_estimado
request_id
cuerpo_truncado
longitud_original
longitud_normalizada
duracion_llamada_ia
unidades_gmail_api
version_script
```

#### Hoja 2 — `Registro Tareas` (una fila por tarea)

```text
task_id
message_id
thread_id
tablero
estado_escritura
fila_destino
fecha_reserva
fecha_escritura
hash_contenido
```

Estados de escritura permitidos:

```text
RESERVADA
ESCRITA
ERROR_ESCRITURA
ANULADA
```

Regla transaccional: antes de escribir en los tableros, registrar todas las tareas como `RESERVADA`; después de cada escritura confirmada, actualizarlas a `ESCRITA` con su fila de destino.

#### Hoja 3 — `Indice Idempotencia` (permanente, protegida)

```text
message_id
task_id
estado_final
fecha
```

**Política de retención (v3):** el `Indice Idempotencia` se conserva **indefinidamente** (es la fuente de verdad contra duplicados). La purga a los 6 meses aplica únicamente a la información ampliada de `Log Mensajes` y `Registro Tareas` (asuntos, errores, métricas, costos, tiempos), mediante procedimiento manual documentado en el `MANUAL_OPERATIVO.md`, conservando siempre un respaldo previo.

### Estados permitidos

Solo caracteres ASCII (sin acentos), para evitar errores de comparación y codificación:

```text
EN_PROCESO
PROCESADO
SIN_TAREAS
REVISION_MANUAL
ERROR_TEMPORAL
ERROR_DEFINITIVO
```

### Etapas permitidas

```text
INICIO
CORREO_EXTRAIDO
FILTRO_COMPLETADO
IA_INICIADA
IA_COMPLETADA
RESPUESTA_VALIDADA
MANIFIESTO_PERSISTIDO
TAREAS_RESERVADAS
ESCRITURA_INICIADA
ESCRITURA_COMPLETADA
GMAIL_ACTUALIZADO
FINALIZADO
```

### Entregables

- `documentacion/ESQUEMA_JSON.md`
- `documentacion/REGLAS_FUNCIONALES.md`
- `documentacion/DISENO_HOJAS_TECNICAS.md`
- `documentacion/MAPA_COLUMNAS.md`

### Criterios de aceptación

- [ ] El esquema representa múltiples observaciones.
- [ ] Cada observación admite cero, una o varias tareas.
- [ ] Cada tarea tiene clasificación independiente.
- [ ] El mapeo a las 17 columnas está documentado.
- [ ] Se definieron estados y etapas.
- [ ] Se definieron reglas de revisión manual.
- [ ] Las tres hojas técnicas están diseñadas, incluido el registro individual por tarea.

### Puerta de aprobación

```text
APROBACIÓN FASE 2: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión, sin correcciones sobre los entregables de diseño funcional.
```

> Entregables generados: `documentacion/ESQUEMA_JSON.md`, `documentacion/REGLAS_FUNCIONALES.md`, `documentacion/DISENO_HOJAS_TECNICAS.md`, `documentacion/MAPA_COLUMNAS.md`. Acta firmada: `entregables/FASE_2/ACTA_APROBACION_FASE_2.md`.

---

## Fase 3. Refactor estructural del script

### Objetivo

Separar el script en funciones pequeñas, verificables y recuperables.

### Funciones mínimas

```text
procesarCorreosDeTareas()
validarConfiguracion()
obtenerHilosPendientes()
obtenerMensajesPendientes()
procesarUnMensaje()
extraerDatosCorreo()
normalizarCuerpo()
extraerContenidoNuevo()
enmascararDatosSensibles()
evaluarFiltroDeterministico()
consultarIAExtractora()
validarRespuestaIA()
generarTareasNormalizadas()
persistirManifiestoTareas()
generarIdDeterministico()
reservarTareas()
agruparFilasPorHoja()
sanitizarValoresParaSheets()
escribirFilasPorLote()
marcarTareasEscritas()
registrarInicioProcesamiento()
actualizarLogMensajes()
construirEnlaceCorreo()
aplicarResultadoGmail()
gestionarErrorMensaje()
recuperarProcesamientosAbandonados()
```

### Reglas técnicas

- Ejecutar `validarConfiguracion()` al inicio: comprobar `OPENAI_API_KEY`, ID de la planilla, modelo, zona horaria, existencia de hojas de destino y hojas técnicas, existencia de etiquetas y sus IDs internos, límites máximos, `FECHA_INICIO_CORTE`, modo de prueba, permisos y parámetros obligatorios. Si falla una validación crítica: no tocar Gmail, no tocar Sheets, registrar el error y finalizar.
- Usar `SpreadsheetApp.openById()`.
- Guardar el ID de Sheets en propiedades del script.
- Buscar Gmail con límite desde el origen.
- Usar `GmailApp.search("in:inbox", 0, MAX_HILOS)` **sin filtrar por etiqueta**; el descarte de mensajes ya procesados se realiza por ID de mensaje contra `Log Mensajes` y el `Indice Idempotencia`.
- Descartar mensajes con fecha anterior a `FECHA_INICIO_CORTE`.
- Etiquetar y archivar **por mensaje individual** mediante el servicio avanzado de Gmail (`Gmail.Users.Messages.modify()`), usando los IDs internos de las etiquetas y registrando el consumo de unidades de cuota.
- Soportar `MODO_PRUEBA` y `DRY_RUN`; abortar si `MODO_PRUEBA=true` y el `SPREADSHEET_ID` es el productivo.
- Usar `LockService`.
- Liberar el lock en `finally`.
- Implementar `try/catch` por mensaje.
- Mantener un límite de mensajes por ejecución.
- Mantener un límite de tiempo interno.
- No usar `Math.random()` para IDs.
- No usar `appendRow()` por tarea.
- No aplicar `Procesado` antes de completar todas las escrituras.
- No archivar antes de registrar el resultado final.

### Orden transaccional obligatorio por mensaje (v3)

```text
1. Registrar mensaje EN_PROCESO
2. Extraer y normalizar correo (solo contenido nuevo)
3. Obtener y validar clasificación
4. Persistir manifiesto de tareas
5. Reservar IDs (tareas RESERVADAS)
6. Escribir tareas
7. Marcar tareas como ESCRITAS
8. Registrar ESCRITURA_COMPLETADA
9. Actualizar Gmail (etiquetas y archivado por mensaje)
10. Registrar GMAIL_ACTUALIZADO
11. Marcar mensaje PROCESADO o REVISION_MANUAL
12. Registrar FINALIZADO
```

Regla de recuperación: si falla la actualización de Gmail después de la escritura, **no** consultar nuevamente a OpenAI ni reescribir filas; repetir únicamente la actualización de Gmail a partir de la etapa registrada.

### Entregables

- `codigo/script_refactorizado.gs` (con estado de borrador hasta la aprobación de la fase)
- `documentacion/ARQUITECTURA_PROPUESTA.md`
- `documentacion/FLUJO_TRANSACCIONAL.md`

### Criterios de aceptación

- [ ] El código se encuentra modularizado.
- [ ] Existe control de concurrencia.
- [ ] Existe procesamiento aislado por mensaje.
- [ ] Existe búsqueda paginada y limitada.
- [ ] El orden transaccional de 12 pasos está implementado y documentado.
- [ ] La actualización de Gmail se realiza por mensaje individual.
- [ ] No existe escritura en producción.
- [ ] El script puede revisarse sin credenciales.

### Puerta de aprobación

```text
APROBACIÓN FASE 3: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión, condicionada a confirmar los 5 parámetros de configuración pendientes desde la Fase 0 (resuelto en la misma instrucción).
```

> Entregables generados: `codigo/script_refactorizado.gs` (borrador), `documentacion/ARQUITECTURA_PROPUESTA.md`, `documentacion/FLUJO_TRANSACCIONAL.md`. Acta firmada: `entregables/FASE_3/ACTA_APROBACION_FASE_3.md`.

---

## Fase 4. Extracción con IA y Structured Outputs

### Objetivo

Obtener una salida estructurada, validable y compatible con múltiples tareas.

### Requisitos del prompt

El prompt debe indicar:

- analizar asunto y cuerpo;
- excluir firmas, avisos legales y publicidad;
- identificar todas las observaciones;
- detectar acciones concretas;
- no inventar datos;
- consolidar duplicados;
- clasificar cada tarea por separado;
- devolver un arreglo vacío si no existen tareas;
- respetar estrictamente los valores permitidos.

### Protección contra instrucciones maliciosas (v3)

El cuerpo del correo es una **entrada no confiable**. El prompt de sistema debe establecer que:

- el correo es solo información a analizar;
- ninguna instrucción contenida en el correo puede cambiar el rol del modelo;
- el correo no puede modificar los catálogos de valores permitidos;
- no se deben ejecutar acciones solicitadas por el contenido del correo;
- toda salida debe ajustarse al JSON Schema;
- la respuesta será validada localmente de todos modos.

### Minimización de datos enviados a OpenAI (v3)

Antes de enviar el cuerpo:

- detectar y enmascarar contraseñas, claves o tokens;
- detectar y enmascarar datos bancarios y números de tarjetas;
- detectar y enmascarar documentos personales;
- no almacenar cuerpos completos en logs;
- registrar únicamente hashes o métricas cuando sea suficiente.

### Requisitos técnicos

- Utilizar un esquema JSON estricto.
- Mantener temperatura baja.
- Verificar código HTTP.
- Registrar el código HTTP.
- Controlar respuestas vacías.
- Controlar rechazo del modelo.
- Controlar JSON incompleto.
- Implementar reintentos para errores temporales.
- Tratar HTTP 429 (límite de tasa) y los errores de cuota agotada de OpenAI como `ERROR_TEMPORAL`, con espera creciente entre reintentos.
- Truncar el cuerpo normalizado a `MAX_CARACTERES_CUERPO` (valor inicial: 8.000) antes de enviarlo a la IA, registrando el truncamiento en el log.
- Registrar por llamada: modelo, tokens de entrada/salida/totales, costo estimado, request ID y duración (v3).
- No reintentar indefinidamente.
- No registrar el cuerpo completo de mensajes sensibles en logs técnicos.

### Política de reintentos sugerida

```text
Intento 1 → inmediato
Intento 2 → espera breve
Intento 3 → espera mayor
Después → Revisión manual/Error de procesamiento
```

### Entregables

- `codigo/prompts_ia.gs`
- `codigo/esquema_json.gs`
- `codigo/cliente_openai.gs`
- `documentacion/PROMPT_OPERATIVO.md`
- `documentacion/POLITICA_REINTENTOS.md`

### Criterios de aceptación

- [ ] La salida admite cero, una o varias tareas.
- [ ] El JSON se valida localmente.
- [ ] Los valores fuera de catálogo son rechazados.
- [ ] Los errores temporales se reintentan.
- [ ] Los errores definitivos pasan a revisión manual.
- [ ] Las instrucciones incluidas en correos no alteran el comportamiento (CP-22).
- [ ] Los datos sensibles se enmascaran antes del envío (CP-29).
- [ ] La clave API no está presente en ningún archivo.

### Puerta de aprobación

```text
APROBACIÓN FASE 4: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión. Modelo definitivo de OpenAI confirmado: gpt-4o-mini.
```

> Entregables generados: `codigo/esquema_json.gs`, `codigo/prompts_ia.gs`, `codigo/cliente_openai.gs`, `documentacion/PROMPT_OPERATIVO.md`, `documentacion/POLITICA_REINTENTOS.md`. Acta firmada: `entregables/FASE_4/ACTA_APROBACION_FASE_4.md`.

---

## Fase 5. Idempotencia, IDs y recuperación

### Objetivo

Impedir duplicados y permitir retomar ejecuciones interrumpidas.

### Manifiesto de tareas (v3)

El resultado validado de la IA se **persiste como manifiesto** antes de cualquier escritura:

1. Obtener la respuesta de la IA.
2. Validarla y normalizar las tareas.
3. Persistir el manifiesto (en `Registro Tareas`, con estado `RESERVADA`).
4. Asignar los IDs **una sola vez**, sobre el manifiesto persistido.
5. En una recuperación, **no volver a consultar la IA**: retomar desde el manifiesto persistido.

Esto elimina el riesgo de que una nueva ejecución altere el orden, consolide o divida tareas y cambie la numeración.

### Formato de ID (v3)

```text
ALI-{HASH_MENSAJE_16}-{INDICE_PERSISTIDO}
```

Donde `HASH_MENSAJE_16` son los primeros 16 caracteres hexadecimales del SHA-256 del ID completo del mensaje de Gmail (el ID completo se conserva además como clave técnica en las hojas de registro), e `INDICE_PERSISTIDO` es el número correlativo de la tarea dentro del manifiesto, asignado al persistirlo y nunca recalculado.

Ejemplo:

```text
ALI-A8F23C91D04B7E12-003
```

### Reglas

- El mismo mensaje y el mismo manifiesto deben generar siempre los mismos IDs.
- Antes de escribir una tarea, comprobar si el ID ya existe **contra `Registro Tareas` y el `Indice Idempotencia`**, no leyendo las 5 hojas de destino, cuya lectura crecería linealmente con el histórico.
- Registrar el ID del mensaje Gmail.
- Registrar el ID del hilo Gmail.
- Registrar la etapa alcanzada.
- Detectar registros `EN_PROCESO` antiguos.
- Definir un umbral de abandono, por ejemplo 20 minutos.
- Recuperar o enviar a revisión manual los procesamientos abandonados, retomando desde la etapa registrada y el manifiesto persistido.
- No duplicar filas ya escritas.

### Entregables

- `codigo/idempotencia.gs`
- `codigo/recuperacion.gs`
- `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`
- `documentacion/RECUPERACION_INTERRUPCIONES.md`

### Criterios de aceptación

- [ ] Reejecutar el mismo mensaje no duplica filas.
- [ ] Una caída después de una escritura parcial puede recuperarse identificando exactamente qué tareas quedaron `RESERVADA`.
- [ ] Las recuperaciones no vuelven a consultar la IA.
- [ ] Los registros abandonados se detectan.
- [ ] Se documenta el procedimiento de recuperación.

### Puerta de aprobación

```text
APROBACIÓN FASE 5: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión, incluyendo conformidad explícita con la ampliación de Registro Tareas de 9 a 16 columnas (enmienda al entregable de la Fase 2).
```

> Entregables generados: `codigo/idempotencia.gs`, `codigo/recuperacion.gs`, `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`, `documentacion/RECUPERACION_INTERRUPCIONES.md`. Incluye una enmienda a `Registro Tareas` (Fase 2), ampliado de 9 a 16 columnas. Acta firmada: `entregables/FASE_5/ACTA_APROBACION_FASE_5.md`.

---

## Fase 6. Filtros determinísticos y tratamiento de correos no operativos

### Objetivo

Evitar que correos automáticos, promocionales o de error sean convertidos en tareas.

### Regla obligatoria para Apps Script

Si el remitente contiene:

```text
noreply-apps-scripts-notifications@google.com
```

o el asunto contiene:

```text
Summary of failures for Google Apps Script
```

entonces:

- no consultar OpenAI;
- no crear tareas;
- aplicar `Revisión manual/Error de automatización`;
- archivar;
- registrar en el log.

### Otros correos no operativos

Ejemplos:

- promociones;
- boletines;
- mensajes de novedades de Google Workspace;
- comunicaciones de productos;
- cuerpos vacíos;
- respuestas automáticas;
- correos sin información accionable.

Resultado:

```text
Revisión manual/Sin tareas detectadas
```

### Entregables

- `codigo/filtros_correo.gs`
- `documentacion/REGLAS_ELEGIBILIDAD.md`
- `pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`

### Criterios de aceptación

- [ ] Las notificaciones de Apps Script nunca llegan al tablero.
- [ ] Los correos promocionales no generan tareas.
- [ ] Los filtros no bloquean correos operativos válidos.
- [ ] Cada exclusión queda registrada.

### Puerta de aprobación

```text
APROBACIÓN FASE 6: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión.
```

> Entregables generados: `codigo/filtros_correo.gs`, `documentacion/REGLAS_ELEGIBILIDAD.md`, `pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`. Acta firmada: `entregables/FASE_6/ACTA_APROBACION_FASE_6.md`.

---

## Fase 7. Escritura segura en Google Sheets

### Objetivo

Insertar varias tareas de forma eficiente y coherente.

### Reglas

- Agrupar las tareas por hoja.
- Validar que cada hoja exista.
- Validar que cada fila tenga exactamente 17 valores.
- Antes de escribir, registrar cada tarea como `RESERVADA` en `Registro Tareas`; después de la escritura confirmada, marcarla `ESCRITA` y registrar la fila de destino (v3).
- Sanitizar los valores que comiencen con `=`, `+`, `-` o `@` anteponiendo un apóstrofo y forzándolos a texto, para impedir la inyección de fórmulas; aplicar esta regla al asunto, remitente, resumen y observaciones (v3).
- Escribir por lotes mediante `setValues()`.
- Escribir `Fecha límite` como fecha real (objeto `Date`) con formato visual `dd/MM/yyyy`; el formato ISO `YYYY-MM-DD` es solo de intercambio con la IA (v3).
- Conservar formatos y validaciones existentes.
- No utilizar una hoja por defecto silenciosa ante errores.
- Si una hoja no existe, enviar el mensaje a revisión manual.
- Registrar las hojas de destino.
- Registrar los IDs escritos.
- Construir el `Link al correo` (columna 13) mediante `getPermalink()` del hilo o un enlace explícito de la cuenta operativa; **no** usar rutas dependientes de la posición de sesión como `/u/0` (v3).

### Mapeo de columnas

| Posición | Campo |
|---:|---|
| 1 | ID |
| 2 | Fecha de entrada |
| 3 | Fuente |
| 4 | Grupo origen |
| 5 | Remitente |
| 6 | Asunto original |
| 7 | Resumen de tarea |
| 8 | Prioridad sugerida IA |
| 9 | Prioridad final |
| 10 | Estado |
| 11 | Responsable |
| 12 | Fecha límite |
| 13 | Link al correo |
| 14 | Link a Drive |
| 15 | Derivada a |
| 16 | Última actualización |
| 17 | Observaciones |

### Entregables

- `codigo/escritura_sheets.gs`
- `codigo/sanitizacion.gs`
- `documentacion/MAPA_ESCRITURA.md`
- `pruebas/PRUEBAS_ESCRITURA.md`

### Criterios de aceptación

- [ ] Cada tarea crea una fila.
- [ ] Un correo puede generar filas en varias hojas.
- [ ] Todas las filas contienen 17 valores.
- [ ] Se evita la escritura parcial no recuperable.
- [ ] Ningún valor se interpreta como fórmula (CP-23).
- [ ] El enlace al correo funciona con varias cuentas de Google iniciadas (CP-24).
- [ ] No se producen filas duplicadas.

### Puerta de aprobación

```text
APROBACIÓN FASE 7: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión.
```

> Entregables generados: `codigo/escritura_sheets.gs`, `codigo/sanitizacion.gs`, `documentacion/MAPA_ESCRITURA.md`, `pruebas/PRUEBAS_ESCRITURA.md`. Incluye la corrección de dos defectos reales heredados de la Fase 3 (enlace dependiente de sesión y fechas como texto). Acta firmada: `entregables/FASE_7/ACTA_APROBACION_FASE_7.md`.

---

## Fase 8. Pruebas controladas

### Objetivo

Validar el comportamiento sin utilizar inicialmente correos productivos.

### Modo de prueba aislado (v3)

Parámetros obligatorios en propiedades del script:

```text
MODO_PRUEBA=true|false
DRY_RUN=true|false
SPREADSHEET_ID_PRUEBA
GMAIL_QUERY_PRUEBA
ETIQUETA_PRUEBA
PERMITIR_ARCHIVADO=false
PERMITIR_ETIQUETADO=false
```

Reglas de seguridad:

- Si `MODO_PRUEBA=true` y `SPREADSHEET_ID` apunta a la planilla productiva, el script debe **abortar** (caso CP-27).
- En modo prueba no se archivan mensajes reales ni se aplican etiquetas productivas.
- Los correos de prueba se identifican con `in:inbox label:Pruebas-Automatizacion` o `subject:[PRUEBA-AUTOMATIZACION]`.
- Cuando sea posible, utilizar una cuenta de correo de prueba separada.

### Casos mínimos

| ID | Caso | Resultado esperado |
|---|---|---|
| CP-01 | Una observación, una tarea | Una fila |
| CP-02 | Cinco observaciones, tres tareas | Tres filas |
| CP-03 | Una observación, dos tareas | Dos filas |
| CP-04 | Tareas para tres hojas | Filas en tres hojas |
| CP-05 | Correo informativo | Revisión manual |
| CP-06 | Promoción de Google | Revisión manual |
| CP-07 | Notificación de Apps Script | Revisión manual/Error de automatización |
| CP-08 | JSON inválido | Revisión manual/Error de procesamiento |
| CP-09 | Error HTTP temporal | Reintento |
| CP-10 | Hoja inexistente | Revisión manual |
| CP-11 | Mismo mensaje dos veces | Sin duplicados |
| CP-12 | Caída después de escritura parcial | Recuperación exacta desde `Registro Tareas` |
| CP-13 | Dos ejecuciones simultáneas | Una sola procesa |
| CP-14 | Firma extensa | No genera tareas falsas |
| CP-15 | Observaciones duplicadas | Consolidación |
| CP-16 | Cuerpo vacío | Revisión manual |
| CP-17 | Fecha límite explícita | Fecha correcta (ISO 8601 → `dd/MM/yyyy`) |
| CP-18 | Fecha no explícita | Campo vacío |
| CP-19 | Respuesta nueva en hilo ya procesado | Se procesa y genera tareas |
| CP-20 | Mensaje anterior a `FECHA_INICIO_CORTE` | Excluido y registrado en el log |
| CP-21 | Respuesta que cita un correo ya procesado | Solo se procesa contenido nuevo |
| CP-22 | Intento de manipular el prompt | La instrucción es ignorada |
| CP-23 | Texto que comienza como fórmula | Se guarda como texto |
| CP-24 | Varias cuentas Google abiertas | El enlace abre el correo correcto |
| CP-25 | Falla Gmail después de escribir filas | Solo se reintenta la actualización de Gmail |
| CP-26 | Caída después de reservar tareas | Se retoma desde el manifiesto |
| CP-27 | Modo prueba con ID productivo | El script aborta |
| CP-28 | Mensajes distintos dentro de un hilo | Cada mensaje recibe tratamiento correcto (etiquetado por mensaje) |
| CP-29 | Dato sensible en el cuerpo | Se enmascara antes de OpenAI |
| CP-30 | Log detallado purgado | El índice de idempotencia se conserva |

### Método recomendado

1. Crear una copia del archivo maestro y configurar el modo de prueba aislado.
2. Crear mensajes sintéticos.
3. Ejecutar manualmente.
4. Revisar cada fila.
5. Revisar el log.
6. Revisar etiquetas (aplicadas por mensaje).
7. Verificar archivado.
8. Repetir mensajes para probar idempotencia.

### Entregables

- `pruebas/CASOS_DE_PRUEBA.md`
- `pruebas/resultados/RESULTADOS_FASE_8.md`
- `pruebas/resultados/INCIDENCIAS_FASE_8.md`

### Criterios de aceptación

- [ ] Todos los casos críticos pasan.
- [ ] No existen duplicados.
- [ ] No se generan tareas falsas.
- [ ] Las tareas llegan a la hoja correcta.
- [ ] Los errores quedan trazados.
- [ ] El modo prueba impide toda escritura y archivado productivos.
- [ ] El script puede reejecutarse de forma segura.

### Puerta de aprobación

```text
APROBACIÓN FASE 8: PENDIENTE (bloqueada por falta de ejecución real; ver entregables/FASE_8/ACTA_APROBACION_FASE_8.md)
Responsable:
Fecha:
Observaciones: Por DEC-004 (auditoria/DECISIONES.md), esta fase se aprueba con CP-01 a CP-29 ejecutados y sin incidencias críticas abiertas; CP-30 queda diferido a la Fase 10 y no condiciona esta aprobación.
```

---

## Fase 8.1. Consolidación e incorporación del histórico

### Objetivo

Antes de desplegar la Fase 9, garantizar dos cosas: (a) una vista consolidada de solo lectura de las cinco hojas de negocio (`Resumen Actividades`), y (b) que toda actividad histórica pre-corte todavía no resuelta quede identificada, visible y conciliada — sin reprocesarla desde Gmail ni insertarla en las hojas técnicas del pipeline (`Log Mensajes`, `Registro Tareas`, `Indice Idempotencia`), que representan mensajes y tareas generadas por el proceso automático, no actividad de negocio preexistente.

Diseño completo, alternativas evaluadas, riesgos y casos de prueba: `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`. Inventario técnico real y decisiones de negocio: `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`.

### Decisiones aprobadas (28/07/2026)

- El despliegue se mantiene sobre el archivo maestro productivo actual (hoy sin `Log Mensajes`/`Registro Tareas`/`Indice Idempotencia` — esas se crean recién en la Fase 9).
- `Resumen Actividades` es una vista de solo lectura por fórmulas nativas de Sheets (no macro, no Apps Script salvo que una prueba de rendimiento real lo exija); las cinco hojas operativas siguen siendo la única fuente de verdad.
- Catálogo real de `Estado` (`Listas!D`, no el tentativo original de la propuesta): abiertos `Pendiente`/`En curso`/`Bloqueada`/`En revisión`; terminal `Completada`; ambiguo cualquier otro valor — regla fail-safe: nunca se excluye un valor no clasificado explícitamente como terminal.
- Los posibles duplicados de contenido nunca se eliminan automáticamente (van a revisión humana); los IDs históricos válidos y únicos se conservan tal cual, sin reemplazarlos.
- El origen de cada fila (`Automatización v3` / `Histórico/pre-corte` / `Revisión de origen`) se determina contra `Indice Idempotencia`, no contra `Registro Tareas` — esta última tiene purga de información ampliada a los 6 meses (Fase 10, CP-30); `Indice Idempotencia` tiene retención indefinida.
- Carlos Rubén Bageta aprueba la conciliación histórica y administra el catálogo de equivalencias de estados.

Registro formal: `auditoria/DECISIONES.md`, DEC-013 a DEC-016.

### Procedimiento

Etapas 0 a 4 — preparación, inventario, catálogos y simulación, todo antes de tocar producción. Detalle completo en `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`, sección 7.

- [x] Etapa 0 — Confirmar supuestos y designar responsable de la conciliación (28/07/2026, ver "Decisiones aprobadas" arriba).
- [x] Etapa 1 — Inventario de solo lectura sobre las cinco hojas, sobre una copia aislada del archivo (28/07/2026, ver `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`): 27 filas activas totales, catálogo real de Estado confirmado, sin IDs vacíos ni duplicados, hallazgo de `Dashboard` (rango fijo `$5:$204`) documentado como riesgo de diseño.
- [x] Etapa 2 — Matriz de homologación completa aprobada (28/07/2026, ver `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md`): `Prioridad final` 100% vacía en las cinco hojas (sin homologación posible, se documenta el vacío); `Responsable` coincide exactamente con `Listas!E` sin variantes; formato de ID histórico (`HIST-...`) sin ningún caso real que resolver hoy (0 IDs vacíos/duplicados); reglas de duplicados confirmadas (D4a) con 2 casos reales detectados en `Desarrollo IT`, pendientes de revisión humana en la Etapa 4.
- [x] Etapa 3 — Simulación completa en una copia aislada del archivo (28/07/2026): `Registro Migración Histórica` y `Resumen Actividades` creadas y validadas; filtros, enlaces, conteos y rendimiento probados sin problemas de fondo. Hallazgo real: un doble clic accidental en la columna `Abrir origen` rompe la fórmula de matriz para toda la vista — mitigado protegiendo la hoja completa como solo lectura (agregado como paso explícito en la Aprobación A de la Fase 9, más abajo). Sin escrituras en producción.
- [x] Etapa 4, ítems 1-3 — Resolver estados ambiguos (28/07/2026: 0 casos, ningún valor fuera del catálogo de la sección 1 de `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md`), colisiones de ID (0 casos, ver Etapa 1) y posibles duplicados (28/07/2026: único caso real, `ALI-62176`/`ALI-23135` en Desarrollo IT, decisión `CONSERVAR` ambas — ver `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md`, sección 5).
- [x] Etapa 4, ítems 4-5 — Aprobar cada transformación productiva y firmar el reporte de conciliación previo (28/07/2026): conciliación cerrada sin diferencias (27 = 5 terminales + 22 abiertos + 0 ambiguos; 22 incluibles no resueltos = 22 visibles en `Resumen Actividades` + 0 excepciones bloqueantes); las 27 transformaciones simuladas (`accion=CONSERVAR`) aprobadas. **Etapa 4 completa.**

**Las Etapas 5 a 7 (respaldo, ejecución productiva, conciliación real y reversión) se ejecutan dentro de la ventana de corte de la Fase 9 — ver "Aprobación A" en el procedimiento de esa fase.**

### Entregables

- `documentacion/PROPUESTA_CONSOLIDACION_Y_MIGRACION_HISTORICA.md`
- `documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md`
- `documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md`
- `documentacion/DISENO_RESUMEN_ACTIVIDADES.md`
- `pruebas/CASOS_CONSOLIDACION_HISTORICA.md`
- `pruebas/resultados/RESULTADOS_CONSOLIDACION_HISTORICA.md`
- `auditoria/ACTA_APROBACION_FASE_8_1.md`
- Reporte de simulación y conciliación (Etapas 3-4, sobre copia aislada)

### Criterios de aceptación

- [x] Todos los históricos abiertos o ambiguos aparecen en `Resumen Actividades` (conciliación Etapa 4: 22 ABIERTO + 0 AMBIGUO = 22 incluibles no resueltos = 22 visibles en `Resumen Actividades` + 0 excepciones bloqueantes).
- [x] Los conteos concilian con la suma de las cinco hojas de negocio (Etapa 4: 27 = 5 terminales + 22 abiertos + 0 ambiguos, sin diferencias).
- [x] No se copió ninguna fila que ya estuviera en el archivo maestro (por diseño, `Resumen Actividades` y `Registro Migración Histórica` se recalculan en vivo desde las cinco hojas mediante una única fórmula de matriz, sin copiado/inserción manual; confirmado además por la prueba de reversión del 28/07/2026, sin cambios en las hojas fuente).
- [x] Ningún registro histórico ingresó en `Log Mensajes`, `Registro Tareas` ni `Indice Idempotencia` (las dos primeras no existen ni en la copia ni en el archivo productivo actual — D1 —; el stand-in de `Indice Idempotencia` usado para probar `Origen del registro` quedó con 0 filas de datos, solo encabezados).
- [x] `Resumen Actividades` distingue correctamente `Automatización v3` de `Histórico/pre-corte`, y clasifica como `Revisión de origen` lo que no coincide con ninguno (28/07/2026: columna `V`, 27/27 filas `Histórico/pre-corte`, 0 `Automatización v3` (stand-in `Indice Idempotencia` vacío, esperable), 0 `Revisión de origen` — ver `auditoria/CHANGELOG.md`).
- [x] La reversión de las normalizaciones fue probada en la copia aislada (28/07/2026: eliminadas y restauradas las 3 hojas nuevas con `Ctrl+Z`, sin impacto en las cinco hojas de negocio — ver `auditoria/CHANGELOG.md`).
- [x] `Dashboard` y `Listas` no sufrieron regresiones (28/07/2026: mismo total/desglose 27-22-5 y mismo catálogo antes y después de la prueba de reversión; `Dashboard` depende de rangos fijos `$5:$204` en las cinco hojas — ver hallazgo de la Etapa 1).

### Puerta de aprobación

```text
APROBACIÓN FASE 8.1: APROBADA
Responsable:
Fecha:
Observaciones: Etapas 0 a 4 completas (28/07/2026) con datos reales y simulación validada en copia aislada — ver documentacion/INVENTARIO_TECNICO_Y_DECISIONES_FASE_8_1.md, documentacion/MATRIZ_HOMOLOGACION_HISTORICA.md, y esta sección para el detalle de las Etapas 3 y 4. Reporte de conciliación cerrado sin diferencias (27 = 5 terminales + 22 abiertos + 0 ambiguos) y las 27 transformaciones simuladas (accion=CONSERVAR) aprobadas. Los 7 criterios de aceptación de la fase completa están satisfechos con evidencia real (28/07/2026): columna `Origen del registro` construida y probada (27/27 Histórico/pre-corte), prueba de reversión ejecutada sin impacto en las cinco hojas de negocio, y `Dashboard`/`Listas` reconfirmados sin regresión — ver auditoria/CHANGELOG.md. Aprobada por Carlos Rubén Bageta (28/07/2026, confirmación registrada en esta sesión); ninguna condición técnica pendiente — solo falta firmar (Responsable y Fecha arriba). Las Etapas 5 a 7 se ejecutan dentro de la ventana de corte de la Fase 9.
```

---

## Fase 9. Despliegue controlado

### Objetivo

Instalar la nueva versión en producción de forma reversible, sin perder correos entre la versión antigua y la nueva.

### Procedimiento

Incorpora las operaciones de la Fase 8.1 (Etapas 5 a 7) intercaladas con el despliegue del pipeline. **Dos aprobaciones humanas distintas y no intercambiables** — la primera cierra el lote histórico antes de que el código nuevo exista en el archivo; la segunda es la activación final.

**Aprobación A — cierre del lote histórico (antes de tocar el código nuevo):**

- [x] Confirmar respaldo final (30/07/2026 — archivo maestro y proyecto Apps Script completo).
- [x] Abrir la **ventana de corte**: registrar `FECHA_INICIO_CORTE` (`2026-07-30T13:05:00-03:00`).
- [x] Verificar la última ejecución de la versión antigua y desactivar su activador (eliminado 13:29, 30/07/2026).
- [x] Saneamiento de correos automáticos, relocado antes de las hojas técnicas (auditoría BLQ-06) — 21 filas reales descartadas a `Registros descartados`, conciliado sin diferencias.
- [x] Crear las hojas técnicas del pipeline: `Log Mensajes`, `Registro Tareas`, `Indice Idempotencia` (protegida).
- [x] Crear `Resumen Actividades` (Fase 8.1) — 9 filas reales, coincide con `Dashboard`.
- [x] Crear `Registro Migración Histórica` (Fase 8.1) — 9 filas, `accion=CONSERVAR` en todas.
- [x] Aplicar únicamente las normalizaciones históricas ya aprobadas en la Fase 8.1 (Etapas 2-4) — trivial, 100% `CONSERVAR`.
- [x] Proteger la hoja `Resumen Actividades` completa (`Datos → Hojas y rangos protegidos`, restringir edición a los administradores) — es de solo lectura por diseño (D3); validado en la Etapa 3 que sin esto, un doble clic accidental en la columna `Abrir origen` rompe la fórmula de matriz para todos los usuarios.
- [x] Ejecutar la conciliación histórico/resumen — sin diferencias (9 = 1 terminal + 8 abiertos + 0 ambiguos).
- [x] Detenerse ante cualquier diferencia no explicada — ninguna diferencia sin explicar.
- [x] **Aprobación A: aprobación humana del lote histórico y su conciliación** — **APROBADA por Carlos Rubén Bageta, 30/07/2026.** No debe confundirse con la Aprobación B: esta cierra específicamente el trabajo de datos, antes de que el pipeline nuevo exista en el archivo. Detalle completo en `auditoria/CHANGELOG.md` y `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`.

**Continúa el despliegue del pipeline:**

- [x] Copiar el código aprobado a Apps Script (30/07/2026, los 9 archivos).
- [x] Habilitar el servicio avanzado de Gmail y verificar `appsscript.json` (servicio y alcances OAuth) — confirmado en `enabledAdvancedServices`.
- [x] Configurar propiedades del script (incluido `MODO_PRUEBA=false` y `DRY_RUN=false`) — 22 propiedades.
- [x] Crear etiquetas y registrar sus IDs internos — `Revisión manual` + 3 subetiquetas.
- [x] Verificar nombres de hojas.
- [x] Autorizar permisos (incluidos los alcances de Gmail API) — confirmado corriendo como `tareas@alia-data.com`.
- [x] Ejecutar `validarConfiguracion()` — `valido: true`; encabezados de las 3 hojas técnicas verificados a mano.
- [x] Ejecutar una prueba manual — bandeja real vacía, sin error.
- [x] Procesar uno o dos correos controlados — `[PRUEBA-DESPLIEGUE-FASE9]`, 1 tarea real generada en `Desarrollo IT`.
- [x] Verificar filas, log, etiquetado y archivado **por mensaje** — `Log Mensajes` confirma `PROCESADO`/`FINALIZADO`/`ETIQUETADO_Y_ARCHIVADO`; idempotencia probada (segunda corrida sin fila adicional).
- [x] Ejecutar por separado el saneamiento de correos automáticos — **relocado antes de las hojas técnicas (auditoría BLQ-06), ejecutado dentro de la Aprobación A (A.4)**, no acá: 21 filas reales movidas a `Registros descartados`, conciliado sin diferencias. Ver esa sección más arriba.
- [x] Configurar las alertas hacia la cuenta técnica externa — **DEC-017 corregida (28/07/2026, auditoría BLQ-05) y resuelta el mismo día:** la notificación nativa no llega directamente a `carlosrubenbageta@alia-data.com`, pero un filtro de Gmail en `tareas@alia-data.com` que la reenvía sí funciona — probado con una falla real controlada, y reconfirmado activo el día del corte. Cubre solo "runtime terminado inesperadamente"; el resto de los eventos de la Fase 10 sigue pendiente.
- [x] **Aprobación B: aprobación final de despliegue** — **APROBADA por Carlos Rubén Bageta, 30/07/2026.** Sin diferencias sin explicar desde la Aprobación A.
- [x] Reactivar el activador (versión nueva) y verificar su primera ejecución — creado como `tareas@alia-data.com`, cada 10 minutos, notificación de fallos en modo Inmediatamente.
- [x] Confirmar que se procesó todo correo posterior a `FECHA_INICIO_CORTE` — bandeja real en 0 antes y después del corte, nada pendiente que drenar.
- [x] Supervisar las primeras ejecuciones — entra en la cadencia de la Fase 10 (día 1: todas las ejecuciones).

### Configuración sugerida

```text
Frecuencia: cada 10 minutos
Máximo de mensajes por ejecución: 10
Tiempo interno máximo: menor que el límite de Apps Script
Zona horaria: verificar con el archivo maestro
FECHA_INICIO_CORTE: registrada al abrir la ventana de corte
MAX_CARACTERES_CUERPO: 8000
MODO_PRUEBA: false
DRY_RUN: false
Cuenta de alertas: cuenta técnica externa (nunca tareas@alia-data.com)
```

### Entregables

- `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`
- `documentacion/PROCEDIMIENTO_REVERSION.md`
- `auditoria/ACTA_DESPLIEGUE.md`
- Reporte de conciliación histórico/resumen de la corrida real (Fase 8.1, distinto del reporte de simulación)
- Procedimiento de creación y restauración de `Resumen Actividades` en el archivo productivo
- Registro del lote histórico efectivamente aplicado (`batch_id`, fecha, responsable, conteos reales)

### Criterios de aceptación

- [x] La prueba manual es correcta (B.8-B.10, 30/07/2026).
- [x] El activador pertenece a `tareas@alia-data.com` (B.13, confirmado al crearlo).
- [x] Las propiedades están configuradas (22, B.5).
- [x] Las etiquetas existen y sus IDs internos están registrados (B.4).
- [x] Las hojas técnicas funcionan (creadas, `validarConfiguracion()` las encuentra, `Log Mensajes` recibió una escritura real).
- [x] La ventana de corte no dejó correos sin procesar (bandeja real en 0 antes y después, B.14).
- [x] No aparecen duplicados — confirmado para el único mensaje real procesado hasta ahora (idempotencia probada, B.10); se sigue confirmando con la supervisión de la Fase 10 a medida que lleguen correos reales nuevos.
- [ ] Existe un procedimiento de reversión probado — **parcial:** se probó el mecanismo de restaurar código (28/07/2026, proyecto de prueba), pero el simulacro completo (cuarentena, activador con la cuenta correcta, tiempo de recuperación) sigue sin ejecutarse — ver `documentacion/PROCEDIMIENTO_REVERSION.md`, "Pendiente".

**Adicionales, propios de la incorporación histórica (Fase 8.1, Aprobación A) — confirmados hoy sobre el archivo real, no solo la copia:**

- [x] Todos los históricos abiertos o ambiguos aparecen en `Resumen Actividades` (9 = 8 abiertos + 1 terminal, conciliado sin diferencias).
- [x] Los conteos concilian con las cinco hojas de negocio.
- [x] No se copiaron filas que ya estaban en el archivo maestro (fórmulas de solo lectura, sin operación de copiado).
- [x] Ningún histórico ingresó en las hojas técnicas del pipeline (`Indice Idempotencia` quedó vacía hasta el primer correo real de v3).
- [x] La vista muestra correctamente las tareas nuevas y las históricas (`Origen del registro`: 9 `Histórico/pre-corte` antes del corte; a confirmar que el primer correo real de v3 aparezca como `Automatización v3` en la próxima revisión).
- [ ] La reversión de normalizaciones fue probada — mismo estado que el punto general de arriba, no ensayada sobre el archivo real (solo sobre la copia, Fase 8.1).
- [x] `Dashboard` y `Listas` no sufrieron regresiones (reconfirmado en A.10).

### Puerta de aprobación

```text
APROBACIÓN FASE 9: APROBADA
Responsable:
Fecha:
Observaciones: Corte productivo real ejecutado el 30/07/2026. Aprobación A (cierre del lote
histórico) y Aprobación B (activación final) firmadas por Carlos Rubén Bageta el mismo día —
ver auditoria/CHANGELOG.md y documentacion/PROCEDIMIENTO_DESPLIEGUE.md para el detalle completo
de los 27 pasos (A.1-A.12, B.1-B.15). Pipeline v3 corriendo en producción real desde las 17:xx
del 30/07/2026 (activador creado como tareas@alia-data.com, cada 10 minutos). Primer correo real
procesado de punta a punta con éxito (tarea escrita, etiquetado, archivado, idempotencia
confirmada). 21 filas de correos automáticos saneadas de las hojas de negocio antes del corte.
Único punto pendiente, aceptado explícitamente como riesgo residual por Carlos Rubén Bageta
(no bloqueante para esta aprobación): el simulacro completo de reversión (cuarentena simulada,
activador recreado con la cuenta correcta, tiempo de recuperación medido) — ver
documentacion/PROCEDIMIENTO_REVERSION.md, sección "Pendiente". Entra ahora en la cadencia de
supervisión de la Fase 10.
```

---

## Fase 10. Monitoreo y estabilización

### Objetivo

Supervisar la automatización durante su primera semana productiva.

### Indicadores diarios

- cantidad de mensajes recibidos;
- cantidad de mensajes procesados;
- cantidad de tareas generadas;
- cantidad de mensajes sin tareas;
- cantidad de errores;
- cantidad de reintentos;
- cantidad de revisiones manuales;
- cantidad de duplicados detectados;
- duración promedio de ejecución;
- ejecuciones terminadas inesperadamente;
- consumo de la API de OpenAI (llamadas, tokens y costo estimado);
- consumo de unidades de cuota de Gmail API (v3).

### Alertas automáticas (v3)

Las alertas se envían a una **cuenta técnica externa**, nunca a `tareas@alia-data.com`, para evitar que reingresen al flujo y generen retroalimentación.

Eventos a notificar:

- error crítico;
- tres fallos consecutivos;
- runtime terminado inesperadamente;
- aumento anormal de revisión manual;
- clave API ausente;
- falta de permisos;
- fallo de escritura;
- hoja inexistente.

### Revisión recomendada

- Día 1: revisar todas las ejecuciones.
- Días 2 y 3: revisión dos veces al día.
- Días 4 a 7: revisión diaria.
- Después: revisión semanal.

### Entregables

- `documentacion/MANUAL_OPERATIVO.md`
- `auditoria/INFORME_ESTABILIZACION.md`
- `auditoria/CHANGELOG.md` actualizado

### Criterios de aceptación

- [ ] No se registran duplicados.
- [ ] No se procesan correos automáticos como tareas.
- [ ] Los mensajes con error llegan a revisión manual.
- [ ] Las tareas se distribuyen correctamente.
- [ ] Las alertas llegan a la cuenta técnica externa (DEC-017: pendiente construir la lógica propia para 7 de los 8 eventos listados arriba — la Fase 9 solo dejó activa la notificación nativa de fallas de Apps Script).
- [ ] El volumen de revisión manual es razonable.
- [ ] El sistema permanece estable durante siete días.

### Puerta de aprobación

```text
APROBACIÓN FASE 10: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

---

## 8. Protocolo de reversión

Ante una falla crítica:

1. Desactivar el activador.
2. Registrar la incidencia.
3. Copiar el log y las filas afectadas.
4. Restaurar el script anterior.
5. Verificar las propiedades del script.
6. Ejecutar una prueba manual.
7. Reactivar el activador anterior.
8. Mover los mensajes problemáticos a revisión manual.
9. Documentar la causa.
10. No reintentar el despliegue hasta corregir el problema.

### Falla crítica

Se considera falla crítica:

- duplicación masiva;
- escritura en hojas incorrectas;
- eliminación o pérdida de mensajes;
- clasificación masivamente errónea;
- exposición de credenciales;
- bloqueo continuo del script;
- alteración de filas existentes;
- errores repetidos del runtime.

---

## 9. Reglas de seguridad

- Nunca guardar credenciales en archivos.
- Nunca copiar datos sensibles completos en logs.
- Tratar el cuerpo del correo como entrada no confiable: ninguna instrucción contenida en un correo puede alterar el comportamiento del sistema (v3).
- Sanitizar todo valor que comience con `=`, `+`, `-` o `@` antes de escribirlo en Sheets (v3).
- Enmascarar contraseñas, tokens, datos bancarios, tarjetas y documentos personales antes de enviar contenido a OpenAI (v3).
- No enviar alertas técnicas a `tareas@alia-data.com` (v3).
- Restringir el acceso a las hojas técnicas y definir su plazo de retención (v3).
- No conceder acceso a carpetas innecesarias.
- No compartir el acceso de la cuenta operativa.
- No ejecutar código no revisado en producción.
- No eliminar mensajes automáticamente.
- No eliminar filas históricas sin respaldo.
- No procesar adjuntos en esta versión.
- No ampliar el alcance sin registrar una decisión.
- No avanzar de fase sin aprobación.

---

## 10. Registro de decisiones

Utilizar `auditoria/DECISIONES.md` con este formato:

```markdown
## DEC-001 — Título

**Fecha:**  
**Responsable:**  
**Estado:** Propuesta / Aprobada / Rechazada  
**Contexto:**  
**Decisión:**  
**Motivo:**  
**Impacto:**  
**Acciones derivadas:**  
```

---

## 11. Registro de cambios

Utilizar `auditoria/CHANGELOG.md`:

```markdown
# Changelog

## [Pendiente]

### Agregado
- 

### Modificado
- 

### Corregido
- 

### Eliminado
- 
```

---

## 12. Registro de incidencias

Utilizar `auditoria/INCIDENCIAS.md`:

```markdown
## INC-001 — Título

**Fecha y hora:**  
**Entorno:** Prueba / Producción  
**Severidad:** Baja / Media / Alta / Crítica  
**Mensaje afectado:**  
**Etapa:**  
**Descripción:**  
**Impacto:**  
**Causa probable:**  
**Acción inmediata:**  
**Corrección definitiva:**  
**Estado:** Abierta / En análisis / Resuelta  
```

---

## 13. Definición de terminado

La implementación estará terminada cuando:

- [ ] cada correo pueda generar cero, una o varias tareas;
- [ ] cada observación pueda generar cero, una o varias tareas;
- [ ] cada tarea se registre en una fila independiente;
- [ ] un correo pueda distribuir tareas entre varias hojas;
- [ ] se conserven las 17 columnas;
- [ ] la columna `Resumen de tarea` contenga la acción;
- [ ] la columna `Observaciones` contenga la observación de origen;
- [ ] no se procesen notificaciones automáticas como tareas;
- [ ] no existan duplicados;
- [ ] las respuestas nuevas en hilos ya procesados generen tareas;
- [ ] las etiquetas y el archivado se apliquen por mensaje individual mediante Gmail API;
- [ ] el manifiesto de tareas y el `Indice Idempotencia` estén operativos;
- [ ] exista trazabilidad por ID de Gmail;
- [ ] existan las hojas técnicas `Log Mensajes` y `Registro Tareas`;
- [ ] los errores se archiven bajo `Revisión manual`;
- [ ] exista recuperación ante interrupciones sin reconsultar la IA;
- [ ] el modo de prueba aislado esté validado;
- [ ] los casos de prueba CP-01 a CP-30 críticos pasen;
- [ ] el activador funcione desde `tareas@alia-data.com`;
- [ ] exista procedimiento de reversión;
- [ ] la automatización permanezca estable durante siete días.

---

## 14. Información que debe completarse antes de la Fase 3

```text
ID del archivo maestro de Google Sheets:
URL del proyecto de Apps Script:
Zona horaria del proyecto:
Nombres exactos de las hojas técnicas:
Máximo de mensajes por ejecución:
Tiempo máximo interno:
Modelo de OpenAI:
Etiquetas definitivas (con sus IDs internos de Gmail API):
Responsables definitivos:
Fecha de inicio de la ventana de corte (FECHA_INICIO_CORTE): (se completa en Fase 9)
Límite de caracteres del cuerpo (MAX_CARACTERES_CUERPO):
Política de retención del log ampliado:
ID de la planilla de prueba (SPREADSHEET_ID_PRUEBA):
Consulta Gmail de prueba (GMAIL_QUERY_PRUEBA):
Cuenta técnica para alertas:
```

---

## 15. Primer paso recomendado

Comenzar exclusivamente por la **Fase 0**.

No entregar a Cowork todas las fases como una orden de ejecución continua. Entregar el documento completo como contexto, pero indicar explícitamente:

```text
Ejecuta únicamente la Fase 0. No avances a la siguiente fase sin aprobación.
No desactives el activador hasta que se defina la ventana de corte.
```

Al finalizar cada fase:

1. revisar los entregables;
2. registrar observaciones;
3. aprobar o solicitar correcciones;
4. actualizar el estado de la fase;
5. generar el prompt de la fase siguiente.

---

## 16. Estado general del proyecto

| Fase | Estado | Fecha | Responsable | Observaciones |
|---|---|---|---|---|
| 0. Preparación y respaldo | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_0/ACTA_APROBACION_FASE_0.md` |
| 1. Diagnóstico | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_1/ACTA_APROBACION_FASE_1.md` |
| 2. Diseño funcional | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_2/ACTA_APROBACION_FASE_2.md` |
| 3. Refactor estructural | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_3/ACTA_APROBACION_FASE_3.md` |
| 4. Extracción con IA | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_4/ACTA_APROBACION_FASE_4.md` |
| 5. Idempotencia | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_5/ACTA_APROBACION_FASE_5.md` |
| 6. Filtros determinísticos | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_6/ACTA_APROBACION_FASE_6.md` |
| 7. Escritura en Sheets | **Aprobada** | 20/07/2026 | Carlos Rubén Bageta | Acta firmada en `entregables/FASE_7/ACTA_APROBACION_FASE_7.md` |
| 8. Pruebas | Casos preparados — **ejecución real pendiente (acción de Rubén)** |  |  | Ver `entregables/FASE_8/ACTA_APROBACION_FASE_8.md` |
| 9. Despliegue | Pendiente |  |  |  |
| 10. Monitoreo | Pendiente |  |  |  |

---

**Fin del plan maestro**
