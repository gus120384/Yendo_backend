// models/participanteconversacion.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ParticipanteConversacion extends Model {
    static associate(models) {
      // Conversación
      ParticipanteConversacion.belongsTo(models.Conversacion, {
        foreignKey: 'conversacion_id',
        as: 'conversacion', // Opcional, pero útil
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // Usuario participante
      ParticipanteConversacion.belongsTo(models.User, {
        foreignKey: 'usuario_id',
        as: 'usuario', // Opcional, pero útil
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }
  ParticipanteConversacion.init({
    id: { // PK simple para la tabla de unión
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    conversacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Conversaciones', // Nombre de la tabla
        key: 'id',
      }
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // Nombre de la tabla
        key: 'id',
      }
    },
    fecha_union: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW, // O Sequelize.NOW si importas Sequelize
    },
    ultimo_acceso_at: {
      type: DataTypes.DATE,
      allowNull: true, // Se actualiza cuando el usuario entra a la conversación
    },
    notificaciones_activas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // Por defecto, las notificaciones están activas
    },
    // createdAt y updatedAt son manejados automáticamente
  }, {
    sequelize,
    modelName: 'ParticipanteConversacion',
    tableName: 'ParticipantesConversaciones', // Pluralizado para la tabla
    timestamps: true,
    // Para asegurar que un usuario no se una dos veces a la misma conversación
    indexes: [
      {
        unique: true,
        fields: ['conversacion_id', 'usuario_id']
      }
    ]
  });
  return ParticipanteConversacion;
};