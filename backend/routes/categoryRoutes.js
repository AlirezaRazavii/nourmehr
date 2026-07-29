const express = require('express');
const Category = require('../models/Category');
const { getOrSet } = require('../utils/cache');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await getOrSet('public:categories', 600, () =>
      Category.find({ status: 'active' })
        .sort({ sortOrder: 1 })
        .select('name slug icon image description parents sortOrder')
        .lean()
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
  