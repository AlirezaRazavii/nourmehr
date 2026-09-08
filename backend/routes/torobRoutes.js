const express = require('express');
const { verifyTorobToken } = require('../middleware/torobAuth');
const { getTorobProducts } = require('../controllers/torobController');

const router = express.Router();

// همهٔ مسیرهای ترب پشت احراز هویت JWT ترب هستند
router.use(verifyTorobToken);

// POST /torob_api/v3/products — مطابق مستندات Torob Product API v3
router.post('/products', getTorobProducts);

module.exports = router;