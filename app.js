const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
// const mongoSanitize = require('express-mongo-sanitize'); 
const errorHandler = require("./middlewares/errorHandler"); 

const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmet()); 

// Setup CORS yang proper untuk Integrasi FE
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Sesuaikan dengan port FE kamu nanti
    credentials: true
}));   

app.use(express.json({ limit: '5mb' })); 
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Data Security (Diaktifkan untuk anti NoSQL Injection)
// app.use(mongoSanitize()); 

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// 2. ROUTES DEFINITIONS
app.use("/api/auth", require("./routes/authRoutes")); 
app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/cv", require("./routes/cvRoutes"));

// 404 Handler 
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// 3. GLOBAL ERROR HANDLER
app.use(errorHandler);

module.exports = app;