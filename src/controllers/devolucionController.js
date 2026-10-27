const service = require('../services/devolucionService');

async function devolver(req, res, next) {
  try { res.json({ data: await service.devolverPrestamo(req.params.id, req.body) }); }
  catch (error) { next(error); }
}
module.exports = { devolver };
