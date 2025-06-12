'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const enumName = 'enum_Pedidos_estado'; // Usamos el mismo nombre que en tu migración anterior

    // Solamente añadimos el nuevo valor 'cancelado_admin'
    await queryInterface.sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE 'cancelado_admin';`);
  },

  async down (queryInterface, Sequelize) {
    const enumName = 'enum_Pedidos_estado';
    console.log(`La reversión de la adición del valor 'cancelado_admin' al tipo ENUM '${enumName}' no se implementa automáticamente para evitar pérdida de datos. Si es necesario, debe hacerse manualmente con precaución.`);
    // No intentes revertir los valores añadidos en la migración ANTERIOR aquí.
    // Esta migración solo se encarga de 'cancelado_admin'.
  }
};