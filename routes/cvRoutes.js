const express = require('express');
const multer = require('multer');
const cvController = require('../controllers/cvController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Konfigurasi Multer (Simpan di memory agar langsung diproses pdf-parse)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// Semua route CV wajib Login
router.use(protect);

router.post('/analyze', upload.single('cv'), cvController.analyzeUserCv);
router.get('/history', cvController.getCvHistory);

module.exports = router;