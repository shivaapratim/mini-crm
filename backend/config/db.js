// backend/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    // Check if we have an existing connection (useful for serverless environments
    // where the function might be invoked multiple times and can reuse connections)
    if (mongoose.connections[0].readyState) {
        console.log('MongoDB already connected.');
        return;
    }

    // If no existing connection, create a new one
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // These options are generally recommended, though some older ones are deprecated
            // Mongoose 6+ handles these defaults well, so explicit options are less critical
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // In a serverless function or critical startup, you might want to exit or throw
        // process.exit(1); // Or throw new Error(...) if this function is awaited by critical logic
        throw new Error(`MongoDB Connection Failed: ${error.message}`);
    }
};

module.exports = connectDB;