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
  cvText: {
    type: String,
    required: true,
    select: false // Sembunyikan teks CV mentah agar response API tidak terlalu berat
  },
  analysis: {
    atsScore: { type: Number, min: 0, max: 100 },
    matchStatus: { type: String, enum: ['Low', 'Medium', 'High', 'Excellent'] },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    rephraseSuggestions: [{
      original: String,
      improved: String,
      reason: String,
      _id: false
    }]
  }
}, { timestamps: true });

cvAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CvAnalysis', cvAnalysisSchema);