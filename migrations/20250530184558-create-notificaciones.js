'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Notificaciones', { // Asegúrate que el nombre de la tabla sea 'Notificaciones'
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Nombre de la tabla de Usuarios
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tipo_notificacion: {
        type: Sequelize.ENUM(
          // REPLICA AQUÍ EXACTAMENTE EL MISMO ENUM QUE DEFINISTE EN EL MODELO Notificacion.js
          // Es MUY IMPORTANTE que sean idénticos.
          'PEDIDO_CREADO_CONFIRMACION',
          'PEDIDO_ASIGNADO_TECNICO',
          'PEDIDO_EN_PROGRESO',
          'PEDIDO_COMPLETADO',
          'PEDIDO_NO_RESUELTO_CLIENTE',
          'PEDIDO_CANCELADO_POR_TERCERO',
          'PEDIDO_RETIRADO_A_TALLER',
          'PRESUPUESTO_PEDIDO_LISTO',
          'PEDIDO_LISTO_PARA_ENTREGA',
          'PEDIDO_EN_CAMINO_ENTREGA',
          'PEDIDO_PENDIENTE_DE_PAGO',
          'NUEVO_PEDIDO_ASIGNADO_TECNICO',
          'PEDIDO_CANCELADO_POR_CLIENTE',
          'PEDIDO_REASIGNADO_O_CANCELADO_ADMIN',
          'NUEVA_CALIFICACION_RECIBIDA',
          'NUEVO_PEDIDO_POR_ASIGNAR_ADMIN',
          'ALERTA_PEDIDO_SIN_ASIGNAR',
          'INFO_PEDIDO_NO_RESUELTO_ADMIN',
          'ALERTA_BAJA_CALIFICACION',
          'INFO_PEDIDO_RETIRADO_TALLER_ADMIN',
          'PRESUPUESTO_CLIENTE_APROBADO_ADMIN',
          'PRESUPUESTO_CLIENTE_RECHAZADO_ADMIN',
          'INFO_PEDIDO_LISTO_ENTREGA_ADMIN',
          'NUEVO_MENSAJE',
          'NUEVO_USUARIO_REGISTRADO_ADMIN'
        ),
        allowNull: false
      },
      mensaje: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      leida: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      pedido_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Pedidos', // Nombre de la tabla de Pedidos
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      emisor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Nombre de la tabla de Usuarios
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      url_relacionada: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: { // Asegúrate de usar underscored names si tu modelo lo hace
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: { // Asegúrate de usar underscored names
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Notificaciones');
  }
};