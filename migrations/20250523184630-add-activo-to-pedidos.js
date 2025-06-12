// C:\Users\trifi\tecnigo-backend\migrations\20250523184630-add-activo-to-pedidos.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Añadir la columna 'activo' a la tabla 'Pedidos'
    await queryInterface.addColumn(
      'Pedidos', // Nombre exacto de tu tabla en la base de datos (sensible a mayúsculas/minúsculas)
      'activo',  // Nombre de la nueva columna
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Los pedidos existentes y nuevos serán 'activos' por defecto
      }
    );
  },

  async down (queryInterface, Sequelize) {
    // Eliminar la columna 'activo' de la tabla 'Pedidos' si se revierte la migración
    await queryInterface.removeColumn(
      'Pedidos', // Nombre exacto de tu tabla
      'activo'   // Nombre de la columna a eliminar
    );
  }
};