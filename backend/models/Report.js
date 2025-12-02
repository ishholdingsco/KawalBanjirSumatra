const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // Timestamp kejadian banjir
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Lokasi (GeoJSON format untuk Mapbox)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  },

  // Nama lokasi (untuk display)
  locationName: {
    type: String,
    required: true
  },

  // Deskripsi kondisi banjir
  description: {
    type: String,
    required: true
  },

  // URL gambar/media (array of URLs dari internet)
  imageUrls: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Image URL must be a valid HTTP/HTTPS URL'
    }
  }],

  // Kontak/sumber informasi
  contactSource: {
    type: String,
    required: true
  },

  // Kategori bencana
  category: {
    type: String,
    enum: ['banjir', 'banjir-bandang', 'longsor', 'lainnya'],
    default: 'banjir'
  },

  // Tingkat keparahan
  severity: {
    type: String,
    enum: ['ringan', 'sedang', 'berat', 'sangat-berat'],
    required: true
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt
});

// Create 2dsphere index for geospatial queries
reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);
