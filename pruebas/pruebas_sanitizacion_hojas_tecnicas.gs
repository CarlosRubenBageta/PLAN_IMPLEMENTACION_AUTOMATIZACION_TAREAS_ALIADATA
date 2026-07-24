/**
 * ============================================================================
 * pruebas/pruebas_sanitizacion_hojas_tecnicas.gs — pruebas deterministas locales
 * ============================================================================
 * Cubre INC-FASE8-009 (auditoria/CHANGELOG.md): un asunto de correo que
 * comienza con "=" se escribía sin sanitizar en Log Mensajes, ejecutándose
 * como fórmula en Google Sheets (evidencia real: CP-23, `#ERROR!` en F20 de
 * `Log Mensajes`; ver pruebas/resultados/INCIDENCIAS_FASE_8.md).
 *
 * Este archivo sustituye la hoja de cálculo real por una hoja falsa en
 * memoria (crearHojaTecnicaFalsa()), reemplazando temporalmente
 * obtenerHojaTecnica() dentro de cada caso, para ejercitar
 * registrarInicioProcesamiento(), actualizarLogMensajes() y
 * persistirManifiestoTareas() sin llamar a SpreadsheetApp ni acceder a
 * Google Workspace. No es necesario copiarlo al proyecto productivo.
 * Ninguno de los valores usados aquí es un dato real de correo.
 */

/** Hoja falsa en memoria: filas[0] son encabezados, igual que getDataRange().getValues(). */
function crearHojaTecnicaFalsa(filasIniciales) {
  var datos = filasIniciales.map(function (fila) { return fila.slice(); });
  return {
    getDataRange: function () {
      return { getValues: function () { return datos.map(function (f) { return f.slice(); }); } };
    },
    getLastRow: function () { return datos.length; },
    getRange: function (fila, col, numFilas, numCols) {
      return {
        setValues: function (valores) {
          for (var i = 0; i < valores.length; i++) {
            var filaDestino = fila + i - 1; // -1: la fila 1 de Sheets es el índice 0 de datos.
            while (datos.length <= filaDestino) datos.push([]);
            for (var j = 0; j < valores[i].length; j++) {
              datos[filaDestino][col - 1 + j] = valores[i][j];
            }
          }
        },
        setValue: function (valor) {
          var filaDestino = fila - 1;
          while (datos.length <= filaDestino) datos.push([]);
          datos[filaDestino][col - 1] = valor;
        }
      };
    },
    _datos: function () { return datos; }
  };
}

function crearMensajeFalso(remitente, asunto) {
  return { getFrom: function () { return remitente; }, getSubject: function () { return asunto; } };
}

function ejecutarPruebasSanitizacionHojasTecnicas() {
  var nombresCasos = [];
  var fallos = 0;

  function assert(nombre, condicion, detalle) {
    nombresCasos.push(nombre);
    if (condicion) {
      Logger.log('[PASA] ' + nombre);
    } else {
      fallos++;
      Logger.log('[FALLA] ' + nombre + (detalle ? ' — ' + detalle : ''));
    }
  }

  function conHojaFalsa(hoja, fn) {
    var original = obtenerHojaTecnica;
    obtenerHojaTecnica = function () { return hoja; };
    try {
      fn();
    } finally {
      obtenerHojaTecnica = original;
    }
  }

  // --- registrarInicioProcesamiento(): fila NUEVA, los cuatro prefijos peligrosos ---
  ['=CONCAT(1,2)', '+1+1', '-1-1', '@mención'].forEach(function (asuntoPeligroso, idx) {
    var hoja = crearHojaTecnicaFalsa([[]]);
    conHojaFalsa(hoja, function () {
      var descriptor = {
        messageId: 'FAKE-NUEVA-' + idx,
        threadId: 'FAKE-THREAD-' + idx,
        mensaje: crearMensajeFalso('remitente@ejemplo.com', asuntoPeligroso)
      };
      registrarInicioProcesamiento(descriptor, { versionScript: 'test' });
      var filaEscrita = hoja._datos()[1];
      assert('Log Mensajes, fila nueva, asunto "' + asuntoPeligroso + '" sanitizado',
        filaEscrita[5] === "'" + asuntoPeligroso,
        'obtenido: ' + JSON.stringify(filaEscrita[5]));
    });
  });

  // --- registrarInicioProcesamiento(): fila REUTILIZADA (message_id ya existente) ---
  (function () {
    var encabezados = [];
    var filaExistente = ['FAKE-REUSA', 'THREAD', new Date(), '', 'viejo@x.com', 'asunto viejo', 'PROCESADO', 'FINALIZADO'];
    var hoja = crearHojaTecnicaFalsa([encabezados, filaExistente]);
    conHojaFalsa(hoja, function () {
      var descriptor = {
        messageId: 'FAKE-REUSA',
        threadId: 'THREAD',
        mensaje: crearMensajeFalso('=IMPORTRANGE("x")', '=HYPERLINK("x")')
      };
      registrarInicioProcesamiento(descriptor, { versionScript: 'test' });
      var filaActualizada = hoja._datos()[1];
      assert('Log Mensajes, fila reutilizada, remitente sanitizado',
        filaActualizada[4] === "'=IMPORTRANGE(\"x\")", 'obtenido: ' + JSON.stringify(filaActualizada[4]));
      assert('Log Mensajes, fila reutilizada, asunto sanitizado',
        filaActualizada[5] === "'=HYPERLINK(\"x\")", 'obtenido: ' + JSON.stringify(filaActualizada[5]));
    });
  })();

  // --- actualizarLogMensajes(): campo string posterior (ej. error) sanitizado ---
  (function () {
    var encabezados = ['message_id', 'error'];
    var filaExistente = ['FAKE-UPD', ''];
    var hoja = crearHojaTecnicaFalsa([encabezados, filaExistente]);
    conHojaFalsa(hoja, function () {
      actualizarLogMensajes({ messageId: 'FAKE-UPD' }, { error: '=SUM(1,2)' }, {});
      var fila = hoja._datos()[1];
      assert('actualizarLogMensajes() sanitiza un campo string posterior (error)',
        fila[1] === "'=SUM(1,2)", 'obtenido: ' + JSON.stringify(fila[1]));
    });
  })();

  // --- actualizarLogMensajes(): valor string normal, sin modificar ---
  (function () {
    var encabezados = ['message_id', 'estado'];
    var filaExistente = ['FAKE-NORMAL', ''];
    var hoja = crearHojaTecnicaFalsa([encabezados, filaExistente]);
    conHojaFalsa(hoja, function () {
      actualizarLogMensajes({ messageId: 'FAKE-NORMAL' }, { estado: 'PROCESADO' }, {});
      var fila = hoja._datos()[1];
      assert('actualizarLogMensajes() no modifica un valor string normal',
        fila[1] === 'PROCESADO', 'obtenido: ' + JSON.stringify(fila[1]));
    });
  })();

  // --- actualizarLogMensajes(): tipos no string preservados (Date, number, boolean, vacío) ---
  (function () {
    var encabezados = ['message_id', 'cantidad_tareas', 'cuerpo_truncado', 'fecha_fin', 'resultado_gmail'];
    var filaExistente = ['FAKE-TIPOS', 0, false, '', ''];
    var hoja = crearHojaTecnicaFalsa([encabezados, filaExistente]);
    var fecha = new Date(2026, 6, 22);
    conHojaFalsa(hoja, function () {
      actualizarLogMensajes({ messageId: 'FAKE-TIPOS' }, {
        cantidad_tareas: 3, cuerpo_truncado: true, fecha_fin: fecha, resultado_gmail: ''
      }, {});
      var fila = hoja._datos()[1];
      assert('actualizarLogMensajes() no altera un number', fila[1] === 3, 'obtenido: ' + JSON.stringify(fila[1]));
      assert('actualizarLogMensajes() no altera un boolean', fila[2] === true, 'obtenido: ' + JSON.stringify(fila[2]));
      assert('actualizarLogMensajes() no altera un Date', fila[3] === fecha, 'obtenido: ' + JSON.stringify(fila[3]));
      assert('actualizarLogMensajes() no altera un string vacío', fila[4] === '', 'obtenido: ' + JSON.stringify(fila[4]));
    });
  })();

  // --- persistirManifiestoTareas(): resumen y observacionTextoOriginal sanitizados ---
  (function () {
    var hoja = crearHojaTecnicaFalsa([[]]); // sin manifiesto previo para este message_id
    conHojaFalsa(hoja, function () {
      var mensajeDescriptor = { messageId: 'FAKE-MANIFIESTO', threadId: 'THREAD-M' };
      var tareas = [{
        messageId: 'FAKE-MANIFIESTO', threadId: 'THREAD-M', tablero: 'Comercial',
        resumen: '=CONCAT("a","b")', prioridad: 'Alto', grupoOrigen: 'Ventas',
        responsable: 'Socio Comercial', fechaLimite: null, observacionNumero: 1,
        observacionTextoOriginal: '@mención maliciosa'
      }];
      persistirManifiestoTareas(mensajeDescriptor, tareas, {});
      var filaEscrita = hoja._datos()[1];
      assert('Registro Tareas, resumen sanitizado',
        filaEscrita[9] === "'=CONCAT(\"a\",\"b\")", 'obtenido: ' + JSON.stringify(filaEscrita[9]));
      assert('Registro Tareas, observacionTextoOriginal sanitizado',
        filaEscrita[15] === "'@mención maliciosa", 'obtenido: ' + JSON.stringify(filaEscrita[15]));
      assert('Registro Tareas, tablero (valor de catálogo) sin modificar',
        filaEscrita[3] === 'Comercial', 'obtenido: ' + JSON.stringify(filaEscrita[3]));
    });
  })();

  // --- resumen y observacionTextoOriginal normales (sin prefijo peligroso), sin modificar ---
  (function () {
    var hoja = crearHojaTecnicaFalsa([[]]);
    conHojaFalsa(hoja, function () {
      var mensajeDescriptor = { messageId: 'FAKE-MANIFIESTO-NORMAL', threadId: 'THREAD-N' };
      var tareas = [{
        messageId: 'FAKE-MANIFIESTO-NORMAL', threadId: 'THREAD-N', tablero: 'Finanzas',
        resumen: 'Revisar el estado de cuenta del cliente', prioridad: 'Medio', grupoOrigen: 'Administración',
        responsable: 'Sin asignar', fechaLimite: null, observacionNumero: 1,
        observacionTextoOriginal: 'Necesitamos revisar el estado de cuenta.'
      }];
      persistirManifiestoTareas(mensajeDescriptor, tareas, {});
      var filaEscrita = hoja._datos()[1];
      assert('Registro Tareas, resumen normal sin modificar',
        filaEscrita[9] === 'Revisar el estado de cuenta del cliente', 'obtenido: ' + JSON.stringify(filaEscrita[9]));
      assert('Registro Tareas, observacionTextoOriginal normal sin modificar',
        filaEscrita[15] === 'Necesitamos revisar el estado de cuenta.', 'obtenido: ' + JSON.stringify(filaEscrita[15]));
    });
  })();

  Logger.log('--- Resumen ---');
  Logger.log(fallos === 0
    ? 'ejecutarPruebasSanitizacionHojasTecnicas(): ' + nombresCasos.length + '/' + nombresCasos.length + ' verificaciones OK.'
    : 'ejecutarPruebasSanitizacionHojasTecnicas(): ' + fallos + ' de ' + nombresCasos.length + ' verificaciones FALLARON.');
}
