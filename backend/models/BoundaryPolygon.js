const mongoose = require('mongoose');

/**
 * Model untuk menyimpan boundary polygons dengan Level of Detail (LOD)
 * Digunakan untuk visualisasi peta dengan zoom-based rendering
 */
const boundaryPolygonSchema = new mongoose.Schema({
  // Administrative level
  adminLevel: {
    type: String,
    enum: ['provinsi', 'kabupaten', 'kecamatan'],
    required: true,
    index: true
  },

  // Zoom level range untuk menampilkan polygon ini
  zoomMin: {
    type: Number,
    required: true,
    index: true
  },
  zoomMax: {
    type: Number,
    required: true,
    index: true
  },

  // Kode dan nama wilayah
  kodeProvinsi: {
    type: String,
    required: true,
    index: true
  },
  namaProvinsi: {
    type: String,
    required: true,
    index: true
  },

  kodeKabupaten: {
    type: String,
    index: true
  },
  namaKabupaten: {
    type: String,
    index: true
  },

  kodeKecamatan: {
    type: String,
    index: true
  },
  namaKecamatan: {
    type: String,
    index: true
  },

  // Geometry - MultiPolygon untuk boundary
  geometry: {
    type: {
      type: String,
      enum: ['MultiPolygon', 'Polygon'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed, // Flexible untuk Polygon atau MultiPolygon
      required: true
    }
  },

  // Properties tambahan dari BNPB (optional)
  properties: {
    objectid: Number,
    population: Number,
    households: Number,
    area: Number,
    luas_wilayah: Number,
    jumlah_penduduk: Number,
    jumlah_kk: Number,
    kepadatan: Number,
    raw: mongoose.Schema.Types.Mixed
  },

  // Metadata
  source: {
    type: String,
    default: 'BNPB'
  },
  simplificationTolerance: {
    type: Number // Tolerance yang digunakan saat simplify
  }
}, {
  timestamps: true
});

// GeoJSON 2dsphere index untuk spatial queries
boundaryPolygonSchema.index({ geometry: '2dsphere' });

// Compound indexes untuk queries yang sering digunakan
boundaryPolygonSchema.index({ adminLevel: 1, zoomMin: 1, zoomMax: 1 });
boundaryPolygonSchema.index({ adminLevel: 1, kodeProvinsi: 1 });
boundaryPolygonSchema.index({ adminLevel: 1, kodeKabupaten: 1 });

// Static method untuk query berdasarkan zoom level
boundaryPolygonSchema.statics.findByZoomLevel = function(zoomLevel, filters = {}) {
  return this.find({
    zoomMin: { $lte: zoomLevel },
    zoomMax: { $gte: zoomLevel },
    ...filters
  });
};

// Static method untuk query berdasarkan zoom level dan bounds (viewport)
boundaryPolygonSchema.statics.findByZoomAndBounds = function(zoomLevel, bounds) {
  const { west, south, east, north } = bounds;

  return this.find({
    zoomMin: { $lte: zoomLevel },
    zoomMax: { $gte: zoomLevel },
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south]
          ]]
        }
      }
    }
  });
};

// Virtual untuk mendapatkan level name yang user-friendly
boundaryPolygonSchema.virtual('levelName').get(function() {
  const levelNames = {
    'provinsi': 'Provinsi',
    'kabupaten': 'Kabupaten/Kota',
    'kecamatan': 'Kecamatan'
  };
  return levelNames[this.adminLevel] || this.adminLevel;
});

// Ensure virtuals are included in JSON
boundaryPolygonSchema.set('toJSON', { virtuals: true });
boundaryPolygonSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BoundaryPolygon', boundaryPolygonSchema);
