const express = require('express');
const { getProducts, getProductBySlugOrId, getCategories } = require('../controllers/productController');

const router = express.Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductBySlugOrId);

module.exports = router;