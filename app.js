const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const sanitize = require("./middlewares/sanitizeMiddleware");
const errorHandler = require("./middlewares/errorHandler");
const paymentController = require("./controllers/paymentController");

const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmet());

// Setup CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));

// 2. MAYAR WEBHOOK — capture raw body BEFORE express.json() for HMAC verification
// All other routes come after express.json() below.
app.post("/api/payment/webhook",
    express.raw({ type: 'application/json', inflate: true }),
    (req, res, next) => {
        req.rawBody = req.body.toString();
        next();
    },
    paymentController.webhook
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 3. NoSQL INJECTION SANITIZATION
app.use(sanitize);

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// 4. ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/cv", require("./routes/cvRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// 5. GLOBAL ERROR HANDLER
app.use(errorHandler);

module.exports = app;
