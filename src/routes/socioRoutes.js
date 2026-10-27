const router = require('express').Router();
const controller = require('../controllers/socioController');
const apiError = require('../utils/apiError');

router.get('/', controller.listar);
router.use(apiError);
module.exports = router;
