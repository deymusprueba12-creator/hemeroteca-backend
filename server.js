const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path'); // <-- Añadimos esto

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// Ruta principal
app.get('/', (req, res) => {
  res.json({ mensaje: '¡Backend escuchando!' });
});

// RUTA EXPLÍCITA PARA LA PRUEBA (Por si el navegador no encuentra el .html)
app.get('/prueba', (req, res) => {
  res.sendFile(path.join(__dirname, 'prueba.html'));
});

// RUTA DE TIEMPO REAL
app.get('/simular-subida', (req, res) => {
  io.emit('nuevo-libro', { 
    titulo: 'El Quijote de la Mancha', 
    mensaje: '¡El docente acaba de subir un nuevo libro!' 
  });
  res.send('Se ha simulado la subida de un libro. ¡Revisa la otra pestaña!');
});

io.on('connection', (socket) => {
  console.log('🟢 Un usuario se ha conectado al tiempo real');
  socket.on('disconnect', () => {
    console.log('🔴 Un usuario se ha desconectado');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});