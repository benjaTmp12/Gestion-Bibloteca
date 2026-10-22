const service = require('../services/libroService');

const listar = async (req, res, next) => {
  try { res.json(await service.listarLibros(req.query)); } catch (e) { next(e); }
};

module.exports = { listar };