const express = require("express");
const router = express.Router();
const multer = require("multer");
const scanController = require("../controllers/scanController");

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file format! Use JPG or PNG."), false);
        }
    }
});

// Middleware helper untuk handle error Multer (seperti Limit 2MB)
const uploadMiddleware = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `File too large! Max 2MB.` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

router.post("/detect", uploadMiddleware, scanController.detectJob);

module.exports = router;