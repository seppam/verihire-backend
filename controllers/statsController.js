const JobScan = require('../models/JobScan'); // Sesuaikan nama modelmu
const catchAsync = require('../utils/catchAsync');

exports.getLandingPageStats = catchAsync(async (req, res, next) => {
    // Jalankan 3 query ke database secara BERSAMAAN (Paralel) agar response time super cepat!
    const [totalScans, totalFake, sourceStats] = await Promise.all([
        // 1. Hitung total semua scan
        JobScan.countDocuments(),

        // 2. Hitung yang terindikasi palsu (Verdict: Suspicious atau High Risk)
        JobScan.countDocuments({
            'analysis.verdict': { $in: ['Suspicious', 'High Risk'] }
        }),

        // 3. Cari source paling banyak pakai Aggregation Pipeline
        JobScan.aggregate([
            {
                // TAHAP 1 (BARU): Filter / Buang semua data yang source-nya null atau tidak ada
                $match: { 
                    source: { $ne: null, $exists: true } 
                }
            },
            { 
                // TAHAP 2: Kelompokkan berdasarkan field 'source'
                $group: { 
                    _id: "$source", 
                    count: { $sum: 1 } 
                } 
            },
            { 
                // TAHAP 3: Urutkan dari yang jumlahnya paling besar
                $sort: { count: -1 } 
            },
            { 
                // TAHAP 4: Ambil juara satunya aja
                $limit: 1 
            }
        ])
    ]);

    // Ekstrak nama source juara 1 (kalau database masih kosong, kasih default 'N/A')
    const topSource = sourceStats.length > 0 ? sourceStats[0]._id : "N/A";

    res.status(200).json({
        success: true,
        data: {
            totalScans,
            totalFake,
            topSource
        }
    });
});