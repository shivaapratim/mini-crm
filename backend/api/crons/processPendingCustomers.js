// backend/api/crons/processPendingCustomers.js
import connectDB from '../../../config/db'; // Adjust path as needed
import Customer from '../../../models/Customer'; // Adjust path
import PendingCustomer from '../../../models/PendingCustomer'; // Adjust path

// Helper function to simulate Mongoose validation on a plain object
// This is a simplified version. For complex cases, you might instantiate a new model
// and call validateSync() or save() within a try-catch in a transaction.
const validatePayloadAgainstSchema = (payload, SchemaModel) => {
    const tempDoc = new SchemaModel(payload);
    const validationError = tempDoc.validateSync();
    if (validationError) {
        // Collect error messages
        const errors = {};
        for (const field in validationError.errors) {
            errors[field] = validationError.errors[field].message;
        }
        return { isValid: false, errors };
    }
    return { isValid: true, validatedData: tempDoc.toObject() }; // return validated and casted data
};


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST.' });
    }

    // Secure this endpoint: Vercel Cron jobs can send a secret.
    // Check for a cron job secret if you've configured one in vercel.json and environment variables
    const CRON_SECRET = process.env.VERCEL_CRON_SECRET;
    const authorizationHeader = req.headers.authorization;
    if (CRON_SECRET && (!authorizationHeader || authorizationHeader !== `Bearer ${CRON_SECRET}`)) {
        console.warn('Unauthorized attempt to access cron job: processPendingCustomers');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        await connectDB();
        console.log('Processing pending customers...');

        // Fetch a batch of pending customers (e.g., limit to 10-50 per run)
        const pendingCustomersToProcess = await PendingCustomer.find({ status: 'PENDING' })
            .sort({ receivedAt: 1 }) // Process oldest first
            .limit(10) // Process in batches
            .exec();

        if (pendingCustomersToProcess.length === 0) {
            console.log('No pending customers to process.');
            return res.status(200).json({ success: true, message: 'No pending customers to process.' });
        }

        let processedCount = 0;
        let failedCount = 0;

        for (const pending of pendingCustomersToProcess) {
            pending.status = 'PROCESSING';
            pending.attempts = (pending.attempts || 0) + 1;
            await pending.save(); // Mark as processing

            try {
                const payload = pending.payload;

                // 1. Validate payload against main Customer schema
                const { isValid, errors, validatedData } = validatePayloadAgainstSchema(payload, Customer);

                if (!isValid) {
                    console.error(`Validation failed for pending customer ${pending._id}:`, errors);
                    pending.status = 'FAILED';
                    pending.errorMessage = `Validation failed: ${JSON.stringify(errors)}`;
                    await pending.save();
                    failedCount++;
                    continue; // Move to the next pending customer
                }

                // Use validatedData from now on as it has Mongoose defaults and type casting applied
                const { email } = validatedData;

                // 2. Check for existing customer by email
                let existingCustomer = await Customer.findOne({ email: email.toLowerCase() });

                if (existingCustomer) {
                    // Update existing customer (example: merge some fields)
                    // This logic depends on your business rules.
                    // For simplicity, let's update name and lastSeenDate if provided in payload.
                    if (validatedData.name) existingCustomer.name = validatedData.name;
                    if (validatedData.phone) existingCustomer.phone = validatedData.phone;
                    if (validatedData.totalSpends) existingCustomer.totalSpends = (existingCustomer.totalSpends || 0) + validatedData.totalSpends; //  Consider if this should be an increment
                    if (validatedData.visitCount) existingCustomer.visitCount = (existingCustomer.visitCount || 0) + validatedData.visitCount; // Consider increment
                    if (validatedData.lastSeenDate) existingCustomer.lastSeenDate = validatedData.lastSeenDate;
                    if (validatedData.customAttributes) {
                        existingCustomer.customAttributes = new Map([
                            ...(existingCustomer.customAttributes || new Map()),
                            ...Object.entries(validatedData.customAttributes)
                        ]);
                    }

                    await existingCustomer.save();
                    console.log(`Updated existing customer: ${existingCustomer.email}`);
                } else {
                    // 3. Create new customer from validatedData
                    await Customer.create(validatedData);
                    console.log(`Created new customer: ${validatedData.email}`);
                }

                pending.status = 'COMPLETED';
                pending.processedAt = new Date();
                pending.errorMessage = null; // Clear any previous error message
                await pending.save();
                processedCount++;

            } catch (error) {
                console.error(`Error processing pending customer ${pending._id}:`, error);
                pending.status = 'FAILED';
                // Be careful about error message length for DB
                pending.errorMessage = error.message.substring(0, 500) || 'Unknown processing error';
                await pending.save();
                failedCount++;
            }
        }

        const message = `Processed ${processedCount} customer(s), Failed ${failedCount} customer(s).`;
        console.log(message);
        return res.status(200).json({ success: true, message });

    } catch (error) {
        console.error('General error in processPendingCustomers handler:', error);
        return res.status(500).json({ success: false, message: 'Server error during pending customer processing.' });
    }
}