// backend/controllers/assignmentController.js - VERSIÓN CON SINTAXIS CORREGIDA

const { User, Pedido } = require('../models');
const { Op } = require('sequelize');

exports.findAndProposeTask = async (pedido, req) => {
  try {
    console.log(`Buscando NUEVO candidato para Pedido #${pedido.id} en zona: ${pedido.zona_pedido}`);

    // Construimos la cláusula 'where' de forma segura
    const whereClause = {
      activo: true,
      zonas_cobertura: {
        [Op.contains]: [pedido.zona_pedido]
      },
      [Op.or]: [
        { rol: 'tecnico', administrador_id: null },
        { rol: 'administrador' }
      ],
      // ¡LA CONDICIÓN CLAVE! Excluimos a quienes ya rechazaron.
      // Nos aseguramos de que 'pedido.usuarios_que_rechazaron' sea un array.
      id: {
        [Op.notIn]: pedido.usuarios_que_rechazaron || []
      }
    };

    const candidatos = await User.findAll({
      where: whereClause
    });

    if (candidatos.length === 0) {
      console.log(`No se encontraron NUEVOS candidatos para la zona ${pedido.zona_pedido}.`);
      // Opcional: Notificar al admin_prime que no hay más técnicos disponibles
      const io = req.app.get('socketio');
      // await notificationService.crearNotificacionParaRoles(['admin_prime'], { ... }, io);
      return;
    }

    const candidatoElegido = candidatos[0];
    console.log(`Nuevo candidato elegido: ${candidatoElegido.rol} ID #${candidatoElegido.id} (${candidatoElegido.nombre})`);

    // Actualizamos el pedido con la nueva propuesta
    pedido.estado = 'pendiente_aceptacion';
    if (candidatoElegido.rol === 'tecnico') {
      pedido.tecnico_propuesto_id = candidatoElegido.id;
    } else if (candidatoElegido.rol === 'administrador') {
      pedido.servicio_tecnico_propuesto_id = candidatoElegido.id;
    }
    
    await pedido.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`user_${candidatoElegido.id}`).emit('nuevo_pedido_disponible', pedido);
      console.log(`Notificación de nuevo pedido enviada al usuario ${candidatoElegido.id}`);
    }

  } catch (error) {
    console.error(`Error en el proceso de auto-asignación para el pedido #${pedido.id}:`, error);
  }
};