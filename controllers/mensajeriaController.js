const { Pedido, User, Conversacion, Mensaje } = require('../models');
const AppError = require('../utils/appError');
const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');

// --- ENVIAR MENSAJE EN UN PEDIDO ---
exports.enviarMensajeEnPedido = catchAsync(async (req, res, next) => {
    const { pedidoId } = req.params;
    const { contenido } = req.body;
    const emisor = req.user; // Usamos el objeto de usuario completo de la autenticación

    if (!contenido || contenido.trim() === '') {
        return next(new AppError('El contenido del mensaje no puede estar vacío.', 400));
    }

    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) {
        return next(new AppError('Pedido no encontrado.', 404));
    }

    const esClienteDelPedido = emisor.rol === 'cliente' && pedido.cliente_id === emisor.id;
    const esTecnicoDelPedido = emisor.rol === 'tecnico' && pedido.tecnico_id === emisor.id;
    const esAdmin = emisor.rol.includes('administrador');

    if (!esClienteDelPedido && !esTecnicoDelPedido && !esAdmin) {
        return next(new AppError('No tienes permiso para enviar mensajes en este pedido.', 403));
    }

    if (esClienteDelPedido && !pedido.tecnico_id) {
        return next(new AppError('Este pedido aún no tiene un técnico asignado.', 400));
    }

    const [conversacion] = await Conversacion.findOrCreate({
        where: { pedido_id: pedidoId },
        defaults: { creador_usuario_id: emisor.id, titulo: `Conversación Pedido #${pedidoId}` },
    });

    const nuevoMensaje = await Mensaje.create({
        conversacion_id: conversacion.id,
        emisor_usuario_id: emisor.id,
        contenido: contenido.trim()
    });

    conversacion.ultimo_mensaje_enviado_at = nuevoMensaje.created_at;
    await conversacion.save();
    
    // --- LÓGICA DE SOCKET.IO MEJORADA ---
    const io = req.app.get('socketio');
    if (io) {
        // Construimos el objeto del mensaje para el socket a mano
        // para garantizar que la información del emisor es la correcta.
        const mensajeParaSocket = {
            id: nuevoMensaje.id,
            contenido: nuevoMensaje.contenido,
            created_at: nuevoMensaje.created_at,
            emisor: {
                id: emisor.id,
                nombre: emisor.nombre,
                apellido: emisor.apellido,
                rol: emisor.rol
            }
        };

        const notificacionPayload = {
            tipo_notificacion: 'NUEVO_MENSAJE_PEDIDO',
            metadata: {
                pedidoId: parseInt(pedidoId),
                mensajeReal: mensajeParaSocket 
            }
        };

        const clienteRoom = `user_${pedido.cliente_id}`;
        const tecnicoRoom = `user_${pedido.tecnico_id}`;

        io.to(clienteRoom).emit('nueva_notificacion', notificacionPayload);
        if (pedido.tecnico_id) {
            io.to(tecnicoRoom).emit('nueva_notificacion', notificacionPayload);
        }

        
    }
    
    // Devolvemos el mismo objeto que enviamos por el socket para consistencia
    // Esto es especialmente útil para que el remitente vea su propio mensaje inmediatamente
    const mensajeParaRespuesta = {
        id: nuevoMensaje.id,
        contenido: nuevoMensaje.contenido,
        created_at: nuevoMensaje.created_at,
        emisor: {
            id: emisor.id,
            nombre: emisor.nombre,
            apellido: emisor.apellido,
            rol: emisor.rol
        }
    };

    res.status(201).json({ status: 'success', data: { mensaje: mensajeParaRespuesta } });
});


// --- OBTENER MENSAJES DE UN PEDIDO ---
exports.getMensajesDePedido = catchAsync(async (req, res, next) => {
    const { pedidoId } = req.params;
    const usuarioIdAutenticado = req.user.id;

    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) {
        return next(new AppError('Pedido no encontrado.', 404));
    }

    const esParticipanteValido =
        usuarioIdAutenticado === pedido.cliente_id ||
        usuarioIdAutenticado === pedido.tecnico_id ||
        ['administrador', 'administrador prime'].includes(req.user.rol);

    if (!esParticipanteValido) {
        return next(new AppError('No tienes permiso para ver esta conversación.', 403));
    }

    const conversacion = await Conversacion.findOne({ where: { pedido_id: pedidoId } });

    if (!conversacion) {
        return res.status(200).json({ status: 'success', data: { mensajes: [], totalMensajes: 0 } });
    }

    const { count, rows: mensajes } = await Mensaje.findAndCountAll({
        where: { conversacion_id: conversacion.id },
        include: [{ model: User, as: 'emisor', attributes: ['id', 'nombre', 'apellido', 'rol'] }],
        order: [['created_at', 'ASC']],
    });

    res.status(200).json({ status: 'success', data: { mensajes, totalMensajes: count } });
});


// --- OBTENER MIS CONVERSACIONES ---
exports.getMisConversaciones = catchAsync(async (req, res, next) => {
    const usuarioIdAutenticado = req.user.id;
    const pedidos = await Pedido.findAll({
        where: {
            [Op.or]: [
                { cliente_id: usuarioIdAutenticado },
                { tecnico_id: usuarioIdAutenticado }
            ]
        },
        attributes: ['id']
    });

    if (pedidos.length === 0) {
        return res.status(200).json({ status: 'success', data: { conversaciones: [] } });
    }

    const pedidoIds = pedidos.map(p => p.id);

    const conversaciones = await Conversacion.findAll({
        where: { pedido_id: { [Op.in]: pedidoIds } },
        include: [
            {
                model: Pedido,
                as: 'pedido',
                attributes: ['id', 'descripcion_problema'],
                include: [
                    { model: User, as: 'cliente', attributes: ['id', 'nombre', 'apellido'] },
                    { model: User, as: 'tecnico', attributes: ['id', 'nombre', 'apellido'] }
                ]
            },
            {
                model: Mensaje,
                as: 'mensajes',
                limit: 1,
                order: [['created_at', 'DESC']],
                include: [{ model: User, as: 'emisor', attributes: ['nombre'] }]
            }
        ],
        order: [['ultimo_mensaje_enviado_at', 'DESC']]
    });

    res.status(200).json({ status: 'success', data: { conversaciones } });
});