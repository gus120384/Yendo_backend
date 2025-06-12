'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pedidos', { // Nombre de la tabla en la BD
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Nombre de la tabla a la que referencia (Users)
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Si se borra el cliente, se borran sus pedidos. Considera 'SET NULL' si un pedido puede quedar huérfano.
      },
      tecnico_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Un pedido puede no tener técnico asignado inicialmente
        references: {
          model: 'Users', // Nombre de la tabla a la que referencia (Users)
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Si se borra el técnico, el pedido queda sin asignar (o 'RESTRICT' si no se debe borrar)
      },
      descripcion_problema: {
        type: Sequelize.TEXT, // TEXT para descripciones potencialmente largas
        allowNull: false
      },
      // Campos de dirección del servicio (pueden ser diferentes a la del cliente)
      direccion_servicio_calle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_servicio_numero: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_servicio_ciudad: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_servicio_provincia: {
        type: Sequelize.STRING,
        allowNull: true
      },
      direccion_servicio_cp: {
        type: Sequelize.STRING,
        allowNull: true
      },
      // Podrías añadir lat/lng para la dirección del servicio si es necesario
      // direccion_servicio_lat: {
      //   type: Sequelize.DECIMAL(10, 8),
      //   allowNull: true
      // },
      // direccion_servicio_lng: {
      //   type: Sequelize.DECIMAL(11, 8),
      //   allowNull: true
      // },
      estado: {
        type: Sequelize.ENUM(
          'pendiente_asignacion', // Creado por el cliente, esperando técnico
          'asignado',             // Técnico asignado, no ha iniciado viaje
          'tecnico_en_camino',    // Técnico se dirige al lugar
          'en_progreso',          // Técnico trabajando en el sitio
          'pendiente_pago',       // Trabajo finalizado, esperando pago
          'completado',           // Trabajo finalizado y pagado
          'cancelado_cliente',
          'cancelado_tecnico',
          'no_resuelto'           // Técnico no pudo resolverlo
        ),
        allowNull: false,
        defaultValue: 'pendiente_asignacion'
      },
      fecha_estimada_resolucion: { // Fecha que el técnico podría estimar
        type: Sequelize.DATE,
        allowNull: true
      },
      fecha_visita_programada: { // Fecha acordada para la visita
        type: Sequelize.DATE,
        allowNull: true
      },
      notas_tecnico: { // Notas internas del técnico sobre el servicio
        type: Sequelize.TEXT,
        allowNull: true
      },
      calificacion_cliente: { // Calificación dada por el cliente al técnico/servicio
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 }
      },
      comentario_cliente: { // Comentario del cliente sobre el servicio
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Timestamps (consistente con Users)
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Añadir índices para las claves foráneas para mejorar el rendimiento de los joins
    await queryInterface.addIndex('Pedidos', ['cliente_id']);
    await queryInterface.addIndex('Pedidos', ['tecnico_id']);
    await queryInterface.addIndex('Pedidos', ['estado']); // Búsquedas por estado serán comunes
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Pedidos');
  }
};