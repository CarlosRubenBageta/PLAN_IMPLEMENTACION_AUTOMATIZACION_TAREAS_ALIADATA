# Plan maestro de implementación  
## Automatización de tareas desde Gmail hacia tableros de Aliadata

**Archivo:** `PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA.md`  
**Versión inicial:** 1.0  
**Responsable funcional:** Rubén  
**Cuenta operativa:** `tareas@alia-data.com`  
**Entorno:** Google Workspace + Gmail + Google Sheets + Apps Script + API de OpenAI  
**Modalidad de ejecución recomendada:** semiautomática, por fases y con aprobación humana entre fases

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

### 4.2. Contenido analizado

Se analizarán:

- asunto;
- remitente;
- cuerpo en texto plano;
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

### 4.9. Activador

El activador actual:

- se ejecuta cada diez minutos;
- fue creado desde `tareas@alia-data.com`.

---

## 5. Arquitectura objetivo

```text
Mensaje nuevo
    ↓
Control por ID individual de Gmail
    ↓
Registro inicial en Log Procesamiento
    ↓
Extracción y limpieza del contenido
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
IDs determinísticos
    ↓
Agrupamiento por hoja
    ↓
Escritura por lotes
    ↓
Etiquetado y archivado
    ↓
Cierre del registro de auditoría
```

---

## 6. Estructura recomendada de la carpeta local

Crear una carpeta exclusiva para el proyecto:

```text
Automatizacion_Tareas_Aliadata/
├── PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA.md
├── README.md
├── configuracion/
│   ├── PARAMETROS_EJEMPLO.md
│   └── MATRIZ_PERMISOS.md
├── codigo/
│   ├── script_actual.gs
│   ├── script_refactorizado.gs
│   ├── prompts_ia.gs
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
│   ├── PROCEDIMIENTO_REVERSIÓN.md
│   └── MANUAL_OPERATIVO.md
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
- Google Sheets;
- propiedades del script;
- llamadas HTTP externas;
- bloqueo de ejecuciones;
- utilidades de fecha y formato.

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
- [ ] Desactivar temporalmente el activador.
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
- [ ] El activador está desactivado durante las modificaciones.
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
PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA.md.

Crea la estructura de carpetas, los archivos de auditoría y los checklists
de respaldo. No modifiques ningún recurso de Google Workspace, no uses
credenciales y no avances a la Fase 1. Al finalizar, presenta los entregables,
las acciones realizadas y las acciones que requieren intervención humana.
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
| Duplicación de filas | Alta | Alta | ID determinístico + log |
| Procesamiento de publicidad | Alta | Media | Filtro determinístico |
| Caída del runtime | Media | Alta | Checkpoints + recuperación |
| Ejecuciones simultáneas | Media | Alta | `LockService` |
| Respuesta inválida de IA | Media | Alta | JSON Schema + validación |
| Falla parcial de escritura | Media | Alta | Idempotencia |
| Cuerpo excesivamente largo | Baja/Media | Media | Normalización y límite |
| Hoja inexistente | Baja | Alta | Validación previa |
| Clave API ausente | Baja | Alta | Verificación al inicio |

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
APROBACIÓN FASE 1: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

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
- Una clasificación ambigua debe enviarse a revisión manual.

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

### Hoja `Log Procesamiento`

Columnas recomendadas:

1. Fecha de inicio
2. Fecha de finalización
3. ID del mensaje Gmail
4. ID del hilo Gmail
5. Remitente
6. Asunto
7. Estado
8. Etapa alcanzada
9. Observaciones detectadas
10. Tareas generadas
11. IDs de tareas
12. Hojas de destino
13. Intentos
14. Código HTTP
15. Error o detalle

### Estados permitidos

```text
EN_PROCESO
PROCESADO
SIN_TAREAS
REVISIÓN_MANUAL
ERROR_TEMPORAL
ERROR_DEFINITIVO
```

### Etapas permitidas

```text
INICIO
CORREO_EXTRAÍDO
FILTRO_COMPLETADO
IA_INICIADA
IA_COMPLETADA
RESPUESTA_VALIDADA
ESCRITURA_INICIADA
ESCRITURA_COMPLETADA
GMAIL_ACTUALIZADO
FINALIZADO
```

### Entregables

- `documentacion/ESQUEMA_JSON.md`
- `documentacion/REGLAS_FUNCIONALES.md`
- `documentacion/DISEÑO_LOG_PROCESAMIENTO.md`
- `documentacion/MAPA_COLUMNAS.md`

### Criterios de aceptación

- [ ] El esquema representa múltiples observaciones.
- [ ] Cada observación admite cero, una o varias tareas.
- [ ] Cada tarea tiene clasificación independiente.
- [ ] El mapeo a las 17 columnas está documentado.
- [ ] Se definieron estados y etapas.
- [ ] Se definieron reglas de revisión manual.

### Puerta de aprobación

```text
APROBACIÓN FASE 2: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

---

## Fase 3. Refactor estructural del script

### Objetivo

Separar el script en funciones pequeñas, verificables y recuperables.

### Funciones mínimas

```text
procesarCorreosDeTareas()
obtenerHilosPendientes()
obtenerMensajesPendientes()
procesarUnMensaje()
extraerDatosCorreo()
normalizarCuerpo()
evaluarFiltroDeterministico()
consultarIAExtractora()
validarRespuestaIA()
generarTareasNormalizadas()
generarIdDeterministico()
agruparFilasPorHoja()
escribirFilasPorLote()
registrarInicioProcesamiento()
actualizarLogProcesamiento()
aplicarResultadoGmail()
gestionarErrorMensaje()
recuperarProcesamientosAbandonados()
```

### Reglas técnicas

- Usar `SpreadsheetApp.openById()`.
- Guardar el ID de Sheets en propiedades del script.
- Buscar Gmail con límite desde el origen.
- Usar `GmailApp.search(consulta, 0, MAX_HILOS)`.
- Usar `LockService`.
- Liberar el lock en `finally`.
- Implementar `try/catch` por mensaje.
- Mantener un límite de mensajes por ejecución.
- Mantener un límite de tiempo interno.
- No usar `Math.random()` para IDs.
- No usar `appendRow()` por tarea.
- No aplicar `Procesado` antes de completar todas las escrituras.
- No archivar antes de registrar el resultado final.

### Entregables

- `codigo/script_refactorizado_borrador.gs`
- `documentacion/ARQUITECTURA_PROPUESTA.md`
- `documentacion/FLUJO_TRANSACCIONAL.md`

### Criterios de aceptación

- [ ] El código se encuentra modularizado.
- [ ] Existe control de concurrencia.
- [ ] Existe procesamiento aislado por mensaje.
- [ ] Existe búsqueda paginada y limitada.
- [ ] No existe escritura en producción.
- [ ] El script puede revisarse sin credenciales.

### Puerta de aprobación

```text
APROBACIÓN FASE 3: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

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

### Requisitos técnicos

- Utilizar un esquema JSON estricto.
- Mantener temperatura baja.
- Verificar código HTTP.
- Registrar el código HTTP.
- Controlar respuestas vacías.
- Controlar rechazo del modelo.
- Controlar JSON incompleto.
- Implementar reintentos para errores temporales.
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
- [ ] La clave API no está presente en ningún archivo.

### Puerta de aprobación

```text
APROBACIÓN FASE 4: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

---

## Fase 5. Idempotencia, IDs y recuperación

### Objetivo

Impedir duplicados y permitir retomar ejecuciones interrumpidas.

### Formato conceptual de ID

```text
ALI-{ID_MENSAJE_ABREVIADO}-O{NRO_OBSERVACION}-T{NRO_TAREA}
```

Ejemplo:

```text
ALI-A8F23C-O02-T01
```

### Reglas

- El mismo mensaje y la misma posición lógica deben generar el mismo ID.
- Antes de escribir una tarea, comprobar si el ID ya existe.
- Registrar el ID del mensaje Gmail.
- Registrar el ID del hilo Gmail.
- Registrar la etapa alcanzada.
- Detectar registros `EN_PROCESO` antiguos.
- Definir un umbral de abandono, por ejemplo 20 minutos.
- Recuperar o enviar a revisión manual los procesamientos abandonados.
- No duplicar filas ya escritas.

### Entregables

- `codigo/idempotencia.gs`
- `codigo/recuperacion.gs`
- `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`
- `documentacion/RECUPERACION_INTERRUPCIONES.md`

### Criterios de aceptación

- [ ] Reejecutar el mismo mensaje no duplica filas.
- [ ] Una caída después de una escritura parcial puede recuperarse.
- [ ] Los registros abandonados se detectan.
- [ ] Se documenta el procedimiento de recuperación.

### Puerta de aprobación

```text
APROBACIÓN FASE 5: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

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
APROBACIÓN FASE 6: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

---

## Fase 7. Escritura segura en Google Sheets

### Objetivo

Insertar varias tareas de forma eficiente y coherente.

### Reglas

- Agrupar las tareas por hoja.
- Validar que cada hoja exista.
- Validar que cada fila tenga exactamente 17 valores.
- Escribir por lotes mediante `setValues()`.
- Conservar formatos y validaciones existentes.
- No utilizar una hoja por defecto silenciosa ante errores.
- Si una hoja no existe, enviar el mensaje a revisión manual.
- Registrar las hojas de destino.
- Registrar los IDs escritos.

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
- `documentacion/MAPA_ESCRITURA.md`
- `pruebas/PRUEBAS_ESCRITURA.md`

### Criterios de aceptación

- [ ] Cada tarea crea una fila.
- [ ] Un correo puede generar filas en varias hojas.
- [ ] Todas las filas contienen 17 valores.
- [ ] Se evita la escritura parcial no recuperable.
- [ ] No se producen filas duplicadas.

### Puerta de aprobación

```text
APROBACIÓN FASE 7: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

---

## Fase 8. Pruebas controladas

### Objetivo

Validar el comportamiento sin utilizar inicialmente correos productivos.

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
| CP-12 | Caída después de escritura parcial | Recuperación |
| CP-13 | Dos ejecuciones simultáneas | Una sola procesa |
| CP-14 | Firma extensa | No genera tareas falsas |
| CP-15 | Observaciones duplicadas | Consolidación |
| CP-16 | Cuerpo vacío | Revisión manual |
| CP-17 | Fecha límite explícita | Fecha correcta |
| CP-18 | Fecha no explícita | Campo vacío |

### Método recomendado

1. Crear una copia del archivo maestro.
2. Crear mensajes sintéticos.
3. Ejecutar manualmente.
4. Revisar cada fila.
5. Revisar el log.
6. Revisar etiquetas.
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
- [ ] El script puede reejecutarse de forma segura.

### Puerta de aprobación

```text
APROBACIÓN FASE 8: PENDIENTE
Responsable:
Fecha:
Observaciones:
```

---

## Fase 9. Despliegue controlado

### Objetivo

Instalar la nueva versión en producción de forma reversible.

### Procedimiento

- [ ] Confirmar respaldo final.
- [ ] Confirmar que el activador está desactivado.
- [ ] Copiar el código aprobado a Apps Script.
- [ ] Configurar propiedades del script.
- [ ] Crear etiquetas.
- [ ] Crear la hoja `Log Procesamiento`.
- [ ] Verificar nombres de hojas.
- [ ] Autorizar permisos.
- [ ] Ejecutar una prueba manual.
- [ ] Procesar uno o dos correos controlados.
- [ ] Verificar filas, log, etiquetas y archivado.
- [ ] Reactivar el activador.
- [ ] Supervisar las primeras ejecuciones.

### Configuración sugerida

```text
Frecuencia: cada 10 minutos
Máximo de mensajes por ejecución: 10
Tiempo interno máximo: menor que el límite de Apps Script
Zona horaria: verificar con el archivo maestro
```

### Entregables

- `documentacion/PROCEDIMIENTO_DESPLIEGUE.md`
- `documentacion/PROCEDIMIENTO_REVERSIÓN.md`
- `auditoria/ACTA_DESPLIEGUE.md`

### Criterios de aceptación

- [ ] La prueba manual es correcta.
- [ ] El activador pertenece a `tareas@alia-data.com`.
- [ ] Las propiedades están configuradas.
- [ ] Las etiquetas existen.
- [ ] El log funciona.
- [ ] No aparecen duplicados.
- [ ] Existe un procedimiento de reversión probado.

### Puerta de aprobación

```text
APROBACIÓN FASE 9: PENDIENTE
Responsable:
Fecha:
Observaciones:
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
- ejecuciones terminadas inesperadamente.

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
- [ ] exista trazabilidad por ID de Gmail;
- [ ] exista un log técnico;
- [ ] los errores se archiven bajo `Revisión manual`;
- [ ] exista recuperación ante interrupciones;
- [ ] el activador funcione desde `tareas@alia-data.com`;
- [ ] exista procedimiento de reversión;
- [ ] la automatización permanezca estable durante siete días.

---

## 14. Información que debe completarse antes de la Fase 3

```text
ID del archivo maestro de Google Sheets:
URL del proyecto de Apps Script:
Zona horaria del proyecto:
Nombre exacto de la hoja de log:
Máximo de mensajes por ejecución:
Tiempo máximo interno:
Modelo de OpenAI:
Etiquetas definitivas:
Responsables definitivos:
```

---

## 15. Primer paso recomendado

Comenzar exclusivamente por la **Fase 0**.

No entregar a Cowork todas las fases como una orden de ejecución continua. Entregar el documento completo como contexto, pero indicar explícitamente:

```text
Ejecuta únicamente la Fase 0. No avances a la siguiente fase sin aprobación.
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
| 0. Preparación y respaldo | Pendiente |  |  |  |
| 1. Diagnóstico | Pendiente |  |  |  |
| 2. Diseño funcional | Pendiente |  |  |  |
| 3. Refactor estructural | Pendiente |  |  |  |
| 4. Extracción con IA | Pendiente |  |  |  |
| 5. Idempotencia | Pendiente |  |  |  |
| 6. Filtros determinísticos | Pendiente |  |  |  |
| 7. Escritura en Sheets | Pendiente |  |  |  |
| 8. Pruebas | Pendiente |  |  |  |
| 9. Despliegue | Pendiente |  |  |  |
| 10. Monitoreo | Pendiente |  |  |  |

---

**Fin del plan maestro**
