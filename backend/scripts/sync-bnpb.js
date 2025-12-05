const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const Statistics = require('../models/Statistics');

dotenv.config();

// BNPB API Endpoints
const BNPB_ENDPOINTS = {
  infrastructure: 'https://gis.bnpb.go.id/server/rest/services/thematic/BANSOR_SUMATERA/MapServer/17/query?f=json&cacheHint=true&orderByFields=&outFields=*&outStatistics=%5B%7B%22onStatisticField%22%3A%22pendidikan_rusak%22%2C%22outStatisticFieldName%22%3A%22pendidikan_rusak%22%2C%22statisticType%22%3A%22sum%22%7D%2C%7B%22onStatisticField%22%3A%22fasyankes_rusak%22%2C%22outStatisticFieldName%22%3A%22fasyankes_rusak%22%2C%22statisticType%22%3A%22sum%22%7D%2C%7B%22onStatisticField%22%3A%22rumah_ibadat_rusak%22%2C%22outStatisticFieldName%22%3A%22rumah_ibadat_rusak%22%2C%22statisticType%22%3A%22sum%22%7D%2C%7B%22onStatisticField%22%3A%22jembatan_rusak%22%2C%22outStatisticFieldName%22%3A%22jembatan_rusak%22%2C%22statisticType%22%3A%22sum%22%7D%5D&returnGeometry=false&spatialRel=esriSpatialRelIntersects&where=1%3D1',
  housing: 'https://gis.bnpb.go.id/server/rest/services/thematic/BANSOR_SUMATERA/MapServer/17/query?f=json&cacheHint=true&orderByFields=&outFields=*&outStatistics=%5B%7B%22onStatisticField%22%3A%22rumah_rusak_berat%22%2C%22outStatisticFieldName%22%3A%22rumah_rusak_berat%22%2C%22statisticType%22%3A%22sum%22%7D%2C%7B%22onStatisticField%22%3A%22rumah_rusak_sedang%22%2C%22outStatisticFieldName%22%3A%22rumah_rusak_sedang%22%2C%22statisticType%22%3A%22sum%22%7D%2C%7B%22onStatisticField%22%3A%22rumah_rusak_ringan%22%2C%22outStatisticFieldName%22%3A%22rumah_rusak_ringan%22%2C%22statisticType%22%3A%22sum%22%7D%5D&returnGeometry=false&spatialRel=esriSpatialRelIntersects&where=1%3D1'
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kawal-banjir')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fetchBNPBData(endpoint, type) {
  try {
    console.log(`🌐 Fetching ${type} data from BNPB...`);
    const response = await axios.get(endpoint, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const attributes = response.data.features[0].attributes;
      console.log(`✅ ${type} data fetched successfully`);
      return attributes;
    } else {
      console.log(`⚠️  No ${type} data found in response`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching ${type} data:`, error.message);
    return null;
  }
}

async function syncBNPBData() {
  try {
    console.log('🔄 Starting BNPB data sync...\n');

    // Fetch infrastructure data
    const infrastructureData = await fetchBNPBData(BNPB_ENDPOINTS.infrastructure, 'infrastructure');

    // Fetch housing data
    const housingData = await fetchBNPBData(BNPB_ENDPOINTS.housing, 'housing');

    if (!infrastructureData && !housingData) {
      console.log('❌ No data fetched from BNPB. Exiting...');
      return;
    }

    // Prepare statistics data
    const statisticsData = {
      region: 'sumatera',
      level: 'regional',
      kodeWilayah: 'SUMATERA',
      namaWilayah: 'Sumatera',

      // Infrastructure data
      totalPendidikanRusak: infrastructureData?.pendidikan_rusak || 0,
      totalFasyankesRusak: infrastructureData?.fasyankes_rusak || 0,
      totalRumahIbadatRusak: infrastructureData?.rumah_ibadat_rusak || 0,
      totalJembatanRusak: infrastructureData?.jembatan_rusak || 0,

      // Housing data
      totalRumahRusakBerat: housingData?.rumah_rusak_berat || 0,
      totalRumahRusakSedang: housingData?.rumah_rusak_sedang || 0,
      totalRumahRusakRingan: housingData?.rumah_rusak_ringan || 0,

      // Default values for other fields
      totalKorbanMeninggal: 0,
      totalKorbanHilang: 0,
      totalKorbanLukaBerat: 0,
      totalKorbanLukaRingan: 0,
      totalPengungsi: 0,
      jumlahDesaTerdampak: 0,
      jumlahKecamatanTerdampak: 0,
      jumlahKabupatenTerdampak: 0,

      // Status
      statusTerkini: 'waspada',

      // Metadata
      periodeData: {
        dari: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        hingga: new Date()
      },
      tanggalUpdate: new Date(),
      lastSync: new Date(),
      sumberData: 'BNPB'
    };

    console.log('\n📊 Synced Data Summary:');
    console.log(`   Pendidikan Rusak: ${statisticsData.totalPendidikanRusak}`);
    console.log(`   Fasyankes Rusak: ${statisticsData.totalFasyankesRusak}`);
    console.log(`   Rumah Ibadat Rusak: ${statisticsData.totalRumahIbadatRusak}`);
    console.log(`   Jembatan Rusak: ${statisticsData.totalJembatanRusak}`);
    console.log(`   Rumah Rusak Berat: ${statisticsData.totalRumahRusakBerat}`);
    console.log(`   Rumah Rusak Sedang: ${statisticsData.totalRumahRusakSedang}`);
    console.log(`   Rumah Rusak Ringan: ${statisticsData.totalRumahRusakRingan}`);

    // Update or create statistics
    console.log('\n💾 Saving to database...');
    const statistics = await Statistics.findOneAndUpdate(
      {
        level: 'regional',
        kodeWilayah: 'SUMATERA'
      },
      statisticsData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('\n✅ BNPB data sync completed successfully!');
    console.log(`   Statistics ID: ${statistics._id}`);
    console.log(`   Last Sync: ${statistics.lastSync}`);

  } catch (error) {
    console.error('❌ Error during BNPB sync:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run sync
syncBNPBData();
