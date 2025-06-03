// backend/routes/customerIngestionRoutes.js
const express = require('express');
const { createPendingCustomer } = require('../controllers/customerIngestionController');
const router = express.Router();

/** @swagger /api/v1/ping: { get: { summary: "A simple ping endpoint for Swagger test" } } */
// The line above is the ONLY @swagger comment we are adding for this test.
// It defines a GET request for an endpoint called /api/v1/ping.

router.post('/', createPendingCustomer); // Your existing route handler remains

module.exports = router;