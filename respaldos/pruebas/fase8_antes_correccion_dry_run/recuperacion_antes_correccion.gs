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

  for (var fila = 1; fila < datos.length; fila++) {
    if (datos[fila][idxEstado] !== ESTADOS.EN_PROCESO) continue;

    var fechaInicio = new Date(datos[fila][idxFechaInicio]).getTime();
    if (ahora - fechaInicio <= limiteMs) continue; // Dentro del umbral: puede ser una ejecución legítima en curso.

    var etapaAlcanzada = datos[fila][idxEtapa];
    var mensajeDescriptor = { messageId: datos[fila][idxMessageId], threadId: datos[fila][idxThreadId] };

    if (ETAPAS_CON_MANIFIESTO.indexOf(etapaAlcanzada) !== -1) {
      Logger.log('Mensaje abandonado ' + mensajeDescriptor.messageId + ' con manifiesto persistido (etapa ' + etapaAlcanzada + '); reanudando sin volver a consultar la IA.');
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

  var datosCorreo = obtenerMetadatosMensaje(mensajeGmail);
  tareas.forEach(function (tarea) { tarea.datosCorreo = datosCorreo; });

  var pendientes = tareas.filter(function (tarea) {
    return tarea.estadoEscritura !== ESTADOS_ESCRITURA_TAREA.ESCRITA;
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
function obtenerMetadatosMensaje(mensajeGmail) {
  return {
    remitente: mensajeGmail.getFrom(),
    asunto: mensajeGmail.getSubject(),
    fecha: mensajeGmail.getDate(),
    link: construirEnlaceCorreo(mensajeGmail)
  };
}
