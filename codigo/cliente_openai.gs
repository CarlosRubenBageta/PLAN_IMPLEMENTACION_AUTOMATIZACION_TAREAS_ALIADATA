/**
 * ============================================================================
 * BORRADOR — Fase 4 (Extracción con IA y Structured Outputs). NO DESPLEGAR.
 * ============================================================================
 * Reemplaza la función consultarIAExtractora() placeholder del borrador de
 * Fase 3 (codigo/script_refactorizado.gs) con la política de reintentos y
 * el manejo de errores definidos en el plan v3 (sección "Fase 4").
 *
 * Requiere obtenerEsquemaJsonRespuestaIA() de codigo/esquema_json.gs y
 * construirPromptSistema() de codigo/prompts_ia.gs (Fase 4).
 *
 * Detalle y justificación de la política de reintentos: documentacion/POLITICA_REINTENTOS.md.
 * ============================================================================
 */

// Tabla de precios por 1000 tokens (USD). PENDIENTE de actualización manual
// cuando cambie la tarifa de OpenAI o el modelo definitivo (ver observación
// pendiente en entregables/FASE_4/ACTA_APROBACION_FASE_4.md).
var TARIFAS_OPENAI_USD_POR_1K_TOKENS = {
  'gpt-4o-mini': { entrada: 0.00015, salida: 0.0006 }
};

var MAX_INTENTOS_IA = 3; // Intento 1 (inmediato), 2 (espera breve), 3 (espera mayor).
var ESPERA_MS_POR_INTENTO = [0, 2000, 8000];

/**
 * Códigos/condiciones HTTP que se consideran errores temporales (reintentables).
 * 429 (límite de tasa / cuota) y 5xx (error del servidor de OpenAI) según el
 * requisito explícito de la Fase 4.
 */
function esErrorTemporalHttp(codigoHttp) {
  return codigoHttp === 429 || (codigoHttp >= 500 && codigoHttp < 600);
}

/**
 * Construye el payload completo para la llamada a OpenAI (mensajes,
 * response_format con el esquema JSON estricto, y temperature). Separado
 * de consultarIAExtractora() para poder probar la construcción real del
 * payload de forma determinista, sin llamar a la red (INC-FASE8-010, v2:
 * revisión del flujo completo, no solo la presencia textual de reglas en
 * el prompt).
 */
function construirPayloadOpenAI(datosCorreo, cfg) {
  var systemPrompt = construirPromptSistema();
  var userContent = 'Asunto: ' + datosCorreo.asunto +
    '\nRemitente: ' + datosCorreo.remitente +
    '\nCuerpo (solo contenido nuevo, ya enmascarado):\n' + datosCorreo.cuerpo;

  return {
    model: cfg.openaiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: obtenerEsquemaJsonRespuestaIA()
    },
    temperature: 0.2
  };
}

/**
 * Llama a OpenAI usando Structured Outputs (json_schema estricto) y aplica
 * la política de reintentos de 3 intentos con espera creciente. Nunca
 * registra el cuerpo completo del correo en logs (solo métricas).
 */
function consultarIAExtractora(datosCorreo, cfg) {
  // INC-FASE8-010 (v2): registro no sensible de la versión de prompt
  // efectivamente usada en esta llamada. Nunca se registra el prompt
  // completo ni el cuerpo del correo — solo el identificador corto
  // definido en codigo/prompts_ia.gs, para poder confirmar en una
  // regresión real qué versión de prompt participó en la llamada.
  Logger.log('consultarIAExtractora(): usando prompt versión ' + VERSION_PROMPT_SISTEMA);
  var payload = construirPayloadOpenAI(datosCorreo, cfg);

  var options = {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + cfg.openaiApiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var ultimoResultado = null;

  for (var intento = 1; intento <= MAX_INTENTOS_IA; intento++) {
    if (ESPERA_MS_POR_INTENTO[intento - 1] > 0) {
      Utilities.sleep(ESPERA_MS_POR_INTENTO[intento - 1]);
    }

    var inicio = Date.now();
    var response;
    // INICIO INSTRUMENTACIÓN TEMPORAL CP-09 (auditoria/CHANGELOG.md, 26/07/2026) — RETIRAR TRAS LA CORRIDA REAL.
    // Simula un HTTP 503 (temporal) en el primer intento y un HTTP 200 con
    // contenido válido en el segundo, sin llamar a la API real de OpenAI —
    // el resto del bucle real (parseo, esErrorTemporalHttp(), continue,
    // construcción del resultado final) se ejecuta sin modificar. Gateada
    // por cfg.modoPrueba y por una property exclusiva de esta prueba.
    if (cfg.modoPrueba && PropertiesService.getScriptProperties().getProperty('CP09_FORZAR_HTTP_TEMPORAL') === 'true') {
      Logger.log('CP-09: simulando HTTP ' + (intento === 1 ? '503' : '200') + ' en el intento ' + intento + ' (instrumentación temporal de prueba, sin llamar a la API real de OpenAI).');
      if (intento === 1) {
        response = {
          getResponseCode: function () { return 503; },
          getContentText: function () { return JSON.stringify({ error: { message: 'CP-09: 503 simulado por instrumentación temporal de prueba.' } }); },
          getHeaders: function () { return {}; }
        };
      } else {
        response = {
          getResponseCode: function () { return 200; },
          getContentText: function () {
            return JSON.stringify({
              choices: [{
                message: {
                  content: JSON.stringify({
                    correo_relevante: true,
                    requiere_revision: false,
                    motivo_revision: null,
                    observaciones: [{
                      texto_original: 'Correo de prueba CP-09.',
                      tareas: [{
                        resumen: 'Tarea de prueba CP-09 (segundo intento exitoso).',
                        tablero: 'Desarrollo IT',
                        prioridad: 'Medio',
                        grupo_origen: 'Desarrollo IT',
                        responsable_sugerido: 'Responsable Técnico',
                        fecha_limite: null
                      }]
                    }]
                  })
                },
                finish_reason: 'stop'
              }],
              usage: { prompt_tokens: 100, completion_tokens: 50 }
            });
          },
          getHeaders: function () { return { 'x-request-id': 'cp09-instrumentacion-temporal' }; }
        };
      }
    } else {
      try {
        response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
      } catch (errorRed) {
        // Error de red (timeout, DNS, etc.): tratado como temporal.
        ultimoResultado = construirResultadoFallido(null, (Date.now() - inicio) / 1000, 'Error de red: ' + errorRed.message, intento);
        continue;
      }
    }
    // FIN INSTRUMENTACIÓN TEMPORAL CP-09

    var duracionSegundos = (Date.now() - inicio) / 1000;
    var codigoHttp = response.getResponseCode();
    var requestId = response.getHeaders()['x-request-id'] || null;

    // Controlar respuesta vacía.
    var textoRespuesta = response.getContentText();
    if (!textoRespuesta) {
      ultimoResultado = construirResultadoFallido(codigoHttp, duracionSegundos, 'Respuesta vacía del servidor.', intento, requestId);
      if (esErrorTemporalHttp(codigoHttp) && intento < MAX_INTENTOS_IA) continue;
      break;
    }

    var cuerpoRespuesta;
    try {
      cuerpoRespuesta = JSON.parse(textoRespuesta);
    } catch (e) {
      // Controlar JSON incompleto/inválido a nivel de transporte.
      ultimoResultado = construirResultadoFallido(codigoHttp, duracionSegundos, 'Cuerpo de respuesta no es JSON válido.', intento, requestId);
      if (esErrorTemporalHttp(codigoHttp) && intento < MAX_INTENTOS_IA) continue;
      break;
    }

    if (codigoHttp !== 200) {
      var mensajeError = (cuerpoRespuesta.error && cuerpoRespuesta.error.message) || 'HTTP ' + codigoHttp;
      ultimoResultado = construirResultadoFallido(codigoHttp, duracionSegundos, mensajeError, intento, requestId);
      // 429 y 5xx: reintentar. El resto (400, 401, 403, 404...) son
      // definitivos: no tiene sentido reintentar una API key inválida o un
      // payload rechazado.
      if (esErrorTemporalHttp(codigoHttp) && intento < MAX_INTENTOS_IA) continue;
      break;
    }

    if (!cuerpoRespuesta.choices || cuerpoRespuesta.choices.length === 0) {
      ultimoResultado = construirResultadoFallido(codigoHttp, duracionSegundos, 'Respuesta HTTP 200 sin choices.', intento, requestId);
      break; // No reintentable: la API respondió OK pero sin contenido.
    }

    var choice = cuerpoRespuesta.choices[0];

    // Controlar rechazo del modelo (Structured Outputs puede devolver un
    // "refusal" en lugar de contenido cuando el modelo se niega a responder).
    if (choice.message && choice.message.refusal) {
      return {
        exito: false,
        rechazoModelo: choice.message.refusal,
        codigoHttp: codigoHttp,
        duracionSegundos: duracionSegundos,
        requestId: requestId,
        intentos: intento,
        tokensEntrada: cuerpoRespuesta.usage ? cuerpoRespuesta.usage.prompt_tokens : null,
        tokensSalida: cuerpoRespuesta.usage ? cuerpoRespuesta.usage.completion_tokens : null
      };
    }

    // Controlar JSON incompleto por corte de longitud máxima de tokens.
    var truncada = choice.finish_reason === 'length';

    var tokensEntrada = cuerpoRespuesta.usage ? cuerpoRespuesta.usage.prompt_tokens : null;
    var tokensSalida = cuerpoRespuesta.usage ? cuerpoRespuesta.usage.completion_tokens : null;

    return {
      exito: true,
      truncada: truncada,
      codigoHttp: codigoHttp,
      duracionSegundos: duracionSegundos,
      requestId: requestId,
      intentos: intento,
      contenidoCrudo: choice.message.content,
      tokensEntrada: tokensEntrada,
      tokensSalida: tokensSalida,
      costoEstimado: calcularCostoEstimado(cfg.openaiModel, tokensEntrada, tokensSalida)
    };
  }

  // Se agotaron los reintentos (o el error no era reintentable): el llamador
  // (procesarUnMensaje → validarRespuestaIA) tratará esto como respuesta
  // inválida y derivará a Revisión manual/Error de procesamiento, sin volver
  // a llamar a la IA en esta misma ejecución (política "no reintentar
  // indefinidamente").
  return ultimoResultado;
}

function construirResultadoFallido(codigoHttp, duracionSegundos, error, intento, requestId) {
  return {
    exito: false,
    codigoHttp: codigoHttp,
    duracionSegundos: duracionSegundos,
    error: error,
    intentos: intento,
    requestId: requestId || null,
    tokensEntrada: null,
    tokensSalida: null
  };
}

/**
 * Costo estimado en USD para el campo costo_estimado de Log Mensajes.
 * PENDIENTE: mantener TARIFAS_OPENAI_USD_POR_1K_TOKENS actualizada; si el
 * modelo configurado no está en la tabla, se registra null (no se inventa
 * un costo) y se deja constancia en el log de ejecución.
 */
function calcularCostoEstimado(modelo, tokensEntrada, tokensSalida) {
  var tarifa = TARIFAS_OPENAI_USD_POR_1K_TOKENS[modelo];
  if (!tarifa || tokensEntrada == null || tokensSalida == null) {
    if (!tarifa) Logger.log('calcularCostoEstimado(): sin tarifa registrada para el modelo "' + modelo + '".');
    return null;
  }
  return (tokensEntrada / 1000) * tarifa.entrada + (tokensSalida / 1000) * tarifa.salida;
}
