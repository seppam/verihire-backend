const express = require("express");
const router = express.Router();
const multer = require("multer");
const scanController = require("../controllers/scanController");
const captchaMiddleware = require('../middlewares/captchaMiddleware');

// Import cuma ditulis SEKALI di bagian atas
const { protect, optionalProtect } = require("../middlewares/authMiddleware");
const { anonScanLimiter } = require("../middlewares/rateLimiter");

// --- Multer Configuration ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
    fileFilter: (req, file, cb) => {
        const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
        const errorMsg = lang === 'id' 
            ? 'Format tidak didukung! Gunakan PDF, DOCX, JPG, atau PNG.' 
            : 'Unsupported format! Please use PDF, DOCX, JPG, or PNG.';

        const allowedTypes = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
            const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
            const msg = lang === 'id' ? 'File terlalu besar! Maks 5MB.' : 'File too large! Max 5MB.';
            return res.status(400).json({ success: false, message: msg });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

// ENDPOINT DETECT
router.post(
    "/detect", 
    optionalProtect, 
    anonScanLimiter,       
    uploadMiddleware,      
    captchaMiddleware.verifyTurnstile, 
    scanController.detectJob
);

// ENDPOINT HISTORY (Tetap wajib login)
router.get("/my-history", protect, scanController.getMyHistory);
router.delete("/my-history/:id", protect, scanController.deleteScanHistory);
router.get("/my-history/:id", protect, scanController.getScanHistoryById);

module.exports = router;