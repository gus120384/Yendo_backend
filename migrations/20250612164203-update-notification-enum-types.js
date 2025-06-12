// En el nuevo archivo de migración: YYYYMMDD...-update-notification-enum-types.js

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Añadimos los nuevos tipos de notificación al ENUM existente en PostgreSQL
      await queryInterface.sequelize.query("ALTER TYPE \"enum_Notificaciones_tipo_notificacion\" ADD VALUE 'PEDIDO_ASIGNADO';", { transaction });
      await queryInterface.sequelize.query("ALTER TYPE \"enum_Notificaciones_tipo_notificacion\" ADD VALUE 'PEDIDO_ASIGNADO_SERVICIO';", { transaction });
      await queryInterface.sequelize.query("ALTER TYPE \"enum_Notificaciones_tipo_notificacion\" ADD VALUE 'PEDIDO_RECHAZADO';", { transaction });
      // Puedes añadir más tipos aquí en el futuro si los necesitas

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    // Revertir un ENUM es complejo y destructivo. Generalmente, no se implementa
    // una lógica 'down' para 'ADD VALUE' a menos que sea estrictamente necesario.
    // Dejamos esto vacío intencionadamente.
    console.log("No se puede revertir la adición de valores a un ENUM de forma segura.");
  }
};