const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWishlist,
  getWishlistIds,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
} = require('../controllers/wishlistController');

// همه مسیرها نیاز به احراز هویت دارند
router.use(protect);

router.get('/', getWishlist);
router.get('/ids', getWishlistIds);
router.post('/add', addToWishlist);
router.post('/toggle', toggleWishlist);
router.delete('/clear', clearWishlist);
router.delete('/:productId', removeFromWishlist);

module.exports = router;
