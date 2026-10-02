const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { validateDiscount, createOrder, getMyOrders, getOrderById, cancelOrder, restoreCartFromOrder } = require('../controllers/orderController');

const router = express.Router();
router.use(protect);

router.post('/validate-discount', validateDiscount);
router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/restore-cart', protect, restoreCartFromOrder);
 
module.exports = router;
