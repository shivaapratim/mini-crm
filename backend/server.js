// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const segmentRoutes = require('./routes/segmentRoutes');
const campaignRoutes = require('./routes/campaignRoutes');

// --- Swagger Imports ---
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerDef'); // Make sure swaggerDef.js is correctly configured for the pingRoute test

// --- Route Imports ---
const customerIngestionRoutes = require('./routes/customerIngestionRoutes');
const orderIngestionRoutes = require('./routes/orderIngestionRoutes');
const pingRoute = require('./routes/pingRoute'); // For our Swagger file scan test

// We'll import RabbitMQ related things later if we adapt it for Vercel cron
// const { connectRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');

const app = express(); // Initialize the Express app

// --- Connect to Database ---
// This IIFE (Immediately Invoked Function Expression) starts the DB connection.
(async () => {
    try {
        await connectDB(); // Attempt to connect to the database
    } catch (error) {
        console.error("Failed to connect to the database on startup. Server not started.", error);
        process.exit(1); // Exit if DB connection fails on startup (for local dev)
    }
})();

// --- Global Middlewares ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(helmet()); // Set various security HTTP headers
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// --- Swagger API Documentation Route ---
// This must be defined before your other API routes if there's any path conflict,
// but after global middlewares.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/campaigns', campaignRoutes);

// --- Basic Welcome Route ---
app.get('/', (req, res) => {
    res.send('Mini CRM Backend API Running - Welcome!');
});

// --- API Routes (Mount your imported routers here) ---
app.use('/api/v1/ingest/customers', customerIngestionRoutes);
app.use('/api/v1/ingest/orders', orderIngestionRoutes);
app.use('/api/v1/ping-test', pingRoute); // Mount the new pingRoute
app.use('/api/v1/segments', segmentRoutes);

// Example placeholders for future routes:
// app.use('/api/v1/customers', require('./routes/customerRoutes'));
// app.use('/api/v1/orders', require('./routes/orderRoutes'));

// --- Server Initialization ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    // Note: For a production Vercel deployment, app.listen() isn't used directly.
    // Vercel handles invoking your app as a serverless function.
    // This app.listen() is primarily for local development.
});

// --- Graceful Shutdown (Optional but good for local, long-running server) ---
// You would need to assign the server instance: const server = app.listen(...)
// process.on('SIGINT', async () => {
//   console.log('SIGINT signal received: closing HTTP server');
//   // Mongoose handles its own connection closing on SIGINT by default
//   // If using closeRabbitMQ, you'd call it here: await closeRabbitMQ();
//   server.close(() => {
//     console.log('HTTP server closed');
//     process.exit(0);
//   });
// });