// backend/controllers/orderIngestionController.js
const PendingOrder = require('../models/PendingOrder');
const Customer = require('../models/Customer'); // Optional: for quick customer existence check

// @desc    Accept order data for asynchronous processing
// @route   POST /api/v1/ingest/orders
// @access  Public (for now)
exports.createPendingOrder = async (req, res, next) => {
    try {
        const orderDataPayload = req.body;

        // --- Basic Validation ---
        if (!orderDataPayload || typeof orderDataPayload !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid order data payload: must be an object.' });
        }
        if (!orderDataPayload.customerId || !orderDataPayload.orderAmount) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order data payload: customerId and orderAmount are required.',
            });
        }

        // Optional: A very quick check if the customerId *might* be valid or exists.
        // The full referential integrity check would happen in the async processor.
        // if (mongoose.Types.ObjectId.isValid(orderDataPayload.customerId)) {
        //     const customerExists = await Customer.findById(orderDataPayload.customerId).select('_id').lean();
        //     if (!customerExists) {
        //         // Decide how to handle: reject, or let processor deal with it.
        //         // For now, we'll let the processor handle deeper validation.
        //     }
        // }

        const pendingOrder = await PendingOrder.create({
            payload: orderDataPayload,
            status: 'PENDING',
        });

        res.status(202).json({
            success: true,
            message: 'Order data accepted for processing.',
            pendingId: pendingOrder._id,
        });
    } catch (error) {
        console.error('Error creating pending order:', error);
        res.status(500).json({ success: false, message: 'Server error while accepting order data.' });
    }
};