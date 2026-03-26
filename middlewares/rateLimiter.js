const rateLimit = require("express-rate-limit");

// Limiter khusus untuk fitur Scan Anonim
const anonScanLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 Jam
  max: 3, // Maksimal 3 kali scan per hari per IP
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      message: "Kamu telah mencapai batas scan gratis. Silakan login untuk scan sepuasnya!",
      triggerLogin: true // Flag untuk FE agar munculkan Modal Login
    });
  }
});

module.exports = { anonScanLimiter };