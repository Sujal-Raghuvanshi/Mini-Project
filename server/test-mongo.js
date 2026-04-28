const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

// Function to test MongoDB connection
async function testConnection() {
    try {
        // Log the URI (useful for debugging, but be careful in production)
        console.log('Attempting to connect to:', process.env.MONGODB_URI);

        // Connect to MongoDB using Mongoose
        await mongoose.connect(process.env.MONGODB_URI);

        // If connection is successful
        console.log('✓ MongoDB connected successfully!');

        // Close the connection after testing
        await mongoose.connection.close();

        // Exit process with success code
        process.exit(0);

    } catch (error) {
        // Handle connection errors

        console.error('✗ MongoDB connection error:');

        // Print error details for debugging
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);

        // Exit process with failure code
        process.exit(1);
    }
}

// Invoke the test function
testConnection();