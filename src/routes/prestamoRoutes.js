const router = require('express').Router();
const controller = require('../controllers/prestamoController');
const apiError = require('../utils/apiError');

router.post('/', controller.crear);
router.get('/', controller.listar);
router.use(apiError);
module.exports = router;
