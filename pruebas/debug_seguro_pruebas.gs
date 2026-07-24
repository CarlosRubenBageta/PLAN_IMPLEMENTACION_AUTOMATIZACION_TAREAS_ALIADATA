/**
 * ============================================================================
 * pruebas/debug_seguro_pruebas.gs — EXCLUSIVO DEL PROYECTO DE PRUEBA (FASE 8)
 * ============================================================================
 * NO DESPLEGAR. NO ES PARTE DEL SCRIPT DEFINITIVO. EXCLUIDO EXPLÍCITAMENTE
 * DE LOS ARCHIVOS A COPIAR EN LA FASE 9 (Despliegue controlado).
 *
 * Motivo de este archivo: la auditoría de seguridad sobre codigo/*.gs
 * (auditoria/CHANGELOG.md, 20/07/2026) confirmó que el código PERMANENTE
 * no registra `cfg`, `options` ni `OPENAI_API_KEY` en ningún log. El riesgo
 * real identificado no estaba en ese código, sino en la instrumentación
 * TEMPORAL que un tester podría agregar ad-hoc para depurar los casos de
 * fault injection de la Fase 8 (CP-08, CP-09, CP-12, CP-26, CP-29) — por
 * ejemplo, un `Logger.log(JSON.stringify(cfg))` para ver por qué falla una
 * llamada. Como este proyecto tiene registro de excepciones en Cloud
 * habilitado (entregables/FASE_0/INVENTARIO_TECNICO.md), un log accidental
 * de ese tipo no queda solo en la transcripción efímera de la ejecución:
 * persiste en Cloud Logging.
 *
 * Este archivo NUNCA debe copiarse al proyecto de Apps Script productivo.
 * Como segunda barrera (además de la barrera humana de no copiarlo), toda
 * función de este archivo verifica MODO_PRUEBA=true en tiempo de ejecución
 * y aborta si no lo está.
 * ============================================================================
 */

// Patrones de NOMBRE de campo considerados sensibles, sin importar
// mayúsculas/minúsculas ni el formato exacto (snake_case, camelCase, etc.).
var PATRONES_CLAVE_SENSIBLE = [
  /openai_?api_?key/i,
  /authorization/i,
  /\btoken\b/i,
  /secreto/i,
  /secret/i
];

/** Detecta si un VALOR tiene forma de clave/token, independientemente del nombre de su campo. */
function esValorSensible(valor) {
  if (typeof valor !== 'string') return false;
  return /^sk-/.test(valor) || /^Bearer\s/i.test(valor);
}

function esClaveSensible(nombreClave) {
  return PATRONES_CLAVE_SENSIBLE.some(function (patron) { return patron.test(nombreClave); });
}

/**
 * Barrera de ejecución: ninguna función de este archivo hace nada si el
 * proyecto no está en modo prueba. Lanza una excepción (no continúa en
 * silencio) para que un uso accidental en producción falle de forma visible.
 */
function verificarModoPruebaObligatorio() {
  var modoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA') === 'true';
  if (!modoPrueba) {
    throw new Error('pruebas/debug_seguro_pruebas.gs: MODO_PRUEBA no es "true". ' +
      'Este archivo es exclusivo de la Fase 8 y se niega a ejecutarse fuera de modo prueba.');
  }
}

/**
 * Redacción recursiva: reemplaza por '[REDACTADO]' cualquier campo cuyo
 * NOMBRE coincida con un patrón sensible, y cualquier VALOR de tipo string
 * que tenga forma de clave/token, aunque el nombre del campo no lo sugiera.
 */
function redactarProfundo(valor) {
  if (Array.isArray(valor)) {
    return valor.map(redactarProfundo);
  }
  if (valor && typeof valor === 'object') {
    var copia = {};
    Object.keys(valor).forEach(function (clave) {
      if (esClaveSensible(clave)) {
        copia[clave] = '[REDACTADO]';
      } else {
        copia[clave] = redactarProfundo(valor[clave]);
      }
    });
    return copia;
  }
  if (esValorSensible(valor)) {
    return '[REDACTADO]';
  }
  return valor;
}

/**
 * Serialización segura de un objeto arbitrario para depuración temporal
 * durante la Fase 8 (por ejemplo, al instrumentar CP-08 o CP-09 para
 * inspeccionar la respuesta de la IA). Reemplaza cualquier
 * `Logger.log(JSON.stringify(objeto))` directo.
 *
 * Uso: Logger.log(serializarSeguro(cfg));  // en vez de JSON.stringify(cfg)
 *
 * NUNCA llamar desde codigo/*.gs (código permanente): el código productivo
 * ya fue auditado y no necesita loguear estos objetos.
 */
function serializarSeguro(objeto) {
  verificarModoPruebaObligatorio();
  return JSON.stringify(redactarProfundo(objeto), null, 2);
}

/**
 * Función temporal de la Fase 8: ejecuta validarConfiguracion() y muestra
 * en el log SOLO una lista blanca de campos no sensibles, más
 * `openaiApiKey: "[REDACTADA]"` como marcador fijo (nunca el valor real, ni
 * siquiera parcial, ni pasado por redactarProfundo() — se fija explícitamente
 * para que este campo nunca dependa de que la redacción automática funcione
 * bien).
 *
 * Reemplaza cualquier `Logger.log(JSON.stringify(cfg))` que se hubiera
 * usado antes para revisar la configuración a simple vista durante la
 * Fase 8.
 */
function ejecutarValidacionVisible() {
  verificarModoPruebaObligatorio();

  var validacion = validarConfiguracion();
  if (!validacion.valido) {
    Logger.log('ejecutarValidacionVisible(): configuración inválida:\n' + validacion.errores.join('\n'));
    return;
  }

  var cfg = validacion.cfg;

  // Lista blanca explícita: solo estos campos se muestran. Cualquier campo
  // de cfg que NO esté listado aquí (incluidos los que se agreguen en el
  // futuro) queda fuera del log por diseño, no por omisión accidental.
  var vistaSegura = {
    openaiApiKey: '[REDACTADA]',
    openaiModel: cfg.openaiModel,
    spreadsheetId: cfg.spreadsheetId,
    spreadsheetIdPrueba: cfg.spreadsheetIdPrueba,
    spreadsheetIdEfectivo: cfg.spreadsheetIdEfectivo,
    zonaHoraria: cfg.zonaHoraria,
    maxMensajesPorEjecucion: cfg.maxMensajesPorEjecucion,
    maxMensajesBusqueda: cfg.maxMensajesBusqueda,
    maxCaracteresCuerpo: cfg.maxCaracteresCuerpo,
    tiempoInternoMaxMs: cfg.tiempoInternoMaxMs,
    umbralAbandonoMin: cfg.umbralAbandonoMin,
    versionScript: cfg.versionScript,
    fechaInicioCorte: cfg.fechaInicioCorte,
    modoPrueba: cfg.modoPrueba,
    dryRun: cfg.dryRun
    // Deliberadamente fuera de la lista blanca: cfg.idsEtiquetas (no es
    // secreto, pero no aporta nada a esta vista) y cualquier otro campo no
    // mencionado explícitamente arriba.
  };

  Logger.log('ejecutarValidacionVisible(): configuración válida:\n' + JSON.stringify(vistaSegura, null, 2));
}
