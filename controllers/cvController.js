const CvAnalysis = require('../models/CvAnalysis');
const { analyzeCvWithAI } = require('../services/cvService');
const catchAsync = require('../utils/catchAsync');
const { extractTextFromFile } = require('../utils/fileExtractor');

exports.analyzeUserCv = catchAsync(async (req, res, next) => {
    // 1. Cek apakah file sudah di-upload
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Please upload a CV file (PDF).'
        });
    }

    // 2. Ekstrak teks dari Buffer PDF
    const cvText = await extractTextFromFile(req.file);

    if (!cvText || cvText.trim().length < 100) {
        return res.status(400).json({
            success: false,
            message: 'CV content is too short or unreadable.'
        });
    }

    // 3. Ambil target pekerjaan dari body (jika ada)
    const { jobTarget } = req.body;
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    // 4. Panggil AI Service
    const aiResults = await analyzeCvWithAI(cvText, jobTarget, lang);

    // 5. Simpan ke Database
    const newAnalysis = await CvAnalysis.create({
        user: req.user.id,
        jobTarget: jobTarget || 'General',
        cvText: cvText, // Disimpan untuk audit, tapi di model kita set select: false
        analysis: aiResults
    });

    res.status(201).json({
        success: true,
        data: newAnalysis
    });
});

exports.getCvHistory = catchAsync(async (req, res, next) => {
    const history = await CvAnalysis.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    res.status(200).json({
        success: true,
        count: history.length,
        data: history
    });
});