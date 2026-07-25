/**
 * ============================================================================
 * pruebas/automatizador_integracion_fase8.gs
 * EXCLUSIVO DEL PROYECTO DE PRUEBA / NO DESPLEGAR
 * ============================================================================
 * Fase 2A (MVP) del automatizador de integración de Fase 8 (ver
 * auditoria/CHANGELOG.md y documentacion/AUTOMATIZACION_INTEGRACION_FASE8.md).
 * Incluye la revisión correctiva del 23/07/2026 (barreras reforzadas).
 *
 * Automatiza, dentro del proyecto de Apps Script de PRUEBA: preparación del
 * caso, parametrización segura EN MEMORIA, simulación DRY_RUN, autorización
 * separada de la ejecución formal, ejecución formal y comprobación de
 * Log Mensajes, Registro Tareas, Indice Idempotencia, hojas de negocio y
 * Gmail. NO automatiza el envío del correo desde la cuenta externa (Fase 3).
 *
 * REGLA DE SEGURIDAD PRINCIPAL: este archivo NUNCA modifica ScriptProperties
 * de ejecución ni implementa snapshot/restore. Toda la parametrización vive
 * en un cfg clonado en memoria. Un timeout no puede dejar configuración
 * peligrosa persistida, porque nunca se escribe configuración.
 *
 * Todas las interacciones con el entorno pasan por un objeto `amb` inyectable,
 * para poder probar de forma determinista con dobles
 * (pruebas/pruebas_automatizador_integracion_fase8.gs).
 *
 * Sanitización de logs: solo categorías, IDs, estados, conteos y valores de
 * catálogo. Nunca cuerpos de correo, prompts, motivo_sin_tareas,
 * motivo_revision, API keys ni cfg completo.
 * ============================================================================
 */

// ============================================================================
// CONSTANTES AUTORIZADAS (fail-closed)
// ============================================================================

/**
 * Script ID del proyecto de Apps Script de PRUEBA autorizado. Debe
 * completarse UNA sola vez con el valor real antes de la primera corrida.
 * Mientras contenga el centinela, TODAS las funciones del automatizador se
 * niegan a ejecutarse (barrera fail-closed).
 */
var INTEGRACION_SCRIPT_ID_AUTORIZADO = '1KJjGzRhbb-rmi0k264zIVrsuU3-igA2sPsKLjCyB5uxtjOFwzieU1Kca';

/** Cuenta Workspace de prueba autorizada (Session.getEffectiveUser().getEmail()). */
var INTEGRACION_CUENTA_AUTORIZADA = 'carlosrubenbageta@alia-data.com';

/** Planilla de prueba autorizada (debe coincidir exactamente con SPREADSHEET_ID_PRUEBA). */
var INTEGRACION_SPREADSHEET_ID_PRUEBA_AUTORIZADO = '1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o';

/** Nombre exacto de la etiqueta de aislamiento de prueba (ETIQUETA_PRUEBA). */
var INTEGRACION_ETIQUETA_PRUEBA_AUTORIZADA = 'Pruebas-Automatizacion';

/** Nombres EXACTOS de las etiquetas de resultado, por clave interna. */
var INTEGRACION_NOMBRES_ETIQUETA = {
  Procesado: 'Procesado',
  RevisionSinTareas: 'Revisión manual/Sin tareas detectadas',
  RevisionErrorProcesamiento: 'Revisión manual/Error de procesamiento',
  RevisionErrorAutomatizacion: 'Revisión manual/Error de automatización'
};

/** Nombres de propiedad de los IDs de etiqueta, por clave interna. */
var INTEGRACION_PROP_ID_ETIQUETA = {
  Procesado: 'ID_ETIQUETA_PROCESADO',
  RevisionSinTareas: 'ID_ETIQUETA_REVISION_SIN_TAREAS',
  RevisionErrorProcesamiento: 'ID_ETIQUETA_REVISION_ERROR_PROCESAMIENTO',
  RevisionErrorAutomatizacion: 'ID_ETIQUETA_REVISION_ERROR_AUTOMATIZACION'
};

/** Clave de UserProperties donde vive el estado (no sensible) de la sesión E2E. */
var INTEGRACION_CLAVE_SESION = 'AUTO_FASE8_SESION';

/** Propiedad opcional que selecciona el fixture (sin modificar configuración productiva). */
var INTEGRACION_PROP_CASO = 'AUTO_FASE8_CASO';

// ============================================================================
// AMBIENTE (inyección de dependencias)
// ============================================================================

function crearAmbienteIntegracionReal_() {
  return {
    props: PropertiesService.getScriptProperties(),
    userProps: PropertiesService.getUserProperties(),
    scriptId: function () { return ScriptApp.getScriptId(); },
    usuarioEfectivo: function () { return Session.getEffectiveUser().getEmail(); },
    triggers: function () { return ScriptApp.getProjectTriggers(); },
    obtenerLock: function () { return LockService.getScriptLock(); },
    ahora: function () { return Date.now(); },
    nuevoId: function () { return Utilities.getUuid(); },
    log: function (msg) { Logger.log(msg); },
    versionPromptActual: function () { return VERSION_PROMPT_SISTEMA; },
    gmailLabelsList: function () { return Gmail.Users.Labels.list('me'); },
    gmailLabelsGet: function (id) { return Gmail.Users.Labels.get('me', id); },
    gmailMessagesList: function (params) { return Gmail.Users.Messages.list('me', params); },
    gmailMessageGet: function (id) {
      return Gmail.Users.Messages.get('me', id, { format: 'metadata', metadataHeaders: ['Subject', 'From'] });
    },
    gmailMensajeCuerpoPlano: function (id) { return GmailApp.getMessageById(id).getPlainBody(); },
    validarConfiguracion: function () { return validarConfiguracion(); },
    obtenerHojaTecnica: function (nombre, cfg) { return obtenerHojaTecnica(nombre, cfg); },
    leerContenidoHoja: function (nombre, cfg) {
      var hoja = obtenerHojaTecnica(nombre, cfg);
      var rango = hoja.getDataRange();
      return { valores: rango.getValues(), formulas: rango.getFormulas(), filas: hoja.getLastRow() };
    },
    obtenerManifiestoPersistido: function (messageId, cfg) { return obtenerManifiestoPersistido(messageId, cfg); },
    procesarNucleo: function (cfg, opciones) { return procesarCorreosDeTareasConConfiguracion_(cfg, opciones); },
    proyectoAutorizado: INTEGRACION_SCRIPT_ID_AUTORIZADO,
    cuentaAutorizada: INTEGRACION_CUENTA_AUTORIZADA,
    spreadsheetPruebaAutorizado: INTEGRACION_SPREADSHEET_ID_PRUEBA_AUTORIZADO,
    etiquetaPruebaAutorizada: INTEGRACION_ETIQUETA_PRUEBA_AUTORIZADA,
    nombresEtiqueta: INTEGRACION_NOMBRES_ETIQUETA
  };
}

// ============================================================================
// UTILIDADES SEGURAS
// ============================================================================

/** Log estructurado: solo categorías/IDs/estados/conteos. Nunca texto libre. */
function logIntegracion_(amb, evento, campos) {
  var partes = ['[AUTO-FASE8] ' + evento];
  if (campos) Object.keys(campos).forEach(function (k) { partes.push(k + '=' + campos[k]); });
  amb.log(partes.join(' '));
}

/** Hash determinista corto (djb2) en hex. Solo para fingerprints/baseline, no seguridad. */
function hashSimpleIntegracion_(texto) {
  var hash = 5381;
  for (var i = 0; i < texto.length; i++) hash = ((hash << 5) + hash + texto.charCodeAt(i)) & 0xffffffff;
  return (hash >>> 0).toString(16);
}

/** Hash de contenido de una hoja: valores Y fórmulas (no solo cantidad de filas). */
function hashContenidoHoja_(contenido) {
  return hashSimpleIntegracion_(JSON.stringify(contenido.valores) + '||FORMULAS||' + JSON.stringify(contenido.formulas));
}

/** Índice de columna por NOMBRE de encabezado (nunca por número fijo). -1 si no existe. */
function indiceColumnaPorNombre_(encabezados, nombre) {
  for (var i = 0; i < encabezados.length; i++) if (encabezados[i] === nombre) return i;
  return -1;
}

/**
 * Encabezados MÍNIMOS que identifican, sin ambigüedad, la fila real de
 * encabezados de una hoja de negocio (documentacion/MAPA_COLUMNAS.md). No es
 * necesariamente la primera fila: las hojas reales tienen un preámbulo
 * (título, fila auxiliar, fila vacía) antes de los encabezados.
 */
var ENCABEZADOS_MINIMOS_HOJA_NEGOCIO = ['ID', 'Fecha de entrada', 'Fuente', 'Grupo origen', 'Remitente', 'Asunto original', 'Resumen de tarea'];

/**
 * Localiza, en `valores` (contenido crudo de una hoja de negocio), la ÚNICA
 * fila que contiene, como mínimo, los encabezados exactos de
 * ENCABEZADOS_MINIMOS_HOJA_NEGOCIO — sin asumir ningún número de fila fijo
 * (corrige un falso negativo real: `messageId 19f948e5d35b5276`, 24/07/2026,
 * donde la fila de encabezados estaba en la posición 4, no en la 1).
 * Fail-closed: si no hay ninguna fila candidata o hay más de una, devuelve
 * `ok:false` — el llamador debe abortar con una categoría cerrada y nunca
 * declarar FORMAL_OK en ese caso.
 */
function localizarFilaEncabezadosNegocio_(valores) {
  var candidatas = [];
  for (var i = 0; i < valores.length; i++) {
    var fila = valores[i] || [];
    var tieneTodos = ENCABEZADOS_MINIMOS_HOJA_NEGOCIO.every(function (nombre) { return indiceColumnaPorNombre_(fila, nombre) !== -1; });
    if (tieneTodos) candidatas.push(i);
  }
  if (candidatas.length !== 1) return { ok: false, indiceFila: null, cantidadCandidatas: candidatas.length };
  return { ok: true, indiceFila: candidatas[0], cantidadCandidatas: 1 };
}

/** Lee {encabezados, filas} de una hoja técnica. filas excluye el encabezado. Puede lanzar. */
function leerHojaTecnica_(amb, cfg, nombreHoja) {
  var hoja = amb.obtenerHojaTecnica(nombreHoja, cfg);
  var datos = hoja.getDataRange().getValues();
  return { encabezados: datos[0] || [], filas: datos.slice(1) };
}

/** labelIds ordenados del mensaje (para baseline y verificación de Gmail). */
function obtenerLabelIdsMensaje_(amb, messageId) {
  var mensaje = amb.gmailMessageGet(messageId);
  var ids = (mensaje && mensaje.labelIds) ? mensaje.labelIds.slice() : [];
  ids.sort();
  return ids;
}

/** Encabezado (Subject/From) del mensaje de metadata de Gmail. '' si no está. */
function encabezadoMensaje_(mensaje, nombre) {
  var headers = (mensaje && mensaje.payload && mensaje.payload.headers) || [];
  for (var i = 0; i < headers.length; i++) if (headers[i].name === nombre) return headers[i].value || '';
  return '';
}

/**
 * Canonicaliza diferencias inevitables del transporte sin aceptar cambios de
 * contenido: CRLF/CR -> LF, recorta espacios/tabs al final de cada línea y
 * saltos colgantes, preserva los límites de párrafo y convierte cada salto
 * simple DENTRO de un párrafo en un único espacio. Así, el hard-wrap que Gmail
 * puede insertar en lugar de un espacio no produce un falso negativo.
 *
 * Firmas, texto adicional, palabras distintas y límites de párrafo alterados
 * continúan produciendo valores diferentes. No se registra el cuerpo.
 */
function normalizarCuerpoIntegracion_(texto) {
  var normalizado = String(texto == null ? '' : texto)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n+$/, '');

  return normalizado
    .split(/(\n{2,})/)
    .map(function (segmento, indice) {
      // Los separadores capturados (índices impares) se conservan exactamente.
      if (indice % 2 === 1) return segmento;
      return segmento.replace(/[ \t]*\n[ \t]*/g, ' ');
    })
    .join('');
}

/**
 * Extrae y normaliza la dirección del encabezado From. Acepta
 * "Nombre <correo@dominio>" y una dirección desnuda. Devuelve la dirección en
 * minúsculas y sin espacios, para exigir igualdad EXACTA (no subcadena).
 */
function extraerDireccionFrom_(from) {
  if (!from) return '';
  var m = String(from).match(/<([^>]+)>/);
  var dir = m ? m[1] : String(from);
  return dir.trim().toLowerCase();
}

// ============================================================================
// BARRERAS FAIL-CLOSED
// ============================================================================

function verificarBarrerasBase_(amb) {
  var errores = [];
  if (amb.proyectoAutorizado === 'COMPLETAR_CON_EL_SCRIPT_ID_DEL_PROYECTO_DE_PRUEBA') errores.push('SCRIPT_ID_AUTORIZADO_SIN_COMPLETAR');
  if (amb.props.getProperty('MODO_PRUEBA') !== 'true') errores.push('MODO_PRUEBA_NO_TRUE');
  if (amb.props.getProperty('DRY_RUN') !== 'true') errores.push('DRY_RUN_BASE_NO_TRUE');
  if (amb.scriptId() !== amb.proyectoAutorizado) errores.push('SCRIPT_ID_NO_AUTORIZADO');
  if (amb.usuarioEfectivo() !== amb.cuentaAutorizada) errores.push('CUENTA_NO_AUTORIZADA');

  var idPrueba = amb.props.getProperty('SPREADSHEET_ID_PRUEBA');
  var idProductivo = amb.props.getProperty('SPREADSHEET_ID');
  if (!idPrueba) errores.push('SPREADSHEET_ID_PRUEBA_AUSENTE');
  if (idPrueba && idProductivo && idPrueba === idProductivo) errores.push('SPREADSHEET_ID_PRUEBA_IGUAL_A_PRODUCTIVO');
  if (idPrueba && idPrueba !== amb.spreadsheetPruebaAutorizado) errores.push('SPREADSHEET_ID_PRUEBA_NO_AUTORIZADO');

  if (amb.props.getProperty('ETIQUETA_PRUEBA') !== amb.etiquetaPruebaAutorizada) errores.push('ETIQUETA_PRUEBA_NO_AUTORIZADA');

  return { ok: errores.length === 0, errores: errores };
}

function verificarEtiquetas_(amb) {
  var errores = [];
  var idsPorClave = {};
  var nombrePorId = {};

  var lista;
  try {
    lista = amb.gmailLabelsList();
  } catch (e) {
    return { ok: false, errores: ['GMAIL_LABELS_LIST_FALLO'], idEtiquetaPrueba: null, idsPorClave: {} };
  }
  var etiquetas = (lista && lista.labels) || [];
  var idPorNombre = {};
  etiquetas.forEach(function (et) { idPorNombre[et.name] = et.id; nombrePorId[et.id] = et.name; });

  var idEtiquetaPrueba = idPorNombre[amb.etiquetaPruebaAutorizada] || null;
  if (!idEtiquetaPrueba) errores.push('ETIQUETA_PRUEBA_INEXISTENTE_EN_GMAIL');

  Object.keys(amb.nombresEtiqueta).forEach(function (clave) {
    var nombreEsperado = amb.nombresEtiqueta[clave];
    var idConfigurado = amb.props.getProperty(INTEGRACION_PROP_ID_ETIQUETA[clave]);
    if (!idConfigurado) { errores.push('ID_ETIQUETA_AUSENTE:' + clave); return; }
    idsPorClave[clave] = idConfigurado;
    if (nombrePorId[idConfigurado] !== nombreEsperado) errores.push('ID_ETIQUETA_NO_COINCIDE_LISTA:' + clave);
    try {
      var det = amb.gmailLabelsGet(idConfigurado);
      if (!det || det.name !== nombreEsperado) errores.push('ID_ETIQUETA_NO_COINCIDE_GET:' + clave);
    } catch (e) {
      errores.push('ID_ETIQUETA_GET_FALLO:' + clave);
    }
  });

  return { ok: errores.length === 0, errores: errores, idEtiquetaPrueba: idEtiquetaPrueba, idsPorClave: idsPorClave };
}

function verificarSinActivadorEnConflicto_(amb) {
  var triggers;
  try {
    triggers = amb.triggers() || [];
  } catch (e) {
    return { ok: false, errores: ['NO_SE_PUDO_LEER_ACTIVADORES'] };
  }
  var enConflicto = triggers.some(function (t) { return t.getHandlerFunction && t.getHandlerFunction() === 'procesarCorreosDeTareas'; });
  return enConflicto ? { ok: false, errores: ['ACTIVADOR_PRODUCTIVO_EN_CONFLICTO'] } : { ok: true, errores: [] };
}

/**
 * Verifica que la versión efectiva del prompt (VERSION_PROMPT_SISTEMA, vía
 * amb.versionPromptActual()) satisfaga la versión mínima del fixture, usando
 * el orden AUTOCONTENIDO ORDEN_VERSIONES_PROMPT_INTEGRACION
 * (pruebas/fixtures_integracion_fase8.gs). Fail-closed: versión desconocida o
 * inferior aborta.
 */
function verificarVersionPrompt_(amb, fixture) {
  var actual = amb.versionPromptActual();
  var orden = ORDEN_VERSIONES_PROMPT_INTEGRACION;
  var iActual = orden.indexOf(actual);
  var iMinima = orden.indexOf(fixture.versionPromptMinima);
  if (iActual === -1) return { ok: false, errores: ['VERSION_PROMPT_ACTUAL_DESCONOCIDA'] };
  if (iMinima === -1) return { ok: false, errores: ['VERSION_PROMPT_MINIMA_DESCONOCIDA'] };
  if (iActual < iMinima) return { ok: false, errores: ['VERSION_PROMPT_INFERIOR'] };
  return { ok: true, errores: [] };
}

/**
 * Comprueba fail-closed si el message_id ya está registrado en Log Mensajes,
 * Registro Tareas, Indice Idempotencia o un manifiesto. NUNCA oculta
 * excepciones: un fallo de lectura devuelve un error, jamás "no existe".
 * Devuelve {ok, registrado, errores}.
 */
function verificarMessageIdNoRegistrado_(amb, cfg, messageId) {
  function apareceEn(nombreHoja) {
    var hoja = leerHojaTecnica_(amb, cfg, nombreHoja); // puede lanzar -> se propaga abajo
    var idx = indiceColumnaPorNombre_(hoja.encabezados, 'message_id');
    if (idx === -1) return false;
    return hoja.filas.some(function (f) { return String(f[idx]) === String(messageId); });
  }
  var registrado = false;
  try {
    if (apareceEn(HOJAS_TECNICAS.LOG_MENSAJES)) registrado = true;
    else if (apareceEn(HOJAS_TECNICAS.REGISTRO_TAREAS)) registrado = true;
    else if (apareceEn(HOJAS_TECNICAS.INDICE_IDEMPOTENCIA)) registrado = true;
    else if (amb.obtenerManifiestoPersistido(messageId, cfg).length > 0) registrado = true;
  } catch (e) {
    return { ok: false, registrado: null, errores: ['LECTURA_PREEXISTENCIA_FALLIDA'] };
  }
  return { ok: true, registrado: registrado, errores: [] };
}

// ============================================================================
// LOCALIZACIÓN Y VERIFICACIÓN DEL MENSAJE
// ============================================================================

/** Consulta Gmail construida INTERNAMENTE. Nunca acepta una consulta libre. */
function construirQueryInterna_(amb, marcador) {
  return 'in:inbox label:"' + amb.etiquetaPruebaAutorizada + '" "' + marcador + '"';
}

/**
 * Localiza el mensaje por el marcador único: exige exactamente uno (consulta
 * como máximo dos resultados) y verifica, de forma independiente, asunto,
 * remitente (dirección exacta), INBOX, etiqueta de prueba y contenido exacto
 * tras canonicalizar envolturas de transporte sin alterar párrafos. El cuerpo
 * nunca se registra.
 */
function localizarYVerificarMensaje_(amb, sesion, fixture, idEtiquetaPrueba) {
  var query = construirQueryInterna_(amb, sesion.marcador);
  var lista;
  try {
    lista = amb.gmailMessagesList({ q: query, maxResults: 2 });
  } catch (e) {
    return { ok: false, errores: ['GMAIL_MESSAGES_LIST_FALLO'], messageId: null };
  }
  var mensajes = (lista && lista.messages) || [];
  if (mensajes.length === 0) return { ok: false, errores: ['CERO_MENSAJES'], messageId: null };
  if (mensajes.length > 1) return { ok: false, errores: ['MAS_DE_UN_MENSAJE'], messageId: null };

  var messageId = mensajes[0].id;
  var errores = [];
  var meta;
  try {
    meta = amb.gmailMessageGet(messageId);
  } catch (e) {
    return { ok: false, errores: ['GMAIL_MESSAGE_GET_FALLO'], messageId: messageId };
  }

  var asunto = encabezadoMensaje_(meta, 'Subject');
  var remitente = extraerDireccionFrom_(encabezadoMensaje_(meta, 'From'));
  var labelIds = (meta && meta.labelIds) || [];

  if (asunto !== sesion.asuntoEsperado) errores.push('ASUNTO_NO_COINCIDE');
  if (remitente !== String(fixture.remitentePermitido).trim().toLowerCase()) errores.push('REMITENTE_NO_COINCIDE');
  if (labelIds.indexOf('INBOX') === -1) errores.push('SIN_INBOX');
  if (idEtiquetaPrueba && labelIds.indexOf(idEtiquetaPrueba) === -1) errores.push('SIN_ETIQUETA_PRUEBA');

  // Contenido exacto tras canonicalizar envolturas de transporte (fail-closed).
  // Nunca se registra el cuerpo.
  var cuerpoReal;
  try {
    cuerpoReal = amb.gmailMensajeCuerpoPlano(messageId);
  } catch (e) {
    return { ok: false, errores: errores.concat(['CUERPO_LECTURA_FALLIDA']), messageId: messageId };
  }
  if (normalizarCuerpoIntegracion_(cuerpoReal) !== normalizarCuerpoIntegracion_(fixture.cuerpo)) errores.push('CUERPO_NO_COINCIDE');

  return { ok: errores.length === 0, errores: errores, messageId: messageId };
}

// ============================================================================
// CFG EN MEMORIA
// ============================================================================

function construirCfgEnMemoria_(amb, marcador, dryRun) {
  var validacion = amb.validarConfiguracion();
  if (!validacion.valido) return { ok: false, errores: ['CONFIG_BASE_INVALIDA'], cfg: null };

  var cfgBase = validacion.cfg;
  if (cfgBase.modoPrueba !== true) return { ok: false, errores: ['CONFIG_BASE_NO_MODO_PRUEBA'], cfg: null };
  if (cfgBase.dryRun !== true) return { ok: false, errores: ['CONFIG_BASE_DRY_RUN_NO_TRUE'], cfg: null };

  var cfg = {};
  Object.keys(cfgBase).forEach(function (k) { cfg[k] = cfgBase[k]; });
  cfg.idsEtiquetas = {};
  if (cfgBase.idsEtiquetas) Object.keys(cfgBase.idsEtiquetas).forEach(function (k) { cfg.idsEtiquetas[k] = cfgBase.idsEtiquetas[k]; });

  cfg.gmailQueryEfectiva = construirQueryInterna_(amb, marcador);
  cfg.dryRun = dryRun;
  cfg.permitirEtiquetado = true;
  cfg.permitirArchivado = false;
  cfg.maxMensajesPorEjecucion = 1;
  cfg.maxMensajesBusqueda = 2;
  cfg.fechaInicioCorte = null;

  return { ok: true, errores: [], cfg: cfg };
}

/**
 * Fingerprint COMPLETO del fixture + overrides de cfg. Cubre id, asunto base,
 * cuerpo, remitente, versión de prompt y el objeto esperado completo, además
 * del cfg controlado: un cambio en el cuerpo o en las expectativas rompe el
 * fingerprint y bloquea la ejecución formal.
 */
function fingerprintFixtureCfg_(fixture, cfg) {
  var material = JSON.stringify({
    id: fixture.id,
    asuntoBase: fixture.asuntoBase,
    cuerpo: fixture.cuerpo,
    remitente: fixture.remitentePermitido,
    versionPromptMinima: fixture.versionPromptMinima,
    esperado: fixture.esperado,
    // dryRun NO se incluye: cambia legítimamente entre simulación (true) y
    // formal (false). El resto de los overrides de cfg sí deben ser idénticos.
    cfg: {
      gmailQueryEfectiva: cfg.gmailQueryEfectiva,
      permitirEtiquetado: cfg.permitirEtiquetado,
      permitirArchivado: cfg.permitirArchivado,
      maxMensajesPorEjecucion: cfg.maxMensajesPorEjecucion,
      maxMensajesBusqueda: cfg.maxMensajesBusqueda,
      fechaInicioCorte: cfg.fechaInicioCorte
    }
  });
  return hashSimpleIntegracion_(material);
}

/**
 * Baseline no sensible: por cada hoja (3 técnicas + 5 de negocio de
 * TABLEROS_VALIDOS) se guarda cantidad de filas y un hash de VALORES + FÓRMULAS
 * (detecta cambios de contenido y de fórmula, no solo de cantidad de filas).
 * También se incluye el conjunto de etiquetas del mensaje. Para el hash del
 * baseline en sí (`.hash`, lo único que se registra en sesión/UserProperties
 * y en logs) y para los logs solo se usan hashes y conteos, nunca texto de
 * celdas.
 *
 * `porHoja[nombre].valores` retiene el contenido crudo, pero ÚNICAMENTE en
 * memoria del proceso en curso (esta variable nunca se pasa a
 * guardarSesion_() ni a logIntegracion_() — ver verificarResultadoFormal_()):
 * hace falta para poder comparar, tras la ejecución formal de un fixture con
 * tareas, que las filas de una hoja de negocio que YA existían antes de esta
 * corrida permanecen exactamente intactas (comparación de prefijo), algo que
 * un hash agregado no permite aislar por sí solo.
 *
 * Puede lanzar (el llamador lo trata como LECTURA_BASELINE_FALLIDA, fail-closed).
 */
function capturarBaseline_(amb, cfg, messageId) {
  var nombres = [HOJAS_TECNICAS.LOG_MENSAJES, HOJAS_TECNICAS.REGISTRO_TAREAS, HOJAS_TECNICAS.INDICE_IDEMPOTENCIA].concat(TABLEROS_VALIDOS);
  var porHoja = {};
  nombres.forEach(function (nombre) {
    var contenido = amb.leerContenidoHoja(nombre, cfg);
    porHoja[nombre] = { filas: contenido.filas, hash: hashContenidoHoja_(contenido), valores: contenido.valores };
  });
  var etiquetas = obtenerLabelIdsMensaje_(amb, messageId).join(',');
  // El hash agregado del baseline se calcula solo con hash/filas por hoja
  // (nunca con `valores`), para que su forma no cambie por esta ampliación.
  var porHojaParaHash = {};
  Object.keys(porHoja).forEach(function (nombre) { porHojaParaHash[nombre] = { filas: porHoja[nombre].filas, hash: porHoja[nombre].hash }; });
  var hash = hashSimpleIntegracion_(JSON.stringify(porHojaParaHash) + '||ETIQUETAS||' + etiquetas);
  return { porHoja: porHoja, etiquetasMensaje: etiquetas, hash: hash };
}

/** Comprueba que el resumen del núcleo procesó exactamente el message_id preparado. */
function verificarResumenNucleo_(resumen, messageId) {
  if (!resumen) return { ok: false, errores: ['NUCLEO_SIN_RESUMEN'] };
  if (resumen.mensajesElegibles !== 1) return { ok: false, errores: ['NUCLEO_ELEGIBLES:' + resumen.mensajesElegibles] };
  if (resumen.cantidadIntentada !== 1) return { ok: false, errores: ['NUCLEO_INTENTADOS:' + resumen.cantidadIntentada] };
  if (!resumen.messageIdsIntentados || String(resumen.messageIdsIntentados[0]) !== String(messageId)) return { ok: false, errores: ['NUCLEO_ID_DISTINTO'] };
  return { ok: true, errores: [] };
}

/**
 * Compara la clasificación REAL obtenida por el DRY_RUN (resumen.resultadosSimulados[0],
 * ver procesarUnMensajeSimulado()/procesarCorreosDeTareasConConfiguracion_() en
 * codigo/script_refactorizado.gs) contra fixture.esperado: cantidad de
 * observaciones, cantidad de tareas y el multiset de tablero. Corrige un
 * falso negativo real (24/07/2026, runId=3b2883e9-5f26-4269-a3c1-1cbe4d14a7ed,
 * messageId=19f94b94245ce658): la simulación informaba SIMULACION_OK sin
 * comparar nunca la clasificación obtenida contra la exigida por el fixture.
 * Nunca extrae nada de texto de Logger — solo lee el resultado estructurado
 * ya devuelto por el núcleo. Categorías cerradas; nunca texto libre.
 *
 * Corrección (24/07/2026, INT-FASE8-07-CUERPO-VACIO/CP-16,
 * messageId=19f9661d038ea8de): procesarUnMensajeSimulado() devuelve
 * cantidadObservaciones/cantidadTareas en `null` (nunca 0) para las
 * categorías en las que el mensaje NUNCA llega a una clasificación real de
 * la IA (NO_ELEGIBLE: filtro determinístico; RESPUESTA_IA_INVALIDA;
 * REQUIERE_REVISION) — distinto de SIN_TAREAS/TAREAS_SIMULADAS, que sí
 * clasifican. Un fixture cuyo resultado real es una de esas tres categorías
 * declara fixture.esperado.resultadoSimulado con ese valor exacto; en ese
 * caso se verifica la forma exacta de esas categorías (resultado, null, null,
 * []) en vez de la comparación numérica genérica de abajo (pensada para
 * SIN_TAREAS/TAREAS_SIMULADAS). Ausente ese campo, comportamiento idéntico al
 * previo a esta corrección.
 */
function verificarClasificacionSimulada_(resumen, fixture) {
  var datos = resumen && resumen.resultadosSimulados && resumen.resultadosSimulados[0] && resumen.resultadosSimulados[0].resultado;
  if (!datos) return { ok: false, errores: ['SIMULACION_SIN_RESULTADO_CLASIFICADO'] };

  var esperado = fixture.esperado;
  var errores = [];

  var resultadoSimuladoEsperado = esperado.resultadoSimulado;
  var esCategoriaSinClasificacion = resultadoSimuladoEsperado &&
    resultadoSimuladoEsperado !== 'SIN_TAREAS' && resultadoSimuladoEsperado !== 'TAREAS_SIMULADAS';

  if (esCategoriaSinClasificacion) {
    if (datos.resultado !== resultadoSimuladoEsperado) errores.push('SIMULACION_RESULTADO_NO_COINCIDE:' + datos.resultado);
    if (datos.cantidadObservaciones !== null) errores.push('SIMULACION_CANTIDAD_OBSERVACIONES:' + datos.cantidadObservaciones);
    if (datos.cantidadTareas !== null) errores.push('SIMULACION_CANTIDAD_TAREAS:' + datos.cantidadTareas);
    if ((datos.tableros || []).length !== 0) errores.push('SIMULACION_TABLEROS_NO_COINCIDEN');
    return { ok: errores.length === 0, errores: errores };
  }

  if (datos.cantidadObservaciones !== esperado.cantidad_observaciones) errores.push('SIMULACION_CANTIDAD_OBSERVACIONES:' + datos.cantidadObservaciones);
  if (datos.cantidadTareas !== esperado.cantidad_tareas) errores.push('SIMULACION_CANTIDAD_TAREAS:' + datos.cantidadTareas);

  var tablerosEsperados = (esperado.tareasEsperadas || []).map(function (t) { return t.tablero; }).sort();
  var tablerosObtenidos = (datos.tableros || []).slice().sort();
  if (JSON.stringify(tablerosEsperados) !== JSON.stringify(tablerosObtenidos)) errores.push('SIMULACION_TABLEROS_NO_COINCIDEN');

  return { ok: errores.length === 0, errores: errores };
}

// ============================================================================
// SESIÓN (UserProperties, estado no sensible)
// ============================================================================

function leerSesion_(amb) {
  var crudo = amb.userProps.getProperty(INTEGRACION_CLAVE_SESION);
  if (!crudo) return null;
  try { return JSON.parse(crudo); } catch (e) { return null; }
}

function guardarSesion_(amb, sesion) { amb.userProps.setProperty(INTEGRACION_CLAVE_SESION, JSON.stringify(sesion)); }
function borrarSesion_(amb) { amb.userProps.deleteProperty(INTEGRACION_CLAVE_SESION); }

function seleccionarFixtureId_(amb) { return amb.props.getProperty(INTEGRACION_PROP_CASO) || FIXTURE_INTEGRACION_POR_DEFECTO; }

// ============================================================================
// NÚCLEOS DE LAS FUNCIONES VISIBLES
// ============================================================================

function prepararCaso_(amb) {
  var base = verificarBarrerasBase_(amb);
  if (!base.ok) {
    logIntegracion_(amb, 'PREPARAR_ABORTADO', { errores: base.errores.join(',') });
    return { ok: false, etapa: 'PREPARAR', errores: base.errores };
  }
  if (leerSesion_(amb)) {
    logIntegracion_(amb, 'PREPARAR_ABORTADO', { errores: 'SESION_PENDIENTE' });
    return { ok: false, etapa: 'PREPARAR', errores: ['SESION_PENDIENTE'] };
  }

  var fixtureId = seleccionarFixtureId_(amb);
  var fixture = obtenerFixtureIntegracion_(fixtureId);
  if (!fixture) {
    logIntegracion_(amb, 'PREPARAR_ABORTADO', { errores: 'FIXTURE_INEXISTENTE', caso: fixtureId });
    return { ok: false, etapa: 'PREPARAR', errores: ['FIXTURE_INEXISTENTE'] };
  }

  var runId = amb.nuevoId();
  var marcador = 'E2E-' + amb.nuevoId().replace(/-/g, '').substring(0, 12);
  var asuntoEsperado = fixture.asuntoBase + ' [' + marcador + ']';

  var sesion = {
    runId: runId, fixtureId: fixture.id, marcador: marcador,
    asuntoEsperado: asuntoEsperado, estado: 'PREPARADO', creadoEn: amb.ahora()
  };
  guardarSesion_(amb, sesion);
  logIntegracion_(amb, 'PREPARADO', { runId: runId, caso: fixture.id, marcador: marcador });

  // El cuerpo mostrado es un CUERPO SINTÉTICO del fixture (constante), no un
  // correo real: mostrarlo es el objetivo de esta función. No es texto libre
  // del modelo ni de un correo real, y no se registra en logs.
  return {
    ok: true, etapa: 'PREPARAR', runId: runId, caso: fixture.id,
    instrucciones: 'Enviá manualmente, desde ' + fixture.remitentePermitido + ' a ' + amb.cuentaAutorizada +
      ', un correo con EXACTAMENTE este asunto y este cuerpo. Asegurate de que reciba la etiqueta "' +
      amb.etiquetaPruebaAutorizada + '" (por filtro o manualmente) y quede en Recibidos. Luego ejecutá ' +
      'simularYVerificarCasoIntegracionFase8Visible().',
    remitente: fixture.remitentePermitido, asunto: asuntoEsperado, cuerpo: fixture.cuerpo
  };
}

/**
 * Ejecuta barreras completas (base + etiquetas + sin activador + versión de
 * prompt), localiza y verifica el mensaje (asunto/remitente/cuerpo/INBOX/
 * etiqueta), construye el cfg en memoria y comprueba fail-closed que el
 * message_id no esté ya registrado. Reutilizado por simulación y formal.
 */
function ejecutarBarrerasYContexto_(amb, sesion, dryRun) {
  var errores = [];

  var base = verificarBarrerasBase_(amb);
  errores = errores.concat(base.errores);

  var trig = verificarSinActivadorEnConflicto_(amb);
  errores = errores.concat(trig.errores);

  var etiquetas = verificarEtiquetas_(amb);
  errores = errores.concat(etiquetas.errores);

  var fixture = obtenerFixtureIntegracion_(sesion.fixtureId);
  if (!fixture) errores.push('FIXTURE_INEXISTENTE');

  if (fixture) {
    var ver = verificarVersionPrompt_(amb, fixture);
    errores = errores.concat(ver.errores);
  }

  if (errores.length > 0) return { ok: false, errores: errores, contexto: null };

  var loc = localizarYVerificarMensaje_(amb, sesion, fixture, etiquetas.idEtiquetaPrueba);
  errores = errores.concat(loc.errores);
  if (!loc.ok) return { ok: false, errores: errores, contexto: null };

  var cfgRes = construirCfgEnMemoria_(amb, sesion.marcador, dryRun);
  errores = errores.concat(cfgRes.errores);
  if (!cfgRes.ok) return { ok: false, errores: errores, contexto: null };

  var pre = verificarMessageIdNoRegistrado_(amb, cfgRes.cfg, loc.messageId);
  if (!pre.ok) return { ok: false, errores: pre.errores, contexto: null };
  if (pre.registrado) return { ok: false, errores: ['MESSAGE_ID_YA_REGISTRADO'], contexto: null };

  return {
    ok: true, errores: [],
    contexto: {
      fixture: fixture, idEtiquetaPrueba: etiquetas.idEtiquetaPrueba,
      idsPorClave: etiquetas.idsPorClave, messageId: loc.messageId, cfg: cfgRes.cfg
    }
  };
}

function simularYVerificar_(amb) {
  var sesion = leerSesion_(amb);
  if (!sesion) return { ok: false, etapa: 'SIMULAR', errores: ['SIN_SESION'] };
  if (sesion.estado !== 'PREPARADO' && sesion.estado !== 'SIMULACION_OK') {
    return { ok: false, etapa: 'SIMULAR', errores: ['ESTADO_INVALIDO:' + sesion.estado] };
  }

  var lock = amb.obtenerLock();
  if (!lock.tryLock(5000)) {
    logIntegracion_(amb, 'SIMULAR_ABORTADO', { errores: 'SIN_LOCK' });
    return { ok: false, etapa: 'SIMULAR', errores: ['SIN_LOCK'] };
  }

  try {
    var ctx = ejecutarBarrerasYContexto_(amb, sesion, true);
    if (!ctx.ok) {
      logIntegracion_(amb, 'SIMULAR_ABORTADO', { errores: ctx.errores.join(',') });
      return { ok: false, etapa: 'SIMULAR', errores: ctx.errores };
    }
    var c = ctx.contexto;

    var baselinePrevio;
    try {
      baselinePrevio = capturarBaseline_(amb, c.cfg, c.messageId);
    } catch (e) {
      logIntegracion_(amb, 'SIMULAR_ABORTADO', { errores: 'LECTURA_BASELINE_FALLIDA' });
      return { ok: false, etapa: 'SIMULAR', errores: ['LECTURA_BASELINE_FALLIDA'] };
    }

    var resumen = amb.procesarNucleo(c.cfg, { omitirRecuperacion: true });
    var chequeoResumen = verificarResumenNucleo_(resumen, c.messageId);
    if (!chequeoResumen.ok) {
      logIntegracion_(amb, 'SIMULAR_FALLIDO', { messageId: c.messageId, errores: chequeoResumen.errores.join(',') });
      return { ok: false, etapa: 'SIMULAR', errores: chequeoResumen.errores };
    }

    var chequeoClasificacion = verificarClasificacionSimulada_(resumen, c.fixture);
    if (!chequeoClasificacion.ok) {
      logIntegracion_(amb, 'SIMULAR_FALLIDO', { messageId: c.messageId, errores: chequeoClasificacion.errores.join(',') });
      return { ok: false, etapa: 'SIMULAR', errores: chequeoClasificacion.errores };
    }

    var baselinePost;
    try {
      baselinePost = capturarBaseline_(amb, c.cfg, c.messageId);
    } catch (e) {
      return { ok: false, etapa: 'SIMULAR', errores: ['LECTURA_BASELINE_FALLIDA'] };
    }
    var errores = [];
    if (baselinePost.hash !== baselinePrevio.hash) errores.push('DRY_RUN_ALTERO_BASELINE');
    var preDR = verificarMessageIdNoRegistrado_(amb, c.cfg, c.messageId);
    if (!preDR.ok) errores.push('LECTURA_PREEXISTENCIA_FALLIDA');
    else if (preDR.registrado) errores.push('DRY_RUN_PERSISTIO_MESSAGE_ID');

    if (errores.length > 0) {
      logIntegracion_(amb, 'SIMULAR_FALLIDO', { messageId: c.messageId, errores: errores.join(',') });
      return { ok: false, etapa: 'SIMULAR', errores: errores };
    }

    sesion.estado = 'SIMULACION_OK';
    sesion.messageId = c.messageId;
    sesion.fingerprintFixtureCfg = fingerprintFixtureCfg_(c.fixture, c.cfg);
    sesion.hashBaseline = baselinePrevio.hash;
    sesion.nonce = amb.nuevoId();
    sesion.simuladoEn = amb.ahora();
    guardarSesion_(amb, sesion);

    logIntegracion_(amb, 'SIMULACION_OK', { runId: sesion.runId, caso: c.fixture.id, messageId: c.messageId });
    return { ok: true, etapa: 'SIMULAR', messageId: c.messageId, caso: c.fixture.id };
  } finally {
    lock.releaseLock();
  }
}

function ejecutarFormalYVerificar_(amb) {
  var sesion = leerSesion_(amb);
  if (!sesion) return { ok: false, etapa: 'FORMAL', errores: ['SIN_SESION'] };
  // Resistente a timeout: una sesión FORMAL_EN_CURSO (de una formal anterior
  // interrumpida por un timeout duro) bloquea toda reejecución automática
  // hasta revisión humana (hay que cancelar tras revisar la evidencia).
  if (sesion.estado === 'FORMAL_EN_CURSO') return { ok: false, etapa: 'FORMAL', errores: ['FORMAL_EN_CURSO_REQUIERE_REVISION'] };
  if (sesion.estado !== 'SIMULACION_OK') return { ok: false, etapa: 'FORMAL', errores: ['SIN_SIMULACION_OK'] };
  if (!sesion.nonce) return { ok: false, etapa: 'FORMAL', errores: ['SIN_NONCE'] };
  if (!sesion.messageId) return { ok: false, etapa: 'FORMAL', errores: ['SIN_MESSAGE_ID'] };

  var lock = amb.obtenerLock();
  if (!lock.tryLock(5000)) {
    logIntegracion_(amb, 'FORMAL_ABORTADO', { errores: 'SIN_LOCK' });
    return { ok: false, etapa: 'FORMAL', errores: ['SIN_LOCK'] };
  }

  try {
    var ctx = ejecutarBarrerasYContexto_(amb, sesion, false);
    if (!ctx.ok) {
      logIntegracion_(amb, 'FORMAL_ABORTADO', { errores: ctx.errores.join(',') });
      return { ok: false, etapa: 'FORMAL', errores: ctx.errores };
    }
    var c = ctx.contexto;

    var errores = [];
    if (c.messageId !== sesion.messageId) errores.push('MESSAGE_ID_CAMBIO');
    if (fingerprintFixtureCfg_(c.fixture, c.cfg) !== sesion.fingerprintFixtureCfg) errores.push('FINGERPRINT_CAMBIO');

    var baselineActual;
    try {
      baselineActual = capturarBaseline_(amb, c.cfg, c.messageId);
    } catch (e) {
      logIntegracion_(amb, 'FORMAL_ABORTADO', { errores: 'LECTURA_BASELINE_FALLIDA' });
      return { ok: false, etapa: 'FORMAL', errores: ['LECTURA_BASELINE_FALLIDA'] };
    }
    if (baselineActual.hash !== sesion.hashBaseline) errores.push('BASELINE_CAMBIO');

    if (errores.length > 0) {
      logIntegracion_(amb, 'FORMAL_ABORTADO', { messageId: sesion.messageId, errores: errores.join(',') });
      return { ok: false, etapa: 'FORMAL', errores: errores };
    }

    // Persistir FORMAL_EN_CURSO ANTES del pipeline (resistente a timeout).
    sesion.estado = 'FORMAL_EN_CURSO';
    sesion.formalInicioEn = amb.ahora();
    guardarSesion_(amb, sesion);

    var verificacion;
    try {
      var resumen = amb.procesarNucleo(c.cfg, { omitirRecuperacion: true });
      var chequeoResumen = verificarResumenNucleo_(resumen, c.messageId);
      if (!chequeoResumen.ok) {
        sesion.estado = 'FORMAL_FALLIDO'; sesion.verificadoEn = amb.ahora(); guardarSesion_(amb, sesion);
        logIntegracion_(amb, 'FORMAL_FALLIDO', { messageId: c.messageId, errores: chequeoResumen.errores.join(',') });
        return { ok: false, etapa: 'FORMAL', errores: chequeoResumen.errores, messageId: c.messageId };
      }
      verificacion = verificarResultadoFormal_(amb, c.cfg, c.messageId, c.fixture, c.idsPorClave, c.idEtiquetaPrueba, baselineActual);
    } catch (e) {
      // Nunca se borra evidencia: solo se marca la sesión.
      sesion.estado = 'FORMAL_FALLIDO'; sesion.verificadoEn = amb.ahora(); guardarSesion_(amb, sesion);
      logIntegracion_(amb, 'FORMAL_FALLIDO', { messageId: c.messageId, errores: 'EXCEPCION_FORMAL' });
      return { ok: false, etapa: 'FORMAL', errores: ['EXCEPCION_FORMAL'], messageId: c.messageId };
    }

    sesion.estado = verificacion.ok ? 'FORMAL_OK' : 'FORMAL_FALLIDO';
    sesion.verificadoEn = amb.ahora();
    guardarSesion_(amb, sesion);

    if (!verificacion.ok) {
      logIntegracion_(amb, 'FORMAL_FALLIDO', { messageId: c.messageId, errores: verificacion.errores.join(',') });
      return { ok: false, etapa: 'FORMAL', errores: verificacion.errores, messageId: c.messageId };
    }

    logIntegracion_(amb, 'FORMAL_OK', { runId: sesion.runId, caso: c.fixture.id, messageId: c.messageId });
    return { ok: true, etapa: 'FORMAL', messageId: c.messageId, caso: c.fixture.id };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Extrae año-mes-día LOCALES de un objeto Date, como 'YYYY-MM-DD'. Usa
 * getFullYear()/getMonth()/getDate() (nunca los equivalentes UTC ni
 * Utilities.formatDate()) para que la comparación en sí sea neutral respecto
 * de la zona horaria: tanto en Apps Script real (donde estos getters ya
 * reflejan la zona horaria configurada del proyecto) como en los dobles
 * locales de pruebas (donde el valor simulado se construye con los mismos
 * getters), año/mes/día coinciden exactamente si y solo si representan el
 * mismo día calendario. Devuelve null si no es un objeto Date real.
 */
function formatearFechaLocalISO_(valor) {
  if (!(valor instanceof Date) || isNaN(valor.getTime())) return null;
  var mes = String(valor.getMonth() + 1);
  var dia = String(valor.getDate());
  if (mes.length < 2) mes = '0' + mes;
  if (dia.length < 2) dia = '0' + dia;
  return valor.getFullYear() + '-' + mes + '-' + dia;
}

/**
 * Verifica el resultado formal contra fixture.esperado, por NOMBRE de
 * encabezado/etiqueta (nunca por número de columna fijo). Aborta
 * explícitamente si falta un encabezado obligatorio (no lo convierte en cero
 * filas ni en una comprobación omitida). Nunca registra el texto de la
 * columna error ni de observacion_texto_original (solo si están/coinciden).
 * Puede lanzar por un fallo de lectura (el llamador lo trata como
 * EXCEPCION_FORMAL, fail-closed).
 *
 * Generalizado (24/07/2026, CP-03/INT-FASE8-02-DOS-TAREAS) para fixtures con
 * una o más tareas, activado por `fixture.esperado.tareasEsperadas`
 * (arreglo de {tablero}). Cuando ese campo está ausente o vacío — como en
 * INT-FASE8-01-INFORMATIVO —, el comportamiento es IDÉNTICO al anterior a
 * esta ampliación: se exigen 0 filas en Registro Tareas y las cinco hojas de
 * negocio idénticas al baseline.
 *
 * Ampliado (24/07/2026, CP-17/INT-FASE8-08-FECHA-LIMITE-EXPLICITA) con una
 * verificación OPCIONAL de la columna "Fecha límite" de la única fila nueva,
 * activada por `fixture.esperado.fechaLimiteEsperada` (string 'YYYY-MM-DD' o
 * `null`) cuando hay exactamente 1 tarea esperada para ese tablero. Ausente
 * ese campo — los siete fixtures anteriores —, comportamiento idéntico al
 * previo a esta ampliación.
 */
function verificarResultadoFormal_(amb, cfg, messageId, fixture, idsPorClave, idEtiquetaPrueba, baselinePrevio) {
  var esperado = fixture.esperado;
  var errores = [];
  var tieneTareasEsperadas = Array.isArray(esperado.tareasEsperadas) && esperado.tareasEsperadas.length > 0;

  var log = leerHojaTecnica_(amb, cfg, HOJAS_TECNICAS.LOG_MENSAJES);
  var registro = leerHojaTecnica_(amb, cfg, HOJAS_TECNICAS.REGISTRO_TAREAS);
  var indice = leerHojaTecnica_(amb, cfg, HOJAS_TECNICAS.INDICE_IDEMPOTENCIA);

  // --- Encabezados obligatorios (fail-closed) ---
  var reqLog = ['message_id', 'estado', 'etapa', 'cantidad_observaciones', 'cantidad_tareas', 'resultado_gmail'];
  if (esperado.errorNoVacio) reqLog.push('error');
  reqLog.forEach(function (h) { if (indiceColumnaPorNombre_(log.encabezados, h) === -1) errores.push('ENCABEZADO_AUSENTE:LogMensajes:' + h); });

  var reqRegistro = ['message_id'];
  // Solo se exigen las columnas del manifiesto cuando el fixture declara
  // tareas: INT-FASE8-01-INFORMATIVO (0 tareas) no depende de ellas, igual
  // que antes de esta ampliación.
  if (tieneTareasEsperadas) reqRegistro = reqRegistro.concat(['task_id', 'tablero', 'estado_escritura', 'observacion_texto_original']);
  reqRegistro.forEach(function (h) { if (indiceColumnaPorNombre_(registro.encabezados, h) === -1) errores.push('ENCABEZADO_AUSENTE:RegistroTareas:' + h); });

  ['message_id', 'task_id', 'estado_final'].forEach(function (h) { if (indiceColumnaPorNombre_(indice.encabezados, h) === -1) errores.push('ENCABEZADO_AUSENTE:IndiceIdempotencia:' + h); });
  if (errores.length > 0) return { ok: false, errores: errores };

  // --- Log Mensajes: exactamente una fila ---
  var idxMsg = indiceColumnaPorNombre_(log.encabezados, 'message_id');
  var filasLog = log.filas.filter(function (f) { return String(f[idxMsg]) === String(messageId); });
  if (filasLog.length !== 1) {
    errores.push('LOG_FILAS:' + filasLog.length);
  } else {
    var fila = filasLog[0];
    function valorLog(nombre) { var idx = indiceColumnaPorNombre_(log.encabezados, nombre); return idx === -1 ? undefined : fila[idx]; }
    if (String(valorLog('estado')) !== esperado.estado) errores.push('LOG_ESTADO');
    if (String(valorLog('etapa')) !== esperado.etapa) errores.push('LOG_ETAPA');
    if (Number(valorLog('cantidad_observaciones')) !== esperado.cantidad_observaciones) errores.push('LOG_CANT_OBS');
    if (Number(valorLog('cantidad_tareas')) !== esperado.cantidad_tareas) errores.push('LOG_CANT_TAREAS');
    if (String(valorLog('resultado_gmail')) !== esperado.resultado_gmail) errores.push('LOG_RESULTADO_GMAIL');
    if (esperado.errorNoVacio) {
      var valErr = valorLog('error'); // solo presencia; NUNCA se registra el texto
      if (valErr === undefined || String(valErr).trim() === '') errores.push('LOG_ERROR_VACIO');
    }
  }

  // --- Registro Tareas: cantidad exacta de filas para el message_id ---
  var idxMsgTareas = indiceColumnaPorNombre_(registro.encabezados, 'message_id');
  var filasTareas = registro.filas.filter(function (f) { return String(f[idxMsgTareas]) === String(messageId); });
  if (filasTareas.length !== esperado.filasRegistroTareas) errores.push('REGISTRO_TAREAS_FILAS:' + filasTareas.length);

  // manifiestoTareas: {taskId, tablero} de cada fila válida del manifiesto de
  // ESTE mensaje. Se usa después para Indice Idempotencia y hojas de negocio.
  var manifiestoTareas = [];

  if (tieneTareasEsperadas && filasTareas.length === esperado.filasRegistroTareas) {
    var idxTaskId = indiceColumnaPorNombre_(registro.encabezados, 'task_id');
    var idxTablero = indiceColumnaPorNombre_(registro.encabezados, 'tablero');
    var idxEstadoEscritura = indiceColumnaPorNombre_(registro.encabezados, 'estado_escritura');
    var idxTextoOriginal = indiceColumnaPorNombre_(registro.encabezados, 'observacion_texto_original');

    var taskIdsVistosRegistro = {};
    var textosOriginales = [];

    filasTareas.forEach(function (f) {
      var taskId = String(f[idxTaskId]);
      manifiestoTareas.push({ taskId: taskId, tablero: String(f[idxTablero]) });

      if (!taskId.trim()) errores.push('REGISTRO_TASK_ID_VACIO');
      if (taskIdsVistosRegistro[taskId]) errores.push('REGISTRO_TASK_ID_DUPLICADO');
      taskIdsVistosRegistro[taskId] = true;

      if (String(f[idxEstadoEscritura]) !== ESTADOS_ESCRITURA_TAREA.ESCRITA) errores.push('REGISTRO_ESTADO_ESCRITURA:' + f[idxEstadoEscritura]);

      // observacion_texto_original: se compara, nunca se registra su valor.
      textosOriginales.push(String(f[idxTextoOriginal]));
    });

    // Tableros: multiset EXACTO (sin importar el orden) — detecta faltante,
    // adicional o duplicado en una sola comparación.
    var tablerosEsperados = esperado.tareasEsperadas.map(function (t) { return t.tablero; }).sort();
    var tablerosObtenidos = manifiestoTareas.map(function (t) { return t.tablero; }).sort();
    if (JSON.stringify(tablerosEsperados) !== JSON.stringify(tablerosObtenidos)) errores.push('REGISTRO_TABLEROS_NO_COINCIDEN');

    // Mismo texto_original en todas las tareas de la misma observación (no vacío).
    var textoOriginalUnico = {};
    var textoOriginalVacio = false;
    textosOriginales.forEach(function (t) {
      if (!t.trim()) textoOriginalVacio = true;
      textoOriginalUnico[t] = true;
    });
    if (textoOriginalVacio) errores.push('REGISTRO_TEXTO_ORIGINAL_VACIO');
    if (Object.keys(textoOriginalUnico).length > 1) errores.push('REGISTRO_TEXTO_ORIGINAL_DIVERGENTE');
  }

  // --- Indice Idempotencia: N entradas, task_id y estado_final ---
  var idxMsgIdx = indiceColumnaPorNombre_(indice.encabezados, 'message_id');
  var idxTaskIdx = indiceColumnaPorNombre_(indice.encabezados, 'task_id');
  var idxEstadoIdx = indiceColumnaPorNombre_(indice.encabezados, 'estado_final');
  var filasIndice = indice.filas.filter(function (f) { return String(f[idxMsgIdx]) === String(messageId); });
  if (filasIndice.length !== esperado.entradasIndiceIdempotencia) {
    errores.push('INDICE_ENTRADAS:' + filasIndice.length);
  } else {
    var taskIdsIndice = [];
    var taskIdsVistosIndice = {};
    filasIndice.forEach(function (f) {
      var taskId = String(f[idxTaskIdx]);
      if (esperado.taskIdIndiceVacio && taskId.trim() !== '') errores.push('INDICE_TASK_ID_NO_VACIO');
      if (String(f[idxEstadoIdx]) !== esperado.estadoFinalIndice) errores.push('INDICE_ESTADO_FINAL');
      if (tieneTareasEsperadas) {
        if (!taskId.trim()) errores.push('INDICE_TASK_ID_VACIO');
        if (taskIdsVistosIndice[taskId]) errores.push('INDICE_TASK_ID_DUPLICADO');
        taskIdsVistosIndice[taskId] = true;
        taskIdsIndice.push(taskId);
      }
    });
    if (tieneTareasEsperadas) {
      // El conjunto de task_id del índice debe coincidir EXACTAMENTE con el
      // del manifiesto (Registro Tareas) — ni faltantes ni sobrantes.
      var idsManifiesto = manifiestoTareas.map(function (t) { return t.taskId; }).sort();
      var idsIndiceOrdenados = taskIdsIndice.slice().sort();
      if (JSON.stringify(idsManifiesto) !== JSON.stringify(idsIndiceOrdenados)) errores.push('INDICE_TASK_IDS_NO_COINCIDEN_CON_MANIFIESTO');
    }
  }

  // --- Gmail: etiquetas por ID ---
  var labelIds = obtenerLabelIdsMensaje_(amb, messageId);
  var idResultado = idsPorClave[esperado.claveEtiquetaEsperada];
  if (!idResultado || labelIds.indexOf(idResultado) === -1) errores.push('GMAIL_SIN_ETIQUETA_RESULTADO');
  if (esperado.conservaEtiquetaPrueba && idEtiquetaPrueba && labelIds.indexOf(idEtiquetaPrueba) === -1) errores.push('GMAIL_SIN_ETIQUETA_PRUEBA');
  if (esperado.conservaInbox && labelIds.indexOf('INBOX') === -1) errores.push('GMAIL_SIN_INBOX');
  (esperado.clavesEtiquetaProhibidas || []).forEach(function (clave) {
    var idProhibido = idsPorClave[clave];
    if (idProhibido && labelIds.indexOf(idProhibido) !== -1) errores.push('GMAIL_ETIQUETA_PROHIBIDA:' + clave);
  });

  // --- Hojas de negocio: idénticas al baseline salvo las que reciben tareas ---
  var tareasPorTablero = {};
  if (tieneTareasEsperadas) {
    esperado.tareasEsperadas.forEach(function (t) { tareasPorTablero[t.tablero] = (tareasPorTablero[t.tablero] || 0) + 1; });
  }

  TABLEROS_VALIDOS.forEach(function (tablero) {
    var base = baselinePrevio && baselinePrevio.porHoja[tablero];
    if (!base) { errores.push('HOJA_NEGOCIO_SIN_BASELINE:' + tablero); return; }

    var nuevasEsperadas = tareasPorTablero[tablero] || 0;
    var contenido = amb.leerContenidoHoja(tablero, cfg);

    if (nuevasEsperadas === 0) {
      // Sin tareas para este tablero: debe permanecer IDÉNTICO al baseline
      // (contenido y fórmulas, no solo cantidad de filas) — igual que antes.
      if (hashContenidoHoja_(contenido) !== base.hash) errores.push('HOJA_NEGOCIO_MODIFICADA:' + tablero);
      return;
    }

    // Se esperan filas nuevas: cantidad exacta, filas previas intactas
    // (comparación de prefijo) y las nuevas vinculadas por la columna "ID"
    // a los task_id del manifiesto de este tablero — ni de más ni de menos.
    var filasBase = base.valores.length;
    var filasActuales = contenido.valores.length;
    if (filasActuales !== filasBase + nuevasEsperadas) {
      errores.push('HOJA_NEGOCIO_CANTIDAD:' + tablero + ':' + filasActuales);
      return;
    }

    var prefijoIntacto = JSON.stringify(contenido.valores.slice(0, filasBase)) === JSON.stringify(base.valores);
    if (!prefijoIntacto) errores.push('HOJA_NEGOCIO_FILA_EXISTENTE_MODIFICADA:' + tablero);

    // La fila de encabezados NO está necesariamente en la posición 1: las
    // hojas reales tienen un preámbulo (título, fila auxiliar, fila vacía)
    // antes de los encabezados (messageId 19f948e5d35b5276, 24/07/2026). Se
    // busca sobre el baseline (previo a la ejecución formal), nunca sobre una
    // fila fija; si no hay una única candidata, se aborta fail-closed.
    var deteccionEncabezados = localizarFilaEncabezadosNegocio_(base.valores);
    if (!deteccionEncabezados.ok) {
      errores.push('FILA_ENCABEZADOS_NEGOCIO_' + (deteccionEncabezados.cantidadCandidatas === 0 ? 'AUSENTE' : 'AMBIGUA') + ':' + tablero);
      return;
    }
    var idxId = indiceColumnaPorNombre_(base.valores[deteccionEncabezados.indiceFila], 'ID');

    var taskIdsEsperadosTablero = manifiestoTareas
      .filter(function (t) { return t.tablero === tablero; })
      .map(function (t) { return t.taskId; })
      .sort();
    var taskIdsNuevasFilas = contenido.valores.slice(filasBase)
      .map(function (f) { return String(f[idxId]); })
      .sort();

    if (JSON.stringify(taskIdsNuevasFilas) !== JSON.stringify(taskIdsEsperadosTablero)) errores.push('HOJA_NEGOCIO_TASK_ID_NO_VINCULADO:' + tablero);

    // Fecha límite (opcional, solo si el fixture la declara y hay
    // exactamente 1 tarea nueva para este tablero — ver docstring de arriba).
    if (esperado.fechaLimiteEsperada !== undefined && nuevasEsperadas === 1) {
      var idxFechaLimite = indiceColumnaPorNombre_(base.valores[deteccionEncabezados.indiceFila], 'Fecha límite');
      var valorFechaLimite = idxFechaLimite === -1 ? undefined : contenido.valores[filasBase][idxFechaLimite];
      var fechaObtenidaISO = formatearFechaLocalISO_(valorFechaLimite);
      if (esperado.fechaLimiteEsperada === null) {
        var estaVacia = valorFechaLimite === '' || valorFechaLimite === undefined || valorFechaLimite === null;
        if (!estaVacia) errores.push('HOJA_NEGOCIO_FECHA_LIMITE_NO_COINCIDE:' + tablero + ':' + (fechaObtenidaISO || 'NO_ES_FECHA'));
      } else if (fechaObtenidaISO !== esperado.fechaLimiteEsperada) {
        errores.push('HOJA_NEGOCIO_FECHA_LIMITE_NO_COINCIDE:' + tablero + ':' + (fechaObtenidaISO || (valorFechaLimite === '' ? 'VACIO' : 'NO_ES_FECHA')));
      }
    }
  });

  return { ok: errores.length === 0, errores: errores };
}

/**
 * Estado actual de la sesión, sin datos sensibles. DELIBERADAMENTE de solo
 * lectura: no accede a Gmail, Sheets, OpenAI ni al pipeline, y no muta ningún
 * dato (solo lee el estado de sesión de UserProperties). Por eso no aplica las
 * barreras fail-closed de proyecto/cuenta: no hay ningún acceso ni mutación
 * que proteger. Cualquier función que sí acceda o mute (preparar/simular/
 * formal/cancelar) sí las aplica.
 */
function mostrarEstado_(amb) {
  var sesion = leerSesion_(amb);
  if (!sesion) {
    logIntegracion_(amb, 'ESTADO', { estado: 'SIN_SESION' });
    return { ok: true, estado: 'SIN_SESION' };
  }
  logIntegracion_(amb, 'ESTADO', { estado: sesion.estado, runId: sesion.runId, caso: sesion.fixtureId, messageId: sesion.messageId || '-' });
  return {
    ok: true, estado: sesion.estado, runId: sesion.runId, caso: sesion.fixtureId,
    marcador: sesion.marcador, asunto: sesion.asuntoEsperado, messageId: sesion.messageId || null
  };
}

/**
 * Cancela la sesión E2E (borra el estado no sensible de UserProperties).
 * Aplica una barrera mínima de proyecto/cuenta autorizados ANTES de borrar,
 * para no permitir que un proyecto o una cuenta no autorizados eliminen el
 * estado (que puede estar bloqueando una FORMAL_EN_CURSO pendiente de
 * revisión). NUNCA toca Gmail, Sheets ni idempotencia: la evidencia de una
 * corrida ya ejecutada se conserva; solo se limpia el estado de sesión.
 */
function cancelarSesion_(amb) {
  if (amb.proyectoAutorizado === 'COMPLETAR_CON_EL_SCRIPT_ID_DEL_PROYECTO_DE_PRUEBA' ||
      amb.scriptId() !== amb.proyectoAutorizado ||
      amb.usuarioEfectivo() !== amb.cuentaAutorizada) {
    logIntegracion_(amb, 'CANCELAR_ABORTADO', { errores: 'NO_AUTORIZADO' });
    return { ok: false, errores: ['NO_AUTORIZADO'], cancelada: false };
  }
  var sesion = leerSesion_(amb);
  borrarSesion_(amb);
  logIntegracion_(amb, 'SESION_CANCELADA', { habia: sesion ? sesion.estado : 'SIN_SESION' });
  return { ok: true, cancelada: !!sesion };
}

// ============================================================================
// FUNCIONES VISIBLES (sin argumentos)
// ============================================================================

function prepararCasoIntegracionFase8Visible() { return prepararCaso_(crearAmbienteIntegracionReal_()); }
function simularYVerificarCasoIntegracionFase8Visible() { return simularYVerificar_(crearAmbienteIntegracionReal_()); }
function ejecutarFormalYVerificarCasoIntegracionFase8Visible() { return ejecutarFormalYVerificar_(crearAmbienteIntegracionReal_()); }
function mostrarEstadoCasoIntegracionFase8Visible() { return mostrarEstado_(crearAmbienteIntegracionReal_()); }
function cancelarSesionIntegracionFase8Visible() { return cancelarSesion_(crearAmbienteIntegracionReal_()); }
