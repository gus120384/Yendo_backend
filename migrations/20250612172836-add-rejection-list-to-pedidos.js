'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pedidos', 'usuarios_que_rechazaron', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
      defaultValue: [],
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Pedidos', 'usuarios_que_rechazaron');
  }
};