# Matriz de permisos y accesos

Basada en la sección 7 del plan v3.

## Por actor

| Recurso / Acción | Claude Cowork | Cuenta operativa (`tareas@alia-data.com`) | Rubén |
|---|---|---|---|
| Carpeta local del proyecto | Lectura, creación y edición de archivos | — | Total |
| Otras carpetas del equipo | **Sin acceso** | — | Total |
| Leer correos | No | Sí | Sí |
| Crear/aplicar etiquetas | No | Sí (con aprobación) | Aprueba |
| Archivar mensajes | No | Sí (con aprobación) | Aprueba |
| Editar hojas de destino | No | Sí (con aprobación) | Aprueba |
| Editar proyecto Apps Script | No (genera código local) | Sí | Copia y ejecuta |
| Activadores | No | Sí (con aprobación) | Aprueba |
| Credenciales (`OPENAI_API_KEY`) | **Nunca** | Solo en propiedades del script | Administra |
| Habilitar Gmail API / alcances OAuth | No | Sí (con aprobación) | Aprueba |

## Alcances de Apps Script requeridos (a autorizar en Fase 9)

- Gmail (lectura, etiquetas, archivado)
- Servicio avanzado de Gmail — Gmail API (`https://www.googleapis.com/auth/gmail.modify`)
- Google Sheets
- Propiedades del script
- Llamadas HTTP externas (`UrlFetchApp` → OpenAI)
- `LockService`
- Utilidades de fecha y formato

## Acciones que siempre requieren aprobación explícita de Rubén

Desactivar/crear activadores; reemplazar el script productivo; modificar hojas productivas; crear/eliminar/renombrar etiquetas; archivar mensajes reales; eliminar o mover filas; pruebas con correos reales; cambios de permisos u OAuth; uso de credenciales; despliegues; reactivación de la automatización.
