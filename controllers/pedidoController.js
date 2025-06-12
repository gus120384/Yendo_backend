// backend/src/controllers/pedidoController.js - VERSIÓN FINAL Y CORREGIDA

const { Pedido, User } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');
const { findAndProposeTask } = require('./assignmentController');

// --- CREAR Pedido (Sin cambios) ---
exports.createPedido = async (req, res, next) => {
  try {
    const io = req.app.get('socketio');
    const nuevoPedido = await Pedido.create({ 
      ...req.body, 
      cliente_id: req.user.id,
      estado: 'buscando_tecnico'
    });
    await notificationService.crearNotificacion({
      usuario_id: req.user.id,
      tipo: 'PEDIDO_CREADO_CONFIRMACION',
      mensaje: `Tu pedido #${nuevoPedido.id} fue recibido. Estamos buscando al mejor técnico para ti.`
    }, io);
    findAndProposeTask(nuevoPedido, req);
    res.status(201).json({ 
      status: 'success', 
      message: 'Pedido recibido. Estamos buscando un técnico.',
      data: { pedido: nuevoPedido } 
    });
  } catch (error) { 
    next(error); 
  }
};

// --- LISTAR Pedidos (Sin cambios) ---
exports.getAllPedidos = async (req, res, next) => {
  try {
    const { id: userId, rol } = req.user;
    const { page = 1, limit = 10, estado } = req.query;
    let whereConditions = { activo: true };
    if (rol === 'admin_prime') { if (estado) whereConditions.estado = estado; } 
    else if (rol === 'administrador') { whereConditions.servicio_tecnico_id = userId; if (estado) whereConditions.estado = estado; } 
    else if (rol === 'tecnico') { whereConditions.tecnico_id = userId; } 
    else if (rol === 'cliente') { whereConditions.cliente_id = userId; }
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows: pedidos } = await Pedido.findAndCountAll({
      where: whereConditions,
      include: [
        { model: User, as: 'cliente', attributes: ['id', 'nombre', 'apellido', 'email'] },
        { model: User, as: 'tecnico', attributes: ['id', 'nombre', 'apellido', 'email'], required: false },
        { model: User, as: 'servicio_tecnico', attributes: ['id', 'nombre', 'apellido'], required: false }
      ],
      limit: parseInt(limit, 10),
      offset: offset,
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ status: 'success', data: { pedidos, totalResults: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10), } });
  } catch (error) { next(error); }
};

// --- OBTENER Pedido por ID (Sin cambios) ---
exports.getPedidoById = async (req, res, next) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [ { model: User, as: 'cliente' }, { model: User, as: 'tecnico', required: false }, { model: User, as: 'servicio_tecnico', required: false } ]
    });
    if (!pedido) return next(new AppError('Pedido no encontrado', 404));
    const { id: userId, rol } = req.user;
    if (rol !== 'admin_prime' && userId !== pedido.cliente_id && userId !== pedido.tecnico_id && userId !== pedido.servicio_tecnico_id) {
        return next(new AppError('No tienes permiso para ver este pedido.', 403));
    }
    res.status(200).json({ status: 'success', data: { pedido } });
  } catch (error) { next(error); }
};

// --- ACTUALIZAR Pedido (Sin cambios) ---
exports.updatePedido = async (req, res, next) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id);
        if (!pedido) return next(new AppError('Pedido no encontrado', 404));
        const { servicioTecnicoId, tecnicoId, estado } = req.body;
        const { id: userId, rol } = req.user;
        const io = req.app.get('socketio');
        if (rol === 'admin_prime' && servicioTecnicoId) {
            const servicioTecnico = await User.findOne({ where: { id: servicioTecnicoId, rol: 'administrador' } });
            if (!servicioTecnico) return next(new AppError('El Servicio Técnico especificado no existe.', 404));
            pedido.servicio_tecnico_id = servicioTecnicoId;
            if (io) io.to(`user_${servicioTecnicoId}`).emit('pedido_actualizado', { mensaje: `Se te ha asignado el pedido #${pedido.id}.` });
        } else if (rol === 'administrador' && tecnicoId) {
            if (pedido.servicio_tecnico_id !== userId) return next(new AppError('No puedes asignar un pedido que no pertenece a tu servicio.', 403));
            const tecnico = await User.findOne({ where: { id: tecnicoId, rol: 'tecnico', administrador_id: userId } });
            if (!tecnico) return next(new AppError('Este técnico no existe o no está a tu cargo.', 404));
            pedido.tecnico_id = tecnicoId;
            if (pedido.estado === 'pendiente_asignacion') pedido.estado = 'asignado'; 
            if (io) {
                io.to(`user_${tecnicoId}`).emit('pedido_actualizado', { mensaje: `Se te ha asignado el pedido #${pedido.id}.` });
                io.to(`user_${pedido.cliente_id}`).emit('pedido_actualizado', { mensaje: `El técnico ${tecnico.nombre} ha sido asignado.` });
            }
        } else if ((rol === 'tecnico' || rol.includes('admin')) && estado) {
           pedido.estado = estado;
           if (io) {
                io.to(`user_${pedido.cliente_id}`).emit('pedido_actualizado', { mensaje: `El estado de tu pedido #${pedido.id} cambió a: ${estado}.` });
                if (pedido.tecnico_id) io.to(`user_${pedido.tecnico_id}`).emit('pedido_actualizado', { mensaje: `El estado del pedido #${pedido.id} cambió a: ${estado}.` });
           }
        } else {
          return next(new AppError('No tienes los permisos o no has proporcionado los datos correctos para esta acción.', 400));
        }
        await pedido.save();
        const pedidoActualizado = await Pedido.findByPk(req.params.id, {
            include: [{ model: User, as: 'cliente' }, { model: User, as: 'tecnico', required: false }, { model: User, as: 'servicio_tecnico', required: false }]
        });
        res.status(200).json({ status: 'success', data: { pedido: pedidoActualizado } });
    } catch (error) { next(error); }
};

// --- ELIMINAR Pedido (Sin Cambios) ---
exports.deletePedido = async (req, res, next) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id);
        if (!pedido) return next(new AppError('Pedido no encontrado', 404));
        if (!req.user.rol.includes('admin')) return next(new AppError('No tienes permiso para realizar esta acción.', 403));
        await pedido.update({ activo: false, estado: 'cancelado_admin' });
        res.status(204).send();
    } catch(error) { next(error); }
};

// --- ACEPTAR Pedido (Sin cambios) ---
exports.aceptarPedido = async (req, res, next) => {
  try {
    const pedidoId = req.params.id;
    const usuarioQueAcepta = req.user;
    const io = req.app.get('socketio');
    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) return next(new AppError('Este pedido ya no existe.', 404));
    if (pedido.estado !== 'pendiente_aceptacion') return next(new AppError('Este pedido ya no está disponible para ser aceptado.', 400));
    const fuePropuestoAEsteUsuario = (usuarioQueAcepta.rol === 'tecnico' && pedido.tecnico_propuesto_id === usuarioQueAcepta.id) || (usuarioQueAcepta.rol === 'administrador' && pedido.servicio_tecnico_propuesto_id === usuarioQueAcepta.id);
    if (!fuePropuestoAEsteUsuario) return next(new AppError('No tienes permiso para aceptar este pedido.', 403));
    if (usuarioQueAcepta.rol === 'tecnico') {
      pedido.tecnico_id = usuarioQueAcepta.id;
      pedido.estado = 'asignado';
      await notificationService.crearNotificacion({ usuario_id: pedido.cliente_id, tipo: 'PEDIDO_ASIGNADO', mensaje: `¡Buenas noticias! El técnico ${usuarioQueAcepta.nombre} ha aceptado tu pedido #${pedido.id}.`}, io);
    } else if (usuarioQueAcepta.rol === 'administrador') {
      pedido.servicio_tecnico_id = usuarioQueAcepta.id;
      pedido.estado = 'pendiente_asignacion';
      await notificationService.crearNotificacion({ usuario_id: pedido.cliente_id, tipo: 'PEDIDO_ASIGNADO_SERVICIO', mensaje: `El servicio técnico ${usuarioQueAcepta.nombre} se hará cargo de tu pedido #${pedido.id}.`}, io);
    }
    pedido.tecnico_propuesto_id = null;
    pedido.servicio_tecnico_propuesto_id = null;
    await pedido.save();
    io.emit('pedido_actualizado', pedido);
    res.status(200).json({ status: 'success', message: 'Pedido aceptado con éxito.', data: { pedido }});
  } catch (error) { next(error); }
};

// --- RECHAZAR Pedido (CORREGIDO Y CON NUEVA LÓGICA) ---
exports.rechazarPedido = async (req, res, next) => {
  try {
    const pedidoId = req.params.id;
    const usuarioQueRechaza = req.user;
    const pedido = await Pedido.findByPk(pedidoId);

    if (!pedido) return next(new AppError('Este pedido ya no existe.', 404));
    
    const fuePropuestoAEsteUsuario = (usuarioQueRechaza.rol === 'tecnico' && pedido.tecnico_propuesto_id === usuarioQueRechaza.id) || (usuarioQueRechaza.rol === 'administrador' && pedido.servicio_tecnico_propuesto_id === usuarioQueRechaza.id);

    if (!fuePropuestoAEsteUsuario) return next(new AppError('No puedes rechazar un pedido que no te fue propuesto.', 403));
    
    // Añadimos el ID del usuario a la lista de rechazos
    if (!pedido.usuarios_que_rechazaron.includes(usuarioQueRechaza.id)) {
        pedido.usuarios_que_rechazaron.push(usuarioQueRechaza.id);
        pedido.changed('usuarios_que_rechazaron', true); // Marcamos el campo como modificado
    }
    
    pedido.tecnico_propuesto_id = null;
    pedido.servicio_tecnico_propuesto_id = null;
    pedido.estado = 'buscando_tecnico';
    await pedido.save();

    await notificationService.crearNotificacionParaRoles(['admin_prime'], { tipo: 'PEDIDO_RECHAZADO', mensaje: `El pedido #${pedido.id} fue rechazado. Buscando nuevo candidato.` }, req.app.get('socketio'));
    
    findAndProposeTask(pedido, req);
    
    res.status(200).json({ status: 'success', message: 'Pedido rechazado. El sistema buscará otro técnico.' });
  } catch (error) { 
    next(error); 
  }
};