# Pruebas de escritura — Fase 7

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Propósito:** casos concretos para verificar `codigo/escritura_sheets.gs` y `codigo/sanitizacion.gs` en la Fase 8 (pruebas controladas). Complementa `pruebas/CASOS_DE_PRUEBA.md` (CP-01 a CP-04, CP-23, CP-24) con datos de entrada específicos.

> Ninguna de estas pruebas se ejecutó contra Google Sheets real durante la Fase 7: son insumos de datos para la Fase 8.

---

## PE-01 — Fila con valor que empieza con `=` (inyección de fórmula)

```text
Asunto original: =HYPERLINK("http://ejemplo-malicioso.com","Click aquí")
```

**Resultado esperado:** `sanitizarValoresParaSheets()` devuelve `'=HYPERLINK("http://ejemplo-malicioso.com","Click aquí")` (con apóstrofo inicial). Al escribirse vía `setValues()`, la celda debe mostrar el texto literal, **sin** ejecutar el hipervínculo/fórmula. Corresponde a CP-23.

## PE-02 — Valores que empiezan con `+`, `-` y `@`

```text
Resumen: +34 612 345 678 debe llamar antes del viernes
Observaciones: -Revisar el archivo adjunto
Remitente: @mencion_sospechosa en el nombre de remitente
```

**Resultado esperado:** los tres valores reciben el prefijo de apóstrofo antes de escribirse; ninguno se interpreta como fórmula.

## PE-03 — Valor normal que no debe modificarse

```text
Resumen: Revisar la propuesta comercial antes del lunes
```

**Resultado esperado:** `sanitizarValoresParaSheets()` devuelve el valor sin cambios (no empieza con ninguno de los 4 caracteres). Caso de control negativo: verifica que la sanitización no altere texto legítimo.

## PE-04 — Fecha límite explícita, verificación de corrimiento de día

```text
fecha_limite (IA): "2026-07-24"
Zona horaria del proyecto: America/Argentina/Buenos_Aires (UTC-3)
```

**Resultado esperado:** la celda "Fecha límite" muestra `24/07/2026`, **no** `23/07/2026`. Verifica que `construirFechaLocal()` no produzca el corrimiento de un día descrito en `documentacion/MAPA_ESCRITURA.md`, sección 2. Corresponde a CP-17.

## PE-05 — Fecha límite no explícita

```text
fecha_limite (IA): null
```

**Resultado esperado:** la celda "Fecha límite" queda vacía (no `"null"`, no `0`, no una fecha por defecto). Corresponde a CP-18.

## PE-06 — Enlace al correo con varias cuentas de Google iniciadas

```text
Escenario: el usuario que revisa el tablero tiene 3 cuentas de Google iniciadas
en el navegador; tareas@alia-data.com está en la posición /u/2/, no en /u/0/.
```

**Resultado esperado:** el enlace de la columna "Link al correo" (`?authuser=tareas@alia-data.com#search/rfc822msgid:...`) abre el mensaje correcto en la cuenta `tareas@alia-data.com`, sin importar en qué posición de sesión esté esa cuenta. Corresponde a CP-24. **Verificación real pendiente de Fase 8** (requiere probar en un navegador con múltiples cuentas reales).

## PE-07 — Un correo con tareas en tres hojas distintas

```text
Tarea 1 → Desarrollo IT
Tarea 2 → Finanzas
Tarea 3 → Comercial
```

**Resultado esperado:** `agruparFilasPorHoja()` produce 3 grupos; `escribirFilasPorLote()` realiza 3 llamadas a `setValues()` (una por hoja), y las 3 filas quedan en `Registro Tareas` marcadas `ESCRITA` con su `fila_destino` correspondiente. Corresponde a CP-04.

## PE-08 — Hoja de destino inexistente (caso límite, no debería ocurrir en producción)

```text
Escenario simulado: la IA (o un error de validación no detectado) devuelve
tablero = "Desarrollo IT", pero un humano eliminó accidentalmente esa hoja
de la planilla productiva a mitad de una ejecución larga.
```

**Resultado esperado:** `escribirFilasPorLote()` no escribe esa tarea ni usa ninguna otra hoja como reemplazo silencioso; `resultado[taskId] = {escrita: false, motivo: "Hoja de destino inexistente..."}`. El mensaje completo se cierra como `REVISION_MANUAL` con etiqueta `Revisión manual/Error de procesamiento`, aunque otras tareas del mismo mensaje (con hojas válidas) sí se hayan escrito. Verifica la decisión de diseño documentada en `documentacion/MAPA_ESCRITURA.md`, sección 4.

## PE-09 — Validación de fila incompleta (defecto de código, no de datos)

```text
Escenario simulado: una modificación futura del código construye una fila
con 16 o 18 elementos en lugar de 17.
```

**Resultado esperado:** `validarFilaCompleta()` detecta la discrepancia; `escribirFilasPorLote()` lanza una excepción antes de llamar a `setValues()`, evitando escribir datos desalineados por columna. El mensaje se cierra como error vía `gestionarErrorMensaje()`.

---

## Resumen de cobertura

| Caso | Verifica | CP relacionado |
|---|---|---|
| PE-01, PE-02, PE-03 | Sanitización contra inyección de fórmulas | CP-23 |
| PE-04, PE-05 | Fechas como objetos `Date` reales, sin corrimiento | CP-17, CP-18 |
| PE-06 | Enlace independiente de la posición de sesión | CP-24 |
| PE-07 | Escritura en múltiples hojas desde un mismo correo | CP-04 |
| PE-08 | Regla de "sin hoja por defecto silenciosa" | — (caso límite documentado) |
| PE-09 | Validación estructural de 17 columnas | — (red de seguridad de código) |

## Referencias cruzadas

- Diseño y justificación de cada corrección: `documentacion/MAPA_ESCRITURA.md`.
- Casos generales de prueba (a ejecutar en Fase 8): `pruebas/CASOS_DE_PRUEBA.md`.
