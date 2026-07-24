/**
 * ============================================================================
 * pruebas/evaluador_ia_fase8.gs
 * EXCLUSIVO DEL PROYECTO DE PRUEBA / NO DESPLEGAR
 * ============================================================================
 * Fase 1 de automatización gradual de las pruebas de la Fase 8 (ver
 * auditoria/CHANGELOG.md, entrada "Fase 1 de automatización gradual de
 * pruebas de IA"). Ejecuta los fixtures de
 * pruebas/fixtures_evaluacion_ia_fase8.gs directamente contra
 * consultarIAExtractora() (codigo/cliente_openai.gs), valida cada respuesta
 * con validarRespuestaIA() (codigo/esquema_json.gs) y compara el resultado
 * con la expectativa declarada en cada fixture.
 *
 * Objetivo: reducir la ejecución manual de casos de prueba centrados en
 * extracción/clasificación de IA. NO reemplaza la ejecución humana de
 * Fase 8 de punta a punta (no toca el correo real ni las hojas de cálculo).
 *
 * Reglas de seguridad de este archivo:
 * - Aborta salvo que MODO_PRUEBA y DRY_RUN sean exactamente "true".
 * - No usa el servicio de correo ni los servicios de hojas de cálculo o
 *   archivos de Google Workspace, y no escribe ninguna propiedad.
 * - Reutiliza consultarIAExtractora() y validarRespuestaIA() sin duplicar
 *   su lógica.
 * - Los logs se limitan a: id del fixture, versión de prompt, conteos,
 *   clasificaciones esperadas/obtenidas (tablero/prioridad, valores de
 *   catálogo), un diagnóstico ESTRUCTURAL seguro cuando el validador
 *   rechaza una respuesta (conteos, booleanos y presencia/ausencia de
 *   campos — nunca su contenido) y PASA/FALLA. Nunca se registra el cuerpo
 *   del correo, el prompt completo, la clave de OpenAI, el payload ni texto
 *   libre generado por el modelo (resumen, texto original, motivos de
 *   revisión). Los fallos de validarRespuestaIA() se traducen a una
 *   categoría fija (ver categorizarMotivoValidacion_) para que un "motivo"
 *   con texto libre del modelo (por ejemplo, un rechazo del modelo) nunca
 *   llegue al log tal cual.
 *
 * Calibración del 22/07/2026 (primera ejecución real — ver
 * auditoria/CHANGELOG.md): tras el primer 0/4 real se ajustaron las
 * expectativas de los fixtures (no la lógica de este archivo salvo lo
 * descrito abajo) y se ampliaron dos capacidades del evaluador:
 * - compararParesTableroPrioridad_() admite `prioridadesPermitidas` por
 *   tarea, cuando el texto sintético no determina una prioridad única.
 * - categorizarMotivoValidacion_() reconoce la regla C-06 inversa.
 * - diagnosticoEstructuralSeguro_() (nueva) resume, sin texto libre, la
 *   forma de una respuesta que el validador rechazó.
 * - Un fixture puede declarar categoriasRechazoSegurasPermitidas: una lista
 *   cerrada de categorías de rechazo que, para ESE fixture, se consideran
 *   un resultado aceptable (por ejemplo, un comportamiento seguro pero no
 *   estrictamente conforme al esquema ante instrucciones sospechosas).
 * ============================================================================
 */

/**
 * Barrera de entorno: ninguna otra función de este archivo puede ejecutar
 * lógica si el proyecto no está en modo prueba con simulación de escritura
 * activa. Se leen las propiedades directamente (no vía validarConfiguracion()
 * de codigo/script_refactorizado.gs), porque esa función abre la planilla
 * configurada para validar hojas técnicas — este evaluador no debe depender
 * de una función que accede a hojas de cálculo.
 */
function verificarBarrerasEvaluacionIA_() {
  var modoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA');
  var dryRun = PropertiesService.getScriptProperties().getProperty('DRY_RUN');
  if (modoPrueba !== 'true' || dryRun !== 'true') {
    throw new Error(
      'pruebas/evaluador_ia_fase8.gs: MODO_PRUEBA y DRY_RUN deben ser exactamente "true" ' +
      '(MODO_PRUEBA="' + modoPrueba + '", DRY_RUN="' + dryRun + '"). ' +
      'Este evaluador es exclusivo de la Fase 8 y se niega a ejecutarse fuera de ese entorno.'
    );
  }
}

/**
 * Configuración mínima propia, independiente de validarConfiguracion(): solo
 * los dos valores que consultarIAExtractora() necesita. Ambos se leen
 * directamente de PropertiesService; ninguno se registra en logs.
 */
function construirCfgEvaluacionIA_() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  var modelo = PropertiesService.getScriptProperties().getProperty('OPENAI_MODEL');
  if (!apiKey) throw new Error('pruebas/evaluador_ia_fase8.gs: falta OPENAI_API_KEY.');
  if (!modelo) throw new Error('pruebas/evaluador_ia_fase8.gs: falta OPENAI_MODEL.');
  return { openaiApiKey: apiKey, openaiModel: modelo };
}

/** Total de tareas en todas las observaciones de una respuesta ya validada. */
function contarTareasTotales_(datos) {
  var total = 0;
  datos.observaciones.forEach(function (obs) { total += obs.tareas.length; });
  return total;
}

/** Aplana las tareas de todas las observaciones a pares {tablero, prioridad}. */
function extraerParesTableroPrioridad_(datos) {
  var pares = [];
  datos.observaciones.forEach(function (obs) {
    obs.tareas.forEach(function (t) {
      pares.push({ tablero: t.tablero, prioridad: t.prioridad });
    });
  });
  return pares;
}

/**
 * Prioridades aceptadas para una entrada esperada: si declara
 * `prioridadesPermitidas` (arreglo), se usa tal cual; si no, se acepta
 * únicamente el valor exacto de `prioridad` (comportamiento previo, sin
 * cambios de fondo).
 */
function prioridadesAceptadas_(esperado) {
  return esperado.prioridadesPermitidas || [esperado.prioridad];
}

/**
 * Compara la lista esperada de tareas (cada una con `tablero` exacto y,
 * para la prioridad, `prioridad` exacta o `prioridadesPermitidas`) contra
 * las tareas obtenidas, como multiconjunto (sin importar el orden).
 * Devuelve las esperadas que faltan y las obtenidas que sobran — ambos
 * casos son un fallo.
 */
function compararParesTableroPrioridad_(esperados, obtenidos) {
  var restantes = obtenidos.slice();
  var faltantes = [];
  esperados.forEach(function (esperado) {
    var aceptadas = prioridadesAceptadas_(esperado);
    var idx = -1;
    for (var i = 0; i < restantes.length; i++) {
      if (restantes[i].tablero === esperado.tablero && aceptadas.indexOf(restantes[i].prioridad) !== -1) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      faltantes.push(esperado);
    } else {
      restantes.splice(idx, 1);
    }
  });
  return { faltantes: faltantes, excedentes: restantes };
}

/**
 * Compara los números de observación que deben tener tareas: [] (esperados)
 * contra los que realmente las tienen en la respuesta validada.
 */
function compararObservacionesSinTarea_(datos, numerosEsperados) {
  var numerosReales = [];
  datos.observaciones.forEach(function (obs, idx) {
    if (obs.tareas.length === 0) {
      numerosReales.push(typeof obs.numero === 'number' ? obs.numero : idx + 1);
    }
  });
  var faltantes = numerosEsperados.filter(function (n) { return numerosReales.indexOf(n) === -1; });
  var excedentes = numerosReales.filter(function (n) { return numerosEsperados.indexOf(n) === -1; });
  return { faltantes: faltantes, excedentes: excedentes };
}

/**
 * Compara la versión de prompt efectivamente usada contra la versión mínima
 * esperada por el fixture, usando el orden cronológico declarado en
 * ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL (pruebas/fixtures_evaluacion_ia_fase8.gs).
 * Una versión ausente de ese historial es un fallo explícito, nunca un PASA
 * silencioso.
 */
function compararVersionPromptMinima_(versionActual, versionMinimaEsperada) {
  var orden = ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL;
  var idxActual = orden.indexOf(versionActual);
  var idxMinima = orden.indexOf(versionMinimaEsperada);
  if (idxActual === -1) return { ok: false, categoria: 'VERSION_PROMPT_ACTUAL_DESCONOCIDA' };
  if (idxMinima === -1) return { ok: false, categoria: 'VERSION_PROMPT_MINIMA_DESCONOCIDA_EN_FIXTURE' };
  return idxActual >= idxMinima
    ? { ok: true, categoria: null }
    : { ok: false, categoria: 'VERSION_PROMPT_INFERIOR_A_LA_MINIMA' };
}

/**
 * Traduce el motivo de rechazo de validarRespuestaIA() (codigo/esquema_json.gs)
 * a una categoría fija y no sensible. Los motivos reales pueden incluir texto
 * libre generado por el modelo (por ejemplo, un rechazo del modelo o un valor
 * fuera de catálogo copiado tal cual); esta función evita que ese texto llegue
 * jamás a un log de este evaluador.
 */
function categorizarMotivoValidacion_(motivo) {
  var m = motivo || '';
  if (m.indexOf('Fallo de comunicación con la IA') === 0) return 'ERROR_COMUNICACION_IA';
  if (m.indexOf('rechazó generar una respuesta') !== -1) return 'RECHAZO_DEL_MODELO';
  if (m.indexOf('fue truncada') !== -1) return 'RESPUESTA_TRUNCADA';
  if (m.indexOf('no devolvió JSON válido') !== -1) return 'JSON_INVALIDO';
  if (m.indexOf('booleanos obligatorios') !== -1) return 'CAMPOS_BOOLEANOS_FALTANTES';
  if (m.indexOf('no es un arreglo') !== -1) return 'OBSERVACIONES_NO_ES_ARREGLO';
  if (m.indexOf('motivo_revision') !== -1) return 'INCONSISTENCIA_MOTIVO_REVISION';
  if (m.indexOf('motivo_sin_tareas') !== -1) return 'INCONSISTENCIA_MOTIVO_SIN_TAREAS';
  // Calibración del 22/07/2026 (primera ejecución real): regla C-06 inversa
  // de validarRespuestaIA() — "Ninguna observación generó tareas y no se
  // explicó el motivo". No contiene la subcadena "motivo_sin_tareas", por lo
  // que el chequeo anterior no la reconocía y caía en VALIDACION_RECHAZADA_OTRO.
  if (m.indexOf('Ninguna observación generó tareas') === 0) return 'INCONSISTENCIA_MOTIVO_SIN_TAREAS_C06';
  if (m.indexOf('estructura inválida') !== -1) return 'OBSERVACION_ESTRUCTURA_INVALIDA';
  if (m.indexOf('Resumen vacío') !== -1) return 'RESUMEN_VACIO';
  if (m.indexOf('fuera de catálogo') !== -1) return 'VALOR_FUERA_DE_CATALOGO';
  return 'VALIDACION_RECHAZADA_OTRO';
}

/**
 * Diagnóstico ESTRUCTURAL seguro de una respuesta que validarRespuestaIA()
 * rechazó: solo conteos, booleanos y presencia/ausencia de campos — nunca
 * el contenido de ningún campo de texto libre (resumen, texto_original,
 * motivo_revision, motivo_sin_tareas). Intenta un parseo propio del JSON
 * crudo únicamente para extraer esta forma segura; no reimplementa ninguna
 * regla de validación de codigo/esquema_json.gs.
 */
function diagnosticoEstructuralSeguro_(respuestaIA) {
  var diag = {
    cantidadObservaciones: null,
    cantidadTareasTotal: null,
    requiereRevision: null,
    tieneMotivoRevision: null,
    tieneMotivoSinTareas: null,
    jsonParseable: null
  };

  if (!respuestaIA || !respuestaIA.exito || typeof respuestaIA.contenidoCrudo !== 'string') {
    diag.jsonParseable = false;
    return diag;
  }

  var datos;
  try {
    datos = JSON.parse(respuestaIA.contenidoCrudo);
    diag.jsonParseable = true;
  } catch (e) {
    diag.jsonParseable = false;
    return diag;
  }

  if (typeof datos.requiere_revision === 'boolean') diag.requiereRevision = datos.requiere_revision;
  diag.tieneMotivoRevision = !!datos.motivo_revision;
  diag.tieneMotivoSinTareas = !!datos.motivo_sin_tareas;

  if (Array.isArray(datos.observaciones)) {
    diag.cantidadObservaciones = datos.observaciones.length;
    var total = 0;
    datos.observaciones.forEach(function (obs) {
      if (obs && Array.isArray(obs.tareas)) total += obs.tareas.length;
    });
    diag.cantidadTareasTotal = total;
  }

  return diag;
}

/** Formatea diagnosticoEstructuralSeguro_() en una línea compacta para el log. */
function formatearDiagnostico_(diag) {
  return 'obs=' + diag.cantidadObservaciones +
    ', tareas=' + diag.cantidadTareasTotal +
    ', requiere_revision=' + diag.requiereRevision +
    ', tiene_motivo_revision=' + diag.tieneMotivoRevision +
    ', tiene_motivo_sin_tareas=' + diag.tieneMotivoSinTareas +
    ', json_parseable=' + diag.jsonParseable;
}

/**
 * Evalúa un único fixture: llama a consultarIAExtractora() (reutilizada, no
 * duplicada), valida la respuesta con validarRespuestaIA() (idem) y compara
 * el resultado contra la expectativa declarada. Nunca lanza: cualquier
 * excepción del llamador debe tratarse por separado para no interrumpir la
 * evaluación de los fixtures siguientes.
 *
 * Corrección del 22/07/2026 (revisión independiente de la calibración
 * anterior — ver auditoria/CHANGELOG.md): la versión de prompt mínima
 * esperada se verifica como el PRIMER paso, antes de llamar a
 * consultarIAExtractora(). Si la versión no es válida, se retorna FALLA de
 * inmediato SIN llamar a OpenAI. Esto se aplica a los tres desenlaces
 * posibles (respuesta válida, rechazo seguro permitido, rechazo no
 * permitido) — antes, un rechazo seguro permitido podía aprobar sin pasar
 * por esta verificación.
 */
function evaluarFixtureIndividual_(fixture, cfg) {
  var resultado = {
    id: fixture.id,
    aprobado: false,
    motivos: [],
    tokensEntrada: null,
    tokensSalida: null,
    costoEstimado: null,
    versionPrompt: (typeof VERSION_PROMPT_SISTEMA === 'string') ? VERSION_PROMPT_SISTEMA : null,
    categoriaRechazo: null,
    diagnostico: null
  };

  var comparacionVersion = compararVersionPromptMinima_(resultado.versionPrompt, fixture.versionPromptMinimaEsperada);
  if (!comparacionVersion.ok) {
    resultado.motivos.push('versión de prompt: ' + comparacionVersion.categoria);
    return resultado; // FALLA inmediata: consultarIAExtractora() nunca se llama.
  }

  var datosCorreo = {
    asunto: fixture.asunto,
    remitente: fixture.remitente || 'sintetico@pruebas-fase8.invalid',
    cuerpo: fixture.cuerpo
  };

  var respuestaIA = consultarIAExtractora(datosCorreo, cfg);

  if (typeof respuestaIA.tokensEntrada === 'number') resultado.tokensEntrada = respuestaIA.tokensEntrada;
  if (typeof respuestaIA.tokensSalida === 'number') resultado.tokensSalida = respuestaIA.tokensSalida;
  if (typeof respuestaIA.costoEstimado === 'number') resultado.costoEstimado = respuestaIA.costoEstimado;

  var validacion = validarRespuestaIA(respuestaIA);
  if (!validacion.valida) {
    var categoria = categorizarMotivoValidacion_(validacion.motivo);
    var diag = diagnosticoEstructuralSeguro_(respuestaIA);
    resultado.categoriaRechazo = categoria;
    resultado.diagnostico = diag;

    // Calibración del 22/07/2026: algunos fixtures admiten explícitamente un
    // rechazo del validador como resultado ACEPTABLE (por ejemplo, un
    // comportamiento seguro del modelo que no cumple estrictamente el
    // esquema). Sin esta lista, cualquier rechazo sigue siendo FALLA. La
    // versión de prompt ya se verificó arriba, antes de llegar aquí.
    var categoriasSeguras = fixture.categoriasRechazoSegurasPermitidas || [];
    if (categoriasSeguras.indexOf(categoria) !== -1) {
      resultado.aprobado = true;
      return resultado;
    }

    resultado.motivos.push('validarRespuestaIA rechazó la respuesta: ' + categoria + ' [diagnóstico: ' + formatearDiagnostico_(diag) + ']');
    return resultado;
  }

  var datos = validacion.datos;

  if (datos.observaciones.length !== fixture.cantidadObservacionesEsperada) {
    resultado.motivos.push('cantidad de observaciones esperada=' + fixture.cantidadObservacionesEsperada +
      ' obtenida=' + datos.observaciones.length);
  }

  var totalTareas = contarTareasTotales_(datos);
  if (totalTareas !== fixture.cantidadTareasEsperada) {
    resultado.motivos.push('cantidad de tareas esperada=' + fixture.cantidadTareasEsperada +
      ' obtenida=' + totalTareas);
  }

  if (fixture.tareasEsperadas) {
    var comparacionTareas = compararParesTableroPrioridad_(fixture.tareasEsperadas, extraerParesTableroPrioridad_(datos));
    if (comparacionTareas.faltantes.length || comparacionTareas.excedentes.length) {
      resultado.motivos.push('clasificación tablero/prioridad no coincide — faltan: ' +
        JSON.stringify(comparacionTareas.faltantes) + '; sobran: ' + JSON.stringify(comparacionTareas.excedentes));
    }
  }

  if (fixture.observacionesSinTareaEsperadas) {
    var comparacionSinTarea = compararObservacionesSinTarea_(datos, fixture.observacionesSinTareaEsperadas);
    if (comparacionSinTarea.faltantes.length || comparacionSinTarea.excedentes.length) {
      resultado.motivos.push('observaciones con tareas:[] no coinciden — faltan (numero): ' +
        JSON.stringify(comparacionSinTarea.faltantes) + '; sobran (numero): ' + JSON.stringify(comparacionSinTarea.excedentes));
    }
  }

  if (typeof fixture.requiereRevisionEsperada === 'boolean' && datos.requiere_revision !== fixture.requiereRevisionEsperada) {
    resultado.motivos.push('requiere_revision esperado=' + fixture.requiereRevisionEsperada +
      ' obtenido=' + datos.requiere_revision);
  }

  resultado.aprobado = resultado.motivos.length === 0;
  return resultado;
}

/**
 * Función visible de la Fase 1 de automatización gradual de pruebas de IA.
 * Ejecuta FIXTURES_EVALUACION_IA_FASE8 (pruebas/fixtures_evaluacion_ia_fase8.gs)
 * y registra un resumen final. El fallo (o una excepción) de un fixture no
 * impide evaluar los siguientes.
 */
function ejecutarEvaluacionIAVisible() {
  verificarBarrerasEvaluacionIA_();

  var cfg = construirCfgEvaluacionIA_();
  var fixtures = FIXTURES_EVALUACION_IA_FASE8;

  var resultados = [];
  var aprobados = 0;
  var fallidos = 0;
  var tokensEntradaTotal = 0;
  var tokensSalidaTotal = 0;
  var costoTotal = 0;
  var costoTotalCompleto = true;

  fixtures.forEach(function (fixture) {
    var resultado;
    try {
      resultado = evaluarFixtureIndividual_(fixture, cfg);
    } catch (e) {
      // Calibración del 22/07/2026: el mensaje anterior remitía a "detalle
      // técnico" que no queda registrado en ningún otro lugar (la excepción
      // se captura aquí mismo y no se relanza). Se reemplaza por una
      // categoría fija, igual que el resto de las categorías de este archivo.
      resultado = {
        id: fixture.id,
        aprobado: false,
        motivos: ['EXCEPCION_DURANTE_EVALUACION'],
        tokensEntrada: null,
        tokensSalida: null,
        costoEstimado: null,
        versionPrompt: (typeof VERSION_PROMPT_SISTEMA === 'string') ? VERSION_PROMPT_SISTEMA : null,
        categoriaRechazo: null,
        diagnostico: null
      };
    }

    resultados.push(resultado);
    if (resultado.aprobado) { aprobados++; } else { fallidos++; }

    if (typeof resultado.tokensEntrada === 'number') tokensEntradaTotal += resultado.tokensEntrada;
    if (typeof resultado.tokensSalida === 'number') tokensSalidaTotal += resultado.tokensSalida;
    if (typeof resultado.costoEstimado === 'number') {
      costoTotal += resultado.costoEstimado;
    } else {
      costoTotalCompleto = false;
    }

    Logger.log(
      (resultado.aprobado ? '[PASA] ' : '[FALLA] ') + resultado.id +
      ' — versión de prompt: ' + resultado.versionPrompt +
      (resultado.categoriaRechazo ? ' — categoría de rechazo: ' + resultado.categoriaRechazo : '') +
      (resultado.aprobado ? '' : ' — ' + resultado.motivos.join(' | '))
    );
  });

  Logger.log('--- Resumen ejecutarEvaluacionIAVisible() ---');
  Logger.log('Total: ' + fixtures.length + ', Aprobados: ' + aprobados + ', Fallidos: ' + fallidos);
  if (fallidos > 0) {
    Logger.log('Detalle compacto de fallos:');
    resultados.forEach(function (r) {
      if (!r.aprobado) Logger.log('  - ' + r.id + ': ' + r.motivos.join(' | '));
    });
  }
  Logger.log(
    'Costo/tokens agregados (tal como los devolvió consultarIAExtractora(), sin llamadas adicionales a OpenAI): ' +
    'tokensEntrada=' + tokensEntradaTotal + ', tokensSalida=' + tokensSalidaTotal +
    ', costoEstimadoUSD=' + (costoTotalCompleto ? costoTotal.toFixed(6) : 'no disponible para todos los casos')
  );

  return { total: fixtures.length, aprobados: aprobados, fallidos: fallidos, resultados: resultados };
}
