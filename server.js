const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/thumbnails', express.static(path.join(__dirname, 'uploads/thumbnails')));

// Ensure upload directories exist
fs.ensureDirSync('uploads/images');
fs.ensureDirSync('uploads/thumbnails');
fs.ensureDirSync('uploads/temp');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/igihe_news';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📊 MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('📊 MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📊 MongoDB disconnected');
});

// Import routes
const newsRoutes = require('./routes/news');
const videosRoutes = require('./routes/videos');
const categoriesRoutes = require('./routes/categories');
const uploadRoutes = require('./routes/uploads');

// Use routes
app.use('/api/posts', newsRoutes);
app.use('/api/igh-yt-videos', videosRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/upload', uploadRoutes);

// API Information endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'News API',
    version: process.env.API_VERSION || 'v1',
    description: 'Complete news backend with image storage',
    endpoints: {
      news: {
        getAll: 'GET /api/news',
        getSingle: 'GET /api/news/:id',
        create: 'POST /api/news',
        update: 'PUT /api/news/:id',
        delete: 'DELETE /api/news/:id',
        byType: 'GET /api/news/type/:type',
        byCategory: 'GET /api/news/category/:categoryId'
      },
      categories: {
        getAll: 'GET /api/categories',
        getSingle: 'GET /api/categories/:id',
        create: 'POST /api/categories'
      },
      upload: {
        single: 'POST /api/upload/single',
        multiple: 'POST /api/upload/multiple',
        fromUrl: 'POST /api/upload/from-url',
        getAll: 'GET /api/upload',
        delete: 'DELETE /api/upload/:id'
      }
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(health);
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 News API Server with Image Storage',
    version: '1.0.0',
    documentation: '/api',
    health: '/api/health',
    features: [
      'RESTful API for news management',
      'MongoDB database with Mongoose ODM',
      'Image upload and processing with Sharp',
      'Automatic thumbnail generation',
      'File storage with Multer',
      'CORS enabled',
      'Environment configuration'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔴 Error:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate entry found'
    });
  }
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      api: '/api',
      health: '/api/health',
      news: '/api/news',
      categories: '/api/categories',
      upload: '/api/upload'
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('📊 MongoDB connection closed');
  process.exit(0);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 News API Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Server running on port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🖼 Image Access: http://localhost:${PORT}/images/`);
  console.log(`🔍 MongoDB: ${MONGODB_URI}`);
  console.log('='.repeat(50));
});