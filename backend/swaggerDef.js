// backend/swaggerDef.js
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Embedded JSDoc Test',
        version: '1.0.0',
        /**
         * @swagger
         * /embedded-ping:
         * get:
         * summary: Test embedded JSDoc
         * tags: [EmbeddedTest]
         * responses:
         * '200':
         * description: OK from embedded
         */
        description: 'Testing embedded JSDoc within swaggerDefinition info.description',
    },
    tags: [{ name: 'EmbeddedTest', description: 'Tag from embedded JSDoc test'}],
    // No 'paths' or 'servers' defined here initially by hand
};

// For this test, 'apis' array will be empty.
// swagger-jsdoc will parse JSDoc found within the swaggerDefinition object itself.
const options = {
    swaggerDefinition,
    apis: [], // Empty! JSDoc is IN swaggerDefinition.info.description
};

const swaggerSpec = swaggerJSDoc(options);

console.log("\n--- SWAGGER SPECIFICATION OUTPUT (Embedded JSDoc Test) ---");
console.log(JSON.stringify(swaggerSpec, null, 2));
console.log("--- END SWAGGER SPECIFICATION ---");

module.exports = swaggerSpec;