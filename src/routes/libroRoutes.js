const router = require('express').Router();
const c = require('../controllers/libroController');

router.get('/', c.listar);
router.get('/categorias', c.categorias);
router.get('/:id', c.obtener);

module.exports = router;