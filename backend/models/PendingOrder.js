// backend/models/PendingOrder.js
const mongoose = require('mongoose');

const PendingOrderSchema = new mongoose.Schema({
    payload: { // This will store the actual order data that was received
        type: Object,
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'PENDING',
    },
    errorMessage: {
        type: String,
    },
    attempts: {
        type: Number,
        default: 0
    },
    receivedAt: {
        type: Date,
        default: Date.now,
    },
    processedAt: {
        type: Date,
    },
});

module.exports = mongoose.model('PendingOrder', PendingOrderSchema, 'pending_orders');
// Explicitly setting collection name to 'pending_orders'