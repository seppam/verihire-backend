const mongoose = require('mongoose');
const dns = require('node:dns');

// Memaksa Node.js menggunakan DNS publik agar tidak terhalang ISP
dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'kada', // Nama database kamu
      autoIndex: false,       // Disarankan untuk production agar tidak berat
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;


// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGODB_URI);
//     console.log(`MongoDB Connected: ${conn.connection.host}`);
//   } catch (error) {
//     console.error(`Error: ${error.message}`);
//     process.exit(1); // Stop aplikasi jika DB gagal
//   }
// };

// module.exports = connectDB;