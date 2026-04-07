const rateLimit = require("express-rate-limit");

// Specific limiter for Anonymous Scan feature
const anonScanLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 Hours
  max: 3, // Maximum 3 scans per day per IP
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      message: "You have reached the free scan limit. Please login for unlimited scans!",
      triggerLogin: true // Flag for FE to show Login Modal
    });
  }
});

module.exports = { anonScanLimiter };