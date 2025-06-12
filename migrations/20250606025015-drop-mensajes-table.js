// backend/src/migrations/YYYY...-drop-mensajes-table.js
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Eliminamos la tabla si existe
    await queryInterface.dropTable('Mensajes');
  },

  async down (queryInterface, Sequelize) {
    // El 'down' recrearía la tabla, pero lo dejaremos vacío
    // ya que otra migración se encargará de crearla correctamente.
    // O puedes poner aquí la definición original de tu tabla si quieres poder revertir.
    // Por simplicidad, lo dejamos así.
  }
};