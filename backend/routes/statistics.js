const express = require('express');
const router = express.Router();
const Statistics = require('../models/Statistics');
const FloodData = require('../models/FloodData');
const { syncBNPBData } = require('../scheduler/bnpbSync');

// GET all statistics dengan filter
router.get('/', async (req, res) => {
  try {
    const {
      level,
      region,
      kodeWilayah,
      sortBy = 'tanggalUpdate',
      order = 'desc'
    } = req.query;

    const query = {};

    if (level) query.level = level;
    if (region) query.region = region;
    if (kodeWilayah) query.kodeWilayah = kodeWilayah;

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    const statistics = await Statistics.find(query).sort(sortObj);

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET latest statistics for Sumatra (regional)
// IMPORTANT: This must be BEFORE /:level/:kodeWilayah route
router.get('/latest/sumatra', async (req, res) => {
  try {
    const statistics = await Statistics.findOne({
      region: 'sumatera',
      level: 'regional'
    }).sort({ tanggalUpdate: -1 });

    if (!statistics) {
      return res.status(404).json({ message: 'Sumatra statistics not found' });
    }

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET statistics by level and kode wilayah
router.get('/:level/:kodeWilayah', async (req, res) => {
  try {
    const { level, kodeWilayah } = req.params;

    const statistics = await Statistics.findOne({
      level,
      kodeWilayah
    }).sort({ tanggalUpdate: -1 });

    if (!statistics) {
      return res.status(404).json({ message: 'Statistics not found' });
    }

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET statistics by province
router.get('/provinsi/:kodeProvinsi', async (req, res) => {
  try {
    const statistics = await Statistics.findOne({
      level: 'provinsi',
      kodeWilayah: req.params.kodeProvinsi
    }).sort({ tanggalUpdate: -1 });

    if (!statistics) {
      return res.status(404).json({ message: 'Province statistics not found' });
    }

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all provinces statistics in Sumatra
router.get('/provinsi/all/sumatra', async (req, res) => {
  try {
    const statistics = await Statistics.find({
      region: 'sumatera',
      level: 'provinsi'
    }).sort({ tanggalUpdate: -1 });

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET comparison statistics (top affected regions)
router.get('/comparison/top', async (req, res) => {
  try {
    const {
      level = 'kabupaten',
      sortBy = 'totalRumahRusakBerat',
      limit = 10
    } = req.query;

    const statistics = await Statistics.find({ level })
      .sort({ [sortBy]: -1 })
      .limit(parseInt(limit));

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST calculate and create statistics for a region
router.post('/calculate', async (req, res) => {
  try {
    const { level, kodeWilayah, region, namaWilayah } = req.body;

    if (!level || !kodeWilayah) {
      return res.status(400).json({
        message: 'level and kodeWilayah are required'
      });
    }

    // Determine which field to match based on level
    let matchField;
    if (level === 'provinsi') matchField = 'kodeProvinsi';
    else if (level === 'kabupaten') matchField = 'kodeKabupaten';
    else if (level === 'kecamatan') matchField = 'kodeKecamatan';
    else if (level === 'regional' || level === 'nasional') matchField = 'kodeProvinsi';
    else return res.status(400).json({ message: 'Invalid level parameter' });

    // Build query for regional level (multiple provinces)
    let matchQuery;
    if (level === 'regional' && Array.isArray(kodeWilayah)) {
      matchQuery = { [matchField]: { $in: kodeWilayah } };
    } else if (level === 'regional') {
      matchQuery = {}; // All data
    } else {
      matchQuery = { [matchField]: kodeWilayah };
    }

    // Calculate statistics from FloodData
    const aggregation = await FloodData.aggregate([
      { $match: matchQuery },
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
          totalKorbanLukaBerat: { $sum: '$korbanLukaBerat' },
          totalKorbanLukaRingan: { $sum: '$korbanLukaRingan' },
          totalPengungsi: { $sum: '$pengungsi' },
          jumlahDesaTerdampak: { $sum: 1 },
          earliestDate: { $min: '$tanggalKejadian' },
          latestDate: { $max: '$tanggalUpdate' }
        }
      }
    ]);

    if (aggregation.length === 0) {
      return res.status(404).json({ message: 'No flood data found for calculation' });
    }

    const calculated = aggregation[0];

    // Count unique kecamatan and kabupaten
    const uniqueKecamatan = await FloodData.distinct('kodeKecamatan', matchQuery);
    const uniqueKabupaten = await FloodData.distinct('kodeKabupaten', matchQuery);

    // Determine status based on active floods
    const activeFloods = await FloodData.countDocuments({
      ...matchQuery,
      statusBanjir: 'aktif'
    });

    let statusTerkini = 'normal';
    if (activeFloods > 10) statusTerkini = 'darurat';
    else if (activeFloods > 5) statusTerkini = 'siaga';
    else if (activeFloods > 0) statusTerkini = 'waspada';

    // Create or update statistics
    const statisticsData = {
      region: region || 'sumatera',
      level,
      kodeWilayah: Array.isArray(kodeWilayah) ? kodeWilayah.join(',') : kodeWilayah,
      namaWilayah: namaWilayah || 'Unknown',
      totalPendidikanRusak: calculated.totalPendidikanRusak,
      totalFasyankesRusak: calculated.totalFasyankesRusak,
      totalRumahIbadatRusak: calculated.totalRumahIbadatRusak,
      totalJembatanRusak: calculated.totalJembatanRusak,
      totalRumahRusakBerat: calculated.totalRumahRusakBerat,
      totalRumahRusakSedang: calculated.totalRumahRusakSedang,
      totalRumahRusakRingan: calculated.totalRumahRusakRingan,
      totalKorbanMeninggal: calculated.totalKorbanMeninggal,
      totalKorbanHilang: calculated.totalKorbanHilang,
      totalKorbanLukaBerat: calculated.totalKorbanLukaBerat,
      totalKorbanLukaRingan: calculated.totalKorbanLukaRingan,
      totalPengungsi: calculated.totalPengungsi,
      jumlahDesaTerdampak: calculated.jumlahDesaTerdampak,
      jumlahKecamatanTerdampak: uniqueKecamatan.length,
      jumlahKabupatenTerdampak: uniqueKabupaten.length,
      statusTerkini,
      periodeData: {
        dari: calculated.earliestDate,
        hingga: calculated.latestDate
      },
      tanggalUpdate: Date.now(),
      lastSync: Date.now(),
      sumberData: 'Calculated from FloodData'
    };

    const statistics = await Statistics.findOneAndUpdate(
      { level, kodeWilayah: statisticsData.kodeWilayah },
      statisticsData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(statistics);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST bulk calculate statistics for all regions at a level
router.post('/calculate/bulk', async (req, res) => {
  try {
    const { level } = req.body;

    if (!level || !['provinsi', 'kabupaten', 'kecamatan'].includes(level)) {
      return res.status(400).json({
        message: 'Valid level (provinsi, kabupaten, kecamatan) is required'
      });
    }

    // Get all unique codes for the specified level
    let fieldName;
    let nameField;
    if (level === 'provinsi') {
      fieldName = 'kodeProvinsi';
      nameField = 'namaProvinsi';
    } else if (level === 'kabupaten') {
      fieldName = 'kodeKabupaten';
      nameField = 'namaKabupaten';
    } else {
      fieldName = 'kodeKecamatan';
      nameField = 'namaKecamatan';
    }

    const regions = await FloodData.aggregate([
      {
        $group: {
          _id: `$${fieldName}`,
          nama: { $first: `$${nameField}` }
        }
      }
    ]);

    const results = [];

    // Calculate statistics for each region
    for (const region of regions) {
      try {
        const calculated = await calculateRegionStatistics(level, region._id);
        results.push({
          kodeWilayah: region._id,
          namaWilayah: region.nama,
          success: true,
          data: calculated
        });
      } catch (error) {
        results.push({
          kodeWilayah: region._id,
          namaWilayah: region.nama,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: `Bulk calculation completed for ${level}`,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to calculate statistics
async function calculateRegionStatistics(level, kodeWilayah) {
  let matchField;
  if (level === 'provinsi') matchField = 'kodeProvinsi';
  else if (level === 'kabupaten') matchField = 'kodeKabupaten';
  else if (level === 'kecamatan') matchField = 'kodeKecamatan';

  const aggregation = await FloodData.aggregate([
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
        totalKorbanLukaBerat: { $sum: '$korbanLukaBerat' },
        totalKorbanLukaRingan: { $sum: '$korbanLukaRingan' },
        totalPengungsi: { $sum: '$pengungsi' },
        namaWilayah: { $first: `$nama${level.charAt(0).toUpperCase() + level.slice(1)}` },
        earliestDate: { $min: '$tanggalKejadian' },
        latestDate: { $max: '$tanggalUpdate' }
      }
    }
  ]);

  if (aggregation.length === 0) return null;

  const calculated = aggregation[0];
  const activeFloods = await FloodData.countDocuments({
    [matchField]: kodeWilayah,
    statusBanjir: 'aktif'
  });

  let statusTerkini = 'normal';
  if (activeFloods > 10) statusTerkini = 'darurat';
  else if (activeFloods > 5) statusTerkini = 'siaga';
  else if (activeFloods > 0) statusTerkini = 'waspada';

  const statisticsData = {
    region: 'sumatera',
    level,
    kodeWilayah,
    namaWilayah: calculated.namaWilayah || 'Unknown',
    ...calculated,
    statusTerkini,
    periodeData: {
      dari: calculated.earliestDate,
      hingga: calculated.latestDate
    },
    tanggalUpdate: Date.now(),
    lastSync: Date.now()
  };

  return await Statistics.findOneAndUpdate(
    { level, kodeWilayah },
    statisticsData,
    { upsert: true, new: true }
  );
}

// POST manual sync BNPB data
router.post('/sync/bnpb', async (req, res) => {
  try {
    console.log('🔄 Manual BNPB sync triggered via API');
    await syncBNPBData();

    const statistics = await Statistics.findOne({
      level: 'regional',
      kodeWilayah: 'SUMATERA'
    }).sort({ tanggalUpdate: -1 });

    res.json({
      message: 'BNPB data synced successfully',
      statistics
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE statistics
router.delete('/:id', async (req, res) => {
  try {
    const statistics = await Statistics.findByIdAndDelete(req.params.id);
    if (!statistics) {
      return res.status(404).json({ message: 'Statistics not found' });
    }
    res.json({ message: 'Statistics deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
