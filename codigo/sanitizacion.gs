/**
 * ============================================================================
 * BORRADOR — Fase 7 (Escritura segura en Google Sheets). NO DESPLEGAR.
 * ============================================================================
 * Traslada sanitizarValoresParaSheets() (placeholder desde la Fase 3) a un
 * archivo independiente y agrega validarFilaCompleta(), requisito explícito
 * de esta fase ("validar que cada fila tenga exactamente 17 valores").
 *
 * Detalle: documentacion/MAPA_ESCRITURA.md.
 * ============================================================================
 */

/**
 * Neutraliza valores que comienzan con `=`, `+`, `-` o `@` anteponiendo un
 * apóstrofo, para impedir que Sheets los interprete como fórmulas (R-09 en
 * documentacion/MATRIZ_RIESGOS.md). Se aplica a asunto, remitente, resumen y
 * observaciones (regla explícita de la Fase 7).
 *
 * Nota técnica: a diferencia de una escritura vía API REST con
 * valueInputOption=RAW, `Range.setValues()` de Apps Script interpreta las
 * cadenas de texto igual que si un usuario las tipeara en la interfaz
 * (equivalente a USER_ENTERED): una cadena que empieza con "=" se convierte
 * en una fórmula viva, y un apóstrofo inicial fuerza texto literal (se
 * elimina de la visualización, igual que al tipear manualmente). Por eso
 * este prefijo es una sanitización real, no solo cosmética.
 */
function sanitizarValoresParaSheets(valor) {
  if (typeof valor !== 'string') return valor;
  if (/^[=+\-@]/.test(valor)) {
    return "'" + valor;
  }
  return valor;
}

/**
 * Valida que una fila destinada a un tablero de negocio tenga exactamente
 * las 17 columnas del esquema (documentacion/MAPA_COLUMNAS.md). Es una red
 * de seguridad contra defectos de código futuros que alteren la
 * construcción de la fila, no una validación de datos de negocio.
 */
function validarFilaCompleta(fila) {
  return Array.isArray(fila) && fila.length === 17;
}
