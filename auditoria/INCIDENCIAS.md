# Registro de incidencias

## INC-001 — Fila inicial de `Log Mensajes` escrita con una columna de menos

**Fecha y hora:** 2026-07-20
**Entorno:** Revisión de código local (sin ejecución real)
**Severidad:** Alta
**Mensaje afectado:** Todos los mensajes nuevos (rama "insertar fila nueva" de `registrarInicioProcesamiento()`)
**Etapa:** `INICIO` (creación de la fila en `Log Mensajes`)
**Descripción:** El arreglo `filaNueva` de `registrarInicioProcesamiento()` (`codigo/script_refactorizado.gs`, Fase 3) tenía 25 valores en lugar de los 26 que exige el esquema de `Log Mensajes` (`documentacion/DISENO_HOJAS_TECNICAS.md`, sección 1): faltaba el placeholder de la columna 20 (`request_id`). Esto corría una columna hacia la izquierda todos los valores desde `costo_estimado` en adelante, y dejaba la columna 26 (`version_script`) sin ningún valor.
**Impacto:** Cada fila nueva de `Log Mensajes` habría quedado con `cuerpo_truncado`, `longitud_original`, `longitud_normalizada`, `duracion_llamada_ia` y `unidades_gmail_api` desplazados una columna, y `cfg.versionScript` (un string como `"3.0.0"`) escrito en la columna `unidades_gmail_api` en lugar de `version_script`. No afectaba a `Registro Tareas` ni a `Indice Idempotencia` (verificados alineados correctamente).
**Causa probable:** Al redactar el arreglo en la Fase 3 se omitió el valor correspondiente a `request_id`, columna que no tiene un dato disponible en la etapa `INICIO` (se completa recién al llamar a la IA) y por eso se perdió de vista al contar las columnas.
**Detectado por:** Revisión solicitada por Carlos Rubén Bageta al preguntar en qué archivos aparecían los encabezados de las hojas técnicas, lo que llevó a verificar la alineación exacta columna por columna.
**Acción inmediata:** Corregido en `codigo/script_refactorizado.gs`: el arreglo ahora tiene los 26 valores en el orden exacto del esquema, con un comentario por columna para evitar que se repita el error.
**Corrección definitiva:** Aplicada (ver arriba). No requiere cambios en `documentacion/DISENO_HOJAS_TECNICAS.md` (el esquema documentado ya era correcto; el defecto estaba solo en el código).
**Estado:** Resuelta

Formato a utilizar:

```markdown
## INC-001 — Título

**Fecha y hora:**  
**Entorno:** Prueba / Producción  
**Severidad:** Baja / Media / Alta / Crítica  
**Mensaje afectado:**  
**Etapa:**  
**Descripción:**  
**Impacto:**  
**Causa probable:**  
**Acción inmediata:**  
**Corrección definitiva:**  
**Estado:** Abierta / En análisis / Resuelta  
```
