const express = require('express')
const router = express.Router()
const { getPublicHero } = require('../controllers/heroController')

router.get('/', (req, res, next) => {
  const header = req.headers['accept-language'] || ''
  req.language = req.headers['x-lang'] || (header.startsWith('en') ? 'en' : 'fa')
  next()
}, getPublicHero)

module.exports = router
