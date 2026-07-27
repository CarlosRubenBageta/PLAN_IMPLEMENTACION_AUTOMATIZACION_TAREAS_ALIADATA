/**
 * ============================================================================
 * BORRADOR — Fase 3 (Refactor estructural), actualizado en Fase 4. NO DESPLEGAR.
 * ============================================================================
 * Este archivo es un entregable documental de la Fase 3 del plan maestro
 * (PLAN_IMPLEMENTACION_AUTOMATIZACION_TAREAS_ALIADATA_v3.md), con los ajustes
 * de la Fase 4 (delegación a los módulos de IA y registro de métricas en
 * Log Mensajes). No fue pegado en el editor de Apps Script ni ejecutado
 * contra Google Workspace. Debe cargarse junto con codigo/esquema_json.gs,
 * codigo/prompts_ia.gs y codigo/cliente_openai.gs en el mismo proyecto de
 * Apps Script.
 *
 * Objetivo de esta fase: separar el script en funciones pequeñas, verificables
 * y recuperables (modularidad, concurrencia, aislamiento de errores por
 * mensaje, búsqueda paginada, orden transaccional de 12 pasos). NO es el
 * objetivo de esta fase finalizar:
 *   - el prompt definitivo ni la política de reintentos de la IA (Fase 4);
 *   - el algoritmo definitivo de IDs y la recuperación fina (Fase 5);
 *   - las reglas de elegibilidad determinística completas (Fase 6);
 *   - el mapa y la sanitización definitiva de escritura en Sheets (Fase 7).
 * Los puntos marcados "PENDIENTE (Fase N)" son placeholders estructurales,
 * no la versión final de esa lógica.
 *
 * Requiere el servicio avanzado "Gmail API" habilitado (DEC-001,
 * auditoria/DECISIONES.md) y los alcances OAuth correspondientes.
 *
 * NOTA (Fase 4): las constantes de valores permitidos y las funciones
 * construirPromptSistema(), consultarIAExtractora(), validarRespuestaIA() y
 * enmascararDatosSensibles() que en la Fase 3 eran placeholders locales
 * fueron trasladadas y reemplazadas por sus versiones definitivas en
 * codigo/esquema_json.gs, codigo/prompts_ia.gs y codigo/cliente_openai.gs.
 *
 * NOTA (Fase 5): generarIdDeterministico(), persistirManifiestoTareas(),
 * reservarTareas() y recuperarProcesamientosAbandonados() (placeholders de
 * la Fase 3) fueron trasladadas y reemplazadas por sus versiones definitivas
 * en codigo/idempotencia.gs y codigo/recuperacion.gs, con el formato de ID
 * final y la reanudación fina desde el manifiesto persistido.
 *
 * NOTA (INC-FASE8-002, 20/07/2026): DRY_RUN=true es un modo SIN PERSISTENCIA.
 * procesarUnMensaje() sale hacia procesarUnMensajeSimulado() antes de
 * cualquier escritura; recuperarProcesamientosAbandonados() y
 * gestionarErrorMensaje() también quedan deshabilitadas en DRY_RUN. Ver
 * documentacion/ESTRATEGIA_IDEMPOTENCIA.md y pruebas/resultados/INCIDENCIAS_FASE_8.md.
 *
 * NOTA (Fase 6): PATRONES_REMITENTE_AUTOMATICO y evaluarFiltroDeterministico()
 * (placeholder de la Fase 3) fueron trasladadas y reemplazadas por su
 * versión definitiva en codigo/filtros_correo.gs, con la regla obligatoria
 * de notificaciones de fallos de Apps Script y señales basadas en
 * encabezados estándar. extraerDatosCorreo() ahora también captura esos
 * encabezados (List-Unsubscribe, Precedence, Auto-Submitted).
 *
 * NOTA (Fase 7): agruparFilasPorHoja(), sanitizarValoresParaSheets(),
 * escribirFilasPorLote(), marcarTareasEscritas() y construirEnlaceCorreo()
 * (placeholders/versión Fase 3-6) fueron trasladadas y reemplazadas por sus
 * versiones definitivas en codigo/escritura_sheets.gs y codigo/sanitizacion.gs,
 * con validación de existencia de hoja, fechas como objetos Date reales y
 * corrección del bug de enlace dependiente de la posición de sesión (CP-24).
 *
 * Este archivo conserva la orquestación y el resto de los módulos
 * estructurales de la Fase 3; en Apps Script, todos los archivos .gs de un
 * mismo proyecto comparten un único ámbito global, por lo que las funciones
 * de esos archivos siguen siendo invocables desde aquí sin declaraciones
 * adicionales. Debe cargarse junto con codigo/idempotencia.gs,
 * codigo/recuperacion.gs, codigo/filtros_correo.gs, codigo/escritura_sheets.gs
 * y codigo/sanitizacion.gs.
 * ============================================================================
 */

// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

var PROP = PropertiesService.getScriptProperties();

var ESTADOS = {
  EN_PROCESO: 'EN_PROCESO',
  PROCESADO: 'PROCESADO',
  SIN_TAREAS: 'SIN_TAREAS',
  REVISION_MANUAL: 'REVISION_MANUAL',
  ERROR_TEMPORAL: 'ERROR_TEMPORAL',
  ERROR_DEFINITIVO: 'ERROR_DEFINITIVO'
};

var ETAPAS = {
  INICIO: 'INICIO',
  CORREO_EXTRAIDO: 'CORREO_EXTRAIDO',
  FILTRO_COMPLETADO: 'FILTRO_COMPLETADO',
  IA_INICIADA: 'IA_INICIADA',
  IA_COMPLETADA: 'IA_COMPLETADA',
  RESPUESTA_VALIDADA: 'RESPUESTA_VALIDADA',
  MANIFIESTO_PERSISTIDO: 'MANIFIESTO_PERSISTIDO',
  TAREAS_RESERVADAS: 'TAREAS_RESERVADAS',
  ESCRITURA_INICIADA: 'ESCRITURA_INICIADA',
  ESCRITURA_COMPLETADA: 'ESCRITURA_COMPLETADA',
  GMAIL_ACTUALIZADO: 'GMAIL_ACTUALIZADO',
  FINALIZADO: 'FINALIZADO'
};

var ESTADOS_ESCRITURA_TAREA = {
  RESERVADA: 'RESERVADA',
  ESCRITA: 'ESCRITA',
  ERROR_ESCRITURA: 'ERROR_ESCRITURA',
  ANULADA: 'ANULADA'
};

// TABLEROS_VALIDOS, PRIORIDADES_VALIDAS, GRUPOS_ORIGEN_VALIDOS y
// RESPONSABLES_VALIDOS: definidos en codigo/esquema_json.gs (Fase 4).

var HOJAS_TECNICAS = {
  LOG_MENSAJES: 'Log Mensajes',
  REGISTRO_TAREAS: 'Registro Tareas',
  INDICE_IDEMPOTENCIA: 'Indice Idempotencia'
};

// PATRONES_REMITENTE_AUTOMATICO y las reglas de elegibilidad: definidas en
// codigo/filtros_correo.gs (Fase 6).

/**
 * H-01 (auditoría Fase 8): lee una propiedad del script y valida que su valor
 * sea exactamente "true" o "false". Cualquier otro valor (ausente, "1",
 * "TRUE", cadena vacía, etc.) se trata como error de configuración explícito:
 * se acumula el mensaje en `errores` y se retorna null. El llamador NO debe
 * asumir ningún valor por defecto cuando el retorno es null — la ejecución
 * abortará al final de validarConfiguracion() si hay errores acumulados.
 */
function leerBooleanoEstricto(nombrePropiedad, errores) {
  var valor = PROP.getProperty(nombrePropiedad);
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  errores.push(nombrePropiedad + ' debe ser exactamente "true" o "false" (valor actual: ' +
    (valor === null ? 'ausente' : '"' + valor + '"') + ').');
  return null;
}

/**
 * Lee y valida la configuración de propiedades del script. No debe asumirse
 * ningún valor por defecto para parámetros críticos: si falta uno, la
 * ejecución debe abortar sin tocar Gmail ni Sheets.
 */
function validarConfiguracion() {
  var errores = [];
  var cfg = {};

  cfg.openaiApiKey = PROP.getProperty('OPENAI_API_KEY');
  if (!cfg.openaiApiKey) errores.push('Falta OPENAI_API_KEY.');

  cfg.openaiModel = PROP.getProperty('OPENAI_MODEL');
  if (!cfg.openaiModel) errores.push('Falta OPENAI_MODEL.');

  cfg.spreadsheetId = PROP.getProperty('SPREADSHEET_ID');
  if (!cfg.spreadsheetId) errores.push('Falta SPREADSHEET_ID.');

  cfg.zonaHoraria = PROP.getProperty('ZONA_HORARIA');
  if (!cfg.zonaHoraria) errores.push('Falta ZONA_HORARIA.');

  cfg.maxMensajesPorEjecucion = parseInt(PROP.getProperty('MAX_MENSAJES_POR_EJECUCION'), 10);
  if (!cfg.maxMensajesPorEjecucion || cfg.maxMensajesPorEjecucion <= 0) {
    errores.push('MAX_MENSAJES_POR_EJECUCION inválido o ausente.');
  }

  // H-03 (auditoría Fase 8): MAX_HILOS reemplazado por MAX_MENSAJES_BUSQUEDA — límite
  // de IDs individuales a obtener de Gmail.Users.Messages.list(), no de hilos.
  cfg.maxMensajesBusqueda = parseInt(PROP.getProperty('MAX_MENSAJES_BUSQUEDA'), 10);
  if (!cfg.maxMensajesBusqueda || cfg.maxMensajesBusqueda <= 0) errores.push('MAX_MENSAJES_BUSQUEDA inválido o ausente.');

  cfg.maxCaracteresCuerpo = parseInt(PROP.getProperty('MAX_CARACTERES_CUERPO'), 10);
  if (!cfg.maxCaracteresCuerpo || cfg.maxCaracteresCuerpo <= 0) {
    errores.push('MAX_CARACTERES_CUERPO inválido o ausente.');
  }

  cfg.tiempoInternoMaxMs = parseInt(PROP.getProperty('TIEMPO_INTERNO_MAX_MS'), 10);
  if (!cfg.tiempoInternoMaxMs || cfg.tiempoInternoMaxMs <= 0) {
    errores.push('TIEMPO_INTERNO_MAX_MS inválido o ausente.');
  }

  cfg.umbralAbandonoMin = parseInt(PROP.getProperty('UMBRAL_ABANDONO_MIN'), 10);
  if (!cfg.umbralAbandonoMin || cfg.umbralAbandonoMin <= 0) {
    errores.push('UMBRAL_ABANDONO_MIN inválido o ausente.');
  }

  cfg.versionScript = PROP.getProperty('VERSION_SCRIPT');
  if (!cfg.versionScript) errores.push('Falta VERSION_SCRIPT.');

  // FECHA_INICIO_CORTE se completa recién en la Fase 9 (ventana de corte).
  // Su ausencia no es un error de configuración en esta fase de borrador,
  // pero si está presente debe ser una fecha ISO válida.
  var fechaCorte = PROP.getProperty('FECHA_INICIO_CORTE');
  if (fechaCorte && isNaN(new Date(fechaCorte).getTime())) {
    errores.push('FECHA_INICIO_CORTE presente pero no es una fecha válida.');
  }
  cfg.fechaInicioCorte = fechaCorte ? new Date(fechaCorte) : null;

  // H-01 (auditoría Fase 8): MODO_PRUEBA y DRY_RUN con validación estricta.
  // Un valor ausente o mal escrito aborta la ejecución en lugar de asumir false.
  cfg.modoPrueba = leerBooleanoEstricto('MODO_PRUEBA', errores);
  cfg.dryRun = leerBooleanoEstricto('DRY_RUN', errores);

  // INC-FASE8-007: MODO_PRUEBA es el selector de entorno — si es inválido (null),
  // el ternario de spreadsheetIdEfectivo y el bloque if/else que siguen tomarían
  // el camino de producción con un valor centinela. Retorno inmediato antes de
  // ejecutar cualquier lógica dependiente del entorno.
  if (cfg.modoPrueba === null) {
    Logger.log(
      'validarConfiguracion(): configuración inválida:\n' +
      errores.join('\n')
    );
    return { valido: false, errores: errores, cfg: null };
  }

  cfg.spreadsheetIdPrueba = PROP.getProperty('SPREADSHEET_ID_PRUEBA');

  if (cfg.modoPrueba) {
    if (!cfg.spreadsheetIdPrueba) {
      errores.push('MODO_PRUEBA=true pero falta SPREADSHEET_ID_PRUEBA.');
    } else if (cfg.spreadsheetIdPrueba === cfg.spreadsheetId) {
      // Regla dura: nunca correr en modo prueba contra la planilla productiva (CP-27).
      errores.push('SPREADSHEET_ID_PRUEBA coincide con el SPREADSHEET_ID productivo: abortar.');
    }

    // H-02 (auditoría Fase 8): GMAIL_QUERY_PRUEBA y ETIQUETA_PRUEBA son obligatorias
    // cuando MODO_PRUEBA=true. Sin fallback a 'in:inbox' — la ausencia aborta.
    var gmailQueryPrueba = PROP.getProperty('GMAIL_QUERY_PRUEBA');
    var etiquetaPrueba = PROP.getProperty('ETIQUETA_PRUEBA');
    if (!gmailQueryPrueba) {
      errores.push('MODO_PRUEBA=true pero falta GMAIL_QUERY_PRUEBA (sin fallback — el valor es obligatorio).');
    }
    if (!etiquetaPrueba) {
      errores.push('MODO_PRUEBA=true pero falta ETIQUETA_PRUEBA.');
    }
    if (gmailQueryPrueba && etiquetaPrueba && gmailQueryPrueba.indexOf('label:' + etiquetaPrueba) === -1) {
      errores.push('GMAIL_QUERY_PRUEBA debe contener "label:' + etiquetaPrueba + '" para garantizar aislamiento de la prueba.');
    }
    cfg.etiquetaPrueba = etiquetaPrueba || '';
    cfg.gmailQueryEfectiva = gmailQueryPrueba || '';
  } else {
    cfg.etiquetaPrueba = '';
    cfg.gmailQueryEfectiva = 'in:inbox';
  }

  cfg.spreadsheetIdEfectivo = cfg.modoPrueba ? cfg.spreadsheetIdPrueba : cfg.spreadsheetId;

  // INC-FASE8-004 + H-01 (auditoría Fase 8): PERMITIR_ETIQUETADO y PERMITIR_ARCHIVADO
  // se leen con leerBooleanoEstricto() — uniformiza la validación con MODO_PRUEBA y
  // DRY_RUN. El resultado semántico es idéntico al de INC-FASE8-004: solo "true" o
  // "false" son valores aceptados; cualquier otro abortaría la ejecución.
  // aplicarResultadoGmail() consume cfg.permitirEtiquetado/cfg.permitirArchivado
  // directamente y nunca vuelve a consultar PropertiesService.
  cfg.permitirEtiquetado = leerBooleanoEstricto('PERMITIR_ETIQUETADO', errores);
  cfg.permitirArchivado = leerBooleanoEstricto('PERMITIR_ARCHIVADO', errores);

  // H-09 (auditoría Fase 8): CUENTA_OPERATIVA como propiedad obligatoria del script
  // (DEC-008). Elimina la constante hardcodeada 'tareas@alia-data.com' de
  // codigo/escritura_sheets.gs y permite configurarla por entorno sin tocar código.
  cfg.cuentaOperativa = PROP.getProperty('CUENTA_OPERATIVA');
  if (!cfg.cuentaOperativa) errores.push('Falta CUENTA_OPERATIVA.');

  cfg.idsEtiquetas = {
    Procesado: PROP.getProperty('ID_ETIQUETA_PROCESADO'),
    RevisionSinTareas: PROP.getProperty('ID_ETIQUETA_REVISION_SIN_TAREAS'),
    RevisionErrorProcesamiento: PROP.getProperty('ID_ETIQUETA_REVISION_ERROR_PROCESAMIENTO'),
    RevisionErrorAutomatizacion: PROP.getProperty('ID_ETIQUETA_REVISION_ERROR_AUTOMATIZACION')
  };
  // INC-FASE8-004: los IDs de etiqueta solo son obligatorios cuando
  // efectivamente se van a usar. Si PERMITIR_ETIQUETADO=false, ninguna
  // etiqueta se aplica nunca, y exigir estos IDs abortaría la ejecución por
  // una configuración que en los hechos es válida y deliberada.
  if (cfg.permitirEtiquetado) {
    Object.keys(cfg.idsEtiquetas).forEach(function (clave) {
      if (!cfg.idsEtiquetas[clave]) {
        errores.push('Falta el ID interno de etiqueta para: ' + clave + ' (requiere Gmail API habilitada, sección 7.3 del plan).');
      }
    });
  }

  if (errores.length > 0) {
    Logger.log('validarConfiguracion(): configuración inválida:\n' + errores.join('\n'));
    return { valido: false, errores: errores, cfg: null };
  }

  // Validar que las hojas de destino y las hojas técnicas existan antes de tocar nada.
  try {
    var planilla = SpreadsheetApp.openById(cfg.spreadsheetIdEfectivo);
    // H-04 (auditoría Fase 8): solo se validan las 3 hojas técnicas (DEC-006).
    // Las hojas de negocio se validan en escribirFilasPorLote() al momento de
    // escribir, y su ausencia envía el mensaje a revisión manual en lugar de
    // abortar toda la ejecución.
    Object.values(HOJAS_TECNICAS).forEach(function (nombreHoja) {
      if (!planilla.getSheetByName(nombreHoja)) {
        errores.push('No existe la hoja técnica "' + nombreHoja + '" en la planilla configurada.');
      }
    });
  } catch (e) {
    errores.push('No se pudo abrir la planilla configurada (SpreadsheetApp.openById): ' + e.message);
  }

  if (errores.length > 0) {
    Logger.log('validarConfiguracion(): configuración inválida:\n' + errores.join('\n'));
    return { valido: false, errores: errores, cfg: null };
  }

  return { valido: true, errores: [], cfg: cfg };
}

// ============================================================================
// PUNTO DE ENTRADA Y CONTROL DE CONCURRENCIA
// ============================================================================

/**
 * Función del activador (cada 10 minutos). Reemplaza a la función homónima
 * de codigo/script_actual.gs, ahora modular y con control de concurrencia.
 *
 * Refacción Fase 2A (23/07/2026, ver auditoria/CHANGELOG.md): la lógica de
 * procesamiento propiamente dicha (recuperación de abandonados, obtención de
 * mensajes y bucle de procesamiento) se extrajo al núcleo privado
 * procesarCorreosDeTareasConConfiguracion_(cfg, opciones). Esta función
 * conserva EXACTAMENTE su firma y su comportamiento externo previos:
 * adquiere el ScriptLock, valida la configuración vía validarConfiguracion()
 * (que lee ScriptProperties y abre la planilla) y delega en el núcleo con
 * opciones={}, lo que preserva la recuperación de abandonados en producción
 * (se ejecuta salvo en DRY_RUN, igual que antes).
 *
 * El automatizador de integración (pruebas/automatizador_integracion_fase8.gs)
 * adquiere su PROPIO ScriptLock y llama directamente al núcleo con un cfg
 * construido en memoria y opciones.omitirRecuperacion=true; nunca invoca a
 * esta función productiva ni modifica ScriptProperties.
 */
function procesarCorreosDeTareas() {
  var lock = LockService.getScriptLock();
  var obtuvoLock = false;

  try {
    obtuvoLock = lock.tryLock(5000);
    if (!obtuvoLock) {
      Logger.log('procesarCorreosDeTareas(): no se pudo obtener el lock; ejecución en curso. Se omite esta corrida.');
      return;
    }

    // INICIO INSTRUMENTACIÓN TEMPORAL CP-13 (auditoria/CHANGELOG.md, 26/07/2026) — RETIRAR TRAS LA CORRIDA REAL.
    // Extiende artificialmente el tiempo que se mantiene el lock, para que
    // una segunda ejecución disparada manualmente unos segundos después
    // tenga una ventana cómoda para encontrar el lock ya tomado, sin
    // depender de que el procesamiento real tarde más de los 5000 ms de
    // tryLock() por casualidad. Gateada por MODO_PRUEBA (property cruda,
    // cfg todavía no existe en este punto) y por una property exclusiva de
    // esta prueba; nunca puede dispararse en la cuenta productiva.
    if (PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA') === 'true' &&
        PropertiesService.getScriptProperties().getProperty('CP13_EXTENDER_LOCK') === 'true') {
      Logger.log('CP-13: manteniendo el lock 15 segundos adicionales (instrumentación temporal de prueba) para dar tiempo a disparar una segunda ejecución.');
      Utilities.sleep(15000);
    }
    // FIN INSTRUMENTACIÓN TEMPORAL CP-13

    var validacion = validarConfiguracion();
    if (!validacion.valido) {
      // Regla dura: si falla la validación crítica, no tocar Gmail ni Sheets.
      Logger.log('procesarCorreosDeTareas(): abortando por configuración inválida:\n' + validacion.errores.join('\n'));
      return;
    }

    // opciones={} preserva el comportamiento productivo previo: la
    // recuperación de abandonados se ejecuta salvo en DRY_RUN.
    procesarCorreosDeTareasConConfiguracion_(validacion.cfg, {});
  } finally {
    if (obtuvoLock) lock.releaseLock();
  }
}

/**
 * Núcleo de procesamiento extraído de procesarCorreosDeTareas() (Fase 2A).
 * NO adquiere el ScriptLock ni lee ScriptProperties: recibe un cfg ya
 * validado (por validarConfiguracion() en el flujo productivo, o construido
 * en memoria por el automatizador de integración) y unas opciones.
 *
 * opciones.omitirRecuperacion (boolean, por defecto false): cuando es true,
 * NO se ejecuta recuperarProcesamientosAbandonados(), aunque cfg.dryRun sea
 * false. Lo usa el automatizador de integración E2E, que procesa un único
 * mensaje recién enviado y no debe arrastrar mensajes abandonados de otras
 * corridas. En el flujo productivo el llamador pasa opciones={} y la
 * recuperación se ejecuta exactamente como antes (salvo en DRY_RUN,
 * INC-FASE8-002).
 *
 * El límite de mensajes por tanda se toma de cfg.maxMensajesPorEjecucion,
 * igual que antes; el automatizador lo fija en 1 dentro de su cfg en memoria.
 * No se duplica ninguna lógica de obtención de mensajes, procesamiento de un
 * mensaje ni escritura: se reutilizan obtenerMensajesPendientesDesdeGmail(),
 * procesarUnMensaje() y gestionarErrorMensaje() tal cual.
 *
 * Retorno (Fase 2A, revisión correctiva 23/07/2026; ampliado 24/07/2026): un
 * resumen estructurado SIN texto libre, para que el automatizador de
 * integración pueda comprobar qué se procesó realmente:
 *   {
 *     mensajesElegibles,        // número de mensajes que devolvió la búsqueda
 *     limiteCalculado,          // min(mensajesElegibles, maxMensajesPorEjecucion)
 *     messageIdsIntentados,     // ids de Gmail efectivamente intentados (no texto libre)
 *     cantidadIntentada,        // messageIdsIntentados.length
 *     cantidadConErrorAislado,  // cuántos lanzaron y fueron a gestionarErrorMensaje()
 *     detenidoPorTiempo,        // true si se cortó la tanda por el límite interno
 *     resultadosSimulados       // [{messageId, resultado}] — solo poblado en
 *                                // DRY_RUN (ver procesarUnMensajeSimulado());
 *                                // [] en producción, donde procesarUnMensaje()
 *                                // no devuelve nada.
 *   }
 * procesarCorreosDeTareas() (producción) ignora este retorno.
 */
function procesarCorreosDeTareasConConfiguracion_(cfg, opciones) {
  opciones = opciones || {};
  var inicioEjecucion = Date.now();

  // INC-FASE8-002: DRY_RUN es un modo sin persistencia. Recuperar mensajes
  // abandonados implica escribir en Registro Tareas, Log Mensajes e
  // Indice Idempotencia (vía reanudarDesdeManifiesto()) — nunca debe
  // ejecutarse durante una corrida en DRY_RUN, aunque el mensaje abandonado
  // provenga de una ejecución real anterior. Fase 2A: omitirRecuperacion
  // permite al automatizador E2E saltarse la recuperación también en una
  // ejecución formal (dryRun=false) de un único mensaje nuevo.
  if (opciones.omitirRecuperacion) {
    Logger.log('procesarCorreosDeTareasConConfiguracion_(): recuperación de abandonados omitida por opciones.omitirRecuperacion.');
  } else if (cfg.dryRun) {
    Logger.log('procesarCorreosDeTareas(): DRY_RUN=true, se omite recuperarProcesamientosAbandonados() (no debe persistir ni recuperar mensajes reales durante una simulación).');
  } else {
    recuperarProcesamientosAbandonados(cfg);
  }

  var mensajes = obtenerMensajesPendientesDesdeGmail(cfg);

  var limite = Math.min(mensajes.length, cfg.maxMensajesPorEjecucion);
  Logger.log('procesarCorreosDeTareas(): ' + mensajes.length + ' mensajes elegibles, procesando ' + limite + '.');

  var messageIdsIntentados = [];
  var cantidadConErrorAislado = 0;
  var detenidoPorTiempo = false;
  var resultadosSimulados = [];

  for (var i = 0; i < limite; i++) {
    if (Date.now() - inicioEjecucion > cfg.tiempoInternoMaxMs) {
      Logger.log('procesarCorreosDeTareas(): límite de tiempo interno alcanzado, deteniendo la tanda.');
      detenidoPorTiempo = true;
      break;
    }

    var mensajeDescriptor = mensajes[i];
    messageIdsIntentados.push(mensajeDescriptor.messageId);
    try {
      var resultadoMensaje = procesarUnMensaje(mensajeDescriptor, cfg);
      // procesarUnMensaje() solo devuelve algo en la rama DRY_RUN (ver
      // procesarUnMensajeSimulado()); en producción resultadoMensaje es
      // undefined y simplemente no se agrega nada aquí.
      if (cfg.dryRun && resultadoMensaje) {
        resultadosSimulados.push({ messageId: mensajeDescriptor.messageId, resultado: resultadoMensaje });
      }
    } catch (errorMensaje) {
      // Aislamiento de errores por mensaje: una excepción aquí NO debe
      // interrumpir el resto de la tanda (a diferencia de script_actual.gs).
      cantidadConErrorAislado++;
      gestionarErrorMensaje(mensajeDescriptor, errorMensaje, cfg);
    }
  }

  return {
    mensajesElegibles: mensajes.length,
    limiteCalculado: limite,
    messageIdsIntentados: messageIdsIntentados,
    cantidadIntentada: messageIdsIntentados.length,
    cantidadConErrorAislado: cantidadConErrorAislado,
    detenidoPorTiempo: detenidoPorTiempo,
    resultadosSimulados: resultadosSimulados
  };
}

// ============================================================================
// OBTENCIÓN DE MENSAJES PENDIENTES (por mensaje individual, Gmail API)
// ============================================================================

/**
 * Descubrimiento de mensajes pendientes por ID individual usando
 * Gmail.Users.Messages.list() (DEC-005, H-03). Reemplaza GmailApp.search()
 * + hilo.getMessages() del diseño anterior.
 *
 * El diseño anterior buscaba hilos y luego expandía TODOS sus mensajes con
 * hilo.getMessages(), arrastrando mensajes que nunca coincidían con la
 * consulta (p. ej., mensajes archivados o de otras carpetas del mismo hilo).
 * Eso impedía el aislamiento entre casos de prueba (CP-36): si el mensaje A
 * coincide con la consulta pero el mensaje B del mismo hilo no, el diseño
 * anterior procesaba B igual. Con Gmail.Users.Messages.list(), solo aparecen
 * los IDs de mensajes que realmente satisfacen la consulta.
 *
 * Luego se obtiene el objeto GmailMessage por ID individual con
 * GmailApp.getMessageById() para leer cuerpo y encabezados.
 *
 * Filtros aplicados antes de incluir un mensaje en el resultado:
 *  - Mensajes ya registrados con estado terminal en Indice Idempotencia.
 *  - Mensajes anteriores a FECHA_INICIO_CORTE (si está definida).
 * Límite total: cfg.maxMensajesBusqueda IDs obtenidos de la API.
 */
function obtenerMensajesPendientesDesdeGmail(cfg) {
  var idsProcesados = obtenerIdsYaProcesados(cfg);
  var pendientes = [];
  var pageToken = null;
  var totalObtenidos = 0;

  do {
    var parametros = {
      maxResults: Math.min(50, cfg.maxMensajesBusqueda - totalObtenidos),
      q: cfg.gmailQueryEfectiva
    };
    if (pageToken) parametros.pageToken = pageToken;

    var pagina = Gmail.Users.Messages.list('me', parametros);
    if (!pagina || !pagina.messages) break;

    pagina.messages.forEach(function (registro) {
      if (totalObtenidos >= cfg.maxMensajesBusqueda) return;
      var messageId = registro.id;
      totalObtenidos++;

      if (idsProcesados.has(messageId)) return; // Ya tiene estado terminal.

      var mensaje = GmailApp.getMessageById(messageId);
      if (!mensaje) return;

      if (cfg.fechaInicioCorte && mensaje.getDate() < cfg.fechaInicioCorte) {
        Logger.log('Mensaje ' + messageId + ' excluido por antigüedad (anterior a FECHA_INICIO_CORTE).');
        return;
      }

      pendientes.push({
        messageId: messageId,
        threadId: registro.threadId,
        mensaje: mensaje
      });
    });

    pageToken = pagina.nextPageToken;
  } while (pageToken && totalObtenidos < cfg.maxMensajesBusqueda);

  pendientes.sort(function(a, b) {
    var fechaA = a.mensaje.getDate().getTime();
    var fechaB = b.mensaje.getDate().getTime();
    if (fechaA !== fechaB) return fechaA - fechaB;
    return a.messageId < b.messageId ? -1 : a.messageId > b.messageId ? 1 : 0;
  });
  return pendientes;
}

/**
 * Lee los message_id con estado_final ya registrado en Indice Idempotencia.
 * Esta es la única fuente de verdad contra duplicados (R-01 en MATRIZ_RIESGOS.md).
 */
function obtenerIdsYaProcesados(cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.INDICE_IDEMPOTENCIA, cfg);
  var datos = hoja.getDataRange().getValues();
  var idsProcesados = new Set();
  // Fila 0 = encabezados (message_id, task_id, estado_final, fecha).
  for (var i = 1; i < datos.length; i++) {
    idsProcesados.add(String(datos[i][0]));
  }
  return idsProcesados;
}

// ============================================================================
// PROCESAMIENTO DE UN MENSAJE (orden transaccional de 12 pasos)
// ============================================================================

/**
 * Orquesta el procesamiento de un único mensaje siguiendo el orden
 * transaccional obligatorio del plan v3 (sección "Fase 3"). Cada paso
 * actualiza la etapa en Log Mensajes para permitir recuperación fina
 * (detalle completo de recuperación: Fase 5).
 *
 * Corrección INC-FASE8-002 (20/07/2026): `DRY_RUN=true` es un modo SIN
 * PERSISTENCIA — puede leer Gmail, consultar OpenAI, construir y validar
 * tareas en memoria y emitir logs seguros, pero no debe escribir en ninguna
 * hoja (de negocio ni técnica), no debe etiquetar/archivar Gmail, y por lo
 * tanto nunca debe impedir que el mismo mensaje se procese después con
 * `DRY_RUN=false`. Por eso la salida hacia el modo simulado ocurre aquí,
 * como primera línea de la función, ANTES de `registrarInicioProcesamiento()`
 * (el primer punto de persistencia del flujo real). Ver
 * `procesarUnMensajeSimulado()` y `documentacion/ESTRATEGIA_IDEMPOTENCIA.md`.
 *
 * Corrección INC-FASE8-005 (20/07/2026): antes de iniciar el flujo normal,
 * se comprueba si ya existe un manifiesto persistido para este mensaje (de
 * un intento anterior interrumpido en o después de MANIFIESTO_PERSISTIDO,
 * detectado por `gestionarErrorMensaje()` como ERROR_TEMPORAL sin cerrar el
 * mensaje). Si existe, se reanuda directamente desde ahí — sin volver a
 * llamar a `registrarInicioProcesamiento()` (resetearía la etapa a INICIO,
 * perdiendo evidencia de hasta dónde llegó el intento anterior), sin volver
 * a consultar la IA y sin generar un manifiesto nuevo. Esto también cubre
 * CP-26 (caída después de reservar tareas) desde la MISMA ejecución
 * siguiente, sin depender de `recuperarProcesamientosAbandonados()` ni de
 * esperar `UMBRAL_ABANDONO_MIN`.
 */
function procesarUnMensaje(mensajeDescriptor, cfg) {
  if (cfg.dryRun) {
    // Fase 2A (24/07/2026): se propaga el retorno estructurado de la
    // simulación (ver procesarUnMensajeSimulado()) para que el automatizador
    // de integración pueda comparar la clasificación obtenida sin parsear
    // texto de log. La rama de producción (abajo) no cambia.
    return procesarUnMensajeSimulado(mensajeDescriptor, cfg);
  }

  var manifiestoExistente = obtenerManifiestoPersistido(mensajeDescriptor.messageId, cfg);
  if (manifiestoExistente.length > 0) {
    Logger.log('procesarUnMensaje(): existe manifiesto para ' + mensajeDescriptor.messageId + '; se reanuda sin volver a consultar la IA.');
    reanudarDesdeManifiesto(mensajeDescriptor, cfg);
    return;
  }

  // Paso 1: registrar EN_PROCESO / INICIO.
  registrarInicioProcesamiento(mensajeDescriptor, cfg);

  // Paso 2: extraer y normalizar (solo contenido nuevo).
  var datosCorreo = extraerDatosCorreo(mensajeDescriptor, cfg);
  actualizarLogMensajes(mensajeDescriptor, {
    etapa: ETAPAS.CORREO_EXTRAIDO,
    cuerpo_truncado: datosCorreo.cuerpoTruncado,
    longitud_original: datosCorreo.longitudOriginal,
    longitud_normalizada: datosCorreo.longitudNormalizada
  }, cfg);

  // Filtro determinístico de elegibilidad (antes de invocar a la IA).
  var filtro = evaluarFiltroDeterministico(datosCorreo);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.FILTRO_COMPLETADO }, cfg);

  if (!filtro.elegible) {
    // claveEtiqueta distingue "Sin tareas detectadas" de "Error de
    // automatización" (regla obligatoria de Apps Script, Fase 6).
    finalizarMensajeSinTareas(mensajeDescriptor, ESTADOS.SIN_TAREAS, filtro.motivo, cfg, filtro.claveEtiqueta);
    return;
  }

  // Paso 3: obtener y validar clasificación.
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.IA_INICIADA }, cfg);
  var respuestaIA = consultarIAExtractora(datosCorreo, cfg);
  actualizarLogMensajes(mensajeDescriptor, {
    etapa: ETAPAS.IA_COMPLETADA,
    modelo: cfg.openaiModel,
    tokens_entrada: respuestaIA.tokensEntrada,
    tokens_salida: respuestaIA.tokensSalida,
    tokens_totales: (respuestaIA.tokensEntrada || 0) + (respuestaIA.tokensSalida || 0),
    costo_estimado: respuestaIA.costoEstimado != null ? respuestaIA.costoEstimado : '',
    codigo_http: respuestaIA.codigoHttp,
    request_id: respuestaIA.requestId,
    duracion_llamada_ia: respuestaIA.duracionSegundos,
    intentos: respuestaIA.intentos || 1
  }, cfg);

  var validacionIA = validarRespuestaIA(respuestaIA);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.RESPUESTA_VALIDADA }, cfg);

  if (!validacionIA.valida) {
    finalizarMensajeSinTareas(mensajeDescriptor, ESTADOS.REVISION_MANUAL, validacionIA.motivo, cfg, 'RevisionErrorProcesamiento');
    return;
  }

  if (validacionIA.datos.requiere_revision) {
    finalizarMensajeSinTareas(mensajeDescriptor, ESTADOS.REVISION_MANUAL, validacionIA.datos.motivo_revision, cfg, 'RevisionErrorProcesamiento');
    return;
  }

  if (!validacionIA.datos.correo_relevante || validacionIA.datos.observaciones.length === 0) {
    finalizarMensajeSinTareas(mensajeDescriptor, ESTADOS.SIN_TAREAS, validacionIA.datos.motivo_sin_tareas, cfg, 'RevisionSinTareas');
    return;
  }

  // Paso 4: generar tareas normalizadas (observaciones → tareas → filas).
  var tareas = generarTareasNormalizadas(validacionIA.datos, datosCorreo, mensajeDescriptor);

  if (tareas.length === 0) {
    finalizarMensajeSinTareas(mensajeDescriptor, ESTADOS.SIN_TAREAS, 'Todas las observaciones generaron cero tareas.', cfg, 'RevisionSinTareas');
    return;
  }

  // Paso 4-5: persistir el manifiesto de tareas y reservarlas (Fase 5:
  // persistirManifiestoTareas() asigna los IDs UNA SOLA VEZ, sobre el
  // manifiesto persistido, y escribe las filas RESERVADA en un mismo paso
  // atómico; ver documentacion/ESTRATEGIA_IDEMPOTENCIA.md).
  var tareasConId = persistirManifiestoTareas(mensajeDescriptor, tareas, cfg);
  tareasConId.forEach(function (tarea) { tarea.datosCorreo = datosCorreo; });
  actualizarLogMensajes(mensajeDescriptor, {
    etapa: ETAPAS.MANIFIESTO_PERSISTIDO,
    cantidad_observaciones: validacionIA.datos.observaciones.length,
    cantidad_tareas: tareasConId.length
  }, cfg);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.TAREAS_RESERVADAS }, cfg);
  tareas = tareasConId;

  // Paso 6-7: escribir tareas por lote y marcarlas ESCRITAS.
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.ESCRITURA_INICIADA }, cfg);
  var filasPorHoja = agruparFilasPorHoja(tareas);
  var resultadoEscritura = escribirFilasPorLote(filasPorHoja, cfg);
  marcarTareasEscritas(tareas, resultadoEscritura, cfg);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.ESCRITURA_COMPLETADA }, cfg);

  // Fase 7: si alguna tarea no pudo escribirse (p. ej. la hoja de destino no
  // existe), el mensaje se envía a revisión manual en lugar de marcarse
  // PROCESADO, aunque otras tareas del mismo mensaje sí se hayan escrito
  // (regla dura: nunca usar una hoja por defecto silenciosa).
  var huboFallaEscritura = tareas.some(function (tarea) {
    var res = resultadoEscritura[tarea.taskId];
    return !res || !res.escrita;
  });

  // Paso 9-10: actualizar Gmail por mensaje individual.
  aplicarResultadoGmail(mensajeDescriptor, huboFallaEscritura ? 'RevisionErrorProcesamiento' : 'Procesado', cfg);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.GMAIL_ACTUALIZADO }, cfg);

  // Paso 11-12: marcar el mensaje y cerrar en Indice Idempotencia.
  finalizarMensaje(mensajeDescriptor, huboFallaEscritura ? ESTADOS.REVISION_MANUAL : ESTADOS.PROCESADO, tareas, cfg);
}

/**
 * Corrección INC-FASE8-002: ejecuta el mismo análisis en memoria que
 * procesarUnMensaje() —extracción, filtro determinístico, consulta a la IA,
 * validación y generación de tareas normalizadas— pero NUNCA llama a una
 * función de persistencia. Deliberadamente NO llama a:
 * registrarInicioProcesamiento(), actualizarLogMensajes(),
 * persistirManifiestoTareas(), escribirFilasPorLote(), marcarTareasEscritas(),
 * aplicarResultadoGmail(), finalizarMensaje() ni finalizarMensajeSinTareas().
 * Si una futura modificación necesita agregar alguna de esas llamadas aquí,
 * debe revisarse primero documentacion/ESTRATEGIA_IDEMPOTENCIA.md y el
 * criterio de "DRY_RUN sin persistencia" (INC-FASE8-002).
 *
 * El log emitido es intencionalmente mínimo y seguro: cantidad de
 * observaciones, cantidad de tareas, tablero y prioridad de cada una, y una
 * confirmación explícita de que no hubo escrituras. Nunca incluye `cfg`,
 * `options` ni el cuerpo del correo (ver pruebas/debug_seguro_pruebas.gs
 * para instrumentación adicional si hiciera falta depurar más a fondo).
 *
 * Retorno (24/07/2026): además de loguear, devuelve un resumen estructurado
 * y seguro — SOLO categorías fijas, conteos y nombres de tablero (valores de
 * catálogo ya públicos, nunca resumen/texto_original/motivo_*) — para que el
 * automatizador de integración (pruebas/) pueda comparar la clasificación
 * real contra lo que un fixture espera SIN parsear el texto del log:
 *   { resultado, cantidadObservaciones, cantidadTareas, tableros }
 * `resultado` es uno de: 'NO_ELEGIBLE', 'RESPUESTA_IA_INVALIDA',
 * 'REQUIERE_REVISION', 'SIN_TAREAS', 'TAREAS_SIMULADAS'. `tableros` es un
 * arreglo de los nombres de tablero de las tareas simuladas (vacío si no
 * hay tareas); nunca incluye prioridad, resumen ni texto original.
 */
function procesarUnMensajeSimulado(mensajeDescriptor, cfg) {
  var datosCorreo = extraerDatosCorreo(mensajeDescriptor, cfg);
  var filtro = evaluarFiltroDeterministico(datosCorreo);

  if (!filtro.elegible) {
    Logger.log('[DRY_RUN] ' + mensajeDescriptor.messageId + ': descartado por filtro determinístico (' + filtro.motivo + '). Sin escrituras.');
    return { resultado: 'NO_ELEGIBLE', cantidadObservaciones: null, cantidadTareas: null, tableros: [] };
  }

  var respuestaIA = consultarIAExtractora(datosCorreo, cfg);
  var validacionIA = validarRespuestaIA(respuestaIA);

  // H-13 (auditoría Fase 8): logs [DRY_RUN] sin texto libre generado por la IA.
  // motivo_revision, motivo_sin_tareas y validacionIA.motivo son campos de texto libre
  // producidos por el modelo a partir del contenido del correo — incluirlos en el log
  // expondría datos de negocio que no deben aparecer en registros de ejecución.
  // Se registran solo indicadores categóricos y conteos.
  if (!validacionIA.valida) {
    Logger.log('[DRY_RUN] message_id=' + mensajeDescriptor.messageId + ' resultado=RESPUESTA_IA_INVALIDA. Sin escrituras.');
    return { resultado: 'RESPUESTA_IA_INVALIDA', cantidadObservaciones: null, cantidadTareas: null, tableros: [] };
  }

  if (validacionIA.datos.requiere_revision) {
    Logger.log('[DRY_RUN] message_id=' + mensajeDescriptor.messageId + ' resultado=REQUIERE_REVISION. Sin escrituras.');
    return { resultado: 'REQUIERE_REVISION', cantidadObservaciones: null, cantidadTareas: null, tableros: [] };
  }

  if (!validacionIA.datos.correo_relevante || validacionIA.datos.observaciones.length === 0) {
    Logger.log('[DRY_RUN] message_id=' + mensajeDescriptor.messageId + ' resultado=SIN_TAREAS correo_relevante=' + validacionIA.datos.correo_relevante + ' observaciones=' + validacionIA.datos.observaciones.length + '. Sin escrituras.');
    return { resultado: 'SIN_TAREAS', cantidadObservaciones: validacionIA.datos.observaciones.length, cantidadTareas: 0, tableros: [] };
  }

  var tareas = generarTareasNormalizadas(validacionIA.datos, datosCorreo, mensajeDescriptor);

  if (tareas.length === 0) {
    Logger.log('[DRY_RUN] ' + mensajeDescriptor.messageId + ': todas las observaciones generaron cero tareas. Sin escrituras.');
    return { resultado: 'SIN_TAREAS', cantidadObservaciones: validacionIA.datos.observaciones.length, cantidadTareas: 0, tableros: [] };
  }

  var resumenTareas = tareas.map(function (tarea) {
    return tarea.tablero + '/' + tarea.prioridad;
  }).join(', ');

  Logger.log('[DRY_RUN] ' + mensajeDescriptor.messageId + ': ' +
    validacionIA.datos.observaciones.length + ' observación(es), ' +
    tareas.length + ' tarea(s) simulada(s) [' + resumenTareas + ']. ' +
    'Sin escrituras en hojas de negocio, hojas técnicas ni Gmail.');

  return {
    resultado: 'TAREAS_SIMULADAS',
    cantidadObservaciones: validacionIA.datos.observaciones.length,
    cantidadTareas: tareas.length,
    tableros: tareas.map(function (tarea) { return tarea.tablero; })
  };
}

/** Camino común para mensajes que no generan tareas (SIN_TAREAS o REVISION_MANUAL). */
function finalizarMensajeSinTareas(mensajeDescriptor, estadoFinal, motivo, cfg, claveEtiqueta) {
  actualizarLogMensajes(mensajeDescriptor, { estado: estadoFinal, error: motivo || '' }, cfg);
  aplicarResultadoGmail(mensajeDescriptor, claveEtiqueta, cfg);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.GMAIL_ACTUALIZADO }, cfg);
  finalizarMensaje(mensajeDescriptor, estadoFinal, [], cfg);
}

/** Cierra el registro del mensaje: FINALIZADO en Log Mensajes + fila(s) en Indice Idempotencia. */
function finalizarMensaje(mensajeDescriptor, estadoFinal, tareas, cfg) {
  actualizarLogMensajes(mensajeDescriptor, { estado: estadoFinal, etapa: ETAPAS.FINALIZADO, fecha_fin: new Date() }, cfg);

  var hojaIndice = obtenerHojaTecnica(HOJAS_TECNICAS.INDICE_IDEMPOTENCIA, cfg);
  var filas;
  if (tareas.length === 0) {
    filas = [[mensajeDescriptor.messageId, '', estadoFinal, new Date()]];
  } else {
    filas = tareas.map(function (t) {
      return [mensajeDescriptor.messageId, t.taskId, estadoFinal, new Date()];
    });
  }
  hojaIndice.getRange(hojaIndice.getLastRow() + 1, 1, filas.length, 4).setValues(filas);
}

// ============================================================================
// EXTRACCIÓN Y NORMALIZACIÓN DE CONTENIDO
// ============================================================================

function extraerDatosCorreo(mensajeDescriptor, cfg) {
  var mensaje = mensajeDescriptor.mensaje;
  var cuerpoOriginal = mensaje.getPlainBody();
  var soloContenidoNuevo = extraerContenidoNuevo(cuerpoOriginal);
  var normalizado = normalizarCuerpo(soloContenidoNuevo, cfg);
  var enmascarado = enmascararDatosSensibles(normalizado.texto);

  return {
    messageId: mensajeDescriptor.messageId,
    threadId: mensajeDescriptor.threadId,
    remitente: mensaje.getFrom(),
    asunto: mensaje.getSubject(),
    cuerpo: enmascarado,
    cuerpoTruncado: normalizado.truncado,
    longitudOriginal: cuerpoOriginal.length,
    longitudNormalizada: normalizado.texto.length,
    fecha: mensaje.getDate(),
    link: construirEnlaceCorreo(mensaje, cfg),
    // Encabezados estándar usados por el filtro determinístico de la Fase 6
    // (documentacion/REGLAS_ELEGIBILIDAD.md) para detectar boletines,
    // comunicaciones masivas y respuestas automáticas sin depender de
    // palabras sueltas del asunto o del cuerpo.
    encabezados: {
      listUnsubscribe: mensaje.getHeader('List-Unsubscribe'),
      precedence: mensaje.getHeader('Precedence'),
      autoSubmitted: mensaje.getHeader('Auto-Submitted')
    }
  };
}

/**
 * Trunca y normaliza espacios/saltos de línea. Registra si hubo truncamiento
 * (D-09/R-10 en la documentación de Fase 1: el cuerpo sin límite es un
 * agravante de "runtime exited unexpectedly").
 */
function normalizarCuerpo(texto, cfg) {
  var limpio = texto.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  var truncado = false;
  if (limpio.length > cfg.maxCaracteresCuerpo) {
    limpio = limpio.substring(0, cfg.maxCaracteresCuerpo);
    truncado = true;
  }
  return { texto: limpio, truncado: truncado };
}

/**
 * Elimina historial citado, encabezados de reenvío y firmas, dejando solo
 * el contenido nuevo de una respuesta (heurística basada en marcadores
 * comunes de Gmail/clientes de correo).
 *
 * INC-FASE8-008 (revisión 22/07/2026): una versión anterior de este
 * comentario atribuía el fallo observado en CP-19 a que ^/$ en modo
 * multilínea de JavaScript no reconocían \r, y afirmaba que el patrón
 * original fallaba "sistemáticamente" con cuerpos crudos de Gmail (CRLF).
 * Una revisión independiente demostró que esa afirmación es incorrecta:
 * en V8, ^/$ en modo multilínea SÍ reconocen \r como terminador de línea,
 * y el patrón original podía coincidir con un encabezado CRLF simple
 * (verificado empíricamente, ver auditoria/CHANGELOG.md). La causa real
 * del fallo no quedó capturada (no se registran cuerpos de correo, por
 * seguridad), pero el análisis de código confirma que los marcadores
 * anteriores eran insuficientemente robustos frente a variantes reales de
 * Gmail no cubiertas: encabezados de cita partidos en más de una línea
 * (el patrón usaba ".", que no cruza saltos de línea), sin tolerancia a
 * espacios/tabs iniciales antes de "El"/"On", y sin ningún marcador de
 * respaldo independiente del encabezado. La normalización de saltos de
 * línea (CRLF/CR -> LF) que sigue esta función se conserva como
 * endurecimiento preventivo y para simplificar el análisis posterior, no
 * como corrección de una causa CRLF demostrada.
 *
 * Ajuste adicional (22/07/2026): el patrón de dos líneas exigía siempre un
 * espacio literal inmediatamente antes de "escribió:"/"wrote:". Cuando el
 * encabezado se parte justo antes de esa palabra -- el remitente queda al
 * final de la primera línea y "escribió:"/"wrote:" ocupa la segunda línea
 * por sí solo, sin nombre que lo preceda -- no hay ningún espacio que
 * exigir, solo un salto de línea; el patrón no coincidía y el encabezado
 * quedaba dentro del contenido nuevo. Se agregó una segunda forma para la
 * línea de continuación: además de "Nombre escribió:" (con espacio), se
 * admite que la línea de continuación sea, con espacios/tabs iniciales
 * opcionales, únicamente "escribió:"/"wrote:". La variante de una sola
 * línea sigue exigiendo el espacio literal (no admite concatenaciones como
 * "Juanescribió:"), y el límite de una línea adicional como máximo se
 * mantiene sin cambios.
 */
function extraerContenidoNuevo(cuerpo) {
  var normalizado = cuerpo.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Un espacio o tab colgante antes del salto de línea también podría
  // romper un marcador anclado con $ (por ejemplo "escribió: \n"); se
  // recorta por línea antes de evaluar los marcadores de corte.
  normalizado = normalizado.replace(/[ \t]+$/gm, '');

  var marcadoresCorte = [
    // Encabezado de cita de Gmail en español. Admite espacios/tabs
    // iniciales antes de "El". El bloque fecha/remitente puede partirse
    // en, COMO MÁXIMO, una línea adicional -- nunca una cantidad
    // arbitraria -- para no permitir que un párrafo legítimo que empiece
    // con "El " sea consumido hasta un "escribió:" que aparezca varias
    // líneas después. Dos formas para la línea de continuación: (a)
    // "Nombre escribió:", con el espacio literal exigido antes del verbo
    // (evita concatenaciones como "Juanescribió:"); (b) "escribió:" sola
    // al inicio de la línea (con espacios/tabs iniciales opcionales),
    // para cuando el verbo queda solo en la segunda línea. La variante de
    // una sola línea también exige el espacio literal antes de
    // "escribió:", así que no corta texto legítimo como "El responsable
    // escribió el informe..." (sin los dos puntos al final de la línea).
    /^[ \t]*El (?:[^\n]*(?:\n[^\n]*)? escribió:[ \t]*$|[^\n]*\n[ \t]*escribió:[ \t]*$)/m,
    // Encabezado equivalente en inglés, mismas dos formas de continuación.
    /^[ \t]*On (?:[^\n]*(?:\n[^\n]*)? wrote:[ \t]*$|[^\n]*\n[ \t]*wrote:[ \t]*$)/m,
    /^-{2,} ?Mensaje reenviado ?-{2,}/mi,
    /^-{2,} ?Forwarded message ?-{2,}/mi,
    /^De: .*\nEnviado el: .*\nPara: .*/mi,
    /^From: .*\nSent: .*\nTo: .*/mi,
    // Red de seguridad independiente del encabezado anterior: cualquier
    // línea de cita (con o sin espacios/tabs iniciales, uno o más ">")
    // marca el comienzo del historial, sin depender de reconocer
    // "escribió:"/"wrote:" primero.
    /^[ \t]*>+/m
  ];

  var indiceCorte = normalizado.length;
  marcadoresCorte.forEach(function (patron) {
    var coincidencia = patron.exec(normalizado);
    if (coincidencia && coincidencia.index < indiceCorte) {
      indiceCorte = coincidencia.index;
    }
  });

  return normalizado.substring(0, indiceCorte).trim();
}

// enmascararDatosSensibles(): definida en codigo/prompts_ia.gs (Fase 4),
// con la lista definitiva de patrones (tarjetas, DNI, CBU, alias bancario,
// contraseñas/claves/tokens explícitos).

// construirEnlaceCorreo(): definida en codigo/escritura_sheets.gs (Fase 7).
// La versión de la Fase 3 usaba la ruta "/mail/u/0/", dependiente de la
// posición de sesión (bug real, corregido en Fase 7 con "?authuser=<email>",
// ver documentacion/MAPA_ESCRITURA.md y criterio CP-24).

// ============================================================================
// FILTRO DETERMINÍSTICO DE ELEGIBILIDAD
// ============================================================================

// evaluarFiltroDeterministico(): definida en codigo/filtros_correo.gs
// (Fase 6), con la regla obligatoria de notificaciones de fallos de Apps
// Script y las señales basadas en encabezados estándar (List-Unsubscribe,
// Precedence, Auto-Submitted) para boletines, comunicaciones masivas y
// respuestas automáticas (documentacion/REGLAS_ELEGIBILIDAD.md).

// ============================================================================
// CLIENTE DE IA
// ============================================================================

// consultarIAExtractora(): definida en codigo/cliente_openai.gs (Fase 4),
// con Structured Outputs (json_schema estricto) y la política de
// reintentos de 3 intentos con espera creciente (documentacion/POLITICA_REINTENTOS.md).

// construirPromptSistema(): definida en codigo/prompts_ia.gs (Fase 4),
// versión endurecida contra instrucciones maliciosas embebidas en el correo
// (documentacion/PROMPT_OPERATIVO.md, mitigación de R-08).

// ============================================================================
// VALIDACIÓN Y NORMALIZACIÓN DE LA RESPUESTA DE LA IA
// ============================================================================

// validarRespuestaIA(): definida en codigo/esquema_json.gs (Fase 4), con
// rechazo explícito de valores fuera de catálogo y verificación de las
// reglas de consistencia entre campos del esquema (ESQUEMA_JSON.md, sección 3).

/**
 * Aplana observaciones→tareas en una lista de tareas normalizadas, listas
 * para persistir. NO asigna taskId todavía: el ID se asigna una sola vez,
 * en persistirManifiestoTareas() (codigo/idempotencia.gs, Fase 5), sobre el
 * manifiesto ya persistido, no antes.
 */
function generarTareasNormalizadas(datosValidados, datosCorreo, mensajeDescriptor) {
  var tareasNormalizadas = [];

  datosValidados.observaciones.forEach(function (observacion) {
    observacion.tareas.forEach(function (tarea) {
      tareasNormalizadas.push({
        messageId: mensajeDescriptor.messageId,
        threadId: mensajeDescriptor.threadId,
        tablero: tarea.tablero,
        prioridad: tarea.prioridad,
        grupoOrigen: tarea.grupo_origen,
        responsable: tarea.responsable_sugerido,
        fechaLimite: tarea.fecha_limite,
        resumen: tarea.resumen,
        observacionNumero: observacion.numero,
        observacionTextoOriginal: observacion.texto_original,
        datosCorreo: datosCorreo
      });
    });
  });

  return tareasNormalizadas;
}

// ============================================================================
// IDEMPOTENCIA Y MANIFIESTO
// ============================================================================

// generarIdDeterministico(), calcularHashMensaje16(), calcularHashContenido(),
// obtenerManifiestoPersistido() y persistirManifiestoTareas(): definidas en
// codigo/idempotencia.gs (Fase 5), con el formato de ID definitivo
// ALI-{HASH_MENSAJE_16}-{INDICE_PERSISTIDO} (documentacion/ESTRATEGIA_IDEMPOTENCIA.md).

// ============================================================================
// ESCRITURA SEGURA EN GOOGLE SHEETS
// ============================================================================

// agruparFilasPorHoja(), escribirFilasPorLote(), marcarTareasEscritas() y
// construirEnlaceCorreo(): definidas en codigo/escritura_sheets.gs (Fase 7).
// sanitizarValoresParaSheets() y validarFilaCompleta(): definidas en
// codigo/sanitizacion.gs (Fase 7). Cambios respecto al placeholder de la
// Fase 3: validación de existencia de hoja antes de escribir (sin destino
// por defecto silencioso), fechas como objetos Date reales, y corrección
// del enlace al correo (documentacion/MAPA_ESCRITURA.md).

// ============================================================================
// ACTUALIZACIÓN DE GMAIL (por mensaje individual, Gmail API)
// ============================================================================

/**
 * Etiqueta y archiva por mensaje individual usando el servicio avanzado de
 * Gmail (DEC-001), no GmailApp a nivel de hilo. "claveResultado" identifica
 * qué etiqueta de las configuradas en validarConfiguracion().idsEtiquetas
 * corresponde.
 *
 * Corrección INC-FASE8-004 (20/07/2026): `cfg.permitirEtiquetado` y
 * `cfg.permitirArchivado` ya vienen leídos y validados desde
 * validarConfiguracion() — esta función no vuelve a consultar
 * PropertiesService. Si ambos son `false`, la función NUNCA llama a Gmail
 * (una llamada con `{addLabelIds: [], removeLabelIds: []}` es rechazada por
 * la API con "No label or Classification Label updates provided"); se
 * registra `resultado_gmail = 'OMITIDO_POR_CONFIGURACION'` y se continúa el
 * flujo como una operación válida, no como un error. El ID de etiqueta solo
 * se exige cuando `permitirEtiquetado` es `true` (si está deshabilitado,
 * ese ID nunca se usa).
 */
function aplicarResultadoGmail(mensajeDescriptor, claveResultado, cfg) {
  if (cfg.dryRun) {
    Logger.log('[DRY_RUN] Se etiquetaría/archivaría el mensaje ' + mensajeDescriptor.messageId + ' con ' + claveResultado);
    return;
  }

  if (!cfg.permitirEtiquetado && !cfg.permitirArchivado) {
    actualizarLogMensajes(mensajeDescriptor, {
      resultado_gmail: 'OMITIDO_POR_CONFIGURACION',
      unidades_gmail_api: 0
    }, cfg);
    return;
  }

  var recurso = {};
  if (cfg.permitirEtiquetado) {
    var idEtiqueta = cfg.idsEtiquetas[claveResultado];
    if (!idEtiqueta) {
      throw new Error('No hay ID de etiqueta configurado para: ' + claveResultado);
    }
    recurso.addLabelIds = [idEtiqueta];
  }
  if (cfg.permitirArchivado) {
    recurso.removeLabelIds = ['INBOX'];
  }

  var resultadoDescriptivo;
  if (cfg.permitirEtiquetado && cfg.permitirArchivado) {
    resultadoDescriptivo = 'ETIQUETADO_Y_ARCHIVADO';
  } else if (cfg.permitirEtiquetado) {
    resultadoDescriptivo = 'SOLO_ETIQUETADO';
  } else {
    resultadoDescriptivo = 'SOLO_ARCHIVADO';
  }

  try {
    Gmail.Users.Messages.modify(recurso, 'me', mensajeDescriptor.messageId);
  } catch (errorGmail) {
    // La llamada se intentó (consume cuota) aunque no haya terminado bien;
    // el detalle técnico va en Log Mensajes.error, no en resultado_gmail.
    // Se relanza para que el llamador (procesarUnMensaje() /
    // reanudarDesdeManifiesto()) la trate como una falla real de Gmail
    // posterior a la escritura (ver gestionarErrorMensaje(), INC-FASE8-005).
    actualizarLogMensajes(mensajeDescriptor, {
      resultado_gmail: 'ERROR_GMAIL',
      unidades_gmail_api: 1,
      error: String(errorGmail.message || errorGmail)
    }, cfg);
    throw errorGmail;
  }

  // Registrar consumo de unidades de cuota (sección 7.3.6 del plan) y el
  // resultado descriptivo (columna resultado_gmail, sin completar hasta esta
  // corrección).
  actualizarLogMensajes(mensajeDescriptor, {
    resultado_gmail: resultadoDescriptivo,
    unidades_gmail_api: 1
  }, cfg);
}

// ============================================================================
// REGISTRO EN LOG MENSAJES Y MANEJO DE ERRORES
// ============================================================================

/**
 * Registra el inicio de procesamiento de un mensaje. Fase 5: si ya existe
 * una fila para este message_id (por ejemplo, un intento anterior que quedó
 * abandonado y fue reabierto por recuperarProcesamientosAbandonados() sin
 * llegar a persistir manifiesto), se REUTILIZA esa fila en lugar de insertar
 * una nueva. Sin este resguardo, cada reintento crearía una fila adicional
 * en Log Mensajes para el mismo mensaje, y actualizarLogMensajes() seguiría
 * encontrando y actualizando solo la primera (más antigua), dejando el
 * resto desactualizado.
 */
function registrarInicioProcesamiento(mensajeDescriptor, cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.LOG_MENSAJES, cfg);
  var datos = hoja.getDataRange().getValues();

  for (var fila = 1; fila < datos.length; fila++) {
    if (datos[fila][0] === mensajeDescriptor.messageId) {
      var numeroFilaReal = fila + 1;
      // Reutiliza la fila existente: reinicia fecha_inicio/estado/etapa,
      // conserva el resto (métricas de intentos previos quedan sobrescritas
      // a medida que el reprocesamiento avanza, igual que en un mensaje nuevo).
      // INC-FASE8-009: remitente/asunto sanitizados — un asunto que empiece
      // con =/+/-/@ se ejecutaría como fórmula en esta hoja técnica si se
      // escribiera sin protección (confirmado con evidencia real, CP-23).
      hoja.getRange(numeroFilaReal, 3, 1, 6).setValues([[
        new Date(), '',
        sanitizarValoresParaSheets(mensajeDescriptor.mensaje.getFrom()),
        sanitizarValoresParaSheets(mensajeDescriptor.mensaje.getSubject()),
        ESTADOS.EN_PROCESO, ETAPAS.INICIO
      ]]);
      return;
    }
  }

  // Las 26 columnas de Log Mensajes, en el orden exacto de
  // documentacion/DISENO_HOJAS_TECNICAS.md, sección 1. Corrección (detectada
  // al verificar la alineación de encabezados): la versión anterior tenía
  // solo 25 valores (faltaba el placeholder de request_id), lo que corría
  // una columna hacia la izquierda todo lo posterior a costo_estimado y
  // dejaba version_script sin escribir. Ver auditoria/INCIDENCIAS.md, INC-001.
  var filaNueva = [
    mensajeDescriptor.messageId,             // 1  message_id
    mensajeDescriptor.threadId,              // 2  thread_id
    new Date(),                              // 3  fecha_inicio
    '',                                      // 4  fecha_fin
    sanitizarValoresParaSheets(mensajeDescriptor.mensaje.getFrom()),     // 5  remitente (INC-FASE8-009)
    sanitizarValoresParaSheets(mensajeDescriptor.mensaje.getSubject()), // 6  asunto (INC-FASE8-009)
    ESTADOS.EN_PROCESO,                      // 7  estado
    ETAPAS.INICIO,                           // 8  etapa
    0,                                       // 9  cantidad_observaciones
    0,                                       // 10 cantidad_tareas
    '',                                      // 11 resultado_gmail
    0,                                       // 12 intentos
    '',                                      // 13 codigo_http
    '',                                      // 14 error
    '',                                      // 15 modelo
    '',                                      // 16 tokens_entrada
    '',                                      // 17 tokens_salida
    '',                                      // 18 tokens_totales
    '',                                      // 19 costo_estimado
    '',                                      // 20 request_id
    false,                                   // 21 cuerpo_truncado
    0,                                       // 22 longitud_original
    0,                                       // 23 longitud_normalizada
    0,                                       // 24 duracion_llamada_ia
    0,                                       // 25 unidades_gmail_api
    cfg.versionScript                        // 26 version_script
  ];
  hoja.getRange(hoja.getLastRow() + 1, 1, 1, filaNueva.length).setValues([filaNueva]);
}

/**
 * Actualiza campos puntuales de la fila de Log Mensajes correspondiente a
 * un mensaje. Localiza la fila por message_id (columna 1).
 *
 * INC-FASE8-009: cualquier valor de tipo string en `campos` puede contener
 * texto libre proveniente de Gmail, la IA, una API externa o un mensaje de
 * excepción; se sanitiza antes de setValue() para no repetir la inyección
 * de fórmulas confirmada en registrarInicioProcesamiento(). Date, number,
 * boolean y valores vacíos se escriben sin alterar (sanitizarValoresParaSheets()
 * ya es un no-op para todo lo que no sea string).
 */
function actualizarLogMensajes(mensajeDescriptor, campos, cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.LOG_MENSAJES, cfg);
  var datos = hoja.getDataRange().getValues();
  var encabezados = datos[0];

  for (var fila = 1; fila < datos.length; fila++) {
    if (datos[fila][0] === mensajeDescriptor.messageId) {
      var numeroFilaReal = fila + 1;
      Object.keys(campos).forEach(function (nombreCampo) {
        var indiceColumna = encabezados.indexOf(nombreCampo);
        if (indiceColumna !== -1) {
          hoja.getRange(numeroFilaReal, indiceColumna + 1).setValue(sanitizarValoresParaSheets(campos[nombreCampo]));
        }
      });
      return;
    }
  }

  Logger.log('actualizarLogMensajes(): no se encontró fila para ' + mensajeDescriptor.messageId);
}

/**
 * Maneja una excepción no controlada durante procesarUnMensaje(). Clasifica
 * el error, registra el estado sin tocar Gmail (regla: no aplicar Procesado
 * ni archivar antes de completar el registro), dejando el mensaje disponible
 * para reintento (ERROR_TEMPORAL) o cerrado (ERROR_DEFINITIVO) según
 * corresponda. PENDIENTE (Fase 5): criterio fino de clasificación temporal
 * vs. definitivo y política de reintentos entre ejecuciones.
 *
 * Corrección INC-FASE8-002: si la excepción ocurrió durante una simulación
 * (`cfg.dryRun === true`, dentro de `procesarUnMensajeSimulado()`), esta
 * función NO debe escribir en Log Mensajes ni en Indice Idempotencia —
 * DRY_RUN es un modo sin persistencia también para el camino de error.
 *
 * Corrección INC-FASE8-005 (20/07/2026): si ya existe un manifiesto
 * persistido en Registro Tareas para este mensaje, el procesamiento alcanzó
 * al menos la reserva de tareas (MANIFIESTO_PERSISTIDO en adelante) y NO
 * debe cerrarse como ERROR_DEFINITIVO con tareas=[] — eso excluiría el
 * mensaje de `Indice Idempotencia` para siempre, aunque sus tareas ya
 * existan escritas. En ese caso esta función solo registra ERROR_TEMPORAL
 * (conservando la `etapa` ya alcanzada, sin tocarla) y retorna, SIN llamar
 * a `finalizarMensaje()` ni a `reanudarDesdeManifiesto()` aquí mismo: la
 * reanudación ocurre en la ENTRADA de `procesarUnMensaje()` en la próxima
 * ejecución (ver ese comentario), no dentro del manejador de errores, para
 * mantener una única ruta de recuperación y evitar una cadena
 * recuperación → error → recuperación difícil de acotar.
 */
function gestionarErrorMensaje(mensajeDescriptor, error, cfg) {
  Logger.log('Error procesando mensaje ' + mensajeDescriptor.messageId + ': ' + error.message);

  if (cfg.dryRun) {
    Logger.log('[DRY_RUN] ' + mensajeDescriptor.messageId + ': error durante la simulación, sin escrituras (ver mensaje de error arriba).');
    return;
  }

  var manifiesto = [];
  try {
    manifiesto = obtenerManifiestoPersistido(mensajeDescriptor.messageId, cfg);
  } catch (errorManifiesto) {
    Logger.log('gestionarErrorMensaje(): no se pudo comprobar el manifiesto de ' + mensajeDescriptor.messageId + ': ' + errorManifiesto.message);
  }

  if (manifiesto.length > 0) {
    try {
      actualizarLogMensajes(mensajeDescriptor, { estado: ESTADOS.ERROR_TEMPORAL, error: String(error.message || error) }, cfg);
    } catch (errorSecundario) {
      Logger.log('No se pudo registrar el error en Log Mensajes: ' + errorSecundario.message);
    }
    return;
  }

  var esTemporal = /timeout|timed out|rate limit|50[0-9]/i.test(error.message || '');
  var estado = esTemporal ? ESTADOS.ERROR_TEMPORAL : ESTADOS.ERROR_DEFINITIVO;

  try {
    actualizarLogMensajes(mensajeDescriptor, { estado: estado, error: String(error.message || error) }, cfg);
  } catch (errorSecundario) {
    // Si ni siquiera se puede registrar el error, se deja constancia en el
    // log de ejecución de Apps Script como última red de seguridad.
    Logger.log('No se pudo registrar el error en Log Mensajes: ' + errorSecundario.message);
  }

  if (estado === ESTADOS.ERROR_DEFINITIVO) {
    // Se cierra igual que un mensaje terminal, para no reintentarlo indefinidamente,
    // pero SIN tocar Gmail (el mensaje puede requerir revisión humana directa en la bandeja).
    finalizarMensaje(mensajeDescriptor, ESTADOS.ERROR_DEFINITIVO, [], cfg);
  }
  // ERROR_TEMPORAL: no se cierra en Indice Idempotencia, queda elegible para
  // la próxima ejecución o para recuperarProcesamientosAbandonados().
}

// ============================================================================
// RECUPERACIÓN DE PROCESAMIENTOS ABANDONADOS
// ============================================================================

// recuperarProcesamientosAbandonados() y reanudarDesdeManifiesto(): definidas
// en codigo/recuperacion.gs (Fase 5). A diferencia del placeholder de la
// Fase 3, la versión definitiva SÍ reanuda desde el manifiesto persistido en
// Registro Tareas sin volver a consultar la IA cuando corresponde
// (documentacion/RECUPERACION_INTERRUPCIONES.md), resolviendo la brecha
// señalada en documentacion/FLUJO_TRANSACCIONAL.md, sección 3.

// ============================================================================
// UTILIDADES
// ============================================================================

function obtenerHojaTecnica(nombreHoja, cfg) {
  var planilla = SpreadsheetApp.openById(cfg.spreadsheetIdEfectivo);
  var hoja = planilla.getSheetByName(nombreHoja);
  if (!hoja) throw new Error('No existe la hoja técnica "' + nombreHoja + '".');
  return hoja;
}
