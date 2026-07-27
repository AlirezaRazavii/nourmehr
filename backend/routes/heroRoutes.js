const express = require('express')
const router = express.Router()
const { getPublicHero } = require('../controllers/heroController')

const detectLanguage = (req, res, next) => {
  const header = req.headers['accept-language'] || ''
  const explicit = req.headers['x-lang']

  req.language = explicit === 'en' || explicit === 'fa'
    ? explicit
    : (header.toLowerCase().startsWith('en') ? 'en' : 'fa')

  next()
}

router.get('/', detectLanguage, getPublicHero)
router.head('/', detectLanguage, getPublicHero)

module.exports = router
