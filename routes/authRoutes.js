// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Importamos el controlador
const authMiddleware = require('../middleware/authMiddleware'); // Asegúrate de que esté importado

// --- Rutas de Autenticación ---

// POST /api/auth/register
// Ruta para registrar un nuevo usuario
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// PATCH /api/auth/updateMyPassword
// Permite al usuario logueado cambiar su propia contraseña.
router.patch(
    '/updateMyPassword',
    authMiddleware.verifyToken, // El usuario debe estar autenticado
    authController.updateMyPassword // Nuevo controlador para actualizar contraseña
);

// (Opcional) Podrías añadir más rutas relacionadas con la autenticación aquí,
// como /forgot-password, /reset-password, /verify-email, etc.

module.exports = router; // Exportamos el router