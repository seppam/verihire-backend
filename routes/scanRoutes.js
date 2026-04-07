const express = require("express");
const router = express.Router();
const multer = require("multer");
const scanController = require("../controllers/scanController");
const { protect, optionalProtect } = require("../middlewares/authMiddleware");
const { anonScanLimiter } = require("../middlewares/rateLimiter");

// --- Multer Configuration ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
    fileFilter: (req, file, cb) => {
        // FIX: Tangkap bahasa dari header, default English
        const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
        const errorMsg = lang === 'id' 
            ? 'Format tidak didukung! Gunakan PDF, DOCX, JPG, atau PNG.' 
            : 'Unsupported format! Please use PDF, DOCX, JPG, or PNG.';

        const allowedTypes = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
            'image/jpeg', 
            'image/png', 
            'image/jpg'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(errorMsg), false);
        }
    }
});

const uploadMiddleware = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `File too large! Max 5MB.` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

// router.post("/detect", optionalProtect, verifyTurnstile, dynamicRateLimit, uploadMiddleware, scanController.detectJob);

const dynamicRateLimit = (req, res, next) => {
  if (req.user) {
    return next(); // User login? Bebas limit, lanjut!
  }
  return anonScanLimiter(req, res, next); // Guest? Kena jaring limiter.
};

// ENDPOINT DETECT
router.post("/detect", optionalProtect, dynamicRateLimit, uploadMiddleware, scanController.detectJob);

// ENDPOINT HISTORY (Tetap wajib login)
router.get("/my-history", protect, scanController.getMyHistory);
router.delete("/my-history/:id", protect, scanController.deleteScanHistory);

module.exports = router;