const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile, updateProfile,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
  getDashboardStats,
} = require('../controllers/userController');

const router = express.Router();
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.put('/addresses/:addressId/default', setDefaultAddress);

router.get('/dashboard/stats', getDashboardStats);

module.exports = router;
