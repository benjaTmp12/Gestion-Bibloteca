const router = require('express').Router();
const controller = require('../controllers/devolucionController');
const apiError = require('../utils/apiError');

router.put('/:id/devolucion', controller.devolver);
router.use(apiError);
module.exports = router;
