// middleware/roleMiddleware.js

// Middleware para restringir el acceso a ciertos roles
// ...roles es un rest parameter, que permite pasar múltiples argumentos de roles
exports.restrictTo = (...rolesPermitidos) => {
  return (req, res, next) => {
    // req.user y req.user.rol deberían haber sido establecidos por el middleware verifyToken
    if (!req.user || !req.user.rol) {
      // Esto no debería suceder si verifyToken se ejecutó correctamente
      // y adjuntó un usuario con un rol.
      return res.status(500).json({
        status: 'error',
        message: 'Error de configuración: rol de usuario no definido después de la autenticación.'
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ // 403 Forbidden
        status: 'fail',
        message: 'No tienes permiso para realizar esta acción.',
      });
    }

    // Si el rol del usuario está en la lista de roles permitidos, continuar.
    next();
  };
};

// Podrías tener helpers más específicos si lo prefieres, por ejemplo:
/*
exports.isCliente = (req, res, next) => {
  if (req.user && req.user.rol === 'cliente') {
    return next();
  }
  return res.status(403).json({ status: 'fail', message: 'Acceso restringido a clientes.' });
};

exports.isTecnico = (req, res, next) => {
  if (req.user && req.user.rol === 'tecnico') {
    return next();
  }
  return res.status(403).json({ status: 'fail', message: 'Acceso restringido a técnicos.' });
};

exports.isAdministrador = (req, res, next) => {
  if (req.user && (req.user.rol === 'administrador' || req.user.rol === 'admin_prime')) {
    return next();
  }
  return res.status(403).json({ status: 'fail', message: 'Acceso restringido a administradores.' });
};
*/