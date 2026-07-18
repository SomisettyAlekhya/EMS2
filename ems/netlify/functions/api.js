// Netlify serverless wrapper for the Express app.
// Runs the same routes as the local dev server.
// Uses in-memory SQLite (auto-seeded on cold start). No external services / API keys needed.
process.env.NETLIFY = '1';
process.env.EMS_IN_MEMORY = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

exports.handler = serverless(app);
