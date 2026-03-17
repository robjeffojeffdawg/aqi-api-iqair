const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options - they're default in Mongoose v4+
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('📡 Mongoose connected to MongoDB');
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Don't exit in production - let Railway retry
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB');
});

module.exports = connectDB;
