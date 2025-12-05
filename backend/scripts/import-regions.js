const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');
const Region = require('../models/Region');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kawal-banjir')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function importRegions() {
  try {
    // Path ke file Excel
    const filePath = path.join(__dirname, '../../KODE-WILAYAH-KEPMENDAGRI-2025.xlsx');

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
      // Ambil kode desa dan ekstrak kode provinsi (2 digit pertama)
      const kodeDesa = String(row['KODE DESA']).trim();
      const kodeProvinsi = kodeDesa.substring(0, 2);
      return sumateraProvinces.includes(kodeProvinsi);
    });

    console.log(`🗺️  Found ${sumateraData.length} regions in Sumatera`);

    // Clear existing data (optional)
    console.log('🗑️  Clearing existing regions...');
    await Region.deleteMany({});

    // Import data
    let imported = 0;
    let skipped = 0;

    for (const row of sumateraData) {
      try {
        // Mapping kolom Excel ke model
        const kodeDesa = String(row['KODE DESA']).trim();
        const kodeKecamatan = String(row['KODE KECAMATAN']).trim();
        const kodeKabupaten = String(row['KODE KABUPATEN']).trim();
        const kodeProvinsi = kodeDesa.substring(0, 2);

        const regionData = {
          kodeDesa: kodeDesa,
          namaDesa: row['NAMA KELURAHAN/DESA/DESA ADAT'],
          kodeKecamatan: kodeKecamatan,
          namaKecamatan: row['NAMA KECAMATAN'],
          kodeKabupaten: kodeKabupaten,
          namaKabupaten: row['NAMA KABUPATEN'],
          kodeProvinsi: kodeProvinsi,
          namaProvinsi: row['NAMA PROVINSI'],
          tipeDesa: row['TIPE DESA(KELURAHAN, DESA, DESA ADAT)'] || 'DESA'
          // Note: location field will be added later when we have coordinates
        };

        // Skip if required fields are missing
        if (!regionData.kodeDesa || !regionData.namaDesa) {
          skipped++;
          continue;
        }

        // Create region (without location for now)
        await Region.create(regionData);
        imported++;

        // Log progress every 100 records
        if (imported % 100 === 0) {
          console.log(`   Imported ${imported} regions...`);
        }
      } catch (error) {
        console.error(`❌ Error importing row:`, error.message);
        skipped++;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${sumateraData.length}`);

  } catch (error) {
    console.error('❌ Error during import:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run import
importRegions();
