'use strict';

const fs = require('fs');
const path = require('path');
// Importamos la instancia de sequelize Y la clase Sequelize desde nuestro archivo de configuración centralizado
const { sequelize, Sequelize } = require('../config/database.js'); // Ajusta la ruta si es necesario

const basename = path.basename(__filename);
const db = {};

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    // Cada archivo de modelo exporta una función que espera (sequelizeInstance, DataTypes)
    // Pasamos la instancia 'sequelize' y 'Sequelize.DataTypes' (que es lo mismo que DataTypes importado directamente de 'sequelize')
    const modelDefinition = require(path.join(__dirname, file));
    const model = modelDefinition(sequelize, Sequelize.DataTypes); // Usamos Sequelize.DataTypes de nuestra importación centralizada
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db); // Llama a las asociaciones
  }
});

// Adjuntamos la instancia de sequelize y la clase Sequelize al objeto db
// Esto permite acceder a ellos desde cualquier lugar donde se importe 'db'
// ej. db.sequelize.transaction() o db.Sequelize.Op
db.sequelize = sequelize;   // La instancia configurada
db.Sequelize = Sequelize;   // La clase Sequelize misma (para Op, fn, etc.)

module.exports = db;