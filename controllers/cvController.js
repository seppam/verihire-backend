const CvAnalysis = require('../models/CvAnalysis');
const User = require('../models/User');
const { analyzeCvWithAI, generateImprovedCvText } = require('../services/eliceCvService');
const catchAsync = require('../utils/catchAsync');
const { extractTextFromFile } = require('../utils/fileExtractor');

exports.analyzeUserCv = catchAsync(async (req, res, next) => {
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    // 0. ATOMIC TOKEN CHECK
    // Deduct token first. If any step fails after this, quota is already spent.
    const user = await User.findOneAndUpdate(
        { _id: req.user._id, scanLimit: { $gte: 1 } },
        { $inc: { scanLimit: -1 } },
        { new: true }
    );

    if (!user) {
        const errLimitMsg = lang === 'id'
            ? 'Kuota scan CV Anda habis. Silakan upgrade ke Premium.'
            : 'CV scan quota exhausted. Please upgrade to Premium.';
        return res.status(403).json({
            success: false,
            message: errLimitMsg,
            code: 'PAYMENT_REQUIRED'
        });
    }
    req.user = user;

    // 1. Cek apakah file sudah di-upload
    const errNoFileMsg = lang === 'id'
        ? 'Harap unggah file CV (PDF).'
        : 'Please upload a CV file (PDF).';
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: errNoFileMsg,
            quotaDeducted: true
        });
    }

    // 2. Ekstrak teks dari Buffer PDF
    let cvText;
    try {
        cvText = await extractTextFromFile(req.file);
    } catch (extractErr) {
        const errExtractMsg = lang === 'id'
            ? 'Gagal mengekstrak teks dari file. Pastikan file valid (PDF/DOCX/JPG/PNG).'
            : 'Failed to extract text from file. Please upload a valid document (PDF/DOCX/JPG/PNG).';
        return res.status(400).json({
            success: false,
            message: errExtractMsg,
            quotaDeducted: true
        });
    }

    // 3. Validasi Panjang Teks
    const minChar = 50;
    const isTooShort = !cvText || cvText.trim().length < minChar;

    if (isTooShort) {
        const errShortMsg = lang === 'id'
            ? "File berisi teks yang terlalu sedikit untuk dianalisis. Harap unggah dokumen yang valid."
            : "File contains too little text to analyze. Please upload a valid document.";
        return res.status(400).json({
            success: false,
            message: errShortMsg,
            quotaDeducted: true
        });
    }

    // 4. Ambil target pekerjaan dari body (jika ada)
    const { jobTarget } = req.body;

    // 5. Panggil AI Service
    let aiResults;
    try {
        aiResults = await analyzeCvWithAI(cvText, jobTarget, lang);
    } catch (aiErr) {
        const errAiMsg = lang === 'id'
            ? 'Gagal menganalisis CV dengan AI. Silakan coba lagi.'
            : 'Failed to analyze CV with AI. Please try again.';
        return res.status(502).json({
            success: false,
            message: errAiMsg,
            quotaDeducted: true
        });
    }

    // 6. Validate AI response structure
    if (typeof aiResults.cvMatchScore !== 'number') {
        console.error("Malformed CV AI response:", aiResults);
        const errMalformedMsg = lang === 'id'
            ? 'Respons AI tidak valid. Silakan coba lagi.'
            : 'Invalid AI response. Please try again.';
        return res.status(502).json({
            success: false,
            message: errMalformedMsg,
            quotaDeducted: true
        });
    }

    const improvedCvText = generateImprovedCvText(cvText, aiResults.rephraseSuggestions);

    // 7. Simpan ke Database
    const newAnalysis = await CvAnalysis.create({
        user: req.user.id,
        jobTarget: jobTarget || 'General',
        cvFileName: req.file ? req.file.originalname : 'CV_Document',
        cvText: cvText,
        improvedCvText: improvedCvText,
        analysis: aiResults
    });

    res.status(201).json({
        success: true,
        data: newAnalysis
    });
});

// --- 1. MENDAPATKAN HISTORY CV ---
exports.getCvHistory = catchAsync(async (req, res, next) => {
    // Pagination with validation
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const history = await CvAnalysis.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await CvAnalysis.countDocuments({ user: req.user.id });

    res.status(200).json({
        success: true,
        count: history.length,
        pagination: {
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            itemsPerPage: limit
        },
        data: history
    });
});

// --- 2. MELIHAT DETAIL SATU HISTORY CV ---
exports.getCvHistoryById = catchAsync(async (req, res, next) => {
    const cv = await CvAnalysis.findOne({ _id: req.params.id, user: req.user.id }).select('+cvText');

    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
    const errNotFoundMsg = lang === 'id'
        ? 'Riwayat CV tidak ditemukan atau akses ditolak.'
        : 'CV history not found or unauthorized access.';

    if (!cv) {
        return res.status(404).json({ success: false, message: errNotFoundMsg });
    }

    res.status(200).json({ success: true, data: cv });
});

// --- 3. MENGHAPUS HISTORY CV ---
exports.deleteCvHistory = catchAsync(async (req, res, next) => {
    const cv = await CvAnalysis.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
    const errNotFoundMsg = lang === 'id'
        ? 'Riwayat CV tidak ditemukan atau akses ditolak.'
        : 'CV history not found or unauthorized access.';

    if (!cv) {
        return res.status(404).json({ success: false, message: errNotFoundMsg });
    }

    const successMsg = lang === 'id'
        ? 'Riwayat CV berhasil dihapus.'
        : 'CV history successfully deleted.';
    res.status(200).json({
        success: true,
        message: successMsg
    });
});
