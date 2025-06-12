// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User } = require('../models'); // Ruta correcta desde middleware/
const AppError = require('../utils/appError'); // Ruta correcta desde middleware/
require('dotenv').config(); // Para process.env.JWT_SECRET

// TU FUNCIÓN verifyToken EXISTENTE (PARA RUTAS HTTP)
// Asegúrate de que esta función esté definida y use 'exports.verifyToken' o una constante
const verifyToken = async (req, res, next) => { // Si la defines como constante
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('No estás autenticado. Por favor, inicia sesión para obtener acceso.', 401));
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'passwordChangedAt', 'passwordResetToken', 'passwordResetExpires'] }
    });

    if (!currentUser) {
      return next(new AppError('El usuario propietario de este token ya no existe.', 401));
    }
    if (!currentUser.activo) {
        return next(new AppError('Tu cuenta ha sido desactivada. No puedes realizar esta acción.', 403));
    }
    if (currentUser.passwordChangedAt) {
        const passwordChangedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
        if (decoded.iat < passwordChangedTimestamp) {
            return next(new AppError('Contraseña cambiada recientemente. Por favor, inicia sesión de nuevo.', 401));
        }
    }
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido. Por favor, inicia sesión de nuevo.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 401));
    }
    console.error('Error en verifyToken middleware:', error);
    return next(new AppError('Algo salió mal al verificar la autenticación.', 500));
  }
};

// TU FUNCIÓN restrictTo EXISTENTE
// Asegúrate de que esta función esté definida y use 'exports.restrictTo' o una constante
const restrictTo = (...roles) => { // Si la defines como constante
  return (req, res, next) => {
    if (!req.user || !req.user.rol) { // Añadida verificación de req.user
        return next(new AppError('Autenticación requerida para esta acción.', 401));
    }
    if (!roles.includes(req.user.rol)) {
      return next(
        new AppError('No tienes permiso para realizar esta acción.', 403)
      );
    }
    next();
  };
};

// NUEVA FUNCIÓN PARA AUTENTICAR SOCKETS
const verifyTokenSocket = async (token) => {
  if (!token) {
    throw new Error('Token no proporcionado.');
  }
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id, {
      attributes: ['id', 'rol', 'nombre', 'apellido', 'activo', 'passwordChangedAt']
    });
    if (!currentUser) {
      throw new Error('El usuario perteneciente a este token ya no existe.');
    }
    if (!currentUser.activo) {
        throw new Error('El usuario perteneciente a este token no está activo.');
    }
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        throw new Error('Contraseña cambiada recientemente. Por favor, inicie sesión de nuevo.');
      }
    }
    const userForSocket = currentUser.toJSON();
    delete userForSocket.password;
    delete userForSocket.passwordChangedAt;
    return userForSocket; 
  } catch (error) {
    if (error.name === 'JsonWebTokenError') throw new Error('Token inválido.');
    if (error.name === 'TokenExpiredError') throw new Error('Token expirado.');
    throw error; 
  }
};

// EXPORTAR TODAS LAS FUNCIONES
module.exports = {
  verifyToken,      // Ahora 'verifyToken' es una constante definida arriba
  restrictTo,       // Ahora 'restrictTo' es una constante definida arriba
  verifyTokenSocket 
};