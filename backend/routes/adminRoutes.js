const express = require('express');

const { protect, admin } = require('../middleware/authMiddleware');
const { hasPermission, superAdminOnly } = require('../middleware/permissionMiddleware');
const { PERMISSIONS, PERMISSION_LIST } = require('../config/permissions');
const { upload, blogUpload, handleUploadError } = require('../middleware/upload');
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

const { CHANGEFREQS } = require('../models/shared/seoSchema');
const Blog = require('../models/Blog');
const { invalidateSeoCache } = require('../utils/cache');

/* ---- نرمال‌سازی سئوی مقاله: هر دو ساختار قدیم/جدید → ساختار جدید ---- */
const BLANK_SEO_LANG = () => ({
  title: '', description: '', focusKeyword: '',
  canonicalUrl: '', ogImage: '', ogTitle: '', ogDescription: '', noIndex: false
});

const toNewSeo = (seo) => {
  const out = {
    fa: BLANK_SEO_LANG(),
    en: BLANK_SEO_LANG(),
    sitemap: { include: true, priority: 0.8, changefreq: 'weekly' }
  };
  if (!seo || typeof seo !== 'object') return { seo: out, fromNew: false };

  // ساختار جدید (SeoPanel)
  let fromNew = false;
  ['fa', 'en'].forEach((l) => {
    const v = seo[l];
    if (v && typeof v === 'object') {
      fromNew = true;
      out[l].title = String(v.title || '').trim().slice(0, 75);
      out[l].description = String(v.description || '').trim().slice(0, 175);
      out[l].focusKeyword = String(v.focusKeyword || '').trim().slice(0, 100);
      out[l].canonicalUrl = /^https?:\/\/|^\/.+/i.test(String(v.canonicalUrl || '')) ? String(v.canonicalUrl).trim() : '';
      out[l].ogImage = /^https?:\/\/|^\/.+/i.test(String(v.ogImage || '')) ? String(v.ogImage).trim() : '';
      out[l].ogTitle = String(v.ogTitle || '').trim().slice(0, 95);
      out[l].ogDescription = String(v.ogDescription || '').trim().slice(0, 200);
      out[l].noIndex = v.noIndex === true;
    }
  });

  // ساختار قدیمی (فرم فعلی ویرایشگر اخبار) — فقط فیلدهای پرشده
  if (seo.title && typeof seo.title === 'object') {
    out.fa.title = out.fa.title || String(seo.title.fa || '').trim().slice(0, 75);
    out.en.title = out.en.title || String(seo.title.en || '').trim().slice(0, 75);
  }
  if (seo.description && typeof seo.description === 'object') {
    out.fa.description = out.fa.description || String(seo.description.fa || '').trim().slice(0, 175);
    out.en.description = out.en.description || String(seo.description.en || '').trim().slice(0, 175);
  }
  if (seo.keywords && typeof seo.keywords === 'object') {
    out.fa.focusKeyword = out.fa.focusKeyword || String(seo.keywords.fa || '').split(',')[0].trim().slice(0, 100);
    out.en.focusKeyword = out.en.focusKeyword || String(seo.keywords.en || '').split(',')[0].trim().slice(0, 100);
  }
  if (typeof seo.focusKeyword === 'string' && seo.focusKeyword.trim()) {
    out.fa.focusKeyword = out.fa.focusKeyword || seo.focusKeyword.trim().slice(0, 100);
  }
  if (typeof seo.canonicalUrl === 'string' && /^https?:\/\/|^\/.+/i.test(seo.canonicalUrl)) {
    out.fa.canonicalUrl = out.fa.canonicalUrl || seo.canonicalUrl.trim();
  }
  if (typeof seo.ogImage === 'string' && /^https?:\/\/|^\/.+/i.test(seo.ogImage)) {
    out.fa.ogImage = out.fa.ogImage || seo.ogImage.trim();
    out.en.ogImage = out.en.ogImage || seo.ogImage.trim();
  }
  if (seo.noIndex === true) out.fa.noIndex = true;

  if (seo.sitemap && typeof seo.sitemap === 'object') {
    out.sitemap = {
      include: seo.sitemap.include !== false,
      priority: Math.min(1, Math.max(0, Number(seo.sitemap.priority) || 0.8)),
      changefreq: CHANGEFREQS.includes(seo.sitemap.changefreq) ? seo.sitemap.changefreq : 'weekly'
    };
  }
  return { seo: out, fromNew };
};

const normalizeBlogSeo = async (req, res, next) => {
  try {
    if (!req.body || req.body.seo === undefined) return next();

    const { seo, fromNew } = toNewSeo(req.body.seo);

    // فرم قدیمی، سئوی ذخیره‌شده (ساختار جدید) را «نمی‌بیند» و فیلدهایش خالی است؛
    // نباید موقع ذخیره، مقادیر موجود را پاک کند:
    if (!fromNew && req.params.id) {
      const existing = await Blog.findById(req.params.id).select('seo').lean();
      if (existing?.seo) {
        const cur = toNewSeo(existing.seo).seo;
        ['fa', 'en'].forEach((l) => {
          Object.keys(seo[l]).forEach((k) => {
            const v = seo[l][k];
            const c = cur[l][k];
            if ((v === '' || v === false) && c !== '' && c !== false) seo[l][k] = c;
          });
        });
        seo.sitemap = cur.sitemap;
      }
    }

    req.body.seo = seo;
    next();
  } catch (e) {
    next();
  }
};

/* ---- نرمال‌سازی سئو برای کالکشن/دسته‌بندی (ساختار جدید) ---- */
const normalizeSeo = (req, res, next) => {
  try {
    if (req.body && req.body.seo !== undefined) {
      const hasNew =
        (req.body.seo.fa && typeof req.body.seo.fa === 'object') ||
        (req.body.seo.en && typeof req.body.seo.en === 'object') ||
        (req.body.seo.sitemap && typeof req.body.seo.sitemap === 'object');
      if (hasNew) {
        req.body.seo = toNewSeo(req.body.seo).seo;
      } else {
        delete req.body.seo;
      }
    }
    // تغییر کالکشن/دسته → کش sitemap باطل شود
    res.on('finish', () => {
      if (res.statusCode < 400) invalidateSeoCache();
    });
    next();
  } catch {
    next();
  }
};

/* ---- نرمال‌سازی سئو برای کالکشن/دسته‌بندی (ساختار جدید) ---- */
const normalizeSeo = (req, res, next) => {
  try {
    if (req.body && req.body.seo !== undefined) {
      const hasNew =
        (req.body.seo.fa && typeof req.body.seo.fa === 'object') ||
        (req.body.seo.en && typeof req.body.seo.en === 'object') ||
        (req.body.seo.sitemap && typeof req.body.seo.sitemap === 'object');
      if (hasNew) {
        req.body.seo = toNewSeo(req.body.seo).seo;
      } else {
        delete req.body.seo;
      }
    }
    // تغییر کالکشن/دسته → کش sitemap باطل شود
    res.on('finish', () => {
      if (res.statusCode < 400) invalidateSeoCache();
    });
    next();
  } catch {
    next();
  }
};

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
router.post('/categories', hasPermission(PERMISSIONS.CATEGORIES), normalizeSeo, createCategory);
router.put('/categories/:id', hasPermission(PERMISSIONS.CATEGORIES), normalizeSeo, updateCategory);
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
router.post('/collections', hasPermission(PERMISSIONS.COLLECTIONS), normalizeSeo, createCollection);
router.put('/collections/:id/products', hasPermission(PERMISSIONS.COLLECTIONS), setCollectionProducts);
router.put('/collections/:id', hasPermission(PERMISSIONS.COLLECTIONS), normalizeSeo, updateCollection);
router.delete('/collections/:id', hasPermission(PERMISSIONS.COLLECTIONS), deleteCollection);

/* ----------------------------- اخبار و مقالات ------------------------------- */
router.get('/blogs', hasPermission(PERMISSIONS.BLOGS), blogController.getBlogs);
router.post('/blogs/upload-image', hasPermission(PERMISSIONS.BLOGS), blogUpload.single('image'), handleUploadError, blogController.uploadBlogImage);
router.post('/blogs/bulk', hasPermission(PERMISSIONS.BLOGS), blogController.bulkAction);
router.post('/blogs', hasPermission(PERMISSIONS.BLOGS), normalizeBlogSeo, blogController.createBlog);
router.get('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.getBlogById);
router.put('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), normalizeBlogSeo, blogController.updateBlog);
router.delete('/blogs/:id', hasPermission(PERMISSIONS.BLOGS), blogController.deleteBlog);

/* --------------------- دسته‌بندی و نظرات اخبار و مقالات --------------------- */
router.get('/blogs-stats', hasPermission(PERMISSIONS.BLOGS), blogController.getStats);
router.get('/blog-categories', hasPermission(PERMISSIONS.BLOGS), blogController.getCategories);
router.post('/blog-categories', hasPermission(PERMISSIONS.BLOGS), blogController.createCategory);
router.put('/blog-categories/:id', hasPermission(PERMISSIONS.BLOGS), blogController.updateCategory);
router.delete('/blog-categories/:id', hasPermission(PERMISSIONS.BLOGS), blogController.deleteCategory);

router.get('/blogs-comments', hasPermission(PERMISSIONS.BLOGS), blogController.getComments);
router.put('/blogs-comments/:id/approve', hasPermission(PERMISSIONS.BLOGS), blogController.approveComment);
router.put('/blogs-comments/:id/unapprove', hasPermission(PERMISSIONS.BLOGS), blogController.unapproveComment);
router.delete('/blogs-comments/:id', hasPermission(PERMISSIONS.BLOGS), blogController.deleteComment);

/* --------------------------------- نظرات ----------------------------------- */
router.get('/reviews', hasPermission(PERMISSIONS.REVIEWS), reviewController.getReviews);
router.put('/reviews/:id/approve', hasPermission(PERMISSIONS.REVIEWS), reviewController.approveReview);
router.delete('/reviews/:id', hasPermission(PERMISSIONS.REVIEWS), reviewController.deleteReview);

/* -------------------------------- اعلان‌ها --------------------------------- */
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/read-all', notificationController.markAllAsRead);
router.put('/notifications/:id/read', notificationController.markAsRead);

module.exports = router;
