require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const cron = require('node-cron');

connectDB();

// ==================== CRON JOB - Self Ping Every 10 Minutes ====================
cron.schedule('*/10 * * * *', async () => {
  try {
    const DEPLOYED_URL = 'https://abinexis-backend.onrender.com';
    
    const response = await fetch(`${DEPLOYED_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Optional: Add a small timeout
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json()
    console.log(`[${new Date().toISOString()}] ✅ Self-ping successful: ${response.status} and ${data.message}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Self-ping failed:`, error.message);
  }
}, {
  timezone: "Asia/Kolkata"
});

// Health Check Route (Important for Render)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: /api/health`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});