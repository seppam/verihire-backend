const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler"); 

const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmet()); // Menambah security headers
app.use(cors());   // Mengizinkan akses dari Frontend (penting untuk tim FE)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Simple Request Logger untuk memantau trafik di terminal
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// 2. ROUTES DEFINITIONS
app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));

// 3. GLOBAL ERROR HANDLER (Paling bawah)
app.use(errorHandler);

module.exports = app;