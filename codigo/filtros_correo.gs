/**
 * ============================================================================
 * BORRADOR — Fase 6 (Filtros determinísticos). NO DESPLEGAR.
 * ============================================================================
 * Reemplaza evaluarFiltroDeterministico() y PATRONES_REMITENTE_AUTOMATICO,
 * placeholders del borrador de Fase 3 (codigo/script_refactorizado.gs).
 *
 * Detalle y justificación de cada regla: documentacion/REGLAS_ELEGIBILIDAD.md.
 * Requiere que datosCorreo incluya datosCorreo.encabezados (agregado en
 * extraerDatosCorreo(), codigo/script_refactorizado.gs, Fase 6).
 * ============================================================================
 */

// Remitentes/dominios automáticos conocidos (barrera general, no exhaustiva).
var PATRONES_REMITENTE_AUTOMATICO = [
  /mailer-daemon@/i,
  /no-?reply@/i,
  /noreply@/i,
  /docs\.google\.com$/i,
  /script\.google\.com$/i
];

// Regla obligatoria del plan v3 para notificaciones de fallos de Apps
// Script: coincidencia EXACTA de remitente o de fragmento de asunto.
var REMITENTE_FALLOS_APPS_SCRIPT = 'noreply-apps-scripts-notifications@google.com';
var ASUNTO_FALLOS_APPS_SCRIPT = 'Summary of failures for Google Apps Script';

/**
 * Filtro determinístico de elegibilidad, ejecutado ANTES de invocar a la IA.
 * Devuelve { elegible, motivo, claveEtiqueta } — claveEtiqueta indica cuál de
 * las etiquetas de revisión configuradas en validarConfiguracion() aplica.
 *
 * Principio de diseño (ver REGLAS_ELEGIBILIDAD.md): se prioriza NO bloquear
 * correos operativos válidos (criterio de aceptación explícito de esta
 * fase). Por eso las reglas se basan en encabezados estándar de correo
 * (List-Unsubscribe, Precedence, Auto-Submitted) y coincidencias exactas de
 * remitente/asunto, NUNCA en palabras sueltas del asunto o del cuerpo que
 * podrían aparecer también en un pedido operativo legítimo. Los casos que
 * estas reglas no detecten con certeza quedan para la segunda barrera (la
 * IA, RF-07/RF-08 en REGLAS_FUNCIONALES.md).
 */
function evaluarFiltroDeterministico(datosCorreo) {
  // 1) Regla obligatoria: notificaciones de fallos de Apps Script.
  // Va a una etiqueta DISTINTA (Error de automatización) y NO a
  // "Sin tareas detectadas", y nunca debe llegar a consultarIAExtractora().
  var remitenteEsFalloAppsScript = datosCorreo.remitente.indexOf(REMITENTE_FALLOS_APPS_SCRIPT) !== -1;
  var asuntoEsFalloAppsScript = datosCorreo.asunto.indexOf(ASUNTO_FALLOS_APPS_SCRIPT) !== -1;
  if (remitenteEsFalloAppsScript || asuntoEsFalloAppsScript) {
    return {
      elegible: false,
      motivo: 'Notificación de fallos de Google Apps Script (remitente o asunto coincide con la regla obligatoria).',
      claveEtiqueta: 'RevisionErrorAutomatizacion'
    };
  }

  // 2) Remitentes automáticos conocidos (barrera general).
  var remitenteAutomatico = PATRONES_REMITENTE_AUTOMATICO.some(function (patron) {
    return patron.test(datosCorreo.remitente);
  });
  if (remitenteAutomatico) {
    return {
      elegible: false,
      motivo: 'Remitente identificado como automático: ' + datosCorreo.remitente,
      claveEtiqueta: 'RevisionSinTareas'
    };
  }

  // 3) Encabezado List-Unsubscribe: señal estándar e inequívoca de boletín,
  // promoción o comunicación masiva (RFC 2369 / RFC 8058). Prácticamente
  // ningún correo operativo legítimo dirigido a tareas@alia-data.com lo trae.
  if (datosCorreo.encabezados && datosCorreo.encabezados.listUnsubscribe) {
    return {
      elegible: false,
      motivo: 'Encabezado List-Unsubscribe presente (boletín, promoción o comunicación masiva).',
      claveEtiqueta: 'RevisionSinTareas'
    };
  }

  // 4) Encabezado Precedence: bulk/list/junk (RFC 2076), usado por sistemas
  // de distribución masiva y de novedades de producto.
  if (datosCorreo.encabezados && /^(bulk|list|junk)$/i.test(datosCorreo.encabezados.precedence || '')) {
    return {
      elegible: false,
      motivo: 'Encabezado Precedence indica distribución masiva: ' + datosCorreo.encabezados.precedence,
      claveEtiqueta: 'RevisionSinTareas'
    };
  }

  // 5) Encabezado Auto-Submitted (RFC 3834): respuestas automáticas /
  // autorespondedores (fuera de la oficina, confirmaciones automáticas).
  if (datosCorreo.encabezados && datosCorreo.encabezados.autoSubmitted &&
      datosCorreo.encabezados.autoSubmitted.toLowerCase() !== 'no') {
    return {
      elegible: false,
      motivo: 'Respuesta automática (Auto-Submitted: ' + datosCorreo.encabezados.autoSubmitted + ').',
      claveEtiqueta: 'RevisionSinTareas'
    };
  }

  // 6) Cuerpo vacío tras extraer contenido nuevo (por ejemplo, una respuesta
  // que solo contiene una firma o un "+1" sin texto adicional real).
  if (!datosCorreo.cuerpo || datosCorreo.cuerpo.trim().length === 0) {
    return {
      elegible: false,
      motivo: 'Cuerpo vacío tras extraer contenido nuevo (posible respuesta sin texto adicional).',
      claveEtiqueta: 'RevisionSinTareas'
    };
  }

  return { elegible: true, motivo: null, claveEtiqueta: null };
}
