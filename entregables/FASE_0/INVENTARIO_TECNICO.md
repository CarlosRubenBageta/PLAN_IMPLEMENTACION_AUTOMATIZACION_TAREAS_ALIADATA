# Inventario técnico — Fase 0

**Fecha de relevamiento:** 20/07/2026  
**Relevado por:** Carlos Rubén Bageta

> Completar consultando Google Workspace. Estos datos alimentan la sección 14 del plan v3 y deben estar completos antes de la Fase 3 (salvo los marcados para Fase 9).

## Google Sheets

```text
ID del archivo maestro:1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g
URL del archivo maestro: https://docs.google.com/spreadsheets/d/1BS9CpCWWxdYQZYHMzvaiK-yFEoWR6ViVSWdK3Sb6N5g/edit?gid=2059391676#gid=2059391676
Zona horaria del archivo: (GMT-03:00) Buenos Aires
```

Nombres exactos de las hojas de destino (verificar carácter por carácter):

- [x] `Finanzas` → nombre real: Finanzas
- [x] `Comercial` → nombre real: Comercial
- [x] `Soporte` → nombre real: Soporte
- [x] `Desarrollo IT` → nombre real: Desarrollo IT
- [x] `Gestión General` → nombre real: Gestión General

Otras hojas presentes en el archivo: Listas, Dashboard

### Respaldo de Google Sheets

```text
Nombre del respaldo: RESPALDO - Aliadata Tableros Operativos - Pre automatización v3 - 2026-07-19
ID del respaldo: 1x2VlkumTdfXdVnHe_dpkaE_UzX3KvTCEuAhTs3kI_js
URL del respaldo: https://docs.google.com/spreadsheets/d/1x2VlkumTdfXdVnHe_dpkaE_UzX3KvTCEuAhTs3kI_js/edit?gid=2059391676#gid=2059391676
Ubicación en Google Drive: Mi unidad > ALIADATA > Respaldos > Automatizacion_Tareas
Fecha y hora de creación: 19/07/2026 23:37
Cuenta que creó el respaldo: carlosrubenbageta@alia-data.com
Estado de verificación: Verificado
```

## Apps Script

```text
URL del proyecto: https://script.google.com/u/0/home/projects/1-qrNy_5VOZHbdC9bj7m3Zqv3TTEmPPRwPynMYP20VBQUyR2IChVGVinA/edit
ID del script: 1-qrNy_5VOZHbdC9bj7m3Zqv3TTEmPPRwPynMYP20VBQUyR2IChVGVinA
Zona horaria del proyecto: (GMT-03:00) hora estándar de Argentina – Buenos Aires
Entorno de ejecución: V8 de Chrome habilitado
Registro de excepciones no detectadas en Cloud: Habilitado
Archivo de manifiesto appsscript.json visible en el editor: Sí, habilitado para realizar el respaldo de la Fase 0.
Servicios avanzados habilitados actualmente: Ninguno
Propiedades del script existentes (solo nombres, sin valores):
- OPENAI_API_KEY
```

### Respaldos de Apps Script

```text
Copia de trabajo del código:
- codigo/script_actual.gs

Copia histórica del código:
- respaldos/script/script_actual_2026-07-19.gs

Copia del manifiesto:
- respaldos/script/appsscript_actual.json

Estado de verificación:
- Los archivos existen y no están vacíos.
- El código productivo fue copiado completamente.
- El manifiesto comienza con { y termina con }.
- No se encontraron claves API incrustadas.
- Solo se referencia el nombre de la propiedad OPENAI_API_KEY.
- No se habilitaron servicios avanzados ni nuevos permisos.
```

## Gmail

Etiquetas existentes en `tareas@alia-data.com` (lista completa):

```text
- Procesado
```

## OpenAI

```text
Modelo actualmente configurado: gpt-4o-mini
Modelo definitivo elegido: gpt-4o-mini. CONFIRMADO por Carlos Rubén Bageta el
20/07/2026 (instrucción explícita en sesión de Claude Cowork, en el marco de
la aprobación de la Fase 4), coincidiendo con la recomendación técnica de
documentacion/POLITICA_REINTENTOS.md (sección 6): soporta Structured Outputs,
es el de menor costo de la familia GPT-4o compatible, y mantiene continuidad
con el modelo ya usado en producción.
```

## Parámetros a definir (sección 14 del plan)

```text
Máximo de mensajes por ejecución (MAX_MENSAJES_POR_EJECUCION):
CONFIRMADO: 10. Aprobado por Carlos Rubén Bageta el 20/07/2026 (instrucción
explícita en sesión de Claude Cowork, en el marco de la aprobación de la
Fase 3), sin cambios respecto a la propuesta inicial.

MAX_HILOS:
CONFIRMADO: 20. Aprobado por Carlos Rubén Bageta el 20/07/2026 (idem).

Tiempo máximo interno (TIEMPO_INTERNO_MAX_MS):
CONFIRMADO: 240000 (4 minutos), con margen de ~2 minutos sobre el límite de
6 minutos de Apps Script. Aprobado por Carlos Rubén Bageta el 20/07/2026 (idem).

Umbral de abandono (UMBRAL_ABANDONO_MIN):
CONFIRMADO: 20 minutos (2 ciclos del activador de 10 minutos). Aprobado por
Carlos Rubén Bageta el 20/07/2026 (idem).

MAX_CARACTERES_CUERPO:
CONFIRMADO: 8000. Aprobado por Carlos Rubén Bageta el 20/07/2026 (idem), sin
cambios respecto a la propuesta inicial.

Política de retención del log ampliado:
Propuesta: 6 meses para información ampliada.
El Índice de Idempotencia se conservará indefinidamente.
Pendiente de aprobación antes de la Fase 3.

SPREADSHEET_ID_PRUEBA:
Pendiente de definición antes de la Fase 8.

GMAIL_QUERY_PRUEBA:
Pendiente de definición antes de la Fase 8.

Cuenta técnica para alertas:
Pendiente de decisión antes del despliegue.
No utilizar tareas@alia-data.com.

Responsables definitivos:
Pendiente de confirmación durante la Fase 2.

FECHA_INICIO_CORTE:
Se completa durante la Fase 9.

IDs internos de etiquetas:
Se completan después de habilitar Gmail API.
```
