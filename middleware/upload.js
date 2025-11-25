const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    'uploads/images',
    'uploads/thumbnails',
    'uploads/temp'
  ];
  
  dirs.forEach(dir => {
    fs.ensureDirSync(dir);
  });
};

ensureDirectories();

// Configure storage - FIXED: Proper multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'img-' + uniqueSuffix + extension);
  }
});

// File filter
const fileFilter = function (req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WEBP, BMP)'));
  }
};

// Configure upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

// Upload configurations
const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 10);
const uploadFields = upload.fields([
  { name: 'featured_image', maxCount: 1 },
  { name: 'gallery_images', maxCount: 10 }
]);

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  ensureDirectories
};