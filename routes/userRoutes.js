// routes/userRoutes.js - VERSIÓN CORREGIDA Y REFACTORIZADA

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ===================================================
// --- RUTAS PÚBLICAS DEL USUARIO (Su propio perfil) ---
// ===================================================
// Todas las rutas aquí debajo requieren que el usuario esté autenticado.
router.use(authMiddleware.verifyToken);

// GET /api/users/me -> Obtener perfil del usuario logueado
router.get('/me', userController.getMe);

// PATCH /api/users/me -> Actualizar perfil del usuario logueado
router.patch('/me', userController.updateMe);


// ===============================================
// --- RUTAS DE ADMINISTRACIÓN DE OTROS USUARIOS ---
// ===============================================
// Todas las rutas aquí debajo requieren rol de 'administrador' o 'admin_prime'.
router.use('/admin', roleMiddleware.restrictTo('administrador', 'admin_prime'));

// GET /api/users/admin -> Listar todos los usuarios (con filtros)
// POST /api/users/admin -> Crear un nuevo usuario
router.route('/admin')
    .get(userController.getAllUsersForAdmin)
    .post(userController.createUserByAdmin);

// --- Rutas para un usuario específico por ID ---

// GET /api/users/admin/:id -> Obtener un usuario
// PATCH /api/users/admin/:id -> Actualizar un usuario
// DELETE /api/users/admin/:id -> Desactivar (soft delete) un usuario
router.route('/admin/:id')
    .get(userController.getUserByIdForAdmin)
    .patch(userController.updateUserByAdmin)
    .delete(userController.deleteUserByAdmin); // <--- AHORA DELETE APUNTA A TU FUNCIÓN CORRECTA

// PATCH /api/users/admin/:id/password -> Actualizar contraseña de un usuario
router.patch('/admin/:id/password', userController.adminUpdateUserPassword);

// PATCH /api/users/admin/:id/reactivate -> Reactivar un usuario
router.patch('/admin/:id/reactivate', userController.reactivateUserByAdmin);
router.patch(
  '/admin/:id/update-password',
    authMiddleware.verifyToken,
    roleMiddleware.restrictTo('admin_prime', 'administrador'),
    userController.adminUpdateUserPassword // Reutilizaremos esta función si ya la tienes.
); 

module.exports = router;