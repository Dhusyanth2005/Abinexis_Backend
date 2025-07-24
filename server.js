require('dotenv').config(); // Load .env at the start
const app = require('./app');
const connectDB = require('./config/db');
connectDB();

const PORT = process.env.PORT || 5000; // Changed to 3000 to avoid ERR_UNSAFE_PORT
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});