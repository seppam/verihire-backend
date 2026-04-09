const JobScan = require('../models/JobScan');
const CvAnalysis = require('../models/CvAnalysis');
const catchAsync = require('../utils/catchAsync');

// --- 1. PUBLIC STATS (Landing Page) ---
exports.getLandingPageStats = catchAsync(async (req, res, next) => {
    const [totalScans, totalFake, sourceStats, totalCvAnalyzed] = await Promise.all([
        JobScan.countDocuments(),
        JobScan.countDocuments({ 'analysis.verdict': { $in: ['Suspicious', 'High Risk'] } }),
        JobScan.aggregate([
            { $match: { source: { $ne: null, $exists: true } } },
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]),
        CvAnalysis.countDocuments()
    ]);

    const topSource = sourceStats.length > 0 ? sourceStats[0]._id : "N/A";

    res.status(200).json({
        success: true,
        data: { totalScans, totalFake, topSource, totalCvAnalyzed }
    });
});

// --- 2. PERSONAL STATS (User Dashboard) ---
exports.getUserStats = catchAsync(async (req, res, next) => {
    const [jobStats, cvStats] = await Promise.all([
        JobScan.aggregate([
            { $match: { user: req.user._id } },
            { 
                $group: {
                    _id: null,
                    totalScans: { $sum: 1 },
                    scamsAvoided: { $sum: { $cond: [{ $in: ["$analysis.verdict", ["Suspicious", "High Risk"]] }, 1, 0] } }
                }
            }
        ]),
        CvAnalysis.aggregate([
            { $match: { user: req.user._id } },
            {
                $group: {
                    _id: null,
                    totalCv: { $sum: 1 },
                    avgScore: { $avg: "$analysis.cvMatchScore" },
                    bestScore: { $max: "$analysis.cvMatchScore" }
                }
            }
        ])
    ]);

    res.status(200).json({
        success: true,
        data: {
            jobTotal: jobStats.length > 0 ? jobStats[0].totalScans : 0,
            scamsAvoided: jobStats.length > 0 ? jobStats[0].scamsAvoided : 0,
            cvTotal: cvStats.length > 0 ? cvStats[0].totalCv : 0,
            avgCvScore: cvStats.length > 0 ? Math.round(cvStats[0].avgScore) : 0,
            bestCvScore: cvStats.length > 0 ? cvStats[0].bestScore : 0
        }
    });
});