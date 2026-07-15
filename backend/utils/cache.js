const NodeCache = require('node-cache');


const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  useClones: false,
});

const getOrSet = async (key, ttl, fetcher) => {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const fresh = await fetcher();
  if (fresh !== undefined && fresh !== null) {
    cache.set(key, fresh, ttl);
  }
  return fresh;
};

const del = (key) => cache.del(key);

const delByPrefix = (prefix) => {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
};

const flushAll = () => cache.flushAll();

module.exports = { cache, getOrSet, del, delByPrefix, flushAll };
