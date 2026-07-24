# Reglas de elegibilidad — Fase 6

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 6 — Regla obligatoria para Apps Script / Otros correos no operativos" (líneas 1104-1142)
**Código asociado:** `codigo/filtros_correo.gs` (`evaluarFiltroDeterministico()`)

---

## 1. Objetivo y principio de diseño

Evitar que correos automáticos, promocionales o de error se conviertan en tareas, **sin bloquear correos operativos válidos** (criterio de aceptación explícito de esta fase).

Esta doble exigencia — detectar con confianza, pero no arriesgar falsos positivos — determina la elección técnica central de esta fase: **las reglas se basan en encabezados estándar de correo electrónico y coincidencias exactas, nunca en palabras sueltas del asunto o del cuerpo.** Un filtro basado en palabras clave (por ejemplo, descartar cualquier asunto que contenga "oferta" o "novedades") tarde o temprano bloquearía un correo operativo legítimo que use esas mismas palabras en un contexto real (p. ej. "Nueva oferta comercial del cliente X" o "Novedades del proyecto Y"). Los encabezados `List-Unsubscribe`, `Precedence` y `Auto-Submitted`, en cambio, son señales técnicas estándar (RFC 2369, RFC 8058, RFC 2076, RFC 3834) que los sistemas de envío masivo y los autorespondedores agregan automáticamente, y que un correo operativo humano normal no trae.

Los casos ambiguos que este filtro determinístico no puede resolver con certeza quedan para la segunda barrera: la clasificación de la IA (`requiere_revision`, `correo_relevante`, `motivo_sin_tareas` — RF-06/RF-07/RF-08 en `documentacion/REGLAS_FUNCIONALES.md`), ya diseñada desde la Fase 2 exactamente para absorber esa incertidumbre.

## 2. Reglas implementadas, en orden de evaluación

### 2.1. Regla obligatoria: notificaciones de fallos de Apps Script

Regla explícita del plan v3, evaluada primero y con tratamiento distinto al resto:

```text
SI remitente contiene "noreply-apps-scripts-notifications@google.com"
   O asunto contiene "Summary of failures for Google Apps Script"
ENTONCES:
  - NO consultar OpenAI
  - NO crear tareas
  - etiqueta: Revisión manual/Error de automatización
  - archivar
  - registrar en el log
```

Es la única regla que usa una etiqueta distinta de `Revisión manual/Sin tareas detectadas`: al ser una falla del propio sistema de automatización (no un correo externo ni una decisión de contenido), merece una categoría separada para que el responsable funcional pueda auditar fallas de Apps Script sin mezclarlas con correos simplemente no accionables.

### 2.2. Remitentes automáticos conocidos

Lista general heredada de la Fase 3 (`PATRONES_REMITENTE_AUTOMATICO`): `mailer-daemon@`, `no-reply@`/`noreply@`, dominios `docs.google.com` y `script.google.com`. Cubre notificaciones de rebote y avisos genéricos de Google Workspace que no son la falla específica de Apps Script de la regla 2.1.

### 2.3. Encabezado `List-Unsubscribe`

Presente en prácticamente todo boletín, promoción o comunicación masiva legítima (es, de hecho, un requisito de Gmail/Yahoo desde 2024 para remitentes masivos, RFC 8058). Su sola presencia es un indicador de alta confianza de que el mensaje no es una solicitud operativa dirigida por una persona.

### 2.4. Encabezado `Precedence: bulk` / `list` / `junk`

Encabezado más antiguo (RFC 2076, de facto) usado por listas de distribución y sistemas de envío masivo. Se trata como señal adicional independiente de `List-Unsubscribe`, para cubrir remitentes que usan uno u otro.

### 2.5. Encabezado `Auto-Submitted`

RFC 3834: cualquier valor distinto de `no` (por ejemplo, `auto-replied`, `auto-generated`) indica una respuesta automática (fuera de la oficina, confirmación automática de recepción, autoresponder). No requiere revisión de contenido: por definición, nadie escribió ese correo pensando en pedir una tarea.

### 2.6. Cuerpo vacío

Heredado de la Fase 3: si `extraerContenidoNuevo()` + `normalizarCuerpo()` dejan un cuerpo vacío (por ejemplo, una respuesta que solo cita el mensaje anterior sin agregar texto), no hay nada que analizar.

## 3. Qué NO se implementó como regla determinística (y por qué)

El plan v3 menciona como ejemplos de correos no operativos: "promociones, boletines, mensajes de novedades de Google Workspace, comunicaciones de productos, cuerpos vacíos, respuestas automáticas, correos sin información accionable." De esa lista:

- **Boletines, promociones, comunicaciones de productos:** cubiertos indirectamente por `List-Unsubscribe`/`Precedence` (2.3, 2.4), que son la señal técnica real detrás de esas categorías, en lugar de intentar reconocerlas por el nombre del remitente o palabras del asunto (frágil y con riesgo de falsos positivos).
- **Novedades de Google Workspace:** cubierto por el dominio `docs.google.com`/`script.google.com` (2.2) cuando aplica; el resto de las notificaciones de producto de Google casi siempre incluye `List-Unsubscribe` o `Precedence`.
- **"Correos sin información accionable":** esta categoría es inherentemente semántica (depende de entender el contenido), no determinística. Se deja deliberadamente fuera del filtro de esta fase y queda a cargo de la IA (`motivo_sin_tareas`, RF-07), que sí está diseñada para ese juicio de contenido.

Esta decisión prioriza el criterio de aceptación "los filtros no bloquean correos operativos válidos" por sobre una cobertura más agresiva pero menos confiable.

## 4. Trazabilidad contra los criterios de aceptación

| Criterio | Cómo se cumple |
|---|---|
| Las notificaciones de Apps Script nunca llegan al tablero | Regla 2.1: `elegible: false` antes de cualquier llamada a la IA; nunca se genera una tarea para estos mensajes |
| Los correos promocionales no generan tareas | Reglas 2.3/2.4 (señal técnica de distribución masiva) + capa de la IA (RF-08) para los casos no cubiertos por encabezados |
| Los filtros no bloquean correos operativos válidos | Elección deliberada de señales de alta confianza (encabezados estándar, coincidencia exacta) en lugar de palabras clave; ver sección 3 |
| Cada exclusión queda registrada | `evaluarFiltroDeterministico()` siempre devuelve un `motivo`; `procesarUnMensaje()` lo persiste en `Log Mensajes` (campo `error`) a través de `finalizarMensajeSinTareas()` |

## Referencias cruzadas

- Casos sintéticos concretos para cada regla: `pruebas/CASOS_CORREOS_NO_OPERATIVOS.md`.
- Tabla de tratamiento por resultado (etiquetas y archivado): `documentacion/MAPA_COLUMNAS.md`, sección 4.
- Reglas de revisión manual de la IA (segunda barrera): `documentacion/REGLAS_FUNCIONALES.md`, RF-06 a RF-08.
- Riesgo mitigado: `documentacion/MATRIZ_RIESGOS.md`, R-02 (procesamiento de correos automáticos/publicitarios).
