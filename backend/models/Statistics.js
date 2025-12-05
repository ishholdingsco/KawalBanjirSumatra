const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
  // Identifikasi wilayah
  region: {
    type: String,
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['nasional', 'regional', 'provinsi', 'kabupaten', 'kecamatan'],
    required: true,
    index: true
  },
  kodeWilayah: {
    type: String,
    required: true,
    index: true
  },
  namaWilayah: {
    type: String,
    required: true
  },

  // Statistik kerusakan infrastruktur
  totalPendidikanRusak: {
    type: Number,
    default: 0,
    min: 0
  },
  totalFasyankesRusak: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRumahIbadatRusak: {
    type: Number,
    default: 0,
    min: 0
  },
  totalJembatanRusak: {
    type: Number,
    default: 0,
    min: 0
  },

  // Statistik kerusakan rumah
  totalRumahRusakBerat: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRumahRusakSedang: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRumahRusakRingan: {
    type: Number,
    default: 0,
    min: 0
  },

  // Statistik korban
  totalKorbanMeninggal: {
    type: Number,
    default: 0,
    min: 0
  },
  totalKorbanHilang: {
    type: Number,
    default: 0,
    min: 0
  },
  totalKorbanLukaBerat: {
    type: Number,
    default: 0,
    min: 0
  },
  totalKorbanLukaRingan: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPengungsi: {
    type: Number,
    default: 0,
    min: 0
  },

  // Statistik wilayah terdampak
  jumlahDesaTerdampak: {
    type: Number,
    default: 0,
    min: 0
  },
  jumlahKecamatanTerdampak: {
    type: Number,
    default: 0,
    min: 0
  },
  jumlahKabupatenTerdampak: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status
  statusTerkini: {
    type: String,
    enum: ['darurat', 'siaga', 'waspada', 'normal'],
    default: 'normal'
  },

  // Metadata
  periodeData: {
    dari: {
      type: Date,
      required: true
    },
    hingga: {
      type: Date,
      required: true
    }
  },
  tanggalUpdate: {
    type: Date,
    default: Date.now
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  sumberData: {
    type: String,
    default: 'BNPB'
  }
}, {
  timestamps: true
});

// Compound indexes
statisticsSchema.index({ level: 1, kodeWilayah: 1, tanggalUpdate: -1 });
statisticsSchema.index({ region: 1, level: 1 });
statisticsSchema.index({ statusTerkini: 1, tanggalUpdate: -1 });

// Virtual untuk total rumah rusak
statisticsSchema.virtual('totalRumahRusak').get(function() {
  return this.totalRumahRusakBerat + this.totalRumahRusakSedang + this.totalRumahRusakRingan;
});

// Virtual untuk total korban
statisticsSchema.virtual('totalKorban').get(function() {
  return this.totalKorbanMeninggal + this.totalKorbanHilang +
         this.totalKorbanLukaBerat + this.totalKorbanLukaRingan;
});

// Virtual untuk total infrastruktur rusak
statisticsSchema.virtual('totalInfrastrukturRusak').get(function() {
  return this.totalPendidikanRusak + this.totalFasyankesRusak +
         this.totalRumahIbadatRusak + this.totalJembatanRusak;
});

// Ensure virtuals are included in JSON
statisticsSchema.set('toJSON', { virtuals: true });
statisticsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Statistics', statisticsSchema);
