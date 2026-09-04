/**
 * دریافت آدرس پایه (Base URL) فرانت‌اند برای ریدایرکت‌های سرور
 * در صورتی که CLIENT_URL یا FRONTEND_URL شامل چند آدرس با کاما باشد،
 * این تابع به جای چسباندن رشته‌ها با کاما، آدرس تمیز و معتبری بازمی‌گرداند.
 */
const getClientUrl = (req) => {
  const raw = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
  const origins = raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (origins.length === 0) {
    if (req) {
      const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
      const proto = req.headers?.['x-forwarded-proto'] || req.protocol || 'https';
      if (host) return `${proto}://${host}`.replace(/\/$/, '');
    }
    return 'https://nourmehr.ir';
  }

  if (req) {
    const originHeader = req.headers?.origin;
    const refererHeader = req.headers?.referer;
    const hostHeader = req.headers?.host;

    if (originHeader) {
      const normOrigin = originHeader.replace(/\/$/, '');
      if (origins.includes(normOrigin)) return normOrigin;
    }

    if (refererHeader) {
      try {
        const parsed = new URL(refererHeader).origin.replace(/\/$/, '');
        if (origins.includes(parsed)) return parsed;
      } catch (e) {}
    }

    if (hostHeader) {
      const matched = origins.find((o) => o.includes(hostHeader));
      if (matched) return matched;
    }
  }

  return origins[0];
};

module.exports = { getClientUrl };
