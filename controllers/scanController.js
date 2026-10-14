const validator = require('validator');
const User = require('../models/User');
const JobScan = require('../models/JobScan');
const catchAsync = require('../utils/catchAsync');
const { extractTextFromUrl, analyzeContent } = require('../services/eliceJobService');
const { extractTextFromFile } = require('../utils/fileExtractor');

/**
 * Determine result type from AI score (0-100).
 * Uses the same score-based thresholds as the frontend.
 * 0-40  → High Risk
 * 41-70 → Suspicious
 * 71-100 → Legit
 */
function getVerdictType(score) {
  if (score <= 40) return 'high';
  if (score <= 70) return 'suspicious';
  return 'legit';
}

exports.detectJob = catchAsync(async (req, res, next) => {
  let textToAnalyze = "";
  let inputType = "text";
  let scanTitle = "Text Input";
  const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

  const { content, url, source } = req.body;

  // 0. ATOMIC TOKEN CHECK (for logged-in users)
  if (req.user) {
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, scanLimit: { $gte: 1 } },
      { $inc: { scanLimit: -1 } },
      { new: true }
    );

    if (!user) {
      const errLimitMsg = lang === 'id'
        ? 'Kuota scan Anda habis. Silakan upgrade ke Premium.'
        : 'Scan quota exhausted. Please upgrade to Premium.';
      return res.status(403).json({
        success: false,
        message: errLimitMsg,
        code: 'PAYMENT_REQUIRED'
      });
    }
    // Token deducted. If anything fails below, quota is already spent.
    req.user = user;
  }

  // 1. Logika Pemilihan Input
  if (req.file) {
    inputType = "document_or_image";
    textToAnalyze = await extractTextFromFile(req.file);
    scanTitle = req.file.originalname;
  } else if (url) {
    inputType = "url";
    textToAnalyze = await extractTextFromUrl(url, lang);
    scanTitle = url;
  } else {
    inputType = "text";
    textToAnalyze = content;
    scanTitle = content ? content.substring(0, 20) + "..." : "Text Scan";
  }

  // 1.5 Validasi Panjang Teks (The Guard)
  const minChar = 50;
  const isTooShort = !textToAnalyze || textToAnalyze.trim().length < minChar;

  if (isTooShort) {
    // Refund quota if guest can be tracked (not tracked for guests)
    // For logged-in users who were already deducted atomically above,
    // the quota is spent. Short text does not qualify for refund.
    const errShortMsg = lang === 'id'
      ? `Teks terlalu pendek untuk dianalisis (Min ${minChar} karakter).`
      : `Text is too short to analyze (Min ${minChar} characters).`;

    return res.status(400).json({
      success: false,
      message: errShortMsg,
      quotaDeducted: true
    });
  }

  console.log("=== CEK STATUS USER ===");
  console.log(req.user ? "User Login dengan ID: " + req.user.id : "Ini adalah Guest User");

  // 2. Analisis AI
  const sanitizedText = validator.escape(textToAnalyze);
  let analysis;
  try {
    analysis = await analyzeContent(sanitizedText, lang);
  } catch (aiErr) {
    // AI failed — quota already spent, return error to user
    const errAiMsg = lang === 'id'
      ? 'Analisis AI gagal. Silakan coba lagi.'
      : 'AI analysis failed. Please try again.';
    return res.status(502).json({
      success: false,
      message: errAiMsg,
      quotaDeducted: true
    });
  }

  // 3. Validate AI response structure
  if (
    typeof analysis.score !== 'number' ||
    !['Legit', 'Suspicious', 'High Risk'].includes(analysis.verdict)
  ) {
    console.error("Malformed AI response:", analysis);
    const errMalformedMsg = lang === 'id'
      ? 'Respons AI tidak valid. Silakan coba lagi.'
      : 'Invalid AI response. Please try again.';
    return res.status(502).json({
      success: false,
      message: errMalformedMsg,
      quotaDeducted: true
    });
  }

  // 4. Persiapkan Data untuk Database
  const scanData = {
    scanTitle: scanTitle,
    content: sanitizedText,
    inputType,
    url: url || null,
    source: source || 'other',
    analysis: analysis
  };

  // Link ke user jika login
  if (req.user) {
    scanData.user = req.user.id;
  }

  const savedData = await JobScan.create(scanData);

  // 5. Kirim Response
  res.status(201).json({
    success: true,
    data: savedData,
    isGuest: !req.user,
    verdictType: getVerdictType(analysis.score)
  });
});

// --- MENDAPATKAN HISTORY DENGAN PAGINATION ---
exports.getMyHistory = catchAsync(async (req, res, next) => {
  // Setup Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const history = await JobScan.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

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

// --- MENGHAPUS HISTORY ---
exports.deleteScanHistory = catchAsync(async (req, res, next) => {
  const scan = await JobScan.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id
  });

  const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
  const errNotFoundMsg = lang === 'id'
    ? 'Riwayat scan tidak ditemukan atau akses ditolak.'
    : 'Scan history not found or unauthorized access.';

  if (!scan) {
    return res.status(404).json({
      success: false,
      message: errNotFoundMsg
    });
  }

  const successMsg = lang === 'id'
    ? 'Riwayat scan berhasil dihapus.'
    : 'Scan history successfully deleted.';
  res.status(200).json({
    success: true,
    message: successMsg
  });
});


// --- MELIHAT DETAIL SATU HISTORY JOB SCAN ---
exports.getScanHistoryById = catchAsync(async (req, res, next) => {
  const scan = await JobScan.findOne({ _id: req.params.id, user: req.user.id });

  const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
  const errNotFoundMsg = lang === 'id'
    ? 'Riwayat scan tidak ditemukan atau akses ditolak.'
    : 'Scan history not found or unauthorized access.';

  if (!scan) {
    return res.status(404).json({ success: false, message: errNotFoundMsg });
  }

  res.status(200).json({
    success: true,
    data: scan
  });
});
