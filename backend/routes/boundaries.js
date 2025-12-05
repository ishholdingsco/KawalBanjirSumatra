const express = require('express');
const router = express.Router();
const BoundaryPolygon = require('../models/BoundaryPolygon');

/**
 * GET /api/boundaries
 * Get boundary polygons based on zoom level
 *
 * Query params:
 * - zoom: number (required) - Current map zoom level
 * - bounds: object (optional) - Map viewport bounds {west, south, east, north}
 * - provinsi: string (optional) - Filter by province code
 * - kabupaten: string (optional) - Filter by kabupaten code
 */
router.get('/', async (req, res) => {
  try {
    const { zoom, bounds, provinsi, kabupaten } = req.query;

    // Validate zoom parameter
    if (!zoom) {
      return res.status(400).json({
        success: false,
        message: 'Zoom level is required'
      });
    }

    const zoomLevel = parseInt(zoom);

    if (isNaN(zoomLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zoom level'
      });
    }

    // Build query filters
    const filters = {};

    // Add province filter
    if (provinsi) {
      filters.kodeProvinsi = provinsi;
    }

    // Add kabupaten filter
    if (kabupaten) {
      filters.kodeKabupaten = kabupaten;
    }

    let boundaries;

    // Query with or without bounds
    if (bounds) {
      try {
        const { west, south, east, north } = JSON.parse(bounds);

        boundaries = await BoundaryPolygon.find({
          zoomMin: { $lte: zoomLevel },
          zoomMax: { $gte: zoomLevel },
          ...filters,
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
        })
        .select('-__v -createdAt -updatedAt')
        .lean();

      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bounds parameter'
        });
      }
    } else {
      // Query without bounds (get all for zoom level)
      boundaries = await BoundaryPolygon.findByZoomLevel(zoomLevel, filters)
        .select('-__v -createdAt -updatedAt')
        .lean();
    }

    // Transform to GeoJSON FeatureCollection format
    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        zoom: zoomLevel,
        count: boundaries.length,
        adminLevel: boundaries[0]?.adminLevel || null,
        timestamp: new Date().toISOString()
      },
      features: boundaries.map(boundary => ({
        type: 'Feature',
        id: boundary._id,
        properties: {
          adminLevel: boundary.adminLevel,
          kodeProvinsi: boundary.kodeProvinsi,
          namaProvinsi: boundary.namaProvinsi,
          kodeKabupaten: boundary.kodeKabupaten,
          namaKabupaten: boundary.namaKabupaten,
          kodeKecamatan: boundary.kodeKecamatan,
          namaKecamatan: boundary.namaKecamatan,
          zoomMin: boundary.zoomMin,
          zoomMax: boundary.zoomMax,
          ...boundary.properties
        },
        geometry: boundary.geometry
      }))
    };

    res.json({
      success: true,
      data: geojson
    });

  } catch (error) {
    console.error('Error fetching boundaries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/boundaries/stats
 * Get statistics about boundary data
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await BoundaryPolygon.aggregate([
      {
        $group: {
          _id: '$adminLevel',
          count: { $sum: 1 },
          zoomMin: { $first: '$zoomMin' },
          zoomMax: { $first: '$zoomMax' }
        }
      },
      {
        $sort: { zoomMin: 1 }
      }
    ]);

    const totalCount = await BoundaryPolygon.countDocuments();

    res.json({
      success: true,
      data: {
        total: totalCount,
        byLevel: stats
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/boundaries/:id
 * Get single boundary by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const boundary = await BoundaryPolygon.findById(req.params.id)
      .select('-__v')
      .lean();

    if (!boundary) {
      return res.status(404).json({
        success: false,
        message: 'Boundary not found'
      });
    }

    // Transform to GeoJSON Feature
    const feature = {
      type: 'Feature',
      id: boundary._id,
      properties: {
        adminLevel: boundary.adminLevel,
        kodeProvinsi: boundary.kodeProvinsi,
        namaProvinsi: boundary.namaProvinsi,
        kodeKabupaten: boundary.kodeKabupaten,
        namaKabupaten: boundary.namaKabupaten,
        kodeKecamatan: boundary.kodeKecamatan,
        namaKecamatan: boundary.namaKecamatan,
        zoomMin: boundary.zoomMin,
        zoomMax: boundary.zoomMax,
        ...boundary.properties
      },
      geometry: boundary.geometry
    };

    res.json({
      success: true,
      data: feature
    });

  } catch (error) {
    console.error('Error fetching boundary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
