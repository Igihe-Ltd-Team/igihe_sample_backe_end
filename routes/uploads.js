const express = require('express');
const router = express.Router();
const Media = require('../models/Media');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const ImageProcessor = require('../utils/imageProcessor');
const fs = require('fs-extra');
const path = require('path');

// Upload single image
router.post('/single', uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    // Process image
    const processed = await ImageProcessor.processImage(req.file.path, {
      width: 1200,
      quality: 85,
      format: 'webp'
    });

    // Generate new media ID
    const lastMedia = await Media.findOne().sort({ id: -1 });
    const newId = lastMedia ? lastMedia.id + 1 : 1;

    // Save to database
    const media = new Media({
      id: newId,
      filename: processed.filename,
      originalName: req.file.originalname,
      filepath: processed.processedImagePath,
      thumbnailPath: processed.thumbnailPath,
      mimetype: `image/${processed.format}`,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      alt_text: req.body.alt_text || '',
      caption: req.body.caption || '',
      post: req.body.post_id ? parseInt(req.body.post_id) : null,
      uploadedBy: req.body.uploadedBy || 'user',
      
      // Store local media details
      media_details: processed.mediaDetails,
      
      metadata: {
        originalSize: req.file.size,
        processedSize: processed.size,
        compression: ((req.file.size - processed.size) / req.file.size * 100).toFixed(2)
      }
    });

    await media.save();

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: media.id,
        filename: media.filename,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        width: media.width,
        height: media.height,
        size: media.size,
        alt_text: media.alt_text,
        caption: media.caption
      }
    });

  } catch (error) {
    // Clean up temp file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get all media
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, post_id } = req.query;
    
    const query = {};
    if (post_id) {
      query.post = parseInt(post_id); // Query by number, not ObjectId
    }

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await Media.countDocuments(query);

    // Add full URLs to response
    const mediaWithUrls = media.map(item => ({
      ...item.toObject(),
      url: item.url,
      thumbnailUrl: item.thumbnailUrl
    }));

    res.json({
      success: true,
      data: mediaWithUrls,
      pagination: {
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get single media
router.get('/:id', async (req, res) => {
  try {
    const media = await Media.findOne({ id: parseInt(req.params.id) }); // Query by numeric ID
    
    if (!media) {
      return res.status(404).json({ 
        success: false,
        error: 'Media not found' 
      });
    }

    const mediaWithUrls = {
      ...media.toObject(),
      url: media.url,
      thumbnailUrl: media.thumbnailUrl
    };

    res.json({
      success: true,
      data: mediaWithUrls
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete media
router.delete('/:id', async (req, res) => {
  try {
    const media = await Media.findOne({ id: parseInt(req.params.id) }); // Query by numeric ID
    
    if (!media) {
      return res.status(404).json({ 
        success: false,
        error: 'Media not found' 
      });
    }

    // Delete files from filesystem
    await fs.remove(media.filepath).catch(() => {});
    await fs.remove(media.thumbnailPath).catch(() => {});

    // Delete from database
    await Media.findOneAndDelete({ id: parseInt(req.params.id) });

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;