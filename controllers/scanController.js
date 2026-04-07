const validator = require('validator');
const JobScan = require('../models/JobScan'); 
const catchAsync = require('../utils/catchAsync');
const { extractTextFromImage, extractTextFromUrl, analyzeContent } = require('../services/aiService');
const { extractTextFromFile } = require('../utils/fileExtractor');

exports.detectJob = catchAsync(async (req, res, next) => {
    let textToAnalyze = "";
    let inputType = "text"; 
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
    
    // Ambil data dari body
    const { content, url, source } = req.body;

    // 1. Logika Pemilihan Input
    if (req.file) {
        inputType = "document_or_image";
        textToAnalyze = await extractTextFromFile(req.file);
    } else if (url) { // Pakai variabel hasil destrukturisasi
        inputType = "url";
        textToAnalyze = await extractTextFromUrl(url, lang);
    } else {
        inputType = "text";
        textToAnalyze = content;
    }

    // Validasi konten kosong
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            message: "No content provided." 
        });
    }

    console.log("=== CEK STATUS USER ===");
    console.log(req.user ? "User Login dengan ID: " + req.user.id : "Ini adalah Guest User");

    // 2. Analisis AI
    const sanitizedText = validator.escape(textToAnalyze);
    const analysis = await analyzeContent(sanitizedText, lang);

    // 3. Persiapkan Data untuk Database
    const scanData = {
        content: sanitizedText,
        inputType,
        url: url || null,
        source: source || 'other',
        analysis: analysis
    };

    // Link ke user jika login (untuk History)
    if (req.user) {
        scanData.user = req.user.id;
    }

    const savedData = await JobScan.create(scanData);

    // 4. Kirim Response (Boleh 200, atau 201 biar keren)
    res.status(201).json({
        success: true,
        data: savedData,
        isGuest: !req.user
    });
});

// --- MENDAPATKAN HISTORY DENGAN PAGINATION ---
exports.getMyHistory = catchAsync(async (req, res, next) => {
  // 1. Setup Pagination (Default: Halaman 1, tampilkan 10 data per halaman)
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // 2. Ambil data sesuai limit dan skip
  const history = await JobScan.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // 3. Hitung total semua data milik user ini (untuk info Front-End)
  const total = await JobScan.countDocuments({ user: req.user.id });

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

// --- MENGHAPUS HISTORY (BARU) ---
exports.deleteScanHistory = catchAsync(async (req, res, next) => {
  // Cari berdasarkan ID history DAN User ID yang sedang login
  // Ini mencegah user nakal menghapus history milik orang lain!
  const scan = await JobScan.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id
  });

  if (!scan) {
    return res.status(404).json({ 
      success: false, 
      message: 'Scan history not found or unauthorized access.' 
    });
  }

  res.status(200).json({
    success: true,
    message: 'Scan history successfully deleted.'
  });
});