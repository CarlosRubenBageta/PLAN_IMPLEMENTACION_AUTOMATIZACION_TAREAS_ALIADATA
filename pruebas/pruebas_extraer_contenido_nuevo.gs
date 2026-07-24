/**
 * ============================================================================
 * pruebas/pruebas_extraer_contenido_nuevo.gs — pruebas deterministas locales
 * ============================================================================
 * Cubre INC-FASE8-008 (auditoria/CHANGELOG.md): el historial citado de una
 * respuesta sobrevivía a extraerContenidoNuevo() y llegaba a la IA como si
 * fuera contenido nuevo, generando tareas duplicadas (CP-19).
 *
 * Revisión 22/07/2026 (diagnóstico): una revisión independiente demostró que
 * la causa raíz documentada originalmente (que ^/$ en modo multilínea de
 * JavaScript no reconocían \r, y que el patrón anterior fallaba
 * "sistemáticamente" con cuerpos CRLF de Gmail) era técnicamente incorrecta
 * — en V8, ^/$ en modo multilínea SÍ reconocen \r como terminador de línea.
 * Ver el caso "verificarQuePatronAnteriorSiCoincideConCRLF" al final de este
 * archivo, que deja esa verificación registrada en código para no restaurar
 * el diagnóstico incorrecto. La causa razonable (no CRLF) es que los
 * marcadores anteriores no cubrían: encabezados partidos en más de una
 * línea, espacios/tabs iniciales antes de "El"/"On", y la ausencia de un
 * marcador de respaldo independiente del encabezado.
 *
 * Ajuste adicional 22/07/2026 (código): se reprodujo un caso no cubierto por
 * la corrección anterior — el encabezado partido justo antes de
 * "escribió:"/"wrote:", con el verbo solo al inicio de la segunda línea (sin
 * nombre que lo preceda en esa línea, y por lo tanto sin el espacio literal
 * que el patrón exigía). Casos O/P cubren esta variante; casos Q/R
 * confirman que la concatenación sin separador ("Juanescribió:") sigue sin
 * aceptarse como encabezado.
 *
 * Este archivo no llama a GmailApp, SpreadsheetApp ni PropertiesService —
 * solo ejercita la función pura extraerContenidoNuevo() (definida en
 * codigo/script_refactorizado.gs) con cuerpos de texto sintéticos. No es
 * necesario copiarlo al proyecto productivo. Ninguno de los textos usados
 * aquí es un cuerpo de correo real.
 */

function ejecutarPruebasExtraerContenidoNuevo() {
  var casos = [
    {
      nombre: 'A — Respuesta Gmail en español, encabezado en una sola línea (LF)',
      cuerpo: 'Texto nuevo\n\nEl mar, 21 jul 2026, Juan Pérez <juan@ejemplo.com> escribió:\n> contenido anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'B — Encabezado citado bajo un prefijo ">" (nested reply)',
      cuerpo: 'Texto nuevo\n> El mar, 21 jul 2026, Juan Pérez <juan@ejemplo.com> escribió:\n> contenido anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'C — Variante CRLF (cuerpo crudo de Gmail, mensaje.getPlainBody())',
      cuerpo: 'Texto nuevo\r\n\r\nEl mar, 21 jul 2026, Juan Pérez <juan@ejemplo.com> escribió:\r\n> contenido anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'D — Variante Gmail en inglés, encabezado en una sola línea (LF)',
      cuerpo: 'New text\n\nOn Tue, Jul 21, 2026, Jane Doe <jane@example.com> wrote:\n> previous content',
      esperadoExacto: 'New text'
    },
    {
      nombre: 'E — Texto legítimo con "escribió" sin dos puntos al final de línea (no debe cortarse)',
      cuerpo: 'El responsable escribió el informe y debe enviarlo hoy.',
      esperadoExacto: 'El responsable escribió el informe y debe enviarlo hoy.'
    },
    {
      nombre: 'F — Regresión exacta de CP-19 (datos sintéticos equivalentes, CRLF)',
      cuerpo: 'Además, avisen al cliente que el contrato actualizado ya está disponible y envíenle una copia hoy.\r\n\r\n' +
        'El vie, 21 jul 2026 a las 22:05, Carlos Rubén Bageta <tareas@alia-data.com> escribió:\r\n' +
        '> Además, necesitamos una copia firmada para el lunes.',
      esperadoExacto: 'Además, avisen al cliente que el contrato actualizado ya está disponible y envíenle una copia hoy.'
    },
    {
      nombre: 'G — Encabezado español partido en dos líneas, remitente y verbo juntos en la segunda',
      cuerpo: 'Texto nuevo\n\nEl vie, 21 jul 2026 a las 22:05,\nCarlos Rubén Bageta <tareas@alia-data.com> escribió:\n> cita anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'H — Encabezado inglés partido en dos líneas, remitente y verbo juntos en la segunda',
      cuerpo: 'New text\n\nOn Tue, Jul 21, 2026 at 22:05,\nJane Doe <jane@example.com> wrote:\n> previous',
      esperadoExacto: 'New text'
    },
    {
      nombre: 'I — Espacios iniciales antes de "El" (encabezado con sangría)',
      cuerpo: 'Texto nuevo\n\n   El mar, 21 jul 2026, Juan escribió:\n> anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'J — Espacios iniciales antes de "On" (encabezado con sangría, inglés)',
      cuerpo: 'New text\n\n   On Tue, Jul 21, 2026, Jane wrote:\n> previous',
      esperadoExacto: 'New text'
    },
    {
      nombre: 'K — Espacios/tabs finales después de "escribió:"',
      cuerpo: 'Texto nuevo\n\nEl mar, 21 jul 2026, Juan escribió:   \n> anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'L — Línea citada con espacios antes de ">" (sin encabezado reconocible antes)',
      cuerpo: 'Texto nuevo\n   > cita anterior sin encabezado reconocible',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'M — Texto legítimo de varias líneas que empieza con "El " pero NO es un encabezado de cita ' +
        '("escribió:" aparece dos líneas después de "El " — no debe atravesar líneas arbitrarias)',
      cuerpo: 'El resumen del proyecto continúa a continuación.\n' +
        'Aquí se detallan los puntos pendientes para revisión.\n' +
        'Nuestro compañero Pérez escribió:',
      esperadoExacto: 'El resumen del proyecto continúa a continuación.\n' +
        'Aquí se detallan los puntos pendientes para revisión.\n' +
        'Nuestro compañero Pérez escribió:'
    },
    {
      nombre: 'N — Texto legítimo con "2 > 1" en mitad de una línea (no es un prefijo de cita)',
      cuerpo: 'Necesitamos que el resultado final sea 2 > 1 en la comparación de este trimestre.',
      esperadoExacto: 'Necesitamos que el resultado final sea 2 > 1 en la comparación de este trimestre.'
    },
    {
      nombre: 'O — Encabezado español partido en dos líneas, con el verbo SOLO al inicio de la segunda ' +
        '(caso reproducido en la revisión del 22/07/2026)',
      cuerpo: 'Texto nuevo\n\nEl mar, 21 jul 2026, Juan Pérez\nescribió:\n> contenido anterior',
      esperadoExacto: 'Texto nuevo'
    },
    {
      nombre: 'P — Encabezado inglés partido en dos líneas, con el verbo SOLO al inicio de la segunda ' +
        '(equivalente inglés del caso O)',
      cuerpo: 'New text\n\nOn Tue, Jul 21, 2026, Jane Doe\nwrote:\n> previous content',
      esperadoExacto: 'New text'
    },
    {
      nombre: 'Q — Negativo: "Juanescribió:" concatenado sin espacio ni salto de línea NO debe reconocerse como encabezado',
      cuerpo: 'El remitente Juanescribió:',
      esperadoExacto: 'El remitente Juanescribió:'
    },
    {
      nombre: 'R — Negativo: equivalente inglés de Q ("Janewrote:" concatenado) NO debe reconocerse como encabezado',
      cuerpo: 'On remitente Janewrote:',
      esperadoExacto: 'On remitente Janewrote:'
    }
  ];

  var fallosFuncionales = 0;

  casos.forEach(function (caso) {
    var resultado = extraerContenidoNuevo(caso.cuerpo);
    if (resultado === caso.esperadoExacto) {
      Logger.log('[PASA] ' + caso.nombre);
    } else {
      fallosFuncionales++;
      Logger.log('[FALLA] ' + caso.nombre +
        ' — esperado: "' + caso.esperadoExacto + '"' +
        ' — obtenido: "' + resultado + '"');
    }
  });

  // Verificación de prevención de regresión del diagnóstico (INC-FASE8-008,
  // revisión 22/07/2026): esto NO prueba extraerContenidoNuevo(); prueba el
  // patrón original tal como existía antes de la corrección, para dejar
  // registrado en código que SÍ coincidía con un encabezado CRLF simple, y
  // así evitar que un futuro diagnóstico vuelva a atribuir el fallo al CRLF
  // sin verificarlo primero.
  var fallosDiagnostico = 0;
  var patronOriginal = /^El .* escribió:$/m;
  var cuerpoCrlfSimple = 'El mar, 21 jul 2026, Juan escribió:\r\n> anterior';
  if (patronOriginal.test(cuerpoCrlfSimple)) {
    Logger.log('[PASA] Nota de diagnóstico — el patrón original SÍ coincide con un encabezado CRLF simple (confirma que el CRLF no era la causa raíz).');
  } else {
    fallosDiagnostico++;
    Logger.log('[FALLA] Nota de diagnóstico — se esperaba que el patrón original coincidiera con un encabezado CRLF simple; si esto falla, revisar el motor de JavaScript en uso antes de reabrir la hipótesis de CRLF.');
  }

  var totalCasos = casos.length + 1;
  var totalFallos = fallosFuncionales + fallosDiagnostico;

  Logger.log('--- Resumen ---');
  Logger.log('Casos funcionales de extraerContenidoNuevo(): ' + (casos.length - fallosFuncionales) + '/' + casos.length + ' OK.');
  Logger.log('Verificación adicional del patrón antiguo con CRLF: ' + (1 - fallosDiagnostico) + '/1 OK.');
  Logger.log('Total general de verificaciones: ' + (totalCasos - totalFallos) + '/' + totalCasos + ' OK.');
}
