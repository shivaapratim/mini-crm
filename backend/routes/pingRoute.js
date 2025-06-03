// D:/crm/mini-crm/backend/routes/pingRoute.js
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /my-test-ping:
 * get:
 * summary: A very basic ping operation
 * responses:
 * '200':
 * description: OK
 */
router.get('/', (req, res) => {
    res.json({ message: 'pong from actual route handler in pingRoute.js' });
});

module.exports = router;