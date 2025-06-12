// migrations/YYYYMMDDHHMMSS-create-participante-conversacion.js
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ParticipantesConversaciones', { // Nombre de la tabla
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      conversacion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Conversaciones', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si se borra la conversación, se eliminan las participaciones
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si se borra el usuario, se eliminan sus participaciones
      },
      fecha_union: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      ultimo_acceso_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notificaciones_activas: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // Añadir índice único para evitar que un usuario se una dos veces a la misma conversación
    await queryInterface.addIndex('ParticipantesConversaciones', ['conversacion_id', 'usuario_id'], {
      unique: true,
      name: 'unique_participante_por_conversacion' // Nombre opcional para el índice
    });
  },

  async down(queryInterface, Sequelize) {
    // Quitar el índice primero si se añadió
    await queryInterface.removeIndex('ParticipantesConversaciones', 'unique_participante_por_conversacion');
    await queryInterface.dropTable('ParticipantesConversaciones');

};