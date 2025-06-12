// middleware/socketAuth.js - VERSIÓN LIMPIA Y FINAL

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User } = require('../models');

const verifyTokenSocket = async (token) => {
  if (!token) {
    throw new Error('Token no proporcionado.');
  }

  try {
    // 1. Verificar el token y obtener el ID del usuario
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 2. Encontrar al usuario en la base de datos
    const currentUser = await User.findByPk(decoded.id, {
      attributes: ['id', 'rol', 'nombre', 'apellido', 'activo']
    });

    // 3. Comprobar si el usuario existe y está activo
    if (!currentUser || !currentUser.activo) {
      throw new Error('El usuario no existe o no está activo.');
    }
    
    // 4. Devolver el usuario limpio para adjuntarlo al socket
    const userForSocket = currentUser.toJSON();
    delete userForSocket.password; 
    
    return userForSocket;

  } catch (error) {
    // Manejar errores comunes de JWT de forma más específica
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido.');
    }
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado.');
    }
    // Re-lanzar cualquier otro error
    throw error;
  }
};

module.exports = verifyTokenSocket;