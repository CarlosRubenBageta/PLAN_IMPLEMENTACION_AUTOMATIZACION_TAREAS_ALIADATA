/**
 * ============================================================================
 * BORRADOR — Fase 5 (Idempotencia, IDs y recuperación). NO DESPLEGAR.
 * ============================================================================
 * Reemplaza generarIdDeterministico(), persistirManifiestoTareas() y
 * reservarTareas() del borrador de Fase 3 (codigo/script_refactorizado.gs)
 * con el diseño definitivo: el manifiesto de tareas se persiste una sola
 * vez, con IDs asignados en ese momento y nunca recalculados.
 *
 * Detalle y justificación: documentacion/ESTRATEGIA_IDEMPOTENCIA.md.
 * Requiere HOJAS_TECNICAS y ESTADOS_ESCRITURA_TAREA de
 * codigo/script_refactorizado.gs y obtenerHojaTecnica() del mismo archivo.
 * ============================================================================
 */

/** Primeros 16 caracteres hexadecimales del SHA-256 del ID de mensaje de Gmail. */
function calcularHashMensaje16(messageId) {
  var digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, messageId);
  return digestBytes.map(function (b) {
    return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0');
  }).join('').substring(0, 16).toUpperCase();
}

/**
 * ID determinístico definitivo: ALI-{HASH_MENSAJE_16}-{INDICE_PERSISTIDO}.
 * INDICE_PERSISTIDO es el correlativo de la tarea DENTRO DEL MANIFIESTO,
 * asignado únicamente al persistirlo (persistirManifiestoTareas()) y nunca
 * recalculado en una recuperación posterior.
 */
function generarIdDeterministico(mensajeDescriptor, indicePersistido) {
  var hashMensaje = calcularHashMensaje16(mensajeDescriptor.messageId);
  var indiceFormateado = String(indicePersistido).padStart(3, '0');
  return 'ALI-' + hashMensaje + '-' + indiceFormateado;
}

function calcularHashContenido(tarea) {
  var base = tarea.resumen + '|' + tarea.tablero + '|' + tarea.observacionTextoOriginal;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, base)
    .map(function (b) { return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0'); })
    .join('');
}

/**
 * Lee el manifiesto ya persistido para un mensaje (si existe), reconstruyendo
 * los objetos de tarea completos a partir de Registro Tareas. Es la única
 * fuente que consulta una recuperación: nunca se vuelve a llamar a la IA
 * para reconstruir un manifiesto ya persistido (regla de la Fase 5).
 */
function obtenerManifiestoPersistido(messageId, cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.REGISTRO_TAREAS, cfg);
  var datos = hoja.getDataRange().getValues();
  var tareas = [];

  for (var fila = 1; fila < datos.length; fila++) {
    if (datos[fila][1] === messageId) { // columna 2: message_id
      tareas.push({
        taskId: datos[fila][0],
        messageId: datos[fila][1],
        threadId: datos[fila][2],
        tablero: datos[fila][3],
        estadoEscritura: datos[fila][4],
        filaDestino: datos[fila][5] || null,
        resumen: datos[fila][9],
        prioridad: datos[fila][10],
        grupoOrigen: datos[fila][11],
        responsable: datos[fila][12],
        fechaLimite: datos[fila][13] || null,
        observacionNumero: datos[fila][14],
        observacionTextoOriginal: datos[fila][15],
        filaManifiesto: fila + 1 // Número de fila real en Registro Tareas, 1-indexado.
      });
    }
  }

  return tareas; // Arreglo vacío si el mensaje no tiene manifiesto persistido aún.
}

/**
 * Persiste el manifiesto de tareas de un mensaje: asigna el ID determinístico
 * a cada tarea (una sola vez) y escribe todas las filas en Registro Tareas
 * como RESERVADA, ANTES de escribir ningún tablero de negocio.
 *
 * Idempotente a nivel de invocación: si el mensaje ya tiene un manifiesto
 * persistido (por ejemplo, por una invocación repetida dentro de la misma
 * recuperación), se reutiliza el existente en lugar de generar IDs nuevos
 * o filas duplicadas ("comprobar si el ID ya existe contra Registro Tareas
 * y el Indice Idempotencia, no leyendo las 5 hojas de destino").
 *
 * Nota: las tareas devueltas NO incluyen datosCorreo (remitente/asunto/fecha/
 * link): esa información vive en Log Mensajes / el propio mensaje de Gmail,
 * no en el manifiesto de Registro Tareas. Es responsabilidad del llamador
 * (procesarUnMensaje() o reanudarDesdeManifiesto()) adjuntar datosCorreo a
 * cada tarea antes de pasarlas a escribirFilasPorLote().
 */
function persistirManifiestoTareas(mensajeDescriptor, tareasNormalizadas, cfg) {
  var manifiestoExistente = obtenerManifiestoPersistido(mensajeDescriptor.messageId, cfg);
  if (manifiestoExistente.length > 0) {
    Logger.log('persistirManifiestoTareas(): manifiesto ya existente para ' + mensajeDescriptor.messageId + ', se reutiliza (' + manifiestoExistente.length + ' tarea(s)).');
    return manifiestoExistente;
  }

  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.REGISTRO_TAREAS, cfg);
  var ahora = new Date();
  var filas = [];
  var tareasConId = [];

  tareasNormalizadas.forEach(function (tarea, indice) {
    var indicePersistido = indice + 1; // Correlativo dentro del manifiesto, asignado una sola vez.
    var taskId = generarIdDeterministico(mensajeDescriptor, indicePersistido);

    // INC-FASE8-009: resumen y observacionTextoOriginal son texto libre
    // derivado del contenido del correo (vía IA) — se sanitizan antes de
    // escribir en esta hoja técnica. tablero/prioridad/grupoOrigen/responsable
    // están restringidos a catálogos fijos (esquema_json.gs) y ninguno de
    // sus valores posibles comienza con =/+/-/@; no requieren sanitización.
    filas.push([
      taskId, tarea.messageId, tarea.threadId, tarea.tablero,
      ESTADOS_ESCRITURA_TAREA.RESERVADA, '', ahora, '',
      calcularHashContenido(tarea),
      sanitizarValoresParaSheets(tarea.resumen), tarea.prioridad, tarea.grupoOrigen, tarea.responsable,
      tarea.fechaLimite || '', tarea.observacionNumero,
      sanitizarValoresParaSheets(tarea.observacionTextoOriginal)
    ]);

    tarea.taskId = taskId;
    tareasConId.push(tarea);
  });

  if (filas.length > 0) {
    hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, 16).setValues(filas);
  }

  return tareasConId;
}
