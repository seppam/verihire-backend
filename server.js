require("dotenv").config();
const app = require('./app');
const connectDB = require('./config/db');

// 1. Koneksi Database
connectDB();

const PORT = process.env.PORT || 3001;

// 2. Nyalakan Server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// 3. Handle error yang tidak tertangkap (Uncaught Exceptions)
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});