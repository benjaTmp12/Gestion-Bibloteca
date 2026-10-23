const repo = require('../repositories/socioRepository');
const { validarFiltrosSocios } = require('./prestamoValidaciones');

async function listarSocios(query) {
  const { activo } = validarFiltrosSocios(query);
  return (await repo.listar()).filter(socio => activo === undefined || socio.activo === activo);
}
module.exports = { listarSocios };
