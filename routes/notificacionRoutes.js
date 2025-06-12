// routes/notificacionRoutes.js
const express = require('express');
const notificacionController = require('../controllers/notificacionController');
const authMiddleware = require('../middleware/authMiddleware'); // Asegúrate que la ruta a tu middleware es correcta

const router = express.Router();

// Todas las rutas de notificaciones estarán protegidas, requieren autenticación
router.use(authMiddleware.verifyToken);

// GET /api/notificaciones - Listar notificaciones para el usuario logueado
router.get('/', notificacionController.getMisNotificaciones);

// PATCH /api/notificaciones/:idNotificacion/marcar-leida - Marcar una notificación específica como leída
router.patch('/:idNotificacion/marcar-leida', notificacionController.marcarNotificacionComoLeida);

// (Opcional, para después si quieres)
// POST /api/notificaciones/marcar-todas-leidas - Marcar todas las no leídas como leídas
 router.post('/marcar-todas-leidas', notificacionController.marcarTodasComoLeidas);

module.exports = router;