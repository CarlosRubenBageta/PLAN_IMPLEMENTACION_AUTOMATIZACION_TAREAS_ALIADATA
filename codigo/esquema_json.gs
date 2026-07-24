/**
 * ============================================================================
 * BORRADOR — Fase 4 (Extracción con IA y Structured Outputs). NO DESPLEGAR.
 * ============================================================================
 * Reemplaza las constantes de valores permitidos y la función
 * validarRespuestaIA() que en el borrador de la Fase 3
 * (codigo/script_refactorizado.gs) eran placeholders estructurales.
 *
 * Fuente de verdad de las listas: documentacion/ESQUEMA_JSON.md (Fase 2).
 * ============================================================================
 */

var TABLEROS_VALIDOS = ['Finanzas', 'Comercial', 'Soporte', 'Desarrollo IT', 'Gestión General'];
var PRIORIDADES_VALIDAS = ['Crítico', 'Alto', 'Medio', 'Bajo'];
var GRUPOS_ORIGEN_VALIDOS = ['Administración', 'Ventas', 'Soporte', 'Desarrollo IT', 'Gestión General'];
var RESPONSABLES_VALIDOS = [
  'Socio Administración', 'Socio Comercial', 'Responsable Soporte',
  'Responsable Técnico', 'Socio Dirección', 'Sin asignar'
];

/**
 * Esquema JSON estricto para el parámetro response_format de OpenAI
 * (Structured Outputs, response_format: {type: "json_schema", strict: true}).
 * Construido a partir de las listas anteriores para que ambos permanezcan
 * sincronizados (única fuente de verdad).
 *
 * Nota sobre "strict" de OpenAI: exige que TODAS las propiedades figuren en
 * "required" (los campos opcionales se expresan como nullable, con
 * "type": ["string", "null"], no omitiéndolos) y "additionalProperties": false
 * en cada objeto, incluidos los anidados.
 */
function obtenerEsquemaJsonRespuestaIA() {
  return {
    name: 'clasificacion_correo_aliadata',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        correo_relevante: { type: 'boolean' },
        requiere_revision: { type: 'boolean' },
        motivo_revision: { type: ['string', 'null'] },
        motivo_sin_tareas: { type: ['string', 'null'] },
        observaciones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              numero: { type: 'integer' },
              texto_original: { type: 'string' },
              tareas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    resumen: { type: 'string' },
                    tablero: { type: 'string', enum: TABLEROS_VALIDOS },
                    prioridad: { type: 'string', enum: PRIORIDADES_VALIDAS },
                    grupo_origen: { type: 'string', enum: GRUPOS_ORIGEN_VALIDOS },
                    responsable_sugerido: { type: 'string', enum: RESPONSABLES_VALIDOS },
                    fecha_limite: { type: ['string', 'null'] }
                  },
                  required: ['resumen', 'tablero', 'prioridad', 'grupo_origen', 'responsable_sugerido', 'fecha_limite'],
                  additionalProperties: false
                }
              }
            },
            required: ['numero', 'texto_original', 'tareas'],
            additionalProperties: false
          }
        }
      },
      required: ['correo_relevante', 'requiere_revision', 'motivo_revision', 'motivo_sin_tareas', 'observaciones'],
      additionalProperties: false
    }
  };
}

/**
 * Validación local de la respuesta, OBLIGATORIA aunque se use Structured
 * Outputs con json_schema strict (el plan v3 exige "la respuesta será
 * validada localmente de todos modos" como segunda barrera independiente
 * del proveedor de IA). Rechaza explícitamente cualquier valor fuera de
 * catálogo y cualquier inconsistencia entre campos (ver
 * documentacion/ESQUEMA_JSON.md, sección 3, reglas C-01 a C-06).
 */
function validarRespuestaIA(respuestaIA) {
  if (!respuestaIA.exito) {
    return { valida: false, motivo: 'Fallo de comunicación con la IA: ' + (respuestaIA.error || 'sin detalle') };
  }
  if (respuestaIA.rechazoModelo) {
    return { valida: false, motivo: 'El modelo rechazó generar una respuesta (refusal): ' + respuestaIA.rechazoModelo };
  }
  if (respuestaIA.truncada) {
    return { valida: false, motivo: 'La respuesta de la IA fue truncada (finish_reason=length); JSON incompleto.' };
  }

  var datos;
  try {
    datos = JSON.parse(respuestaIA.contenidoCrudo);
  } catch (e) {
    return { valida: false, motivo: 'La IA no devolvió JSON válido: ' + e.message };
  }

  if (typeof datos.correo_relevante !== 'boolean' || typeof datos.requiere_revision !== 'boolean') {
    return { valida: false, motivo: 'Faltan campos booleanos obligatorios (correo_relevante/requiere_revision).' };
  }
  if (!Array.isArray(datos.observaciones)) {
    return { valida: false, motivo: 'El campo observaciones no es un arreglo.' };
  }

  // Reglas de consistencia entre campos (ESQUEMA_JSON.md, sección 3).
  if (datos.requiere_revision && (!datos.motivo_revision || typeof datos.motivo_revision !== 'string')) {
    return { valida: false, motivo: 'requiere_revision=true sin motivo_revision (regla C-02).' };
  }
  if (!datos.requiere_revision && datos.motivo_revision) {
    return { valida: false, motivo: 'requiere_revision=false pero motivo_revision no es null (regla C-05).' };
  }
  if (datos.observaciones.length === 0 && !datos.motivo_sin_tareas) {
    return { valida: false, motivo: 'observaciones vacío sin motivo_sin_tareas (regla C-03).' };
  }

  var totalTareas = 0;

  for (var i = 0; i < datos.observaciones.length; i++) {
    var obs = datos.observaciones[i];
    if (typeof obs.texto_original !== 'string' || obs.texto_original.trim() === '' || !Array.isArray(obs.tareas)) {
      return { valida: false, motivo: 'Observación ' + i + ' con estructura inválida.' };
    }

    for (var j = 0; j < obs.tareas.length; j++) {
      var tarea = obs.tareas[j];
      totalTareas++;

      if (typeof tarea.resumen !== 'string' || tarea.resumen.trim() === '') {
        return { valida: false, motivo: 'Resumen vacío en observación ' + i + ', tarea ' + j + '.' };
      }
      // Valores fuera de catálogo: rechazo explícito de TODA la respuesta,
      // no una corrección silenciosa (a diferencia de fecha_limite, ver abajo).
      if (TABLEROS_VALIDOS.indexOf(tarea.tablero) === -1) {
        return { valida: false, motivo: 'Tablero fuera de catálogo en observación ' + i + ', tarea ' + j + ': "' + tarea.tablero + '".' };
      }
      if (PRIORIDADES_VALIDAS.indexOf(tarea.prioridad) === -1) {
        return { valida: false, motivo: 'Prioridad fuera de catálogo en observación ' + i + ', tarea ' + j + ': "' + tarea.prioridad + '".' };
      }
      if (GRUPOS_ORIGEN_VALIDOS.indexOf(tarea.grupo_origen) === -1) {
        return { valida: false, motivo: 'Grupo origen fuera de catálogo en observación ' + i + ', tarea ' + j + ': "' + tarea.grupo_origen + '".' };
      }
      if (RESPONSABLES_VALIDOS.indexOf(tarea.responsable_sugerido) === -1) {
        return { valida: false, motivo: 'Responsable fuera de catálogo en observación ' + i + ', tarea ' + j + ': "' + tarea.responsable_sugerido + '".' };
      }
      // fecha_limite: un valor no parseable se descarta (se trata como null),
      // no invalida la tarea completa (RF-05 en REGLAS_FUNCIONALES.md).
      if (tarea.fecha_limite !== null && !/^\d{4}-\d{2}-\d{2}$/.test(tarea.fecha_limite)) {
        Logger.log('fecha_limite no ISO 8601 descartada (tratada como null): "' + tarea.fecha_limite + '".');
        tarea.fecha_limite = null;
      } else if (tarea.fecha_limite !== null && isNaN(new Date(tarea.fecha_limite).getTime())) {
        Logger.log('fecha_limite con formato ISO pero fecha inválida, descartada: "' + tarea.fecha_limite + '".');
        tarea.fecha_limite = null;
      }
    }
  }

  if (totalTareas === 0 && !datos.motivo_sin_tareas) {
    return { valida: false, motivo: 'Ninguna observación generó tareas y no se explicó el motivo (regla C-06 inversa).' };
  }

  return { valida: true, datos: datos };
}
