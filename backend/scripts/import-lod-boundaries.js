const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const BoundaryPolygon = require('../models/BoundaryPolygon');

dotenv.config();

// LOD files configuration
const LOD_FILES = [
  {
    file: '../../bnpb_level1_provinsi.geojson',
    adminLevel: 'provinsi',
    zoomMin: 4,
    zoomMax: 7,
    tolerance: 0.01
  },
  {
    file: '../../bnpb_level2_kabupaten.geojson',
    adminLevel: 'kabupaten',
    zoomMin: 7,
    zoomMax: 9,
    tolerance: 0.005
  },
  {
    file: '../../bnpb_level3_kecamatan.geojson',
    adminLevel: 'kecamatan',
    zoomMin: 9,
    zoomMax: 22,
    tolerance: 0.0005
  }
];

async function importLODBoundaries() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kawal-banjir');
    console.log('✅ Connected to MongoDB\n');

    // Clear existing boundary polygons
    console.log('🗑️  Clearing existing boundary polygons...');
    const deleteResult = await BoundaryPolygon.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing boundaries\n`);

    let totalImported = 0;

    // Import each LOD level
    for (const config of LOD_FILES) {
      console.log('='.repeat(70));
      console.log(`📂 Importing ${config.adminLevel.toUpperCase()} (Zoom ${config.zoomMin}-${config.zoomMax})`);
      console.log('='.repeat(70));

      const filePath = path.join(__dirname, config.file);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        continue;
      }

      // Read and parse GeoJSON
      console.log(`📖 Reading ${path.basename(config.file)}...`);
      const geojsonData = fs.readFileSync(filePath, 'utf8');
      const geojson = JSON.parse(geojsonData);

      if (!geojson.features || !Array.isArray(geojson.features)) {
        console.error('❌ Invalid GeoJSON format');
        continue;
      }

      console.log(`✅ Found ${geojson.features.length} features`);
      console.log(`🔄 Importing to database...\n`);

      let imported = 0;
      let errors = 0;

      // Process each feature
      for (let i = 0; i < geojson.features.length; i++) {
        const feature = geojson.features[i];
        const props = feature.properties;

        try {
          // Prepare boundary document
          const boundaryData = {
            adminLevel: config.adminLevel,
            zoomMin: config.zoomMin,
            zoomMax: config.zoomMax,
            simplificationTolerance: config.tolerance,

            // Required fields
            kodeProvinsi: String(props.kode_provinsi || props.kode_prop_ || ''),
            namaProvinsi: props.nama_provinsi || props.nama_prop || '',

            // Optional fields depending on level
            kodeKabupaten: props.kode_kabupaten ? String(props.kode_kabupaten) : undefined,
            namaKabupaten: props.nama_kabupaten || props.nama_kab || undefined,

            kodeKecamatan: props.kode_kecamatan ? String(props.kode_kecamatan) : undefined,
            namaKecamatan: props.nama_kecamatan || props.nama_kec || undefined,

            // Geometry
            geometry: {
              type: feature.geometry.type,
              coordinates: feature.geometry.coordinates
            },

            // Properties
            properties: {
              objectid: props.objectid,
              population: props.jumlah_pen || props.population,
              households: props.jumlah_kk || props.households,
              area: props.luas_wilay || props.area,
              luas_wilayah: props.luas_wilay,
              jumlah_penduduk: props.jumlah_pen,
              jumlah_kk: props.jumlah_kk,
              kepadatan: props.kepadatan_,
              raw: props
            },

            source: 'BNPB'
          };

          // Create document
          await BoundaryPolygon.create(boundaryData);
          imported++;

          // Progress indicator
          if ((i + 1) % 50 === 0 || (i + 1) === geojson.features.length) {
            console.log(`   [${i + 1}/${geojson.features.length}] Imported...`);
          }

        } catch (error) {
          errors++;
          if (errors <= 3) {
            console.error(`   ❌ Error importing feature ${i + 1}:`, error.message);
          }
        }
      }

      console.log(`\n✅ ${config.adminLevel}: Imported ${imported}/${geojson.features.length} boundaries`);
      if (errors > 0) {
        console.log(`   ⚠️  ${errors} errors occurred`);
      }
      console.log('');

      totalImported += imported;
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(70));

    const countByLevel = await BoundaryPolygon.aggregate([
      {
        $group: {
          _id: '$adminLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log('\nBoundaries by level:');
    for (const item of countByLevel) {
      const zoomInfo = LOD_FILES.find(f => f.adminLevel === item._id);
      console.log(`  ${item._id.padEnd(12)} → ${item.count.toString().padStart(4)} polygons (zoom ${zoomInfo.zoomMin}-${zoomInfo.zoomMax})`);
    }

    console.log(`\n📦 Total imported: ${totalImported} boundaries`);
    console.log('='.repeat(70));

    // Test query
    console.log('\n🧪 Testing zoom-based queries...\n');

    const testZoomLevels = [5, 8, 12];
    for (const zoom of testZoomLevels) {
      const results = await BoundaryPolygon.findByZoomLevel(zoom);
      console.log(`  Zoom ${zoom.toString().padStart(2)}: ${results.length.toString().padStart(4)} polygons (${results[0]?.adminLevel})`);
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run import
console.log('🚀 Starting LOD Boundary Import...\n');
importLODBoundaries();
