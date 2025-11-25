const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

class ImageProcessor {
  static async processImage(filePath, options = {}) {
    const {
      width = 1200,
      height = null,
      quality = parseInt(process.env.IMAGE_QUALITY) || 85,
      format = 'webp'
    } = options;

    const filename = path.basename(filePath, path.extname(filePath));
    const outputDir = 'uploads/images/';
    const thumbnailDir = 'uploads/thumbnails/';

    await fs.ensureDir(outputDir);
    await fs.ensureDir(thumbnailDir);

    const outputFilename = `${filename}.${format}`;
    const processedImagePath = path.join(outputDir, outputFilename);
    const thumbnailPath = path.join(thumbnailDir, `${filename}_thumb.${format}`);

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Process main image
      const processedImage = image
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        [format]({ quality });

      await processedImage.toFile(processedImagePath);

      // Create thumbnail
      const thumbnailSize = parseInt(process.env.THUMBNAIL_SIZE) || 300;
      const thumbnail = sharp(filePath)
        .resize(thumbnailSize, thumbnailSize, {
          fit: 'cover',
          position: 'center'
        })
        [format]({ quality: quality - 15 });

      await thumbnail.toFile(thumbnailPath);

      // Get file sizes
      const processedStats = await fs.stat(processedImagePath);
      const thumbnailStats = await fs.stat(thumbnailPath);

      // Generate media details
      const mediaDetails = {
        width: metadata.width,
        height: metadata.height,
        file: outputFilename,
        filesize: processedStats.size,
        mime_type: `image/${format}`,
        source_url: `/images/${outputFilename}`,
        
        sizes: {
          thumbnail: {
            file: `${filename}_thumb.${format}`,
            width: thumbnailSize,
            height: thumbnailSize,
            filesize: thumbnailStats.size,
            mime_type: `image/${format}`,
            source_url: `/thumbnails/${filename}_thumb.${format}`
          },
          medium: {
            file: outputFilename,
            width: 300,
            height: Math.round((300 / metadata.width) * metadata.height),
            filesize: processedStats.size,
            mime_type: `image/${format}`,
            source_url: `/images/${outputFilename}`
          },
          large: {
            file: outputFilename,
            width: 1024,
            height: Math.round((1024 / metadata.width) * metadata.height),
            filesize: processedStats.size,
            mime_type: `image/${format}`,
            source_url: `/images/${outputFilename}`
          },
          full: {
            file: outputFilename,
            width: metadata.width,
            height: metadata.height,
            filesize: processedStats.size,
            mime_type: `image/${format}`,
            source_url: `/images/${outputFilename}`
          }
        },
        
        image_meta: {
          aperture: "0",
          credit: "",
          camera: "",
          caption: "",
          created_timestamp: "0",
          copyright: "",
          focal_length: "0",
          iso: "0",
          shutter_speed: "0",
          title: "",
          orientation: "0",
          keywords: []
        }
      };

      // Clean up temp file
      await fs.remove(filePath);

      return {
        filename: outputFilename,
        processedImagePath,
        thumbnailPath,
        width: metadata.width,
        height: metadata.height,
        format: format,
        size: processedStats.size,
        thumbnailSize: thumbnailStats.size,
        mediaDetails: mediaDetails
      };

    } catch (error) {
      // Clean up on error
      await fs.remove(filePath).catch(() => {});
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  static async downloadAndProcessImage(imageUrl, customFilename = null) {
  const tempDir = 'uploads/temp/';
  await fs.ensureDir(tempDir);

  const filename = customFilename || `download-${Date.now()}`;
  const tempPath = path.join(tempDir, filename);

  try {
    const https = require('https');
    const agent = new https.Agent({
      rejectUnauthorized: false // ⚠️ Only for development!
    });

    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 30000,
      httpsAgent: agent, // Add this line
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempPath));
      writer.on('error', (error) => {
        fs.remove(tempPath).catch(() => {});
        reject(new Error(`Download failed: ${error.message}`));
      });
    });
  } catch (error) {
    await fs.remove(tempPath).catch(() => {});
    throw new Error(`Failed to download image from URL: ${error.message}`);
  }
}

  static async getImageDimensions(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };
    } catch (error) {
      throw new Error(`Could not read image dimensions: ${error.message}`);
    }
  }

  static async cleanupTempFiles() {
    const tempDir = 'uploads/temp/';
    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
        }
      }
    } catch (error) {
      console.warn('Temp cleanup warning:', error.message);
    }
  }
}

module.exports = ImageProcessor;