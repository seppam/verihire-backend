const JobScan = require('../models/JobScan');
const catchAsync = require('../utils/catchAsync');

exports.getGeneralStats = catchAsync(async (req, res, next) => {
    // 1. Statistik berdasarkan Source (Platform)
    const statsBySource = await JobScan.aggregate([
        { 
            $group: { 
                _id: "$source", 
                count: { $sum: 1 } 
            } 
        },
        { $sort: { count: -1 } } // Urutkan dari yang terbanyak
    ]);

    // 2. Statistik berdasarkan Verdict (Tingkat Bahaya)
    const statsByVerdict = await JobScan.aggregate([
        { 
            $group: { 
                _id: "$analysis.verdict", 
                count: { $sum: 1 } 
            } 
        }
    ]);

    // 3. Total Scan Keseluruhan
    const totalScans = await JobScan.countDocuments();

    res.status(200).json({
        success: true,
        data: {
            total: totalScans,
            bySource: statsBySource,
            byVerdict: statsByVerdict
        }
    });
});