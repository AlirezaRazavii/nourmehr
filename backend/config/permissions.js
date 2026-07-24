// لیست تمام دسترسی‌های قابل تعریف برای ادمین‌ها
const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  ORDERS: 'orders',
  USERS: 'users',
  PAYMENTS: 'payments',
  TICKETS: 'tickets',
  REVIEWS: 'reviews',
  DISCOUNTS: 'discounts',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  COLLECTIONS: 'collections',
  BLOGS: 'blogs',
  SETTINGS: 'settings',
  HERO: 'hero',
};

// لیست برای نمایش در پنل (با برچسب فارسی) — برای ساخت/ویرایش ادمین در فرانت
const PERMISSION_LIST = [
  { key: PERMISSIONS.DASHBOARD, label: 'داشبورد' },
  { key: PERMISSIONS.ORDERS, label: 'سفارشات' },
  { key: PERMISSIONS.USERS, label: 'کاربران' },
  { key: PERMISSIONS.PAYMENTS, label: 'پرداخت‌ها' },
  { key: PERMISSIONS.TICKETS, label: 'تیکت‌ها' },
  { key: PERMISSIONS.REVIEWS, label: 'مدیریت نظرات' },
  { key: PERMISSIONS.DISCOUNTS, label: 'تخفیف‌ها' },
  { key: PERMISSIONS.PRODUCTS, label: 'محصولات' },
  { key: PERMISSIONS.CATEGORIES, label: 'دسته‌بندی‌ها' },
  { key: PERMISSIONS.COLLECTIONS, label: 'کالکشن‌ها' },
  { key: PERMISSIONS.BLOGS, label: 'اخبار و مقالات' },
  { key: PERMISSIONS.SETTINGS, label: 'تنظیمات' },
  { key: PERMISSIONS.HERO, label: 'مدیریت هیرو (اسلایدر اصلی)' },
];

module.exports = { PERMISSIONS, PERMISSION_LIST };
