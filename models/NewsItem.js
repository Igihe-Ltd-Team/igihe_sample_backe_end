const mongoose = require('mongoose');

const newsItemSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  date: { type: Date, required: true },
  date_gmt: { type: Date, required: true },
  guid: {
    rendered: { type: String, required: true }
  },
  modified: { type: Date },
  modified_gmt: { type: Date },
  slug: { type: String, required: true },
  status: { type: String, default: 'publish' },
  type: { type: String, required: true },
  link: { type: String, required: true },
  title: {
    rendered: { type: String, required: true }
  },
  content: {
    rendered: { type: String },
    protected: { type: Boolean, default: false }
  },
  excerpt: {
    rendered: { type: String },
    protected: { type: Boolean, default: false }
  },
  author: { type: Number, default: 0 },
  featured_media: { type: Number, default: 0 },
  local_featured_media: { type: Number }, // Store Media ID as number, not ObjectId
  comment_status: { type: String, default: 'open' },
  ping_status: { type: String, default: 'open' },
  sticky: { type: Boolean, default: false },
  template: { type: String, default: '' },
  format: { type: String, default: 'standard' },
  meta: {
    _acf_changed: { type: Boolean, default: false },
    footnotes: { type: String, default: '' }
  },
  categories: [{ type: Number }],
  tags: [{ type: Number }],
  class_list: [{ type: String }],
  acf: { type: mongoose.Schema.Types.Mixed, default: {} },
  "igh-yt-source": [{ type: Number }],
  video_url: { type: String },
  featured_media_details: { type: mongoose.Schema.Types.Mixed },
  embedded_data: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for featured media with manual population
newsItemSchema.virtual('featured_media_data', {
  ref: 'Media',
  localField: 'local_featured_media',
  foreignField: 'id',
  justOne: true
});

// Virtual for featured media URL
newsItemSchema.virtual('featured_media_url').get(function() {
  if (this.featured_media_data) {
    return `/images/${this.featured_media_data.filename}`;
  }
  return this.featured_media_details?.source_url || null;
});

// Virtual for thumbnail URL
newsItemSchema.virtual('thumbnail_url').get(function() {
  if (this.featured_media_data) {
    const baseName = this.featured_media_data.filename.replace(/\.[^/.]+$/, "");
    return `/thumbnails/${baseName}_thumb.webp`;
  }
  return null;
});

// Indexes for better performance
newsItemSchema.index({ id: 1 });
newsItemSchema.index({ type: 1 });
newsItemSchema.index({ categories: 1 });
newsItemSchema.index({ date: -1 });
newsItemSchema.index({ slug: 1 });
newsItemSchema.index({ local_featured_media: 1 });

module.exports = mongoose.model('NewsItem', newsItemSchema);