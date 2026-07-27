/**
 * ============================================================================
 * BORRADOR — Fase 5 (Idempotencia, IDs y recuperación). NO DESPLEGAR.
 * ============================================================================
 * Reemplaza recuperarProcesamientosAbandonados() del borrador de Fase 3
 * (codigo/script_refactorizado.gs), que solo reclasificaba registros
 * EN_PROCESO vencidos sin reanudación fina. Esta versión resuelve
 * explícitamente la brecha documentada en
 * documentacion/FLUJO_TRANSACCIONAL.md (sección 3): si el manifiesto de
 * tareas ya fue persistido, la recuperación NO vuelve a consultar la IA ni
 * reescribe filas ya ESCRITAS; retoma exactamente desde la etapa alcanzada.
 *
 * Requiere codigo/idempotencia.gs (obtenerManifiestoPersistido) y las
 * funciones de codigo/script_refactorizado.gs (actualizarLogMensajes,
 * agruparFilasPorHoja, escribirFilasPorLote, marcarTareasEscritas,
 * aplicarResultadoGmail, finalizarMensaje, gestionarErrorMensaje,
 * construirEnlaceCorreo, obtenerHojaTecnica).
 * ============================================================================
 */

// Etapas en las que ya existe un manifiesto persistido en Registro Tareas
// (a partir de aquí, una recuperación nunca debe volver a llamar a la IA).
var ETAPAS_CON_MANIFIESTO = [
  ETAPAS.MANIFIESTO_PERSISTIDO,
  ETAPAS.TAREAS_RESERVADAS,
  ETAPAS.ESCRITURA_INICIADA,
  ETAPAS.ESCRITURA_COMPLETADA,
  ETAPAS.GMAIL_ACTUALIZADO
];

/**
 * Detecta mensajes cuyo registro quedó en EN_PROCESO más allá de
 * UMBRAL_ABANDONO_MIN (por ejemplo, por el error "runtime exited
 * unexpectedly" documentado en D-09 de DIAGNOSTICO_ERRORES.md) y decide,
 * según la etapa alcanzada, si corresponde una reanudación fina desde el
 * manifiesto o un reprocesamiento completo.
 *
 * Nota (INC-FASE8-002): esta función y reanudarDesdeManifiesto() persisten
 * datos reales (Registro Tareas, Log Mensajes, Indice Idempotencia) y por
 * eso NUNCA deben ejecutarse durante una corrida en DRY_RUN. La barrera vive
 * en el único punto donde se invoca esta función —
 * codigo/script_refactorizado.gs, procesarCorreosDeTareas()—, que se salta
 * la llamada por completo si cfg.dryRun es true. No se duplica el chequeo
 * aquí para no repetir el patrón de guards dispersos que causó INC-FASE8-002.
 */
function recuperarProcesamientosAbandonados(cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.LOG_MENSAJES, cfg);
  var datos = hoja.getDataRange().getValues();
  var encabezados = datos[0];
  var idxMessageId = encabezados.indexOf('message_id');
  var idxThreadId = encabezados.indexOf('thread_id');
  var idxEstado = encabezados.indexOf('estado');
  var idxFechaInicio = encabezados.indexOf('fecha_inicio');
  var idxEtapa = encabezados.indexOf('etapa');
  var limiteMs = cfg.umbralAbandonoMin * 60 * 1000;
  var ahora = Date.now();
  var reanudados = 0;
  var reabiertosCompletos = 0;
  // H-14 (documentacion/RECUPERACION_INTERRUPCIONES.md, sección 14): ids
  // efectivamente reanudados vía manifiesto en esta ejecución, para que
  // procesarCorreosDeTareasConConfiguracion_() los excluya de la búsqueda
  // normal de Gmail y no se reanuden una segunda vez en la misma corrida.
  var idsReanudadosEstaEjecucion = [];

  for (var fila = 1; fila < datos.length; fila++) {
    if (datos[fila][idxEstado] !== ESTADOS.EN_PROCESO) continue;

    var fechaInicio = new Date(datos[fila][idxFechaInicio]).getTime();
    if (ahora - fechaInicio <= limiteMs) continue; // Dentro del umbral: puede ser una ejecución legítima en curso.

    var etapaAlcanzada = datos[fila][idxEtapa];
    var mensajeDescriptor = { messageId: datos[fila][idxMessageId], threadId: datos[fila][idxThreadId] };

    if (ETAPAS_CON_MANIFIESTO.indexOf(etapaAlcanzada) !== -1) {
      Logger.log('Mensaje abandonado ' + mensajeDescriptor.messageId + ' con manifiesto persistido (etapa ' + etapaAlcanzada + '); reanudando sin volver a consultar la IA.');
      idsReanudadosEstaEjecucion.push(mensajeDescriptor.messageId);
      try {
        reanudarDesdeManifiesto(mensajeDescriptor, cfg);
        reanudados++;
      } catch (errorRecuperacion) {
        gestionarErrorMensaje(mensajeDescriptor, errorRecuperacion, cfg);
      }
    } else {
      // Sin manifiesto persistido: es seguro reprocesar desde cero, porque
      // ninguna tarea llegó a reservarse ni escribirse todavía. Se marca
      // ERROR_TEMPORAL; como el mensaje aún no tiene fila en
      // Indice Idempotencia, la próxima obtenerMensajesPendientes() lo
      // vuelve a traer y registrarInicioProcesamiento() reutiliza (no
      // duplica) esta misma fila de Log Mensajes.
      Logger.log('Mensaje abandonado ' + mensajeDescriptor.messageId + ' sin manifiesto persistido (etapa ' + etapaAlcanzada + '); se marca ERROR_TEMPORAL para reprocesamiento completo.');
      hoja.getRange(fila + 1, idxEstado + 1).setValue(ESTADOS.ERROR_TEMPORAL);
      reabiertosCompletos++;
    }
  }

  if (reanudados > 0 || reabiertosCompletos > 0) {
    Logger.log('recuperarProcesamientosAbandonados(): ' + reanudados + ' reanudado(s) desde manifiesto, ' + reabiertosCompletos + ' reabierto(s) para reprocesamiento completo.');
  }

  return idsReanudadosEstaEjecucion;
}

/**
 * Corrección H-07 (documentacion/RECUPERACION_INTERRUPCIONES.md, sección 10).
 * Complementa a recuperarProcesamientosAbandonados() (que solo cubre
 * mensajes EN_PROCESO abandonados por caída de runtime): un mensaje con
 * manifiesto persistido que quedó en ERROR_TEMPORAL (INC-FASE8-005) depende
 * de que obtenerMensajesPendientesDesdeGmail() lo vuelva a traer para que el
 * chequeo de manifiesto en la entrada de procesarUnMensaje() se dispare de
 * nuevo. Si el mensaje ya no está en la bandeja/consulta configurada (por
 * ejemplo, porque aplicarResultadoGmail() alcanzó a archivarlo antes de que
 * fallara un paso posterior), esa búsqueda nunca lo vuelve a traer y el
 * mensaje queda en ERROR_TEMPORAL para siempre. Esta función busca
 * directamente en Log Mensajes, sin depender de ninguna búsqueda de Gmail.
 */
function recuperarMensajesConManifiestoPendiente(cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.LOG_MENSAJES, cfg);
  var datos = hoja.getDataRange().getValues();
  var encabezados = datos[0];
  var idxMessageId = encabezados.indexOf('message_id');
  var idxThreadId = encabezados.indexOf('thread_id');
  var idxEstado = encabezados.indexOf('estado');
  var idsProcesados = obtenerIdsYaProcesados(cfg);
  var reanudados = 0;
  // H-14 (documentacion/RECUPERACION_INTERRUPCIONES.md, sección 14): ver
  // nota equivalente en recuperarProcesamientosAbandonados().
  var idsReanudadosEstaEjecucion = [];

  for (var fila = 1; fila < datos.length; fila++) {
    if (datos[fila][idxEstado] !== ESTADOS.ERROR_TEMPORAL) continue;

    var messageId = datos[fila][idxMessageId];
    if (idsProcesados.has(String(messageId))) continue; // Ya se cerró por otra vía mientras tanto.

    var manifiesto = obtenerManifiestoPersistido(messageId, cfg);
    if (manifiesto.length === 0) continue; // Sin manifiesto: no es este mecanismo.

    var mensajeDescriptor = { messageId: messageId, threadId: datos[fila][idxThreadId] };
    Logger.log('recuperarMensajesConManifiestoPendiente(): ' + messageId + ' en ERROR_TEMPORAL con manifiesto persistido; reanudando sin depender de la búsqueda de Gmail.');
    idsReanudadosEstaEjecucion.push(messageId);
    try {
      reanudarDesdeManifiesto(mensajeDescriptor, cfg);
      reanudados++;
    } catch (errorRecuperacion) {
      gestionarErrorMensaje(mensajeDescriptor, errorRecuperacion, cfg);
    }
  }

  if (reanudados > 0) {
    Logger.log('recuperarMensajesConManifiestoPendiente(): ' + reanudados + ' mensaje(s) reanudado(s).');
  }

  return idsReanudadosEstaEjecucion;
}

/**
 * Reanuda un mensaje cuyo manifiesto de tareas ya está persistido en
 * Registro Tareas. Nunca vuelve a llamar a consultarIAExtractora(): solo
 * relee el mensaje de Gmail para obtener metadatos livianos (remitente,
 * asunto, fecha, link — NO el cuerpo), completa las escrituras pendientes
 * y repite la actualización de Gmail si hiciera falta.
 */
function reanudarDesdeManifiesto(mensajeDescriptor, cfg) {
  var tareas = obtenerManifiestoPersistido(mensajeDescriptor.messageId, cfg);

  if (tareas.length === 0) {
    // Caso límite: la etapa registrada sugería manifiesto persistido pero no
    // se encontró ninguna fila (por ejemplo, un fallo justo al escribir el
    // manifiesto). Se trata como si no hubiera manifiesto: reprocesamiento completo.
    Logger.log('reanudarDesdeManifiesto(): no se encontró manifiesto para ' + mensajeDescriptor.messageId + ' pese a la etapa registrada; se reabre para reprocesamiento completo.');
    actualizarLogMensajes(mensajeDescriptor, { estado: ESTADOS.ERROR_TEMPORAL }, cfg);
    return;
  }

  var mensajeGmail;
  try {
    mensajeGmail = GmailApp.getMessageById(mensajeDescriptor.messageId);
  } catch (e) {
    Logger.log('reanudarDesdeManifiesto(): no se pudo releer el mensaje de Gmail ' + mensajeDescriptor.messageId + ': ' + e.message);
    actualizarLogMensajes(mensajeDescriptor, {
      estado: ESTADOS.ERROR_TEMPORAL,
      error: 'No se pudo releer el mensaje de Gmail durante la recuperación: ' + e.message
    }, cfg);
    return;
  }

  var datosCorreo = obtenerMetadatosMensaje(mensajeGmail, cfg);
  tareas.forEach(function (tarea) { tarea.datosCorreo = datosCorreo; });

  // H-10 (documentacion/RECUPERACION_INTERRUPCIONES.md, sección 12): antes
  // este filtro era "!== ESCRITA", que trataría una tarea ANULADA (estado
  // previsto desde la Fase 2 para descartes por duplicado de contenido, hoy
  // no generado por ningún código) como pendiente de escribir. Solo
  // RESERVADA/ERROR_ESCRITURA deben reintentarse.
  var pendientes = tareas.filter(function (tarea) {
    return tarea.estadoEscritura === ESTADOS_ESCRITURA_TAREA.RESERVADA ||
      tarea.estadoEscritura === ESTADOS_ESCRITURA_TAREA.ERROR_ESCRITURA;
  });

  var huboFallaEscritura = false;

  if (pendientes.length > 0) {
    actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.ESCRITURA_INICIADA }, cfg);
    var filasPorHoja = agruparFilasPorHoja(pendientes);
    var resultadoEscritura = escribirFilasPorLote(filasPorHoja, cfg);
    marcarTareasEscritas(pendientes, resultadoEscritura, cfg);
    actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.ESCRITURA_COMPLETADA }, cfg);

    // Fase 7: misma regla que en procesarUnMensaje() — si alguna tarea no
    // pudo escribirse (hoja de destino inexistente), el mensaje se envía a
    // revisión manual en lugar de marcarse PROCESADO.
    huboFallaEscritura = pendientes.some(function (tarea) {
      var res = resultadoEscritura[tarea.taskId];
      return !res || !res.escrita;
    });
  } else {
    // Todas las tareas ya estaban ESCRITA: esto es exactamente el caso que
    // describe la regla de recuperación del plan v3 ("si falla la
    // actualización de Gmail después de la escritura... repetir únicamente
    // la actualización de Gmail a partir de la etapa registrada").
    Logger.log('reanudarDesdeManifiesto(): todas las tareas de ' + mensajeDescriptor.messageId + ' ya estaban ESCRITA; se repite únicamente la actualización de Gmail.');
  }

  aplicarResultadoGmail(mensajeDescriptor, huboFallaEscritura ? 'RevisionErrorProcesamiento' : 'Procesado', cfg);
  actualizarLogMensajes(mensajeDescriptor, { etapa: ETAPAS.GMAIL_ACTUALIZADO }, cfg);
  finalizarMensaje(mensajeDescriptor, huboFallaEscritura ? ESTADOS.REVISION_MANUAL : ESTADOS.PROCESADO, tareas, cfg);
}

/** Metadatos livianos del mensaje (sin cuerpo), suficientes para escribir filas de negocio. */
function obtenerMetadatosMensaje(mensajeGmail, cfg) {
  return {
    remitente: mensajeGmail.getFrom(),
    asunto: mensajeGmail.getSubject(),
    fecha: mensajeGmail.getDate(),
    link: construirEnlaceCorreo(mensajeGmail, cfg)
  };
}
