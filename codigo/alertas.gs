/**
 * ============================================================================
 * BORRADOR — Fase 10 (Monitoreo y estabilización). NO DESPLEGAR SIN PROBAR.
 * ============================================================================
 * Cierra la brecha dejada explícitamente abierta por DEC-017
 * (auditoria/DECISIONES.md): de los 8 eventos de alerta que exige la sección
 * "Fase 10. Monitoreo y estabilización" del plan v3, solo "runtime terminado
 * inesperadamente" estaba cubierto (notificación nativa de fallas de Apps
 * Script, configurada en B.13 de PROCEDIMIENTO_DESPLIEGUE.md). Este archivo
 * agrega los 7 restantes: error crítico, tres fallos consecutivos, aumento
 * anormal de revisión manual, clave API ausente, falta de permisos, fallo de
 * escritura, hoja inexistente.
 *
 * Diseño deliberadamente aditivo: no se modificó ninguna lógica de control
 * existente en script_refactorizado.gs, recuperacion.gs ni escritura_sheets.gs
 * — solo se agregaron llamadas de una línea en los puntos donde cada
 * condición YA se detecta hoy (p. ej., validarConfiguracion() ya arma el
 * mensaje "Falta OPENAI_API_KEY."; escribirFilasPorLote() ya detecta una hoja
 * de destino inexistente). Ningún camino de ejecución ni estado final cambia
 * de comportamiento; las alertas son un efecto secundario de observar
 * resultados que el pipeline ya calculaba.
 *
 * Envío: GmailApp.sendEmail() (no MailApp) — reutiliza el mismo servicio
 * avanzado de Gmail ya autorizado para leer/etiquetar (DEC-001), evitando
 * pedir un permiso OAuth nuevo al volver a autorizar el proyecto. El correo
 * sale desde la cuenta operativa (tareas@alia-data.com) hacia CUENTA_ALERTAS
 * — nunca al revés — así que no hay riesgo de que la propia alerta reingrese
 * al flujo (cae en la bandeja de salida de tareas@, no en su bandeja de
 * entrada, y CUENTA_ALERTAS no es una cuenta que este pipeline lea).
 *
 * Cooldown: CUENTA_ALERTAS puede saturarse si la misma condición se repite en
 * cada ejecución (cada 10 minutos). enviarAlertaTecnica() aplica un cooldown
 * por tipo de evento (COOLDOWN_ALERTAS_MIN, ScriptProperties) antes de
 * reenviar el mismo tipo — la primera ocurrencia siempre alerta de inmediato.
 *
 * Propiedades nuevas, todas OPCIONALES con valor por defecto embebido en el
 * código (no se agregaron a la validación estricta de validarConfiguracion()
 * a propósito: las alertas deben poder funcionar incluso si la configuración
 * general está rota — es precisamente cuando más se necesitan):
 *   - COOLDOWN_ALERTAS_MIN (default 60): minutos mínimos entre 2 alertas del
 *     mismo tipo.
 *   - UMBRAL_FALLOS_CONSECUTIVOS (default 3): ejecuciones consecutivas con
 *     al menos un error antes de disparar "tres fallos consecutivos".
 *   - UMBRAL_REVISION_MANUAL_ALERTA (default 3): mensajes a REVISION_MANUAL
 *     dentro de UNA MISMA ejecución antes de considerar "aumento anormal".
 * CUENTA_ALERTAS ya existía (DEC-017, configuracion/PARAMETROS_EJEMPLO.md);
 * hasta ahora ningún código la leía.
 *
 * Pendiente antes de desplegar a producción (ver auditoria/CHANGELOG.md):
 * este archivo es código nuevo sin ningún caso de prueba — el mismo criterio
 * de riesgo que motivó diferir esto en DEC-017 aplica ahora a este código en
 * particular. Necesita su propia tanda de pruebas (idealmente en el proyecto
 * de prueba de la Fase 8, con MODO_PRUEBA=true) antes de copiarlo al proyecto
 * real. Al desplegar, son 10 archivos .gs, no 9 (ver PROCEDIMIENTO_DESPLIEGUE.md,
 * que todavía dice 9 — actualizar en ese momento).
 * ============================================================================
 */

/** Lee una propiedad numérica opcional, con valor por defecto si está ausente o no es un número válido. */
function leerPropiedadNumerica(nombrePropiedad, valorPorDefecto) {
  var valor = parseInt(PROP.getProperty(nombrePropiedad), 10);
  return (!valor || valor <= 0) ? valorPorDefecto : valor;
}

/**
 * Punto único de envío para las 7 alertas de este archivo. tipoEvento es una
 * clave corta y estable (p. ej. 'CLAVE_API_AUSENTE') usada como:
 *  (a) parte del asunto del correo, y
 *  (b) nombre de la ScriptProperty de cooldown ('ULTIMA_ALERTA_' + tipoEvento).
 * Lee CUENTA_ALERTAS directamente de PropertiesService (no de un cfg
 * validado) para poder alertar incluso cuando validarConfiguracion() falló y
 * no hay ningún cfg disponible.
 */
function enviarAlertaTecnica(tipoEvento, asunto, detalle) {
  var cuentaAlertas = PROP.getProperty('CUENTA_ALERTAS');
  if (!cuentaAlertas) {
    Logger.log('enviarAlertaTecnica(): CUENTA_ALERTAS no configurada; alerta "' + tipoEvento + '" no enviada. Detalle: ' + detalle);
    return;
  }

  var cooldownMin = leerPropiedadNumerica('COOLDOWN_ALERTAS_MIN', 60);
  var clavePropiedadCooldown = 'ULTIMA_ALERTA_' + tipoEvento;
  var ultimoEnvioMs = parseInt(PROP.getProperty(clavePropiedadCooldown), 10);
  var ahoraMs = Date.now();

  if (ultimoEnvioMs && (ahoraMs - ultimoEnvioMs) < cooldownMin * 60 * 1000) {
    Logger.log('enviarAlertaTecnica(): alerta "' + tipoEvento + '" suprimida por cooldown (' + cooldownMin + ' min desde el último envío). Detalle: ' + detalle);
    return;
  }

  try {
    GmailApp.sendEmail(
      cuentaAlertas,
      '[Automatización Aliadata] ' + asunto,
      detalle + '\n\n---\nTipo de evento: ' + tipoEvento + '\nHora: ' + new Date().toISOString()
    );
    PROP.setProperty(clavePropiedadCooldown, String(ahoraMs));
    Logger.log('enviarAlertaTecnica(): alerta "' + tipoEvento + '" enviada a ' + cuentaAlertas + '.');
  } catch (errorEnvio) {
    // No relanzar: una alerta que no pudo enviarse no debe interrumpir el
    // procesamiento de mensajes ni marcar un mensaje como fallido.
    Logger.log('enviarAlertaTecnica(): fallo al enviar la alerta "' + tipoEvento + '": ' + errorEnvio.message);
  }
}

/**
 * Clasifica el texto de un error como FALTA_DE_PERMISOS o ERROR_CRITICO
 * genérico. Heurística por palabras clave sobre e.message — no es perfecta,
 * pero cubre los mensajes reales de permisos que devuelven las APIs de
 * Google (p. ej. "The caller does not have permission", "PERMISSION_DENIED").
 */
function clasificarTipoErrorCritico(mensajeError) {
  var texto = String(mensajeError || '');
  if (/permission|permiso|autoriz|forbidden|403/i.test(texto)) return 'FALTA_DE_PERMISOS';
  return 'ERROR_CRITICO';
}

/**
 * Llamada desde procesarCorreosDeTareas() cuando validarConfiguracion()
 * devuelve valido=false. Distingue 3 de los 7 eventos por el texto de error
 * que validarConfiguracion() YA produce (sin cambiar esa función), y usa
 * ERROR_CRITICO como categoría residual para cualquier otro motivo
 * (propiedades numéricas faltantes, MODO_PRUEBA mal configurado, etc.).
 */
function despacharAlertaConfiguracionInvalida(errores) {
  var texto = errores.join('\n');
  if (/OPENAI_API_KEY/.test(texto)) {
    enviarAlertaTecnica('CLAVE_API_AUSENTE', 'Falta la clave de OpenAI (OPENAI_API_KEY)', texto);
  } else if (/No existe la hoja técnica/.test(texto)) {
    enviarAlertaTecnica('HOJA_INEXISTENTE', 'Falta una hoja técnica en la planilla configurada', texto);
  } else if (/No se pudo abrir la planilla/.test(texto)) {
    enviarAlertaTecnica('FALTA_DE_PERMISOS', 'No se pudo abrir la planilla configurada (posible problema de permisos)', texto);
  } else {
    enviarAlertaTecnica('ERROR_CRITICO', 'La configuración del pipeline es inválida; la ejecución se abortó sin tocar Gmail ni Sheets', texto);
  }
}

/**
 * Contador de ejecuciones consecutivas con al menos un error, persistido en
 * ScriptProperties (las variables globales de Apps Script no sobreviven
 * entre ejecuciones). Se llama exactamente una vez por ejecución real
 * (huboFallo = true si esta corrida tuvo algún error; false si terminó
 * limpia), desde procesarCorreosDeTareas() y desde el final de
 * procesarCorreosDeTareasConConfiguracion_(). Una ejecución que ni siquiera
 * obtuvo el lock (otra ya en curso) NO llama a esta función — no cuenta como
 * éxito ni como fallo, es un no-evento.
 */
function actualizarContadorFallosConsecutivos(huboFallo) {
  if (!huboFallo) {
    PROP.setProperty('CONTADOR_FALLOS_CONSECUTIVOS', '0');
    return;
  }

  var umbral = leerPropiedadNumerica('UMBRAL_FALLOS_CONSECUTIVOS', 3);
  var contadorActual = (parseInt(PROP.getProperty('CONTADOR_FALLOS_CONSECUTIVOS'), 10) || 0) + 1;
  PROP.setProperty('CONTADOR_FALLOS_CONSECUTIVOS', String(contadorActual));

  if (contadorActual >= umbral) {
    enviarAlertaTecnica(
      'TRES_FALLOS_CONSECUTIVOS',
      contadorActual + ' ejecuciones consecutivas con al menos un error',
      'Umbral configurado: ' + umbral + '. Ver Log Mensajes y el registro de ejecuciones de Apps Script para el detalle de cada una.'
    );
  }
}

/**
 * Alerta de "aumento anormal de revisión manual", con alcance POR EJECUCIÓN
 * (no acumulado entre ejecuciones): cuenta cuántos mensajes de la tanda
 * actual terminaron en ESTADOS.REVISION_MANUAL (contadorRevisionManualEjecucion,
 * incrementado en finalizarMensajeSinTareas() y finalizarMensaje(), ver
 * script_refactorizado.gs) y alerta si supera el umbral configurado. Llamada
 * una vez, al final de procesarCorreosDeTareasConConfiguracion_().
 */
function despacharAlertaRevisionManualSiCorresponde(cantidadRevisionManual) {
  var umbral = leerPropiedadNumerica('UMBRAL_REVISION_MANUAL_ALERTA', 3);
  if (cantidadRevisionManual >= umbral) {
    enviarAlertaTecnica(
      'AUMENTO_REVISION_MANUAL',
      cantidadRevisionManual + ' mensaje(s) enviados a revisión manual en una misma ejecución',
      'Umbral configurado: ' + umbral + '. Ver Log Mensajes (estado=REVISION_MANUAL) para el detalle de cada mensaje.'
    );
  }
}
