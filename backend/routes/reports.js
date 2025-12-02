const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// GET all reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET reports by location (nearby search)
// Query params: lng, lat, maxDistance (in meters, default 50000 = 50km)
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, maxDistance = 50000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).sort({ timestamp: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new report
router.post('/', async (req, res) => {
  try {
    const {
      timestamp,
      location,
      locationName,
      description,
      imageUrls,
      contactSource,
      category,
      severity
    } = req.body;

    // Validate required fields
    if (!location || !location.coordinates || !locationName || !description || !contactSource || !severity) {
      return res.status(400).json({
        message: 'Missing required fields: location, locationName, description, contactSource, severity'
      });
    }

    const report = new Report({
      timestamp: timestamp || Date.now(),
      location,
      locationName,
      description,
      imageUrls: imageUrls || [],
      contactSource,
      category: category || 'banjir',
      severity
    });

    const savedReport = await report.save();
    res.status(201).json(savedReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update report
router.put('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE report
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const bySeverity = await Report.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const byCategory = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalReports,
      bySeverity,
      byCategory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
