// services/notificationService.js - VERSIÓN FINAL CON CORRECCIÓN DE COLUMNA

const { Notificacion, User } = require('../models');

// La función 'crearNotificacion' ahora es la principal y más robusta.
async function crearNotificacion(datosNotificacion, io) {
  // 1. Desestructuramos los datos del objeto que recibimos
  const { 
    usuario_id, 
    tipo, 
    mensaje, 
    pedido_id, 
    emisor_id, 
    url_relacionada,
    transaction
  } = datosNotificacion;

  // 2. Validación de datos esenciales
  if (!usuario_id || !tipo || !mensaje) {
    console.error('Error en crearNotificacion: Faltan datos esenciales (usuario_id, tipo, o mensaje).');
    return null; // Devolvemos null para indicar que no se creó nada
  }

  try {
    // 3. Creamos la notificación en la base de datos
    const notificacion = await Notificacion.create({
      usuario_id,
      tipo_notificacion: tipo, // <-- ¡CORRECCIÓN CLAVE AQUÍ! El modelo espera 'tipo_notificacion'.
      mensaje,
      pedido_id,
      emisor_id,
      url_relacionada,
      leida: false
    }, { transaction });

    // 4. Emitimos el evento de socket si se creó la notificación y 'io' está disponible
    if (notificacion && io) {
      const userRoom = `user_${usuario_id}`;
      const payload = {
        id: notificacion.id,
        tipo: notificacion.tipo_notificacion, // Usamos el nombre correcto de la columna
        mensaje: notificacion.mensaje,
        leida: notificacion.leida,
        createdAt: notificacion.createdAt,
        pedido_id: notificacion.pedido_id,
      };
      io.to(userRoom).emit('nueva_notificacion', payload);
    } else if (!io) {
        console.warn("[notificationService] Socket.IO no está inicializado. No se pudo emitir el evento.");
    }

    return notificacion;
  } catch (error) {
    console.error('Error al crear notificación en notificationService:', error);
    throw error; // Relanzamos el error para que el controlador que lo llamó pueda manejarlo
  }
}

// La función para notificar a roles ahora usa la nueva 'crearNotificacion'
async function crearNotificacionParaRoles(roles, datosNotificacion, io) {
  try {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const usuariosConRol = await User.findAll({
      where: { rol: rolesArray, activo: true },
      attributes: ['id'],
      transaction: datosNotificacion.transaction
    });

    if (usuariosConRol && usuariosConRol.length > 0) {
      await Promise.all(usuariosConRol.map(user => {
        const datosParaUsuario = { ...datosNotificacion, usuario_id: user.id };
        return crearNotificacion(datosParaUsuario, io);
      }));
    }
  } catch (error) {
    console.error('Error al crear notificaciones para roles:', error);
  }
}

module.exports = {
  crearNotificacion,
  crearNotificacionParaRoles,
};