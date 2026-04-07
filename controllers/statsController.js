const JobScan = require('../models/JobScan'); // Adjust your model name
const catchAsync = require('../utils/catchAsync');

exports.getLandingPageStats = catchAsync(async (req, res, next) => {
    // Run 3 queries to the database concurrently (Parallel) for super fast response time!
    const [totalScans, totalFake, sourceStats] = await Promise.all([
        // 1. Calculate total of all scans
        JobScan.countDocuments(),

        // 2. Calculate the ones indicated as fake (Verdict: Suspicious or High Risk)
        JobScan.countDocuments({
            'analysis.verdict': { $in: ['Suspicious', 'High Risk'] }
        }),

        // 3. Find the most used source using Aggregation Pipeline
        JobScan.aggregate([
            {
                // STAGE 1 (NEW): Filter / Remove all data where the source is null or missing
                $match: { 
                    source: { $ne: null, $exists: true } 
                }
            },
            { 
                // STAGE 2: Group by the 'source' field
                $group: { 
                    _id: "$source", 
                    count: { $sum: 1 } 
                } 
            },
            { 
                // STAGE 3: Sort from the highest count
                $sort: { count: -1 } 
            },
            { 
                // STAGE 4: Take only the top one
                $limit: 1 
            }
        ])
    ]);

    // Extract the top 1 source name (if the database is still empty, give default 'N/A')
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