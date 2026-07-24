# Checklist de restauración — objetivo: menos de 15 minutos

**Fecha de verificación documental:** 20/07/2026  
**Responsable:** Carlos Rubén Bageta  
**Tipo de prueba:** Documental, sin modificar el entorno productivo  
**Resultado:** Satisfactorio  
**Tiempo estimado de restauración:** Menor de 15 minutos  

> Este documento describe el procedimiento para volver a la versión anterior ante una falla.  
> Durante la Fase 0 no se ejecuta una restauración real: solamente se verifica que los respaldos y la información necesarios estén disponibles.

---

## Verificación de preparación — Fase 0

- [x] La copia de la planilla productiva existe en Google Drive.
- [x] La copia de la planilla fue abierta y verificada.
- [x] El respaldo se encuentra en `Mi unidad > ALIADATA > Respaldos > Automatizacion_Tareas`.
- [x] El código productivo está disponible en `codigo/script_actual.gs`.
- [x] Existe una copia histórica en `respaldos/script/script_actual_2026-07-19.gs`.
- [x] El manifiesto original está respaldado en `respaldos/script/appsscript_actual.json`.
- [x] Los archivos de respaldo existen y no están vacíos.
- [x] El código productivo fue copiado completamente.
- [x] El manifiesto comienza con `{` y termina con `}`.
- [x] No se encontraron claves API reales incrustadas en los archivos.
- [x] Solo se encuentra documentado el nombre de la propiedad `OPENAI_API_KEY`.
- [x] El activador productivo está documentado.
- [x] El activador permanece activo.
- [x] Se registraron las últimas cinco ejecuciones del activador.
- [x] No se habilitaron servicios avanzados ni se modificaron permisos OAuth.
- [x] No se modificó el código productivo durante la Fase 0.

### Archivos verificados

```text
Planilla de respaldo:
RESPALDO - Aliadata Tableros Operativos - Pre automatización v3 - 2026-07-19

Código de trabajo:
codigo/script_actual.gs

Código histórico:
respaldos/script/script_actual_2026-07-19.gs

Manifiesto:
respaldos/script/appsscript_actual.json
```

---

## Procedimiento de reversión ante una falla futura

### 1. Restauración del script — estimación: 4 minutos

- [ ] Desactivar el activador de la versión con falla.
- [ ] Registrar la fecha y hora de inicio de la reversión.
- [ ] Abrir el proyecto productivo de Apps Script.
- [ ] Reemplazar el código por `respaldos/script/script_actual_2026-07-19.gs`.
- [ ] Verificar que el código copiado esté completo.
- [ ] Guardar los cambios.

### 2. Restauración del manifiesto — estimación: 2 minutos

- [ ] Mostrar temporalmente `appsscript.json` en el editor.
- [ ] Reemplazar su contenido por `respaldos/script/appsscript_actual.json`.
- [ ] Verificar que no se hayan conservado servicios avanzados o permisos de la versión fallida.
- [ ] Guardar los cambios.
- [ ] Ocultar nuevamente el manifiesto, si corresponde.

> No copiar ni registrar el valor de `OPENAI_API_KEY`.  
> Solo verificar que la propiedad continúe existiendo en las propiedades del script.

### 3. Verificación — estimación: 4 minutos

- [ ] Verificar la zona horaria del proyecto.
- [ ] Verificar que exista la propiedad `OPENAI_API_KEY`, sin consultar ni registrar su valor.
- [ ] Verificar la existencia de las cinco hojas de destino:
  - [ ] `Finanzas`
  - [ ] `Comercial`
  - [ ] `Soporte`
  - [ ] `Desarrollo IT`
  - [ ] `Gestión General`
- [ ] Ejecutar manualmente la función principal con un correo controlado.
- [ ] Confirmar escritura correcta en la hoja correspondiente.
- [ ] Confirmar ausencia de errores en el historial de ejecuciones.

### 4. Reactivación — estimación: 3 minutos

- [ ] Recrear o reactivar el activador original.
- [ ] Confirmar que ejecuta `procesarCorreosDeTareas`.
- [ ] Confirmar frecuencia de cada 10 minutos.
- [ ] Confirmar que el activador se ejecuta desde `tareas@alia-data.com`.
- [ ] Verificar la primera ejecución automática.
- [ ] Confirmar que la ejecución finaliza correctamente.

### 5. Tratamiento de mensajes pendientes — estimación: 1 minuto

- [ ] Identificar mensajes que hayan quedado pendientes durante la reversión.
- [ ] Evitar el reprocesamiento de correos que ya hayan generado filas.
- [ ] Mover los mensajes problemáticos a `Revisión manual`, cuando la etiqueta exista.
- [ ] No eliminar mensajes.

### 6. Registro de la incidencia

- [ ] Documentar la incidencia en `auditoria/INCIDENCIAS.md`.
- [ ] Registrar causa, impacto, acciones realizadas y resultado.
- [ ] Actualizar `auditoria/CHANGELOG.md`.
- [ ] Registrar la decisión de reversión en `auditoria/DECISIONES.md`.
- [ ] No reintentar el despliegue hasta identificar y corregir la causa.

---

## Restauración de datos — solo si hubo filas afectadas

- [ ] Abrir la copia de respaldo de la planilla.
- [ ] Crear un respaldo adicional del estado actual antes de modificar datos.
- [ ] Comparar las hojas afectadas.
- [ ] Identificar las filas incorrectas o faltantes.
- [ ] Restaurar únicamente las filas afectadas.
- [ ] No eliminar información sin respaldo previo.
- [ ] Registrar las filas modificadas y el motivo.

---

## Criterio de éxito de la reversión

La reversión se considerará satisfactoria cuando:

- [ ] el código anterior esté restaurado;
- [ ] el manifiesto anterior esté restaurado;
- [ ] la propiedad `OPENAI_API_KEY` continúe disponible;
- [ ] el activador esté activo y configurado cada 10 minutos;
- [ ] una prueba manual finalice correctamente;
- [ ] la primera ejecución automática finalice correctamente;
- [ ] no se generen filas duplicadas;
- [ ] no se pierdan mensajes;
- [ ] la incidencia quede documentada.

---

## Resultado de la verificación de la Fase 0

```text
Prueba realizada: Verificación documental de disponibilidad y consistencia
Resultado: Satisfactorio
Tiempo estimado de reversión: Menor de 15 minutos
Restauración real ejecutada: No
Entorno productivo modificado: No
Activador productivo desactivado: No
```
