const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');
const FloodData = require('../models/FloodData');
const Region = require('../models/Region');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kawal-banjir')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function importFloodData() {
  try {
    // Path ke file Excel
    const filePath = path.join(__dirname, '../../KawalBanjirJakarta.xlsx');

    console.log('📖 Reading Excel file:', filePath);

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} rows in Excel`);

    // Filter hanya provinsi Sumatera (kode provinsi 11-21)
    const sumateraProvinces = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21'];

    const sumateraData = data.filter(row => {
      // Ambil kode desa
      const kodeDesa = String(row['KODE DESA']).trim();
      const kodeProvinsi = kodeDesa.substring(0, 2);
      return sumateraProvinces.includes(kodeProvinsi);
    });

    console.log(`🗺️  Found ${sumateraData.length} flood data records in Sumatera`);

    // Clear existing flood data (optional)
    console.log('🗑️  Clearing existing flood data...');
    await FloodData.deleteMany({});

    // Import data
    let imported = 0;
    let skipped = 0;
    let locationsFetched = 0;

    for (const row of sumateraData) {
      try {
        const kodeDesa = String(row['KODE DESA']).trim();
        const kodeKecamatan = String(row['KODE KECAMATAN']).trim();
        const kodeKabupaten = String(row['KODE KABUPATEN']).trim();
        const kodeProvinsi = kodeDesa.substring(0, 2);

        // Skip if required fields are missing
        if (!kodeDesa) {
          skipped++;
          continue;
        }

        // Get location from Region if available
        const region = await Region.findOne({ kodeDesa });
        let location = undefined;

        if (region && region.location && region.location.coordinates) {
          location = region.location;
          locationsFetched++;
        }

        // Mapping data banjir
        // Catatan: Sesuaikan field ini dengan kolom yang ada di Excel Anda
        const floodDataObj = {
          kodeDesa: kodeDesa,
          kodeKecamatan: kodeKecamatan,
          kodeKabupaten: kodeKabupaten,
          kodeProvinsi: kodeProvinsi,
          namaWilayah: row['NAMA KELURAHAN/DESA/DESA ADAT'] || 'Unknown',

          // Data kerusakan infrastruktur (isi sesuai kolom Excel)
          pendidikanRusak: parseInt(row['PENDIDIKAN_RUSAK']) || 0,
          fasyankesRusak: parseInt(row['FASYANKES_RUSAK']) || 0,
          rumahIbadatRusak: parseInt(row['RUMAH_IBADAT_RUSAK']) || 0,
          jembatanRusak: parseInt(row['JEMBATAN_RUSAK']) || 0,

          // Data kerusakan rumah
          rumahRusakBerat: parseInt(row['RUMAH_RUSAK_BERAT']) || 0,
          rumahRusakSedang: parseInt(row['RUMAH_RUSAK_SEDANG']) || 0,
          rumahRusakRingan: parseInt(row['RUMAH_RUSAK_RINGAN']) || 0,

          // Data korban
          korbanMeninggal: parseInt(row['KORBAN_MENINGGAL']) || 0,
          korbanHilang: parseInt(row['KORBAN_HILANG']) || 0,
          korbanLukaBerat: parseInt(row['KORBAN_LUKA_BERAT']) || 0,
          korbanLukaRingan: parseInt(row['KORBAN_LUKA_RINGAN']) || 0,
          pengungsi: parseInt(row['PENGUNGSI']) || 0,

          // Status banjir
          statusBanjir: row['STATUS_BANJIR'] || 'normal',
          tinggiAir: parseInt(row['TINGGI_AIR']) || 0,

          // Metadata
          sumberData: 'Scraping',
          tanggalKejadian: row['TANGGAL_KEJADIAN'] ? new Date(row['TANGGAL_KEJADIAN']) : new Date(),
          tanggalUpdate: new Date(),
          terverifikasi: false
        };

        // Add location if available
        if (location) {
          floodDataObj.location = location;
        }

        // Create flood data
        await FloodData.create(floodDataObj);
        imported++;

        // Log progress every 50 records
        if (imported % 50 === 0) {
          console.log(`   Imported ${imported} flood data records...`);
        }
      } catch (error) {
        console.error(`❌ Error importing row:`, error.message);
        skipped++;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   With location: ${locationsFetched}`);
    console.log(`   Total: ${sumateraData.length}`);

  } catch (error) {
    console.error('❌ Error during import:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run import
importFloodData();
