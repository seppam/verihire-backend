const mongoose = require('mongoose');

const JobScanSchema = new mongoose.Schema({
  // 1. Relasi User (Opsional untuk Guest/Anonymous)
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
    // required dihapus agar guest bisa masuk tanpa diusir
  },
  
  // 2. Data Input & Metadata
  inputType: { 
    type: String, 
    enum: ['text', 'image', 'url', 'document_or_image'],
    required: true,
    default: 'text' 
  },
  
  url: { 
    type: String, 
    trim: true,
    required: function() { return this.inputType === 'url'; } 
  },

  content: { 
    type: String, 
    required: true 
  },

  source: {
    type: String,
    enum: ['whatsapp', 'telegram', 'instagram', 'facebook', 'linkedin', 'other'],
    default: 'other' 
  },
  
  // 3. Hasil Analisis AI
  analysis: {
    score: { 
      type: Number, 
      min: 0, 
      max: 100 
    },
    verdict: { 
      type: String,
      trim: true 
    },
    flags: [{ 
      type: String 
    }],
    recommendation: { 
      type: String 
    }
  }
}, {
  // Mongoose akan otomatis membuat field createdAt dan updatedAt
  timestamps: true 
});

// 4. Indexing (BUG FIXED: Diubah dari userId menjadi user)
JobScanSchema.index({ user: 1, createdAt: -1 });
JobScanSchema.index({ source: 1 });

module.exports = mongoose.model('JobScan', JobScanSchema);