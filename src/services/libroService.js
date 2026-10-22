const repo = require('../repositories/libroRepository');

async function listarLibros({ q, categoria }) {
  const texto = (q || '').trim();
  if (texto.length > 100) {
    const err = new Error('La búsqueda no puede superar 100 caracteres');
    err.status = 400;
    throw err;
  }
  return texto || categoria ? repo.buscar(texto, categoria) : repo.listar();
}

async function obtenerLibro(id) {
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('ID inválido');
    err.status = 400;
    throw err;
  }
  const libro = await repo.obtenerPorId(id);
  if (!libro) {
    const err = new Error('Libro no encontrado');
    err.status = 404;
    throw err;
  }
  return libro;
}

const listarCategorias = () => repo.categorias();

module.exports = { listarLibros, obtenerLibro, listarCategorias };

