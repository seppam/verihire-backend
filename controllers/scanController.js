const JobScan = require('../models/JobScan'); 
const catchAsync = require('../utils/catchAsync');
const { extractTextFromImage, extractTextFromUrl, analyzeContent } = require('../services/aiService');

exports.detectJob = catchAsync(async (req, res, next) => {
    let textToAnalyze = "";
    let inputType = "text"; // Default
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';
    const { content, url, source } = req.body;

    // 1. Logika Pemilihan Input & Penentuan inputType
    if (req.file) {
        inputType = "image";
        textToAnalyze = await extractTextFromImage(req.file.buffer, lang);
    } else if (req.body.url) {
        inputType = "url";
        textToAnalyze = await extractTextFromUrl(req.body.url, lang);
    } else {
        inputType = "text";
        textToAnalyze = req.body.content;
    }

    // Validasi konten kosong
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            message: lang === 'id' ? "Konten tidak ditemukan." : "No content provided." 
        });
    }

    // 2. Analisis AI (Hasilnya disimpan di variabel 'analysis')
    const analysis = await analyzeContent(textToAnalyze, lang);

    // 3. --- SIMPAN KE DATABASE ---
    // Pastikan field 'analysis' diisi dengan variabel 'analysis' (bukan result)
    const savedData = await JobScan.create({
        content: textToAnalyze,
        inputType: inputType,
        url: url || null,
        source: source || 'other', // Simpan source dari FE
        analysis: analysis
    });

    // 4. Kirim Response
    res.status(200).json({
        success: true,
        data: savedData 
    });
});