const service = require('../services/prestamoService');

async function crear(req, res, next) {
  try { res.status(201).json({ data: await service.crearPrestamo(req.body) }); }
  catch (error) { next(error); }
}
async function listar(req, res, next) {
  try { res.json({ data: await service.listarPrestamos(req.query) }); }
  catch (error) { next(error); }
}
module.exports = { crear, listar };
