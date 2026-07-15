const express = require('express');
const { getActiveDiscounts } = require('../controllers/publicDiscountController');

const router = express.Router();

// مسیر عمومی — بدون نیاز به لاگین
router.get('/active', getActiveDiscounts);

module.exports = router;
