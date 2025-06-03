// backend/routes/campaignRoutes.js
const express = require('express');
const { getCampaigns } = require('../controllers/campaignController');
// const { protect } = require('../middleware/authMiddleware'); // TODO: Add authentication

const router = express.Router();

router.get('/', /* protect, */ getCampaigns);

module.exports = router;