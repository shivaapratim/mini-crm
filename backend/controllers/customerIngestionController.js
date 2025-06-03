// backend/controllers/customerIngestionController.js
const PendingCustomer = require('../models/PendingCustomer');

// @desc    Accept customer data for asynchronous processing
// @route   POST /api/v1/ingest/customers  (We'll set up this route path in server.js)
// @access  Public (for now, will add auth later if needed for specific ingest points)
exports.createPendingCustomer = async (req, res, next) => {
    try {
        const customerDataPayload = req.body;

        // --- Basic Validation (API layer handles only initial validation) ---
        // More thorough validation will happen in the asynchronous processor.
        // For now, just ensure some essential parts of the payload exist.
        if (!customerDataPayload || typeof customerDataPayload !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid customer data payload: must be an object.' });
        }
        if (!customerDataPayload.email || !customerDataPayload.name) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer data payload: email and name are required.',
            });
        }
        // Add any other absolutely critical field checks here.

        const pendingCustomer = await PendingCustomer.create({
            payload: customerDataPayload,
            status: 'PENDING', // Default, but explicit
        });

        // Respond with 202 Accepted, indicating the request is accepted for processing.
        res.status(202).json({
            success: true,
            message: 'Customer data accepted for processing.',
            pendingId: pendingCustomer._id,
        });
    } catch (error) {
        console.error('Error creating pending customer:', error);
        // Avoid sending detailed internal errors to the client in production
        res.status(500).json({ success: false, message: 'Server error while accepting customer data.' });
    }
};