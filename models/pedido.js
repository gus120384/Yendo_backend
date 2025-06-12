// backend/src/models/pedido.js - VERSIÓN FINAL CON NUEVOS CAMPOS Y ESTADOS

'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Pedido extends Model {
    static associate(models) {
      // Asociaciones existentes (sin cambios)
      Pedido.belongsTo(models.User, { foreignKey: 'cliente_id', as: 'cliente' });
      Pedido.belongsTo(models.User, { foreignKey: 'tecnico_id', as: 'tecnico', allowNull: true });
      Pedido.hasMany(models.Conversacion, { foreignKey: 'pedido_id', as: 'conversaciones' });
      if (models.Notificacion) { Pedido.hasMany(models.Notificacion, { foreignKey: 'pedido_id', as: 'notificaciones', onDelete: 'CASCADE' }); }
      
      Pedido.belongsTo(models.User, {
        foreignKey: 'servicio_tecnico_id',
        as: 'servicio_tecnico',
        constraints: false 
      });

      // ▼▼▼ NUEVAS ASOCIACIONES PARA LAS PROPUESTAS ▼▼▼
      // Un pedido puede tener una propuesta para un técnico o un servicio.
      Pedido.belongsTo(models.User, { foreignKey: 'tecnico_propuesto_id', as: 'tecnicoPropuesto', allowNull: true });
      Pedido.belongsTo(models.User, { foreignKey: 'servicio_tecnico_propuesto_id', as: 'servicioTecnicoPropuesto', allowNull: true });
    }
  }

  Pedido.init({
    // Columnas existentes
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    tecnico_id: { type: DataTypes.INTEGER, allowNull: true },
    servicio_tecnico_id: { type: DataTypes.INTEGER, allowNull: true },
    descripcion_problema: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: { msg: "La descripción del problema no puede estar vacía." } } },
    direccion_servicio_calle: { type: DataTypes.STRING, allowNull: true },
    direccion_servicio_numero: { type: DataTypes.STRING, allowNull: true },
    direccion_servicio_ciudad: { type: DataTypes.STRING, allowNull: true },
    direccion_servicio_provincia: { type: DataTypes.STRING, allowNull: true },
    direccion_servicio_cp: { type: DataTypes.STRING, allowNull: true },
    pedido_lat: { type: DataTypes.FLOAT, allowNull: true },
    pedido_lng: { type: DataTypes.FLOAT, allowNull: true },
     usuarios_que_rechazaron: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      defaultValue: [],
    },
    
    // ▼▼▼ ENUM DE ESTADO ACTUALIZADO ▼▼▼
    estado: { 
      type: DataTypes.ENUM(
        'buscando_tecnico',         // Nuevo estado inicial
        'pendiente_aceptacion',     // Ofrecido a un técnico/servicio
        'pendiente_asignacion',     // Aceptado por un admin, necesita asignar técnico interno
        'asignado',                 // Asignado a un técnico final
        'tecnico_en_camino',
        'en_progreso',
        'retiro_a_taller',
        'en_taller',
        'listo_para_entrega',
        'en_camino_entrega',
        'pendiente_pago',
        'completado',
        'cancelado_cliente',
        'cancelado_tecnico',
        'cancelado_admin',
        'no_resuelto'
      ), 
      allowNull: false, 
      defaultValue: 'buscando_tecnico' // El nuevo valor por defecto
    },

    fecha_estimada_resolucion: { type: DataTypes.DATE, allowNull: true },
    fecha_visita_programada: { type: DataTypes.DATE, allowNull: true },
    notas_tecnico: { type: DataTypes.TEXT, allowNull: true },
    calificacion_cliente: { type: DataTypes.INTEGER, allowNull: true, validate: { min: { args: [1], msg: "La calificación debe ser al menos 1." }, max: { args: [5], msg: "La calificación no puede ser mayor a 5." } } },
    comentario_cliente: { type: DataTypes.TEXT, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    
    // ▼▼▼ NUEVAS COLUMNAS AÑADIDAS AQUÍ ▼▼▼
    zona_pedido: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tecnico_propuesto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
    servicio_tecnico_propuesto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    }

  }, {
    sequelize,
    modelName: 'Pedido',
    tableName: 'Pedidos',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Pedido;
};