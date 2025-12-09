const axios = require('axios');
require('dotenv').config();

// Airtable Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// BNPB API Endpoint
const BNPB_BASE_URL = 'https://gis.bnpb.go.id/server/rest/services/thematic/BANSOR_SUMATERA/MapServer/17/query';

// Create Airtable API client
const airtableApi = axios.create({
  baseURL: AIRTABLE_API_URL,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000
});

/**
 * Fetch all records from Airtable (with pagination)
 */
async function getAllAirtableRecords(tableName, params = {}) {
  let allRecords = [];
  let offset = null;

  try {
    do {
      const requestParams = { ...params };
      if (offset) {
        requestParams.offset = offset;
      }

      const response = await airtableApi.get(`/${tableName}`, { params: requestParams });
      allRecords = [...allRecords, ...response.data.records];
      offset = response.data.offset;
    } while (offset);

    return allRecords;
  } catch (error) {
    console.error(`❌ Error fetching from Airtable table ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Get all locations (Province and Kabupaten) from Airtable
 */
async function getLocationsFromAirtable() {
  try {
    console.log('📍 Fetching locations from Airtable...');

    // Filter for Province and Kabupaten only
    const params = {
      filterByFormula: "OR({Type} = 'Province', {Type} = 'Kabupaten')"
    };

    const records = await getAllAirtableRecords('Locations', params);
    console.log(`✅ Found ${records.length} locations (Province + Kabupaten)`);

    return records.map(record => ({
      id: record.id,
      bpsCode: record.fields['BPS Code'],
      locName: record.fields['Loc Name'],
      type: record.fields.Type,
      parentLoc: record.fields['Parent Loc']
    }));
  } catch (error) {
    console.error('❌ Error getting locations from Airtable:', error.message);
    throw error;
  }
}

/**
 * Normalize location name for BNPB API query
 * Airtable uses "Sumatra" but BNPB uses "Sumatera" (with "e")
 * Airtable uses "Kabupaten X" but BNPB uses just "X"
 */
function normalizeName(name, type) {
  if (!name) return name;

  let normalized = name;

  // For Province: Convert "Sumatra" → "Sumatera"
  if (type === 'Province') {
    normalized = normalized.replace(/Sumatra/gi, 'Sumatera');
  }

  // For Kabupaten: Remove "Kabupaten " prefix (but keep "Kota")
  if (type === 'Kabupaten') {
    normalized = normalized.replace(/^Kabupaten\s+/i, '');
    // Keep "Kota" prefix as is (BNPB also uses "Kota")
  }

  return normalized;
}

/**
 * Fetch data from BNPB API for a specific location
 */
async function fetchBNPBDataByLocation(locationName, locationType) {
  try {
    // Normalize location name for BNPB query
    const normalizedName = normalizeName(locationName, locationType);
    console.log(`🌐 Fetching BNPB data for ${locationType}: ${locationName} → "${normalizedName}"...`);

    // Build WHERE clause based on location type
    let whereClause;
    if (locationType === 'Province') {
      // For province, aggregate all kabupaten in that province
      whereClause = `provinsi='${normalizedName}'`;
    } else {
      // For kabupaten, query by kabupaten name
      whereClause = `kabupaten='${normalizedName}'`;
    }

    // Build query parameters
    const params = {
      f: 'json',
      where: whereClause,
      outFields: '*',
      returnGeometry: false,
      // Get sum statistics for all fields
      outStatistics: JSON.stringify([
        { statisticType: 'sum', onStatisticField: 'meninggal', outStatisticFieldName: 'meninggal' },
        { statisticType: 'sum', onStatisticField: 'hilang', outStatisticFieldName: 'hilang' },
        { statisticType: 'sum', onStatisticField: 'luka_sakit', outStatisticFieldName: 'luka_sakit' },
        { statisticType: 'sum', onStatisticField: 'menderita', outStatisticFieldName: 'menderita' },
        { statisticType: 'sum', onStatisticField: 'mengungsi', outStatisticFieldName: 'mengungsi' },
        { statisticType: 'sum', onStatisticField: 'rumah_rusak_berat', outStatisticFieldName: 'rumah_rusak_berat' },
        { statisticType: 'sum', onStatisticField: 'rumah_rusak_sedang', outStatisticFieldName: 'rumah_rusak_sedang' },
        { statisticType: 'sum', onStatisticField: 'rumah_rusak_ringan', outStatisticFieldName: 'rumah_rusak_ringan' },
        { statisticType: 'sum', onStatisticField: 'rumah_rusak', outStatisticFieldName: 'rumah_rusak' },
        { statisticType: 'sum', onStatisticField: 'pendidikan_rusak', outStatisticFieldName: 'pendidikan_rusak' },
        { statisticType: 'sum', onStatisticField: 'rumah_ibadat_rusak', outStatisticFieldName: 'rumah_ibadat_rusak' },
        { statisticType: 'sum', onStatisticField: 'fasyankes_rusak', outStatisticFieldName: 'fasyankes_rusak' },
        { statisticType: 'sum', onStatisticField: 'fasum_rusak', outStatisticFieldName: 'fasum_rusak' },
        { statisticType: 'sum', onStatisticField: 'kantor_rusak', outStatisticFieldName: 'kantor_rusak' },
        { statisticType: 'sum', onStatisticField: 'jembatan_rusak', outStatisticFieldName: 'jembatan_rusak' },
        { statisticType: 'sum', onStatisticField: 'lahan_hektar', outStatisticFieldName: 'lahan_hektar' }
      ])
    };

    const response = await axios.get(BNPB_BASE_URL, {
      params,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const data = response.data.features[0].attributes;
      console.log(`✅ Data fetched for ${locationName} (${normalizedName})`);
      return data;
    } else {
      console.log(`⚠️  No data found for ${locationName} (query: ${normalizedName})`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching BNPB data for ${locationName}:`, error.message);
    return null;
  }
}

/**
 * Calculate total Kerusakan (damage) from all damage fields
 * EXCLUDE lahan_hektar as per user requirement
 */
function calculateKerusakan(data) {
  if (!data) return 0;

  const kerusakan =
    (data.rumah_rusak || 0) +  // Total rumah rusak (or sum of berat + sedang + ringan)
    (data.pendidikan_rusak || 0) +
    (data.rumah_ibadat_rusak || 0) +
    (data.fasyankes_rusak || 0) +
    (data.fasum_rusak || 0) +
    (data.kantor_rusak || 0) +
    (data.jembatan_rusak || 0);

  return kerusakan;
}

/**
 * Update Airtable record with BNPB data
 */
async function updateAirtableRecord(recordId, data, bnpbData) {
  try {
    const kerusakan = calculateKerusakan(bnpbData);

    // Prepare fields to update
    // NOTE: "Last Updated" is a computed field in Airtable, so we can't update it
    const fields = {
      'Meninggal': bnpbData?.meninggal || 0,
      'Hilang': bnpbData?.hilang || 0,
      'Luka_Sakit': bnpbData?.luka_sakit || 0,
      'Menderita': bnpbData?.menderita || 0,
      'Mengungsi': bnpbData?.mengungsi || 0,
      'Kerusakan': kerusakan  // NEW FIELD: Total kerusakan
    };

    await airtableApi.patch(`/Locations/${recordId}`, { fields });

    console.log(`✅ Updated ${data.locName}: Meninggal=${fields.Meninggal}, Kerusakan=${fields.Kerusakan}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating Airtable record ${recordId}:`, error.message);
    return false;
  }
}

/**
 * Main sync function
 */
async function syncBNPBAirtable() {
  console.log('\n🔄 ===== BNPB → Airtable Sync Started =====');
  console.log(`📅 Sync time: ${new Date().toLocaleString('id-ID')}\n`);

  try {
    // 1. Get all locations from Airtable
    const locations = await getLocationsFromAirtable();

    if (locations.length === 0) {
      console.log('⚠️  No locations found in Airtable');
      return;
    }

    // 2. Process each location
    let successCount = 0;
    let failCount = 0;
    let noDataCount = 0;

    for (const location of locations) {
      console.log(`\n--- Processing ${location.type}: ${location.locName} (${location.bpsCode}) ---`);

      // Skip if no location name
      if (!location.locName) {
        console.log(`⚠️  Skipping: No location name`);
        failCount++;
        continue;
      }

      // Fetch BNPB data
      const bnpbData = await fetchBNPBDataByLocation(location.locName, location.type);

      if (bnpbData) {
        // Update Airtable
        const success = await updateAirtableRecord(location.id, location, bnpbData);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        // No data found, but still update with zeros
        const success = await updateAirtableRecord(location.id, location, null);
        if (success) {
          noDataCount++;
        } else {
          failCount++;
        }
      }

      // Rate limiting: wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 3. Summary
    console.log('\n📊 ===== Sync Summary =====');
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⚠️  No data found (updated with 0): ${noDataCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📍 Total processed: ${locations.length}`);
    console.log(`⏰ Completed at: ${new Date().toLocaleString('id-ID')}\n`);

  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
}

// Export functions
module.exports = {
  syncBNPBAirtable,
  getLocationsFromAirtable,
  fetchBNPBDataByLocation,
  calculateKerusakan,
  updateAirtableRecord,
  normalizeName
};

// If running directly (not imported)
if (require.main === module) {
  syncBNPBAirtable()
    .then(() => {
      console.log('✅ Sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Sync failed:', error);
      process.exit(1);
    });
}
