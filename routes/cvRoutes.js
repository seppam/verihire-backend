const express = require('express');
const multer = require('multer');
const cvController = require('../controllers/cvController');
const { protect } = require('../middlewares/authMiddleware');
const { anonScanLimiter } = require('../middlewares/rateLimiter');
const { cvLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

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

// Semua route CV wajib Login
router.use(protect);

router.post('/analyze', cvLimiter, upload.single('cv'), cvController.analyzeUserCv);
router.get('/history', cvController.getCvHistory);
router.get('/history/:id', cvController.getCvHistoryById);
router.delete('/history/:id', cvController.deleteCvHistory);

module.exports = router;