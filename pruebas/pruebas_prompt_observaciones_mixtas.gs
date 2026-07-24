/**
 * ============================================================================
 * pruebas/pruebas_prompt_observaciones_mixtas.gs — pruebas deterministas locales
 * ============================================================================
 * Cubre INC-FASE8-010 (auditoria/CHANGELOG.md): el modelo omitió observaciones
 * informativas de un correo mixto (CP-02) en dos ejecuciones reales
 * independientes (message_id 19f8b6ac1946a47e y 19f8b7de84ba9e5b), incluso
 * después de una primera corrección basada solo en reglas de texto del
 * prompt. Ninguna prueba de este archivo puede confirmar el comportamiento
 * real del modelo (eso solo se verifica ejecutándolo contra OpenAI). Prueban,
 * de forma determinista:
 *
 * 1. Presencia y coherencia textual de las reglas en construirPromptSistema()
 *    (casos A-F, heredados de la v1 de esta corrección).
 * 2. La construcción REAL del payload que se envía a OpenAI
 *    (construirPayloadOpenAI(), codigo/cliente_openai.gs) — no un duplicado
 *    de esa lógica, sino la función de producción misma (casos G).
 * 3. Presencia y estructura del ejemplo completo de correo mixto agregado en
 *    la corrección v2 (casos H).
 * 4. El identificador de versión de prompt (casos I).
 * 5. Casos positivo y negativo de cobertura contra validarRespuestaIA()
 *    (codigo/esquema_json.gs), usando respuestas SIMULADAS del modelo (no
 *    reales) para demostrar qué detecta y qué NO detecta hoy la validación
 *    local (casos J) — el caso negativo documenta, de forma determinista y
 *    sin acceder a OpenAI, que la validación actual acepta una respuesta con
 *    cobertura incompleta sin señalarlo como error.
 *
 * INC-FASE8-011 (22/07/2026, casos L): la segunda ejecución real del
 * evaluador de IA aislado (EVAL-IA-02-INFORMATIVO) detectó que un correo
 * COMPLETAMENTE INFORMATIVO no siempre disparaba motivo_sin_tareas (regla
 * C-06 inversa). Se agregó un segundo ejemplo few-shot contrastivo en
 * construirPromptSistema() y se incrementó VERSION_PROMPT_SISTEMA a
 * v4-INC-FASE8-011-informativo-sin-tareas. Los casos L verifican: presencia
 * y estructura completa del nuevo ejemplo; que coexiste sin contradecir el
 * ejemplo MIXTO (casos H); que su JSON esperado pasa validarRespuestaIA()
 * (sin modificarla); y que la forma observada en esa ejecución real (1
 * observación, 0 tareas, sin motivo_sin_tareas) sigue siendo rechazada por
 * la regla C-06 — confirma que esta corrección no tocó validarRespuestaIA().
 *
 * No llama a GmailApp, SpreadsheetApp, UrlFetchApp ni OpenAI. No es necesario
 * copiarlo al proyecto productivo.
 */

function ejecutarPruebasPromptObservacionesMixtas() {
  var prompt = construirPromptSistema();
  var fallos = 0;
  var casos = [];

  function assert(nombre, condicion, detalle) {
    casos.push(nombre);
    if (condicion) {
      Logger.log('[PASA] ' + nombre);
    } else {
      fallos++;
      Logger.log('[FALLA] ' + nombre + (detalle ? ' — ' + detalle : ''));
    }
  }

  function contiene(regex) {
    return regex.test(prompt);
  }

  function contarCoincidencias(regex) {
    var m = prompt.match(regex);
    return m ? m.length : 0;
  }

  // ==========================================================================
  // A-F: presencia y coherencia textual de las reglas (heredado de la v1)
  // ==========================================================================

  assert(
    'A1 — El prompt instruye conservar TODAS las ideas cuando el correo tiene al menos una acción pendiente (correo mixto)',
    contiene(/al menos una acci[oó]n pendiente/i) && contiene(/mixto/i) && contiene(/conserv[aá]/i)
  );
  assert(
    'A2 — El prompt prohíbe explícitamente omitir observaciones informativas de un correo mixto',
    contiene(/nunca las omitas del\s*\n?\s*arreglo de observaciones/i)
  );
  assert(
    'A3 — El prompt instruye que las observaciones informativas de un correo mixto llevan tareas: []',
    contiene(/informativas o ya\s*\n?\s*resueltas tambi[eé]n, como observaciones con tareas: \[\]/i)
  );
  assert(
    'B1 — El prompt reserva observaciones: [] exclusivamente para el correo COMPLETO sin ninguna acción pendiente',
    contiene(/observaciones: \[\][\s\S]{0,40}usa EXCLUSIVAMENTE cuando el correo\s*\n?\s*COMPLETO no tiene ninguna acci[oó]n pendiente/i)
  );
  assert(
    'B2 — El prompt sigue exigiendo motivo_sin_tareas para el correo totalmente informativo',
    contiene(/explic[aá] por qu[eé] en motivo_sin_tareas/i)
  );
  assert(
    'C1 — El prompt aclara explícitamente que un correo MIXTO NO usa observaciones: []',
    contiene(/mezcla de ideas informativas y accionables \(MIXTO\)[\s\S]{0,20}NO se devuelve observaciones: \[\]/i)
  );
  assert(
    'C2 — La instrucción de arreglo vacío aparece una sola vez, siempre calificada por "EXCLUSIVAMENTE"/"COMPLETO"',
    contarCoincidencias(/arreglo vac[ií]o/gi) === 1 && contarCoincidencias(/observaciones: \[\]/gi) >= 2
  );
  assert(
    'D1 — El prompt instruye evaluar cada punto de una lista numerada o con viñetas como observación separada',
    contiene(/lista numerada o con vi[ñn]etas[\s\S]{0,60}observaci[oó]n separada/i)
  );
  assert(
    'E1 — El prompt mantiene la instrucción de detectar 0, 1 o varias tareas por observación',
    contiene(/detect[aá] 0, 1 o varias acciones concretas y ejecutables/i)
  );
  assert(
    'E2 — El prompt mantiene la clasificación independiente de cada tarea',
    contiene(/cada tarea se clasifica de forma independiente/i)
  );
  assert(
    'F1 — El prompt sigue listando los valores permitidos sin condiciones nuevas de conteo',
    contiene(/VALORES PERMITIDOS \(usar exactamente estos, sin variantes\)/i)
  );

  // ==========================================================================
  // G: construcción REAL del payload (construirPayloadOpenAI(), producción)
  // ==========================================================================

  var datosCorreoFalso = {
    asunto: '[PRUEBA] Asunto de ejemplo para la prueba',
    remitente: 'remitente@ejemplo.com',
    cuerpo: 'Cuerpo de ejemplo, ya enmascarado, para la prueba de construcción de payload.'
  };
  var cfgFalso = { openaiModel: 'gpt-4o-mini' };
  var payload = construirPayloadOpenAI(datosCorreoFalso, cfgFalso);

  assert(
    'G1 — El payload usa el modelo configurado en cfg',
    payload.model === 'gpt-4o-mini'
  );
  assert(
    'G2 — El payload tiene exactamente dos mensajes: system y user, en ese orden',
    Array.isArray(payload.messages) && payload.messages.length === 2 &&
    payload.messages[0].role === 'system' && payload.messages[1].role === 'user'
  );
  assert(
    'G3 — El mensaje "system" es el prompt completo devuelto por construirPromptSistema()',
    payload.messages[0].content === prompt
  );
  assert(
    'G4 — El mensaje "user" incluye el asunto, remitente y cuerpo de datosCorreo',
    payload.messages[1].content.indexOf(datosCorreoFalso.asunto) !== -1 &&
    payload.messages[1].content.indexOf(datosCorreoFalso.remitente) !== -1 &&
    payload.messages[1].content.indexOf(datosCorreoFalso.cuerpo) !== -1
  );
  assert(
    'G5 — El payload usa response_format: json_schema con el esquema real de obtenerEsquemaJsonRespuestaIA()',
    payload.response_format && payload.response_format.type === 'json_schema' &&
    payload.response_format.json_schema && payload.response_format.json_schema.name === 'clasificacion_correo_aliadata' &&
    payload.response_format.json_schema.strict === true
  );
  assert(
    'G6 — El payload declara temperature = 0.2 (documentado, sin cambios — ver INC-FASE8-010 v2, análisis de temperature)',
    payload.temperature === 0.2
  );

  // ==========================================================================
  // H: ejemplo completo de correo mixto con lista numerada (corrección v2)
  // ==========================================================================

  assert(
    'H1 — El prompt incluye la sección de ejemplo obligatorio de correo mixto con lista numerada',
    contiene(/EJEMPLO OBLIGATORIO DE REFERENCIA: CORREO MIXTO CON LISTA NUMERADA/i)
  );
  assert(
    'H2 — El ejemplo incluye un correo con exactamente 4 puntos numerados',
    contiene(/1\. El lunes se cortó la luz/i) && contiene(/2\. Hay que renovar el certificado SSL/i) &&
    contiene(/3\. El cliente XYZ solicitó/i) && contiene(/4\. Recordamos que el próximo feriado/i)
  );
  assert(
    'H3 — El JSON de ejemplo contiene exactamente 4 objetos de observación (uno por cada "numero")',
    contarCoincidencias(/"numero": [1-4],/g) === 4
  );
  assert(
    'H4 — El JSON de ejemplo muestra los puntos informativos (1 y 4) con "tareas": [] explícitamente junto a su número',
    contiene(/"numero": 1,[\s\S]{0,150}"tareas": \[\]/i) && contiene(/"numero": 4,[\s\S]{0,150}"tareas": \[\]/i)
  );
  assert(
    'H5 — El ejemplo aclara explícitamente que los puntos informativos SÍ aparecen en observaciones',
    contiene(/los puntos 1 y 4 \(informativos\) S[ÍI] aparecen en "observaciones"/i)
  );

  // ==========================================================================
  // K: la regla de cobertura N->N queda explícitamente acotada al correo MIXTO
  //    (ajuste pre-despliegue, INC-FASE8-010: una revisión independiente
  //    detectó que "SIEMPRE N observaciones... sin excepciones" no estaba
  //    acotado y podía contradecir el correo completamente informativo, la
  //    exclusión de firmas/avisos legales/publicidad, y CP-05).
  // ==========================================================================

  assert(
    'K1 — La regla de cobertura N->N está textualmente acotada, en la misma frase, a un correo MIXTO',
    contiene(/regla de cobertura EXCLUSIVAMENTE a un correo MIXTO/i)
  );
  assert(
    'K2 — El texto declara explícitamente que la cobertura N->N NO se aplica a un correo completamente informativo',
    contiene(/regla de cobertura NO se aplica a un correo\s*\n?\s*completamente informativo/i)
  );
  assert(
    'K3 — El texto declara explícitamente, en la misma frase, que la cobertura N->N no obliga a conservar firmas/avisos legales/publicidad',
    contiene(/ni obliga a conservar firmas, avisos legales o publicidad/i)
  );
  assert(
    'K4 — La exclusión general de firmas/avisos legales/publicidad de "QUÉ HACER" sigue intacta (no fue reemplazada ni debilitada)',
    contiene(/excluyendo firmas, avisos legales y publicidad/i)
  );
  assert(
    'K5 — No queda ninguna afirmación de cobertura N->N sin acotar: "SIEMPRE N observaciones" ya no aparece en el prompt',
    !contiene(/produce SIEMPRE N observaciones/i)
  );
  assert(
    'K6 — No queda ninguna afirmación de cobertura N->N sin acotar: "sin excepciones" ya no aparece en el prompt',
    !contiene(/sin excepciones/i)
  );
  assert(
    'K7 — La regla de observaciones: [] exclusiva del correo completo (B1) sigue intacta y sin contradicción del ejemplo',
    contiene(/observaciones: \[\][\s\S]{0,40}usa EXCLUSIVAMENTE cuando el correo\s*\n?\s*COMPLETO no tiene ninguna acci[oó]n pendiente/i)
  );

  // ==========================================================================
  // I: identificador de versión de prompt (no sensible)
  // ==========================================================================

  assert(
    'I1 — VERSION_PROMPT_SISTEMA está definida como un identificador corto no vacío',
    typeof VERSION_PROMPT_SISTEMA === 'string' && VERSION_PROMPT_SISTEMA.length > 0 && VERSION_PROMPT_SISTEMA.length < 80
  );
  assert(
    'I2 — VERSION_PROMPT_SISTEMA no reproduce el texto del prompt (es solo un identificador corto)',
    prompt.indexOf(VERSION_PROMPT_SISTEMA) === -1
  );

  // ==========================================================================
  // J: casos positivo y negativo de cobertura contra validarRespuestaIA()
  //    (respuestas SIMULADAS del modelo, no reales — no se llama a OpenAI)
  // ==========================================================================

  function tareaValida(resumen, tablero, prioridad, grupoOrigen, responsable) {
    return {
      resumen: resumen, tablero: tablero, prioridad: prioridad,
      grupo_origen: grupoOrigen, responsable_sugerido: responsable, fecha_limite: null
    };
  }

  // Caso positivo: 5 observaciones (coincide con el correo real de CP-02),
  // 2 de ellas informativas con tareas: [], 3 con su propia tarea.
  var respuestaCompletaSimulada = {
    exito: true,
    contenidoCrudo: JSON.stringify({
      correo_relevante: true,
      requiere_revision: false,
      motivo_revision: null,
      motivo_sin_tareas: null,
      observaciones: [
        { numero: 1, texto_original: 'El viernes tuvimos un problema con el servidor, ya se resolvió solo.', tareas: [] },
        { numero: 2, texto_original: 'Necesitamos renovar la licencia de Office antes de fin de mes.', tareas: [tareaValida('Renovar la licencia de Office', 'Gestión General', 'Alto', 'Gestión General', 'Sin asignar')] },
        { numero: 3, texto_original: 'El cliente ABC pidió una actualización del estado de su factura.', tareas: [tareaValida('Informar al cliente ABC el estado de su factura', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] },
        { numero: 4, texto_original: 'Recordatorio: la reunión de directorio fue reprogramada.', tareas: [] },
        { numero: 5, texto_original: 'Hay que preparar el informe de gastos de julio para el socio de administración.', tareas: [tareaValida('Preparar el informe de gastos de julio', 'Finanzas', 'Alto', 'Administración', 'Socio Administración')] }
      ]
    })
  };
  var validacionCompleta = validarRespuestaIA(respuestaCompletaSimulada);

  assert(
    'J1 (positivo) — Una respuesta simulada con 5 observaciones (2 con tareas: []) pasa validarRespuestaIA()',
    validacionCompleta.valida === true, JSON.stringify(validacionCompleta)
  );
  assert(
    'J2 (positivo) — La validación conserva las 5 observaciones sin descartar ninguna',
    validacionCompleta.valida === true && validacionCompleta.datos.observaciones.length === 5
  );
  assert(
    'J3 (positivo) — Las observaciones informativas conservan tareas: [] tras la validación',
    validacionCompleta.valida === true &&
    validacionCompleta.datos.observaciones[0].tareas.length === 0 &&
    validacionCompleta.datos.observaciones[3].tareas.length === 0
  );

  // Caso negativo: reproduce EXACTAMENTE el patrón de la evidencia real (solo
  // 3 observaciones, faltan los puntos 1 y 4) para demostrar, de forma
  // determinista, que validarRespuestaIA() NO detecta cobertura incompleta.
  // Este PASA es intencional: documenta una carencia conocida y aceptada
  // (INC-FASE8-010), no un defecto de esta prueba.
  var respuestaIncompletaSimulada = {
    exito: true,
    contenidoCrudo: JSON.stringify({
      correo_relevante: true,
      requiere_revision: false,
      motivo_revision: null,
      motivo_sin_tareas: null,
      observaciones: [
        { numero: 2, texto_original: 'Necesitamos renovar la licencia de Office antes de fin de mes.', tareas: [tareaValida('Renovar la licencia de Office', 'Gestión General', 'Alto', 'Gestión General', 'Sin asignar')] },
        { numero: 3, texto_original: 'El cliente ABC pidió una actualización del estado de su factura.', tareas: [tareaValida('Informar al cliente ABC el estado de su factura', 'Comercial', 'Medio', 'Ventas', 'Socio Comercial')] },
        { numero: 5, texto_original: 'Hay que preparar el informe de gastos de julio para el socio de administración.', tareas: [tareaValida('Preparar el informe de gastos de julio', 'Finanzas', 'Alto', 'Administración', 'Socio Administración')] }
      ]
    })
  };
  var validacionIncompleta = validarRespuestaIA(respuestaIncompletaSimulada);

  assert(
    'J4 (negativo, gap documentado) — Una respuesta simulada con SOLO 3 observaciones (mismo patrón que la evidencia real) TAMBIÉN pasa validarRespuestaIA() sin marcarse como error — no existe hoy una validación de cobertura por conteo',
    validacionIncompleta.valida === true && validacionIncompleta.datos.observaciones.length === 3,
    JSON.stringify(validacionIncompleta)
  );

  // ==========================================================================
  // L: INC-FASE8-011 (22/07/2026) — segundo ejemplo few-shot contrastivo para
  //    un correo COMPLETAMENTE INFORMATIVO. Cubre: presencia y estructura del
  //    ejemplo nuevo; coexistencia sin contradicción con el ejemplo MIXTO
  //    (casos H); que su JSON esperado pasa validarRespuestaIA(); y que la
  //    forma observada en la segunda corrida real del evaluador aislado
  //    (1 observación, 0 tareas, sin motivo_sin_tareas) sigue siendo
  //    rechazada por la regla C-06 — sin cambios en validarRespuestaIA().
  // ==========================================================================

  assert(
    'L1 — El prompt incluye la sección del segundo ejemplo (correo completamente informativo, en contraste con el mixto)',
    contiene(/EJEMPLO OBLIGATORIO DE REFERENCIA: CORREO COMPLETAMENTE INFORMATIVO \(CONTRASTE\)/i)
  );
  assert(
    'L2 — El segundo ejemplo incluye el correo sintético informativo (cambio de horario, sin acción)',
    contiene(/horario de atenci[oó]n al\s*\n?\s*p[uú]blico cambia de 9 a 18hs/i) && contiene(/No se requiere ninguna acci[oó]n de nadie del/i)
  );
  assert(
    'L3 — El JSON del segundo ejemplo muestra explícitamente correo_relevante=true, requiere_revision=false y motivo_revision=null',
    contiene(/"correo_relevante": true,\s*\n\s*"requiere_revision": false,\s*\n\s*"motivo_revision": null,/)
  );
  assert(
    'L4 — El JSON del segundo ejemplo muestra motivo_sin_tareas con una explicación no vacía y observaciones: []',
    contiene(/"motivo_sin_tareas": "El correo es un aviso informativo[^"]+",\s*\n\s*"observaciones": \[\]/)
  );
  assert(
    'L5 — El prompt aclara que una observación informativa con tareas: [] es exclusiva de un correo MIXTO',
    contiene(/DIFERENCIA ENTRE UNA OBSERVACIÓN INFORMATIVA Y UN CORREO INFORMATIVO/i) &&
    contiene(/corresponde ÚNICAMENTE a una idea informativa\s*\n?\s*DENTRO de un correo/i)
  );
  assert(
    'L6 — El prompt aclara que un correo completo sin ninguna acción pendiente NO crea una observación informativa suelta',
    contiene(/NO se crea ninguna\s*\n?\s*observaci[oó]n informativa: se devuelve "observaciones": \[\]/i)
  );
  assert(
    'L7 — El prompt aclara explícitamente no confundir un correo informativo con contenido ambiguo ni con publicidad/no relevante',
    contiene(/No confundas un correo informativo con contenido ambiguo/i) &&
    contiene(/ni con publicidad o contenido no relevante/i)
  );
  assert(
    'L8 — Coexistencia sin contradicción: el ejemplo MIXTO (H1) sigue presente Y el nuevo ejemplo INFORMATIVO (L1) también, en ese orden (mixto primero, informativo como contraste después)',
    (function () {
      var idxMixto = prompt.indexOf('EJEMPLO OBLIGATORIO DE REFERENCIA: CORREO MIXTO CON LISTA NUMERADA');
      var idxInformativo = prompt.indexOf('EJEMPLO OBLIGATORIO DE REFERENCIA: CORREO COMPLETAMENTE INFORMATIVO');
      return idxMixto !== -1 && idxInformativo !== -1 && idxMixto < idxInformativo;
    })()
  );
  assert(
    'L9 — La regla original de observaciones: [] exclusiva del correo completo (B1) sigue intacta, sin contradicción del nuevo ejemplo',
    contiene(/observaciones: \[\][\s\S]{0,40}usa EXCLUSIVAMENTE cuando el correo\s*\n?\s*COMPLETO no tiene ninguna acci[oó]n pendiente/i)
  );

  // El JSON exacto del segundo ejemplo (tal como aparece en el prompt) debe
  // pasar validarRespuestaIA() sin modificarla — reproduce el objeto, no lo
  // reimplementa.
  var jsonEjemploInformativo = {
    correo_relevante: true,
    requiere_revision: false,
    motivo_revision: null,
    motivo_sin_tareas: 'El correo es un aviso informativo sobre un cambio de horario ya decidido; no contiene ninguna acción pendiente para el equipo.',
    observaciones: []
  };
  var validacionEjemploInformativo = validarRespuestaIA({ exito: true, contenidoCrudo: JSON.stringify(jsonEjemploInformativo) });
  assert(
    'L10 — El JSON esperado del segundo ejemplo (correo informativo) pasa validarRespuestaIA()',
    validacionEjemploInformativo.valida === true && validacionEjemploInformativo.datos.observaciones.length === 0,
    JSON.stringify(validacionEjemploInformativo)
  );

  // Forma observada en la SEGUNDA ejecución real del evaluador aislado
  // (EVAL-IA-02-INFORMATIVO, INC-FASE8-011): 1 observación, 0 tareas, SIN
  // motivo_sin_tareas. Debe seguir siendo rechazada por la regla C-06
  // inversa — confirma que esta corrección no tocó validarRespuestaIA().
  var jsonFormaObservadaSegundaCorrida = {
    correo_relevante: true,
    requiere_revision: false,
    motivo_revision: null,
    motivo_sin_tareas: null,
    observaciones: [{ numero: 1, texto_original: 'x', tareas: [] }]
  };
  var validacionFormaObservada = validarRespuestaIA({ exito: true, contenidoCrudo: JSON.stringify(jsonFormaObservadaSegundaCorrida) });
  assert(
    'L11 — La forma observada en la segunda corrida real (1 observación, 0 tareas, sin motivo_sin_tareas) SIGUE siendo rechazada por la regla C-06 (validarRespuestaIA() sin cambios)',
    validacionFormaObservada.valida === false && /Ninguna observaci[oó]n gener[oó] tareas/i.test(validacionFormaObservada.motivo),
    JSON.stringify(validacionFormaObservada)
  );

  Logger.log('--- Resumen ---');
  Logger.log(fallos === 0
    ? 'ejecutarPruebasPromptObservacionesMixtas(): ' + casos.length + '/' + casos.length + ' verificaciones OK.'
    : 'ejecutarPruebasPromptObservacionesMixtas(): ' + fallos + ' de ' + casos.length + ' verificaciones FALLARON.');
}
