const service = require('../services/libroService');

const listar = async (req, res, next) => {
  try { res.json(await service.listarLibros(req.query)); } catch (e) { next(e); }
};

const obtener = async (req, res, next) => {
  try { res.json(await service.obtenerLibro(req.params.id)); } catch (e) { next(e); }
};

const categorias = async (req, res, next) => {
  try { res.json(await service.listarCategorias()); } catch (e) { next(e); }
};

const crear = async (req, res, next) => {
  try { res.status(201).json({ data: await service.crearLibro(req.body) }); } catch (e) { next(e); }
};
const actualizar = async (req, res, next) => {
  try { res.json({ data: await service.actualizarLibro(req.params.id, req.body) }); } catch (e) { next(e); }
};
const eliminar = async (req, res, next) => {
  try { await service.eliminarLibro(req.params.id); res.status(204).end(); } catch (e) { next(e); }
};
module.exports = { listar, obtener, categorias, crear, actualizar, eliminar };
