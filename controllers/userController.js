// backend/src/controllers/userController.js - VERSIÓN FINAL Y COMPLETA PARA JERARQUÍA

const { User, Pedido } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');

// --- Perfil del Usuario Autenticado (Sin Cambios) ---
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return next(new AppError('Usuario no encontrado.', 404));
    res.status(200).json({ status: 'success', data: { user } });
  } catch(error) { next(error); }
};

exports.updateMe = async (req, res, next) => {
  try {
    // Campos que el propio usuario puede actualizar
    const allowedFields = ['nombre', 'apellido', 'telefono', 'direccion_calle', 'direccion_numero', 'direccion_ciudad', 'direccion_provincia', 'direccion_cp'];
    const filteredBody = {};
    Object.keys(req.body).forEach(el => {
      if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
    });

    const updatedUser = await User.findByPk(req.user.id);
    await updatedUser.update(filteredBody);
    
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch(error) { next(error); }
};

// --- OBTENER TODOS LOS USUARIOS (Lógica Jerárquica) ---
exports.getAllUsersForAdmin = async (req, res, next) => {
  try {
    const { id: userId, rol } = req.user;
    const { page = 1, limit = 10, rol: rolFiltro, activo, searchTerm } = req.query;
    
    let whereClause = {};

    if (rol === 'admin_prime') {
      // Admin Prime ve todo.
    } else if (rol === 'administrador') {
      // Un Administrador (Servicio Técnico) SOLO puede ver a sus propios técnicos.
      whereClause.administrador_id = userId;
      whereClause.rol = 'tecnico'; // Forzamos a que solo vea técnicos
    } else {
      return next(new AppError('No tienes permiso para acceder a esta lista de usuarios.', 403));
    }
    
    // Aplicar filtros adicionales solo si el que consulta es Admin Prime
    if (rol === 'admin_prime') {
        if (rolFiltro) whereClause.rol = rolFiltro;
        if (activo !== undefined) whereClause.activo = activo === 'true';
        if (searchTerm) {
            whereClause[Op.or] = [
                { nombre: { [Op.iLike]: `%${searchTerm}%` } },
                { apellido: { [Op.iLike]: `%${searchTerm}%` } },
                { email: { [Op.iLike]: `%${searchTerm}%` } }
            ];
        }
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        users,
        totalResults: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      },
    });

  } catch (error) {
    next(error);
  }
};

// --- OBTENER USUARIO por ID (Lógica Jerárquica) ---
exports.getUserByIdForAdmin = async (req, res, next) => {
    try {
        const userToFind = await User.findByPk(req.params.id);
        if (!userToFind) return next(new AppError('Usuario no encontrado.', 404));

        const { id: userId, rol } = req.user;
        
        if (rol === 'administrador' && userToFind.administrador_id !== userId) {
            return next(new AppError('No tienes permiso para ver este usuario.', 403));
        }

        res.status(200).json({ status: 'success', data: { user: userToFind } });
    } catch(error) { next(error); }
};

// --- CREAR USUARIO (Lógica Jerárquica) ---
exports.createUserByAdmin = async (req, res, next) => {
  try {
    const creador = req.user;
    const { nombre, apellido, email, password, rol, ...otrosDatos } = req.body;

    if (!nombre || !apellido || !email || !password || !rol) return next(new AppError('Nombre, apellido, email, contraseña y rol son requeridos.', 400));
    if (password.length < 8) return next(new AppError('La contraseña debe tener al menos 8 caracteres.', 400));

    let datosParaCrear = { nombre, apellido, email, password, rol, ...otrosDatos };

    if (creador.rol === 'admin_prime') {
      if (!['administrador', 'tecnico'].includes(rol)) return next(new AppError('Admin Prime solo puede crear roles de Administrador o Técnico.', 403));
      datosParaCrear.administrador_id = null; // Los crea como independientes o de nivel superior
    
    } else if (creador.rol === 'administrador') {
      if (rol !== 'tecnico') return next(new AppError('Solo puedes crear usuarios con rol de Técnico.', 403));
      datosParaCrear.rol = 'tecnico';
      datosParaCrear.administrador_id = creador.id; // Asigna al técnico a su propio servicio
    
    } else {
      return next(new AppError('No tienes permiso para crear usuarios.', 403));
    }
    
    const nuevoUsuario = await User.create(datosParaCrear);
    
    res.status(201).json({ status: 'success', message: 'Usuario creado exitosamente.', data: { user: nuevoUsuario } });
  } catch (error) { next(error); }
};

// --- ACTUALIZAR USUARIO (Lógica Jerárquica) ---
exports.updateUserByAdmin = async (req, res, next) => {
    try {
        const { id: userIdToUpdate } = req.params;
        const adminUser = req.user;
        const updateData = req.body;

        const userToUpdate = await User.findByPk(userIdToUpdate);
        if (!userToUpdate) return next(new AppError('Usuario no encontrado.', 404));

        if (adminUser.rol === 'administrador') {
            // Un admin solo puede editar a sus propios técnicos
            if (userToUpdate.administrador_id !== adminUser.id || userToUpdate.rol !== 'tecnico') {
                return next(new AppError('No tienes permiso para editar este usuario.', 403));
            }
            // Y no puede cambiarles el rol ni reasignarlos
            if (updateData.rol || updateData.administrador_id) {
                return next(new AppError('No puedes cambiar el rol ni la asignación de un técnico.', 403));
            }
        }
        
        await userToUpdate.update(updateData);
        res.status(200).json({ status: 'success', data: { user: userToUpdate } });
    } catch (error) { next(error); }
};

// --- DESACTIVAR USUARIO (Lógica Jerárquica) ---
exports.deleteUserByAdmin = async (req, res, next) => {
    try {
        const { id: userIdToDelete } = req.params;
        const adminPerformingAction = req.user;

        const userToDelete = await User.findByPk(userIdToDelete);
        if (!userToDelete) return next(new AppError('Usuario no encontrado.', 404));
        if (userToDelete.id === adminPerformingAction.id) return next(new AppError('No puedes desactivarte a ti mismo.', 403));
        
        if (adminPerformingAction.rol === 'administrador') {
            if (userToDelete.administrador_id !== adminPerformingAction.id) {
                return next(new AppError('No tienes permiso para desactivar este usuario.', 403));
            }
        }
        
        await userToDelete.update({ activo: false });
        res.status(200).json({ status: 'success', message: 'Usuario desactivado exitosamente.', data: { user: userToDelete }});
    } catch (error) { next(error); }
};

// --- REACTIVAR USUARIO (Lógica Jerárquica) ---
exports.reactivateUserByAdmin = async (req, res, next) => {
    try {
        const { id: userIdToReactivate } = req.params;
        const adminPerformingAction = req.user;
        
        const userToReactivate = await User.findByPk(userIdToReactivate);
        if (!userToReactivate) return next(new AppError('Usuario no encontrado.', 404));

        if (adminPerformingAction.rol === 'administrador') {
            if (userToReactivate.administrador_id !== adminPerformingAction.id) {
                return next(new AppError('No tienes permiso para reactivar este usuario.', 403));
            }
        }

        await userToReactivate.update({ activo: true });
        res.status(200).json({ status: 'success', message: 'Usuario reactivado exitosamente.', data: { user: userToReactivate }});
    } catch(error) { next(error); }
};

// --- ADMIN ACTUALIZA CONTRASEÑA (Lógica Jerárquica) ---
exports.adminUpdateUserPassword = async (req, res, next) => {
    try {
        const { id: userIdToUpdate } = req.params;
        const { newPassword } = req.body;
        const adminUser = req.user;

        if (!newPassword || newPassword.trim().length < 8) return next(new AppError('La nueva contraseña debe tener al menos 8 caracteres.', 400));

        const userToUpdate = await User.findByPk(userIdToUpdate);
        if (!userToUpdate) return next(new AppError('Usuario no encontrado.', 404));
        if (userToUpdate.id === adminUser.id) return next(new AppError('No puedes cambiar tu propia contraseña desde esta ruta.', 403));

        if (adminUser.rol === 'administrador') {
            if (userToUpdate.administrador_id !== adminUser.id) {
                return next(new AppError('No tienes permiso para cambiar la contraseña de este usuario.', 403));
            }
        }
        
        userToUpdate.password = newPassword.trim();
        await userToUpdate.save();
        
        res.status(200).json({ status: 'success', message: 'Contraseña del usuario actualizada exitosamente.' });
    } catch (error) { next(error); }
};