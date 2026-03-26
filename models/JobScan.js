const mongoose = require('mongoose');

const JobScanSchema = new mongoose.Schema({
  // 1. Relasi User (Opsional untuk Guest/Anonymous)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  
  // 2. Data Input & Metadata
  inputType: { 
    type: String, 
    enum: ['text', 'image', 'url'], 
    required: true,
    default: 'text' 
  },
  
  // URL asli jika inputnya berupa link (sangat berguna untuk audit/history)
  url: { 
    type: String, 
    trim: true,
    required: function() { return this.inputType === 'url'; } // Wajib jika type-nya url
  },

  // Teks hasil ekstraksi (Scraping/OCR) atau input manual
  content: { 
    type: String, 
    required: true 
  },

  // Field Statistik (Source)
  source: {
    type: String,
    enum: ['whatsapp', 'telegram', 'instagram', 'facebook', 'linkedin', 'other'],
    default: 'other' 
  },
  
  // 3. Hasil Analisis AI (Struktur Object)
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
  },

  // 4. Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  // Menambahkan timestamps otomatis (updatedAt) jika diperlukan di masa depan
  timestamps: true 
});

// Indexing untuk mempercepat query berdasarkan user atau source di dashboard
JobScanSchema.index({ userId: 1, createdAt: -1 });
JobScanSchema.index({ source: 1 });

module.exports = mongoose.model('JobScan', JobScanSchema);