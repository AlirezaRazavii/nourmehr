const Collection = require('../models/Collection');



const seedCollections = async () => {
  try {
    for (const col of defaultCollections) {
      await Collection.findOneAndUpdate(
        { slug: col.slug },
        { $setOnInsert: col },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Default collections seeded');
  } catch (err) {
    console.error('❌ Collection seed error:', err.message);
  }
};

module.exports = seedCollections;
