// backend/models/Segment.js
const mongoose = require('mongoose');

const RuleSchema = new mongoose.Schema({}, { _id: false, strict: false }); // Allow any structure for rules

const SegmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Segment name is required'],
        trim: true,
    },
    rules: { // This will store the array of rule group objects
        type: [RuleSchema], // Array of flexible rule/group objects
        required: true,
    },
    // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If segments are user-specific
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastCalculatedAudienceSize: {
        type: Number,
    },
});

module.exports = mongoose.model('Segment', SegmentSchema);