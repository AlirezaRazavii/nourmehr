const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { hasPermission, superAdminOnly } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const { upload } = require('../middleware/upload');
const { getDashboardStats } = require('../controllers/admin/dashboardController');
const { getOrders, getOrderById, updateOrderStatus } = require('../controllers/admin/orderController');
const { getUsers, updateUserStatus, updateUserRole, updateUserPermissions } = require('../controllers/admin/userController');
const { getPayments, verifyPaymentByAdmin, refundPaymentByAdmin } = require('../controllers/admin/paymentController');
const { getTickets, getTicketById, replyToTicket, updateTicketStatus } = require('../controllers/admin/ticketController');
const { getDiscounts, createDiscount, updateDiscount, deleteDiscount } = require('../controllers/admin/discountController');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, uploadProductImage, deleteProductImage } = require('../controllers/admin/productController');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/admin/categoryController');
const { getSettings, updateSettings } = require('../controllers/admin/settingController');
const { getCollections, createCollection, updateCollection, deleteCollection, setCollectionProducts } = require('../controllers/admin/collectionController');
const blogController = require('../controllers/admin/blogController');
const reviewController = require('../controllers/admin/reviewController');
const notificationController = require('../controllers/admin/notificationController');
const { PERMISSION_LIST } = require('../config/permissions');


const router = express.Router();
router.use(protect, admin);

// لیست دسترسی‌های قابل تعریف — فقط مدیر کل
router.get('/permissions', superAdminOnly, (req, res) => {
  res.json({ success: true, data: PERMISSION_LIST });
});


// داشبورد برای همه‌ی ادمین‌ها باز است (فقط آمار کلی)
router.get('/dashboard', getDashboardStats);

// سفارشات
router.get('/orders', hasPermission(PERMISSIONS.ORDERS), getOrders);
router.get('/orders/:id', hasPermission(PERMISSIONS.ORDERS), getOrderById);
router.put('/orders/:id/status', hasPermission(PERMISSIONS.ORDERS), updateOrderStatus);

// کاربران — مشاهده با مجوز users، ولی تغییر نقش و مجوز فقط برای مدیرکل
router.get('/users', hasPermission(PERMISSIONS.USERS), getUsers);
router.put('/users/:id/status', hasPermission(PERMISSIONS.USERS), updateUserStatus);
router.put('/users/:id/role', superAdminOnly, updateUserRole);
router.put('/users/:id/permissions', superAdminOnly, updateUserPermissions);

// پرداخت‌ها
router.get('/payments', hasPermission(PERMISSIONS.PAYMENTS), getPayments);
router.post('/payments/:id/verify', hasPermission(PERMISSIONS.PAYMENTS), verifyPaymentByAdmin);
router.post('/payments/:id/refund', hasPermission(PERMISSIONS.PAYMENTS), refundPaymentByAdmin);

// تیکت‌ها
router.get('/tickets', hasPermission(PERMISSIONS.TICKETS), getTickets);
router.get('/tickets/:id', hasPermission(PERMISSIONS.TICKETS), getTicketById);
router.post('/tickets/:id/reply', hasPermission(PERMISSIONS.TICKETS), replyToTicket);
router.put('/tickets/:id/status', hasPermission(PERMISSIONS.TICKETS), updateTicketStatus);

// تخفیف‌ها
router.get('/discounts', hasPermission(PERMISSIONS.DISCOUNTS), getDiscounts);
router.post('/discounts', hasPermission(PERMISSIONS.DISCOUNTS), createDiscount);
router.put('/discounts/:id', hasPermission(PERMISSIONS.DISCOUNTS), updateDiscount);
router.delete('/discounts/:id', hasPermission(PERMISSIONS.DISCOUNTS), deleteDiscount);

// محصولات
router.get('/products', hasPermission(PERMISSIONS.PRODUCTS), getProducts);
router.get('/products/:id', hasPermission(PERMISSIONS.PRODUCTS), getProductById);
router.post('/products', hasPermission(PERMISSIONS.PRODUCTS), createProduct);
router.put('/products/:id', hasPermission(PERMISSIONS.PRODUCTS), updateProduct);
router.delete('/products/:id', hasPermission(PERMISSIONS.PRODUCTS), deleteProduct);
router.post('/products/upload-image', hasPermission(PERMISSIONS.PRODUCTS), upload.single('image'), uploadProductImage);
router.post('/products/delete-image', hasPermission(PERMISSIONS.PRODUCTS), deleteProductImage);

// دسته‌بندی‌ها
router.get('/categories', hasPermission(PERMISSIONS.CATEGORIES), getCategories);
router.post('/categories', hasPermission(PERMISSIONS.CATEGORIES), createCategory);
router.put('/categories/:id', hasPermission(PERMISSIONS.CATEGORIES), updateCategory);
router.delete('/categories/:id', hasPermission(PERMISSIONS.CATEGORIES), deleteCategory);

// تنظیمات
router.get('/settings', hasPermission(PERMISSIONS.SETTINGS), getSettings);
router.put('/settings', hasPermission(PERMISSIONS.SETTINGS), updateSettings);

// کالکشن‌ها
router.get('/collections', hasPermission(PERMISSIONS.COLLECTIONS), getCollections);
router.post('/collections', hasPermission(PERMISSIONS.COLLECTIONS), createCollection);
router.put('/collections/:id', hasPermission(PERMISSIONS.COLLECTIONS), updateCollection);
router.delete('/collections/:id', hasPermission(PERMISSIONS.COLLECTIONS), deleteCollection);
router.put('/collections/:id/products', hasPermission(PERMISSIONS.COLLECTIONS), setCollectionProducts);

// اخبار و مقالات
router.get('/blogs', hasPermission(PERMISSIONS.BLOGS), blogController.getBlogs);
router.get('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.getBlogById);
router.post('/blogs', hasPermission(PERMISSIONS.BLOGS), blogController.createBlog);
router.put('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.updateBlog);
router.delete('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.deleteBlog);

// نظرات
router.get('/reviews', hasPermission(PERMISSIONS.REVIEWS), reviewController.getReviews);
router.put('/reviews/:id/approve', hasPermission(PERMISSIONS.REVIEWS), reviewController.approveReview);
router.delete('/reviews/:id', hasPermission(PERMISSIONS.REVIEWS), reviewController.deleteReview);

// اعلان‌ها (همه‌ی ادمین‌ها دسترسی دارند)
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/read-all', notificationController.markAllAsRead);
router.put('/notifications/:id/read', notificationController.markAsRead);

module.exports = router;
