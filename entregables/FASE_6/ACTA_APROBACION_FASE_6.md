# Acta de aprobación — Fase 6

**Revisión documental:** 20/07/2026, Claude Cowork (sin acceso a Google Workspace ni credenciales)

## Criterios de aceptación (plan v3)

- [x] **Las notificaciones de Apps Script nunca llegan al tablero.** Evidencia: `evaluarFiltroDeterministico()` en `codigo/filtros_correo.gs`, regla 2.1 (coincidencia exacta de remitente `noreply-apps-scripts-notifications@google.com` o asunto `Summary of failures for Google Apps Script`), evaluada antes de cualquier llamada a la IA; etiqueta `Revisión manual/Error de automatización`.
- [x] **Los correos promocionales no generan tareas.** Evidencia: reglas 2.3 (`List-Unsubscribe`) y 2.4 (`Precedence: bulk/list/junk`), señales técnicas estándar de distribución masiva.
- [x] **Los filtros no bloquean correos operativos válidos.** Evidencia: diseño basado exclusivamente en encabezados estándar y coincidencias exactas, nunca en palabras del asunto/cuerpo (justificado en `documentacion/REGLAS_ELEGIBILIDAD.md`, secciones 1 y 3); caso de control FC-08 en `pruebas/CASOS_CORREOS_NO_OPERATIVOS.md` verifica explícitamente que la palabra "oferta" en un asunto operativo real no dispara ningún filtro.
- [x] **Cada exclusión queda registrada.** Evidencia: `evaluarFiltroDeterministico()` siempre devuelve `motivo`; `procesarUnMensaje()` lo persiste en `Log Mensajes` vía `finalizarMensajeSinTareas()`.

## Entregables

- `codigo/filtros_correo.gs` — `evaluarFiltroDeterministico()` definitivo (6 reglas en orden, con `claveEtiqueta` diferenciada para la notificación de Apps Script).
- `documentacion/REGLAS_ELEGIBILIDAD.md` — justificación de cada regla y de lo que deliberadamente no se implementó como filtro determinístico.
- `pruebas/CASOS_CORREOS_NO_OPERATIVOS.md` — 9 correos sintéticos (FC-01 a FC-09), incluidos dos casos de control (uno positivo, uno límite).
- `codigo/script_refactorizado.gs` actualizado: `extraerDatosCorreo()` ahora captura `List-Unsubscribe`, `Precedence` y `Auto-Submitted`; `procesarUnMensaje()` usa `filtro.claveEtiqueta` en lugar de una etiqueta fija.

## Observaciones de la revisión

1. **Decisión técnica deliberada:** se optó por señales basadas en encabezados estándar de correo (RFC 2369/8058, RFC 2076, RFC 3834) en lugar de coincidencia de palabras clave en asunto/cuerpo, precisamente para no arriesgar el criterio de aceptación "no bloquear correos operativos válidos". El plan v3 no especifica el mecanismo técnico exacto para detectar boletines/promociones más allá de la regla obligatoria de Apps Script; esta elección es una interpretación razonada, documentada en `REGLAS_ELEGIBILIDAD.md`, sección 1.
2. **Limitación reconocida y no resuelta en esta fase (caso FC-09):** el patrón de remitente automático de Google (`docs.google.com`, `script.google.com`, y variantes de `noreply@`) podría descartar, en un caso límite, un correo de "Juan compartió un archivo contigo" que sí requiriera acción humana. Queda documentado como punto a revisar con datos reales en la Fase 8, no se resuelve unilateralmente aquí.
3. **Alcance deliberadamente limitado:** "correos sin información accionable" (mencionado en el plan como ejemplo de correo no operativo) no se implementó como regla determinística por ser una categoría semántica, no técnica; se deja a cargo de la IA (`motivo_sin_tareas`, ya diseñado desde la Fase 2).
4. No se accedió a Google Workspace ni se envió ningún correo real durante esta fase; los casos de `CASOS_CORREOS_NO_OPERATIVOS.md` son datos sintéticos para la Fase 8.
5. Aprobado por Carlos Rubén Bageta mediante instrucción explícita en sesión de Claude Cowork (20/07/2026), sin observaciones adicionales sobre el contenido técnico.

## Puerta de aprobación

```text
APROBACIÓN FASE 6: APROBADA
Responsable: Carlos Rubén Bageta
Fecha: 20/07/2026
Observaciones: Aprobación registrada por instrucción explícita del responsable en el chat de la sesión. Sin correcciones sobre las reglas de elegibilidad ni los casos sintéticos.
```

> Fase 7 habilitada.
