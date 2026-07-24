const express = require('express')
const router = express.Router()
const { getHeroImage } = require('../controllers/heroImageController')

router.get('/:id', getHeroImage)

module.exports = router
