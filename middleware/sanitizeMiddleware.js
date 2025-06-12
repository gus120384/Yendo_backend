// middleware/sanitizeMiddleware.js
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Crea una instancia de JSDOM para simular un entorno de navegador.
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Función recursiva para sanitizar datos
function sanitizeData(data) {
  // Si el dato es nulo o indefinido, no hay nada que sanitizar
  if (data === null || data === undefined) { // <--- CORREGIDO
    return data;
  }

  // Si es un string, sanitízalo
  if (typeof data === 'string') {
    // Por defecto, DOMPurify.sanitize(data) es bastante seguro.
    // Si NO esperas NADA de HTML en tus entradas y quieres que todo se convierta a texto plano,
    // podrías usar: DOMPurify.sanitize(data, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    // Por ahora, usaremos la configuración por defecto o una que permita HTML seguro básico.
    return DOMPurify.sanitize(data, { USE_PROFILES: { html: true } });
  }

  // Si es un array, itera y sanitiza cada elemento
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Si es un objeto (pero no un array ni null), itera sobre sus propiedades
  if (typeof data === 'object') {
    const sanitizedObject = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitizedObject[key] = sanitizeData(data[key]);
      }
    }
    return sanitizedObject;
  }

  // Si no es string, array, u objeto (ej. número, booleano), devuélvelo como está
  return data;
}

// El middleware de Express
const sanitizeInputMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeData(req.body);
  }
  if (req.query) {
    req.query = sanitizeData(req.query);
  }
  if (req.params) {
    req.params = sanitizeData(req.params);
  }
  next();
};

module.exports = sanitizeInputMiddleware;