// utils/appError.js

class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Llama al constructor de la clase base (Error)

    this.statusCode = statusCode; // Código de estado HTTP (ej. 400, 404, 500)
    // Determina el 'status' ('fail' para errores 4xx, 'error' para 5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Marcamos este error como "operacional" (un problema esperado, no un bug de programación)
    // Esto es útil para decidir si reiniciar la app o solo enviar una respuesta al cliente.
    this.isOperational = true;

    // Captura el stack trace, excluyendo la llamada al constructor de AppError
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;