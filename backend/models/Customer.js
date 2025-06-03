// backend/models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a customer name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true, // Ensures no two customers have the same email
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        trim: true,
        // You might add more validation for phone numbers if needed
    },
    totalSpends: { // Total amount spent by the customer
        type: Number,
        default: 0,
    },
    visitCount: { // Total number of visits/orders
        type: Number,
        default: 0,
    },
    lastSeenDate: { // Could be last login, last order, or last activity
        type: Date,
    },
    // You can add more fields relevant for segmentation later:
    // address: { street: String, city: String, postalCode: String, country: String },
    // tags: [String], // e.g., "VIP", "New User", "Inactive"
    customAttributes: { // For flexible, dynamic attributes
        type: Map,
        of: mongoose.Schema.Types.Mixed, // Allows any type of value in the map
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Middleware to update `updatedAt` field before each save
CustomerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Customer', CustomerSchema);