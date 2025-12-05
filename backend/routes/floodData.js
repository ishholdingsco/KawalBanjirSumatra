const express = require('express');
const router = express.Router();
const FloodData = require('../models/FloodData');
const Region = require('../models/Region');

// GET all flood data dengan pagination dan filter
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      provinsi,
      kabupaten,
      kecamatan,
      status,
      sumberData,
      sortBy = 'tanggalUpdate',
      order = 'desc'
    } = req.query;

    const query = {};

    // Filter by wilayah
    if (provinsi) query.kodeProvinsi = provinsi;
    if (kabupaten) query.kodeKabupaten = kabupaten;
    if (kecamatan) query.kodeKecamatan = kecamatan;

    // Filter by status dan sumber
    if (status) query.statusBanjir = status;
    if (sumberData) query.sumberData = sumberData;

    // Build sort object
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    const floodData = await FloodData.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortObj);

    const count = await FloodData.countDocuments(query);

    res.json({
      data: floodData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET flood data by kode desa
router.get('/desa/:kodeDesa', async (req, res) => {
  try {
    const floodData = await FloodData.findOne({
      kodeDesa: req.params.kodeDesa
    }).sort({ tanggalUpdate: -1 });

    if (!floodData) {
      return res.status(404).json({ message: 'Flood data not found for this desa' });
    }

    res.json(floodData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all flood data by kode kabupaten
router.get('/kabupaten/:kodeKabupaten', async (req, res) => {
  try {
    const floodData = await FloodData.find({
      kodeKabupaten: req.params.kodeKabupaten
    }).sort({ tanggalUpdate: -1 });

    res.json(floodData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all flood data by kode provinsi
router.get('/provinsi/:kodeProvinsi', async (req, res) => {
  try {
    const floodData = await FloodData.find({
      kodeProvinsi: req.params.kodeProvinsi
    }).sort({ tanggalUpdate: -1 });

    res.json(floodData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET active flood areas (status: aktif)
router.get('/active', async (req, res) => {
  try {
    const { provinsi } = req.query;
    const query = { statusBanjir: 'aktif' };

    if (provinsi) query.kodeProvinsi = provinsi;

    const activeFloods = await FloodData.find(query)
      .sort({ tinggiAir: -1, tanggalUpdate: -1 });

    res.json(activeFloods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET flood data nearby location (geospatial)
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, maxDistance = 50000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }

    const floodData = await FloodData.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).sort({ tanggalUpdate: -1 }).limit(20);

    res.json(floodData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET summary statistics for specific region
router.get('/summary/:kodeWilayah', async (req, res) => {
  try {
    const { kodeWilayah } = req.params;
    const { level = 'kabupaten' } = req.query;

    let matchField;
    if (level === 'provinsi') matchField = 'kodeProvinsi';
    else if (level === 'kabupaten') matchField = 'kodeKabupaten';
    else if (level === 'kecamatan') matchField = 'kodeKecamatan';
    else return res.status(400).json({ message: 'Invalid level parameter' });

    const summary = await FloodData.aggregate([
      { $match: { [matchField]: kodeWilayah } },
      {
        $group: {
          _id: null,
          totalPendidikanRusak: { $sum: '$pendidikanRusak' },
          totalFasyankesRusak: { $sum: '$fasyankesRusak' },
          totalRumahIbadatRusak: { $sum: '$rumahIbadatRusak' },
          totalJembatanRusak: { $sum: '$jembatanRusak' },
          totalRumahRusakBerat: { $sum: '$rumahRusakBerat' },
          totalRumahRusakSedang: { $sum: '$rumahRusakSedang' },
          totalRumahRusakRingan: { $sum: '$rumahRusakRingan' },
          totalKorbanMeninggal: { $sum: '$korbanMeninggal' },
          totalKorbanHilang: { $sum: '$korbanHilang' },
          totalPengungsi: { $sum: '$pengungsi' },
          jumlahWilayahTerdampak: { $sum: 1 },
          wilayahAktif: {
            $sum: { $cond: [{ $eq: ['$statusBanjir', 'aktif'] }, 1, 0] }
          }
        }
      }
    ]);

    if (summary.length === 0) {
      return res.status(404).json({ message: 'No flood data found for this region' });
    }

    res.json(summary[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new flood data
router.post('/', async (req, res) => {
  try {
    const floodData = new FloodData(req.body);

    // Auto-populate location from Region if not provided
    if (!floodData.location || !floodData.location.coordinates) {
      const region = await Region.findOne({ kodeDesa: floodData.kodeDesa });
      if (region && region.location && region.location.coordinates) {
        floodData.location = region.location;
      }
    }

    const savedFloodData = await floodData.save();
    res.status(201).json(savedFloodData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update flood data by ID
router.put('/:id', async (req, res) => {
  try {
    req.body.tanggalUpdate = Date.now();

    const floodData = await FloodData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!floodData) {
      return res.status(404).json({ message: 'Flood data not found' });
    }

    res.json(floodData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH update status banjir
router.patch('/:id/status', async (req, res) => {
  try {
    const { statusBanjir, tinggiAir } = req.body;

    if (!statusBanjir) {
      return res.status(400).json({ message: 'statusBanjir is required' });
    }

    const updateData = {
      statusBanjir,
      tanggalUpdate: Date.now()
    };

    if (tinggiAir !== undefined) {
      updateData.tinggiAir = tinggiAir;
    }

    const floodData = await FloodData.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!floodData) {
      return res.status(404).json({ message: 'Flood data not found' });
    }

    res.json(floodData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE flood data
router.delete('/:id', async (req, res) => {
  try {
    const floodData = await FloodData.findByIdAndDelete(req.params.id);
    if (!floodData) {
      return res.status(404).json({ message: 'Flood data not found' });
    }
    res.json({ message: 'Flood data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
