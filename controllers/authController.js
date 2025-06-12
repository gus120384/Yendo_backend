// controllers/authController.js
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
require('dotenv').config();

// --- Función para generar un token JWT (Sintaxis Corregida) ---
const generateToken = (id, rol) => {
  console.log('Generando token para ID:', id, 'Rol:', rol);
  // La sintaxis correcta es: payload, secret, options
  return jwt.sign(
    { id, rol, jti: uuidv4() }, // Payload
    process.env.JWT_SECRET,        // Secret
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Options Object
  );
};

// --- Controlador para REGISTRO de Usuarios (con Hashing Explícito) ---
exports.register = async (req, res, next) => {
  console.log("Intento de Registro - Body:", req.body);
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      telefono,
      rol,
      direccion_calle,
      direccion_numero,
      direccion_ciudad,
      direccion_provincia,
      direccion_cp,
    } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return next(new AppError('Nombre, apellido, email y contraseña son requeridos.', 400));
    }

    if (password.length < 8) {
      return next(new AppError('La contraseña debe tener al menos 8 caracteres.', 400));
    }
    
    // ===== CAMBIO CLAVE: Hashear la contraseña aquí mismo =====
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const nuevoUsuario = await User.create({
      nombre,
      apellido,
      email,
      password: hashedPassword, // Guardamos la contraseña ya hasheada
      telefono,
      rol: rol || 'cliente',
      direccion_calle,
      direccion_numero,
      direccion_ciudad,
      direccion_provincia,
      direccion_cp,
      activo: true,
    });
    console.log("Usuario creado en BD, ID:", nuevoUsuario.id);

    const token = generateToken(nuevoUsuario.id, nuevoUsuario.rol);
    const userResponse = nuevoUsuario.toJSON();
    delete userResponse.password;

    console.log("Registro exitoso para:", nuevoUsuario.email);
    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente.',
      token,
      data: {
        user: userResponse,
      },
    });

  } catch (error) {
    console.error("Error durante el registro:", error.name, error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
        return next(new AppError(`El email '${req.body.email}' ya está registrado. Por favor, elige otro.`, 400));
    }
    if (error.name === 'SequelizeValidationError') {
        const firstErrorMessage = (error.errors && error.errors.length > 0) 
                                  ? error.errors[0].message 
                                  : "Error de validación.";
        return next(new AppError(firstErrorMessage, 400));
    }
    next(error); 
  }
};

// --- Controlador para LOGIN de Usuarios (Este ya estaba bien, no se toca) ---
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt - Email:', email, 'Password:', password ? '****** (presente)' : ' (ausente)');

    if (!email || !password) {
      return next(new AppError('Por favor, ingrese email y contraseña.', 400));
    }

    const user = await User.scope('withPassword').findOne({ where: { email } });
    console.log('Usuario encontrado (post-scope):', user ? { id: user.id, email: user.email, rol: user.rol, activo: user.activo, password_presente: !!user.password } : null);

    if (!user) {
        console.log('Login error: Usuario no encontrado con email:', email);
        return next(new AppError('Credenciales incorrectas.', 401)); // Mensaje más genérico por seguridad
    }
    
    if (typeof user.password === 'undefined' || user.password === null) {
        console.error('ERROR CRÍTICO DE CONFIGURACIÓN: user.password es null DESPUÉS de usar scope("withPassword") para el usuario:', user.id, user.email);
        return next(new AppError('Error de configuración interna del usuario. Contacte al administrador.', 500));
    }

    // El método validarPassword debe usar bcrypt.compare internamente
    const isPasswordCorrect = await user.validarPassword(password);
    console.log('¿Contraseña correcta?:', isPasswordCorrect);

    if (!isPasswordCorrect) {
      console.log('Login error: Contraseña incorrecta para email:', email);
      return next(new AppError('Credenciales incorrectas.', 401)); // Mensaje más genérico por seguridad
    }

    if (!user.activo) {
        console.log('Login error: Usuario inactivo:', email);
        return next(new AppError('Esta cuenta de usuario ha sido desactivada.', 403));
    }

    console.log('Login exitoso para usuario ID:', user.id);
    
    const token = generateToken(user.id, user.rol);
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(200).json({
      status: 'success',
      message: 'Inicio de sesión exitoso.',
      token,
      data: {
        user: userResponse,
      },
    });

  } catch (error) {
    console.error('Error en el controlador de login:', error);
    next(error); 
  }
};


// --- Controlador para ACTUALIZAR LA CONTRASEÑA (con Hashing Explícito) ---
exports.updateMyPassword = async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return next(new AppError('No estás autenticado o tu sesión es inválida.', 401));
    }
    const userId = req.user.id; 
    const { passwordCurrent, password, passwordConfirm } = req.body;
    console.log(`Intento de actualizar contraseña para usuario ID: ${userId}`);

    try {
        if (!passwordCurrent || !password || !passwordConfirm) {
            return next(new AppError('Por favor, proporciona la contraseña actual, la nueva contraseña y la confirmación.', 400));
        }

        const user = await User.scope('withPassword').findByPk(userId);
        if (!user) {
            return next(new AppError('Usuario no encontrado o sesión inválida.', 401));
        }

        if (!(await user.validarPassword(passwordCurrent))) {
            return next(new AppError('Contraseña actual incorrecta.', 401));
        }

        if (password !== passwordConfirm) {
            return next(new AppError('La nueva contraseña y su confirmación no coinciden.', 400));
        }
        if (password.length < 8) {
            return next(new AppError('La nueva contraseña debe tener al menos 8 caracteres.', 400));
        }
        if (password === passwordCurrent) {
            return next(new AppError('La nueva contraseña no puede ser igual a la contraseña actual.', 400));
        }

        // ===== CAMBIO CLAVE: Hashear la nueva contraseña antes de guardarla =====
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save(); 
        
        console.log(`Contraseña actualizada exitosamente para usuario ID: ${userId}`);

        const newToken = generateToken(user.id, user.rol);

        res.status(200).json({
            status: 'success',
            message: 'Contraseña actualizada exitosamente.',
            token: newToken,
        });

    } catch (error) {
        console.error('Error en updateMyPassword:', error.name, error.message);
        next(error); 
  }
};