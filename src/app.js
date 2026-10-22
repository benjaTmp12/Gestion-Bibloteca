const express = require('express');
const path = require('path');
const { getPool } = require('./db/connection');
const libroRoutes = require('./routes/libroRoutes');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/health/db', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query('SELECT COUNT(*) AS libros FROM Libros');
    res.json({ status: 'ok', libros: r.recordset[0].libros });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.use('/api/libros', libroRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
});

module.exports = app;