const NodeCache = require('node-cache');

/**
 * useClones: false برای سرعت. قانون: هر چیزی که داخل کش می‌گذاریم
 * باید فقط-خواندنی در نظر گرفته شود (خروجی lean یا toObject).
 * هیچ کنترلری نباید آبجکت برگشتی از کش را mutate کند.
 */
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  useClones: false,
  maxKeys: 5000,
});

const pendingRequests = new Map();

/** پیشوندهای استاندارد کش — هر جای پروژه باید از همین‌ها استفاده کند */
const KEYS = {
  PRODUCT_LIST: 'public:products:list:',
  PRODUCT_ONE: 'public:product:',
  PRODUCT_CATEGORIES: 'public:products:categories',
  CATEGORIES: 'public:categories',
  CATEGORY_SLUG: 'public:category:slug:',
};

/**
 * @param {string} key
 * @param {number} ttl
 * @param {Function} fetcher
 * @param {{negativeTtl?: number}} [opts] 
 */
const getOrSet = async (key, ttl, fetcher, opts = {}) => {
  const { negativeTtl = 0 } = opts;

  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const inflight = pendingRequests.get(key);
  if (inflight) return inflight;

  const run = async () => {
    const fresh = await fetcher();
    if (fresh === null || fresh === undefined) {
      if (negativeTtl > 0) {
        try { cache.set(key, null, negativeTtl); } catch (_) {}
      }
      return fresh ?? null;
    }
    try { cache.set(key, fresh, ttl); } catch (_) {} 
    return fresh;
  };

  const promise = run();
  pendingRequests.set(key, promise);

  promise.catch(() => {}).finally(() => {
    if (pendingRequests.get(key) === promise) pendingRequests.delete(key);
  });

  return promise;
};

const del = (key) => cache.del(key);

const delByPrefix = (prefix) => {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
  return keys.length;
};


const invalidateProductCache = () => {
  delByPrefix(KEYS.PRODUCT_LIST);
  delByPrefix(KEYS.PRODUCT_ONE);
};


const invalidateCategoryCache = () => {
  del(KEYS.CATEGORIES);
  del(KEYS.PRODUCT_CATEGORIES);
  delByPrefix(KEYS.CATEGORY_SLUG);
  delByPrefix(KEYS.PRODUCT_LIST); 
};

const flushAll = () => {
  pendingRequests.clear();
  cache.flushAll();
};

module.exports = {
  cache, KEYS, getOrSet, del, delByPrefix,
  invalidateProductCache, invalidateCategoryCache, flushAll,
};
