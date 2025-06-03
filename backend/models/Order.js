// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer', // Reference to the Customer model
        required: true,
    },
    orderAmount: {
        type: Number,
        required: [true, 'Please provide an order amount'],
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    items: [{ // Simple example of order items
        productId: String,
        productName: String,
        quantity: Number,
        price: Number,
    }],
    // You could add more fields like order status, shipping address etc.
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Order', OrderSchema);