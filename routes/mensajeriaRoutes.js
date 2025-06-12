// routes/mensajeriaRoutes.js
const express = require('express');
const mensajeriaController = require('../controllers/mensajeriaController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.verifyToken);

// --- Rutas Relacionadas a Mensajes dentro de un Pedido ---
router.post('/pedidos/:pedidoId/mensajes', mensajeriaController.enviarMensajeEnPedido);
router.get('/pedidos/:pedidoId/mensajes', mensajeriaController.getMensajesDePedido);

// --- Rutas Generales de Conversaciones ---
// GET /api/mensajeria/me - Listar las conversaciones del usuario autenticado
router.get('/me', mensajeriaController.getMisConversaciones); // <--- RUTA ACTIVADA (asume prefijo /api/mensajeria)

// GET /api/conversaciones/:conversacionId/mensajes - Obtener mensajes de una conversación específica
// (Lo implementaremos después, la ruta podría ser /:conversacionId/mensajes si el prefijo es /api/mensajeria)
// router.get('/:conversacionId/mensajes', mensajeriaController.getMensajesDeConversacionEspecifica);


module.exports = router;