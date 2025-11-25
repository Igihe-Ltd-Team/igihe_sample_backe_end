const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  filepath: { type: String, required: true },
  thumbnailPath: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  width: { type: Number },
  height: { type: Number },
  alt_text: { type: String, default: '' },
  caption: { type: String, default: '' },
  description: { type: String, default: '' },
  post: { type: Number },
  uploadedBy: { type: String, default: 'system' },
  
  // Local media details structure
  media_details: {
    width: { type: Number },
    height: { type: Number },
    file: { type: String },
    filesize: { type: Number },
    mime_type: { type: String },
    source_url: { type: String },
    
    // Local image sizes
    sizes: {
      thumbnail: {
        file: { type: String },
        width: { type: Number },
        height: { type: Number },
        filesize: { type: Number },
        mime_type: { type: String },
        source_url: { type: String }
      },
      medium: {
        file: { type: String },
        width: { type: Number },
        height: { type: Number },
        filesize: { type: Number },
        mime_type: { type: String },
        source_url: { type: String }
      },
      large: {
        file: { type: String },
        width: { type: Number },
        height: { type: Number },
        filesize: { type: Number },
        mime_type: { type: String },
        source_url: { type: String }
      },
      full: {
        file: { type: String },
        width: { type: Number },
        height: { type: Number },
        filesize: { type: Number },
        mime_type: { type: String },
        source_url: { type: String }
      }
    },
    
    image_meta: {
      aperture: { type: String, default: "0" },
      credit: { type: String, default: "" },
      camera: { type: String, default: "" },
      caption: { type: String, default: "" },
      created_timestamp: { type: String, default: "0" },
      copyright: { type: String, default: "" },
      focal_length: { type: String, default: "0" },
      iso: { type: String, default: "0" },
      shutter_speed: { type: String, default: "0" },
      title: { type: String, default: "" },
      orientation: { type: String, default: "0" },
      keywords: [{ type: String }]
    }
  },
  
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

// Virtual for URL access
mediaSchema.virtual('url').get(function() {
  return `/images/${this.filename}`;
});

mediaSchema.virtual('thumbnailUrl').get(function() {
  const baseName = this.filename.replace(/\.[^/.]+$/, "");
  return `/thumbnails/${baseName}_thumb.webp`;
});

// Virtual for post data
mediaSchema.virtual('post_data', {
  ref: 'NewsItem',
  localField: 'post',
  foreignField: 'id',
  justOne: true
});

// Method to generate local media details
mediaSchema.methods.generateMediaDetails = function(baseUrl = '') {
  const baseName = this.filename.replace(/\.[^/.]+$/, "");
  const extension = path.extname(this.filename);
  
  return {
    width: this.width,
    height: this.height,
    file: this.filename,
    filesize: this.size,
    mime_type: this.mimetype,
    source_url: `${baseUrl}/images/${this.filename}`,
    
    sizes: {
      thumbnail: {
        file: `${baseName}_thumb.webp`,
        width: 150,
        height: 150,
        filesize: this.media_details?.sizes?.thumbnail?.filesize || 0,
        mime_type: 'image/webp',
        source_url: `${baseUrl}/thumbnails/${baseName}_thumb.webp`
      },
      medium: {
        file: this.filename,
        width: 300,
        height: Math.round((300 / this.width) * this.height),
        filesize: this.size,
        mime_type: this.mimetype,
        source_url: `${baseUrl}/images/${this.filename}`
      },
      large: {
        file: this.filename,
        width: 1024,
        height: Math.round((1024 / this.width) * this.height),
        filesize: this.size,
        mime_type: this.mimetype,
        source_url: `${baseUrl}/images/${this.filename}`
      },
      full: {
        file: this.filename,
        width: this.width,
        height: this.height,
        filesize: this.size,
        mime_type: this.mimetype,
        source_url: `${baseUrl}/images/${this.filename}`
      }
    },
    
    image_meta: {
      aperture: "0",
      credit: "",
      camera: "",
      caption: this.caption || "",
      created_timestamp: "0",
      copyright: "",
      focal_length: "0",
      iso: "0",
      shutter_speed: "0",
      title: this.originalName,
      orientation: "0",
      keywords: []
    }
  };
};

// Indexes
mediaSchema.index({ id: 1 });
mediaSchema.index({ post: 1 });
mediaSchema.index({ mimetype: 1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);