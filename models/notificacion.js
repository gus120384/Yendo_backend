'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Notificacion extends Model {
    static associate(models) {
      // Una notificación pertenece a un Usuario (el destinatario)
      Notificacion.belongsTo(models.User, {
        foreignKey: 'usuario_id',
        as: 'destinatario',
        onDelete: 'CASCADE', // Si se borra el usuario, se borran sus notificaciones
      });

      // Una notificación puede estar relacionada con un Pedido (opcional)
      Notificacion.belongsTo(models.Pedido, {
        foreignKey: 'pedido_id',
        as: 'pedidoRelacionado',
        allowNull: true, // Puede no estar ligada a un pedido
        onDelete: 'SET NULL', // Si se borra el pedido, la notificación no se borra pero pedido_id queda null
      });

      // Una notificación puede tener un Usuario emisor (opcional)
      Notificacion.belongsTo(models.User, {
        foreignKey: 'emisor_id',
        as: 'emisor',
        allowNull: true, // Puede no haber un emisor específico (ej. notificación del sistema)
        onDelete: 'SET NULL', // Si se borra el emisor, la notificación no se borra pero emisor_id queda null
      });
    }
  }

  Notificacion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: { // Destinatario de la notificación
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // Nombre de la tabla de Usuarios
        key: 'id',
      },
    },
    tipo_notificacion: {
      type: DataTypes.ENUM(
        // Generales Cliente
        'PEDIDO_CREADO_CONFIRMACION',
        'PEDIDO_ASIGNADO_TECNICO',
        'PEDIDO_EN_PROGRESO',
        'PEDIDO_COMPLETADO',
        'PEDIDO_NO_RESUELTO_CLIENTE',
        'PEDIDO_CANCELADO_POR_TERCERO',
        // Flujo Taller Cliente
        'PEDIDO_RETIRADO_A_TALLER',
        'PRESUPUESTO_PEDIDO_LISTO',
        'PEDIDO_LISTO_PARA_ENTREGA',
        'PEDIDO_EN_CAMINO_ENTREGA',
        'PEDIDO_PENDIENTE_DE_PAGO',
        // Generales Técnico
        'NUEVO_PEDIDO_ASIGNADO_TECNICO',
        'PEDIDO_CANCELADO_POR_CLIENTE',
        'PEDIDO_REASIGNADO_O_CANCELADO_ADMIN',
        'NUEVA_CALIFICACION_RECIBIDA',
        // Generales Admin
        'NUEVO_PEDIDO_POR_ASIGNAR_ADMIN',
        'ALERTA_PEDIDO_SIN_ASIGNAR',
        'INFO_PEDIDO_NO_RESUELTO_ADMIN',
        'ALERTA_BAJA_CALIFICACION',
        'INFO_PEDIDO_RETIRADO_TALLER_ADMIN',
        'PRESUPUESTO_CLIENTE_APROBADO_ADMIN',
        'PRESUPUESTO_CLIENTE_RECHAZADO_ADMIN',
        'INFO_PEDIDO_LISTO_ENTREGA_ADMIN',
        // Otros
        'NUEVO_MENSAJE',
        'NUEVO_USUARIO_REGISTRADO_ADMIN',
        'NUEVO_MENSAJE_PEDIDO' // <--- VALOR AÑADIDO AQUÍ
      ),
      allowNull: false,
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    leida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    pedido_id: { // ID del pedido relacionado (si aplica)
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Pedidos', // Nombre de la tabla de Pedidos
        key: 'id',
      },
    },
    emisor_id: { // ID del usuario que originó el evento (si aplica)
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users', // Nombre de la tabla de Usuarios
        key: 'id',
      },
    },
    url_relacionada: { // Enlace para llevar al usuario a la entidad relevante en el frontend
      type: DataTypes.STRING,
      allowNull: true,
    },
    // createdAt y updatedAt serán manejados por Sequelize
  }, {
    sequelize,
    modelName: 'Notificacion',
    tableName: 'Notificaciones',
    timestamps: true,
    underscored: true,
  });

  return Notificacion;
};