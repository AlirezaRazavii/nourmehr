const Category = require('../models/Category');



const seedCategories = async () => {
  try {
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Default categories seeded');
  } catch (err) {
    console.error('❌ Category seed error:', err.message);
  }
};

module.exports = seedCategories;
