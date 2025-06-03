// backend/models/PendingCustomer.js
const mongoose = require('mongoose');

const PendingCustomerSchema = new mongoose.Schema({
    payload: { // This will store the actual customer data that was received
        type: Object,
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'PENDING',
    },
    errorMessage: { // To store any error message if processing fails
        type: String,
    },
    attempts: { // To track retry attempts
        type: Number,
        default: 0
    },
    receivedAt: { // When the API received this data
        type: Date,
        default: Date.now,
    },
    processedAt: { // When this data was successfully processed
        type: Date,
    },
});

module.exports = mongoose.model('PendingCustomer', PendingCustomerSchema, 'pending_customers');
// The third argument 'pending_customers' explicitly sets the collection name in MongoDB