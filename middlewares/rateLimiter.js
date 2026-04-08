const rateLimit = require("express-rate-limit");

// 1. Scan Rate Limiter (Berbeda untuk Guest vs Logged-in User)
const anonScanLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 Jam
  max: (req, res) => {
    // User login dapet jatah 50x scan sehari. Guest cuma 3x.
    return req.user ? 50 : 3; 
  },
  handler: (req, res, next) => {
    // Pesan error beda tipis tergantung status login
    const message = req.user 
      ? "You have reached the daily scan limit (50 scans). Please try again tomorrow." 
      : "You have reached the free scan limit. Please login for more scans!";
      
    res.status(429).json({
      success: false,
      message: message,
      triggerLogin: !req.user // Hanya suruh login kalau dia belum login
    });
  }
});

//2. CV Rate Limiter (Berbeda untuk Guest vs Logged-in User)
const cvLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 Jam
  max: 50, // Karena wajib login, langsung set 50
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      message: "You have reached the daily CV analysis limit (50 scans). Please try again tomorrow.",
      triggerLogin: false // Nggak perlu suruh login, karena dia pasti udah login
    });
  }
});

// 3. Chat Rate Limiter (Berbeda untuk Guest vs Logged-in User)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Menit
  max: (req, res) => {
    // User login dapet jatah 100 chat per 15 menit. Guest 30 chat.
    return req.user ? 100 : 30;
  },
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a few minutes before trying again."
    });
  }
});

module.exports = { anonScanLimiter, cvLimiter, chatLimiter };