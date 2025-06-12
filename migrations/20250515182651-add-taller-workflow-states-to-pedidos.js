// migrations/YYYYMMDDHHMMSS-add-taller-workflow-states-to-pedidos.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const enumName = 'enum_Pedidos_estado'; // Nombre del tipo ENUM en PostgreSQL

    await queryInterface.sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE 'retiro_a_taller';`);
    await queryInterface.sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE 'en_taller';`);
    await queryInterface.sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE 'listo_para_entrega';`);
    await queryInterface.sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE 'en_camino_entrega';`);
  },

  async down (queryInterface, Sequelize) {
    // Ver la nota sobre la complejidad de revertir ADD VALUE en el mensaje anterior.
    console.log(`La reversión de la migración add-taller-workflow-states-to-pedidos necesitaría
                   manejar la eliminación de valores del ENUM "enum_Pedidos_estado", lo cual es complejo.`);
  }
};