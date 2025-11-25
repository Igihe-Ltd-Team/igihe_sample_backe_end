const express = require('express');
const router = express.Router();
const NewsItem = require('../models/NewsItem');
const Media = require('../models/Media');

// Helper function to populate media data
const populateMediaData = async (newsItems, baseUrl = '') => {
  const mediaIds = newsItems
    .map(item => item.local_featured_media)
    .filter(id => id !== null && id !== undefined);

  if (mediaIds.length === 0) return newsItems;

  const mediaItems = await Media.find({ id: { $in: mediaIds } });
  const mediaMap = {};
  mediaItems.forEach(media => {
    mediaMap[media.id] = media;
  });

  return newsItems.map(item => {
    const itemObj = item.toObject ? item.toObject() : item;
    
    if (itemObj.local_featured_media && mediaMap[itemObj.local_featured_media]) {
      const media = mediaMap[itemObj.local_featured_media];
      itemObj.featured_media_data = media;
      
      // Replace WordPress media details with local ones
      itemObj.featured_media_details = media.media_details || {
        width: media.width,
        height: media.height,
        file: media.filename,
        filesize: media.size,
        mime_type: media.mimetype,
        source_url: `${baseUrl}/images/${media.filename}`,
        sizes: {
          thumbnail: {
            file: media.filename.replace(/\.[^/.]+$/, '_thumb.webp'),
            width: 150,
            height: 150,
            filesize: media.size,
            mime_type: 'image/webp',
            source_url: `${baseUrl}/thumbnails/${media.filename.replace(/\.[^/.]+$/, '_thumb.webp')}`
          },
          medium: {
            file: media.filename,
            width: 300,
            height: Math.round((300 / media.width) * media.height),
            filesize: media.size,
            mime_type: media.mimetype,
            source_url: `${baseUrl}/images/${media.filename}`
          },
          large: {
            file: media.filename,
            width: 1024,
            height: Math.round((1024 / media.width) * media.height),
            filesize: media.size,
            mime_type: media.mimetype,
            source_url: `${baseUrl}/images/${media.filename}`
          },
          full: {
            file: media.filename,
            width: media.width,
            height: media.height,
            filesize: media.size,
            mime_type: media.mimetype,
            source_url: `${baseUrl}/images/${media.filename}`
          }
        }
      };
    }
    
    return itemObj;
  });
};

// GET all news items with advanced filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      categories, 
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      featured,
      author
    } = req.query;

    const query = {};
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by category
    if (categories) {
      query.categories = parseInt(categories);
    }
    
    // Filter by featured
    if (featured !== undefined) {
      query.sticky = featured === 'true';
    }
    
    // Filter by author
    if (author) {
      query.author = parseInt(author);
    }
    
    // Search in title and content
    if (search) {
      query.$or = [
        { 'title.rendered': { $regex: search, $options: 'i' } },
        { 'content.rendered': { $regex: search, $options: 'i' } },
        { 'excerpt.rendered': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const newsItems = await NewsItem.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await NewsItem.countDocuments(query);

    // Manually populate media data with local details
    // const baseUrl = `${req.protocol}://${req.get('host')}`;

    const siteUrl = process.env.NODE_ENV === "development"
      ? `${process.env.NODE_SITE_URL || 'http://localhost:5001'}`
      : `${req.protocol}://${req.get("host")}`;

    const newsItemsWithMedia = await populateMediaData(newsItems, siteUrl);

    res.json(newsItemsWithMedia);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET single news item by ID
router.get('/:id', async (req, res) => {
  try {
    const newsItem = await NewsItem.findOne({ id: parseInt(req.params.id) });
    
    if (!newsItem) {
      return res.status(404).json({ 
        success: false,
        error: 'News item not found' 
      });
    }

    // Manually populate media data with local details
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const newsItemsWithMedia = await populateMediaData([newsItem], baseUrl);
    
    res.json({
      success: true,
      data: newsItemsWithMedia[0]
    });
  } catch (error) {
    console.error('Error fetching news item:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET news items by type
router.get('/type/:type', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const newsItems = await NewsItem.find({ type: req.params.type })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await NewsItem.countDocuments({ type: req.params.type });

    // Manually populate media data
    const newsItemsWithMedia = await populateMediaData(newsItems);

    res.json({
      success: true,
      data: newsItemsWithMedia,
      pagination: {
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error fetching news by type:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET news items by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const newsItems = await NewsItem.find({ 
      categories: parseInt(req.params.categoryId) 
    })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await NewsItem.countDocuments({ 
      categories: parseInt(req.params.categoryId) 
    });

    // Manually populate media data
    const newsItemsWithMedia = await populateMediaData(newsItems);

    res.json({
      success: true,
      data: newsItemsWithMedia,
      pagination: {
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST create new news item
router.post('/', async (req, res) => {
  try {
    // Generate new ID if not provided
    if (!req.body.id) {
      const lastItem = await NewsItem.findOne().sort({ id: -1 });
      req.body.id = lastItem ? lastItem.id + 1 : 1;
    }

    const newsItem = new NewsItem(req.body);
    await newsItem.save();
    
    res.status(201).json({
      success: true,
      data: newsItem,
      message: 'News item created successfully'
    });
  } catch (error) {
    console.error('Error creating news item:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// PUT update news item
router.put('/:id', async (req, res) => {
  try {
    const newsItem = await NewsItem.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!newsItem) {
      return res.status(404).json({ 
        success: false,
        error: 'News item not found' 
      });
    }
    
    res.json({
      success: true,
      data: newsItem,
      message: 'News item updated successfully'
    });
  } catch (error) {
    console.error('Error updating news item:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// DELETE news item
router.delete('/:id', async (req, res) => {
  try {
    const newsItem = await NewsItem.findOneAndDelete({ 
      id: parseInt(req.params.id) 
    });
    
    if (!newsItem) {
      return res.status(404).json({ 
        success: false,
        error: 'News item not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'News item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting news item:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;