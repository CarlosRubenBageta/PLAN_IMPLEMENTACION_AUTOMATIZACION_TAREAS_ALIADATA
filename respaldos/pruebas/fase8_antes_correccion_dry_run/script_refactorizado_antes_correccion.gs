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

  cfg.maxHilos = parseInt(PROP.getProperty('MAX_HILOS'), 10);
  if (!cfg.maxHilos || cfg.maxHilos <= 0) errores.push('MAX_HILOS inválido o ausente.');

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

  cfg.modoPrueba = PROP.getProperty('MODO_PRUEBA') === 'true';
  cfg.dryRun = PROP.getProperty('DRY_RUN') === 'true';
  cfg.spreadsheetIdPrueba = PROP.getProperty('SPREADSHEET_ID_PRUEBA');

  if (cfg.modoPrueba) {
    if (!cfg.spreadsheetIdPrueba) {
      errores.push('MODO_PRUEBA=true pero falta SPREADSHEET_ID_PRUEBA.');
    } else if (cfg.spreadsheetIdPrueba === cfg.spreadsheetId) {
      // Regla dura: nunca correr en modo prueba contra la planilla productiva (CP-27).
      errores.push('SPREADSHEET_ID_PRUEBA coincide con el SPREADSHEET_ID productivo: abortar.');
    }
  }

  cfg.spreadsheetIdEfectivo = cfg.modoPrueba ? cfg.spreadsheetIdPrueba : cfg.spreadsheetId;

  cfg.idsEtiquetas = {
    Procesado: PROP.getProperty('ID_ETIQUETA_PROCESADO'),
    RevisionSinTareas: PROP.getProperty('ID_ETIQUETA_REVISION_SIN_TAREAS'),
    RevisionErrorProcesamiento: PROP.getProperty('ID_ETIQUETA_REVISION_ERROR_PROCESAMIENTO'),
    RevisionErrorAutomatizacion: PROP.getProperty('ID_ETIQUETA_REVISION_ERROR_AUTOMATIZACION')
  };
  Object.keys(cfg.idsEtiquetas).forEach(function (clave) {
    if (!cfg.idsEtiquetas[clave]) {
      errores.push('Falta el ID interno de etiqueta para: ' + clave + ' (requiere Gmail API habilitada, sección 7.3 del plan).');
    }
  });

  if (errores.length > 0) {
    Logger.log('validarConfiguracion(): configuración inválida:\n' + errores.join('\n'));
    return { valido: false, errores: errores, cfg: null };
  }

  // Validar que las hojas de destino y las hojas técnicas existan antes de tocar nada.
  try {
    var planilla = SpreadsheetApp.openById(cfg.spreadsheetIdEfectivo);
    TABLEROS_VALIDOS.concat(Object.values(HOJAS_TECNICAS)).forEach(function (nombreHoja) {
      if (!planilla.getSheetByName(nombreHoja)) {
        errores.push('No existe la hoja "' + nombreHoja + '" en la planilla configurada.');
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

    var validacion = validarConfiguracion();
    if (!validacion.valido) {
      // Regla dura: si falla la validación crítica, no tocar Gmail ni Sheets.
      Logger.log('procesarCorreosDeTareas(): abortando por configuración inválida:\n' + validacion.errores.join('\n'));
      return;
    }
    var cfg = validacion.cfg;
    var inicioEjecucion = Date.now();

    recuperarProcesamientosAbandonados(cfg);

    var hilos = obtenerHilosPendientes(cfg);
    var mensajes = obtenerMensajesPendientes(hilos, cfg);

    var limite = Math.min(mensajes.length, cfg.maxMensajesPorEjecucion);
    Logger.log('procesarCorreosDeTareas(): ' + mensajes.length + ' mensajes elegibles, procesando ' + limite + '.');

    for (var i = 0; i < limite; i++) {
      if (Date.now() - inicioEjecucion > cfg.tiempoInternoMaxMs) {
        Logger.log('procesarCorreosDeTareas(): límite de tiempo interno alcanzado, deteniendo la tanda.');
        break;
      }

      var mensajeDescriptor = mensajes[i];
      try {
        procesarUnMensaje(mensajeDescriptor, cfg);
      } catch (errorMensaje) {
        // Aislamiento de errores por mensaje: una excepción aquí NO debe
        // interrumpir el resto de la tanda (a diferencia de script_actual.gs).
        gestionarErrorMensaje(mensajeDescriptor, errorMensaje, cfg);
      }
    }
  } finally {
    if (obtuvoLock) lock.releaseLock();
  }
}

// ============================================================================
// OBTENCIÓN DE HILOS Y MENSAJES PENDIENTES
// ============================================================================

/**
 * Búsqueda paginada y limitada desde el origen (a diferencia de
 * script_actual.gs, que traía todos los hilos coincidentes antes de
 * limitar). Sin filtro de etiqueta: el descarte de ya procesados ocurre
 * por ID de mensaje, no por etiqueta de hilo (RF-12, DEC-001).
 */
function obtenerHilosPendientes(cfg) {
  var consulta = cfg.modoPrueba ? (PROP.getProperty('GMAIL_QUERY_PRUEBA') || 'in:inbox') : 'in:inbox';
  return GmailApp.search(consulta, 0, cfg.maxHilos);
}

/**
 * Aplana los hilos a mensajes individuales y descarta:
 *  - mensajes ya registrados con estado terminal en Indice Idempotencia;
 *  - mensajes anteriores a FECHA_INICIO_CORTE (si está definida).
 */
function obtenerMensajesPendientes(hilos, cfg) {
  var idsProcesados = obtenerIdsYaProcesados(cfg);
  var pendientes = [];

  hilos.forEach(function (hilo) {
    var mensajesDelHilo = hilo.getMessages();
    mensajesDelHilo.forEach(function (mensaje) {
      var messageId = mensaje.getId();

      if (idsProcesados.has(messageId)) return; // Ya tiene estado terminal.

      if (cfg.fechaInicioCorte && mensaje.getDate() < cfg.fechaInicioCorte) {
        // Excluido por antigüedad (RF-11). Se registra para auditoría pero
        // no se procesa ni se toca en Gmail.
        Logger.log('Mensaje ' + messageId + ' excluido por antigüedad (anterior a FECHA_INICIO_CORTE).');
        return;
      }

      pendientes.push({
        messageId: messageId,
        threadId: hilo.getId(),
        mensaje: mensaje
      });
    });
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
 */
function procesarUnMensaje(mensajeDescriptor, cfg) {
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
    link: construirEnlaceCorreo(mensaje),
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
 * comunes de Gmail/clientes de correo). PENDIENTE (Fase 4): ajuste fino
 * según los casos reales observados en pruebas controladas.
 */
function extraerContenidoNuevo(cuerpo) {
  var marcadoresCorte = [
    /^El .* escribió:$/m,
    /^On .* wrote:$/m,
    /^-{2,} ?Mensaje reenviado ?-{2,}/mi,
    /^-{2,} ?Forwarded message ?-{2,}/mi,
    /^De: .*\nEnviado el: .*\nPara: .*/mi,
    /^From: .*\nSent: .*\nTo: .*/mi
  ];

  var indiceCorte = cuerpo.length;
  marcadoresCorte.forEach(function (patron) {
    var coincidencia = patron.exec(cuerpo);
    if (coincidencia && coincidencia.index < indiceCorte) {
      indiceCorte = coincidencia.index;
    }
  });

  return cuerpo.substring(0, indiceCorte).trim();
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
 */
function aplicarResultadoGmail(mensajeDescriptor, claveResultado, cfg) {
  var idEtiqueta = cfg.idsEtiquetas[claveResultado];
  if (!idEtiqueta) {
    throw new Error('No hay ID de etiqueta configurado para: ' + claveResultado);
  }

  if (cfg.dryRun) {
    Logger.log('[DRY_RUN] Se etiquetaría/archivaría el mensaje ' + mensajeDescriptor.messageId + ' con ' + claveResultado);
    return;
  }

  var permitirEtiquetado = PROP.getProperty('PERMITIR_ETIQUETADO') !== 'false';
  var permitirArchivado = PROP.getProperty('PERMITIR_ARCHIVADO') !== 'false';

  var recurso = { addLabelIds: [], removeLabelIds: [] };
  if (permitirEtiquetado) recurso.addLabelIds.push(idEtiqueta);
  if (permitirArchivado) recurso.removeLabelIds.push('INBOX');

  Gmail.Users.Messages.modify(recurso, 'me', mensajeDescriptor.messageId);

  // Registrar consumo de unidades de cuota (sección 7.3.6 del plan).
  actualizarLogMensajes(mensajeDescriptor, { unidades_gmail_api: 1 }, cfg);
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
      hoja.getRange(numeroFilaReal, 3, 1, 6).setValues([[
        new Date(), '', mensajeDescriptor.mensaje.getFrom(), mensajeDescriptor.mensaje.getSubject(),
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
    mensajeDescriptor.mensaje.getFrom(),      // 5  remitente
    mensajeDescriptor.mensaje.getSubject(),   // 6  asunto
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
          hoja.getRange(numeroFilaReal, indiceColumna + 1).setValue(campos[nombreCampo]);
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
 */
function gestionarErrorMensaje(mensajeDescriptor, error, cfg) {
  Logger.log('Error procesando mensaje ' + mensajeDescriptor.messageId + ': ' + error.message);

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