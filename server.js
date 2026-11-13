const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// --- CONFIGURACIÓN DE BASE DE DATOS (NEON) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- CONFIGURACIÓN DE SUBIDA DE ARCHIVOS ---
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// --- SERVIDOR Y TIEMPO REAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 
app.use('/uploads', express.static('uploads')); 

// --- RUTAS ---
app.get('/', (req, res) => {
  res.json({ mensaje: '¡Backend escuchando y conectado a la base de datos!' });
});

// 1. Crear tabla
app.get('/crear-tabla', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS libros (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        autor VARCHAR(255),
        archivo_url VARCHAR(255),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send('✅ Tabla "libros" creada exitosamente en Neon.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear la tabla');
  }
});

// 2. Subir libro
app.post('/api/subir-libro', upload.single('archivo'), async (req, res) => {
  try {
    const { titulo, autor } = req.body;
    const archivo_url = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      'INSERT INTO libros (titulo, autor, archivo_url) VALUES ($1, $2, $3) RETURNING *',
      [titulo, autor, archivo_url]
    );

    const nuevoLibro = result.rows[0];
    io.emit('nuevo-libro', nuevoLibro);

    res.json({ mensaje: 'Libro subido con éxito', libro: nuevoLibro });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al subir el libro');
  }
});

// 3. Obtener libros
app.get('/api/libros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM libros ORDER BY creado_en DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener libros');
  }
});

// 4. Eliminar libro
app.delete('/api/libros/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM libros WHERE id = $1', [req.params.id]);
    io.emit('libro-eliminado', req.params.id);
    res.json({ mensaje: 'Libro eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar');
  }
});

// --- INICIAR SERVIDOR ---
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
