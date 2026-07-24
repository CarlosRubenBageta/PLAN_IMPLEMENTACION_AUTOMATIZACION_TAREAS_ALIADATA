# Esquema JSON de salida de la IA — Fase 2

**Fecha:** 20/07/2026
**Elaborado por:** Claude Cowork
**Base:** plan v3, sección "Fase 2. Diseño funcional y esquema de datos" (líneas 610-689)

> Este documento formaliza el contrato de datos entre el modelo de IA y el script. No define el prompt (Fase 4) ni el código de validación (Fase 4/5): solo la estructura y los valores permitidos.

---

## 1. Esquema completo

```json
{
  "correo_relevante": true,
  "requiere_revision": false,
  "motivo_revision": null,
  "motivo_sin_tareas": null,
  "observaciones": [
    {
      "numero": 1,
      "texto_original": "Observación literal o resumida fielmente.",
      "tareas": [
        {
          "resumen": "Acción concreta y ejecutable.",
          "tablero": "Desarrollo IT",
          "prioridad": "Alto",
          "grupo_origen": "Soporte",
          "responsable_sugerido": "Responsable Técnico",
          "fecha_limite": null
        }
      ]
    }
  ]
}
```

## 2. Diccionario de campos

| Campo | Nivel | Tipo | Obligatorio | Valores permitidos / formato | Notas |
|---|---|---|---|---|---|
| `correo_relevante` | raíz | boolean | Sí | `true` / `false` | `false` cuando el correo no es un pedido operativo (publicidad, notificación automática, informativo puro) |
| `requiere_revision` | raíz | boolean | Sí | `true` / `false` | `true` ante ambigüedad; en ese caso no deben generarse tareas (ver `REGLAS_FUNCIONALES.md`, RF-06) |
| `motivo_revision` | raíz | string \| null | Sí (puede ser `null`) | Texto libre breve | Obligatorio en contenido cuando `requiere_revision = true`; debe ser `null` cuando es `false` |
| `motivo_sin_tareas` | raíz | string \| null | Sí (puede ser `null`) | Texto libre breve | Se completa cuando `observaciones` es `[]` o ninguna observación produjo tareas; `null` en caso contrario |
| `observaciones` | raíz | array de objeto | Sí | Puede ser `[]` | Un correo puede tener 0, 1 o N observaciones |
| `observaciones[].numero` | observación | integer | Sí | Entero secuencial desde 1 | Correlativo dentro del correo, no es un ID global |
| `observaciones[].texto_original` | observación | string | Sí | No vacío | Literal o fielmente resumido; alimenta la columna `Observaciones` del tablero (ver `MAPA_COLUMNAS.md`) |
| `observaciones[].tareas` | observación | array de objeto | Sí | Puede ser `[]` | Una observación puede generar 0, 1 o varias tareas (RF-02) |
| `tareas[].resumen` | tarea | string | Sí | No vacío, acción concreta | Alimenta `Resumen de tarea`; no debe repetir el texto de la observación |
| `tareas[].tablero` | tarea | string | Sí | `Finanzas`, `Comercial`, `Soporte`, `Desarrollo IT`, `Gestión General` | Validado contra la lista cerrada antes de escribir (ver R-11 en `MATRIZ_RIESGOS.md`) |
| `tareas[].prioridad` | tarea | string | Sí | `Crítico`, `Alto`, `Medio`, `Bajo` | — |
| `tareas[].grupo_origen` | tarea | string | Sí | `Administración`, `Ventas`, `Soporte`, `Desarrollo IT`, `Gestión General` | Independiente del campo `tablero` |
| `tareas[].responsable_sugerido` | tarea | string | Sí | `Socio Administración`, `Socio Comercial`, `Responsable Soporte`, `Responsable Técnico`, `Socio Dirección`, `Sin asignar` | Rol, no nombre de persona (pendiente de mapeo a responsables reales, ver `REGLAS_FUNCIONALES.md`, sección "Pendientes") |
| `tareas[].fecha_limite` | tarea | string \| null | Sí (puede ser `null`) | ISO 8601 `YYYY-MM-DD` o `null` | Solo si está **explícitamente mencionada** en el correo (RF-05); el script la convierte a `Date` y la escribe como `dd/MM/yyyy` |

## 3. Reglas de consistencia entre campos

| Regla | Condición | Efecto esperado |
|---|---|---|
| C-01 | `correo_relevante = false` | `observaciones = []`, `requiere_revision = false`, `motivo_sin_tareas` explica por qué no es relevante |
| C-02 | `requiere_revision = true` | `motivo_revision` no nulo; `observaciones` debería ser `[]` (no se generan tareas ante ambigüedad, RF-06) |
| C-03 | `observaciones = []` | `motivo_sin_tareas` no nulo |
| C-04 | `observaciones[].tareas = []` | Válido: una observación puede no generar ninguna tarea (RF-01/RF-02) |
| C-05 | `requiere_revision = false` | `motivo_revision` debe ser `null` |
| C-06 | Alguna tarea generada | `motivo_sin_tareas` debe ser `null` |

Estas reglas de consistencia son responsabilidad de la **validación programática** (Fase 4/5), no del prompt únicamente: una respuesta que las viole se trata como salida inválida (ver `DIAGNOSTICO_ERRORES.md`, D-01.6 / `MATRIZ_RIESGOS.md`, R-05).

## 4. Ejemplo — correo con dos observaciones y tareas en tableros distintos

```json
{
  "correo_relevante": true,
  "requiere_revision": false,
  "motivo_revision": null,
  "motivo_sin_tareas": null,
  "observaciones": [
    {
      "numero": 1,
      "texto_original": "El cliente reporta que el sistema de facturación se cayó esta mañana.",
      "tareas": [
        {
          "resumen": "Revisar caída del sistema de facturación reportada por el cliente.",
          "tablero": "Desarrollo IT",
          "prioridad": "Crítico",
          "grupo_origen": "Soporte",
          "responsable_sugerido": "Responsable Técnico",
          "fecha_limite": null
        }
      ]
    },
    {
      "numero": 2,
      "texto_original": "Además solicita el estado de cuenta actualizado antes del viernes.",
      "tareas": [
        {
          "resumen": "Enviar estado de cuenta actualizado al cliente.",
          "tablero": "Finanzas",
          "prioridad": "Medio",
          "grupo_origen": "Administración",
          "responsable_sugerido": "Socio Administración",
          "fecha_limite": "2026-07-24"
        }
      ]
    }
  ]
}
```

## 5. Ejemplo — correo sin tareas (informativo)

```json
{
  "correo_relevante": true,
  "requiere_revision": false,
  "motivo_revision": null,
  "motivo_sin_tareas": "El correo informa un cambio de horario de atención, sin ninguna acción pendiente para el equipo.",
  "observaciones": []
}
```

## 6. Ejemplo — correo ambiguo (revisión manual)

```json
{
  "correo_relevante": true,
  "requiere_revision": true,
  "motivo_revision": "El correo menciona 'seguimiento pendiente' sin especificar de qué tarea o proyecto se trata.",
  "motivo_sin_tareas": null,
  "observaciones": []
}
```

## 7. Ejemplo — correo no relevante (descartado antes o después de la IA)

```json
{
  "correo_relevante": false,
  "requiere_revision": false,
  "motivo_revision": null,
  "motivo_sin_tareas": "Correo publicitario de un proveedor externo, sin solicitud operativa.",
  "observaciones": []
}
```

> Nota: el filtro determinístico de la Fase 6 debe descartar la mayoría de estos casos **antes** de invocar a la IA (mitigación de R-02); este campo es una segunda barrera para los casos que el filtro no detecte.

## 8. Diferencias respecto al script actual

| Aspecto | Script actual (`script_actual.gs`) | Esquema Fase 2 |
|---|---|---|
| Clasificaciones por correo | Exactamente 1 (L97-106) | 0 a N observaciones, cada una con 0 a N tareas |
| Revisión manual | No existe | Campo explícito `requiere_revision` + `motivo_revision` |
| Correos sin tarea | Se fuerza una fila igual (si `clasificacionIA` es truthy) | `observaciones: []` con `motivo_sin_tareas`, sin fila |
| Fecha límite | `clasificacionIA.fecha_limite \|\| ""` (L73), formato no especificado | ISO 8601 en el intercambio; conversión y formato de escritura definidos (RF-05) |

## Referencias cruzadas

- Reglas de consolidación, revisión manual y cardinalidad: `documentacion/REGLAS_FUNCIONALES.md`.
- Mapeo de estos campos a las 17 columnas del tablero: `documentacion/MAPA_COLUMNAS.md`.
- Hojas técnicas que registran cada observación/tarea: `documentacion/DISENO_HOJAS_TECNICAS.md`.
