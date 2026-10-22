const repo = require('../repositories/libroRepository');

async function listarLibros({ q, categoria }) {
  const texto = (q || '').trim();
  return texto || categoria ? repo.buscar(texto, categoria) : repo.listar();
}

module.exports = { listarLibros };