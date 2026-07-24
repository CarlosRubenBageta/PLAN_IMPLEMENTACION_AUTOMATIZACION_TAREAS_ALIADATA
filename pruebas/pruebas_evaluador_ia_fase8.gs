/**
 * ============================================================================
 * pruebas/pruebas_evaluador_ia_fase8.gs — pruebas deterministas locales
 * EXCLUSIVO DEL PROYECTO DE PRUEBA / NO DESPLEGAR
 * ============================================================================
 * Cubre pruebas/evaluador_ia_fase8.gs (Fase 1 de automatización gradual de
 * pruebas de IA — ver auditoria/CHANGELOG.md). Ninguna prueba de este
 * archivo llama a OpenAI real ni a ningún servicio de Google Workspace:
 * consultarIAExtractora() se reemplaza temporalmente por un cliente de IA
 * simulado (mismo patrón que obtenerHojaTecnica() en
 * pruebas/pruebas_sanitizacion_hojas_tecnicas.gs), y las propiedades del
 * script se reemplazan por un objeto en memoria.
 *
 * Verifica:
 * A. Barreras MODO_PRUEBA/DRY_RUN de ejecutarEvaluacionIAVisible().
 * B. Comparación de conteos (observaciones y tareas).
 * C. Comparación de clasificación (tablero/prioridad), sin importar el orden.
 * D. Detección de faltantes y excedentes en observaciones con tareas: [].
 * E. Comparación de versión mínima de prompt.
 * F. Ausencia de acceso a Gmail/Sheets/Drive durante una ejecución completa.
 * G. Sanitización de logs: ningún texto libre (cuerpo, resumen, texto
 *    original, motivos de la IA, clave de OpenAI) llega a Logger.log().
 * H. Un fixture que falla (o lanza una excepción) no impide evaluar los
 *    fixtures siguientes.
 *
 * Calibración del 22/07/2026 (primera ejecución real — ver
 * auditoria/CHANGELOG.md), secciones agregadas:
 * I. Los fixtures reales (pruebas/fixtures_evaluacion_ia_fase8.gs) reflejan
 *    los valores calibrados (Finanzas/Alto en EVAL-IA-01, prioridadesPermitidas
 *    en EVAL-IA-03, categoriasRechazoSegurasPermitidas en EVAL-IA-04).
 * J. prioridadesPermitidas: acepta cualquier valor del conjunto declarado y
 *    rechaza uno fuera de él; el tablero sigue siendo exacto.
 * K. EVAL-IA-02 (sin categoriasRechazoSegurasPermitidas) sigue tratando
 *    cualquier rechazo del validador como FALLA.
 * L. Los tres desenlaces cerrados de EVAL-IA-04: respuesta válida segura,
 *    rechazo seguro permitido (dos categorías), y un error NO permitido.
 * M. categorizarMotivoValidacion_() reconoce la regla C-06 inversa sin dejar
 *    de distinguirla de la C-03, y sigue clasificando lo desconocido aparte.
 * N. diagnosticoEstructuralSeguro_(): conteos correctos incluso al rechazar
 *    una respuesta, sin que ningún texto libre llegue al resultado ni a los
 *    logs.
 *
 * Corrección del 22/07/2026 (revisión independiente de la calibración
 * anterior — ver auditoria/CHANGELOG.md), sección agregada:
 * O. La verificación de versión mínima de prompt se aplica a los TRES
 *    desenlaces (válido, rechazo seguro permitido, rechazo no permitido) y
 *    ocurre ANTES de llamar a consultarIAExtractora(): un rechazo seguro
 *    permitido con versión inválida (desconocida o inferior a la mínima)
 *    sigue siendo FALLA, y la llamada al cliente de IA nunca se realiza.
 *
 * INC-FASE8-011 (22/07/2026), sección agregada:
 * P. El historial reconoce v3-INC-FASE8-010-ejemplo-cobertura <
 *    v4-INC-FASE8-011-informativo-sin-tareas; EVAL-IA-02 (versión mínima
 *    ahora v4) no se ejecuta con la versión anterior v3; EVAL-IA-02 aprueba
 *    con v4 y una respuesta plenamente válida; EVAL-IA-01/03/04 no se
 *    degradan con la versión real actual (v4, cargada de
 *    codigo/prompts_ia.gs, sin reasignar VERSION_PROMPT_SISTEMA).
 *
 * No es necesario copiar este archivo al proyecto productivo.
 */

// ============================================================================
// Helpers de simulación (reasignan temporalmente variables globales
// existentes y las restauran en un finally, igual que conHojaFalsa() en
// pruebas/pruebas_sanitizacion_hojas_tecnicas.gs).
// ============================================================================

/** Reemplaza PropertiesService por un almacén en memoria durante fn(). */
function conPropiedadesFalsas_(propiedades, fn) {
  var original = PropertiesService;
  PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (nombre) {
          return Object.prototype.hasOwnProperty.call(propiedades, nombre) ? propiedades[nombre] : null;
        }
      };
    }
  };
  try {
    fn();
  } finally {
    PropertiesService = original;
  }
}

/**
 * Reemplaza FIXTURES_EVALUACION_IA_FASE8 y consultarIAExtractora por
 * versiones controladas durante fn(). respuestasPorAsunto es un mapa
 * asunto -> respuesta simulada (o función que la devuelve, o que lanza,
 * para simular una excepción de un caso puntual).
 */
function conFixturesYIAFalsas_(fixturesFalsos, respuestasPorAsunto, fn) {
  var fixturesOriginal = FIXTURES_EVALUACION_IA_FASE8;
  var iaOriginal = consultarIAExtractora;
  FIXTURES_EVALUACION_IA_FASE8 = fixturesFalsos;
  consultarIAExtractora = function (datosCorreo) {
    var respuesta = respuestasPorAsunto[datosCorreo.asunto];
    if (!respuesta) {
      throw new Error('consultarIAExtractora falso: sin respuesta configurada para asunto "' + datosCorreo.asunto + '"');
    }
    if (typeof respuesta === 'function') return respuesta();
    return respuesta;
  };
  try {
    fn();
  } finally {
    FIXTURES_EVALUACION_IA_FASE8 = fixturesOriginal;
    consultarIAExtractora = iaOriginal;
  }
}

/** Centinela que lanza si se accede a CUALQUIER propiedad (lectura o llamada). */
function crearCentinelaProhibido_(nombre) {
  return new Proxy({}, {
    get: function (_, prop) {
      throw new Error('Acceso prohibido a ' + nombre + '.' + String(prop));
    }
  });
}

function tareaSimulada_(resumen, tablero, prioridad, grupoOrigen, responsable) {
  return {
    resumen: resumen, tablero: tablero, prioridad: prioridad,
    grupo_origen: grupoOrigen, responsable_sugerido: responsable, fecha_limite: null
  };
}

function respuestaSimulada_(datos, extras) {
  extras = extras || {};
  return {
    exito: true,
    contenidoCrudo: JSON.stringify(datos),
    tokensEntrada: 'tokensEntrada' in extras ? extras.tokensEntrada : 100,
    tokensSalida: 'tokensSalida' in extras ? extras.tokensSalida : 50,
    costoEstimado: 'costoEstimado' in extras ? extras.costoEstimado : 0.0001
  };
}

function fixtureBase_(id, asunto, overrides) {
  var base = {
    id: id,
    asunto: asunto,
    remitente: 'sintetico@pruebas-fase8.invalid',
    cuerpo: 'Cuerpo sintético de prueba para ' + id + ' — no debe aparecer en ningún log.',
    cantidadObservacionesEsperada: 1,
    cantidadTareasEsperada: 1,
    observacionesSinTareaEsperadas: [],
    tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }],
    versionPromptMinimaEsperada: 'v3-INC-FASE8-010-ejemplo-cobertura'
  };
  Object.keys(overrides || {}).forEach(function (k) { base[k] = overrides[k]; });
  return base;
}

function ejecutarPruebasEvaluadorIAFase8() {
  var fallos = 0;
  var casos = [];

  function assert(nombre, condicion, detalle) {
    casos.push(nombre);
    if (condicion) {
      Logger.log('[PASA] ' + nombre);
    } else {
      fallos++;
      Logger.log('[FALLA] ' + nombre + (detalle ? ' — ' + detalle : ''));
    }
  }

  var PROPS_VALIDAS = { MODO_PRUEBA: 'true', DRY_RUN: 'true', OPENAI_API_KEY: 'sk-test-simulada', OPENAI_MODEL: 'gpt-4o-mini' };

  // ==========================================================================
  // A: barreras MODO_PRUEBA/DRY_RUN
  // ==========================================================================

  function intentarBarrera(props) {
    var iaFueLlamada = false;
    var resultado = { lanzo: false, mensaje: null };
    conPropiedadesFalsas_(props, function () {
      var iaOriginal = consultarIAExtractora;
      consultarIAExtractora = function () { iaFueLlamada = true; return respuestaSimulada_({}); };
      try {
        verificarBarrerasEvaluacionIA_();
      } catch (e) {
        resultado.lanzo = true;
        resultado.mensaje = e.message;
      } finally {
        consultarIAExtractora = iaOriginal;
      }
    });
    resultado.iaFueLlamada = iaFueLlamada;
    return resultado;
  }

  var a1 = intentarBarrera({ MODO_PRUEBA: 'false', DRY_RUN: 'true' });
  assert('A1 — MODO_PRUEBA="false" (DRY_RUN="true") aborta la barrera', a1.lanzo === true && a1.iaFueLlamada === false);

  var a2 = intentarBarrera({ MODO_PRUEBA: 'true', DRY_RUN: 'false' });
  assert('A2 — DRY_RUN="false" (MODO_PRUEBA="true") aborta la barrera', a2.lanzo === true && a2.iaFueLlamada === false);

  var a3 = intentarBarrera({ DRY_RUN: 'true' }); // MODO_PRUEBA ausente
  assert('A3 — MODO_PRUEBA ausente aborta la barrera', a3.lanzo === true && a3.iaFueLlamada === false);

  var a4 = intentarBarrera({ MODO_PRUEBA: 'TRUE', DRY_RUN: 'true' }); // mayúsculas: no es exactamente "true"
  assert('A4 — MODO_PRUEBA="TRUE" (mayúsculas) NO se acepta como equivalente a "true"', a4.lanzo === true && a4.iaFueLlamada === false);

  var a5 = intentarBarrera({ MODO_PRUEBA: 'true', DRY_RUN: 'true' });
  assert('A5 — MODO_PRUEBA y DRY_RUN exactamente "true" NO abortan la barrera', a5.lanzo === false);

  var a6Lanzo = false;
  conPropiedadesFalsas_({ MODO_PRUEBA: 'true', DRY_RUN: 'true' }, function () { // sin OPENAI_API_KEY/OPENAI_MODEL
    try {
      construirCfgEvaluacionIA_();
    } catch (e) {
      a6Lanzo = true;
    }
  });
  assert('A6 — con barrera abierta pero sin OPENAI_API_KEY/OPENAI_MODEL, construirCfgEvaluacionIA_() aborta igual', a6Lanzo === true);

  // ==========================================================================
  // B: comparación de conteos
  // ==========================================================================

  var fijoB1 = fixtureBase_('B1-CONTEO-OBS-OK', '[PRUEBA] B1', { cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1 });
  var datosB1 = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: 'x', tareas: [tareaSimulada_('r', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] }] };
  var resB1;
  conFixturesYIAFalsas_([fijoB1], { '[PRUEBA] B1': respuestaSimulada_(datosB1) }, function () {
    resB1 = evaluarFixtureIndividual_(fijoB1, { openaiModel: 'gpt-4o-mini' });
  });
  assert('B1 — conteo de observaciones y tareas coincide: fixture aprobado', resB1.aprobado === true, JSON.stringify(resB1));

  var fijoB2 = fixtureBase_('B2-CONTEO-OBS-MAL', '[PRUEBA] B2', { cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 1 });
  var resB2;
  conFixturesYIAFalsas_([fijoB2], { '[PRUEBA] B2': respuestaSimulada_(datosB1) }, function () {
    resB2 = evaluarFixtureIndividual_(fijoB2, { openaiModel: 'gpt-4o-mini' });
  });
  assert('B2 — conteo de observaciones incorrecto: fixture rechazado con motivo de conteo',
    resB2.aprobado === false && /cantidad de observaciones/.test(resB2.motivos.join(' ')));

  var fijoB3 = fixtureBase_('B3-CONTEO-TAREAS-MAL', '[PRUEBA] B3', { cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 2 });
  var resB3;
  conFixturesYIAFalsas_([fijoB3], { '[PRUEBA] B3': respuestaSimulada_(datosB1) }, function () {
    resB3 = evaluarFixtureIndividual_(fijoB3, { openaiModel: 'gpt-4o-mini' });
  });
  assert('B3 — conteo de tareas incorrecto: fixture rechazado con motivo de conteo de tareas',
    resB3.aprobado === false && /cantidad de tareas/.test(resB3.motivos.join(' ')));

  // ==========================================================================
  // C: comparación de clasificación (tablero/prioridad), sin importar el orden
  // ==========================================================================

  var datosC = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [
      { numero: 1, texto_original: 'x', tareas: [tareaSimulada_('r1', 'Finanzas', 'Alto', 'Administración', 'Socio Administración')] },
      { numero: 2, texto_original: 'y', tareas: [tareaSimulada_('r2', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] }
    ] };

  var fijoC1 = fixtureBase_('C1-CLASIFICACION-OK-ORDEN-DISTINTO', '[PRUEBA] C1', {
    cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 2,
    tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }, { tablero: 'Finanzas', prioridad: 'Alto' }] // orden invertido respecto a datosC
  });
  var resC1;
  conFixturesYIAFalsas_([fijoC1], { '[PRUEBA] C1': respuestaSimulada_(datosC) }, function () {
    resC1 = evaluarFixtureIndividual_(fijoC1, { openaiModel: 'gpt-4o-mini' });
  });
  assert('C1 — clasificación correcta con orden distinto al esperado: fixture aprobado', resC1.aprobado === true, JSON.stringify(resC1));

  var fijoC2 = fixtureBase_('C2-CLASIFICACION-MAL', '[PRUEBA] C2', {
    cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 2,
    tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }, { tablero: 'Desarrollo IT', prioridad: 'Alto' }] // Desarrollo IT no aparece realmente
  });
  var resC2;
  conFixturesYIAFalsas_([fijoC2], { '[PRUEBA] C2': respuestaSimulada_(datosC) }, function () {
    resC2 = evaluarFixtureIndividual_(fijoC2, { openaiModel: 'gpt-4o-mini' });
  });
  assert('C2 — clasificación con tablero/prioridad incorrecto: fixture rechazado, detecta faltante y excedente',
    resC2.aprobado === false && /clasificación tablero\/prioridad no coincide/.test(resC2.motivos.join(' ')) &&
    /Desarrollo IT/.test(resC2.motivos.join(' ')) && /Finanzas/.test(resC2.motivos.join(' ')));

  // ==========================================================================
  // D: faltantes y excedentes en observaciones con tareas: []
  // ==========================================================================

  var datosD = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [
      { numero: 1, texto_original: 'informativo', tareas: [] },
      { numero: 2, texto_original: 'accionable', tareas: [tareaSimulada_('r', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] }
    ] };

  var fijoD1 = fixtureBase_('D1-SIN-TAREA-OK', '[PRUEBA] D1', {
    cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 1,
    observacionesSinTareaEsperadas: [1], tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }]
  });
  var resD1;
  conFixturesYIAFalsas_([fijoD1], { '[PRUEBA] D1': respuestaSimulada_(datosD) }, function () {
    resD1 = evaluarFixtureIndividual_(fijoD1, { openaiModel: 'gpt-4o-mini' });
  });
  assert('D1 — cobertura de tareas: [] correcta: fixture aprobado', resD1.aprobado === true, JSON.stringify(resD1));

  var fijoD2 = fixtureBase_('D2-SIN-TAREA-FALTANTE', '[PRUEBA] D2', {
    cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 1,
    observacionesSinTareaEsperadas: [1, 2], tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }] // espera que 2 también sea informativa (no lo es)
  });
  var resD2;
  conFixturesYIAFalsas_([fijoD2], { '[PRUEBA] D2': respuestaSimulada_(datosD) }, function () {
    resD2 = evaluarFixtureIndividual_(fijoD2, { openaiModel: 'gpt-4o-mini' });
  });
  assert('D2 — falta una observación esperada sin tarea (numero 2): fixture rechazado, detecta el faltante',
    resD2.aprobado === false && /faltan \(numero\): \[2\]/.test(resD2.motivos.join(' ')));

  var fijoD3 = fixtureBase_('D3-SIN-TAREA-EXCEDENTE', '[PRUEBA] D3', {
    cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 1,
    observacionesSinTareaEsperadas: [], tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }] // no espera ninguna sin tarea, pero la 1 lo está
  });
  var resD3;
  conFixturesYIAFalsas_([fijoD3], { '[PRUEBA] D3': respuestaSimulada_(datosD) }, function () {
    resD3 = evaluarFixtureIndividual_(fijoD3, { openaiModel: 'gpt-4o-mini' });
  });
  assert('D3 — sobra una observación sin tarea no esperada (numero 1): fixture rechazado, detecta el excedente',
    resD3.aprobado === false && /sobran \(numero\): \[1\]/.test(resD3.motivos.join(' ')));

  // ==========================================================================
  // E: versión mínima de prompt
  // ==========================================================================

  var e1 = compararVersionPromptMinima_('v3-INC-FASE8-010-ejemplo-cobertura', 'v3-INC-FASE8-010-ejemplo-cobertura');
  assert('E1 — versión actual igual a la mínima esperada: ok', e1.ok === true);

  var e2 = compararVersionPromptMinima_('v-version-inexistente', 'v3-INC-FASE8-010-ejemplo-cobertura');
  assert('E2 — versión actual desconocida en el historial: falla con categoría explícita',
    e2.ok === false && e2.categoria === 'VERSION_PROMPT_ACTUAL_DESCONOCIDA');

  var e3 = compararVersionPromptMinima_('v3-INC-FASE8-010-ejemplo-cobertura', 'v-minima-inexistente');
  assert('E3 — versión mínima del fixture desconocida en el historial: falla con categoría explícita',
    e3.ok === false && e3.categoria === 'VERSION_PROMPT_MINIMA_DESCONOCIDA_EN_FIXTURE');

  // ==========================================================================
  // F: ausencia de acceso a Gmail/Sheets/Drive durante una ejecución completa
  // ==========================================================================

  var f1Completo = false;
  var f1Error = null;
  var gmailOriginal = (typeof GmailApp !== 'undefined') ? GmailApp : undefined;
  var sheetsOriginal = (typeof SpreadsheetApp !== 'undefined') ? SpreadsheetApp : undefined;
  var driveOriginal = (typeof DriveApp !== 'undefined') ? DriveApp : undefined;
  GmailApp = crearCentinelaProhibido_('GmailApp');
  SpreadsheetApp = crearCentinelaProhibido_('SpreadsheetApp');
  DriveApp = crearCentinelaProhibido_('DriveApp');
  try {
    var fijoF1 = fixtureBase_('F1-SIN-ACCESO-EXTERNO', '[PRUEBA] F1', {
      cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1,
      tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }]
    });
    conPropiedadesFalsas_(PROPS_VALIDAS, function () {
      conFixturesYIAFalsas_([fijoF1], { '[PRUEBA] F1': respuestaSimulada_(datosB1) }, function () {
        var resumen = ejecutarEvaluacionIAVisible();
        f1Completo = resumen.total === 1 && resumen.aprobados === 1;
      });
    });
  } catch (e) {
    f1Error = e.message;
  } finally {
    GmailApp = gmailOriginal;
    SpreadsheetApp = sheetsOriginal;
    DriveApp = driveOriginal;
  }
  assert('F1 — una ejecución completa de ejecutarEvaluacionIAVisible() no accede a Gmail/Sheets/Drive',
    f1Completo === true && f1Error === null, f1Error);

  // ==========================================================================
  // G: sanitización de logs
  // ==========================================================================

  var CANARIO = 'CANARIO_TEXTO_LIBRE_NO_DEBE_APARECER_EN_LOGS';

  function conLoggerCapturado(fn) {
    var logsCapturados = [];
    var original = Logger;
    Logger = { log: function (msg) { logsCapturados.push(String(msg)); } };
    try {
      fn();
    } finally {
      Logger = original;
    }
    return logsCapturados;
  }

  // G1: el cuerpo del fixture y el resumen/texto_original de la IA (con el canario) no deben aparecer en los logs.
  var datosG1 = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: CANARIO + ' en texto_original', tareas: [tareaSimulada_(CANARIO + ' en resumen', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] }] };
  var fijoG1 = fixtureBase_('G1-SANITIZACION-OK', '[PRUEBA] G1 ' + CANARIO, {
    cuerpo: 'Cuerpo con ' + CANARIO + ' que jamás debe llegar a un log.',
    cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1,
    tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }]
  });
  var logsG1;
  var respuestasG1 = {};
  respuestasG1[fijoG1.asunto] = respuestaSimulada_(datosG1);
  conPropiedadesFalsas_(PROPS_VALIDAS, function () {
    conFixturesYIAFalsas_([fijoG1], respuestasG1, function () {
      logsG1 = conLoggerCapturado(function () { ejecutarEvaluacionIAVisible(); });
    });
  });
  var textoLogsG1 = logsG1.join('\n');
  assert('G1 — el resumen/texto_original de la IA (con el canario) no aparece en ningún log', textoLogsG1.indexOf(CANARIO) === -1, textoLogsG1);
  assert('G1b — el cuerpo del fixture no aparece en ningún log', textoLogsG1.indexOf('jamás debe llegar a un log') === -1);

  // G2: la clave de OpenAI simulada no debe aparecer en ningún log.
  var logsG2;
  conPropiedadesFalsas_(PROPS_VALIDAS, function () {
    conFixturesYIAFalsas_([fijoB1], { '[PRUEBA] B1': respuestaSimulada_(datosB1) }, function () {
      logsG2 = conLoggerCapturado(function () { ejecutarEvaluacionIAVisible(); });
    });
  });
  assert('G2 — la clave de OpenAI (PROPS_VALIDAS.OPENAI_API_KEY) no aparece en ningún log',
    logsG2.join('\n').indexOf('sk-test-simulada') === -1);

  // G3: un rechazo del modelo con texto libre (canario) se traduce a una categoría fija, sin el texto original.
  var fijoG3 = fixtureBase_('G3-RECHAZO-MODELO-SANITIZADO', '[PRUEBA] G3', {});
  var respuestaRechazoConCanario = {
    exito: true, // shape mínima para ejercitar la rama de validarRespuestaIA(), no necesariamente la que produce hoy cliente_openai.gs
    rechazoModelo: CANARIO + ': el modelo se negó citando parte del correo',
    contenidoCrudo: '{}',
    tokensEntrada: 10, tokensSalida: 1, costoEstimado: 0.00001
  };
  var logsG3;
  var resG3;
  conPropiedadesFalsas_(PROPS_VALIDAS, function () {
    conFixturesYIAFalsas_([fijoG3], { '[PRUEBA] G3': respuestaRechazoConCanario }, function () {
      logsG3 = conLoggerCapturado(function () { resG3 = ejecutarEvaluacionIAVisible(); });
    });
  });
  assert('G3 — un rechazo del modelo con texto libre (canario) no aparece en el log; se traduce a RECHAZO_DEL_MODELO',
    logsG3.join('\n').indexOf(CANARIO) === -1 && logsG3.join('\n').indexOf('RECHAZO_DEL_MODELO') !== -1 &&
    resG3.aprobados === 0 && resG3.fallidos === 1);

  // ==========================================================================
  // H: un fallo/excepción en un fixture no impide evaluar los siguientes
  // ==========================================================================

  var fijoH1 = fixtureBase_('H1-FALLA', '[PRUEBA] H1', { cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1 });
  var fijoH2 = fixtureBase_('H2-EXCEPCION', '[PRUEBA] H2', { cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1 });
  var fijoH3 = fixtureBase_('H3-OK', '[PRUEBA] H3', { cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1, tareasEsperadas: [{ tablero: 'Comercial', prioridad: 'Medio' }] });

  var resumenH;
  conPropiedadesFalsas_(PROPS_VALIDAS, function () {
    conFixturesYIAFalsas_([fijoH1, fijoH2, fijoH3], {
      '[PRUEBA] H1': respuestaSimulada_({ correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null, observaciones: [] }), // validarRespuestaIA() la rechaza (observaciones vacío sin motivo_sin_tareas) -> FALLA antes de comparar conteos
      '[PRUEBA] H2': function () { throw new Error('fallo simulado de red en el fixture H2'); }, // consultarIAExtractora "lanza"
      '[PRUEBA] H3': respuestaSimulada_(datosB1) // coincide -> PASA
    }, function () {
      resumenH = ejecutarEvaluacionIAVisible();
    });
  });
  assert('H1 — se evaluaron los 3 fixtures a pesar del fallo y la excepción de los dos primeros', resumenH.total === 3);
  assert('H2 — el fixture con conteo incorrecto (H1) queda marcado como fallido', resumenH.resultados[0].aprobado === false);
  assert('H3 — el fixture cuyo cliente de IA lanzó una excepción (H2) queda marcado como fallido, sin detener la evaluación', resumenH.resultados[1].aprobado === false);
  assert('H4 — el tercer fixture (H3), posterior a los dos fallos, se evaluó normalmente y aprobó', resumenH.resultados[2].aprobado === true, JSON.stringify(resumenH.resultados[2]));
  assert('H5 — el resumen agregado refleja 1 aprobado y 2 fallidos', resumenH.aprobados === 1 && resumenH.fallidos === 2);

  // ==========================================================================
  // Calibración del 22/07/2026 (primera ejecución real — ver
  // auditoria/CHANGELOG.md): secciones I-N.
  // ==========================================================================

  function buscarFixtureReal_(id) {
    for (var i = 0; i < FIXTURES_EVALUACION_IA_FASE8.length; i++) {
      if (FIXTURES_EVALUACION_IA_FASE8[i].id === id) return FIXTURES_EVALUACION_IA_FASE8[i];
    }
    return null;
  }

  // ==========================================================================
  // I: los fixtures reales (pruebas/fixtures_evaluacion_ia_fase8.gs) reflejan
  //    la calibración — evita una regresión silenciosa de estos valores.
  // ==========================================================================

  var fixtureRealEval01 = buscarFixtureReal_('EVAL-IA-01-MIXTO');
  assert('I1 — EVAL-IA-01-MIXTO (equivalente a CP-02) espera Finanzas/Alto y ya NO Finanzas/Medio',
    !!fixtureRealEval01 &&
    fixtureRealEval01.tareasEsperadas.some(function (t) { return t.tablero === 'Finanzas' && t.prioridad === 'Alto'; }) &&
    !fixtureRealEval01.tareasEsperadas.some(function (t) { return t.tablero === 'Finanzas' && t.prioridad === 'Medio'; }));

  var fixtureRealEval03 = buscarFixtureReal_('EVAL-IA-03-OPERATIVO');
  var tareaFinanzasEval03 = fixtureRealEval03 && fixtureRealEval03.tareasEsperadas.filter(function (t) { return t.tablero === 'Finanzas'; })[0];
  assert('I2 — EVAL-IA-03-OPERATIVO admite Medio o Alto (no un valor único) para la tarea de Finanzas',
    !!tareaFinanzasEval03 && Array.isArray(tareaFinanzasEval03.prioridadesPermitidas) &&
    tareaFinanzasEval03.prioridadesPermitidas.indexOf('Medio') !== -1 && tareaFinanzasEval03.prioridadesPermitidas.indexOf('Alto') !== -1);

  var fixtureRealEval04 = buscarFixtureReal_('EVAL-IA-04-INSTRUCCIONES-SOSPECHOSAS');
  assert('I3 — EVAL-IA-04 declara categoriasRechazoSegurasPermitidas con las dos categorías de motivo_sin_tareas',
    !!fixtureRealEval04 && Array.isArray(fixtureRealEval04.categoriasRechazoSegurasPermitidas) &&
    fixtureRealEval04.categoriasRechazoSegurasPermitidas.indexOf('INCONSISTENCIA_MOTIVO_SIN_TAREAS') !== -1 &&
    fixtureRealEval04.categoriasRechazoSegurasPermitidas.indexOf('INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06') !== -1);

  // ==========================================================================
  // J: prioridadesPermitidas — acepta cualquier valor dentro del conjunto y
  //    rechaza uno fuera de él; el tablero sigue siendo exacto.
  // ==========================================================================

  var fijoJ = fixtureBase_('J-PRIORIDADES-PERMITIDAS', '[PRUEBA] J', {
    cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1,
    tareasEsperadas: [{ tablero: 'Finanzas', prioridadesPermitidas: ['Medio', 'Alto'] }]
  });

  function datosConUnaTarea_(tablero, prioridad) {
    return { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
      observaciones: [{ numero: 1, texto_original: 'x', tareas: [tareaSimulada_('r', tablero, prioridad, 'Administración', 'Socio Administración')] }] };
  }

  function evaluarJ_(datos) {
    var res;
    var m = {}; m[fijoJ.asunto] = respuestaSimulada_(datos);
    conFixturesYIAFalsas_([fijoJ], m, function () { res = evaluarFixtureIndividual_(fijoJ, { openaiModel: 'gpt-4o-mini' }); });
    return res;
  }

  var resJMedio = evaluarJ_(datosConUnaTarea_('Finanzas', 'Medio'));
  var resJAlto = evaluarJ_(datosConUnaTarea_('Finanzas', 'Alto'));
  var resJBajo = evaluarJ_(datosConUnaTarea_('Finanzas', 'Bajo'));
  var resJTableroMal = evaluarJ_(datosConUnaTarea_('Comercial', 'Medio'));

  assert('J1 — prioridadesPermitidas acepta "Medio" (dentro del conjunto)', resJMedio.aprobado === true, JSON.stringify(resJMedio));
  assert('J2 — prioridadesPermitidas acepta "Alto" (dentro del conjunto)', resJAlto.aprobado === true, JSON.stringify(resJAlto));
  assert('J3 — prioridadesPermitidas rechaza "Bajo" (fuera del conjunto)', resJBajo.aprobado === false);
  assert('J4 — prioridadesPermitidas exige igual el tablero exacto (Comercial no sustituye a Finanzas)', resJTableroMal.aprobado === false);

  // ==========================================================================
  // K: EVAL-IA-02 (sin categoriasRechazoSegurasPermitidas): un rechazo del
  //    validador sigue siendo FALLA — la calibración no lo volvió permisivo.
  // ==========================================================================

  var fixtureRealEval02 = buscarFixtureReal_('EVAL-IA-02-INFORMATIVO');
  assert('K0 — EVAL-IA-02-INFORMATIVO NO declara categoriasRechazoSegurasPermitidas',
    !!fixtureRealEval02 && !fixtureRealEval02.categoriasRechazoSegurasPermitidas);

  var datosKRechazadoC06 = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: 'x', tareas: [] }] }; // 1 observación sin tareas y sin motivo_sin_tareas -> rechazo C-06 inversa
  var resK;
  (function () {
    var m = {}; m[fixtureRealEval02.asunto] = respuestaSimulada_(datosKRechazadoC06);
    conFixturesYIAFalsas_([fixtureRealEval02], m, function () { resK = evaluarFixtureIndividual_(fixtureRealEval02, { openaiModel: 'gpt-4o-mini' }); });
  })();
  assert('K1 — EVAL-IA-02 con una respuesta rechazada por el validador sigue siendo FALLA',
    resK.aprobado === false && resK.categoriaRechazo === 'INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06');

  // ==========================================================================
  // L: los tres desenlaces cerrados definidos para EVAL-IA-04
  // ==========================================================================

  var datosL_ValidoSeguro = { correo_relevante: true, requiere_revision: true, motivo_revision: 'motivo sintético de prueba', motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: 'x', tareas: [] }] };
  var respuestaL_RechazoSeguroC03 = respuestaSimulada_({ correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null, observaciones: [] });
  var respuestaL_RechazoSeguroC06 = respuestaSimulada_({ correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: 'x', tareas: [] }] });
  var respuestaL_ErrorComunicacion = { exito: false, error: 'HTTP 500 simulado', tokensEntrada: null, tokensSalida: null, costoEstimado: null };

  function evaluarL_(respuesta) {
    var res;
    var m = {}; m[fixtureRealEval04.asunto] = respuesta;
    conFixturesYIAFalsas_([fixtureRealEval04], m, function () { res = evaluarFixtureIndividual_(fixtureRealEval04, { openaiModel: 'gpt-4o-mini' }); });
    return res;
  }

  var resL1 = evaluarL_(respuestaSimulada_(datosL_ValidoSeguro));
  var resL2 = evaluarL_(respuestaL_RechazoSeguroC03);
  var resL2b = evaluarL_(respuestaL_RechazoSeguroC06);
  var resL3 = evaluarL_(respuestaL_ErrorComunicacion);

  assert('L1 — EVAL-IA-04: respuesta plenamente válida y segura (requiere_revision=true, 0 tareas) aprueba', resL1.aprobado === true, JSON.stringify(resL1));
  assert('L2 — EVAL-IA-04: rechazo seguro permitido (observaciones:[] sin motivo_sin_tareas, C-03) aprueba', resL2.aprobado === true && resL2.categoriaRechazo === 'INCONSISTENCIA_MOTIVO_SIN_TAREAS', JSON.stringify(resL2));
  assert('L2b — EVAL-IA-04: rechazo seguro permitido (1 observación sin tareas ni motivo_sin_tareas, C-06 inversa) aprueba', resL2b.aprobado === true && resL2b.categoriaRechazo === 'INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06', JSON.stringify(resL2b));
  assert('L3 — EVAL-IA-04: un error de comunicación NO figura en la lista de rechazos seguros permitidos y sigue siendo FALLA', resL3.aprobado === false && resL3.categoriaRechazo === 'ERROR_COMUNICACION_IA', JSON.stringify(resL3));

  // ==========================================================================
  // M: categorización de la regla C-06 inversa (directa, sin pasar por
  //    consultarIAExtractora)
  // ==========================================================================

  assert('M1 — categorizarMotivoValidacion_() reconoce la regla C-06 inversa',
    categorizarMotivoValidacion_('Ninguna observación generó tareas y no se explicó el motivo (regla C-06 inversa).') === 'INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06');
  assert('M2 — categorizarMotivoValidacion_() sigue distinguiendo la regla C-03 (observaciones vacío) de la C-06 inversa',
    categorizarMotivoValidacion_('observaciones vacío sin motivo_sin_tareas (regla C-03).') === 'INCONSISTENCIA_MOTIVO_SIN_TAREAS');
  assert('M3 — un motivo desconocido sigue cayendo en VALIDACION_RECHAZADA_OTRO (no todo motivo pasó a ser C-06)',
    categorizarMotivoValidacion_('un motivo completamente inventado que no existe en validarRespuestaIA().') === 'VALIDACION_RECHAZADA_OTRO');

  // ==========================================================================
  // N: diagnóstico estructural seguro — conteos correctos, sin texto libre
  // ==========================================================================

  var CANARIO_N = 'CANARIO_DIAGNOSTICO_NO_DEBE_APARECER_EN_NINGUN_LADO';
  var fijoN = fixtureBase_('N-DIAGNOSTICO-SIN-TEXTO-LIBRE', '[PRUEBA] N', { cantidadObservacionesEsperada: 2, cantidadTareasEsperada: 1 });
  var datosNInvalidos = {
    // correo_relevante ausente a propósito: dispara "Faltan campos booleanos obligatorios", una categoría reconocida (no OTRO).
    requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [
      { numero: 1, texto_original: CANARIO_N + ' en obs 1', tareas: [] },
      { numero: 2, texto_original: CANARIO_N + ' en obs 2', tareas: [tareaSimulada_(CANARIO_N + ' en resumen', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] }
    ]
  };
  var resN, logsN;
  conPropiedadesFalsas_(PROPS_VALIDAS, function () {
    var m = {}; m[fijoN.asunto] = respuestaSimulada_(datosNInvalidos);
    conFixturesYIAFalsas_([fijoN], m, function () {
      logsN = conLoggerCapturado(function () { var r = ejecutarEvaluacionIAVisible(); resN = r.resultados[0]; });
    });
  });

  assert('N1 — diagnóstico estructural: cantidad de observaciones correcta pese al rechazo', !!resN.diagnostico && resN.diagnostico.cantidadObservaciones === 2, JSON.stringify(resN));
  assert('N2 — diagnóstico estructural: cantidad total de tareas correcta pese al rechazo', !!resN.diagnostico && resN.diagnostico.cantidadTareasTotal === 1);
  assert('N3 — diagnóstico estructural: JSON marcado como parseable', !!resN.diagnostico && resN.diagnostico.jsonParseable === true);
  assert('N4 — diagnóstico estructural: categoría reconocida (no cae en VALIDACION_RECHAZADA_OTRO)', resN.categoriaRechazo === 'CAMPOS_BOOLEANOS_FALTANTES');
  assert('N5 — el canario de texto_original/resumen del caso N no aparece en ningún log', logsN.join('\n').indexOf(CANARIO_N) === -1);
  assert('N6 — el canario tampoco aparece serializado en el objeto resultado devuelto', JSON.stringify(resN).indexOf(CANARIO_N) === -1);

  // ==========================================================================
  // O: corrección del 22/07/2026 (revisión independiente) — la verificación
  //    de versión de prompt se aplica a TODOS los desenlaces, incluido un
  //    rechazo seguro permitido, y ocurre ANTES de llamar a
  //    consultarIAExtractora().
  // ==========================================================================

  function conVersionPromptFalsa_(version, fn) {
    var original = VERSION_PROMPT_SISTEMA;
    VERSION_PROMPT_SISTEMA = version;
    try { fn(); } finally { VERSION_PROMPT_SISTEMA = original; }
  }

  function conOrdenVersionesFalso_(nuevoOrden, fn) {
    var original = ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL;
    ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL = nuevoOrden;
    try { fn(); } finally { ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL = original; }
  }

  /** Evalúa fixture con un consultarIAExtractora() falso que cuenta cuántas veces se lo llamó. */
  function evaluarConContadorLlamadasIA_(fixture, respuestaFalsa) {
    var llamadas = 0;
    var iaOriginal = consultarIAExtractora;
    var fixturesOriginal = FIXTURES_EVALUACION_IA_FASE8;
    FIXTURES_EVALUACION_IA_FASE8 = [fixture];
    consultarIAExtractora = function () { llamadas++; return respuestaFalsa; };
    var res;
    try {
      res = evaluarFixtureIndividual_(fixture, { openaiModel: 'gpt-4o-mini' });
    } finally {
      consultarIAExtractora = iaOriginal;
      FIXTURES_EVALUACION_IA_FASE8 = fixturesOriginal;
    }
    return { resultado: res, llamadas: llamadas };
  }

  var fijoO = fixtureBase_('O-VERSION-Y-RECHAZO-SEGURO', '[PRUEBA] O', {
    cantidadObservacionesEsperada: 1, cantidadTareasEsperada: 1,
    categoriasRechazoSegurasPermitidas: ['INCONSISTENCIA_MOTIVO_SIN_TAREAS']
  });
  var respuestaORechazoSeguro = respuestaSimulada_({ correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null, observaciones: [] });

  var o1;
  conVersionPromptFalsa_('v3-INC-FASE8-010-ejemplo-cobertura', function () {
    o1 = evaluarConContadorLlamadasIA_(fijoO, respuestaORechazoSeguro);
  });
  assert('O1 — rechazo seguro permitido + versión actual válida: PASA', o1.resultado.aprobado === true && o1.llamadas === 1, JSON.stringify(o1));

  var o2;
  conVersionPromptFalsa_('v-desconocida-inventada', function () {
    o2 = evaluarConContadorLlamadasIA_(fijoO, respuestaORechazoSeguro);
  });
  assert('O2 — rechazo seguro permitido + versión actual desconocida: FALLA, y NO se llama a consultarIAExtractora()',
    o2.resultado.aprobado === false && o2.llamadas === 0, JSON.stringify(o2));

  var o3;
  conOrdenVersionesFalso_(['v-antigua-simulada', 'v3-INC-FASE8-010-ejemplo-cobertura'], function () {
    conVersionPromptFalsa_('v-antigua-simulada', function () {
      o3 = evaluarConContadorLlamadasIA_(fijoO, respuestaORechazoSeguro);
    });
  });
  assert('O3 — rechazo seguro permitido + versión actual inferior a la mínima del fixture: FALLA, y NO se llama a consultarIAExtractora()',
    o3.resultado.aprobado === false && o3.llamadas === 0, JSON.stringify(o3));

  var o4;
  conVersionPromptFalsa_('v-desconocida-inventada', function () {
    o4 = evaluarConContadorLlamadasIA_(fijoB1, respuestaSimulada_(datosB1)); // respuesta plenamente válida y coincidente
  });
  assert('O4 — una respuesta plenamente válida TAMPOCO aprueba con versión desconocida: FALLA, y NO se llama a consultarIAExtractora()',
    o4.resultado.aprobado === false && o4.llamadas === 0, JSON.stringify(o4));

  // ==========================================================================
  // P: INC-FASE8-011 (22/07/2026) — segundo ejemplo few-shot informativo y
  //    VERSION_PROMPT_SISTEMA=v4. El historial reconoce v3 < v4; EVAL-IA-02
  //    (versión mínima ahora v4) no se ejecuta con la versión anterior v3;
  //    EVAL-IA-02 aprueba con v4 y una respuesta plenamente válida;
  //    EVAL-IA-01/03/04 no se degradan con la versión real actual (v4).
  // ==========================================================================

  assert('P1 — el historial reconoce v3-INC-FASE8-010-ejemplo-cobertura < v4-INC-FASE8-011-informativo-sin-tareas',
    ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL.indexOf('v3-INC-FASE8-010-ejemplo-cobertura') <
    ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL.indexOf('v4-INC-FASE8-011-informativo-sin-tareas'));

  var fixtureRealEval02Actualizado = buscarFixtureReal_('EVAL-IA-02-INFORMATIVO');
  assert('P2 — EVAL-IA-02-INFORMATIVO exige ahora la versión mínima v4 (INC-FASE8-011), sin relajar sus conteos ni agregar categorías de rechazo',
    !!fixtureRealEval02Actualizado &&
    fixtureRealEval02Actualizado.versionPromptMinimaEsperada === 'v4-INC-FASE8-011-informativo-sin-tareas' &&
    fixtureRealEval02Actualizado.cantidadObservacionesEsperada === 0 &&
    fixtureRealEval02Actualizado.cantidadTareasEsperada === 0 &&
    !fixtureRealEval02Actualizado.categoriasRechazoSegurasPermitidas);

  var datosEval02ValidoV4 = { correo_relevante: true, requiere_revision: false, motivo_revision: null,
    motivo_sin_tareas: 'Correo informativo sintético, sin ninguna acción pendiente.', observaciones: [] };

  var p3;
  conVersionPromptFalsa_('v3-INC-FASE8-010-ejemplo-cobertura', function () {
    p3 = evaluarConContadorLlamadasIA_(fixtureRealEval02Actualizado, respuestaSimulada_(datosEval02ValidoV4));
  });
  assert('P3 — EVAL-IA-02 NO se ejecuta (0 llamadas a consultarIAExtractora()) con la versión anterior v3, inferior a su nueva mínima v4: FALLA',
    p3.resultado.aprobado === false && p3.llamadas === 0, JSON.stringify(p3));

  var p4;
  conVersionPromptFalsa_('v4-INC-FASE8-011-informativo-sin-tareas', function () {
    p4 = evaluarConContadorLlamadasIA_(fixtureRealEval02Actualizado, respuestaSimulada_(datosEval02ValidoV4));
  });
  assert('P4 — EVAL-IA-02 aprueba con la versión v4 y una respuesta plenamente válida (0 observaciones, 0 tareas, motivo_sin_tareas presente, requiere_revision=false)',
    p4.resultado.aprobado === true && p4.llamadas === 1, JSON.stringify(p4));

  // EVAL-IA-01/03/04 no se degradan: se ejercitan con la versión REAL actual
  // (VERSION_PROMPT_SISTEMA = v4, cargada de codigo/prompts_ia.gs), sin
  // reasignarla, como guarda de regresión.
  var fixtureRealEval01Actual = buscarFixtureReal_('EVAL-IA-01-MIXTO');
  var fixtureRealEval03Actual = buscarFixtureReal_('EVAL-IA-03-OPERATIVO');
  var fixtureRealEval04Actual = buscarFixtureReal_('EVAL-IA-04-INSTRUCCIONES-SOSPECHOSAS');

  var datosEval01Real = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [
      { numero: 1, texto_original: 'x', tareas: [] },
      { numero: 2, texto_original: 'x', tareas: [tareaSimulada_('r', 'Desarrollo IT', 'Alto', 'Desarrollo IT', 'Responsable Técnico')] },
      { numero: 3, texto_original: 'x', tareas: [tareaSimulada_('r', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] },
      { numero: 4, texto_original: 'x', tareas: [] },
      { numero: 5, texto_original: 'x', tareas: [tareaSimulada_('r', 'Finanzas', 'Alto', 'Administración', 'Socio Administración')] }
    ] };
  var p5;
  var m5 = {}; m5[fixtureRealEval01Actual.asunto] = respuestaSimulada_(datosEval01Real);
  conFixturesYIAFalsas_([fixtureRealEval01Actual], m5, function () { p5 = evaluarFixtureIndividual_(fixtureRealEval01Actual, { openaiModel: 'gpt-4o-mini' }); });
  assert('P5 — EVAL-IA-01-MIXTO no se degrada: aprueba con la versión real actual (v4) y su respuesta esperada (incluye Finanzas/Alto)', p5.aprobado === true, JSON.stringify(p5));

  var datosEval03Real = { correo_relevante: true, requiere_revision: false, motivo_revision: null, motivo_sin_tareas: null,
    observaciones: [
      { numero: 1, texto_original: 'x', tareas: [tareaSimulada_('r', 'Desarrollo IT', 'Alto', 'Desarrollo IT', 'Responsable Técnico')] },
      { numero: 2, texto_original: 'x', tareas: [tareaSimulada_('r', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] },
      { numero: 3, texto_original: 'x', tareas: [tareaSimulada_('r', 'Finanzas', 'Medio', 'Administración', 'Socio Administración')] }
    ] };
  var p6;
  var m6 = {}; m6[fixtureRealEval03Actual.asunto] = respuestaSimulada_(datosEval03Real);
  conFixturesYIAFalsas_([fixtureRealEval03Actual], m6, function () { p6 = evaluarFixtureIndividual_(fixtureRealEval03Actual, { openaiModel: 'gpt-4o-mini' }); });
  assert('P6 — EVAL-IA-03-OPERATIVO no se degrada: aprueba con la versión real actual (v4) y Finanzas/Medio (dentro de prioridadesPermitidas)', p6.aprobado === true, JSON.stringify(p6));

  var datosEval04RealValido = { correo_relevante: true, requiere_revision: true, motivo_revision: 'contenido sospechoso a revisar', motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: 'x', tareas: [] }] };
  var p7;
  var m7 = {}; m7[fixtureRealEval04Actual.asunto] = respuestaSimulada_(datosEval04RealValido);
  conFixturesYIAFalsas_([fixtureRealEval04Actual], m7, function () { p7 = evaluarFixtureIndividual_(fixtureRealEval04Actual, { openaiModel: 'gpt-4o-mini' }); });
  assert('P7 — EVAL-IA-04-INSTRUCCIONES-SOSPECHOSAS no se degrada: aprueba con la versión real actual (v4) y la respuesta válida segura prevista', p7.aprobado === true, JSON.stringify(p7));

  Logger.log('--- Resumen ---');
  Logger.log(fallos === 0
    ? 'ejecutarPruebasEvaluadorIAFase8(): ' + casos.length + '/' + casos.length + ' verificaciones OK.'
    : 'ejecutarPruebasEvaluadorIAFase8(): ' + fallos + ' de ' + casos.length + ' verificaciones FALLARON.');
}
