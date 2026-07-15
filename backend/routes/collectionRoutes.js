const express = require('express');
const {
  getCollections,
  getHomeCollections,
  getCollectionBySlugOrId
} = require('../controllers/collectionController');

const router = express.Router();

router.get('/', getCollections);
router.get('/home', getHomeCollections);
router.get('/:id', getCollectionBySlugOrId);

module.exports = router;
