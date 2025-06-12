// backend/src/migrations/20250602194823-create-mensaje.js - VERSIÓN CORREGIDA

'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Mensajes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      conversacion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Conversaciones', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      emisor_usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      contenido: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      // ▼▼▼ ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! ▼▼▼
      created_at: { // Nombre de columna en snake_case
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: { // Nombre de columna en snake_case
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Mensajes');
  }
};