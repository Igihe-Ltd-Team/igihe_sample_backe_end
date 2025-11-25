const mongoose = require('mongoose');
const NewsItem = require('../models/NewsItem');
const Category = require('../models/Category');
const Media = require('../models/Media');
const ImageProcessor = require('../utils/imageProcessor');
const path = require('path');
require('dotenv').config();

// Import your sample data
const { defaultVideos, defaultPosts, defaultCategories } = require('./sampleData');

const MONGODB_URI = process.env.MONGODB_URI;

async function downloadFeaturedImages(newsItems) {
  console.log('📥 Downloading featured images...');
  
  const mediaItems = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const item of newsItems) {
    if (item.featured_media && item._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      try {
        const imageUrl = item._embedded['wp:featuredmedia'][0].source_url;
        const filename = `featured-${item.id}-${Date.now()}`;
        
        console.log(`📸 [${item.id}] Downloading: ${imageUrl}`);
        
        const tempPath = await ImageProcessor.downloadAndProcessImage(imageUrl, filename);
        const processed = await ImageProcessor.processImage(tempPath);
        
        // Generate media ID
        const lastMedia = await Media.findOne().sort({ id: -1 });
        const mediaId = lastMedia ? lastMedia.id + 1 : (mediaItems.length > 0 ? mediaItems[mediaItems.length - 1].id + 1 : 1);
        
        const media = new Media({
          id: mediaId,
          filename: processed.filename,
          originalName: filename,
          filepath: processed.processedImagePath,
          thumbnailPath: processed.thumbnailPath,
          mimetype: `image/${processed.format}`,
          size: processed.size,
          width: processed.width,
          height: processed.height,
          alt_text: item._embedded['wp:featuredmedia'][0]?.alt_text || '',
          caption: item._embedded['wp:featuredmedia'][0]?.caption?.rendered || '',
          post: item.id,
          
          // Store local media details instead of WordPress structure
          media_details: processed.mediaDetails
        });
        
        await media.save();
        mediaItems.push(media);
        
        // Update news item with local image reference
        item.local_featured_media = mediaId;
        successCount++;
        
        console.log(`✅ [${item.id}] Successfully downloaded and processed`);
        
      } catch (error) {
        console.warn(`⚠️ [${item.id}] Failed to download image: ${error.message}`);
        item.local_featured_media = null;
        failCount++;
        
        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      console.log(`ℹ️ [${item.id}] No featured image found`);
      item.local_featured_media = null;
    }
  }
  
  console.log(`📊 Download Summary: ${successCount} successful, ${failCount} failed`);
  return newsItems;
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Clear existing data
    console.log('🗑 Clearing existing data...');
    await NewsItem.deleteMany({});
    await Category.deleteMany({});
    await Media.deleteMany({});
    console.log('✅ Cleared existing data');

    // Insert categories
    console.log('📂 Inserting categories...');
    const categories = await Category.insertMany(defaultCategories);
    console.log(`✅ Inserted ${categories.length} categories`);

    // Process news items
    const allNewsItems = [...defaultVideos, ...defaultPosts];
    
    // Download and process images
    console.log('🖼 Processing images...');
    const newsItemsWithImages = await downloadFeaturedImages(allNewsItems);

    // Transform and insert news items
    console.log('📰 Inserting news items...');
    const transformedNewsItems = newsItemsWithImages.map(item => {
      const videoUrl = item.acf?.igh_yt_video_url || null;
      
      return {
        ...item,
        video_url: videoUrl,
        // Don't store WordPress media details, we'll use local ones
        featured_media_details: null,
        embedded_data: item._embedded || null,
        local_featured_media: item.local_featured_media || null
      };
    });

    const newsItems = await NewsItem.insertMany(transformedNewsItems);
    console.log(`✅ Inserted ${newsItems.length} news items`);

    // Final summary
    const mediaCount = await Media.countDocuments();
    console.log('\n🎉 Database seeded successfully!');
    console.log('='.repeat(40));
    console.log(`📊 Categories: ${categories.length}`);
    console.log(`📰 News Items: ${newsItems.length}`);
    console.log(`🖼 Media Items: ${mediaCount}`);
    console.log('='.repeat(40));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, downloadFeaturedImages };