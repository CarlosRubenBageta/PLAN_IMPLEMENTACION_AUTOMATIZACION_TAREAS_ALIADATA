/**
 * ============================================================================
 * BORRADOR — Fase 7 (Escritura segura en Google Sheets). NO DESPLEGAR.
 * ============================================================================
 * Reemplaza agruparFilasPorHoja(), escribirFilasPorLote(), marcarTareasEscritas()
 * y construirEnlaceCorreo() del borrador de Fase 3
 * (codigo/script_refactorizado.gs) con la versión definitiva de esta fase:
 * validación de existencia de hoja (sin destino por defecto silencioso),
 * fechas como objetos Date reales, y corrección del enlace al correo para
 * que funcione con varias cuentas de Google iniciadas (CP-24).
 *
 * Detalle: documentacion/MAPA_ESCRITURA.md.
 * Requiere HOJAS_TECNICAS, ESTADOS_ESCRITURA_TAREA de
 * codigo/script_refactorizado.gs, sanitizarValoresParaSheets() y
 * validarFilaCompleta() de codigo/sanitizacion.gs.
 * ============================================================================
 */

// H-09 (auditoría Fase 8): CUENTA_OPERATIVA eliminada como constante —
// se lee desde cfg.cuentaOperativa, cargada en validarConfiguracion().

function agruparFilasPorHoja(tareas) {
  var porHoja = {};
  tareas.forEach(function (tarea) {
    if (!porHoja[tarea.tablero]) porHoja[tarea.tablero] = [];
    porHoja[tarea.tablero].push(tarea);
  });
  return porHoja;
}

/**
 * Construye la fecha límite como objeto Date real a partir del ISO 8601
 * recibido de la IA, usando componentes locales (no `new Date(isoString)`).
 *
 * Motivo: `new Date("2026-07-24")` (fecha sin hora) se interpreta SIEMPRE
 * como medianoche UTC por especificación de ECMAScript, incluso en Apps
 * Script. En una zona horaria como America/Argentina/Buenos_Aires (UTC-3),
 * esa medianoche UTC corresponde a las 21:00 del día ANTERIOR en hora local,
 * por lo que la fecha visible en la hoja podría aparecer un día antes de lo
 * esperado. Construir la fecha con `new Date(año, mes-1, día)` usa la zona
 * horaria configurada del proyecto (comportamiento propio de Apps Script) y
 * evita el corrimiento.
 */
function construirFechaLocal(fechaISO) {
  var partes = fechaISO.split('-');
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

/**
 * Escribe todas las filas de cada hoja en una sola llamada `setValues()`.
 * Fase 7: valida que la hoja exista antes de escribir (nunca usa una hoja
 * de reserva silenciosa, a diferencia de "Gestión General" por defecto en
 * script_actual.gs); si falta, esas tareas quedan sin escribir y el
 * llamador decide enviar el mensaje a revisión manual. También valida que
 * cada fila tenga exactamente 17 valores antes de agregarla al lote.
 */
function escribirFilasPorLote(filasPorHoja, cfg) {
  var planilla = SpreadsheetApp.openById(cfg.spreadsheetIdEfectivo);
  var resultado = {}; // taskId -> { escrita: bool, fila: number|null, motivo: string|null }

  Object.keys(filasPorHoja).forEach(function (nombreTablero) {
    var tareasDeHoja = filasPorHoja[nombreTablero];
    var hoja = planilla.getSheetByName(nombreTablero);

    if (!hoja) {
      // Regla dura de la Fase 7: "no utilizar una hoja por defecto
      // silenciosa ante errores" / "si una hoja no existe, enviar el
      // mensaje a revisión manual". No se escribe en ninguna otra hoja.
      Logger.log('escribirFilasPorLote(): la hoja "' + nombreTablero + '" no existe; ' + tareasDeHoja.length + ' tarea(s) sin escribir.');
      // Fase 10 (codigo/alertas.gs).
      enviarAlertaTecnica('HOJA_INEXISTENTE', 'La hoja de destino "' + nombreTablero + '" no existe en la planilla', tareasDeHoja.length + ' tarea(s) sin escribir.');
      tareasDeHoja.forEach(function (tarea) {
        resultado[tarea.taskId] = { escrita: false, fila: null, motivo: 'Hoja de destino inexistente: ' + nombreTablero };
      });
      return; // Continúa con el resto de las hojas del lote.
    }

    var filaInicial = hoja.getLastRow() + 1;
    var filas = tareasDeHoja.map(function (tarea) {
      var fechaHoy = new Date();
      var fila = [
        tarea.taskId,
        tarea.datosCorreo.fecha, // Date real (Fase 7); Sheets aplica el formato de columna ya existente.
        'Gmail',
        tarea.grupoOrigen,
        sanitizarValoresParaSheets(tarea.datosCorreo.remitente),
        sanitizarValoresParaSheets(tarea.datosCorreo.asunto),
        sanitizarValoresParaSheets(tarea.resumen),
        tarea.prioridad,
        '',
        'Pendiente',
        tarea.responsable,
        tarea.fechaLimite ? construirFechaLocal(tarea.fechaLimite) : '', // Date real, no string (Fase 7).
        tarea.datosCorreo.link,
        '',
        '',
        fechaHoy, // Date real (Fase 7).
        sanitizarValoresParaSheets(tarea.observacionTextoOriginal)
      ];

      if (!validarFilaCompleta(fila)) {
        throw new Error('Fila con cantidad de columnas incorrecta para la tarea ' + tarea.taskId + ': ' + fila.length + ' (se esperaban 17).');
      }
      return fila;
    });

    if (cfg.dryRun) {
      Logger.log('[DRY_RUN] Se escribirían ' + filas.length + ' fila(s) en "' + nombreTablero + '".');
      tareasDeHoja.forEach(function (tarea, idx) {
        resultado[tarea.taskId] = { escrita: true, fila: filaInicial + idx, motivo: null };
      });
      return;
    }

    hoja.getRange(filaInicial, 1, filas.length, 17).setValues(filas);
    tareasDeHoja.forEach(function (tarea, idx) {
      resultado[tarea.taskId] = { escrita: true, fila: filaInicial + idx, motivo: null };
    });
  });

  return resultado;
}

/** Actualiza Registro Tareas: RESERVADA → ESCRITA (o ERROR_ESCRITURA), con fila_destino y fecha_escritura. */
function marcarTareasEscritas(tareas, resultadoEscritura, cfg) {
  var hoja = obtenerHojaTecnica(HOJAS_TECNICAS.REGISTRO_TAREAS, cfg);
  var datos = hoja.getDataRange().getValues();
  var ahora = new Date();

  tareas.forEach(function (tarea) {
    var res = resultadoEscritura[tarea.taskId];
    for (var fila = 1; fila < datos.length; fila++) {
      if (datos[fila][0] === tarea.taskId) {
        var numeroFilaReal = fila + 1;
        if (res && res.escrita) {
          hoja.getRange(numeroFilaReal, 5, 1, 4).setValues([[ESTADOS_ESCRITURA_TAREA.ESCRITA, res.fila, datos[fila][6], ahora]]);
        } else {
          hoja.getRange(numeroFilaReal, 5).setValue(ESTADOS_ESCRITURA_TAREA.ERROR_ESCRITURA);
        }
        break;
      }
    }
  });
}

/**
 * Construye un enlace directo al MENSAJE individual (no al hilo), corrigiendo
 * un bug real del borrador de Fase 3: la versión anterior usaba la ruta
 * `/mail/u/0/`, que asume que la cuenta operativa es la PRIMERA cuenta de
 * Google iniciada en el navegador de quien abre el enlace — si esa persona
 * tiene varias cuentas y `tareas@alia-data.com` no está en la posición 0,
 * el enlace abre la bandeja equivocada (o pide reautenticación). El plan v3
 * (Fase 7) exige explícitamente no usar rutas dependientes de la posición
 * de sesión.
 *
 * Corrección: se reemplaza `/u/0/` por el parámetro `?authuser=<email>`,
 * que Gmail resuelve por dirección de correo en lugar de por posición,
 * funcionando igual sin importar el orden de las cuentas iniciadas (CP-24).
 */
// H-09 (auditoría Fase 8): firma extendida con cfg para recibir cuentaOperativa
// en lugar de leerla de la constante global eliminada.
function construirEnlaceCorreo(mensaje, cfg) {
  var messageIdHeader = mensaje.getHeader('Message-ID');
  if (messageIdHeader) {
    var limpio = messageIdHeader.replace(/[<>]/g, '');
    return 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(cfg.cuentaOperativa) +
      '#search/rfc822msgid:' + encodeURIComponent(limpio);
  }
  // Reserva: si el mensaje no expone Message-ID (caso excepcional), se usa
  // el permalink del hilo. GmailThread.getPermalink() no depende de la
  // posición de sesión (usa un token de sesión independiente de /u/N/).
  return mensaje.getThread().getPermalink();
}
