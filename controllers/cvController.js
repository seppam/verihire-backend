const CvAnalysis = require('../models/CvAnalysis');
const { analyzeCvWithAI, generateImprovedCvText } = require('../services/cvService');
const catchAsync = require('../utils/catchAsync');
const { extractTextFromFile } = require('../utils/fileExtractor');

exports.analyzeUserCv = catchAsync(async (req, res, next) => {
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    // 1. Cek apakah file sudah di-upload
    const errNoFileMsg = lang === 'id' ? 'Harap unggah file CV (PDF).' : 'Please upload a CV file (PDF).';
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: errNoFileMsg
        });
    }

    // 2. Ekstrak teks dari Buffer PDF
    const cvText = await extractTextFromFile(req.file);

    const errTooShortMsg = lang === 'id' ? 'Konten CV terlalu pendek atau tidak terbaca.' : 'CV content is too short or unreadable.';
    if (!cvText || cvText.trim().length < 100) {
        return res.status(400).json({
            success: false,
            message: errTooShortMsg
        });
    }

    // 3. Ambil target pekerjaan dari body (jika ada)
    const { jobTarget } = req.body;

    // 4. Panggil AI Service
    const aiResults = await analyzeCvWithAI(cvText, jobTarget, lang);
    const improvedCvText = generateImprovedCvText(cvText, aiResults.rephraseSuggestions);

    // 5. Simpan ke Database
    const newAnalysis = await CvAnalysis.create({
        user: req.user.id,
        jobTarget: jobTarget || 'General',
        cvFileName: req.file ? req.file.originalname : 'CV_Document',
        cvText: cvText, // Disimpan untuk audit, tapi di model kita set select: false
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
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
    // Pakai +cvText agar teks aslinya ikut terbawa jika user ingin melihatnya lagi
    const cv = await CvAnalysis.findOne({ _id: req.params.id, user: req.user.id }).select('+cvText');

    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
    const errNotFoundMsg = lang === 'id' ? 'Riwayat CV tidak ditemukan atau akses ditolak.' : 'CV history not found or unauthorized access.';

    if (!cv) {
        return res.status(404).json({ success: false, message: errNotFoundMsg });
    }

    res.status(200).json({ success: true, data: cv });
});

// --- 3. MENGHAPUS HISTORY CV ---
exports.deleteCvHistory = catchAsync(async (req, res, next) => {
    const cv = await CvAnalysis.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
    const errNotFoundMsg = lang === 'id' ? 'Riwayat CV tidak ditemukan atau akses ditolak.' : 'CV history not found or unauthorized access.';

    if (!cv) {
        return res.status(404).json({ success: false, message: errNotFoundMsg });
    }

    const successMsg = lang === 'id' ? 'Riwayat CV berhasil dihapus.' : 'CV history successfully deleted.';
    res.status(200).json({
        success: true,
        message: successMsg
    });
});