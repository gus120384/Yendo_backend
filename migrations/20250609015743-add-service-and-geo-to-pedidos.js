'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pedidos', 'servicio_tecnico_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Puede ser nulo hasta que el Admin Prime lo asigne
      references: {
        model: 'Users', // Nombre de la tabla de usuarios
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Si se elimina el servicio técnico, el pedido queda sin asignar
    });

    // Columnas para la futura geolocalización del servicio
    await queryInterface.addColumn('Pedidos', 'pedido_lat', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('Pedidos', 'pedido_lng', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Pedidos', 'servicio_tecnico_id');
    await queryInterface.removeColumn('Pedidos', 'pedido_lat');
    await queryInterface.removeColumn('Pedidos', 'pedido_lng');
  }
};