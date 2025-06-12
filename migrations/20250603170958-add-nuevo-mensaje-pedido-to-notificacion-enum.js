'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
// migrations/YYYYMMDDHHMMSS-add-nuevo-mensaje-pedido-to-notificacion-enum.js
'use strict';

// TODO: ¡REEMPLAZA ESTE VALOR CON EL NOMBRE EXACTO DE TU TIPO ENUM EN POSTGRESQL!
// Por ejemplo, si tu tabla es 'Notificaciones' y la columna 'tipo_notificacion',
// el nombre del tipo ENUM podría ser 'enum_Notificaciones_tipo_notificacion'.
// VERIFÍCALO EN PGADMIN (tu_base_de_datos > Schemas > public > Types)
const ENUM_NAME_IN_DB = 'enum_Notificaciones_tipo_notificacion'; // <--- ¡¡¡AJUSTA ESTO!!!
const NEW_ENUM_VALUE = 'NUEVO_MENSAJE_PEDIDO';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Añadir el nuevo valor al tipo ENUM existente en la base de datos.
    // La opción 'IF NOT EXISTS' para ADD VALUE es para PostgreSQL 10+.
    // Si usas una versión anterior y el valor ya existe por alguna razón, la migración fallará (lo cual es seguro).
    // Si usas una versión anterior y estás seguro de que el valor no existe, puedes quitar 'IF NOT EXISTS'.
    console.log(`Añadiendo valor '${NEW_ENUM_VALUE}' al tipo ENUM '${ENUM_NAME_IN_DB}'...`);
    await queryInterface.sequelize.query(`
      ALTER TYPE public."${ENUM_NAME_IN_DB}" ADD VALUE IF NOT EXISTS '${NEW_ENUM_VALUE}';
    `);
    console.log(`Valor '${NEW_ENUM_VALUE}' añadido exitosamente a '${ENUM_NAME_IN_DB}'.`);
  },

  async down (queryInterface, Sequelize) {
    // IMPORTANTE: Eliminar un valor de un ENUM en PostgreSQL es una operación compleja y potencialmente destructiva
    // si hay filas en tu tabla que actualmente usan ese valor.
    // La forma segura de hacerlo implicaría:
    //   1. Actualizar todas las filas que usan 'NUEVO_MENSAJE_PEDIDO' a otro valor válido o NULL (si la columna lo permite).
    //   2. Luego, recrear el tipo ENUM sin 'NUEVO_MENSAJE_PEDIDO', lo cual es disruptivo.
    //
    // Por seguridad y simplicidad, la mayoría de las veces no se implementa un 'down' para remover un valor de ENUM,
    // o se lanza un error indicando que la reversión debe ser manual y cuidadosa.
    // Si estás seguro de que no hay datos usando este valor y quieres intentar revertirlo,
    // la consulta sería algo como (PERO ESTO ES PELIGROSO Y PUEDE FALLAR SI HAY DATOS USÁNDOLO):
    //
    // await queryInterface.sequelize.query(`
    //   -- ESTO ES UN EJEMPLO PELIGROSO, NO USAR SIN ENTENDER LAS IMPLICACIONES
    //   -- Se necesitaría primero actualizar los datos que usan este valor.
    //   -- Luego, eliminar y recrear el tipo ENUM. Por simplicidad, no se hace aquí.
    //   -- ALTER TYPE public."${ENUM_NAME_IN_DB}" DROP VALUE '${NEW_ENUM_VALUE}'; -- NO EXISTE UN DROP VALUE DIRECTO
    // `);
    
    console.warn(`La reversión ('down') para eliminar el valor '${NEW_ENUM_VALUE}' del tipo ENUM '${ENUM_NAME_IN_DB}' no se implementa automáticamente.`);
    console.warn('Si necesitas revertir esta adición, deberás hacerlo manualmente en la base de datos con extrema precaución, asegurándote de que ningún dato esté utilizando este valor.');
    // Opcionalmente, puedes hacer que la migración 'down' falle para prevenir una reversión accidental:
    // throw new Error(`La eliminación del valor '${NEW_ENUM_VALUE}' del ENUM '${ENUM_NAME_IN_DB}' requiere intervención manual.`);
    return Promise.resolve(); // No hacer nada en el down por seguridad.
  }
};