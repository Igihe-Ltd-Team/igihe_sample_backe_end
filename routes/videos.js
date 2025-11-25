const express = require('express');
const router = express.Router();
const NewsItem = require('../models/NewsItem');
const Media = require('../models/Media');

// GET all videos



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


router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search,
      categories 
    } = req.query;

    const query = { type: 'igh-yt-videos' };
    
    if (search) {
      query.$or = [
        { 'title.rendered': { $regex: search, $options: 'i' } },
        { 'content.rendered': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (categories) {
      query.categories = { $in: categories.split(',').map(Number) };
    }

    const videos = await NewsItem.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('local_featured_media')
      .exec();

    const total = await NewsItem.countDocuments(query);


    const siteUrl = process.env.NODE_ENV === "development"
      ? `${process.env.NODE_SITE_URL || 'http://localhost:5001'}`
      : `${req.protocol}://${req.get("host")}`;

    const newsItemsWithMedia = await populateMediaData(videos, siteUrl);


    res.json(newsItemsWithMedia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single video
router.get('/:id', async (req, res) => {
  try {
    const video = await NewsItem.findOne({ 
      id: parseInt(req.params.id),
      type: 'igh-yt-videos'
    }).populate('local_featured_media');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;