// backend/controllers/campaignController.js
const Segment = require('../models/Segment'); // We're using Segments as "Campaigns" for history for now

// @desc    Get all saved segments (campaigns)
// @route   GET /api/v1/campaigns
// @access  Private (TODO: Add authentication middleware)
exports.getCampaigns = async (req, res) => {
    try {
        // Fetch segments, sort by most recently created
        // For now, 'Segment' model has name, rules, createdAt, lastCalculatedAudienceSize
        const campaigns = await Segment.find({})
            .sort({ createdAt: -1 }) // Most recent first
            .select('name createdAt lastCalculatedAudienceSize rules') // Select relevant fields
            .lean(); // Use .lean() for faster queries if not modifying docs

        // We'll add actual delivery stats later. For now, they are placeholders.
        const campaignsWithStats = campaigns.map(campaign => ({
            id: campaign._id,
            name: campaign.name,
            createdAt: campaign.createdAt,
            audienceSize: campaign.lastCalculatedAudienceSize || 0, // From segment save
            rules: campaign.rules, // For potential display or re-use
            sent: 0, // Placeholder
            failed: 0, // Placeholder
        }));

        res.status(200).json({
            success: true,
            count: campaignsWithStats.length,
            data: campaignsWithStats,
        });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ success: false, message: 'Server error fetching campaigns' });
    }
};