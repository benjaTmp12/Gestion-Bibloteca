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

module.exports = { listarLibros };

