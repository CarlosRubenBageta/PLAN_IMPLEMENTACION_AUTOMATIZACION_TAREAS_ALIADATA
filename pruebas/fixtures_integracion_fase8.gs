/**
 * ============================================================================
 * pruebas/fixtures_integracion_fase8.gs
 * EXCLUSIVO DEL PROYECTO DE PRUEBA / NO DESPLEGAR
 * ============================================================================
 * Fase 2A (MVP) del automatizador de integración de Fase 8 (ver
 * auditoria/CHANGELOG.md, entrada "Fase 2A MVP: automatizador de integración
 * de Fase 8"). Declara los casos sintéticos de integración de punta a punta
 * que ejecuta pruebas/automatizador_integracion_fase8.gs.
 *
 * A diferencia de pruebas/fixtures_evaluacion_ia_fase8.gs (que solo ejercita
 * la IA de forma aislada), estos fixtures describen un correo real que el
 * tester debe ENVIAR manualmente desde la cuenta externa indicada, para que
 * el pipeline completo (Gmail -> IA -> Sheets -> Gmail) lo procese en el
 * proyecto de Apps Script de prueba. El envío automático desde la cuenta
 * externa corresponderá a Fase 3; en Fase 2A el envío es manual.
 *
 * Ningún texto de este archivo corresponde a un correo real de Aliadata: son
 * escenarios sintéticos. El piloto es equivalente a CP-05 (correo
 * completamente informativo) pero NO reutiliza su message_id ni modifica el
 * estado documental de CP-05: cada corrida genera su propio marcador y, al
 * enviarse, un message_id nuevo.
 *
 * Este archivo NUNCA debe copiarse al proyecto de Apps Script productivo.
 * ============================================================================
 */

/**
 * Orden cronológico ascendente de versiones de VERSION_PROMPT_SISTEMA
 * conocidas por el automatizador de integración. AUTOCONTENIDO: no depende de
 * pruebas/fixtures_evaluacion_ia_fase8.gs (evaluador IA opcional). El
 * automatizador compara VERSION_PROMPT_SISTEMA (de codigo/prompts_ia.gs, que
 * ya es dependencia del pipeline) contra la versión mínima del fixture usando
 * este orden. Una versión ausente de esta lista se trata como desconocida y
 * aborta (fail-closed), nunca como aceptada.
 *
 * Mantenimiento: agregar al FINAL cada nuevo identificador de
 * VERSION_PROMPT_SISTEMA cuando codigo/prompts_ia.gs cambie de versión.
 */
var ORDEN_VERSIONES_PROMPT_INTEGRACION = [
  'v3-INC-FASE8-010-ejemplo-cobertura',
  'v4-INC-FASE8-011-informativo-sin-tareas'
];

/**
 * Catálogo de casos de integración. Cada fixture declara:
 * - id: identificador corto no sensible (se registra en logs).
 * - descripcion: para el tester (no se registra en logs de ejecución).
 * - remitentePermitido: la ÚNICA dirección desde la que se admite el envío de
 *   este caso (el automatizador la verifica contra el remitente real del
 *   mensaje encontrado). Para el piloto: sichar@gmail.com.
 * - asuntoBase: prefijo del asunto; el automatizador le agrega un marcador
 *   único por corrida para poder localizar exactamente ese mensaje.
 * - cuerpo: cuerpo sintético que el tester debe pegar al enviar el correo.
 * - versionPromptMinima: versión mínima de VERSION_PROMPT_SISTEMA esperada
 *   (histórico en pruebas/fixtures_evaluacion_ia_fase8.gs,
 *   ORDEN_VERSIONES_PROMPT_CONOCIDAS_EVAL).
 * - esperado: forma exacta del resultado tras la ejecución formal, expresada
 *   por NOMBRE de campo/etiqueta (nunca por número de columna). El
 *   automatizador compara contra esto.
 * - esperado.tareasEsperadas (opcional): arreglo de {tablero}, uno por tarea
 *   esperada en Registro Tareas (multiset, sin importar el orden). Cuando
 *   está presente y no vacío, activa la verificación multi-tarea de
 *   verificarResultadoFormal_() (task_id no vacío/distinto, estado_escritura
 *   ESCRITA, tableros exactos, observacion_texto_original no vacío e
 *   idéntico entre las tareas del mismo mensaje, Indice Idempotencia con un
 *   task_id por tarea, y una fila nueva por tarea en la hoja de negocio
 *   correspondiente, vinculada por la columna "ID"). Cuando está ausente
 *   (como en INT-FASE8-01-INFORMATIVO), se exige 0 tareas y las cinco hojas
 *   de negocio idénticas al baseline, igual que antes de esta ampliación.
 */
var FIXTURES_INTEGRACION_FASE8 = [
  {
    id: 'INT-FASE8-01-INFORMATIVO',
    descripcion: 'Piloto equivalente a CP-05: correo completamente informativo, sin ninguna acción pendiente. Debe resultar SIN_TAREAS con observaciones: [].',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Aviso informativo de cambio de horario',
    cuerpo: [
      'Hola, les comparto un aviso exclusivamente informativo para el equipo de la sede de prueba.',
      '',
      'A partir del proximo mes, el horario de atencion al publico de la sede de prueba pasa a ser de 9 a 18 horas.',
      'No se requiere ninguna accion de nadie del equipo; es solo para que esten al tanto del cambio ya decidido.',
      '',
      'Gracias.'
    ].join('\n'),
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'SIN_TAREAS',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 0,
      cantidad_tareas: 0,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // La columna "error" contiene motivo_sin_tareas (comportamiento vigente
      // e intencional de finalizarMensajeSinTareas()); el automatizador solo
      // comprueba que NO esté vacía, sin registrar su texto.
      errorNoVacio: true,
      // Registro Tareas: ninguna fila para el message_id.
      filasRegistroTareas: 0,
      // Indice Idempotencia: exactamente una entrada, task_id vacío.
      entradasIndiceIdempotencia: 1,
      taskIdIndiceVacio: true,
      estadoFinalIndice: 'SIN_TAREAS',
      // Gmail: etiquetas por clave interna (el automatizador resuelve la clave
      // al ID configurado y valida el ID<->nombre por separado).
      claveEtiquetaEsperada: 'RevisionSinTareas',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['Procesado', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-02-DOS-TAREAS',
    descripcion: 'Equivalente a CP-03: una única observación con dos acciones concretas (revisar un error técnico y avisar al cliente), que deben generar dos tareas en tableros distintos a partir del mismo texto_original.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Error de facturación del cliente',
    // Redacción ajustada dos veces (24/07/2026, ver auditoria/CHANGELOG.md):
    // (1) runId=3b2883e9-5f26-4269-a3c1-1cbe4d14a7ed — dejaba implícito quién
    // debía avisar al cliente, y el modelo clasificó esa acción como
    // "Soporte" en lugar de "Comercial"; se agregó la mención explícita al
    // "equipo comercial". (2) messageId=19f95060d93922fb — con esa mención ya
    // corregida, la estructura de dos pedidos paralelos ("Hay que X y
    // coordinar Y") se clasificó como 2 observaciones en lugar de 1. Ahora el
    // error de facturación se ancla como UN ÚNICO tema del que se desprenden
    // las dos acciones, en vez de presentarlas como dos pedidos
    // independientes; conserva la mención a "equipo comercial".
    cuerpo: 'El error de facturación del cliente todavía no fue resuelto: hace falta que el equipo técnico lo revise y que, apenas quede resuelto, el equipo comercial le avise al cliente.',
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'PROCESADO',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 1,
      cantidad_tareas: 2,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // Registro Tareas: exactamente 2 filas, una por tablero, mismo texto_original.
      filasRegistroTareas: 2,
      tareasEsperadas: [
        { tablero: 'Desarrollo IT' },
        { tablero: 'Comercial' }
      ],
      // Indice Idempotencia: una entrada por task_id del manifiesto, todas PROCESADO.
      entradasIndiceIdempotencia: 2,
      estadoFinalIndice: 'PROCESADO',
      // Gmail: recibe Procesado; ninguna etiqueta de revisión/error.
      claveEtiquetaEsperada: 'Procesado',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['RevisionSinTareas', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-04-TRES-TAREAS',
    descripcion: 'Equivalente a CP-04: una única observación con tres acciones concretas (revisar un error técnico, procesar una devolución y confirmarle al cliente), que deben generar tres tareas en tableros distintos (Desarrollo IT, Finanzas, Comercial) a partir del mismo texto_original.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Cobro duplicado a un cliente',
    // Redacción ajustada (24/07/2026, ver auditoria/CHANGELOG.md,
    // messageId=19f95a4113a1fb97): la primera versión abría con una cláusula
    // de encuadre separada ("...todavía no está resuelto:") que el modelo
    // aparentemente extrajo como su propia observación informativa, además de
    // las 3 accionables (4 observaciones en vez de 1). Ahora el encuadre y las
    // tres acciones son una única instrucción imperativa continua ("Hay que
    // resolver..."), sin ninguna cláusula separable como afirmación
    // informativa. Conserva las menciones explícitas a "Finanzas" y "equipo
    // comercial" — los dos tableros con riesgo real de ambigüedad; la primera
    // acción no necesita nombrar el equipo explícitamente: su naturaleza
    // técnica ya la clasifica en Desarrollo IT (criterio existente para
    // distinguir Soporte de Desarrollo IT, codigo/prompts_ia.gs).
    cuerpo: 'Hay que resolver el cobro duplicado que sufrió un cliente: revisar técnicamente el error de facturación, procesar en el área de Finanzas la devolución del monto cobrado de más, y que el equipo comercial le confirme al cliente cuando quede solucionado.',
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'PROCESADO',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 1,
      cantidad_tareas: 3,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // Registro Tareas: exactamente 3 filas, una por tablero, mismo texto_original.
      filasRegistroTareas: 3,
      tareasEsperadas: [
        { tablero: 'Desarrollo IT' },
        { tablero: 'Finanzas' },
        { tablero: 'Comercial' }
      ],
      // Indice Idempotencia: una entrada por task_id del manifiesto, todas PROCESADO.
      entradasIndiceIdempotencia: 3,
      estadoFinalIndice: 'PROCESADO',
      // Gmail: recibe Procesado; ninguna etiqueta de revisión/error.
      claveEtiquetaEsperada: 'Procesado',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['RevisionSinTareas', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-05-OBSERVACIONES-DUPLICADAS',
    descripcion: 'Equivalente a CP-15: el mismo pedido repetido dos veces con distinta redacción en el cuerpo, sin ningún marcador de cita/respuesta, debe consolidarse (RF-04) en una única tarea en vez de generar dos filas duplicadas.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Pedido repetido',
    // El enunciado original de CP-15/CASOS_DE_PRUEBA.md repite el pedido dentro
    // de un bloque citado tipo respuesta ("El [fecha], [nombre] escribió:\n>
    // [texto]"). Ese patrón coincide con uno de los marcadores de corte de
    // extraerContenidoNuevo() (codigo/script_refactorizado.gs) y se recortaría
    // ANTES de llegar a la IA, probando el recorte de citas (ya cubierto por
    // 19/19 pruebas locales en pruebas/pruebas_extraer_contenido_nuevo.gs), no
    // la consolidación de RF-04. Por eso este cuerpo repite el pedido sin
    // ningún marcador de cita, para que el texto completo llegue a la IA y
    // ejercite específicamente RF-04 ("Si dos observaciones distintas piden
    // exactamente la misma acción, consolidalas en una sola tarea", codigo/prompts_ia.gs).
    cuerpo: 'Necesitamos el informe de gastos de julio antes del viernes. Como te comentaba antes: necesitamos el informe de gastos de julio antes del viernes.',
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'PROCESADO',
      etapa: 'FINALIZADO',
      // Ambigüedad reconocida (ver auditoria/CHANGELOG.md): el prompt no trae
      // un ejemplo few-shot de consolidación. Se asume que "consolidar" implica
      // también unificar la observación (no solo la tarea) — si la corrida
      // real muestra 2 observaciones con 1 tarea combinada, se documentará
      // como hallazgo y se ajustará este valor.
      cantidad_observaciones: 1,
      cantidad_tareas: 1,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // Registro Tareas: exactamente 1 fila — primera prueba de la
      // generalización N-tareas de verificarResultadoFormal_()/
      // verificarClasificacionSimulada_() en N=1 (ya probada en N=2 y N=3).
      filasRegistroTareas: 1,
      tareasEsperadas: [
        { tablero: 'Finanzas' }
      ],
      // Indice Idempotencia: una entrada por task_id del manifiesto, todas PROCESADO.
      entradasIndiceIdempotencia: 1,
      estadoFinalIndice: 'PROCESADO',
      // Gmail: recibe Procesado; ninguna etiqueta de revisión/error.
      claveEtiquetaEsperada: 'Procesado',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['RevisionSinTareas', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-06-FIRMA-EXTENSA',
    descripcion: 'Equivalente a CP-14: una consulta real breve seguida de una firma de correo y un aviso legal extenso, debe generar una única tarea a partir de la consulta, sin fabricar ninguna tarea desde el texto de la firma/aviso legal.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Consulta rápida',
    // A diferencia de los fixtures anteriores (un único párrafo continuo), este
    // cuerpo usa múltiples párrafos con saltos de línea reales: la consulta,
    // una línea en blanco, y la firma/aviso legal. El prompt real (codigo/
    // prompts_ia.gs) ya instruye explícitamente: "Identificá TODAS las
    // observaciones del correo... excluyendo firmas, avisos legales y
    // publicidad" — este fixture es la primera prueba real de esa regla en
    // este automatizador. Las líneas de la firma se mantienen cortas para
    // minimizar el riesgo de que Gmail las re-envuelva de forma impredecible
    // al enviarlas (mismo mecanismo de canonicalización de transporte ya
    // probado con el piloto CP-05, pero nunca sobre un bloque tan largo).
    // La consulta se ancla explícitamente como reunión INTERNA para que el
    // tablero esperado (Gestión General) no sea ambiguo con Comercial.
    cuerpo: [
      '¿Podemos confirmar la reunión interna de mañana a las 15hs para revisar el estado general del equipo?',
      '',
      '--',
      'Juan Pérez',
      'Gerente de Cuentas | Aliadata',
      'Tel: +54 9 261 555-5555',
      'Este mensaje es confidencial y está dirigido a su destinatario.',
      'Si no es el destinatario, notifique al remitente y elimínelo.',
      'Las opiniones expresadas son del autor, no de Aliadata.',
      'Por favor considere el impacto ambiental antes de imprimir.',
      'Aliadata no garantiza que este mensaje esté libre de virus.',
      'El uso indebido de esta comunicación puede ser ilegal.',
      'Este correo puede ser monitoreado con fines de calidad.',
      'Aliadata S.A. — Mendoza, Argentina.',
      'CUIT 30-12345678-9.',
      'www.alia-data.com',
      'No responda si el mensaje llegó por error.'
    ].join('\n'),
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'PROCESADO',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 1,
      cantidad_tareas: 1,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // Registro Tareas: exactamente 1 fila (misma generalización N=1 de CP-15).
      filasRegistroTareas: 1,
      tareasEsperadas: [
        { tablero: 'Gestión General' }
      ],
      // Indice Idempotencia: una entrada por task_id del manifiesto, todas PROCESADO.
      entradasIndiceIdempotencia: 1,
      estadoFinalIndice: 'PROCESADO',
      // Gmail: recibe Procesado; ninguna etiqueta de revisión/error.
      claveEtiquetaEsperada: 'Procesado',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['RevisionSinTareas', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-07-CUERPO-VACIO',
    descripcion: 'Equivalente a CP-16 (reutiliza el escenario FC-07, pruebas/CASOS_CORREOS_NO_OPERATIVOS.md): una respuesta que solo contiene una cita, sin ningún texto propio antes. Tras extraerContenidoNuevo() el contenido queda vacío, y evaluarFiltroDeterministico() debe rechazarlo (RevisionSinTareas) ANTES de llegar a la IA.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] RE: Reunión de mañana',
    // Único fixture cuyo cuerpo es ÚNICAMENTE un bloque de cita (sin ningún
    // texto propio antes): extraerContenidoNuevo() (codigo/script_refactorizado.gs)
    // recorta desde el inicio del marcador "El [fecha], [nombre] escribió:",
    // dejando el contenido nuevo vacío. evaluarFiltroDeterministico()
    // (codigo/filtros_correo.gs, regla 6) rechaza el mensaje por cuerpo vacío
    // ANTES de llegar a la IA — a diferencia de todos los fixtures anteriores,
    // este NO hace ninguna llamada real a OpenAI.
    cuerpo: [
      'El lun, 21 jul 2026, Juan escribió:',
      '> Confirmamos la reunión de mañana a las 15hs, ¿les parece?'
    ].join('\n'),
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado). Misma forma que
      // INT-FASE8-01-INFORMATIVO (0 tareas, sin tareasEsperadas): ambos son
      // casos "SIN_TAREAS", aunque este llega por el filtro determinístico,
      // no por decisión de la IA.
      estado: 'SIN_TAREAS',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 0,
      cantidad_tareas: 0,
      // Clasificación simulada (DRY_RUN) real: procesarUnMensajeSimulado()
      // devuelve resultado='NO_ELEGIBLE' con cantidadObservaciones/cantidadTareas
      // en null (nunca 0) cuando el filtro determinístico rechaza el mensaje
      // ANTES de la IA — distinto de un SIN_TAREAS clasificado por la IA.
      // verificarClasificacionSimulada_() usa este campo para verificar esa
      // forma exacta en vez de comparar cantidad_observaciones/cantidad_tareas
      // (que arriba siguen en 0 porque esos SÍ son los valores correctos para
      // la fila real de Log Mensajes, comparada por verificarResultadoFormal_()).
      resultadoSimulado: 'NO_ELEGIBLE',
      resultado_gmail: 'SOLO_ETIQUETADO',
      // La columna "error" contiene el motivo del filtro determinístico
      // ("Cuerpo vacío tras extraer contenido nuevo..."); el automatizador
      // solo comprueba que NO esté vacía, sin registrar su texto.
      errorNoVacio: true,
      // Registro Tareas: ninguna fila para el message_id.
      filasRegistroTareas: 0,
      // Indice Idempotencia: exactamente una entrada, task_id vacío.
      entradasIndiceIdempotencia: 1,
      taskIdIndiceVacio: true,
      estadoFinalIndice: 'SIN_TAREAS',
      // Gmail: etiquetas por clave interna.
      claveEtiquetaEsperada: 'RevisionSinTareas',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['Procesado', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-08-FECHA-LIMITE-EXPLICITA',
    descripcion: 'Equivalente a CP-17 (reutiliza PE-04, pruebas/PRUEBAS_ESCRITURA.md): una tarea con fecha límite explícita en el cuerpo. Verifica que construirFechaLocal() (codigo/escritura_sheets.gs) escriba la fecha correcta en la columna "Fecha límite" de la hoja de negocio, sin el corrimiento de un día documentado en documentacion/MAPA_ESCRITURA.md, sección 2.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Confirmación de pedido con fecha límite',
    // Fecha explícita y concreta (31 de julio de 2026), NO una referencia
    // relativa de día ("antes del viernes"): el prompt real (codigo/prompts_ia.gs)
    // trae un ejemplo few-shot donde "antes del viernes" se clasifica con
    // fecha_limite: null (una referencia relativa no cuenta como fecha
    // explícita) — usar esa redacción habría probado el camino null (CP-18),
    // no el de fecha explícita que busca CP-17.
    cuerpo: 'Necesitamos que el equipo comercial confirme el pedido del cliente antes del 31 de julio de 2026.',
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'PROCESADO',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 1,
      cantidad_tareas: 1,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // Registro Tareas: exactamente 1 fila.
      filasRegistroTareas: 1,
      tareasEsperadas: [
        { tablero: 'Comercial' }
      ],
      // Fecha límite esperada en la columna "Fecha límite" de la hoja de
      // negocio (ISO 8601, año-mes-día) — verificarResultadoFormal_() la
      // compara por componentes de fecha local (no por fecha completa con
      // hora), sin usar Utilities.formatDate() en la propia comparación.
      fechaLimiteEsperada: '2026-07-31',
      // Indice Idempotencia: una entrada por task_id del manifiesto, todas PROCESADO.
      entradasIndiceIdempotencia: 1,
      estadoFinalIndice: 'PROCESADO',
      // Gmail: recibe Procesado; ninguna etiqueta de revisión/error.
      claveEtiquetaEsperada: 'Procesado',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['RevisionSinTareas', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-09-FECHA-LIMITE-NO-EXPLICITA',
    descripcion: 'Equivalente a CP-18 (reutiliza PE-05, pruebas/PRUEBAS_ESCRITURA.md): complemento exacto de CP-17 — una tarea SIN ninguna fecha mencionada en el cuerpo. Verifica que la columna "Fecha límite" quede vacía (no 0, no la cadena "null", no una fecha por defecto).',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Actualización de la lista de precios',
    // Sin ninguna fecha, ni siquiera relativa: a diferencia de CP-17, este
    // cuerpo no da ninguna pista temporal, para que fecha_limite quede en
    // null sin ambigüedad.
    cuerpo: 'Hay que actualizar la lista de precios que aparece en la sección de productos del sitio web.',
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado).
      estado: 'PROCESADO',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 1,
      cantidad_tareas: 1,
      resultado_gmail: 'SOLO_ETIQUETADO',
      // Registro Tareas: exactamente 1 fila.
      filasRegistroTareas: 1,
      tareasEsperadas: [
        { tablero: 'Desarrollo IT' }
      ],
      // Sin fecha límite: la columna debe quedar vacía (sección 7.3).
      fechaLimiteEsperada: null,
      // Indice Idempotencia: una entrada por task_id del manifiesto, todas PROCESADO.
      entradasIndiceIdempotencia: 1,
      estadoFinalIndice: 'PROCESADO',
      // Gmail: recibe Procesado; ninguna etiqueta de revisión/error.
      claveEtiquetaEsperada: 'Procesado',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['RevisionSinTareas', 'RevisionErrorProcesamiento', 'RevisionErrorAutomatizacion']
    }
  },
  {
    id: 'INT-FASE8-10-ERROR-AUTOMATIZACION-APPS-SCRIPT',
    descripcion: 'Equivalente a CP-07 (reutiliza FC-01, pruebas/CASOS_CORREOS_NO_OPERATIVOS.md): un correo cuyo asunto coincide con la regla obligatoria de notificaciones de fallos de Apps Script (regla 1 de evaluarFiltroDeterministico(), codigo/filtros_correo.gs). A diferencia de CP-16 (mismo mecanismo de filtro, pero claveEtiqueta=RevisionSinTareas), este caso debe recibir RevisionErrorAutomatizacion — una etiqueta DISTINTA — y tampoco debe hacer ninguna llamada real a OpenAI.',
    remitentePermitido: 'sichar@gmail.com',
    asuntoBase: '[PRUEBA-AUTOMATIZACION][INTEGRACION] Summary of failures for Google Apps Script',
    // El asunto (no el remitente) dispara la regla 1 de evaluarFiltroDeterministico()
    // (codigo/filtros_correo.gs): coincidencia de subcadena con
    // ASUNTO_FALLOS_APPS_SCRIPT = 'Summary of failures for Google Apps Script'.
    // Se elige el asunto en vez del remitente porque el remitente exigido por
    // la regla (noreply-apps-scripts-notifications@google.com) no es una
    // dirección que el tester pueda enviar realmente — el asunto sí permite
    // probar esta regla con un correo normal desde sichar@gmail.com (a
    // diferencia de CP-06, diferido por este mismo motivo).
    cuerpo: 'Your script "procesarCorreosDeTareas" has failed 3 times in the last 24 hours. Execution failed: Exception: Servicio de Gmail no disponible temporalmente.',
    versionPromptMinima: 'v4-INC-FASE8-011-informativo-sin-tareas',
    esperado: {
      // Log Mensajes (por nombre de encabezado). Misma forma que
      // INT-FASE8-07-CUERPO-VACIO (0 tareas, sin tareasEsperadas): ambos
      // llegan por el filtro determinístico, no por decisión de la IA —
      // solo cambia la etiqueta de Gmail resultante.
      estado: 'SIN_TAREAS',
      etapa: 'FINALIZADO',
      cantidad_observaciones: 0,
      cantidad_tareas: 0,
      // Clasificación simulada (DRY_RUN) real: igual que INT-FASE8-07, el
      // filtro determinístico rechaza el mensaje antes de la IA, por lo que
      // procesarUnMensajeSimulado() devuelve resultado='NO_ELEGIBLE' con
      // cantidades en null (ver verificarClasificacionSimulada_()).
      resultadoSimulado: 'NO_ELEGIBLE',
      resultado_gmail: 'SOLO_ETIQUETADO',
      // La columna "error" contiene el motivo del filtro determinístico; el
      // automatizador solo comprueba que NO esté vacía, sin registrar su texto.
      errorNoVacio: true,
      // Registro Tareas: ninguna fila para el message_id.
      filasRegistroTareas: 0,
      // Indice Idempotencia: exactamente una entrada, task_id vacío.
      entradasIndiceIdempotencia: 1,
      taskIdIndiceVacio: true,
      estadoFinalIndice: 'SIN_TAREAS',
      // Gmail: a diferencia de INT-FASE8-07 (RevisionSinTareas), este caso
      // recibe la etiqueta de error de automatización.
      claveEtiquetaEsperada: 'RevisionErrorAutomatizacion',
      conservaEtiquetaPrueba: true,
      conservaInbox: true,
      noArchivar: true,
      clavesEtiquetaProhibidas: ['Procesado', 'RevisionSinTareas', 'RevisionErrorProcesamiento']
    }
  }
];

/** Devuelve el fixture de integración por id, o null si no existe. */
function obtenerFixtureIntegracion_(id) {
  for (var i = 0; i < FIXTURES_INTEGRACION_FASE8.length; i++) {
    if (FIXTURES_INTEGRACION_FASE8[i].id === id) return FIXTURES_INTEGRACION_FASE8[i];
  }
  return null;
}

/** Id del fixture por defecto cuando la propiedad AUTO_FASE8_CASO no está definida. */
var FIXTURE_INTEGRACION_POR_DEFECTO = 'INT-FASE8-01-INFORMATIVO';
