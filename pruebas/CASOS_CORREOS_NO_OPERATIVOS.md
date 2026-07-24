# Casos de correos no operativos — Fase 6

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Propósito:** correos sintéticos concretos para verificar `evaluarFiltroDeterministico()` (`codigo/filtros_correo.gs`) durante la Fase 8 (pruebas controladas). Complementa el esqueleto general de `pruebas/CASOS_DE_PRUEBA.md` (CP-06, CP-07, CP-16) con datos de entrada específicos por regla.

> Ninguno de estos correos se envió ni se probó contra Gmail real durante la Fase 6: son insumos de datos para la ejecución de pruebas de la Fase 8.

---

## FC-01 — Notificación de fallos de Apps Script (regla obligatoria)

```text
Remitente: noreply-apps-scripts-notifications@google.com
Asunto: Summary of failures for Google Apps Script
Cuerpo: Your script "procesarCorreosDeTareas" has failed 3 times in the last 24 hours...
Encabezados: (ninguno relevante)
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionErrorAutomatizacion`. No se consulta a OpenAI. Corresponde a CP-07.

## FC-02 — Variante: coincide el asunto pero no el remitente

```text
Remitente: alertas-internas@alia-data.com
Asunto: FWD: Summary of failures for Google Apps Script
Cuerpo: Reenvío del aviso de fallos, para que lo revisen.
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionErrorAutomatizacion` (la regla evalúa remitente **O** asunto; el fragmento de asunto es suficiente aunque el remitente sea interno).

## FC-03 — Remitente automático genérico (rebote)

```text
Remitente: Mail Delivery Subsystem <mailer-daemon@googlemail.com>
Asunto: Delivery Status Notification (Failure)
Cuerpo: Your message could not be delivered to...
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionSinTareas`.

## FC-04 — Boletín con `List-Unsubscribe`

```text
Remitente: novedades@proveedor-ejemplo.com
Asunto: 5 tips para mejorar tu productividad esta semana
Cuerpo: Hola! Te compartimos las novedades del mes...
Encabezados: List-Unsubscribe: <mailto:baja@proveedor-ejemplo.com>
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionSinTareas`. Corresponde a CP-06.

## FC-05 — Comunicación masiva con `Precedence: bulk`

```text
Remitente: comunicaciones@partner-ejemplo.com
Asunto: Actualización de nuestros términos de servicio
Cuerpo: Te informamos que a partir del 01/08 actualizamos...
Encabezados: Precedence: bulk
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionSinTareas`.

## FC-06 — Respuesta automática (fuera de la oficina)

```text
Remitente: juan.cliente@empresa-ejemplo.com
Asunto: Respuesta automática: Consulta sobre factura
Cuerpo: Estoy fuera de la oficina hasta el 28/07. Para urgencias contactar a...
Encabezados: Auto-Submitted: auto-replied
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionSinTareas`.

## FC-07 — Cuerpo vacío tras extraer contenido nuevo

```text
Remitente: maria.socia@alia-data.com
Asunto: RE: Reunión de mañana
Cuerpo (mensaje completo): "El lun, 20 jul 2026 a las 10:00, Juan <juan@alia-data.com> escribió: > Confirmamos la reunión de mañana a las 15hs, ¿les parece?"
Cuerpo (contenido nuevo, tras extraerContenidoNuevo()): "" (vacío — la respuesta no agrega texto propio antes de la cita)
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionSinTareas`. Corresponde a CP-16.

## FC-08 — Caso de control: correo operativo válido que NO debe bloquearse

```text
Remitente: cliente.importante@empresa-ejemplo.com
Asunto: Oferta especial que nos hicieron — necesitamos revisarla
Cuerpo: Hola equipo, un proveedor nos mandó una oferta para renovar el contrato de licencias.
¿Alguien puede revisarla antes del viernes? Quedamos pendientes de una respuesta.
Encabezados: (ninguno de List-Unsubscribe/Precedence/Auto-Submitted)
```

**Resultado esperado:** `elegible: true`. Este caso existe específicamente para verificar que la palabra "oferta" en el asunto **no** dispara ningún filtro (a diferencia de un filtro basado en palabras clave) — el mensaje debe llegar a la IA y generar una tarea. Corresponde al criterio de aceptación "los filtros no bloquean correos operativos válidos".

## FC-09 — Caso de control: remitente de Google pero contenido operativo real

```text
Remitente: drive-shares-noreply@google.com
Asunto: Juan compartió "Presupuesto Q3" contigo
Cuerpo: Juan Pérez te compartió un archivo. Revisalo antes de la reunión de mañana.
```

**Resultado esperado:** `elegible: false`, `claveEtiqueta: RevisionSinTareas` (coincide con el patrón de dominio `google.com`/remitente automático de compartición). **Limitación reconocida:** si este correo realmente requiriera una acción humana (por ejemplo, revisar el presupuesto antes de una fecha), el filtro determinístico lo descartaría igual, sin pasar por la IA. Este es un caso límite documentado para la Fase 8: evaluar si conviene acotar el patrón de remitente automático de Google a dominios específicos (`docs.google.com`, `script.google.com`) en lugar de patrones más amplios, o si se prefiere dejar que la IA decida estos casos. **No se resuelve en esta fase**; se registra como punto a decidir con datos reales de `tareas@alia-data.com`.

---

## Resumen de cobertura

| Caso | Regla que dispara | Resultado |
|---|---|---|
| FC-01, FC-02 | Regla obligatoria Apps Script | `RevisionErrorAutomatizacion` |
| FC-03 | Remitente automático conocido | `RevisionSinTareas` |
| FC-04 | `List-Unsubscribe` | `RevisionSinTareas` |
| FC-05 | `Precedence: bulk` | `RevisionSinTareas` |
| FC-06 | `Auto-Submitted` | `RevisionSinTareas` |
| FC-07 | Cuerpo vacío | `RevisionSinTareas` |
| FC-08 | Ninguna (control positivo) | `elegible: true` → pasa a la IA |
| FC-09 | Remitente automático conocido (caso límite) | `RevisionSinTareas`, con limitación documentada |

## Referencias cruzadas

- Justificación de cada regla: `documentacion/REGLAS_ELEGIBILIDAD.md`.
- Casos generales de prueba (a ejecutar en Fase 8): `pruebas/CASOS_DE_PRUEBA.md`, CP-06, CP-07, CP-16.
