// CONFIGURACIÓN PRINCIPAL
const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'); // Se configura en las propiedades del script
const NOMBRE_ETIQUETA_PROCESADO = "Procesado";

function procesarCorreosDeTareas() {
  var sheetMaestro = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Obtener o crear la etiqueta 'Procesado' en Gmail
  var etiquetaProcesado;
  try {
    etiquetaProcesado = GmailApp.getUserLabelByName(NOMBRE_ETIQUETA_PROCESADO) || GmailApp.createLabel(NOMBRE_ETIQUETA_PROCESADO);
  } catch(e) {
    Logger.log("Error al manejar la etiqueta: " + e.message);
    return;
  }
  
  // 2. Buscar correos en el inbox que NO tengan la etiqueta 'Procesado'
  // Nota: Esto asume que el script corre en la cuenta tareas@alia-data.com o tiene acceso a ella
  var hilos = GmailApp.search("label:inbox -label:" + NOMBRE_ETIQUETA_PROCESADO);
  
  if (hilos.length === 0) {
    Logger.log("No hay correos nuevos para procesar.");
    return;
  }
  
  // Procesar un máximo de 10 correos por tanda para evitar exceder tiempos de ejecución
  var limite = Math.min(hilos.length, 10);
  
  for (var i = 0; i < limite; i++) {
    var hilo = hilos[i];
    var mensajes = hilo.getMessages();
    var ultimoMensaje = mensajes[mensajes.length - 1]; // Tomamos el último reenvío
    
    var datosCorreo = {
      remitente: ultimoMensaje.getFrom(),
      asunto: ultimoMensaje.getSubject(),
      cuerpo: ultimoMensaje.getPlainBody(),
      fecha: ultimoMensaje.getDate(),
      link: hilo.getPermalink()
    };
    
    // 3. Llamar a la IA para clasificar
    var clasificacionIA = consultarIAClasificadora(datosCorreo);
    
    if (clasificacionIA) {
      // 4. Determinar la pestaña de destino exacta según tu archivo
      var nombreTablero = clasificacionIA.tablero; // Ej: "Desarrollo IT", "Comercial", etc.
      var hojaDestino = sheetMaestro.getSheetByName(nombreTablero);
      
      if (!hojaDestino) {
        // Si la IA devuelve un tablero inexistente, lo enviamos a Gestión General por defecto
        hojaDestino = sheetMaestro.getSheetByName("Gestión General");
        nombreTablero = "Gestión General";
      }
      
      // 5. Preparar la fila con la estructura exacta de tus columnas
      // Estructura: ID, Fecha, Fuente, Grupo origen, Remitente, Asunto, Resumen, Prioridad sugerida IA, Prioridad final, Estado, Responsable, Fecha límite, Link correo, Link Drive, Derivada a, Última actualización, Observaciones
      var fechaHoy = new Date();
      var nuevoId = "ALI-" + Math.floor(Math.random() * 90000 + 10000); // Genera un ID único temporal
      
      var nuevaFila = [
        nuevoId,                               // ID
        Utilities.formatDate(datosCorreo.fecha, Session.getScriptTimeZone(), "dd/MM/yyyy"), // Fecha de entrada
        "Gmail",                               // Fuente
        clasificacionIA.grupo_origen,          // Grupo origen (determinado por IA)
        datosCorreo.remitente,                 // Remitente
        datosCorreo.asunto,                    // Asunto original
        clasificacionIA.resumen,               // Resumen de tarea (IA)
        clasificacionIA.prioridad,             // Prioridad sugerida IA (IA)
        "",                                    // Prioridad final (Vacío para edición manual)
        "Pendiente",                           // Estado (Por defecto)
        clasificacionIA.responsable_sugerido,  // Responsable (IA o Sin asignar)
        clasificacionIA.fecha_limite || "",    // Fecha límite (IA si la encuentra)
        datosCorreo.link,                      // Link al correo
        "",                                    // Link a Drive (Vacío)
        "",                                    // Derivada a (Vacío)
        Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"), // Última actualización
        ""                                     // Observaciones
      ];
      
      // Insertar al final de la hoja correspondiente
      hojaDestino.appendRow(nuevaFila);
      
      // 6. Marcar el hilo como procesado en Gmail para que no se duplique
      hilo.addLabel(etiquetaProcesado);
      hilo.moveToArchive(); // Opcional: archivar para limpiar el inbox
      
      Logger.log("Tarea registrada con éxito en el tablero: " + nombreTablero);
    }
  }
}

// FUNCIÓN QUE CONECTA CON LA API DE OPENAI (GPT-4o-mini)
function consultarIAClasificadora(datosCorreo) {
  var url = "https://api.openai.com/v1/chat/completions";
  
  var systemPrompt = "Eres un Asistente de Operaciones para la empresa Aliadata.\n" +
    "Tu trabajo es analizar correos electrónicos reenviados y extraer información estructurada para un tablero de control en JSON.\n\n" +
    "Debes clasificar la información estrictamente bajo las siguientes reglas:\n" +
    "1. 'tablero': Debe ser exactamente uno de estos valores: 'Finanzas', 'Comercial', 'Soporte', 'Desarrollo IT', 'Gestión General'.\n" +
    "2. 'prioridad': Debe ser exactamente uno de estos valores: 'Crítico', 'Alto', 'Medio', 'Bajo'. Bájate en la urgencia técnica o de negocio.\n" +
    "3. 'grupo_origen': Debe ser uno de estos valores según corresponda: 'Administración', 'Ventas', 'Soporte', 'Desarrollo IT', 'Gestión General'.\n" +
    "4. 'responsable_sugerido': Elige la opción más lógica de esta lista o coloca 'Sin asignar': 'Socio Administración', 'Socio Comercial', 'Responsable Soporte', 'Responsable Técnico', 'Socio Dirección'.\n" +
    "5. 'resumen': Un resumen ejecutivo y accionable de la tarea en una sola frase.\n" +
    "6. 'fecha_limite': Si el correo menciona explícitamente una fecha de vencimiento, colócala en formato DD/MM/YYYY. Si no, devuelve null.\n\n" +
    "Responde EXCLUSIVAMENTE con el objeto JSON estructurado, sin textos adicionales ni formato markdown.";

  var userContent = "Asunto: " + datosCorreo.asunto + "\nRemitente: " + datosCorreo.remitente + "\nCuerpo del mensaje:\n" + datosCorreo.cuerpo;

  var payload = {
    "model": "gpt-4o-mini", // Modelo sumamente económico y rápido para procesamiento de texto
    "messages": [
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": userContent}
    ],
    "response_format": { "type": "json_object" }, // Forzar salida JSON limpia
    "temperature": 0.2
  };

  var options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + OPENAI_API_KEY,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    if (json.choices && json.choices.length > 0) {
      var resultadoIA = JSON.parse(json.choices[0].message.content);
      return resultadoIA;
    } else {
      Logger.log("Error en la respuesta de la IA: " + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log("Error de conexión con la API: " + e.toString());
    return null;
  }
}