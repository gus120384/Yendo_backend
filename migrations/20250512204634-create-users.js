'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // --- Función UP: Crea la tabla ---
    await queryInterface.createTable('Users', { // Nombre de la tabla: 'Users'
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      apellido: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telefono: {
        type: Sequelize.STRING,
        allowNull: true
      },
      rol: {
        type: Sequelize.ENUM('cliente', 'tecnico', 'administrador', 'admin_prime'),
        allowNull: false,
        defaultValue: 'cliente'
      },
      direccion_calle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_numero: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_ciudad: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_provincia: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_cp: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ubicacion_actual_lat: {
        type: Sequelize.DECIMAL(10, 8), // Coincidir con el modelo
        allowNull: true
      },
      ubicacion_actual_lng: {
        type: Sequelize.DECIMAL(11, 8), // Coincidir con el modelo
        allowNull: true
      },
      fecha_ultima_ubicacion: {
        type: Sequelize.DATE,
        allowNull: true
      },
      activo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      // Clave foránea: nombre de columna en snake_case
      administrador_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE', // Opcional: qué hacer si el id del admin cambia
        onDelete: 'SET NULL' // Opcional: si se borra el admin, poner null aquí
      },
      // Timestamps: nombres en snake_case
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') // Valor por defecto
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Opcional: Crear índices para mejorar rendimiento en búsquedas frecuentes
    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('Users', ['rol']);
  },

  async down(queryInterface, Sequelize) {
    // --- Función DOWN: Elimina la tabla ---
    await queryInterface.dropTable('Users');
  }
};