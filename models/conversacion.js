// models/conversacion.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversacion extends Model {
    static associate(models) {
      // Pedido al que pertenece la conversación (opcional)
      Conversacion.belongsTo(models.Pedido, {
        foreignKey: 'pedido_id',
        as: 'pedido',
        onDelete: 'SET NULL', // Si se borra el pedido, la conversación puede quedar sin pedido_id
        onUpdate: 'CASCADE',
      });

      // Usuario que creó la conversación
      Conversacion.belongsTo(models.User, {
        foreignKey: 'creador_usuario_id',
        as: 'creador',
        // allowNull: false, // Ya se define en la migración, pero el creador es importante
        onDelete: 'SET NULL', // Si se borra el usuario creador, la conversación puede quedar sin creador
        onUpdate: 'CASCADE',
      });

      // Mensajes de esta conversación
      Conversacion.hasMany(models.Mensaje, {
        foreignKey: 'conversacion_id',
        as: 'mensajes',
        onDelete: 'CASCADE', // Si se borra la conversación, se borran sus mensajes
      });

      // Tabla de unión para los participantes
      Conversacion.hasMany(models.ParticipanteConversacion, {
        foreignKey: 'conversacion_id',
        as: 'participantesPivot', // Para acceder directamente a la tabla de unión si es necesario
        onDelete: 'CASCADE',
      });

      // Usuarios que participan en esta conversación (a través de ParticipanteConversacion)
      Conversacion.belongsToMany(models.User, {
        through: models.ParticipanteConversacion,
        foreignKey: 'conversacion_id',
        otherKey: 'usuario_id',
        as: 'participantes',
      });
    }
  }
  Conversacion.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    pedido_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Permite conversaciones no ligadas a pedidos en el futuro
      references: {
        model: 'Pedidos', // Nombre de la tabla en la BD
        key: 'id',
      },
      // onDelete y onUpdate se definen mejor en la migración para la BD
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ultimo_mensaje_enviado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    creador_usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // Una conversación siempre tiene un creador
      references: {
        model: 'Users', // Nombre de la tabla en la BD
        key: 'id',
      }
    },
    // createdAt y updatedAt son manejados automáticamente por Sequelize
  }, {
    sequelize,
    modelName: 'Conversacion',
    tableName: 'Conversaciones', // Opcional: si quieres que la tabla se llame diferente al modelo
    timestamps: true // Habilita createdAt y updatedAt
  });
  return Conversacion;
};