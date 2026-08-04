const jwt = require('jsonwebtoken');

/**
 * ساخت توکن ورود.
 * @param {string} userId
 * @param {number} tokenVersion
 */
const generateToken = (userId, tokenVersion = 0) =>
  jwt.sign(
    { userId, tv: tokenVersion },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: 'HS256',
    }
  );

module.exports = generateToken;
