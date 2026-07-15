const path = require('path');
const fs = require('fs');

const getImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/products', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    res.set('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getImage };
