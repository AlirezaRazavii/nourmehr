module.exports = (req, res, next) => {
  const lang = req.headers['accept-language'] || 'fa';
  req.lang = lang.startsWith('en') ? 'en' : 'fa';
  next();
};