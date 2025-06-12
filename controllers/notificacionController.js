// controllers/notificacionController.js
const { Notificacion } = require('../models');
const AppError = require('../utils/appError');

// Controlador para OBTENER las notificaciones del usuario logueado
exports.getMisNotificaciones = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    
    // Parsear page y limit al principio
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { leida } = req.query; // leida es string 'true', 'false', o undefined

    const whereClause = {
      usuario_id: usuarioId,
    };

    if (leida === 'true' || leida === 'false') {
      whereClause.leida = leida === 'true';
    }

    const offset = (page - 1) * limit;

    const { count, rows: notificaciones } = await Notificacion.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: limit, // Usar variable parseada
      offset: offset,
    });

    res.status(200).json({
      status: 'success',
      results: notificaciones.length,
      totalResults: count,
      totalPages: Math.ceil(count / limit), // Usar variable parseada
      currentPage: page, // Usar variable parseada
      data: {
        notificaciones,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controlador para MARCAR UNA NOTIFICACIÓN COMO LEÍDA
exports.marcarNotificacionComoLeida = async (req, res, next) => {
  try {
    // Parsear idNotificacion y validar que sea un número
    const idNotificacion = parseInt(req.params.idNotificacion, 10);
    if (isNaN(idNotificacion)) {
        return next(new AppError('El ID de la notificación debe ser un número válido.', 400));
    }
    
    const usuarioId = req.user.id;

    const notificacion = await Notificacion.findOne({
      where: {
        id: idNotificacion, // Usar variable parseada
        usuario_id: usuarioId,
      },
    });

    if (!notificacion) {
      return next(new AppError('Notificación no encontrada o no te pertenece.', 404));
    }

    if (notificacion.leida) {
      return res.status(200).json({
        status: 'success',
        message: 'La notificación ya estaba marcada como leída.',
        data: {
          notificacion,
        },
      });
    }

    notificacion.leida = true;
    await notificacion.save();

    res.status(200).json({
      status: 'success',
      message: 'Notificación marcada como leída.',
      data: {
        notificacion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controlador para MARCAR TODAS LAS NOTIFICACIONES NO LEÍDAS COMO LEÍDAS
exports.marcarTodasComoLeidas = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    const [numeroDeFilasAfectadas] = await Notificacion.update(
      { leida: true },
      {
        where: {
          usuario_id: usuarioId,
          leida: false,
        },
      }
    );

    res.status(200).json({
      status: 'success',
      message: `Se marcaron ${numeroDeFilasAfectadas} notificaciones como leídas.`,
      data: {
        notificacionesAfectadas: numeroDeFilasAfectadas
      }
    });
  } catch (error) {
    next(error);
  }
};