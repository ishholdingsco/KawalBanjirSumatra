import { apiService } from './api';
import { airtableService } from './airtable';

// Data source configuration
// Set to 'airtable' to use Airtable, 'backend' to use Node.js backend
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'airtable';

/**
 * Unified Data Service
 * Routes requests to either Airtable or Backend based on configuration
 */
export const dataService = {
  // ===== HEALTH CHECK =====
  healthCheck: async () => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.healthCheck();
    }
    return apiService.healthCheck();
  },

  // ===== REPORTS =====
  getReports: async () => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.getReportsInbox();
    }
    return apiService.getReports();
  },

  getReportById: async (id) => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.getReportById(id);
    }
    // Backend doesn't have this endpoint yet
    throw new Error('Backend does not support getReportById');
  },

  createReport: async (reportData) => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.createReport(reportData);
    }
    // Backend doesn't have this endpoint yet
    throw new Error('Backend does not support createReport');
  },

  updateReport: async (id, reportData) => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.updateReport(id, reportData);
    }
    // Backend doesn't have this endpoint yet
    throw new Error('Backend does not support updateReport');
  },

  // ===== LOCATIONS / REGIONS =====
  getLocations: async () => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.getLocations();
    }
    // Map backend regions to locations
    return apiService.getRegions();
  },

  getProvinces: async () => {
    if (DATA_SOURCE === 'airtable') {
      // Filter locations by type = 'Province' if you have that field
      const locations = await airtableService.getLocations();
      return locations.filter(loc => loc.Type === 'Province' || loc.Level === 'Provinsi');
    }
    return apiService.getProvinces();
  },

  getKabupaten: async (kodeProvinsi) => {
    if (DATA_SOURCE === 'airtable') {
      // Filter locations by province code
      const locations = await airtableService.getLocations();
      return locations.filter(loc =>
        (loc.Type === 'Kabupaten' || loc.Level === 'Kabupaten') &&
        loc.ProvinceCode === kodeProvinsi
      );
    }
    return apiService.getKabupaten(kodeProvinsi);
  },

  getRegions: async (params = {}) => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.getLocations();
    }
    return apiService.getRegions(params);
  },

  // ===== FLOOD DATA / STATUS =====
  getFloodData: async (params = {}) => {
    if (DATA_SOURCE === 'airtable') {
      // Use Status_Log table
      return airtableService.getStatusLogs();
    }
    return apiService.getFloodData(params);
  },

  getActiveFloods: async (kodeProvinsi = null) => {
    if (DATA_SOURCE === 'airtable') {
      const activeStatuses = await airtableService.getActiveStatuses();
      if (kodeProvinsi) {
        return activeStatuses.filter(status => status.ProvinceCode === kodeProvinsi);
      }
      return activeStatuses;
    }
    return apiService.getActiveFloods(kodeProvinsi);
  },

  getFloodDataByProvinsi: async (kodeProvinsi) => {
    if (DATA_SOURCE === 'airtable') {
      const statuses = await airtableService.getStatusLogs();
      return statuses.filter(status => status.ProvinceCode === kodeProvinsi);
    }
    return apiService.getFloodDataByProvinsi(kodeProvinsi);
  },

  // ===== STATISTICS =====
  getStatistics: async (params = {}) => {
    if (DATA_SOURCE === 'airtable') {
      // Calculate statistics from Locations with BNPB data
      const locations = await airtableService.getLocations();
      return calculateStatistics(locations);
    }
    return apiService.getStatistics(params);
  },

  getSumatraStatistics: async () => {
    if (DATA_SOURCE === 'airtable') {
      // Get all locations and calculate Sumatra-wide statistics
      const locations = await airtableService.getLocations();
      return calculateSumatraStatistics(locations);
    }
    return apiService.getSumatraStatistics();
  },

  getProvincesStatistics: async () => {
    if (DATA_SOURCE === 'airtable') {
      // Get all locations and calculate per-province statistics
      const locations = await airtableService.getLocations();
      return calculateProvinceStatistics(locations);
    }
    return apiService.getProvincesStatistics();
  },

  getStatisticsByProvinsi: async (kodeProvinsi, namaProvinsi) => {
    if (DATA_SOURCE === 'airtable') {
      // Get all kabupaten locations and filter by province
      const locations = await airtableService.getLocations();

      // Filter only Kabupaten/Kota (not Kecamatan)
      const kabupatenLocations = locations.filter(loc =>
        (loc.Type === 'Kabupaten' || loc.Type === 'Kota')
      );

      // Filter by province using BPS Code field
      // BPS Code format for kabupaten: "XX.YY" where XX is province code (e.g., "13.71" for Kota Padang)
      // NOTE: Parent Loc is a Linked Record field in Airtable, returns array of record IDs, not useful for matching!
      const provinceLocations = kabupatenLocations.filter(loc => {
        const bpsCode = loc['BPS Code'];

        // Extract province code from BPS Code (first 2 digits before the dot)
        // BPS Code format: "XX.YY" where XX is province code
        if (bpsCode) {
          const bpsCodeStr = String(bpsCode).trim();
          const provinceCodeFromBPS = bpsCodeStr.split('.')[0];  // e.g., "13.71" → "13"

          // Match by province code
          if (kodeProvinsi) {
            // kodeProvinsi might be "11" or "11.01", so we extract first 2 digits
            const provinceCode = String(kodeProvinsi).substring(0, 2);
            return provinceCodeFromBPS === provinceCode;
          }

          // Fallback: Match by province name
          const provinceCodeMap = {
            '11': 'ACEH',
            '12': 'SUMATERA UTARA',
            '13': 'SUMATERA BARAT'
          };

          const expectedProvinceName = provinceCodeMap[provinceCodeFromBPS];
          if (namaProvinsi && expectedProvinceName) {
            const normalizedNamaProvinsi = namaProvinsi.toUpperCase().trim();
            return expectedProvinceName === normalizedNamaProvinsi ||
                   normalizedNamaProvinsi.includes(expectedProvinceName) ||
                   expectedProvinceName.includes(normalizedNamaProvinsi);
          }
        }

        return false;
      });

      const stats = calculateStatistics(provinceLocations);

      // Add region name
      return {
        ...stats,
        regionName: namaProvinsi || 'Provinsi',
        lastSync: stats.lastSync || new Date().toISOString()
      };
    }
    return apiService.getStatisticsByProvinsi(kodeProvinsi);
  },

  getStatisticsByKabupaten: async (namaKabupaten) => {
    if (DATA_SOURCE === 'airtable') {
      // Get all locations and find matching kabupaten
      const locations = await airtableService.getLocations();

      // Find specific kabupaten by name
      const kabupatenLocation = locations.find(loc => {
        const locName = loc['Loc Name'] || '';
        const locType = loc.Type || '';

        // Only match Kabupaten/Kota type
        if (locType !== 'Kabupaten' && locType !== 'Kota') {
          return false;
        }

        // Clean up names for matching
        const cleanKabupaten = namaKabupaten.toLowerCase()
          .replace(/^(kabupaten|kota)\s+/i, '')
          .trim();

        const cleanLocName = locName.toLowerCase()
          .replace(/^(kabupaten|kota)\s+/i, '')
          .trim();

        return cleanLocName.includes(cleanKabupaten) || cleanKabupaten.includes(cleanLocName);
      });

      if (kabupatenLocation) {
        const stats = calculateStatistics([kabupatenLocation]);

        return {
          ...stats,
          regionName: kabupatenLocation['Loc Name'] || namaKabupaten,
          lastSync: stats.lastSync || new Date().toISOString()
        };
      }

      // If not found, return empty stats
      return {
        totalKorbanMeninggal: 0,
        totalKorbanHilang: 0,
        totalKorbanLukaSakit: 0,
        totalPengungsi: 0,
        totalKorban: 0,
        regionName: namaKabupaten,
        sumberData: 'BNPB'
      };
    }
    return null;
  },

  // ===== ORGANIZATIONS =====
  getOrganizations: async () => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.getOrganizations();
    }
    // Backend doesn't have organizations endpoint
    throw new Error('Backend does not support organizations');
  },

  // ===== BOUNDARIES =====
  getBoundaries: async (zoom = 6) => {
    if (DATA_SOURCE === 'airtable') {
      // Use Airtable boundaries
      return airtableService.getBoundaries(zoom);
    }
    // Use backend for GeoJSON polygon data
    return apiService.getRegions();
  },

  // ===== UTILITIES =====
  getDataSource: () => DATA_SOURCE,

  isUsingAirtable: () => DATA_SOURCE === 'airtable',

  isUsingBackend: () => DATA_SOURCE === 'backend',
};

// Helper functions for statistics calculation
function calculateStatistics(locations) {
  // Calculate statistics from Locations with BNPB data
  // Sum all BNPB fields from locations
  const stats = {
    // Korban
    totalKorbanMeninggal: 0,
    totalKorbanHilang: 0,
    totalKorbanLukaSakit: 0,
    totalPengungsi: 0,

    // Rumah (if these fields exist)
    totalRumahRusakBerat: 0,
    totalRumahRusakSedang: 0,
    totalRumahRusakRingan: 0,
    totalRumahRusak: 0,

    // Infrastruktur (if these fields exist)
    totalPendidikanRusak: 0,
    totalFasyankesRusak: 0,
    totalRumahIbadatRusak: 0,
    totalJembatanRusak: 0,
    totalInfrastrukturRusak: 0,

    // Metadata
    lastSync: null,
    sumberData: 'BNPB'
  };

  locations.forEach(loc => {
    // Sum BNPB fields
    // Field names: Meninggal, Hilang, Luka_Sakit, Menderita, Mengungsi, Menderita_Mengungsi
    // Displaced fields use space: "Final Displaced", "Manual Displaced", "Child Displaced"
    stats.totalKorbanMeninggal += loc.Meninggal || 0;
    stats.totalKorbanHilang += loc.Hilang || 0;
    stats.totalKorbanLukaSakit += loc.Luka_Sakit || 0;
    stats.totalPengungsi += loc['Final Displaced'] || loc.Menderita_Mengungsi || loc.Mengungsi || 0;

    // Rumah (if fields exist)
    stats.totalRumahRusakBerat += loc.Rumah_Rusak_Berat || 0;
    stats.totalRumahRusakSedang += loc.Rumah_Rusak_Sedang || 0;
    stats.totalRumahRusakRingan += loc.Rumah_Rusak_Ringan || 0;

    // Infrastruktur (if fields exist)
    stats.totalPendidikanRusak += loc.Pendidikan_Rusak || 0;
    stats.totalFasyankesRusak += loc.Fasyankes_Rusak || 0;
    stats.totalRumahIbadatRusak += loc.Rumah_Ibadat_Rusak || 0;
    stats.totalJembatanRusak += loc.Jembatan_Rusak || 0;

    // Track latest sync time
    if (loc.Last_Sync_BNPB) {
      const syncTime = new Date(loc.Last_Sync_BNPB);
      if (!stats.lastSync || syncTime > new Date(stats.lastSync)) {
        stats.lastSync = loc.Last_Sync_BNPB;
      }
    }
  });

  // Calculate totals
  stats.totalRumahRusak = stats.totalRumahRusakBerat + stats.totalRumahRusakSedang + stats.totalRumahRusakRingan;
  stats.totalInfrastrukturRusak = stats.totalPendidikanRusak + stats.totalFasyankesRusak +
                                  stats.totalRumahIbadatRusak + stats.totalJembatanRusak;
  stats.totalKorban = stats.totalKorbanMeninggal + stats.totalKorbanHilang + stats.totalKorbanLukaSakit;

  return stats;
}

function calculateSumatraStatistics(locations) {
  // Calculate statistics for all Sumatra locations
  // Filter only Kabupaten/Kota type (not Kecamatan) to avoid double counting
  const kabupatenLocations = locations.filter(loc =>
    loc.Type === 'Kabupaten' || loc.Type === 'Kota'
  );

  const stats = calculateStatistics(kabupatenLocations);

  // Add region name and formatting for display
  return {
    ...stats,
    regionName: 'Data Banjir Sumatra',
    // Use Last Updated field from Airtable as lastSync
    lastSync: stats.lastSync || new Date().toISOString()
  };
}

function calculateProvinceStatistics(locations) {
  // Group locations by province
  const byProvince = {};

  locations.forEach(loc => {
    // Get province name from Parent Loc or other field
    const provinceName = loc['Parent Loc'] || loc.ProvinceName || 'Unknown';
    if (!byProvince[provinceName]) {
      byProvince[provinceName] = [];
    }
    byProvince[provinceName].push(loc);
  });

  // Calculate stats for each province
  return Object.entries(byProvince).map(([provinceName, provinceLocations]) => ({
    provinceName: provinceName,
    ...calculateStatistics(provinceLocations)
  }));
}

export default dataService;
