/**
 * ============================================================================
 * pruebas/pruebas_automatizador_integracion_fase8.gs — pruebas deterministas
 * EXCLUSIVO DEL PROYECTO DE PRUEBA / NO DESPLEGAR
 * ============================================================================
 * Cubre pruebas/automatizador_integracion_fase8.gs (Fase 2A + revisión
 * correctiva 23/07/2026) y la refacción de
 * codigo/script_refactorizado.gs (procesarCorreosDeTareasConConfiguracion_).
 *
 * Ninguna prueba accede a Gmail, Sheets ni OpenAI reales: el automatizador
 * usa un `amb` doble, y las pruebas del núcleo del pipeline reemplazan
 * temporalmente las funciones globales por dobles.
 *
 * Secciones:
 *  A. Barreras base fail-closed.
 *  B. Barrera de etiquetas (list + get).
 *  C. Localización del mensaje (query interna; cero/dos; remitente/asunto/label/INBOX).
 *  D. message_id ya registrado / sesión pendiente / sin lock / activador.
 *  E. Flujo simular -> formal correcto.
 *  F. Deltas entre simulación y formal bloquean la formal.
 *  G. Error formal reportado sin eliminar evidencia.
 *  H. Comparación de Sheets por encabezados.
 *  I. Sanitización.
 *  J. mostrar/cancelar.
 *  K. Núcleo del pipeline (recuperación producción vs. E2E) + resumen estructurado.
 *  L. Revisión correctiva: resumen del núcleo, cuerpo, remitente exacto,
 *     versión de prompt, baseline real, lecturas fail-closed, encabezados,
 *     timeout formal, fingerprint completo, cancelar no autorizado.
 *  M. INT-FASE8-02-DOS-TAREAS (CP-03, 24/07/2026): generalización de
 *     verificarResultadoFormal_() para 1 observación / 2 tareas — camino
 *     correcto; tablero faltante/adicional/duplicado; task_id vacío/
 *     duplicado; estado_escritura incorrecto; fila de negocio faltante/
 *     adicional/en tablero equivocado; divergencia de task_id entre
 *     manifiesto, índice y hoja de negocio; observacion_texto_original
 *     divergente; índice con entrada faltante/duplicada/estado incorrecto;
 *     etiquetas de Gmail incorrectas; sanitización; y no regresión de
 *     INT-FASE8-01-INFORMATIVO.
 *  N. Corrección del falso negativo real (messageId 19f948e5d35b5276,
 *     24/07/2026): localizarFilaEncabezadosNegocio_() ya no asume que los
 *     encabezados de una hoja de negocio están en la fila 1 — busca, sin
 *     número de fila fijo, la única fila con los 7 encabezados mínimos.
 *     Cubre: detección con el preámbulo real (fila 4); cero y dos filas
 *     candidatas; encabezado parcial; el pipeline corrompiendo una fila del
 *     preámbulo (detectado por el prefijo del baseline); y compatibilidad
 *     con una hoja cuyo encabezado está en la fila 1 (sin preámbulo).
 *  O. verificarClasificacionSimulada_(): SIMULACION_FALLIDA sin autorizar la
 *     formal cuando la clasificación simulada no coincide con fixture.esperado.
 *  P. INT-FASE8-04-TRES-TAREAS (CP-04): generalización a N=3.
 *  Q. INT-FASE8-05-OBSERVACIONES-DUPLICADAS (CP-15): generalización a N=1
 *     (consolidación RF-04).
 *  R. INT-FASE8-06-FIRMA-EXTENSA (CP-14): N=1 reutilizando
 *     efectoFormalUnaTareaFabrica_ sin cambios (exclusión de firma del prompt).
 *  S. INT-FASE8-07-CUERPO-VACIO (CP-16): rechazo por filtro determinístico
 *     (regla 6, cuerpo vacío tras extraerContenidoNuevo()) ANTES de la IA,
 *     reutilizando efectoFormalSinTareasCorrecto_ sin cambios.
 *  T. INT-FASE8-08-FECHA-LIMITE-EXPLICITA (CP-17): nueva verificación opcional
 *     de la columna "Fecha límite" en verificarResultadoFormal_() (camino
 *     correcto, día equivocado, celda vacía, y la rama fechaLimiteEsperada=null).
 *  U. INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA (CP-18): complemento exacto de
 *     CP-17, reutilizando sin cambios efectoFormalUnaTareaConFechaFabrica_.
 * ============================================================================
 */

// ============================================================================
// DOBLES (fakes)
// ============================================================================

/** Hoja falsa en memoria con valores y fórmulas. filas[0] son encabezados. */
function crearHojaFalsaIntegracion_(filas, formulas) {
  var datos = filas.map(function (f) { return f.slice(); });
  var forms = formulas ? formulas.map(function (f) { return f.slice(); }) : filas.map(function (f) { return f.map(function () { return ''; }); });
  return {
    getDataRange: function () {
      return {
        getValues: function () { return datos.map(function (f) { return f.slice(); }); },
        getFormulas: function () { return forms.map(function (f) { return f.slice(); }); }
      };
    },
    getLastRow: function () { return datos.length; },
    getRange: function (fila, col) {
      return {
        setValues: function (vals) {
          for (var i = 0; i < vals.length; i++) {
            var fd = fila + i - 1;
            while (datos.length <= fd) datos.push([]);
            for (var j = 0; j < vals[i].length; j++) datos[fd][col - 1 + j] = vals[i][j];
          }
        },
        setValue: function (v) { var fd = fila - 1; while (datos.length <= fd) datos.push([]); datos[fd][col - 1] = v; }
      };
    },
    _datos: function () { return datos; },
    _formulas: function () { return forms; }
  };
}

function encabezadosLogMensajes_() {
  return ['message_id', 'thread_id', 'estado', 'etapa', 'cantidad_observaciones', 'cantidad_tareas', 'resultado_gmail', 'error'];
}

/** Encabezados reales de Registro Tareas (documentacion/DISENO_HOJAS_TECNICAS.md, sección 2). */
function encabezadosRegistroTareas_() {
  return ['task_id', 'message_id', 'thread_id', 'tablero', 'estado_escritura', 'fila_destino',
    'fecha_reserva', 'fecha_escritura', 'hash_contenido', 'resumen', 'prioridad', 'grupo_origen',
    'responsable_sugerido', 'fecha_limite', 'observacion_numero', 'observacion_texto_original'];
}

/** Encabezados reales de una hoja de negocio (documentacion/MAPA_COLUMNAS.md). */
function encabezadosHojaNegocio_() {
  return ['ID', 'Fecha de entrada', 'Fuente', 'Grupo origen', 'Remitente', 'Asunto original',
    'Resumen de tarea', 'Prioridad sugerida IA', 'Prioridad final', 'Estado', 'Responsable',
    'Fecha límite', 'Link al correo', 'Link a Drive', 'Derivada a', 'Última actualización', 'Observaciones'];
}

/** Fila previa (preexistente, no relacionada con el mensaje bajo prueba) de una hoja de negocio. */
function filaNegocioPrevia_(id, prioridad) {
  return [id, 'FECHA-PREVIA', 'Gmail', 'Administración', 'previo@ejemplo.invalid', 'Asunto previo',
    'Tarea previa no relacionada', prioridad, '', 'Pendiente', 'Sin asignar', '', 'LINK-PREVIO', '', '', 'FECHA-PREVIA', 'Observación previa'];
}

/**
 * Preámbulo real de una hoja de negocio (24/07/2026, corrige el falso
 * negativo real `messageId 19f948e5d35b5276`): título en fila 1, fila
 * auxiliar "Grupo fuente sugerido" en fila 2, fila vacía en fila 3,
 * encabezados recién en fila 4. Todas las filas tienen la misma cantidad de
 * columnas que encabezadosHojaNegocio_(), para que un hash de contenido sea
 * comparable fila a fila.
 */
function filaTituloNegocio_(tablero) {
  var fila = encabezadosHojaNegocio_().map(function () { return ''; });
  fila[0] = 'Tablero ' + tablero;
  return fila;
}
function filaFuenteSugeridaNegocio_() {
  var fila = encabezadosHojaNegocio_().map(function () { return ''; });
  fila[0] = 'Grupo fuente sugerido';
  return fila;
}
function filaVaciaNegocio_() {
  return encabezadosHojaNegocio_().map(function () { return ''; });
}
/** Hoja de negocio completa con el preámbulo real (fila 1-3) + encabezados (fila 4) + 1 fila de datos previa (fila 5). */
function crearHojaNegocioFalsa_(tablero, idPrevio, prioridadPrevia) {
  return crearHojaFalsaIntegracion_([
    filaTituloNegocio_(tablero),
    filaFuenteSugeridaNegocio_(),
    filaVaciaNegocio_(),
    encabezadosHojaNegocio_(),
    filaNegocioPrevia_(idPrevio, prioridadPrevia)
  ]);
}

/** Efecto formal SIN_TAREAS correcto: no toca hojas de negocio. */
function efectoFormalSinTareasCorrecto_(estado) {
  var log = estado.sheets['Log Mensajes'];
  var enc = log._datos()[0];
  var fila = [];
  for (var i = 0; i < enc.length; i++) fila.push('');
  function set(nombre, val) { var idx = enc.indexOf(nombre); if (idx !== -1) fila[idx] = val; }
  set('message_id', estado.mensaje.id);
  set('thread_id', 'TH-1');
  set('estado', 'SIN_TAREAS');
  set('etapa', 'FINALIZADO');
  set('cantidad_observaciones', 0);
  set('cantidad_tareas', 0);
  set('resultado_gmail', 'SOLO_ETIQUETADO');
  set('error', 'CANARIO_MOTIVO_SIN_TAREAS_no_debe_registrarse');
  log._datos().push(fila);
  estado.sheets['Indice Idempotencia']._datos().push([estado.mensaje.id, '', 'SIN_TAREAS', 'FECHA']);
  if (estado.mensaje.labelIds.indexOf('L_SINTAREAS') === -1) estado.mensaje.labelIds.push('L_SINTAREAS');
}

/** Efecto formal INCORRECTO (resultado_gmail equivocado, sin etiqueta). */
function efectoFormalIncorrecto_(estado) {
  var log = estado.sheets['Log Mensajes'];
  var enc = log._datos()[0];
  var fila = [];
  for (var i = 0; i < enc.length; i++) fila.push('');
  function set(nombre, val) { var idx = enc.indexOf(nombre); if (idx !== -1) fila[idx] = val; }
  set('message_id', estado.mensaje.id);
  set('estado', 'SIN_TAREAS');
  set('etapa', 'FINALIZADO');
  set('cantidad_observaciones', 0);
  set('cantidad_tareas', 0);
  set('resultado_gmail', 'OMITIDO_POR_CONFIGURACION');
  set('error', 'x');
  log._datos().push(fila);
  estado.sheets['Indice Idempotencia']._datos().push([estado.mensaje.id, '', 'SIN_TAREAS', 'FECHA']);
}

var CUERPO_PILOTO_ = [
  'Hola, les comparto un aviso exclusivamente informativo para el equipo de la sede de prueba.',
  '',
  'A partir del proximo mes, el horario de atencion al publico de la sede de prueba pasa a ser de 9 a 18 horas.',
  'No se requiere ninguna accion de nadie del equipo; es solo para que esten al tanto del cambio ya decidido.',
  '',
  'Gracias.'
].join('\n');

function crearEstadoIntegracion_(overrides) {
  overrides = overrides || {};
  var estado = {
    scriptId: 'SCRIPT_PRUEBA_OK',
    proyectoAutorizado: 'SCRIPT_PRUEBA_OK',
    cuenta: 'carlosrubenbageta@alia-data.com',
    cuentaAutorizada: 'carlosrubenbageta@alia-data.com',
    spreadsheetPruebaAutorizado: '1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o',
    etiquetaPruebaAutorizada: 'Pruebas-Automatizacion',
    versionPromptActual: 'v4-INC-FASE8-011-informativo-sin-tareas',
    props: {
      MODO_PRUEBA: 'true', DRY_RUN: 'true',
      SPREADSHEET_ID: 'PRODUCTIVO', SPREADSHEET_ID_PRUEBA: '1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o',
      ETIQUETA_PRUEBA: 'Pruebas-Automatizacion',
      ID_ETIQUETA_PROCESADO: 'L_PROC', ID_ETIQUETA_REVISION_SIN_TAREAS: 'L_SINTAREAS',
      ID_ETIQUETA_REVISION_ERROR_PROCESAMIENTO: 'L_ERRPROC', ID_ETIQUETA_REVISION_ERROR_AUTOMATIZACION: 'L_ERRAUTO',
      OPENAI_API_KEY: 'sk-canario-no-debe-aparecer'
    },
    userProps: {},
    labels: [
      { id: 'L_PRUEBA', name: 'Pruebas-Automatizacion' },
      { id: 'L_PROC', name: 'Procesado' },
      { id: 'L_SINTAREAS', name: 'Revisión manual/Sin tareas detectadas' },
      { id: 'L_ERRPROC', name: 'Revisión manual/Error de procesamiento' },
      { id: 'L_ERRAUTO', name: 'Revisión manual/Error de automatización' }
    ],
    triggers: [],
    lockDisponible: true,
    lockReleases: 0,
    configWrites: [],
    logs: [],
    idsGenerados: 0,
    reloj: 1000,
    llamadasNucleo: [],
    efectoFormal: efectoFormalSinTareasCorrecto_,
    dryRunPersisteMal: false,
    nucleoLanzaTrasEfecto: false,
    resumenNucleoOverride: undefined,
    // Anula SOLO la clasificación simulada (resultadosSimulados[0].resultado)
    // que el núcleo falso devuelve en DRY_RUN, sin tener que reconstruir todo
    // el resumen (mensajesElegibles, messageIdsIntentados, etc.). Cuando es
    // undefined, clasificacionSimuladaPorDefecto_() deriva la clasificación
    // directamente de fixture.esperado (comportamiento "camino correcto").
    clasificacionSimuladaOverride: undefined,
    lecturaHojaFalla: null,
    obtenerManifiestoFalla: false,
    mensaje: { presente: true, id: 'MSG-NUEVO-1', count: 1, marcador: null, subject: null, cuerpo: null, from: 'Tester <sichar@gmail.com>', labelIds: ['INBOX', 'L_PRUEBA'] },
    configBase: {
      valido: true,
      cfg: {
        modoPrueba: true, dryRun: true,
        spreadsheetId: 'PRODUCTIVO', spreadsheetIdPrueba: '1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o',
        spreadsheetIdEfectivo: '1Rl_6nzrflGqu4eimkeVgjJl1kaCFHK7ZF3uYHVvdA-o',
        openaiApiKey: 'sk-canario-no-debe-aparecer', openaiModel: 'gpt-4o-mini',
        maxMensajesPorEjecucion: 5, maxMensajesBusqueda: 20,
        tiempoInternoMaxMs: 300000, permitirEtiquetado: false, permitirArchivado: false,
        idsEtiquetas: { Procesado: 'L_PROC', RevisionSinTareas: 'L_SINTAREAS', RevisionErrorProcesamiento: 'L_ERRPROC', RevisionErrorAutomatizacion: 'L_ERRAUTO' }
      }
    }
  };

  estado.sheets = {
    'Log Mensajes': crearHojaFalsaIntegracion_([encabezadosLogMensajes_()]),
    'Registro Tareas': crearHojaFalsaIntegracion_([encabezadosRegistroTareas_()]),
    'Indice Idempotencia': crearHojaFalsaIntegracion_([['message_id', 'task_id', 'estado_final', 'fecha']]),
    // Cinco hojas de negocio de TABLEROS_VALIDOS, con el preámbulo real
    // (título / fila auxiliar / fila vacía / encabezados en fila 4) y una
    // fila previa (no relacionada con el mensaje bajo prueba) para poder
    // comprobar que permanece intacta cuando se agregan tareas nuevas a otro
    // tablero, y para poder mutarla en las pruebas de baseline.
    'Finanzas': crearHojaNegocioFalsa_('Finanzas', 'ID-PREVIO-F', 'Alto'),
    'Comercial': crearHojaNegocioFalsa_('Comercial', 'ID-PREVIO-C', 'Medio'),
    'Soporte': crearHojaNegocioFalsa_('Soporte', 'ID-PREVIO-S', 'Bajo'),
    'Desarrollo IT': crearHojaNegocioFalsa_('Desarrollo IT', 'ID-PREVIO-D', 'Alto'),
    'Gestión General': crearHojaNegocioFalsa_('Gestión General', 'ID-PREVIO-G', 'Medio')
  };

  Object.keys(overrides).forEach(function (k) { estado[k] = overrides[k]; });
  return estado;
}

/**
 * Clasificación simulada que el núcleo falso devuelve por defecto en DRY_RUN
 * (resultadosSimulados[0].resultado). Si el test fijó
 * estado.clasificacionSimuladaOverride, se usa tal cual (para las pruebas
 * negativas de verificarClasificacionSimulada_()). Si no, se DERIVA de
 * fixture.esperado del fixture activo en la sesión — así el camino correcto
 * (M20, M21, y en general cualquier prueba que no fije el override) sigue
 * aprobando automáticamente para cualquier fixture, sin tener que listar cada
 * uno aquí ni duplicar sus datos esperados.
 */
function clasificacionSimuladaPorDefecto_(estado) {
  if (estado.clasificacionSimuladaOverride !== undefined) return estado.clasificacionSimuladaOverride;
  var crudo = estado.userProps[INTEGRACION_CLAVE_SESION];
  var sesion = crudo ? JSON.parse(crudo) : null;
  var fixture = sesion ? obtenerFixtureIntegracion_(sesion.fixtureId) : null;
  var esperado = fixture ? fixture.esperado : { cantidad_observaciones: 0, cantidad_tareas: 0, tareasEsperadas: [] };
  // Fixtures cuyo resultado real es NO_ELEGIBLE/RESPUESTA_IA_INVALIDA/REQUIERE_REVISION
  // (rechazo antes de una clasificación real de la IA, ver verificarClasificacionSimulada_())
  // reproducen fielmente la forma exacta que devuelve procesarUnMensajeSimulado() para esas
  // categorías: cantidades null y tableros vacío — nunca la derivación genérica de abajo,
  // que asume que la IA sí clasificó (24/07/2026, hallazgo real INT-FASE8-07-CUERPO-VACIO).
  if (esperado.resultadoSimulado && esperado.resultadoSimulado !== 'SIN_TAREAS' && esperado.resultadoSimulado !== 'TAREAS_SIMULADAS') {
    return { resultado: esperado.resultadoSimulado, cantidadObservaciones: null, cantidadTareas: null, tableros: [] };
  }
  var tableros = (esperado.tareasEsperadas || []).map(function (t) { return t.tablero; });
  return {
    resultado: esperado.cantidad_tareas > 0 ? 'TAREAS_SIMULADAS' : 'SIN_TAREAS',
    cantidadObservaciones: esperado.cantidad_observaciones,
    cantidadTareas: esperado.cantidad_tareas,
    tableros: tableros
  };
}

function crearAmbFalsoIntegracion_(estado) {
  return {
    props: {
      getProperty: function (k) { return Object.prototype.hasOwnProperty.call(estado.props, k) ? estado.props[k] : null; },
      setProperty: function (k) { estado.configWrites.push(k); }
    },
    userProps: {
      getProperty: function (k) { return Object.prototype.hasOwnProperty.call(estado.userProps, k) ? estado.userProps[k] : null; },
      setProperty: function (k, v) { estado.userProps[k] = v; },
      deleteProperty: function (k) { delete estado.userProps[k]; }
    },
    scriptId: function () { return estado.scriptId; },
    usuarioEfectivo: function () { return estado.cuenta; },
    triggers: function () { return estado.triggers; },
    obtenerLock: function () { return { tryLock: function () { return estado.lockDisponible; }, releaseLock: function () { estado.lockReleases++; } }; },
    ahora: function () { return estado.reloj++; },
    nuevoId: function () { return 'ID-' + (++estado.idsGenerados); },
    log: function (msg) { estado.logs.push(String(msg)); },
    versionPromptActual: function () { return estado.versionPromptActual; },
    gmailLabelsList: function () { return { labels: estado.labels.slice() }; },
    gmailLabelsGet: function (id) {
      var l = estado.labels.filter(function (x) { return x.id === id; })[0];
      if (!l) throw new Error('label inexistente');
      return { id: l.id, name: l.name };
    },
    gmailMessagesList: function (params) {
      if (!estado.mensaje.presente || estado.mensaje.count === 0) return { messages: [] };
      if (params.q.indexOf(estado.mensaje.marcador) === -1) return { messages: [] };
      var msgs = [];
      for (var i = 0; i < estado.mensaje.count; i++) msgs.push({ id: i === 0 ? estado.mensaje.id : estado.mensaje.id + '-' + i, threadId: 'TH-1' });
      if (params.maxResults) msgs = msgs.slice(0, params.maxResults);
      return { messages: msgs };
    },
    gmailMessageGet: function () {
      return { labelIds: estado.mensaje.labelIds.slice(), payload: { headers: [{ name: 'Subject', value: estado.mensaje.subject }, { name: 'From', value: estado.mensaje.from }] } };
    },
    gmailMensajeCuerpoPlano: function () {
      if (estado.mensaje.cuerpoLecturaFalla) throw new Error('cuerpo no leible');
      return estado.mensaje.cuerpo;
    },
    validarConfiguracion: function () { return JSON.parse(JSON.stringify(estado.configBase)); },
    obtenerHojaTecnica: function (nombre) {
      if (!estado.sheets[nombre]) throw new Error('hoja falsa inexistente: ' + nombre);
      return estado.sheets[nombre];
    },
    leerContenidoHoja: function (nombre) {
      if (estado.lecturaHojaFalla === nombre) throw new Error('lectura de hoja falla: ' + nombre);
      var h = estado.sheets[nombre];
      if (!h) throw new Error('hoja inexistente: ' + nombre);
      var dr = h.getDataRange();
      return { valores: dr.getValues(), formulas: dr.getFormulas(), filas: h.getLastRow() };
    },
    obtenerManifiestoPersistido: function (messageId) {
      if (estado.obtenerManifiestoFalla) throw new Error('manifiesto no leible');
      var t = estado.sheets['Registro Tareas'];
      var datos = t._datos();
      var idx = datos[0].indexOf('message_id');
      var res = [];
      for (var i = 1; i < datos.length; i++) if (String(datos[i][idx]) === String(messageId)) res.push({ taskId: datos[i][0] });
      return res;
    },
    procesarNucleo: function (cfg, opciones) {
      estado.llamadasNucleo.push({ dryRun: cfg.dryRun, opciones: opciones, query: cfg.gmailQueryEfectiva, maxEj: cfg.maxMensajesPorEjecucion });
      if (!cfg.dryRun) {
        estado.efectoFormal(estado);
        if (estado.nucleoLanzaTrasEfecto) throw new Error('timeout/excepcion simulada tras efecto');
      } else if (estado.dryRunPersisteMal) {
        estado.efectoFormal(estado);
      }
      if (estado.resumenNucleoOverride !== undefined) return estado.resumenNucleoOverride;
      return {
        mensajesElegibles: 1, limiteCalculado: 1, messageIdsIntentados: [estado.mensaje.id],
        cantidadIntentada: 1, cantidadConErrorAislado: 0, detenidoPorTiempo: false,
        // Igual que el núcleo real: resultadosSimulados solo se puebla en
        // DRY_RUN (ver procesarCorreosDeTareasConConfiguracion_() en
        // codigo/script_refactorizado.gs); en la corrida formal (dryRun=false)
        // queda vacío.
        resultadosSimulados: cfg.dryRun ? [{ messageId: estado.mensaje.id, resultado: clasificacionSimuladaPorDefecto_(estado) }] : []
      };
    },
    proyectoAutorizado: estado.proyectoAutorizado,
    cuentaAutorizada: estado.cuentaAutorizada,
    spreadsheetPruebaAutorizado: estado.spreadsheetPruebaAutorizado,
    etiquetaPruebaAutorizada: estado.etiquetaPruebaAutorizada,
    nombresEtiqueta: INTEGRACION_NOMBRES_ETIQUETA
  };
}

/** Simula que el tester envió el correo: configura el mensaje falso según la sesión. */
function simularEnvioMensaje_(estado, opciones) {
  opciones = opciones || {};
  var sesion = JSON.parse(estado.userProps[INTEGRACION_CLAVE_SESION]);
  var fixture = obtenerFixtureIntegracion_(sesion.fixtureId);
  estado.mensaje.marcador = sesion.marcador;
  estado.mensaje.subject = ('asuntoIncorrecto' in opciones) ? opciones.asuntoIncorrecto : fixture.asuntoBase + ' [' + sesion.marcador + ']';
  estado.mensaje.cuerpo = ('cuerpo' in opciones) ? opciones.cuerpo : fixture.cuerpo;
  return sesion;
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-02-DOS-TAREAS (CP-03)
// ============================================================================

/** Crea el estado base seleccionando el fixture de dos tareas vía AUTO_FASE8_CASO. */
function crearEstadoDosTareas_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-02-DOS-TAREAS';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de dos tareas. */
function prepararSimuladoDosTareas_(overridesEstado) {
  var estado = crearEstadoDosTareas_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

/**
 * Fábrica del efecto formal para INT-FASE8-02-DOS-TAREAS: aplica, sobre las
 * hojas falsas, el resultado que el pipeline real escribiría para un mensaje
 * con 1 observación y 2 tareas (Desarrollo IT + Comercial), y permite inyectar
 * cualquier desviación puntual mediante `opciones` para las pruebas negativas
 * (sección M). Por defecto reproduce el camino correcto.
 */
function efectoFormalDosTareasFabrica_(opciones) {
  opciones = opciones || {};
  return function (estado) {
    var mid = estado.mensaje.id;
    var t1 = 'taskId1' in opciones ? opciones.taskId1 : mid + '-T1';
    var t2 = 'taskId2' in opciones ? opciones.taskId2 : mid + '-T2';
    var tablero1 = opciones.tablero1 || 'Desarrollo IT';
    var tablero2 = opciones.tablero2 || 'Comercial';
    var estadoEscritura1 = opciones.estadoEscritura1 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var estadoEscritura2 = opciones.estadoEscritura2 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var texto1 = 'texto1' in opciones ? opciones.texto1 : 'CANARIO_OBS_TEXTO_ORIGINAL_no_debe_registrarse_en_logs';
    var texto2 = 'texto2' in opciones ? opciones.texto2 : texto1;
    var idNegocio1 = 'idNegocio1' in opciones ? opciones.idNegocio1 : t1;
    var idNegocio2 = 'idNegocio2' in opciones ? opciones.idNegocio2 : t2;

    // --- Log Mensajes: una fila PROCESADO/FINALIZADO ---
    var log = estado.sheets['Log Mensajes'];
    var encLog = log._datos()[0];
    var filaLog = encLog.map(function () { return ''; });
    function setLog(nombre, val) { var idx = encLog.indexOf(nombre); if (idx !== -1) filaLog[idx] = val; }
    setLog('message_id', mid);
    setLog('thread_id', 'TH-1');
    setLog('estado', opciones.estadoLog || ESTADOS.PROCESADO);
    setLog('etapa', opciones.etapaLog || ETAPAS.FINALIZADO);
    setLog('cantidad_observaciones', 'cantidadObservaciones' in opciones ? opciones.cantidadObservaciones : 1);
    setLog('cantidad_tareas', 'cantidadTareas' in opciones ? opciones.cantidadTareas : 2);
    setLog('resultado_gmail', opciones.resultadoGmail || 'SOLO_ETIQUETADO');
    setLog('error', '');
    log._datos().push(filaLog);

    // --- Registro Tareas: hasta 2 filas (+ 1 extra opcional) ---
    var registro = estado.sheets['Registro Tareas'];
    var encRegistro = registro._datos()[0];
    function filaRegistro(taskId, tablero, estadoEscritura, textoOriginal) {
      var f = encRegistro.map(function () { return ''; });
      function setR(nombre, val) { var idx = encRegistro.indexOf(nombre); if (idx !== -1) f[idx] = val; }
      setR('task_id', taskId);
      setR('message_id', mid);
      setR('thread_id', 'TH-1');
      setR('tablero', tablero);
      setR('estado_escritura', estadoEscritura);
      setR('observacion_numero', 1);
      setR('observacion_texto_original', textoOriginal);
      return f;
    }
    if (!opciones.omitirFilaRegistro1) registro._datos().push(filaRegistro(t1, tablero1, estadoEscritura1, texto1));
    if (!opciones.omitirFilaRegistro2) registro._datos().push(filaRegistro(t2, tablero2, estadoEscritura2, texto2));
    if (opciones.filaRegistroExtra) {
      registro._datos().push(filaRegistro(
        opciones.filaRegistroExtra.taskId, opciones.filaRegistroExtra.tablero,
        opciones.filaRegistroExtra.estadoEscritura || ESTADOS_ESCRITURA_TAREA.ESCRITA, texto1
      ));
    }

    // --- Indice Idempotencia: por defecto, una entrada por task_id ---
    var indice = estado.sheets['Indice Idempotencia'];
    var idsIndice = opciones.idsIndice || [t1, t2];
    var estadosIndice = opciones.estadosIndice || [ESTADOS.PROCESADO, ESTADOS.PROCESADO];
    idsIndice.forEach(function (taskId, i) {
      indice._datos().push([mid, taskId, estadosIndice[i] || ESTADOS.PROCESADO, 'FECHA']);
    });

    // --- Hojas de negocio: una fila nueva por tarea, vinculada por "ID" ---
    // Usa los encabezados REALES conocidos por el propio doble de prueba
    // (encabezadosHojaNegocio_()), no la fila 0 de la hoja: la fila de
    // encabezados real puede estar en cualquier posición (preámbulo).
    var encabezadosNegocioConocidos = encabezadosHojaNegocio_();
    var idxIdConocido = encabezadosNegocioConocidos.indexOf('ID');
    function agregarFilaNegocio(tablero, taskId) {
      var hoja = estado.sheets[tablero];
      var f = encabezadosNegocioConocidos.map(function () { return ''; });
      if (idxIdConocido !== -1) f[idxIdConocido] = taskId;
      hoja._datos().push(f);
    }
    if (!opciones.omitirFilaNegocio1) agregarFilaNegocio(opciones.tableroFilaNegocio1 || tablero1, idNegocio1);
    if (!opciones.omitirFilaNegocio2) agregarFilaNegocio(opciones.tableroFilaNegocio2 || tablero2, idNegocio2);
    if (opciones.filaNegocioExtra) agregarFilaNegocio(opciones.filaNegocioExtra.tablero, opciones.filaNegocioExtra.taskId);

    // --- Corrupción deliberada de una fila del preámbulo (para probar que el
    //     prefijo del baseline cubre título/fila auxiliar, no solo datos) ---
    if (opciones.corromperFilaBase) {
      var hojaCorromper = estado.sheets[opciones.corromperFilaBase.tablero];
      hojaCorromper._datos()[opciones.corromperFilaBase.fila][0] = opciones.corromperFilaBase.valor;
    }

    // --- Gmail: etiqueta Procesado (salvo que se pida omitirla) ---
    if (!opciones.omitirEtiquetaProcesado && estado.mensaje.labelIds.indexOf('L_PROC') === -1) {
      estado.mensaje.labelIds.push('L_PROC');
    }
    (opciones.etiquetasExtra || []).forEach(function (labelId) {
      if (estado.mensaje.labelIds.indexOf(labelId) === -1) estado.mensaje.labelIds.push(labelId);
    });
  };
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-04-TRES-TAREAS (CP-04)
// ============================================================================
//
// Deliberadamente SEPARADOS de los dobles de INT-FASE8-02-DOS-TAREAS (arriba)
// en vez de generalizarlos a N tareas: evita cualquier riesgo de regresión
// sobre la cobertura ya aprobada de CP-03 (efectoFormalDosTareasFabrica_ y las
// pruebas M2-M18 quedan completamente intactos). La lógica que este fixture
// ejercita (multiset de tableros, mismo texto_original, vínculo por "ID") ya
// está probada de forma genérica a N=2; aquí solo hace falta confirmar que
// también funciona a N=3, no repetir cada escenario ya cubierto.

/** Crea el estado base seleccionando el fixture de tres tareas vía AUTO_FASE8_CASO. */
function crearEstadoTresTareas_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-04-TRES-TAREAS';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de tres tareas. */
function prepararSimuladoTresTareas_(overridesEstado) {
  var estado = crearEstadoTresTareas_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

/**
 * Fábrica del efecto formal para INT-FASE8-04-TRES-TAREAS: aplica, sobre las
 * hojas falsas, el resultado que el pipeline real escribiría para un mensaje
 * con 1 observación y 3 tareas (Desarrollo IT + Finanzas + Comercial), y
 * permite inyectar desviaciones puntuales mediante `opciones`. Por defecto
 * reproduce el camino correcto.
 */
function efectoFormalTresTareasFabrica_(opciones) {
  opciones = opciones || {};
  return function (estado) {
    var mid = estado.mensaje.id;
    var t1 = 'taskId1' in opciones ? opciones.taskId1 : mid + '-T1';
    var t2 = 'taskId2' in opciones ? opciones.taskId2 : mid + '-T2';
    var t3 = 'taskId3' in opciones ? opciones.taskId3 : mid + '-T3';
    var tablero1 = opciones.tablero1 || 'Desarrollo IT';
    var tablero2 = opciones.tablero2 || 'Finanzas';
    var tablero3 = opciones.tablero3 || 'Comercial';
    var estadoEscritura1 = opciones.estadoEscritura1 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var estadoEscritura2 = opciones.estadoEscritura2 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var estadoEscritura3 = opciones.estadoEscritura3 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var texto1 = 'texto1' in opciones ? opciones.texto1 : 'CANARIO_OBS_TEXTO_ORIGINAL_no_debe_registrarse_en_logs';
    var texto2 = 'texto2' in opciones ? opciones.texto2 : texto1;
    var texto3 = 'texto3' in opciones ? opciones.texto3 : texto1;
    var idNegocio1 = 'idNegocio1' in opciones ? opciones.idNegocio1 : t1;
    var idNegocio2 = 'idNegocio2' in opciones ? opciones.idNegocio2 : t2;
    var idNegocio3 = 'idNegocio3' in opciones ? opciones.idNegocio3 : t3;

    // --- Log Mensajes: una fila PROCESADO/FINALIZADO ---
    var log = estado.sheets['Log Mensajes'];
    var encLog = log._datos()[0];
    var filaLog = encLog.map(function () { return ''; });
    function setLog(nombre, val) { var idx = encLog.indexOf(nombre); if (idx !== -1) filaLog[idx] = val; }
    setLog('message_id', mid);
    setLog('thread_id', 'TH-1');
    setLog('estado', opciones.estadoLog || ESTADOS.PROCESADO);
    setLog('etapa', opciones.etapaLog || ETAPAS.FINALIZADO);
    setLog('cantidad_observaciones', 'cantidadObservaciones' in opciones ? opciones.cantidadObservaciones : 1);
    setLog('cantidad_tareas', 'cantidadTareas' in opciones ? opciones.cantidadTareas : 3);
    setLog('resultado_gmail', opciones.resultadoGmail || 'SOLO_ETIQUETADO');
    setLog('error', '');
    log._datos().push(filaLog);

    // --- Registro Tareas: hasta 3 filas ---
    var registro = estado.sheets['Registro Tareas'];
    var encRegistro = registro._datos()[0];
    function filaRegistro(taskId, tablero, estadoEscritura, textoOriginal) {
      var f = encRegistro.map(function () { return ''; });
      function setR(nombre, val) { var idx = encRegistro.indexOf(nombre); if (idx !== -1) f[idx] = val; }
      setR('task_id', taskId);
      setR('message_id', mid);
      setR('thread_id', 'TH-1');
      setR('tablero', tablero);
      setR('estado_escritura', estadoEscritura);
      setR('observacion_numero', 1);
      setR('observacion_texto_original', textoOriginal);
      return f;
    }
    if (!opciones.omitirFilaRegistro1) registro._datos().push(filaRegistro(t1, tablero1, estadoEscritura1, texto1));
    if (!opciones.omitirFilaRegistro2) registro._datos().push(filaRegistro(t2, tablero2, estadoEscritura2, texto2));
    if (!opciones.omitirFilaRegistro3) registro._datos().push(filaRegistro(t3, tablero3, estadoEscritura3, texto3));

    // --- Indice Idempotencia: por defecto, una entrada por task_id ---
    var indice = estado.sheets['Indice Idempotencia'];
    var idsIndice = opciones.idsIndice || [t1, t2, t3];
    var estadosIndice = opciones.estadosIndice || [ESTADOS.PROCESADO, ESTADOS.PROCESADO, ESTADOS.PROCESADO];
    idsIndice.forEach(function (taskId, i) {
      indice._datos().push([mid, taskId, estadosIndice[i] || ESTADOS.PROCESADO, 'FECHA']);
    });

    // --- Hojas de negocio: una fila nueva por tarea, vinculada por "ID" ---
    var encabezadosNegocioConocidos = encabezadosHojaNegocio_();
    var idxIdConocido = encabezadosNegocioConocidos.indexOf('ID');
    function agregarFilaNegocio(tablero, taskId) {
      var hoja = estado.sheets[tablero];
      var f = encabezadosNegocioConocidos.map(function () { return ''; });
      if (idxIdConocido !== -1) f[idxIdConocido] = taskId;
      hoja._datos().push(f);
    }
    if (!opciones.omitirFilaNegocio1) agregarFilaNegocio(opciones.tableroFilaNegocio1 || tablero1, idNegocio1);
    if (!opciones.omitirFilaNegocio2) agregarFilaNegocio(opciones.tableroFilaNegocio2 || tablero2, idNegocio2);
    if (!opciones.omitirFilaNegocio3) agregarFilaNegocio(opciones.tableroFilaNegocio3 || tablero3, idNegocio3);

    // --- Gmail: etiqueta Procesado (salvo que se pida omitirla) ---
    if (!opciones.omitirEtiquetaProcesado && estado.mensaje.labelIds.indexOf('L_PROC') === -1) {
      estado.mensaje.labelIds.push('L_PROC');
    }
    (opciones.etiquetasExtra || []).forEach(function (labelId) {
      if (estado.mensaje.labelIds.indexOf(labelId) === -1) estado.mensaje.labelIds.push(labelId);
    });
  };
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-05-OBSERVACIONES-DUPLICADAS (CP-15)
// ============================================================================
//
// Deliberadamente SEPARADOS de los dobles de 2 y 3 tareas (mismo criterio que
// CP-04): evita cualquier riesgo de regresión sobre la cobertura ya aprobada
// de CP-03/CP-04. Este fixture ejercita la generalización N-tareas en N=1.

/** Crea el estado base seleccionando el fixture de una tarea vía AUTO_FASE8_CASO. */
function crearEstadoUnaTarea_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-05-OBSERVACIONES-DUPLICADAS';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de una tarea. */
function prepararSimuladoUnaTarea_(overridesEstado) {
  var estado = crearEstadoUnaTarea_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

/**
 * Fábrica del efecto formal para INT-FASE8-05-OBSERVACIONES-DUPLICADAS: aplica,
 * sobre las hojas falsas, el resultado que el pipeline real escribiría para un
 * mensaje con 1 observación y 1 tarea (Finanzas), consolidada por RF-04 a
 * partir de un pedido repetido. Por defecto reproduce el camino correcto.
 */
function efectoFormalUnaTareaFabrica_(opciones) {
  opciones = opciones || {};
  return function (estado) {
    var mid = estado.mensaje.id;
    var t1 = 'taskId1' in opciones ? opciones.taskId1 : mid + '-T1';
    var tablero1 = opciones.tablero1 || 'Finanzas';
    var estadoEscritura1 = opciones.estadoEscritura1 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var texto1 = 'texto1' in opciones ? opciones.texto1 : 'CANARIO_OBS_TEXTO_ORIGINAL_no_debe_registrarse_en_logs';
    var idNegocio1 = 'idNegocio1' in opciones ? opciones.idNegocio1 : t1;

    // --- Log Mensajes: una fila PROCESADO/FINALIZADO ---
    var log = estado.sheets['Log Mensajes'];
    var encLog = log._datos()[0];
    var filaLog = encLog.map(function () { return ''; });
    function setLog(nombre, val) { var idx = encLog.indexOf(nombre); if (idx !== -1) filaLog[idx] = val; }
    setLog('message_id', mid);
    setLog('thread_id', 'TH-1');
    setLog('estado', opciones.estadoLog || ESTADOS.PROCESADO);
    setLog('etapa', opciones.etapaLog || ETAPAS.FINALIZADO);
    setLog('cantidad_observaciones', 'cantidadObservaciones' in opciones ? opciones.cantidadObservaciones : 1);
    setLog('cantidad_tareas', 'cantidadTareas' in opciones ? opciones.cantidadTareas : 1);
    setLog('resultado_gmail', opciones.resultadoGmail || 'SOLO_ETIQUETADO');
    setLog('error', '');
    log._datos().push(filaLog);

    // --- Registro Tareas: 1 fila ---
    var registro = estado.sheets['Registro Tareas'];
    var encRegistro = registro._datos()[0];
    function filaRegistro(taskId, tablero, estadoEscritura, textoOriginal) {
      var f = encRegistro.map(function () { return ''; });
      function setR(nombre, val) { var idx = encRegistro.indexOf(nombre); if (idx !== -1) f[idx] = val; }
      setR('task_id', taskId);
      setR('message_id', mid);
      setR('thread_id', 'TH-1');
      setR('tablero', tablero);
      setR('estado_escritura', estadoEscritura);
      setR('observacion_numero', 1);
      setR('observacion_texto_original', textoOriginal);
      return f;
    }
    if (!opciones.omitirFilaRegistro1) registro._datos().push(filaRegistro(t1, tablero1, estadoEscritura1, texto1));

    // --- Indice Idempotencia: por defecto, una entrada ---
    var indice = estado.sheets['Indice Idempotencia'];
    var idsIndice = opciones.idsIndice || [t1];
    var estadosIndice = opciones.estadosIndice || [ESTADOS.PROCESADO];
    idsIndice.forEach(function (taskId, i) {
      indice._datos().push([mid, taskId, estadosIndice[i] || ESTADOS.PROCESADO, 'FECHA']);
    });

    // --- Hojas de negocio: una fila nueva, vinculada por "ID" ---
    var encabezadosNegocioConocidos = encabezadosHojaNegocio_();
    var idxIdConocido = encabezadosNegocioConocidos.indexOf('ID');
    function agregarFilaNegocio(tablero, taskId) {
      var hoja = estado.sheets[tablero];
      var f = encabezadosNegocioConocidos.map(function () { return ''; });
      if (idxIdConocido !== -1) f[idxIdConocido] = taskId;
      hoja._datos().push(f);
    }
    if (!opciones.omitirFilaNegocio1) agregarFilaNegocio(opciones.tableroFilaNegocio1 || tablero1, idNegocio1);

    // --- Gmail: etiqueta Procesado (salvo que se pida omitirla) ---
    if (!opciones.omitirEtiquetaProcesado && estado.mensaje.labelIds.indexOf('L_PROC') === -1) {
      estado.mensaje.labelIds.push('L_PROC');
    }
    (opciones.etiquetasExtra || []).forEach(function (labelId) {
      if (estado.mensaje.labelIds.indexOf(labelId) === -1) estado.mensaje.labelIds.push(labelId);
    });
  };
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-06-FIRMA-EXTENSA (CP-14)
// ============================================================================
//
// Reutiliza SIN CAMBIOS efectoFormalUnaTareaFabrica_ (creada para CP-15): la
// forma del resultado (1 observación, 1 tarea) es idéntica; solo cambia el
// fixture activo y el tablero esperado (Gestión General en vez de Finanzas).

/** Crea el estado base seleccionando el fixture de firma extensa vía AUTO_FASE8_CASO. */
function crearEstadoFirmaExtensa_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-06-FIRMA-EXTENSA';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de firma extensa. */
function prepararSimuladoFirmaExtensa_(overridesEstado) {
  var estado = crearEstadoFirmaExtensa_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-07-CUERPO-VACIO (CP-16)
// ============================================================================
//
// No requiere una fábrica de efecto formal propia: reutiliza SIN CAMBIOS
// efectoFormalSinTareasCorrecto_ (ya el valor por defecto de estado.efectoFormal
// en crearEstadoIntegracion_), porque el resultado esperado es idéntico al de
// INT-FASE8-01-INFORMATIVO (0 observaciones, 0 tareas, SOLO_ETIQUETADO,
// RevisionSinTareas): lo único que cambia es CÓMO se llega a SIN_TAREAS (un
// filtro determinístico que rechaza el cuerpo vacío ANTES de invocar a la IA,
// en vez de una clasificación de la IA con observaciones=[]).

/** Crea el estado base seleccionando el fixture de cuerpo vacío vía AUTO_FASE8_CASO. */
function crearEstadoCuerpoVacio_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-07-CUERPO-VACIO';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de cuerpo vacío. */
function prepararSimuladoCuerpoVacio_(overridesEstado) {
  var estado = crearEstadoCuerpoVacio_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-08-FECHA-LIMITE-EXPLICITA (CP-17)
// ============================================================================
//
// Fábrica dedicada, NO reutiliza efectoFormalUnaTareaFabrica_ (creada para
// CP-15/CP-14): aunque la forma general (1 observación, 1 tarea) es igual,
// esta fábrica ejercita una capacidad NUEVA (escribir la columna "Fecha
// límite") que CP-14/CP-15 nunca necesitaron — se mantiene separada para no
// arriesgar esa cobertura ya aprobada.

/** Crea el estado base seleccionando el fixture de fecha límite explícita vía AUTO_FASE8_CASO. */
function crearEstadoFechaLimiteExplicita_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-08-FECHA-LIMITE-EXPLICITA';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de fecha límite explícita. */
function prepararSimuladoFechaLimiteExplicita_(overridesEstado) {
  var estado = crearEstadoFechaLimiteExplicita_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

/**
 * Fábrica del efecto formal para INT-FASE8-08-FECHA-LIMITE-EXPLICITA: aplica,
 * sobre las hojas falsas, el resultado que el pipeline real escribiría para un
 * mensaje con 1 observación y 1 tarea (Comercial), incluida la columna "Fecha
 * límite" de la hoja de negocio. `opciones.fechaLimite` es un objeto Date (o
 * `undefined` para dejar la celda vacía, camino por defecto); por defecto
 * reproduce el camino correcto (31/07/2026).
 */
function efectoFormalUnaTareaConFechaFabrica_(opciones) {
  opciones = opciones || {};
  return function (estado) {
    var mid = estado.mensaje.id;
    var t1 = 'taskId1' in opciones ? opciones.taskId1 : mid + '-T1';
    var tablero1 = opciones.tablero1 || 'Comercial';
    var estadoEscritura1 = opciones.estadoEscritura1 || ESTADOS_ESCRITURA_TAREA.ESCRITA;
    var texto1 = 'texto1' in opciones ? opciones.texto1 : 'CANARIO_OBS_TEXTO_ORIGINAL_no_debe_registrarse_en_logs';
    var idNegocio1 = 'idNegocio1' in opciones ? opciones.idNegocio1 : t1;
    var fechaLimite1 = 'fechaLimite' in opciones ? opciones.fechaLimite : new Date(2026, 6, 31);

    // --- Log Mensajes: una fila PROCESADO/FINALIZADO ---
    var log = estado.sheets['Log Mensajes'];
    var encLog = log._datos()[0];
    var filaLog = encLog.map(function () { return ''; });
    function setLog(nombre, val) { var idx = encLog.indexOf(nombre); if (idx !== -1) filaLog[idx] = val; }
    setLog('message_id', mid);
    setLog('thread_id', 'TH-1');
    setLog('estado', opciones.estadoLog || ESTADOS.PROCESADO);
    setLog('etapa', opciones.etapaLog || ETAPAS.FINALIZADO);
    setLog('cantidad_observaciones', 'cantidadObservaciones' in opciones ? opciones.cantidadObservaciones : 1);
    setLog('cantidad_tareas', 'cantidadTareas' in opciones ? opciones.cantidadTareas : 1);
    setLog('resultado_gmail', opciones.resultadoGmail || 'SOLO_ETIQUETADO');
    setLog('error', '');
    log._datos().push(filaLog);

    // --- Registro Tareas: 1 fila ---
    var registro = estado.sheets['Registro Tareas'];
    var encRegistro = registro._datos()[0];
    function filaRegistro(taskId, tablero, estadoEscritura, textoOriginal) {
      var f = encRegistro.map(function () { return ''; });
      function setR(nombre, val) { var idx = encRegistro.indexOf(nombre); if (idx !== -1) f[idx] = val; }
      setR('task_id', taskId);
      setR('message_id', mid);
      setR('thread_id', 'TH-1');
      setR('tablero', tablero);
      setR('estado_escritura', estadoEscritura);
      setR('observacion_numero', 1);
      setR('observacion_texto_original', textoOriginal);
      return f;
    }
    if (!opciones.omitirFilaRegistro1) registro._datos().push(filaRegistro(t1, tablero1, estadoEscritura1, texto1));

    // --- Indice Idempotencia: por defecto, una entrada ---
    var indice = estado.sheets['Indice Idempotencia'];
    var idsIndice = opciones.idsIndice || [t1];
    var estadosIndice = opciones.estadosIndice || [ESTADOS.PROCESADO];
    idsIndice.forEach(function (taskId, i) {
      indice._datos().push([mid, taskId, estadosIndice[i] || ESTADOS.PROCESADO, 'FECHA']);
    });

    // --- Hojas de negocio: una fila nueva, vinculada por "ID", con "Fecha límite" ---
    var encabezadosNegocioConocidos = encabezadosHojaNegocio_();
    var idxIdConocido = encabezadosNegocioConocidos.indexOf('ID');
    var idxFechaLimiteConocido = encabezadosNegocioConocidos.indexOf('Fecha límite');
    function agregarFilaNegocio(tablero, taskId) {
      var hoja = estado.sheets[tablero];
      var f = encabezadosNegocioConocidos.map(function () { return ''; });
      if (idxIdConocido !== -1) f[idxIdConocido] = taskId;
      if (idxFechaLimiteConocido !== -1 && fechaLimite1 !== undefined) f[idxFechaLimiteConocido] = fechaLimite1;
      hoja._datos().push(f);
    }
    if (!opciones.omitirFilaNegocio1) agregarFilaNegocio(opciones.tableroFilaNegocio1 || tablero1, idNegocio1);

    // --- Gmail: etiqueta Procesado (salvo que se pida omitirla) ---
    if (!opciones.omitirEtiquetaProcesado && estado.mensaje.labelIds.indexOf('L_PROC') === -1) {
      estado.mensaje.labelIds.push('L_PROC');
    }
    (opciones.etiquetasExtra || []).forEach(function (labelId) {
      if (estado.mensaje.labelIds.indexOf(labelId) === -1) estado.mensaje.labelIds.push(labelId);
    });
  };
}

// ============================================================================
// DOBLES ESPECÍFICOS DE INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA (CP-18)
// ============================================================================
//
// Reutiliza SIN CAMBIOS efectoFormalUnaTareaConFechaFabrica_ (creada para
// CP-17): la forma del resultado (1 observación, 1 tarea) es idéntica; solo
// cambia el fixture activo, el tablero esperado (Desarrollo IT en vez de
// Comercial) y la fecha límite (vacía en vez de una fecha) — ya soportado por
// esa fábrica vía opciones.fechaLimite. Mismo criterio que CP-14 reutilizando
// la fábrica de CP-15.

/** Crea el estado base seleccionando el fixture de fecha límite no explícita vía AUTO_FASE8_CASO. */
function crearEstadoFechaLimiteNoExplicita_(overrides) {
  var estado = crearEstadoIntegracion_(overrides || {});
  estado.props.AUTO_FASE8_CASO = 'INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA';
  return estado;
}

/** prepararCaso_() + simularEnvioMensaje_() + simularYVerificar_() para el fixture de fecha límite no explícita. */
function prepararSimuladoFechaLimiteNoExplicita_(overridesEstado) {
  var estado = crearEstadoFechaLimiteNoExplicita_(overridesEstado);
  var amb = crearAmbFalsoIntegracion_(estado);
  prepararCaso_(amb);
  simularEnvioMensaje_(estado);
  simularYVerificar_(amb);
  return { estado: estado, amb: amb };
}

// ============================================================================
// SUITE
// ============================================================================

function ejecutarPruebasAutomatizadorIntegracionFase8() {
  var fallos = 0;
  var casos = [];

  function assert(nombre, condicion, detalle) {
    casos.push(nombre);
    if (condicion) { Logger.log('[PASA] ' + nombre); }
    else { fallos++; Logger.log('[FALLA] ' + nombre + (detalle ? ' — ' + detalle : '')); }
  }

  function tieneError(res, categoria) {
    return !res.ok && res.errores.some(function (e) { return e === categoria || e.indexOf(categoria) === 0; });
  }

  function prepararSimulado_(overrides) {
    var estado = crearEstadoIntegracion_(overrides || {});
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    simularYVerificar_(amb);
    return { estado: estado, amb: amb };
  }

  function cuerpoRechazado_(cuerpo) {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado, { cuerpo: cuerpo });
    return tieneError(simularYVerificar_(amb), 'CUERPO_NO_COINCIDE');
  }

  // ==========================================================================
  // A: barreras base fail-closed
  // ==========================================================================

  (function () {
    var r = verificarBarrerasBase_(crearAmbFalsoIntegracion_(crearEstadoIntegracion_()));
    assert('A0 — configuración autorizada completa pasa las barreras base', r.ok === true, JSON.stringify(r.errores));
  })();

  function barreraBaseCon(overridesProps, overridesEstado, categoria, nombre) {
    var estado = crearEstadoIntegracion_(overridesEstado || {});
    if (overridesProps) Object.keys(overridesProps).forEach(function (k) { if (overridesProps[k] === null) delete estado.props[k]; else estado.props[k] = overridesProps[k]; });
    var r = verificarBarrerasBase_(crearAmbFalsoIntegracion_(estado));
    assert(nombre, !r.ok && r.errores.indexOf(categoria) !== -1, JSON.stringify(r.errores));
  }

  barreraBaseCon({ MODO_PRUEBA: 'false' }, null, 'MODO_PRUEBA_NO_TRUE', 'A1 — MODO_PRUEBA!="true" aborta');
  barreraBaseCon({ DRY_RUN: 'false' }, null, 'DRY_RUN_BASE_NO_TRUE', 'A2 — DRY_RUN base!="true" aborta');
  barreraBaseCon(null, { scriptId: 'OTRO_PROYECTO' }, 'SCRIPT_ID_NO_AUTORIZADO', 'A3 — scriptId distinto del autorizado aborta');
  barreraBaseCon(null, { cuenta: 'otro@dominio.com' }, 'CUENTA_NO_AUTORIZADA', 'A4 — cuenta efectiva distinta de la autorizada aborta');
  barreraBaseCon({ SPREADSHEET_ID_PRUEBA: null }, null, 'SPREADSHEET_ID_PRUEBA_AUSENTE', 'A5 — SPREADSHEET_ID_PRUEBA ausente aborta');
  barreraBaseCon({ SPREADSHEET_ID_PRUEBA: 'PRODUCTIVO', SPREADSHEET_ID: 'PRODUCTIVO' }, null, 'SPREADSHEET_ID_PRUEBA_IGUAL_A_PRODUCTIVO', 'A6 — SPREADSHEET_ID_PRUEBA igual al productivo aborta');
  barreraBaseCon({ SPREADSHEET_ID_PRUEBA: '1Rl_OTRA_PLANILLA' }, null, 'SPREADSHEET_ID_PRUEBA_NO_AUTORIZADO', 'A7 — SPREADSHEET_ID_PRUEBA distinto del autorizado aborta');
  barreraBaseCon({ ETIQUETA_PRUEBA: 'Otra' }, null, 'ETIQUETA_PRUEBA_NO_AUTORIZADA', 'A8 — ETIQUETA_PRUEBA distinta de la autorizada aborta');

  (function () {
    var estado = crearEstadoIntegracion_({ proyectoAutorizado: 'COMPLETAR_CON_EL_SCRIPT_ID_DEL_PROYECTO_DE_PRUEBA', scriptId: 'COMPLETAR_CON_EL_SCRIPT_ID_DEL_PROYECTO_DE_PRUEBA' });
    var r = verificarBarrerasBase_(crearAmbFalsoIntegracion_(estado));
    assert('A9 — script id autorizado sin completar (centinela) aborta aunque coincida con getScriptId()', !r.ok && r.errores.indexOf('SCRIPT_ID_AUTORIZADO_SIN_COMPLETAR') !== -1, JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // B: barrera de etiquetas
  // ==========================================================================

  (function () {
    var r = verificarEtiquetas_(crearAmbFalsoIntegracion_(crearEstadoIntegracion_()));
    assert('B1 — etiquetas correctas: IDs coinciden con nombres y se resuelve la etiqueta de prueba', r.ok === true && r.idEtiquetaPrueba === 'L_PRUEBA' && r.idsPorClave.RevisionSinTareas === 'L_SINTAREAS', JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_();
    estado.props.ID_ETIQUETA_PROCESADO = 'L_SINTAREAS';
    var r = verificarEtiquetas_(crearAmbFalsoIntegracion_(estado));
    assert('B2 — un ID de etiqueta que no coincide con su nombre (por list) aborta', !r.ok && r.errores.indexOf('ID_ETIQUETA_NO_COINCIDE_LISTA:Procesado') !== -1, JSON.stringify(r.errores));
    assert('B3 — el mismo ID discrepante también se detecta por get', r.errores.indexOf('ID_ETIQUETA_NO_COINCIDE_GET:Procesado') !== -1, JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_();
    delete estado.props.ID_ETIQUETA_REVISION_SIN_TAREAS;
    var r = verificarEtiquetas_(crearAmbFalsoIntegracion_(estado));
    assert('B4 — un ID de etiqueta ausente aborta', !r.ok && r.errores.indexOf('ID_ETIQUETA_AUSENTE:RevisionSinTareas') !== -1, JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // C: localización del mensaje
  // ==========================================================================

  (function () {
    var amb = crearAmbFalsoIntegracion_(crearEstadoIntegracion_());
    var q = construirQueryInterna_(amb, 'E2E-abc');
    assert('C0 — la query se construye internamente con in:inbox + etiqueta de prueba + marcador', q.indexOf('in:inbox') !== -1 && q.indexOf('label:"Pruebas-Automatizacion"') !== -1 && q.indexOf('E2E-abc') !== -1, q);
  })();

  function localizarCon(configMensaje, opcionesEnvio, nombre, categoria) {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    var sesion = simularEnvioMensaje_(estado, opcionesEnvio || {});
    Object.keys(configMensaje).forEach(function (k) { estado.mensaje[k] = configMensaje[k]; });
    var fixture = obtenerFixtureIntegracion_(sesion.fixtureId);
    var r = localizarYVerificarMensaje_(amb, sesion, fixture, 'L_PRUEBA');
    assert(nombre, !r.ok && r.errores.indexOf(categoria) !== -1, JSON.stringify(r.errores));
  }

  localizarCon({ count: 0, presente: false }, {}, 'C1 — cero mensajes que coinciden con el marcador aborta', 'CERO_MENSAJES');
  localizarCon({ count: 2 }, {}, 'C2 — dos mensajes que coinciden con el marcador aborta', 'MAS_DE_UN_MENSAJE');
  localizarCon({ from: 'Otro <intruso@ejemplo.com>' }, {}, 'C3 — remitente distinto del permitido aborta', 'REMITENTE_NO_COINCIDE');
  localizarCon({ labelIds: ['L_PRUEBA'] }, {}, 'C4 — mensaje sin INBOX aborta', 'SIN_INBOX');
  localizarCon({ labelIds: ['INBOX'] }, {}, 'C5 — mensaje sin la etiqueta de prueba aborta', 'SIN_ETIQUETA_PRUEBA');
  localizarCon({}, { asuntoIncorrecto: 'Asunto que no coincide' }, 'C6 — asunto distinto del esperado aborta', 'ASUNTO_NO_COINCIDE');

  // ==========================================================================
  // D: message_id ya registrado / sesión / lock / activador
  // ==========================================================================

  (function () {
    var estado = crearEstadoIntegracion_();
    estado.sheets['Indice Idempotencia']._datos().push(['MSG-NUEVO-1', '', 'SIN_TAREAS', 'FECHA']);
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('D1 — message_id ya registrado en Indice Idempotencia aborta la simulación', tieneError(r, 'MESSAGE_ID_YA_REGISTRADO'), JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    var r = prepararCaso_(amb);
    assert('D2 — preparar con una sesión pendiente aborta', tieneError(r, 'SESION_PENDIENTE'), JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_({ lockDisponible: false });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('D3 — sin ScriptLock la simulación aborta', tieneError(r, 'SIN_LOCK'), JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_({ triggers: [{ getHandlerFunction: function () { return 'procesarCorreosDeTareas'; } }] });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('D4 — un activador de procesarCorreosDeTareas en conflicto aborta', tieneError(r, 'ACTIVADOR_PRODUCTIVO_EN_CONFLICTO'), JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // E: flujo simular -> formal correcto
  // ==========================================================================

  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    var prep = prepararCaso_(amb);
    assert('E1 — preparar devuelve asunto+cuerpo sintéticos y guarda sesión PREPARADO', prep.ok && prep.asunto && prep.cuerpo && JSON.parse(estado.userProps[INTEGRACION_CLAVE_SESION]).estado === 'PREPARADO');

    simularEnvioMensaje_(estado);
    var sim = simularYVerificar_(amb);
    var sesionSim = JSON.parse(estado.userProps[INTEGRACION_CLAVE_SESION]);
    assert('E2 — la simulación DRY_RUN pasa y no altera baseline ni persiste el message_id', sim.ok === true, JSON.stringify(sim.errores));
    assert('E3 — la simulación correcta genera un nonce y estado SIMULACION_OK', sesionSim.estado === 'SIMULACION_OK' && !!sesionSim.nonce && sesionSim.messageId === 'MSG-NUEVO-1');
    assert('E4 — la simulación llamó al núcleo en DRY_RUN, un único mensaje y omitiendo recuperación', estado.llamadasNucleo.length === 1 && estado.llamadasNucleo[0].dryRun === true && estado.llamadasNucleo[0].opciones.omitirRecuperacion === true && estado.llamadasNucleo[0].maxEj === 1);
    assert('E5 — tras la simulación, Log/Registro/Indice siguen vacíos (cero cambios)', estado.sheets['Log Mensajes']._datos().length === 1 && estado.sheets['Registro Tareas']._datos().length === 1 && estado.sheets['Indice Idempotencia']._datos().length === 1);

    var formal = ejecutarFormalYVerificar_(amb);
    var sesionFormal = JSON.parse(estado.userProps[INTEGRACION_CLAVE_SESION]);
    assert('E6 — la ejecución formal verifica correctamente el resultado SIN_TAREAS', formal.ok === true, JSON.stringify(formal.errores));
    assert('E7 — tras la formal, estado FORMAL_OK y una fila en Log e Indice', sesionFormal.estado === 'FORMAL_OK' && estado.sheets['Log Mensajes']._datos().length === 2 && estado.sheets['Indice Idempotencia']._datos().length === 2);
    assert('E8 — la ejecución formal usó dryRun=false, un único mensaje y omitió recuperación', estado.llamadasNucleo[1].dryRun === false && estado.llamadasNucleo[1].opciones.omitirRecuperacion === true && estado.llamadasNucleo[1].maxEj === 1);
    assert('E9 — el mensaje recibió la etiqueta de resultado y conserva prueba + INBOX, sin archivar', estado.mensaje.labelIds.indexOf('L_SINTAREAS') !== -1 && estado.mensaje.labelIds.indexOf('L_PRUEBA') !== -1 && estado.mensaje.labelIds.indexOf('INBOX') !== -1 && estado.mensaje.labelIds.indexOf('L_PROC') === -1);
    assert('E10 — el ScriptLock se liberó en cada invocación (sim + formal)', estado.lockReleases === 2);
  })();

  // ==========================================================================
  // F: deltas entre simulación y formal
  // ==========================================================================

  (function () {
    var ctx = prepararSimulado_();
    ctx.estado.sheets['Log Mensajes']._datos().push(['OTRO-MSG', 'TH', 'PROCESADO', 'FINALIZADO', 1, 1, 'SOLO_ETIQUETADO', '']);
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('F1 — un baseline cambiado entre simulación y formal aborta la ejecución formal', tieneError(r, 'BASELINE_CAMBIO'), JSON.stringify(r.errores));
  })();

  (function () {
    var ctx = prepararSimulado_();
    var s = JSON.parse(ctx.estado.userProps[INTEGRACION_CLAVE_SESION]); delete s.nonce; ctx.estado.userProps[INTEGRACION_CLAVE_SESION] = JSON.stringify(s);
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('F2 — la ejecución formal sin nonce aborta', tieneError(r, 'SIN_NONCE'), JSON.stringify(r.errores));
  })();

  (function () {
    var ctx = prepararSimulado_();
    var s = JSON.parse(ctx.estado.userProps[INTEGRACION_CLAVE_SESION]); s.fingerprintFixtureCfg = 'distinto'; ctx.estado.userProps[INTEGRACION_CLAVE_SESION] = JSON.stringify(s);
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('F3 — un fingerprint de fixture/cfg cambiado aborta la ejecución formal', tieneError(r, 'FINGERPRINT_CAMBIO'), JSON.stringify(r.errores));
  })();

  (function () {
    var ctx = prepararSimulado_();
    ctx.estado.mensaje.id = 'MSG-DISTINTO';
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('F4 — un message_id distinto entre simulación y formal aborta', tieneError(r, 'MESSAGE_ID_CAMBIO'), JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var r = ejecutarFormalYVerificar_(amb);
    assert('F5 — la ejecución formal sin una simulación previa (SIMULACION_OK) aborta', tieneError(r, 'SIN_SIMULACION_OK'), JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // G: error formal sin eliminar evidencia
  // ==========================================================================

  (function () {
    var ctx = prepararSimulado_({ efectoFormal: efectoFormalIncorrecto_ });
    var r = ejecutarFormalYVerificar_(ctx.amb);
    var sesion = JSON.parse(ctx.estado.userProps[INTEGRACION_CLAVE_SESION]);
    assert('G1 — un resultado formal incorrecto se reporta como fallo', !r.ok && r.errores.indexOf('LOG_RESULTADO_GMAIL') !== -1, JSON.stringify(r.errores));
    assert('G2 — el fallo formal NO elimina la evidencia (la fila persistida sigue en Log Mensajes)', ctx.estado.sheets['Log Mensajes']._datos().length === 2);
    assert('G3 — el fallo formal deja la sesión en FORMAL_FALLIDO', sesion.estado === 'FORMAL_FALLIDO');
  })();

  // ==========================================================================
  // H: comparación de Sheets por encabezados (columnas reordenadas)
  // ==========================================================================

  (function () {
    var estado = crearEstadoIntegracion_();
    estado.sheets['Log Mensajes'] = crearHojaFalsaIntegracion_([['etapa', 'error', 'estado', 'resultado_gmail', 'cantidad_tareas', 'thread_id', 'cantidad_observaciones', 'message_id']]);
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    simularYVerificar_(amb);
    var r = ejecutarFormalYVerificar_(amb);
    assert('H1 — la verificación resuelve las columnas por nombre de encabezado, no por posición', r.ok === true, JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // I: sanitización
  // ==========================================================================

  (function () {
    var ctx = prepararSimulado_();
    ejecutarFormalYVerificar_(ctx.amb);
    var logs = ctx.estado.logs.join('\n');
    assert('I1 — ningún log contiene la API key (sk-…)', logs.indexOf('sk-canario') === -1, logs);
    assert('I2 — ningún log contiene el cuerpo sintético del fixture', logs.indexOf('horario de atencion') === -1);
    assert('I3 — ningún log contiene el texto libre de la columna error (canario)', logs.indexOf('CANARIO_MOTIVO_SIN_TAREAS') === -1);
    var sesionCruda = ctx.estado.userProps[INTEGRACION_CLAVE_SESION];
    assert('I4 — el estado de sesión guardado no contiene la API key ni el cuerpo', sesionCruda.indexOf('sk-canario') === -1 && sesionCruda.indexOf('horario de atencion') === -1);
    assert('I5 — el automatizador nunca escribió una propiedad de configuración', ctx.estado.configWrites.length === 0);
  })();

  // ==========================================================================
  // J: mostrar / cancelar
  // ==========================================================================

  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    assert('J1 — mostrarEstado sin sesión informa SIN_SESION', mostrarEstado_(amb).estado === 'SIN_SESION');
    prepararCaso_(amb);
    assert('J2 — mostrarEstado tras preparar informa PREPARADO', mostrarEstado_(amb).estado === 'PREPARADO');
    var c = cancelarSesion_(amb);
    assert('J3 — cancelar sesión (autorizado) borra el estado', c.ok === true && !estado.userProps[INTEGRACION_CLAVE_SESION]);
    assert('J4 — cancelar sesión no toca Sheets ni Gmail', estado.sheets['Indice Idempotencia']._datos().length === 1 && estado.mensaje.labelIds.length === 2);
  })();

  // ==========================================================================
  // K: núcleo del pipeline (recuperación + resumen)
  // ==========================================================================

  (function () {
    var recuperarOriginal = (typeof recuperarProcesamientosAbandonados !== 'undefined') ? recuperarProcesamientosAbandonados : undefined;
    var obtenerOriginal = obtenerMensajesPendientesDesdeGmail;
    var procesarUnoOriginal = procesarUnMensaje;
    var llamadasRecuperar = 0;

    recuperarProcesamientosAbandonados = function () { llamadasRecuperar++; };
    obtenerMensajesPendientesDesdeGmail = function () { return []; };
    procesarUnMensaje = function () { throw new Error('no debería procesarse ningún mensaje'); };

    try {
      llamadasRecuperar = 0;
      var r1 = procesarCorreosDeTareasConConfiguracion_({ dryRun: false, maxMensajesPorEjecucion: 1, tiempoInternoMaxMs: 300000 }, { omitirRecuperacion: true });
      assert('K1 — el núcleo con omitirRecuperacion=true NO recupera (aunque dryRun=false)', llamadasRecuperar === 0);
      assert('K1b — el núcleo devuelve un resumen estructurado con cero elegibles', r1 && r1.mensajesElegibles === 0 && r1.cantidadIntentada === 0 && r1.detenidoPorTiempo === false && Array.isArray(r1.messageIdsIntentados));

      llamadasRecuperar = 0;
      procesarCorreosDeTareasConConfiguracion_({ dryRun: false, maxMensajesPorEjecucion: 1, tiempoInternoMaxMs: 300000 }, {});
      assert('K2 — el núcleo con opciones={} y dryRun=false SÍ recupera (producción)', llamadasRecuperar === 1);

      llamadasRecuperar = 0;
      procesarCorreosDeTareasConConfiguracion_({ dryRun: true, maxMensajesPorEjecucion: 1, tiempoInternoMaxMs: 300000 }, {});
      assert('K3 — el núcleo con dryRun=true NO recupera (INC-FASE8-002)', llamadasRecuperar === 0);

      // K3b: resumen con un mensaje intentado.
      llamadasRecuperar = 0;
      var procesados = [];
      obtenerMensajesPendientesDesdeGmail = function () { return [{ messageId: 'M-1', threadId: 'T', mensaje: {} }]; };
      procesarUnMensaje = function (md) { procesados.push(md.messageId); };
      var r2 = procesarCorreosDeTareasConConfiguracion_({ dryRun: true, maxMensajesPorEjecucion: 1, tiempoInternoMaxMs: 300000 }, { omitirRecuperacion: true });
      assert('K3b — el resumen refleja 1 elegible, 1 intentado y el id procesado', r2.mensajesElegibles === 1 && r2.cantidadIntentada === 1 && r2.messageIdsIntentados[0] === 'M-1' && procesados.length === 1);
      obtenerMensajesPendientesDesdeGmail = function () { return []; };
      procesarUnMensaje = function () { throw new Error('no debería procesarse'); };

      var validarOriginal = validarConfiguracion;
      var lockOriginal = (typeof LockService !== 'undefined') ? LockService : undefined;
      validarConfiguracion = function () { return { valido: true, cfg: { dryRun: false, maxMensajesPorEjecucion: 1, tiempoInternoMaxMs: 300000 } }; };
      LockService = { getScriptLock: function () { return { tryLock: function () { return true; }, releaseLock: function () {} }; } };
      try {
        llamadasRecuperar = 0;
        procesarCorreosDeTareas();
        assert('K4 — producción (procesarCorreosDeTareas) conserva la recuperación de abandonados', llamadasRecuperar === 1);
      } finally {
        validarConfiguracion = validarOriginal;
        if (lockOriginal !== undefined) LockService = lockOriginal;
      }
    } finally {
      obtenerMensajesPendientesDesdeGmail = obtenerOriginal;
      procesarUnMensaje = procesarUnoOriginal;
      if (recuperarOriginal !== undefined) recuperarProcesamientosAbandonados = recuperarOriginal;
    }
  })();

  // ==========================================================================
  // L: revisión correctiva
  // ==========================================================================

  // L1-L3: el resumen del núcleo gobierna SIMULACION_OK.
  (function () {
    var ctx0 = crearEstadoIntegracion_({ resumenNucleoOverride: { mensajesElegibles: 0, limiteCalculado: 0, messageIdsIntentados: [], cantidadIntentada: 0, cantidadConErrorAislado: 0, detenidoPorTiempo: false } });
    var amb = crearAmbFalsoIntegracion_(ctx0);
    prepararCaso_(amb); simularEnvioMensaje_(ctx0);
    var r = simularYVerificar_(amb);
    var s = JSON.parse(ctx0.userProps[INTEGRACION_CLAVE_SESION]);
    assert('L1 — un núcleo con cero elegibles NO produce SIMULACION_OK', !r.ok && r.errores.indexOf('NUCLEO_ELEGIBLES:0') !== -1 && s.estado !== 'SIMULACION_OK', JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_({ resumenNucleoOverride: { mensajesElegibles: 1, limiteCalculado: 1, messageIdsIntentados: ['OTRO-ID'], cantidadIntentada: 1, cantidadConErrorAislado: 0, detenidoPorTiempo: false } });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('L2 — un núcleo que intenta OTRO message_id NO produce SIMULACION_OK', !r.ok && r.errores.indexOf('NUCLEO_ID_DISTINTO') !== -1, JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_({ resumenNucleoOverride: null });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('L3 — un núcleo que devuelve undefined/null NO produce SIMULACION_OK', !r.ok && r.errores.indexOf('NUCLEO_SIN_RESUMEN') !== -1, JSON.stringify(r.errores));
  })();

  // L4-L5: cuerpo.
  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado, { cuerpo: 'Un cuerpo completamente distinto, aunque conceptualmente parecido.' });
    var r = simularYVerificar_(amb);
    assert('L4 — un cuerpo distinto del fixture aborta (CUERPO_NO_COINCIDE)', tieneError(r, 'CUERPO_NO_COINCIDE'), JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    // Mismo cuerpo pero con CRLF y espacios finales: debe normalizarse y coincidir.
    var sesion = simularEnvioMensaje_(estado);
    estado.mensaje.cuerpo = CUERPO_PILOTO_.replace(/\n/g, '\r\n') + '   \r\n\r\n';
    var r = simularYVerificar_(amb);
    assert('L5 — el mismo cuerpo con CRLF y espacios finales coincide tras normalizar', r.ok === true, JSON.stringify(r.errores));
  })();

  // L5A-L5J: envolturas de transporte reales y límites de la canonicalización.
  (function () {
    var lineas = CUERPO_PILOTO_.split('\n');
    var transportado = [
      lineas[0].slice(0, 75),
      lineas[0].slice(76),
      '',
      lineas[2].slice(0, 73),
      lineas[2].slice(74),
      lineas[3].slice(0, 73),
      lineas[3].slice(74),
      '',
      lineas[5]
    ].join('\n');
    var longitudesEsperadas = lineas.map(function (linea) { return linea.length; });
    var longitudesTransportadas = transportado.split('\n').map(function (linea) { return linea.length; });
    var evidenciaExacta =
      CUERPO_PILOTO_.length === 318 &&
      transportado.length === 318 &&
      JSON.stringify(longitudesEsperadas) === JSON.stringify([91, 0, 108, 106, 0, 8]) &&
      JSON.stringify(longitudesTransportadas) === JSON.stringify([75, 15, 0, 73, 34, 73, 32, 0, 8]);
    assert('L5A — la regresión reproduce exactamente longitudes y cortes observados en Gmail', evidenciaExacta,
      JSON.stringify({ esperado: longitudesEsperadas, transportado: longitudesTransportadas }));

    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado, { cuerpo: transportado });
    var r = simularYVerificar_(amb);
    assert('L5B — tres espacios sustituidos por LF de transporte conservan el mismo contenido', r.ok === true, JSON.stringify(r.errores));
  })();

  assert('L5C — una palabra modificada sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('publico', 'interno')));
  assert('L5D — una frase eliminada sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('No se requiere ninguna accion de nadie del equipo; es solo para que esten al tanto del cambio ya decidido.', '')));
  assert('L5E — una frase adicional sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('18 horas.', '18 horas. Este texto no pertenece al fixture.')));
  assert('L5F — una firma o pie adicional sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_ + '\n\nFirma automatica.'));
  assert('L5G — eliminar un límite de párrafo sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('\n\n', '\n')));
  assert('L5H — agregar un límite de párrafo sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('horario de atencion', 'horario\n\nde atencion')));
  assert('L5I — un cambio sustantivo de espacios internos sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('aviso exclusivamente', 'aviso  exclusivamente')));
  assert('L5J — espacios iniciales de contenido siguen produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(' ' + CUERPO_PILOTO_));
  assert('L5K — agregar una línea vacía a un límite de párrafo sigue produciendo CUERPO_NO_COINCIDE',
    cuerpoRechazado_(CUERPO_PILOTO_.replace('\n\n', '\n\n\n')));

  // L6-L7: remitente exacto (subcadena / solo en el nombre visible).
  localizarCon({ from: 'Tester <sichar@gmail.com.evil.com>' }, {}, 'L6 — la dirección permitida como subcadena de otro dominio aborta', 'REMITENTE_NO_COINCIDE');
  localizarCon({ from: 'sichar@gmail.com <intruso@evil.com>' }, {}, 'L7 — la dirección permitida solo en el nombre visible aborta', 'REMITENTE_NO_COINCIDE');

  // L8-L9: versión del prompt, sin llamar al núcleo.
  (function () {
    var estado = crearEstadoIntegracion_({ versionPromptActual: 'v3-INC-FASE8-010-ejemplo-cobertura' });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('L8 — una versión de prompt INFERIOR a la mínima aborta sin llamar al núcleo', tieneError(r, 'VERSION_PROMPT_INFERIOR') && estado.llamadasNucleo.length === 0, JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_({ versionPromptActual: 'vX-desconocida' });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('L9 — una versión de prompt DESCONOCIDA aborta sin llamar al núcleo', tieneError(r, 'VERSION_PROMPT_ACTUAL_DESCONOCIDA') && estado.llamadasNucleo.length === 0, JSON.stringify(r.errores));
  })();

  // L10: mutación de celda existente sin agregar filas.
  (function () {
    var estado = crearEstadoIntegracion_();
    estado.sheets['Log Mensajes'] = crearHojaFalsaIntegracion_([encabezadosLogMensajes_(), ['OTRO-MSG', 'TH', 'PROCESADO', 'FINALIZADO', 1, 1, 'SOLO_ETIQUETADO', 'valor original']]);
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado); simularYVerificar_(amb);
    var filasAntes = estado.sheets['Log Mensajes']._datos().length;
    estado.sheets['Log Mensajes']._datos()[1][7] = 'valor MUTADO';
    var filasDespues = estado.sheets['Log Mensajes']._datos().length;
    var r = ejecutarFormalYVerificar_(amb);
    assert('L10 — mutar una celda existente sin agregar filas se detecta (BASELINE_CAMBIO)', filasAntes === filasDespues && tieneError(r, 'BASELINE_CAMBIO'), JSON.stringify(r.errores));
  })();

  // L11: mutación de fórmula.
  (function () {
    var ctx = prepararSimulado_();
    ctx.estado.sheets['Finanzas']._formulas()[1][0] = '=SUM(A1:A2)';
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('L11 — mutar una fórmula (sin cambiar valores) se detecta (BASELINE_CAMBIO)', tieneError(r, 'BASELINE_CAMBIO'), JSON.stringify(r.errores));
  })();

  // L12-L16: mutación en cada hoja de negocio.
  ['Finanzas', 'Comercial', 'Soporte', 'Desarrollo IT', 'Gestión General'].forEach(function (tablero, i) {
    var ctx = prepararSimulado_();
    ctx.estado.sheets[tablero]._datos()[1][0] = 'tarea inyectada en ' + tablero;
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('L1' + (2 + i) + ' — una mutación en la hoja de negocio "' + tablero + '" se detecta (BASELINE_CAMBIO)', tieneError(r, 'BASELINE_CAMBIO'), JSON.stringify(r.errores));
  });

  // L17: fallo al leer manifiesto aborta fail-closed.
  (function () {
    var estado = crearEstadoIntegracion_({ obtenerManifiestoFalla: true });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('L17 — un fallo al leer el manifiesto aborta con LECTURA_PREEXISTENCIA_FALLIDA (no se interpreta como "no existe")', tieneError(r, 'LECTURA_PREEXISTENCIA_FALLIDA'), JSON.stringify(r.errores));
  })();

  // L18: fallo al leer baseline aborta.
  (function () {
    var estado = crearEstadoIntegracion_({ lecturaHojaFalla: 'Finanzas' });
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado);
    var r = simularYVerificar_(amb);
    assert('L18 — un fallo al leer una hoja del baseline aborta con LECTURA_BASELINE_FALLIDA', tieneError(r, 'LECTURA_BASELINE_FALLIDA'), JSON.stringify(r.errores));
  })();

  // L19-L29: cada encabezado obligatorio ausente produce fallo en la formal.
  function sinEncabezado(hojaNombre, encabezadoQuitar, filasBase) {
    var estado = crearEstadoIntegracion_();
    var nuevoHeader = filasBase[0].filter(function (h) { return h !== encabezadoQuitar; });
    estado.sheets[hojaNombre] = crearHojaFalsaIntegracion_([nuevoHeader]);
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado); simularYVerificar_(amb);
    return ejecutarFormalYVerificar_(amb);
  }
  ['message_id', 'estado', 'etapa', 'cantidad_observaciones', 'cantidad_tareas', 'resultado_gmail', 'error'].forEach(function (h, i) {
    var r = sinEncabezado('Log Mensajes', h, [encabezadosLogMensajes_()]);
    assert('L19.' + i + ' — falta el encabezado "' + h + '" en Log Mensajes: la formal falla (ENCABEZADO_AUSENTE)', tieneError(r, 'ENCABEZADO_AUSENTE:LogMensajes:' + h), JSON.stringify(r.errores));
  });
  (function () {
    var r = sinEncabezado('Registro Tareas', 'message_id', [['task_id', 'message_id', 'estado_escritura']]);
    assert('L20 — falta message_id en Registro Tareas: la formal falla', tieneError(r, 'ENCABEZADO_AUSENTE:RegistroTareas:message_id'), JSON.stringify(r.errores));
  })();
  ['message_id', 'task_id', 'estado_final'].forEach(function (h, i) {
    var r = sinEncabezado('Indice Idempotencia', h, [['message_id', 'task_id', 'estado_final', 'fecha']]);
    assert('L21.' + i + ' — falta "' + h + '" en Indice Idempotencia: la formal falla', tieneError(r, 'ENCABEZADO_AUSENTE:IndiceIdempotencia:' + h), JSON.stringify(r.errores));
  });

  // L30: excepción formal deja FORMAL_FALLIDO y conserva evidencia.
  (function () {
    var ctx = prepararSimulado_({ nucleoLanzaTrasEfecto: true });
    var r = ejecutarFormalYVerificar_(ctx.amb);
    var sesion = JSON.parse(ctx.estado.userProps[INTEGRACION_CLAVE_SESION]);
    assert('L30 — una excepción durante la formal deja FORMAL_FALLIDO y conserva la evidencia ya escrita', !r.ok && r.errores.indexOf('EXCEPCION_FORMAL') !== -1 && sesion.estado === 'FORMAL_FALLIDO' && ctx.estado.sheets['Log Mensajes']._datos().length === 2, JSON.stringify(r.errores));
  })();

  // L31: FORMAL_EN_CURSO bloquea repetición.
  (function () {
    var ctx = prepararSimulado_();
    var s = JSON.parse(ctx.estado.userProps[INTEGRACION_CLAVE_SESION]); s.estado = 'FORMAL_EN_CURSO'; ctx.estado.userProps[INTEGRACION_CLAVE_SESION] = JSON.stringify(s);
    var r = ejecutarFormalYVerificar_(ctx.amb);
    var sDespues = JSON.parse(ctx.estado.userProps[INTEGRACION_CLAVE_SESION]);
    assert('L31 — una sesión FORMAL_EN_CURSO bloquea la repetición hasta revisión humana', tieneError(r, 'FORMAL_EN_CURSO_REQUIERE_REVISION') && sDespues.estado === 'FORMAL_EN_CURSO', JSON.stringify(r.errores));
  })();

  // L32-L33: fingerprint completo (cuerpo / expectativas).
  (function () {
    var ctx = prepararSimulado_();
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-01-INFORMATIVO');
    var cuerpoOriginal = fixture.cuerpo;
    fixture.cuerpo = cuerpoOriginal + '\nlinea agregada';
    try {
      var r = ejecutarFormalYVerificar_(ctx.amb);
      assert('L32 — un cambio de cuerpo del fixture entre simulación y formal bloquea la formal', !r.ok, JSON.stringify(r.errores));
    } finally {
      fixture.cuerpo = cuerpoOriginal;
    }
  })();

  (function () {
    var ctx = prepararSimulado_();
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-01-INFORMATIVO');
    var esperadoOriginal = fixture.esperado.resultado_gmail;
    fixture.esperado.resultado_gmail = 'ETIQUETADO_Y_ARCHIVADO';
    try {
      var r = ejecutarFormalYVerificar_(ctx.amb);
      assert('L33 — un cambio en las expectativas del fixture rompe el fingerprint y bloquea la formal', tieneError(r, 'FINGERPRINT_CAMBIO'), JSON.stringify(r.errores));
    } finally {
      fixture.esperado.resultado_gmail = esperadoOriginal;
    }
  })();

  // L34: cancelar desde proyecto/cuenta no autorizados NO borra la sesión.
  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    estado.scriptId = 'PROYECTO_NO_AUTORIZADO';
    var r = cancelarSesion_(amb);
    assert('L34 — cancelar desde un proyecto no autorizado NO borra la sesión', !r.ok && r.errores.indexOf('NO_AUTORIZADO') !== -1 && !!estado.userProps[INTEGRACION_CLAVE_SESION], JSON.stringify(r.errores));
  })();

  (function () {
    var estado = crearEstadoIntegracion_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    estado.cuenta = 'intruso@otro.com';
    var r = cancelarSesion_(amb);
    assert('L35 — cancelar desde una cuenta no autorizada NO borra la sesión', !r.ok && !!estado.userProps[INTEGRACION_CLAVE_SESION], JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // M: INT-FASE8-02-DOS-TAREAS (CP-03) — generalización de
  //    verificarResultadoFormal_() para 1 observación / 2 tareas, y no
  //    regresión de INT-FASE8-01-INFORMATIVO.
  // ==========================================================================

  function ejecutarFormalDosTareas_(opciones) {
    var ctx = prepararSimuladoDosTareas_({ efectoFormal: efectoFormalDosTareasFabrica_(opciones) });
    return { resultado: ejecutarFormalYVerificar_(ctx.amb), estado: ctx.estado };
  }

  // M1: camino correcto — 1 observación, 2 tareas (Desarrollo IT + Comercial).
  (function () {
    var r = ejecutarFormalDosTareas_({});
    assert('M1 — INT-FASE8-02: camino correcto (1 observación, 2 tareas en Desarrollo IT y Comercial) aprueba',
      r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // M2-M4: tablero faltante, adicional o duplicado (multiset de Registro Tareas).
  (function () {
    var r = ejecutarFormalDosTareas_({ tablero2: 'Desarrollo IT' }); // falta Comercial
    assert('M2 — tablero faltante (ambas tareas en Desarrollo IT, falta Comercial) rechaza', tieneError(r.resultado, 'REGISTRO_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.resultado.errores));
  })();
  (function () {
    var r = ejecutarFormalDosTareas_({ tablero2: 'Soporte' }); // tablero no esperado
    assert('M3 — tablero adicional/equivocado (Soporte en lugar de Comercial) rechaza', tieneError(r.resultado, 'REGISTRO_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.resultado.errores));
  })();
  (function () {
    var r = ejecutarFormalDosTareas_({ tablero1: 'Comercial', tablero2: 'Comercial' }); // tablero duplicado
    assert('M4 — tablero duplicado (las dos tareas en Comercial) rechaza', tieneError(r.resultado, 'REGISTRO_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.resultado.errores));
  })();

  // M5: task_id vacío.
  (function () {
    var r = ejecutarFormalDosTareas_({ taskId1: '' });
    assert('M5 — task_id vacío en Registro Tareas rechaza', tieneError(r.resultado, 'REGISTRO_TASK_ID_VACIO'), JSON.stringify(r.resultado.errores));
  })();

  // M6: task_id duplicado entre las dos filas.
  (function () {
    var r = ejecutarFormalDosTareas_({ taskId2: 'MSG-NUEVO-1-T1' }); // igual al de la tarea 1
    assert('M6 — task_id duplicado entre las dos tareas rechaza', tieneError(r.resultado, 'REGISTRO_TASK_ID_DUPLICADO'), JSON.stringify(r.resultado.errores));
  })();

  // M7: estado_escritura incorrecto.
  (function () {
    var r = ejecutarFormalDosTareas_({ estadoEscritura2: 'RESERVADA' });
    assert('M7 — estado_escritura distinto de ESCRITA rechaza', tieneError(r.resultado, 'REGISTRO_ESTADO_ESCRITURA'), JSON.stringify(r.resultado.errores));
  })();

  // M8: fila de negocio faltante.
  (function () {
    var r = ejecutarFormalDosTareas_({ omitirFilaNegocio2: true });
    assert('M8 — falta la fila nueva en la hoja de negocio (Comercial) rechaza', tieneError(r.resultado, 'HOJA_NEGOCIO_CANTIDAD:Comercial'), JSON.stringify(r.resultado.errores));
  })();

  // M9: fila de negocio adicional (una tercera fila no esperada).
  (function () {
    var r = ejecutarFormalDosTareas_({ filaNegocioExtra: { tablero: 'Desarrollo IT', taskId: 'MSG-NUEVO-1-EXTRA' } });
    assert('M9 — una fila de negocio adicional no esperada (Desarrollo IT) rechaza', tieneError(r.resultado, 'HOJA_NEGOCIO_CANTIDAD:Desarrollo IT'), JSON.stringify(r.resultado.errores));
  })();

  // M10: fila de negocio en el tablero equivocado.
  (function () {
    var r = ejecutarFormalDosTareas_({ tableroFilaNegocio2: 'Soporte' }); // la fila de la tarea 2 va a Soporte, no a Comercial
    assert('M10 — la fila de negocio de una tarea aparece en el tablero equivocado rechaza',
      tieneError(r.resultado, 'HOJA_NEGOCIO_CANTIDAD:Comercial') && tieneError(r.resultado, 'HOJA_NEGOCIO_MODIFICADA:Soporte'),
      JSON.stringify(r.resultado.errores));
  })();

  // M11: divergencia de task_id entre el manifiesto y el Indice Idempotencia.
  (function () {
    var r = ejecutarFormalDosTareas_({ idsIndice: ['MSG-NUEVO-1-T1', 'MSG-NUEVO-1-OTRO-DISTINTO'] });
    assert('M11 — un task_id del índice que no está en el manifiesto rechaza', tieneError(r.resultado, 'INDICE_TASK_IDS_NO_COINCIDEN_CON_MANIFIESTO'), JSON.stringify(r.resultado.errores));
  })();

  // M12: divergencia de task_id entre el manifiesto y la hoja de negocio.
  (function () {
    var r = ejecutarFormalDosTareas_({ idNegocio2: 'MSG-NUEVO-1-OTRO-DISTINTO' });
    assert('M12 — el "ID" de la fila de negocio no coincide con el task_id del manifiesto rechaza', tieneError(r.resultado, 'HOJA_NEGOCIO_TASK_ID_NO_VINCULADO:Comercial'), JSON.stringify(r.resultado.errores));
  })();

  // M13: observacion_texto_original divergente entre las dos tareas.
  (function () {
    var r = ejecutarFormalDosTareas_({ texto1: 'texto de la observación A', texto2: 'texto de la observación B (distinto)' });
    assert('M13 — observacion_texto_original distinto entre las dos tareas de la misma observación rechaza', tieneError(r.resultado, 'REGISTRO_TEXTO_ORIGINAL_DIVERGENTE'), JSON.stringify(r.resultado.errores));
  })();

  // M14: índice con entrada faltante.
  (function () {
    var r = ejecutarFormalDosTareas_({ idsIndice: ['MSG-NUEVO-1-T1'], estadosIndice: ['PROCESADO'] });
    assert('M14 — falta una entrada en Indice Idempotencia (1 en vez de 2) rechaza', tieneError(r.resultado, 'INDICE_ENTRADAS:1'), JSON.stringify(r.resultado.errores));
  })();

  // M15: índice con entrada duplicada (el mismo task_id dos veces, falta el otro).
  (function () {
    var r = ejecutarFormalDosTareas_({ idsIndice: ['MSG-NUEVO-1-T1', 'MSG-NUEVO-1-T1'] });
    assert('M15 — una entrada duplicada en Indice Idempotencia (mismo task_id dos veces) rechaza', tieneError(r.resultado, 'INDICE_TASK_ID_DUPLICADO'), JSON.stringify(r.resultado.errores));
  })();

  // M16: índice con estado_final incorrecto.
  (function () {
    var r = ejecutarFormalDosTareas_({ estadosIndice: ['PROCESADO', 'SIN_TAREAS'] });
    assert('M16 — una entrada de Indice Idempotencia con estado_final incorrecto rechaza', tieneError(r.resultado, 'INDICE_ESTADO_FINAL'), JSON.stringify(r.resultado.errores));
  })();

  // M17-M18: etiquetas de Gmail incorrectas.
  (function () {
    var r = ejecutarFormalDosTareas_({ omitirEtiquetaProcesado: true });
    assert('M17 — falta la etiqueta Procesado esperada rechaza', tieneError(r.resultado, 'GMAIL_SIN_ETIQUETA_RESULTADO'), JSON.stringify(r.resultado.errores));
  })();
  (function () {
    var r = ejecutarFormalDosTareas_({ etiquetasExtra: ['L_ERRPROC'] }); // etiqueta prohibida para este fixture
    assert('M18 — una etiqueta de error prohibida presente además de Procesado rechaza', tieneError(r.resultado, 'GMAIL_ETIQUETA_PROHIBIDA:RevisionErrorProcesamiento'), JSON.stringify(r.resultado.errores));
  })();

  // M19: hojas de negocio sin tareas (Finanzas, Soporte, Gestión General) permanecen idénticas al baseline
  // (ok===true en el camino correcto ya implica cero errores HOJA_NEGOCIO_*, incluidas esas tres).
  (function () {
    var r = ejecutarFormalDosTareas_({});
    assert('M19 — Finanzas, Soporte y Gestión General no reciben ninguna fila nueva en el camino correcto', r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // M20: la simulación (DRY_RUN) sigue exigiendo cero cambios también para este fixture.
  (function () {
    var estado = crearEstadoDosTareas_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var sim = simularYVerificar_(amb);
    assert('M20 — la simulación de INT-FASE8-02 aprueba sin tocar Registro Tareas/Indice/hojas de negocio',
      sim.ok === true &&
      estado.sheets['Registro Tareas']._datos().length === 1 &&
      estado.sheets['Indice Idempotencia']._datos().length === 1 &&
      // 5 = título + fila auxiliar + fila vacía + encabezados + 1 dato previo (preámbulo real).
      estado.sheets['Desarrollo IT']._datos().length === 5 &&
      estado.sheets['Comercial']._datos().length === 5,
      JSON.stringify(sim.errores));
  })();

  // M21: no regresión — INT-FASE8-01-INFORMATIVO sigue aprobando sin cambios,
  // usando el fixture por defecto (sin AUTO_FASE8_CASO), tras la generalización.
  (function () {
    var ctx = prepararSimulado_();
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('M21 — no regresión: INT-FASE8-01-INFORMATIVO sigue aprobando (SIMULACION_OK + FORMAL_OK) tras la generalización',
      r.ok === true, JSON.stringify(r.errores));
  })();

  // M22: sanitización — el canario de observacion_texto_original (presente en
  // ambas filas de Registro Tareas del camino correcto) nunca llega a los logs.
  (function () {
    var r = ejecutarFormalDosTareas_({});
    var logs = r.estado.logs.join('\n');
    assert('M22 — ningún log de INT-FASE8-02 contiene el canario de observacion_texto_original', logs.indexOf('CANARIO_OBS_TEXTO_ORIGINAL') === -1, logs);
  })();

  // ==========================================================================
  // N: corrección del falso negativo real (messageId 19f948e5d35b5276,
  //    24/07/2026) — localizarFilaEncabezadosNegocio_() ya no asume que los
  //    encabezados de una hoja de negocio están en la fila 1.
  // ==========================================================================

  // N1-N5: pruebas directas de localizarFilaEncabezadosNegocio_() (sin pasar
  // por todo el flujo simular/formal).

  (function () {
    var valores = [
      filaTituloNegocio_('Desarrollo IT'),
      filaFuenteSugeridaNegocio_(),
      filaVaciaNegocio_(),
      encabezadosHojaNegocio_(),
      filaNegocioPrevia_('ID-PREVIO-D', 'Alto')
    ];
    var r = localizarFilaEncabezadosNegocio_(valores);
    assert('N1 — detecta los encabezados en la fila 4 (índice 3) con el preámbulo real', r.ok === true && r.indiceFila === 3, JSON.stringify(r));
  })();

  (function () {
    var valores = [filaTituloNegocio_('Desarrollo IT'), filaFuenteSugeridaNegocio_(), filaVaciaNegocio_(), filaNegocioPrevia_('ID-PREVIO-D', 'Alto')];
    var r = localizarFilaEncabezadosNegocio_(valores); // ninguna fila tiene los 7 encabezados
    assert('N2 — cero filas candidatas: ok=false, cantidadCandidatas=0', r.ok === false && r.cantidadCandidatas === 0, JSON.stringify(r));
  })();

  (function () {
    var valores = [filaTituloNegocio_('Desarrollo IT'), encabezadosHojaNegocio_(), encabezadosHojaNegocio_(), filaNegocioPrevia_('ID-PREVIO-D', 'Alto')];
    var r = localizarFilaEncabezadosNegocio_(valores); // encabezados duplicados
    assert('N3 — dos filas candidatas: ok=false, cantidadCandidatas=2', r.ok === false && r.cantidadCandidatas === 2, JSON.stringify(r));
  })();

  (function () {
    var encabezadosParciales = encabezadosHojaNegocio_().map(function (h) { return h === 'Resumen de tarea' ? 'Otra columna' : h; });
    var valores = [filaTituloNegocio_('Desarrollo IT'), filaFuenteSugeridaNegocio_(), encabezadosParciales, filaNegocioPrevia_('ID-PREVIO-D', 'Alto')];
    var r = localizarFilaEncabezadosNegocio_(valores); // le falta "Resumen de tarea"
    assert('N4 — encabezado parcial (falta "Resumen de tarea"): cero candidatas', r.ok === false && r.cantidadCandidatas === 0, JSON.stringify(r));
  })();

  (function () {
    var valores = [encabezadosHojaNegocio_(), filaNegocioPrevia_('ID-PREVIO-D', 'Alto')]; // sin preámbulo, como antes de esta corrección
    var r = localizarFilaEncabezadosNegocio_(valores);
    assert('N5 — compatibilidad: también detecta los encabezados en la fila 1 (índice 0) cuando no hay preámbulo', r.ok === true && r.indiceFila === 0, JSON.stringify(r));
  })();

  // N6: camino correcto con el preámbulo real — Comercial y Desarrollo IT con
  // encabezados en fila 4 aprueban (confirma M1 con la estructura corregida).
  (function () {
    var r = ejecutarFormalDosTareas_({});
    assert('N6 — Comercial y Desarrollo IT con encabezados en fila 4 aprueban (FORMAL_OK)', r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // N7: cero filas candidatas en una hoja de negocio real (Desarrollo IT sin
  // fila de encabezados) — aborta fail-closed, nunca declara FORMAL_OK.
  (function () {
    var estado = crearEstadoDosTareas_({ efectoFormal: efectoFormalDosTareasFabrica_({}) });
    estado.sheets['Desarrollo IT'] = crearHojaFalsaIntegracion_([
      filaTituloNegocio_('Desarrollo IT'), filaFuenteSugeridaNegocio_(), filaVaciaNegocio_(), filaNegocioPrevia_('ID-PREVIO-D', 'Alto')
    ]); // sin fila de encabezados
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado); simularYVerificar_(amb);
    var r = ejecutarFormalYVerificar_(amb);
    assert('N7 — cero filas candidatas en Desarrollo IT: FORMAL_FALLIDO con FILA_ENCABEZADOS_NEGOCIO_AUSENTE, nunca FORMAL_OK',
      r.ok === false && tieneError(r, 'FILA_ENCABEZADOS_NEGOCIO_AUSENTE:Desarrollo IT'), JSON.stringify(r.errores));
  })();

  // N8: dos filas candidatas (encabezado duplicado) — aborta fail-closed.
  (function () {
    var estado = crearEstadoDosTareas_({ efectoFormal: efectoFormalDosTareasFabrica_({}) });
    estado.sheets['Comercial'] = crearHojaFalsaIntegracion_([
      filaTituloNegocio_('Comercial'), encabezadosHojaNegocio_(), encabezadosHojaNegocio_(), filaNegocioPrevia_('ID-PREVIO-C', 'Medio')
    ]); // encabezados duplicados
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado); simularYVerificar_(amb);
    var r = ejecutarFormalYVerificar_(amb);
    assert('N8 — dos filas candidatas en Comercial: FORMAL_FALLIDO con FILA_ENCABEZADOS_NEGOCIO_AMBIGUA, nunca FORMAL_OK',
      r.ok === false && tieneError(r, 'FILA_ENCABEZADOS_NEGOCIO_AMBIGUA:Comercial'), JSON.stringify(r.errores));
  })();

  // N9: encabezado parcial en una hoja real (falta "Resumen de tarea") — cero candidatas.
  (function () {
    var encabezadosParciales = encabezadosHojaNegocio_().map(function (h) { return h === 'Resumen de tarea' ? 'Otra columna' : h; });
    var estado = crearEstadoDosTareas_({ efectoFormal: efectoFormalDosTareasFabrica_({}) });
    estado.sheets['Desarrollo IT'] = crearHojaFalsaIntegracion_([
      filaTituloNegocio_('Desarrollo IT'), filaFuenteSugeridaNegocio_(), encabezadosParciales, filaNegocioPrevia_('ID-PREVIO-D', 'Alto')
    ]);
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado); simularYVerificar_(amb);
    var r = ejecutarFormalYVerificar_(amb);
    assert('N9 — encabezado parcial en Desarrollo IT (falta "Resumen de tarea"): FORMAL_FALLIDO, nunca FORMAL_OK',
      r.ok === false && tieneError(r, 'FILA_ENCABEZADOS_NEGOCIO_AUSENTE:Desarrollo IT'), JSON.stringify(r.errores));
  })();

  // N10: el pipeline (simulado) corrompe una fila del preámbulo (el título) al
  // escribir — el prefijo del baseline lo detecta, cubre título/fila auxiliar,
  // no solo encabezados/datos.
  (function () {
    var r = ejecutarFormalDosTareas_({ corromperFilaBase: { tablero: 'Desarrollo IT', fila: 0, valor: 'TITULO CORROMPIDO POR EL PIPELINE' } });
    assert('N10 — si el pipeline corrompe la fila de título del preámbulo al escribir, se detecta (HOJA_NEGOCIO_FILA_EXISTENTE_MODIFICADA)',
      tieneError(r.resultado, 'HOJA_NEGOCIO_FILA_EXISTENTE_MODIFICADA:Desarrollo IT'), JSON.stringify(r.resultado.errores));
  })();

  // N11: compatibilidad — una hoja de negocio SIN preámbulo (encabezados en la
  // fila 1) sigue funcionando correctamente, junto con otra que sí lo tiene.
  (function () {
    var estado = crearEstadoDosTareas_({ efectoFormal: efectoFormalDosTareasFabrica_({}) });
    estado.sheets['Desarrollo IT'] = crearHojaFalsaIntegracion_([encabezadosHojaNegocio_(), filaNegocioPrevia_('ID-PREVIO-D', 'Alto')]); // sin preámbulo
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb); simularEnvioMensaje_(estado); simularYVerificar_(amb);
    var r = ejecutarFormalYVerificar_(amb);
    assert('N11 — compatibilidad: Desarrollo IT sin preámbulo (encabezados en fila 1) y Comercial con preámbulo real ambos aprueban',
      r.ok === true, JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // O: corrección del segundo falso negativo real (messageId
  //    19f94b94245ce658, 24/07/2026) — la simulación ahora compara la
  //    clasificación obtenida (resultadosSimulados[0].resultado) contra
  //    fixture.esperado vía verificarClasificacionSimulada_(), y una
  //    discrepancia produce SIMULACION_FALLIDA sin autorizar la formal.
  // ==========================================================================

  /** prepararCaso_ + simularEnvioMensaje_ + simularYVerificar_ para el fixture de dos tareas, con clasificación simulada anulable. */
  function simularDosTareasConClasificacion_(clasificacionOverride) {
    var overrides = {};
    if (clasificacionOverride !== undefined) overrides.clasificacionSimuladaOverride = clasificacionOverride;
    var estado = crearEstadoDosTareas_(overrides);
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var sim = simularYVerificar_(amb);
    return { estado: estado, amb: amb, sim: sim };
  }

  // Reproduce exactamente la discrepancia real: Desarrollo IT/Alto + Soporte/Medio en vez de Desarrollo IT + Comercial.
  var CLASIFICACION_SOPORTE_EN_VEZ_DE_COMERCIAL = {
    resultado: 'TAREAS_SIMULADAS', cantidadObservaciones: 1, cantidadTareas: 2, tableros: ['Desarrollo IT', 'Soporte']
  };

  // O1: tableros exactos (Desarrollo IT + Comercial, derivados de fixture.esperado) → SIMULACION_OK.
  (function () {
    var r = simularDosTareasConClasificacion_(undefined);
    assert('O1 — clasificación con tableros exactos (Desarrollo IT + Comercial) aprueba la simulación', r.sim.ok === true, JSON.stringify(r.sim.errores));
  })();

  // O2: Soporte en lugar de Comercial (el caso real) → SIMULACION_FALLIDA, sin autorizar la formal.
  (function () {
    var r = simularDosTareasConClasificacion_(CLASIFICACION_SOPORTE_EN_VEZ_DE_COMERCIAL);
    assert('O2 — Soporte en lugar de Comercial: SIMULACION_FALLIDA con SIMULACION_TABLEROS_NO_COINCIDEN',
      r.sim.ok === false && tieneError(r.sim, 'SIMULACION_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.sim.errores));
  })();

  // O3: tarea faltante (solo Desarrollo IT, falta Comercial) → cantidad de tareas incorrecta.
  (function () {
    var r = simularDosTareasConClasificacion_({ resultado: 'TAREAS_SIMULADAS', cantidadObservaciones: 1, cantidadTareas: 1, tableros: ['Desarrollo IT'] });
    assert('O3 — tarea faltante (1 tablero en vez de 2): SIMULACION_FALLIDA con SIMULACION_CANTIDAD_TAREAS:1',
      r.sim.ok === false && tieneError(r.sim, 'SIMULACION_CANTIDAD_TAREAS:1'), JSON.stringify(r.sim.errores));
  })();

  // O4: tarea adicional (Desarrollo IT + Comercial + Soporte) → cantidad de tareas incorrecta.
  (function () {
    var r = simularDosTareasConClasificacion_({ resultado: 'TAREAS_SIMULADAS', cantidadObservaciones: 1, cantidadTareas: 3, tableros: ['Desarrollo IT', 'Comercial', 'Soporte'] });
    assert('O4 — tarea adicional (3 tableros en vez de 2): SIMULACION_FALLIDA con SIMULACION_CANTIDAD_TAREAS:3',
      r.sim.ok === false && tieneError(r.sim, 'SIMULACION_CANTIDAD_TAREAS:3'), JSON.stringify(r.sim.errores));
  })();

  // O5: tarea duplicada (Desarrollo IT dos veces, falta Comercial) — la cantidad coincide (2) pero el multiset no.
  (function () {
    var r = simularDosTareasConClasificacion_({ resultado: 'TAREAS_SIMULADAS', cantidadObservaciones: 1, cantidadTareas: 2, tableros: ['Desarrollo IT', 'Desarrollo IT'] });
    assert('O5 — tablero duplicado (Desarrollo IT x2, falta Comercial): SIMULACION_FALLIDA con SIMULACION_TABLEROS_NO_COINCIDEN y SIN error de cantidad de tareas',
      r.sim.ok === false && tieneError(r.sim, 'SIMULACION_TABLEROS_NO_COINCIDEN') && !tieneError(r.sim, 'SIMULACION_CANTIDAD_TAREAS'), JSON.stringify(r.sim.errores));
  })();

  // O6: cantidad de observaciones incorrecta, con tableros y cantidad de tareas correctos.
  (function () {
    var r = simularDosTareasConClasificacion_({ resultado: 'TAREAS_SIMULADAS', cantidadObservaciones: 2, cantidadTareas: 2, tableros: ['Desarrollo IT', 'Comercial'] });
    assert('O6 — cantidad de observaciones incorrecta (2 en vez de 1): SIMULACION_FALLIDA con SIMULACION_CANTIDAD_OBSERVACIONES:2 y SIN error de tableros',
      r.sim.ok === false && tieneError(r.sim, 'SIMULACION_CANTIDAD_OBSERVACIONES:2') && !tieneError(r.sim, 'SIMULACION_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.sim.errores));
  })();

  // O7: ninguna escritura durante la simulación fallida por discrepancia de clasificación.
  (function () {
    var r = simularDosTareasConClasificacion_(CLASIFICACION_SOPORTE_EN_VEZ_DE_COMERCIAL);
    assert('O7 — la simulación fallida por clasificación no toca Registro Tareas/Indice/hojas de negocio',
      r.sim.ok === false &&
      r.estado.sheets['Registro Tareas']._datos().length === 1 &&
      r.estado.sheets['Indice Idempotencia']._datos().length === 1 &&
      // 5 = título + fila auxiliar + fila vacía + encabezados + 1 dato previo (preámbulo real).
      r.estado.sheets['Desarrollo IT']._datos().length === 5 &&
      r.estado.sheets['Comercial']._datos().length === 5 &&
      r.estado.sheets['Soporte']._datos().length === 5,
      JSON.stringify(r.sim.errores));
  })();

  // O8: la formal permanece bloqueada después de una simulación fallida por clasificación (sesion sigue en PREPARADO).
  (function () {
    var r = simularDosTareasConClasificacion_(CLASIFICACION_SOPORTE_EN_VEZ_DE_COMERCIAL);
    var formal = ejecutarFormalYVerificar_(r.amb);
    assert('O8 — tras una simulación fallida por clasificación, ejecutarFormalYVerificar_ rechaza con SIN_SIMULACION_OK (formal bloqueada)',
      r.sim.ok === false && formal.ok === false && tieneError(formal, 'SIN_SIMULACION_OK'), JSON.stringify(formal.errores));
  })();

  // O9: verificarClasificacionSimulada_() en sí misma — fail-closed cuando el núcleo no devuelve resultadosSimulados.
  (function () {
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-02-DOS-TAREAS');
    var r = verificarClasificacionSimulada_({ resultadosSimulados: [] }, fixture);
    assert('O9 — verificarClasificacionSimulada_() sin resultadosSimulados: ok=false con SIMULACION_SIN_RESULTADO_CLASIFICADO',
      r.ok === false && r.errores.indexOf('SIMULACION_SIN_RESULTADO_CLASIFICADO') !== -1, JSON.stringify(r));
  })();

  // ==========================================================================
  // P: INT-FASE8-04-TRES-TAREAS (CP-04) — confirma que la generalización a N
  //    tareas de verificarResultadoFormal_()/verificarClasificacionSimulada_()
  //    (probada a N=2 en las secciones M/N/O) también funciona a N=3, sin
  //    repetir cada escenario ya cubierto de forma genérica en esas secciones.
  // ==========================================================================

  function ejecutarFormalTresTareas_(opciones) {
    var ctx = prepararSimuladoTresTareas_({ efectoFormal: efectoFormalTresTareasFabrica_(opciones) });
    return { resultado: ejecutarFormalYVerificar_(ctx.amb), estado: ctx.estado };
  }

  // P1: camino correcto — 1 observación, 3 tareas (Desarrollo IT + Finanzas + Comercial).
  (function () {
    var r = ejecutarFormalTresTareas_({});
    assert('P1 — INT-FASE8-04: camino correcto (1 observación, 3 tareas en Desarrollo IT/Finanzas/Comercial) aprueba',
      r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // P2: la simulación (DRY_RUN), con la clasificación derivada por defecto de fixture.esperado, también aprueba a N=3.
  (function () {
    var estado = crearEstadoTresTareas_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var sim = simularYVerificar_(amb);
    assert('P2 — la simulación de INT-FASE8-04 aprueba sin tocar Registro Tareas/Indice/hojas de negocio',
      sim.ok === true &&
      estado.sheets['Registro Tareas']._datos().length === 1 &&
      estado.sheets['Indice Idempotencia']._datos().length === 1 &&
      estado.sheets['Finanzas']._datos().length === 5,
      JSON.stringify(sim.errores));
  })();

  // P3: tablero equivocado entre los tres (Soporte en vez de Finanzas) rechaza.
  (function () {
    var r = ejecutarFormalTresTareas_({ tablero2: 'Soporte' });
    assert('P3 — tablero equivocado (Soporte en vez de Finanzas) entre los tres rechaza', tieneError(r.resultado, 'REGISTRO_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.resultado.errores));
  })();

  // P4: tablero duplicado (Desarrollo IT dos veces, falta Comercial) — mismo total de filas/entradas, isla la comparación de multiset.
  (function () {
    var r = ejecutarFormalTresTareas_({ tablero3: 'Desarrollo IT' });
    assert('P4 — tablero duplicado (Desarrollo IT x2, falta Comercial) rechaza', tieneError(r.resultado, 'REGISTRO_TABLEROS_NO_COINCIDEN'), JSON.stringify(r.resultado.errores));
  })();

  // ==========================================================================
  // Q: INT-FASE8-05-OBSERVACIONES-DUPLICADAS (CP-15) — confirma que la
  //    generalización a N tareas también funciona en N=1 (probada en N=2 y N=3
  //    por las secciones M/N/O y P). La consolidación de RF-04 en sí (si la IA
  //    real reporta 1 o 2 observaciones) solo puede confirmarse con una
  //    corrida real — ver auditoria/CHANGELOG.md.
  // ==========================================================================

  function ejecutarFormalUnaTarea_(opciones) {
    var ctx = prepararSimuladoUnaTarea_({ efectoFormal: efectoFormalUnaTareaFabrica_(opciones) });
    return { resultado: ejecutarFormalYVerificar_(ctx.amb), estado: ctx.estado };
  }

  // Q1: camino correcto — 1 observación, 1 tarea (Finanzas).
  (function () {
    var r = ejecutarFormalUnaTarea_({});
    assert('Q1 — INT-FASE8-05: camino correcto (1 observación, 1 tarea en Finanzas) aprueba',
      r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // Q2: la simulación (DRY_RUN), con la clasificación derivada por defecto de fixture.esperado, también aprueba a N=1.
  (function () {
    var estado = crearEstadoUnaTarea_();
    var amb = crearAmbFalsoIntegracion_(estado);
    prepararCaso_(amb);
    simularEnvioMensaje_(estado);
    var sim = simularYVerificar_(amb);
    assert('Q2 — la simulación de INT-FASE8-05 aprueba sin tocar Registro Tareas/Indice/hojas de negocio',
      sim.ok === true &&
      estado.sheets['Registro Tareas']._datos().length === 1 &&
      estado.sheets['Indice Idempotencia']._datos().length === 1 &&
      estado.sheets['Finanzas']._datos().length === 5,
      JSON.stringify(sim.errores));
  })();

  // ==========================================================================
  // R: INT-FASE8-06-FIRMA-EXTENSA (CP-14) — confirma que la generalización N=1
  //    (ya probada por CP-15) también aprueba con este fixture, reutilizando
  //    sin cambios efectoFormalUnaTareaFabrica_ con un tablero distinto
  //    (Gestión General). La exclusión de firmas/avisos legales del prompt
  //    real solo puede confirmarse con una corrida real — ver auditoria/CHANGELOG.md.
  // ==========================================================================

  function ejecutarFormalFirmaExtensa_(opciones) {
    opciones = opciones || {};
    opciones.tablero1 = opciones.tablero1 || 'Gestión General';
    var ctx = prepararSimuladoFirmaExtensa_({ efectoFormal: efectoFormalUnaTareaFabrica_(opciones) });
    return { resultado: ejecutarFormalYVerificar_(ctx.amb), estado: ctx.estado };
  }

  // R1: camino correcto — 1 observación, 1 tarea (Gestión General).
  (function () {
    var r = ejecutarFormalFirmaExtensa_({});
    assert('R1 — INT-FASE8-06: camino correcto (1 observación, 1 tarea en Gestión General) aprueba',
      r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // ==========================================================================
  // S: INT-FASE8-07-CUERPO-VACIO (CP-16) — confirma que un mensaje cuyo cuerpo
  //    queda vacío tras extraerContenidoNuevo() (solo cita, sin texto propio)
  //    es rechazado por evaluarFiltroDeterministico() (regla 6, RevisionSinTareas)
  //    ANTES de cualquier llamada a la IA, reutilizando sin cambios
  //    efectoFormalSinTareasCorrecto_ (mismo resultado que INT-FASE8-01). La
  //    confirmación de que el filtro determinístico realmente dispara con este
  //    cuerpo (en vez de llegar a la IA) solo puede hacerse con una corrida
  //    real — ver auditoria/CHANGELOG.md.
  //
  //    S2-S4 (24/07/2026, corrección tras el primer hallazgo real,
  //    messageId=19f9661d038ea8de): verificarClasificacionSimulada_() en sí
  //    misma, para la categoría NO_ELEGIBLE (fixture.esperado.resultadoSimulado)
  //    — la simulación DRY_RUN real nunca clasifica con la IA, así que
  //    cantidadObservaciones/cantidadTareas son `null`, nunca 0.
  // ==========================================================================

  // S1: camino correcto — 0 observaciones, 0 tareas, SIN_TAREAS/RevisionSinTareas.
  // Tras la corrección de clasificacionSimuladaPorDefecto_(), esta prueba ahora
  // simula fielmente NO_ELEGIBLE/null/null/[] (antes derivaba, por error, un
  // SIN_TAREAS/0/0 genérico que nunca habría detectado el hallazgo real).
  (function () {
    var ctx = prepararSimuladoCuerpoVacio_({});
    var r = ejecutarFormalYVerificar_(ctx.amb);
    assert('S1 — INT-FASE8-07: camino correcto (cuerpo vacío tras la cita, 0 observaciones/0 tareas) aprueba (SIMULACION_OK + FORMAL_OK)',
      r.ok === true, JSON.stringify(r.errores));
  })();

  // S2: NO_ELEGIBLE con cantidades null (la forma real que devuelve procesarUnMensajeSimulado()) aprueba.
  (function () {
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-07-CUERPO-VACIO');
    var r = verificarClasificacionSimulada_({ resultadosSimulados: [{ resultado: { resultado: 'NO_ELEGIBLE', cantidadObservaciones: null, cantidadTareas: null, tableros: [] } }] }, fixture);
    assert('S2 — verificarClasificacionSimulada_(): NO_ELEGIBLE con cantidades null aprueba', r.ok === true, JSON.stringify(r.errores));
  })();

  // S3: el mensaje llega a una clasificación de la IA (SIN_TAREAS) en vez de ser filtrado — rechaza.
  (function () {
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-07-CUERPO-VACIO');
    var r = verificarClasificacionSimulada_({ resultadosSimulados: [{ resultado: { resultado: 'SIN_TAREAS', cantidadObservaciones: 0, cantidadTareas: 0, tableros: [] } }] }, fixture);
    assert('S3 — verificarClasificacionSimulada_(): SIN_TAREAS en vez de NO_ELEGIBLE rechaza con SIMULACION_RESULTADO_NO_COINCIDE',
      r.ok === false && tieneError(r, 'SIMULACION_RESULTADO_NO_COINCIDE:SIN_TAREAS'), JSON.stringify(r.errores));
  })();

  // S4: NO_ELEGIBLE pero con cantidades numéricas (0) en vez de null — rechaza (regresión hipotética del núcleo).
  (function () {
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-07-CUERPO-VACIO');
    var r = verificarClasificacionSimulada_({ resultadosSimulados: [{ resultado: { resultado: 'NO_ELEGIBLE', cantidadObservaciones: 0, cantidadTareas: 0, tableros: [] } }] }, fixture);
    assert('S4 — verificarClasificacionSimulada_(): NO_ELEGIBLE con cantidades 0 en vez de null rechaza',
      r.ok === false && tieneError(r, 'SIMULACION_CANTIDAD_OBSERVACIONES:0') && tieneError(r, 'SIMULACION_CANTIDAD_TAREAS:0'), JSON.stringify(r.errores));
  })();

  // ==========================================================================
  // T: INT-FASE8-08-FECHA-LIMITE-EXPLICITA (CP-17) — nueva verificación
  //    OPCIONAL de la columna "Fecha límite" en verificarResultadoFormal_(),
  //    activada por fixture.esperado.fechaLimiteEsperada. Que construirFechaLocal()
  //    (codigo/escritura_sheets.gs) realmente evite el corrimiento de un día en
  //    la zona horaria del proyecto solo puede confirmarse con una corrida
  //    real — ver auditoria/CHANGELOG.md.
  // ==========================================================================

  function ejecutarFormalFechaLimiteExplicita_(opciones) {
    var ctx = prepararSimuladoFechaLimiteExplicita_({ efectoFormal: efectoFormalUnaTareaConFechaFabrica_(opciones) });
    return { resultado: ejecutarFormalYVerificar_(ctx.amb), estado: ctx.estado };
  }

  // T1: camino correcto — 1 observación, 1 tarea (Comercial), Fecha límite = 2026-07-31.
  (function () {
    var r = ejecutarFormalFechaLimiteExplicita_({});
    assert('T1 — INT-FASE8-08: camino correcto (1 observación, 1 tarea en Comercial, Fecha límite 2026-07-31) aprueba',
      r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  // T2: día equivocado (corrimiento de un día: 30 en vez de 31) — rechaza.
  (function () {
    var r = ejecutarFormalFechaLimiteExplicita_({ fechaLimite: new Date(2026, 6, 30) });
    assert('T2 — día equivocado (corrimiento de un día, 2026-07-30 en vez de 2026-07-31) rechaza',
      tieneError(r.resultado, 'HOJA_NEGOCIO_FECHA_LIMITE_NO_COINCIDE:Comercial:2026-07-30'), JSON.stringify(r.resultado.errores));
  })();

  // T3: celda "Fecha límite" vacía cuando se esperaba una fecha explícita — rechaza.
  (function () {
    var r = ejecutarFormalFechaLimiteExplicita_({ fechaLimite: '' });
    assert('T3 — celda "Fecha límite" vacía cuando se esperaba una fecha explícita rechaza',
      tieneError(r.resultado, 'HOJA_NEGOCIO_FECHA_LIMITE_NO_COINCIDE:Comercial:VACIO'), JSON.stringify(r.resultado.errores));
  })();

  // T4/T5: rama fechaLimiteEsperada=null, ejercitada aquí mediante mutación
  // temporal del fixture de CP-17 (con restauración en finally, mismo patrón
  // que las pruebas L32-L33) — antes de que existiera el fixture propio de
  // CP-18 (sección U, más abajo), que ahora la ejercita también con datos reales.
  (function () {
    var fixture = obtenerFixtureIntegracion_('INT-FASE8-08-FECHA-LIMITE-EXPLICITA');
    var original = fixture.esperado.fechaLimiteEsperada;
    fixture.esperado.fechaLimiteEsperada = null;
    try {
      var rVacia = ejecutarFormalFechaLimiteExplicita_({ fechaLimite: '' });
      assert('T4 — fechaLimiteEsperada=null con la celda vacía aprueba', rVacia.resultado.ok === true, JSON.stringify(rVacia.resultado.errores));

      var rConFecha = ejecutarFormalFechaLimiteExplicita_({});
      assert('T5 — fechaLimiteEsperada=null con una fecha presente en la celda rechaza',
        tieneError(rConFecha.resultado, 'HOJA_NEGOCIO_FECHA_LIMITE_NO_COINCIDE:Comercial:2026-07-31'), JSON.stringify(rConFecha.resultado.errores));
    } finally {
      fixture.esperado.fechaLimiteEsperada = original;
    }
  })();

  // ==========================================================================
  // U: INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA (CP-18) — complemento exacto de
  //    CP-17: confirma que la rama fechaLimiteEsperada=null (secciones 7.3,
  //    T4/T5) también aprueba con un fixture propio, reutilizando sin cambios
  //    efectoFormalUnaTareaConFechaFabrica_ con un tablero distinto
  //    (Desarrollo IT) y la celda vacía. Que la IA real no invente una fecha
  //    cuando el cuerpo no menciona ninguna solo puede confirmarse con una
  //    corrida real — ver auditoria/CHANGELOG.md.
  // ==========================================================================

  function ejecutarFormalFechaLimiteNoExplicita_(opciones) {
    opciones = opciones || {};
    opciones.tablero1 = opciones.tablero1 || 'Desarrollo IT';
    opciones.fechaLimite = 'fechaLimite' in opciones ? opciones.fechaLimite : '';
    var ctx = prepararSimuladoFechaLimiteNoExplicita_({ efectoFormal: efectoFormalUnaTareaConFechaFabrica_(opciones) });
    return { resultado: ejecutarFormalYVerificar_(ctx.amb), estado: ctx.estado };
  }

  // U1: camino correcto — 1 observación, 1 tarea (Desarrollo IT), Fecha límite vacía.
  (function () {
    var r = ejecutarFormalFechaLimiteNoExplicita_({});
    assert('U1 — INT-FASE8-09: camino correcto (1 observación, 1 tarea en Desarrollo IT, Fecha límite vacía) aprueba',
      r.resultado.ok === true, JSON.stringify(r.resultado.errores));
  })();

  Logger.log('--- Resumen ---');
  Logger.log(fallos === 0
    ? 'ejecutarPruebasAutomatizadorIntegracionFase8(): ' + casos.length + '/' + casos.length + ' verificaciones OK.'
    : 'ejecutarPruebasAutomatizadorIntegracionFase8(): ' + fallos + ' de ' + casos.length + ' verificaciones FALLARON.');
}
