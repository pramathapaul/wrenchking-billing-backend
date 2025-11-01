const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 🔍 DEBUG: Check environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All env vars:', process.env);

// Use environment variable OR hardcoded fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pramathapaul8090_db_user:43x8FhW0VVqds3lS@cluster1.3bxgwwm.mongodb.net/billing-app?retryWrites=true&w=majority&appName=Cluster1';

console.log('🔧 Using MONGODB_URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'https://thewrenchking-bill.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
console.log('🔧 Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ SUCCESS: Connected to MongoDB Atlas');
  console.log('📦 Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📦 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Routes
app.use('/api/invoices', require('./routes/invoices'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Billing App API is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Billing App API is running!',
    version: '1.0.0',
    endpoints: {
      invoices: '/api/invoices',
      health: '/health'
    }
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error stack:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Duplicate field value entered'
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      message: 'Invalid ID format'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 API endpoints available at: http://localhost:${PORT}/api/invoices`);
});
