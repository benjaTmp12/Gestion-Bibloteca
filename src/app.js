const express = require('express');
const path = require('path');
const { getDb } = require('./db/connection');
const libroRoutes = require('./routes/libroRoutes');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/health/db', async (req, res) => {
  try {
    await getDb().collection('libros').limit(1).get();
    res.json({ status: 'ok', base: 'firestore' });
  } catch (e) {
    console.error('No se pudo comprobar Firestore:', e.code || e.name);
    res.status(503).json({ status: 'error', message: 'Base de datos no disponible' });
  }
});

app.use('/api/libros', libroRoutes);
app.use('/api/socios', require('./routes/socioRoutes'));
app.use('/api/prestamos', require('./routes/prestamoRoutes'));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
});

module.exports = app;
