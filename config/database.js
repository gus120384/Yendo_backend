// config/database.js
const { Sequelize: SequelizeClass } = require('sequelize'); // <--- 1. Importa la clase Sequelize
const path = require('path');
const dotenv = require('dotenv');

// Determinar qué archivo .env cargar
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });
} else {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

const configPath = path.join(__dirname, 'config.json'); // Asumiendo que config.json está en la misma carpeta 'config'
let config;
try {
  config = require(configPath); // Sequelize CLI crea este archivo
} catch (error) {
  console.error("Error: No se pudo cargar 'config/config.json'. Asegúrate de que el archivo exista y sea JSON válido.");
  console.error("Detalle del error:", error);
  process.exit(1);
}


const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelizeInstance; // Renombro para evitar confusión con la clase Sequelize

if (!dbConfig) {
  console.error(`Error: Configuración para el entorno '${env}' no encontrada en config.json`);
  if (env === 'test' && !process.env.DATABASE_URL && !dbConfig.database) {
    console.error("Para el entorno de prueba, asegúrate de que 'DATABASE_URL' esté definida en '.env.test' o que la configuración de 'test' en 'config.json' esté completa.");
  }
  process.exit(1);
}

if (dbConfig.use_env_variable && process.env[dbConfig.use_env_variable]) {
  sequelizeInstance = new SequelizeClass(process.env[dbConfig.use_env_variable], {
    ...dbConfig,
    dialect: dbConfig.dialect || 'postgres', // Asegurar dialecto
    logging: dbConfig.logging === undefined ? (env === 'development' ? console.log : false) : dbConfig.logging,
  });
} else if (dbConfig.database) {
  sequelizeInstance = new SequelizeClass(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: dbConfig.dialect || 'postgres', // Asegurar dialecto
      logging: dbConfig.logging === undefined ? (env === 'development' ? console.log : false) : dbConfig.logging,
      // dialectOptions para SSL si fuera necesario en producción
    }
  );
} else {
  console.error(`Error: No se pudo configurar Sequelize. Faltan 'use_env_variable' o 'database' en la configuración para el entorno '${env}'.`);
  process.exit(1);
}

const testDbConnection = async () => {
  try {
    await sequelizeInstance.authenticate();
    console.log(`Conexión a la base de datos '${sequelizeInstance.config.database || process.env[dbConfig.use_env_variable]}' (entorno: ${env}) establecida correctamente.`);
  } catch (error) {
    console.error(`Error al conectar a la base de datos '${sequelizeInstance.config.database || process.env[dbConfig.use_env_variable]}' (entorno: ${env}):`, error.message);
  }
};

// Si NODE_ENV no es 'test', prueba la conexión al arrancar (opcional)
if (process.env.NODE_ENV !== 'test') {
   // testDbConnection(); // Puedes llamarlo aquí o en server.js
}


module.exports = {
  sequelize: sequelizeInstance, // <--- 2. Exporta la instancia con el nombre 'sequelize'
  Sequelize: SequelizeClass,    // <--- 3. Exporta la CLASE Sequelize con el nombre 'Sequelize'
  testDbConnection
};