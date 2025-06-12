// backend/src/models/user.js - VERSIÓN CON CAMPO 'zonas_cobertura' AÑADIDO

'use strict';
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class User extends Model {
    async validarPassword(password) {
      return bcrypt.compare(password, this.password);
    }
    static associate(models) {
      // Asociaciones existentes (sin cambios)
      User.belongsTo(models.User, { foreignKey: 'administrador_id', as: 'administradorSuperior', allowNull: true });
      User.hasMany(models.User, { foreignKey: 'administrador_id', as: 'subordinados' });
      User.hasMany(models.Pedido, { foreignKey: 'cliente_id', as: 'pedidosComoCliente' });
      User.hasMany(models.Pedido, { foreignKey: 'tecnico_id', as: 'pedidosComoTecnico' });
      User.hasMany(models.Conversacion, { foreignKey: 'creador_usuario_id', as: 'conversacionesCreadas' });
      User.hasMany(models.Mensaje, { foreignKey: 'emisor_usuario_id', as: 'chatMensajesEnviados' });
      User.hasMany(models.ParticipanteConversacion, { foreignKey: 'usuario_id', as: 'participacionesEnConversacion' });
      User.belongsToMany(models.Conversacion, { through: models.ParticipanteConversacion, foreignKey: 'usuario_id', otherKey: 'conversacion_id', as: 'conversacionesEnLasQueParticipa' });
      if (models.Notificacion) { User.hasMany(models.Notificacion, { foreignKey: 'usuario_id', as: 'notificaciones', onDelete: 'CASCADE' }); }
      if (models.Comision) { User.hasMany(models.Comision, { foreignKey: 'tecnico_id', as: 'comisionesComoTecnico' }); User.hasMany(models.Comision, { foreignKey: 'administrador_id', as: 'comisionesComoAdministrador' }); }
      if (models.Mensaje && models.Mensaje.getAttributes().emisor_id && models.Mensaje.getAttributes().receptor_id) { User.hasMany(models.Mensaje, { foreignKey: 'emisor_id', as: 'mensajesDirectosEnviados' }); User.hasMany(models.Mensaje, { foreignKey: 'receptor_id', as: 'mensajesDirectosRecibidos' }); }
      
      User.hasMany(models.Pedido, {
        foreignKey: 'servicio_tecnico_id',
        as: 'pedidos_a_cargo',
      });
    }
  }

  User.init({
    // Columnas existentes (sin cambios)
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: { msg: "El nombre no puede estar vacío." } } },
    apellido: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: { msg: "El apellido no puede estar vacío." } } },
    email: { type: DataTypes.STRING, allowNull: false, unique: { msg: "Este correo electrónico ya está registrado." }, validate: { isEmail: { msg: "Debe proporcionar un correo electrónico válido." } } },
    password: { type: DataTypes.STRING, allowNull: false },
    telefono: { type: DataTypes.STRING, allowNull: true },
    rol: { type: DataTypes.ENUM('cliente', 'tecnico', 'administrador', 'admin_prime'), allowNull: false, defaultValue: 'cliente' },
    direccion_calle: { type: DataTypes.STRING, allowNull: true },
    direccion_numero: { type: DataTypes.STRING, allowNull: true },
    direccion_ciudad: { type: DataTypes.STRING, allowNull: true },
    direccion_provincia: { type: DataTypes.STRING, allowNull: true },
    direccion_cp: { type: DataTypes.STRING, allowNull: true },
    ubicacion_actual_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    ubicacion_actual_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    fecha_ultima_ubicacion: { type: DataTypes.DATE, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    administrador_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' } },
    
    // ▼▼▼ NUEVO CAMPO AÑADIDO AQUÍ ▼▼▼
    zonas_cobertura: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    hooks: {
      beforeCreate: async (user) => { if (user.password) { user.password = await bcrypt.hash(user.password, await bcrypt.genSalt(10)); } },
      beforeUpdate: async (user) => { if (user.changed('password') && user.password) { user.password = await bcrypt.hash(user.password, await bcrypt.genSalt(10)); } }
    },
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: { include: ['password'] } } }
  });

  return User;
};