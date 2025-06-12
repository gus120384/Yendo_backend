// migrations/YYYYMMDDHHMMSS-create-conversacion.js
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Conversaciones', { // Nombre de la tabla
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      pedido_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Puede ser null si la conversación no está ligada a un pedido específico
        references: {
          model: 'Pedidos', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Si se borra el pedido, la FK se pone a NULL
      },
      titulo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ultimo_mensaje_enviado_at: {
        type: Sequelize.DATE, // O Sequelize.DATE CON TIME ZONE para PostgreSQL si necesitas precisión de zona
        allowNull: true
      },
      creador_usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false, // Una conversación siempre tiene un creador
        references: {
          model: 'Users', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Si se borra el creador, la FK se pone a NULL (o RESTRICT si prefieres)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Conversaciones');
  }
};