const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  count: { type: Number, default: 0 },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  parent: { type: Number, default: 0 },
  image: { type: String, default: '' }
}, {
  timestamps: true
});

categorySchema.index({ id: 1 });
categorySchema.index({ slug: 1 });

module.exports = mongoose.model('Category', categorySchema);