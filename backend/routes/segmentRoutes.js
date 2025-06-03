// backend/routes/segmentRoutes.js
const express = require('express');
const { previewSegmentAudience, createSegment } = require('../controllers/segmentController');
// const { protect } = require('../middleware/authMiddleware'); // TODO: Add authentication later

const router = express.Router();

// We'll add 'protect' middleware once authentication is in place
router.post('/preview', /* protect, */ previewSegmentAudience);
router.post('/', /* protect, */ createSegment);

module.exports = router;