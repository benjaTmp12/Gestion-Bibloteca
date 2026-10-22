const { sql, getPool } = require('../db/connection');

const BASE = `
  SELECT l.id, l.titulo, l.autor, l.isbn, l.categoria, l.anio, l.copias_total,
         l.copias_total - COUNT(p.id) AS disponibles
  FROM Libros l
  LEFT JOIN Prestamos p ON p.libro_id = l.id AND p.fecha_devolucion IS NULL
`;
const GROUP = ' GROUP BY l.id, l.titulo, l.autor, l.isbn, l.categoria, l.anio, l.copias_total';

async function listar() {
  const pool = await getPool();
  const r = await pool.request().query(BASE + GROUP + ' ORDER BY l.titulo');
  return r.recordset;
}

async function buscar(texto, categoria) {
  const pool = await getPool();
  const r = await pool.request()
    .input('q', sql.NVarChar, `%${texto || ''}%`)
    .input('cat', sql.NVarChar, categoria || null)
    .query(BASE + `
      WHERE (l.titulo LIKE @q OR l.autor LIKE @q OR l.isbn LIKE @q)
        AND (@cat IS NULL OR l.categoria = @cat)` + GROUP + ' ORDER BY l.titulo');
  return r.recordset;
}

async function obtenerPorId(id) {
  const pool = await getPool();
  const r = await pool.request().input('id', sql.Int, id)
    .query(BASE + ' WHERE l.id = @id' + GROUP);
  return r.recordset[0];
}
async function categorias() {
  const pool = await getPool();
  const r = await pool.request().query('SELECT DISTINCT categoria FROM Libros ORDER BY categoria');
  return r.recordset.map(x => x.categoria);
}




module.exports = { listar, buscar, obtenerPorId, categorias };