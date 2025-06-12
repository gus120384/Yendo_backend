// routes/pedidoRoutes.js
const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// --- Rutas de Pedidos ---

// Todas las rutas bajo /api/pedidos requieren autenticación
router.use(authMiddleware.verifyToken);

router.route('/')
  .post(
    roleMiddleware.restrictTo('cliente'), // Solo clientes pueden crear
    pedidoController.createPedido
  )
  .get(
    pedidoController.getAllPedidos // Todos los roles autenticados pueden listar (con filtros por rol)
  );

router.route('/:id')
  .get(
    pedidoController.getPedidoById // Lógica de acceso dentro del controlador
  )
  .patch(
    pedidoController.updatePedido // Lógica de actualización por rol dentro del controlador
  )
  .delete( // NUEVA RUTA para borrado lógico
    roleMiddleware.restrictTo('administrador', 'admin_prime'), // Solo admins pueden "eliminar"
    pedidoController.deletePedido
  );
  router.post(
    '/:id/aceptar',
    authMiddleware.verifyToken,
    roleMiddleware.restrictTo('tecnico', 'administrador'),
    pedidoController.aceptarPedido
);

// Ruta para RECHAZAR un pedido propuesto
router.post(
    '/:id/rechazar',
    authMiddleware.verifyToken,
    roleMiddleware.restrictTo('tecnico', 'administrador'),
    pedidoController.rechazarPedido
);


module.exports = router;