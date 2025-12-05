const mongoose = require('mongoose');

const floodDataSchema = new mongoose.Schema({
  // Referensi ke wilayah
  kodeDesa: {
    type: String,
    required: true,
    index: true
  },
  kodeKecamatan: {
    type: String,
    required: true,
    index: true
  },
  kodeKabupaten: {
    type: String,
    required: true,
    index: true
  },
  kodeProvinsi: {
    type: String,
    required: true,
    index: true
  },

  // Nama wilayah (denormalized untuk performa)
  namaWilayah: {
    type: String,
    required: true
  },

  // Data kerusakan infrastruktur
  pendidikanRusak: {
    type: Number,
    default: 0,
    min: 0
  },
  fasyankesRusak: {
    type: Number,
    default: 0,
    min: 0
  },
  rumahIbadatRusak: {
    type: Number,
    default: 0,
    min: 0
  },
  jembatanRusak: {
    type: Number,
    default: 0,
    min: 0
  },

  // Data kerusakan rumah
  rumahRusakBerat: {
    type: Number,
    default: 0,
    min: 0
  },
  rumahRusakSedang: {
    type: Number,
    default: 0,
    min: 0
  },
  rumahRusakRingan: {
    type: Number,
    default: 0,
    min: 0
  },

  // Data korban
  korbanMeninggal: {
    type: Number,
    default: 0,
    min: 0
  },
  korbanHilang: {
    type: Number,
    default: 0,
    min: 0
  },
  korbanLukaBerat: {
    type: Number,
    default: 0,
    min: 0
  },
  korbanLukaRingan: {
    type: Number,
    default: 0,
    min: 0
  },
  pengungsi: {
    type: Number,
    default: 0,
    min: 0
  },

  // Informasi tambahan
  deskripsi: {
    type: String,
    default: ''
  },

  // Status banjir
  statusBanjir: {
    type: String,
    enum: ['aktif', 'surut', 'normal'],
    default: 'normal'
  },

  // Tinggi air (dalam cm)
  tinggiAir: {
    type: Number,
    default: 0,
    min: 0
  },

  // Lokasi geografis (untuk mapping) - Optional
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },

  // Metadata
  tanggalKejadian: {
    type: Date,
    default: Date.now
  },
  tanggalUpdate: {
    type: Date,
    default: Date.now
  },
  sumberData: {
    type: String,
    enum: ['BNPB', 'Manual', 'Scraping', 'API'],
    default: 'Manual'
  },

  // Flag untuk verifikasi data
  terverifikasi: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
floodDataSchema.index({ location: '2dsphere' });

// Compound indexes untuk query yang efisien
floodDataSchema.index({ kodeProvinsi: 1, kodeKabupaten: 1, statusBanjir: 1 });
floodDataSchema.index({ kodeProvinsi: 1, tanggalKejadian: -1 });
floodDataSchema.index({ statusBanjir: 1, tanggalUpdate: -1 });

// Virtual untuk total kerusakan rumah
floodDataSchema.virtual('totalRumahRusak').get(function() {
  return this.rumahRusakBerat + this.rumahRusakSedang + this.rumahRusakRingan;
});

// Virtual untuk total korban
floodDataSchema.virtual('totalKorban').get(function() {
  return this.korbanMeninggal + this.korbanHilang + this.korbanLukaBerat + this.korbanLukaRingan;
});

// Ensure virtuals are included in JSON
floodDataSchema.set('toJSON', { virtuals: true });
floodDataSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FloodData', floodDataSchema);
