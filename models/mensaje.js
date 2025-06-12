// backend/src/models/mensaje.js - VERSIÓN FINAL CORREGIDA

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Mensaje extends Model {
    static associate(models) {
      Mensaje.belongsTo(models.Conversacion, {
        foreignKey: 'conversacion_id',
        as: 'conversacion'
      });

      Mensaje.belongsTo(models.User, {
        foreignKey: 'emisor_usuario_id',
        as: 'emisor'
      });
    }
  }

  Mensaje.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    conversacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Conversaciones', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    emisor_usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    contenido: {
      type: DataTypes.TEXT,
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'Mensaje',
    tableName: 'Mensajes',
    timestamps: true, // Sequelize manejará las columnas de tiempo
    underscored: true, // <<<--- Esta opción es la causa

    // ▼▼▼ ¡AQUÍ ESTÁ LA SOLUCIÓN! ▼▼▼
    // Mapeamos explícitamente los nombres de las propiedades a los nombres de las columnas.
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Mensaje;
};