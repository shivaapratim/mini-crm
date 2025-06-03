// backend/api/crons/processPendingOrders.js
import connectDB from '../../../config/db'; // Adjust path as needed
import Order from '../../../models/Order';     // Adjust path
import PendingOrder from '../../../models/PendingOrder'; // Adjust path
import Customer from '../../../models/Customer'; // Adjust path

// Simplified validation helper (similar to the one in customer processor)
const validatePayloadAgainstSchema = (payload, SchemaModel) => {
    const tempDoc = new SchemaModel(payload);
    const validationError = tempDoc.validateSync();
    if (validationError) {
        const errors = {};
        for (const field in validationError.errors) {
            errors[field] = validationError.errors[field].message;
        }
        return { isValid: false, errors };
    }
    return { isValid: true, validatedData: tempDoc.toObject() };
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST.' });
    }

    const CRON_SECRET = process.env.VERCEL_CRON_SECRET;
    const authorizationHeader = req.headers.authorization;
    if (CRON_SECRET && (!authorizationHeader || authorizationHeader !== `Bearer ${CRON_SECRET}`)) {
        console.warn('Unauthorized attempt to access cron job: processPendingOrders');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        await connectDB();
        console.log('Processing pending orders...');

        const pendingOrdersToProcess = await PendingOrder.find({ status: 'PENDING' })
            .sort({ receivedAt: 1 })
            .limit(10) // Process in batches
            .exec();

        if (pendingOrdersToProcess.length === 0) {
            console.log('No pending orders to process.');
            return res.status(200).json({ success: true, message: 'No pending orders to process.' });
        }

        let processedCount = 0;
        let failedCount = 0;

        for (const pending of pendingOrdersToProcess) {
            pending.status = 'PROCESSING';
            pending.attempts = (pending.attempts || 0) + 1;
            await pending.save();

            try {
                const payload = pending.payload;

                // 1. Validate payload against main Order schema
                const { isValid, errors, validatedData } = validatePayloadAgainstSchema(payload, Order);

                if (!isValid) {
                    console.error(`Validation failed for pending order ${pending._id}:`, errors);
                    pending.status = 'FAILED';
                    pending.errorMessage = `Validation failed: ${JSON.stringify(errors)}`;
                    await pending.save();
                    failedCount++;
                    continue;
                }

                // Use validatedData for further processing
                const { customerId, orderAmount } = validatedData;

                // 2. Validate Customer Existence
                const customer = await Customer.findById(customerId);
                if (!customer) {
                    console.error(`Customer not found for pending order ${pending._id}, customerId: ${customerId}`);
                    pending.status = 'FAILED';
                    pending.errorMessage = `Customer with ID ${customerId} not found.`;
                    await pending.save();
                    failedCount++;
                    continue;
                }

                // 3. Create the main Order document
                //    Ensure validatedData (which is a plain object) is used
                const newOrder = await Order.create(validatedData);
                console.log(`Created new order: ${newOrder._id} for customer: ${customer.email}`);

                // 4. Update Customer's aggregates
                customer.totalSpends = (customer.totalSpends || 0) + orderAmount;
                customer.visitCount = (customer.visitCount || 0) + 1;
                customer.lastSeenDate = newOrder.orderDate || new Date(); // Update lastSeen to order date or now
                await customer.save();
                console.log(`Updated aggregates for customer: ${customer.email}`);


                pending.status = 'COMPLETED';
                pending.processedAt = new Date();
                pending.errorMessage = null;
                await pending.save();
                processedCount++;

            } catch (error) {
                console.error(`Error processing pending order ${pending._id}:`, error);
                pending.status = 'FAILED';
                pending.errorMessage = error.message.substring(0, 500) || 'Unknown processing error';
                await pending.save();
                failedCount++;
            }
        }

        const message = `Processed ${processedCount} order(s), Failed ${failedCount} order(s).`;
        console.log(message);
        return res.status(200).json({ success: true, message });

    } catch (error) {
        console.error('General error in processPendingOrders handler:', error);
        return res.status(500).json({ success: false, message: 'Server error during pending order processing.' });
    }
}