// server.js - CÓDIGO CORRECTO Y COMPLETO

require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");
const app = require('./app');
const { testDbConnection } = require('./config/database');
const verifyTokenSocket = require('./middleware/socketAuth');

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // URL EXACTA de tu frontend Vite
    methods: ["GET", "POST"],
  }
});

// Adjuntamos 'io' a la app para que esté disponible en todas las rutas y controladores
app.set('socketio', io);

// Middleware de autenticación para cada nueva conexión de socket
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const user = await verifyTokenSocket(token);
      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket.IO] Error de autenticación:', error.message);
      next(new Error(`Authentication error: ${error.message}`));
    }
  } else {
    console.log('[Socket.IO] Autenticación fallida: No se proporcionó token.');
    next(new Error('Authentication error: Token not provided'));
  }
});

// Manejador de eventos para cuando un cliente se conecta exitosamente
io.on('connection', (socket) => {
  console.log(`[Socket.IO] ✅ Cliente conectado: ${socket.id}. Usuario: ${socket.user.nombre} (ID: ${socket.user.id})`);

  const userRoom = `user_${socket.user.id}`;
  socket.join(userRoom);
  console.log(`[Socket.IO] Usuario ${socket.user.id} se unió a la sala ${userRoom}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] ❌ Cliente desconectado: ${socket.id}. Razón: ${reason}.`);
  });
});

const startServer = async () => {
  console.log('Intentando conectar a la base de datos...');
  try {
    await testDbConnection();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor TecniGo (con Socket.IO) corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor.', error);
    process.exit(1);
  }
};

startServer();