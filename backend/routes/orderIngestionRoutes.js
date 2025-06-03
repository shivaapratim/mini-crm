// backend/routes/orderIngestionRoutes.js
const express = require('express');
const { createPendingOrder } = require('../controllers/orderIngestionController');

const router = express.Router();

router.post('/', createPendingOrder);

module.exports = router;