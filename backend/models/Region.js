const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema({
  // Kode wilayah (format Kemendagri)
  kodeDesa: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  namaDesa: {
    type: String,
    required: true
  },

  kodeKecamatan: {
    type: String,
    required: true,
    index: true
  },
  namaKecamatan: {
    type: String,
    required: true
  },

  kodeKabupaten: {
    type: String,
    required: true,
    index: true
  },
  namaKabupaten: {
    type: String,
    required: true
  },

  kodeProvinsi: {
    type: String,
    required: true,
    index: true
  },
  namaProvinsi: {
    type: String,
    required: true
  },

  // Tipe desa
  tipeDesa: {
    type: String,
    enum: ['KELURAHAN', 'DESA', 'DESA ADAT'],
    required: true
  },

  // Lokasi geografis (GeoJSON format untuk Mapbox) - Optional
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },

  // Batas wilayah (boundary polygon dari BNPB) - Optional, untuk kecamatan level
  boundary: {
    type: {
      type: String,
      enum: ['MultiPolygon']
    },
    coordinates: {
      type: [[[[Number]]]] // Array of polygons
    }
  },

  // Properties tambahan dari BNPB GeoJSON
  bnpbProperties: {
    objectid: Number,
    population: Number,
    households: Number,
    area: Number,
    raw: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Create 2dsphere indexes for geospatial queries
regionSchema.index({ location: '2dsphere' });
regionSchema.index({ boundary: '2dsphere' });

// Compound indexes untuk query yang sering digunakan
regionSchema.index({ kodeProvinsi: 1, kodeKabupaten: 1 });
regionSchema.index({ kodeProvinsi: 1, kodeKabupaten: 1, kodeKecamatan: 1 });

module.exports = mongoose.model('Region', regionSchema);
