'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Usamos una transacción para asegurar que todos los cambios se apliquen o ninguno.
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ===== Cambios en la tabla 'Users' =====
      await queryInterface.addColumn('Users', 'zonas_cobertura', {
        type: Sequelize.ARRAY(Sequelize.STRING), // O Sequelize.JSON si usas MySQL
        allowNull: true,
        defaultValue: [],
      }, { transaction });

      // ===== Cambios en la tabla 'Pedidos' =====
      await queryInterface.addColumn('Pedidos', 'zona_pedido', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });
      
      await queryInterface.addColumn('Pedidos', 'tecnico_propuesto_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      await queryInterface.addColumn('Pedidos', 'servicio_tecnico_propuesto_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      // También tenemos que añadir los nuevos estados al ENUM 'estado' en Pedidos.
      // NOTA: Esto puede ser complejo dependiendo de la base de datos. Para PostgreSQL es así.
      await queryInterface.sequelize.query('ALTER TYPE "enum_Pedidos_estado" ADD VALUE \'buscando_tecnico\';', { transaction });
      await queryInterface.sequelize.query('ALTER TYPE "enum_Pedidos_estado" ADD VALUE \'pendiente_aceptacion\';', { transaction });
      
      // Si todo va bien, confirmamos los cambios.
      await transaction.commit();
    } catch (err) {
      // Si algo falla, revertimos todo.
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    // Lógica para revertir los cambios
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('Users', 'zonas_cobertura', { transaction });
      await queryInterface.removeColumn('Pedidos', 'zona_pedido', { transaction });
      await queryInterface.removeColumn('Pedidos', 'tecnico_propuesto_id', { transaction });
      await queryInterface.removeColumn('Pedidos', 'servicio_tecnico_propuesto_id', { transaction });
      
      // Revertir los ENUM es más complejo y a menudo se omite, pero por completitud
      // podrías recrear el tipo sin los nuevos valores. Por ahora, lo dejamos así.
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};