const express = require('express');
const router = express.Router();
const Region = require('../models/Region');

// GET all regions dengan pagination dan filter
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      provinsi,
      kabupaten,
      kecamatan,
      search
    } = req.query;

    const query = {};

    // Filter by kode wilayah
    if (provinsi) query.kodeProvinsi = provinsi;
    if (kabupaten) query.kodeKabupaten = kabupaten;
    if (kecamatan) query.kodeKecamatan = kecamatan;

    // Search by nama
    if (search) {
      query.$or = [
        { namaDesa: { $regex: search, $options: 'i' } },
        { namaKecamatan: { $regex: search, $options: 'i' } },
        { namaKabupaten: { $regex: search, $options: 'i' } }
      ];
    }

    const regions = await Region.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ namaProvinsi: 1, namaKabupaten: 1, namaKecamatan: 1, namaDesa: 1 });

    const count = await Region.countDocuments(query);

    res.json({
      regions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET provinces (list of unique provinces)
router.get('/provinces', async (req, res) => {
  try {
    const provinces = await Region.distinct('namaProvinsi');
    const provincesWithCode = await Region.aggregate([
      {
        $group: {
          _id: '$kodeProvinsi',
          namaProvinsi: { $first: '$namaProvinsi' },
          kodeProvinsi: { $first: '$kodeProvinsi' }
        }
      },
      { $sort: { namaProvinsi: 1 } }
    ]);

    res.json(provincesWithCode);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET kabupaten by province
router.get('/kabupaten', async (req, res) => {
  try {
    const { provinsi } = req.query;

    if (!provinsi) {
      return res.status(400).json({ message: 'Kode provinsi is required' });
    }

    const kabupaten = await Region.aggregate([
      { $match: { kodeProvinsi: provinsi } },
      {
        $group: {
          _id: '$kodeKabupaten',
          namaKabupaten: { $first: '$namaKabupaten' },
          kodeKabupaten: { $first: '$kodeKabupaten' }
        }
      },
      { $sort: { namaKabupaten: 1 } }
    ]);

    res.json(kabupaten);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET kecamatan by kabupaten
router.get('/kecamatan', async (req, res) => {
  try {
    const { kabupaten } = req.query;

    if (!kabupaten) {
      return res.status(400).json({ message: 'Kode kabupaten is required' });
    }

    const kecamatan = await Region.aggregate([
      { $match: { kodeKabupaten: kabupaten } },
      {
        $group: {
          _id: '$kodeKecamatan',
          namaKecamatan: { $first: '$namaKecamatan' },
          kodeKecamatan: { $first: '$kodeKecamatan' }
        }
      },
      { $sort: { namaKecamatan: 1 } }
    ]);

    res.json(kecamatan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET desa by kecamatan
router.get('/desa', async (req, res) => {
  try {
    const { kecamatan } = req.query;

    if (!kecamatan) {
      return res.status(400).json({ message: 'Kode kecamatan is required' });
    }

    const desa = await Region.find({ kodeKecamatan: kecamatan })
      .sort({ namaDesa: 1 });

    res.json(desa);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET regions as GeoJSON (for map rendering)
// IMPORTANT: This must be before /:kodeDesa route!
router.get('/geojson', async (req, res) => {
  try {
    const {
      provinsi,
      kabupaten,
      kecamatan,
      limit = 100 // Default limit 100 to prevent huge responses
    } = req.query;

    const query = {
      boundary: { $exists: true, $ne: null } // Only regions with boundaries
    };

    // Filter by kode wilayah
    if (provinsi) query.kodeProvinsi = provinsi;
    if (kabupaten) query.kodeKabupaten = kabupaten;
    if (kecamatan) query.kodeKecamatan = kecamatan;

    // Fetch regions with limit
    const regions = await Region.find(query)
      .select('kodeKecamatan namaKecamatan kodeKabupaten namaKabupaten kodeProvinsi namaProvinsi boundary bnpbProperties')
      .limit(parseInt(limit))
      .lean();

    console.log(`📊 Returning ${regions.length} regions as GeoJSON`);

    // Convert to GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features: regions.map(region => ({
        type: 'Feature',
        geometry: region.boundary,
        properties: {
          kodeKecamatan: region.kodeKecamatan,
          namaKecamatan: region.namaKecamatan,
          kodeKabupaten: region.kodeKabupaten,
          namaKabupaten: region.namaKabupaten,
          kodeProvinsi: region.kodeProvinsi,
          namaProvinsi: region.namaProvinsi,
          population: region.bnpbProperties?.population,
          households: region.bnpbProperties?.households
        }
      }))
    };

    res.json(geojson);
  } catch (error) {
    console.error('❌ GeoJSON error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// GET single region by kode desa
router.get('/:kodeDesa', async (req, res) => {
  try {
    const region = await Region.findOne({ kodeDesa: req.params.kodeDesa });
    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }
    res.json(region);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET nearby regions (geospatial query)
router.get('/nearby/search', async (req, res) => {
  try {
    const { lng, lat, maxDistance = 50000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }

    const regions = await Region.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).limit(20);

    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new region
router.post('/', async (req, res) => {
  try {
    const region = new Region(req.body);
    const savedRegion = await region.save();
    res.status(201).json(savedRegion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update region
router.put('/:kodeDesa', async (req, res) => {
  try {
    const region = await Region.findOneAndUpdate(
      { kodeDesa: req.params.kodeDesa },
      req.body,
      { new: true, runValidators: true }
    );

    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }

    res.json(region);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE region
router.delete('/:kodeDesa', async (req, res) => {
  try {
    const region = await Region.findOneAndDelete({ kodeDesa: req.params.kodeDesa });
    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }
    res.json({ message: 'Region deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
