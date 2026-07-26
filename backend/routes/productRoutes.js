const express = require('express');
const {
  getProducts,
  getProductBySlugOrId,
  getCategories,
} = require('../controllers/productController');

const router = express.Router();

// ترتیب مهم است: مسیرهای ثابت قبل از پارامتری
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProductBySlugOrId);

module.exports = router;
