const service = require('../services/socioService');

async function listar(req, res, next) {
  try { res.json({ data: await service.listarSocios(req.query) }); } catch (error) { next(error); }
}
module.exports = { listar };
