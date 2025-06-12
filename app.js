// app.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const sanitizeInputMiddleware = require('./middleware/sanitizeMiddleware');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');
const mensajeriaRoutes = require('./routes/mensajeriaRoutes'); // <--- AÑADIDO: Importar rutas de mensajería

const app = express();

// === MIDDLEWARES GLOBALES ===
app.use(helmet());

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://localhost:5173',
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Este origen no está permitido por la política CORS.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Demasiadas peticiones realizadas desde esta IP. Por favor, intenta de nuevo después de 15 minutos.'
  }
});
app.use('/api', apiLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(mongoSanitize());
app.use(sanitizeInputMiddleware);

app.use(hpp({
  whitelist: [
    // Añade aquí los parámetros que permites duplicar en la query string si es necesario
  ]
}));


// === RUTAS DE LA APLICACIÓN ===
app.get('/api', (req, res) => {
    res.status(200).json({ message: '¡Bienvenido a la API de TecniGo!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/mensajeria', mensajeriaRoutes); // <--- AÑADIDO: Usar rutas de mensajería.
                                  // Dado que en mensajeriaRoutes.js tienes rutas como '/pedidos/:pedidoId/mensajes',
                                  // el prefijo '/api' aquí es correcto para que la URL final sea /api/pedidos/:pedidoId/mensajes.


// === MANEJO DE RUTAS NO ENCONTRADAS (404) ===
app.use((req, res, next) => {
  const err = new Error(`No se pudo encontrar la ruta ${req.originalUrl} en este servidor.`);
  err.status = 'fail';
  err.statusCode = 404;
  next(err);
});

// === MANEJADOR DE ERRORES GLOBAL ===
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || (err.statusCode >= 500 ? 'error' : 'fail');

  if (process.env.NODE_ENV !== 'test' || err.statusCode >= 500) {
    console.error('ERROR CAPTURADO 💥:', {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      stack: (process.env.NODE_ENV === 'development' && err.statusCode >=500 && !err.isOperational) ? err.stack : undefined
    });
  }

  let displayMessage = err.message;
  const displayStatus = err.status;

  if (err.name === 'SequelizeValidationError') {
    err.statusCode = 400;
    displayMessage = (err.errors && err.errors.length > 0) ? err.errors[0].message : "Error de validación de datos.";
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    err.statusCode = 400;
    const field = err.errors && err.errors[0] ? err.errors[0].path : 'El dato';
    displayMessage = `El valor para el campo '${field}' ya existe. Por favor, elige otro.`;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    err.statusCode = 400;
    displayMessage = `Error de referencia: Uno de los identificadores proporcionados no existe o no se puede establecer la relación.`;
  } else if (err.name === 'SequelizeDatabaseError' && err.original && err.original.code === '22P02') {
    err.statusCode = 400;
    displayMessage = 'Uno de los identificadores o datos proporcionados tiene un formato inválido.';
  } else if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    displayMessage = 'Token de autenticación inválido. Por favor, inicie sesión nuevamente.';
  } else if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    displayMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
  } else if (err.message && err.message.includes('Este origen no está permitido por la política CORS.')) {
    err.statusCode = 403;
  } else if (err.message && err.message.includes('No estás autenticado')) {
      err.statusCode = 401;
  } else if (err.message && (err.message.includes('no te pertenece') || err.message.includes('No tienes permiso'))) {
      err.statusCode = 403;
  }

  if (process.env.NODE_ENV === 'production' && err.statusCode === 500 && !err.isOperational) {
    displayMessage = 'Ha ocurrido un error inesperado en el servidor. Por favor, intente más tarde.';
  }

  res.status(err.statusCode).json({
    status: displayStatus,
    message: displayMessage
  });
});

module.exports = app;