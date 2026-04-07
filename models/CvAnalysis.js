const mongoose = require('mongoose');

const cvAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  jobTarget: {
    type: String, // Bisa berupa nama posisi atau full requirements
    default: 'General'
  },
  cvFileName: {
    type: String,
    default: 'Unknown_CV'
  },
  cvText: {
    type: String,
    required: true,
    select: false // Sembunyikan teks CV mentah agar response API tidak terlalu berat
  },
  improvedCvText: {
    type: String,
    select: true // Select: true agar FE bisa langsung baca ini untuk dibikin PDF
  },
  analysis: {
    // FIX: atsScore diubah jadi cvMatchScore
    cvMatchScore: { type: Number, min: 0, max: 100 }, 
    matchStatus: { type: String, enum: ['Low', 'Medium', 'High', 'Excellent'] },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    // FIX: Tambahan field baru untuk menampung saran perbaikan
    improvementAdvice: [{ type: String }], 
    rephraseSuggestions: [{
      original: String,
      improved: String,
      reason: String,
      _id: false
    }],
    jobRecommendations: [{ type: String }]
  }
}, { timestamps: true });

cvAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CvAnalysis', cvAnalysisSchema);