const express = require('express');

const { protect, admin } = require('../middleware/authMiddleware');
const { hasPermission, superAdminOnly } = require('../middleware/permissionMiddleware');
const { PERMISSIONS, PERMISSION_LIST } = require('../config/permissions');
const { upload, handleUploadError } = require('../middleware/upload');
const uploadHero = require('../middleware/uploadHero');

const { getDashboardStats } = require('../controllers/admin/dashboardController');
const { getOrders, getOrderById, updateOrderStatus } = require('../controllers/admin/orderController');
const {
  getUsers,
  updateUserStatus,
  updateUserRole,
  updateUserPermissions,
  revokeUserSessions,
  revokeAllSessions,
} = require('../controllers/admin/userController');

const { getPayments, verifyPaymentByAdmin, refundPaymentByAdmin } = require('../controllers/admin/paymentController');
const { getTickets, getTicketById, replyToTicket, updateTicketStatus } = require('../controllers/admin/ticketController');
const { getDiscounts, createDiscount, updateDiscount, deleteDiscount } = require('../controllers/admin/discountController');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, uploadProductImage, deleteProductImage } = require('../controllers/admin/productController');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  deleteCategoryImage,
} = require('../controllers/admin/categoryController');
const { getSettings, updateSettings } = require('../controllers/admin/settingController');
const { getCollections, createCollection, updateCollection, deleteCollection, setCollectionProducts } = require('../controllers/admin/collectionController');
const blogController = require('../controllers/admin/blogController');
const reviewController = require('../controllers/admin/reviewController');
const notificationController = require('../controllers/admin/notificationController');
const heroCtrl = require('../controllers/admin/heroController');

const router = express.Router();

router.use(protect, admin);

// هیچ پاسخ پنل ادمین نباید کش شود
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  next();
});

/* --------------------------------- دسترسی‌ها -------------------------------- */
router.get('/permissions', superAdminOnly, (req, res) => {
  res.json({ success: true, data: PERMISSION_LIST });
});

/* --------------------------------- داشبورد --------------------------------- */
router.get('/dashboard', getDashboardStats);

/* --------------------------------- سفارشات --------------------------------- */
router.get('/orders', hasPermission(PERMISSIONS.ORDERS), getOrders);
router.get('/orders/:id', hasPermission(PERMISSIONS.ORDERS), getOrderById);
router.put('/orders/:id/status', hasPermission(PERMISSIONS.ORDERS), updateOrderStatus);

/* --------------------------------- کاربران --------------------------------- */
router.get('/users', hasPermission(PERMISSIONS.USERS), getUsers);
router.post('/users/revoke-all-sessions', superAdminOnly, revokeAllSessions);
router.put('/users/:id/status', hasPermission(PERMISSIONS.USERS), updateUserStatus);
router.put('/users/:id/revoke-sessions', hasPermission(PERMISSIONS.USERS), revokeUserSessions);
router.put('/users/:id/role', superAdminOnly, updateUserRole);
router.put('/users/:id/permissions', superAdminOnly, updateUserPermissions);

/* -------------------------------- پرداخت‌ها -------------------------------- */
router.get('/payments', hasPermission(PERMISSIONS.PAYMENTS), getPayments);
router.post('/payments/:id/verify', hasPermission(PERMISSIONS.PAYMENTS), verifyPaymentByAdmin);
router.post('/payments/:id/refund', hasPermission(PERMISSIONS.PAYMENTS), refundPaymentByAdmin);

/* --------------------------------- تیکت‌ها --------------------------------- */
router.get('/tickets', hasPermission(PERMISSIONS.TICKETS), getTickets);
router.get('/tickets/:id', hasPermission(PERMISSIONS.TICKETS), getTicketById);
router.post('/tickets/:id/reply', hasPermission(PERMISSIONS.TICKETS), replyToTicket);
router.put('/tickets/:id/status', hasPermission(PERMISSIONS.TICKETS), updateTicketStatus);

/* -------------------------------- تخفیف‌ها --------------------------------- */
router.get('/discounts', hasPermission(PERMISSIONS.DISCOUNTS), getDiscounts);
router.post('/discounts', hasPermission(PERMISSIONS.DISCOUNTS), createDiscount);
router.put('/discounts/:id', hasPermission(PERMISSIONS.DISCOUNTS), updateDiscount);
router.delete('/discounts/:id', hasPermission(PERMISSIONS.DISCOUNTS), deleteDiscount);

/* -------------------------------- محصولات ---------------------------------- */
// مسیرهای ثابت باید قبل از مسیرهای پارامتری تعریف شوند
router.post(
  '/products/upload-image',
  hasPermission(PERMISSIONS.PRODUCTS),
  upload.single('image'),
  handleUploadError,
  uploadProductImage
);
router.post('/products/delete-image', hasPermission(PERMISSIONS.PRODUCTS), deleteProductImage);

router.get('/products', hasPermission(PERMISSIONS.PRODUCTS), getProducts);
router.post('/products', hasPermission(PERMISSIONS.PRODUCTS), createProduct);
router.get('/products/:id', hasPermission(PERMISSIONS.PRODUCTS), getProductById);
router.put('/products/:id', hasPermission(PERMISSIONS.PRODUCTS), updateProduct);
router.delete('/products/:id', hasPermission(PERMISSIONS.PRODUCTS), deleteProduct);

/* ------------------------------ دسته‌بندی‌ها -------------------------------- */
router.post(
  '/categories/upload-image',
  hasPermission(PERMISSIONS.CATEGORIES),
  upload.single('image'),
  handleUploadError,
  uploadCategoryImage
);
router.post('/categories/delete-image', hasPermission(PERMISSIONS.CATEGORIES), deleteCategoryImage);

router.get('/categories', hasPermission(PERMISSIONS.CATEGORIES), getCategories);
router.post('/categories', hasPermission(PERMISSIONS.CATEGORIES), createCategory);
router.put('/categories/:id', hasPermission(PERMISSIONS.CATEGORIES), updateCategory);
router.delete('/categories/:id', hasPermission(PERMISSIONS.CATEGORIES), deleteCategory);

/* --------------------------------- تنظیمات --------------------------------- */
router.get('/settings', hasPermission(PERMISSIONS.SETTINGS), getSettings);
router.put('/settings', hasPermission(PERMISSIONS.SETTINGS), updateSettings);

/* ----------------------------- هیرو (اسلایدر) ------------------------------- */
router.get('/hero', hasPermission(PERMISSIONS.HERO), heroCtrl.getHero);
router.put('/hero/settings', hasPermission(PERMISSIONS.HERO), heroCtrl.updateSettings);
router.post(
  '/hero/upload',
  hasPermission(PERMISSIONS.HERO),
  uploadHero.single('image'),
  handleUploadError,
  heroCtrl.uploadHeroImage
);
router.post('/hero/slides', hasPermission(PERMISSIONS.HERO), heroCtrl.addSlide);
router.put('/hero/slides-order', hasPermission(PERMISSIONS.HERO), heroCtrl.reorderSlides);
router.put('/hero/slides/:slideId', hasPermission(PERMISSIONS.HERO), heroCtrl.updateSlide);
router.delete('/hero/slides/:slideId', hasPermission(PERMISSIONS.HERO), heroCtrl.deleteSlide);

/* -------------------------------- کالکشن‌ها -------------------------------- */
router.get('/collections', hasPermission(PERMISSIONS.COLLECTIONS), getCollections);
router.post('/collections', hasPermission(PERMISSIONS.COLLECTIONS), createCollection);
router.put('/collections/:id/products', hasPermission(PERMISSIONS.COLLECTIONS), setCollectionProducts);
router.put('/collections/:id', hasPermission(PERMISSIONS.COLLECTIONS), updateCollection);
router.delete('/collections/:id', hasPermission(PERMISSIONS.COLLECTIONS), deleteCollection);

/* ----------------------------- اخبار و مقالات ------------------------------- */
router.get('/blogs', hasPermission(PERMISSIONS.BLOGS), blogController.getBlogs);
router.post('/blogs', hasPermission(PERMISSIONS.BLOGS), blogController.createBlog);
router.get('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.getBlogById);
router.put('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.updateBlog);
router.delete('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.deleteBlog);

/* --------------------------------- نظرات ----------------------------------- */
router.get('/reviews', hasPermission(PERMISSIONS.REVIEWS), reviewController.getReviews);
router.put('/reviews/:id/approve', hasPermission(PERMISSIONS.REVIEWS), reviewController.approveReview);
router.delete('/reviews/:id', hasPermission(PERMISSIONS.REVIEWS), reviewController.deleteReview);

/* -------------------------------- اعلان‌ها --------------------------------- */
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/read-all', notificationController.markAllAsRead);
router.put('/notifications/:id/read', notificationController.markAsRead);

module.exports = router;
