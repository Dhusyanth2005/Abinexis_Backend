const app = require('../app');
require('dotenv').config(); 
const connectDB = require('./config/db');
connectDB();
module.exports = app;
