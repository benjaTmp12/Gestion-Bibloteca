const service = require('../services/libroService');

const listar = async (req, res, next) => {
  try { res.json(await service.listarLibros(req.query)); } catch (e) { next(e); }
};

const obtener = async (req, res, next) => {
  try { res.json(await service.obtenerLibro(parseInt(req.params.id, 10))); } catch (e) { next(e); }
};

const categorias = async (req, res, next) => {
  try { res.json(await service.listarCategorias()); } catch (e) { next(e); }
};

module.exports = { listar, obtener, categorias };