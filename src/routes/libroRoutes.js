const router = require('express').Router();
const c = require('../controllers/libroController');
const apiError = require('../utils/apiError');
router.post('/', c.crear, apiError);
router.put('/:id', c.actualizar, apiError);
router.delete('/:id', c.eliminar, apiError);

router.get('/', c.listar);
router.get('/categorias', c.categorias);
router.get('/:id', c.obtener);

module.exports = router;
