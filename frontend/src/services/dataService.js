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
      // You might need to calculate statistics from Status_Log
      const statuses = await airtableService.getStatusLogs();
      return calculateStatistics(statuses);
    }
    return apiService.getStatistics(params);
  },

  getSumatraStatistics: async () => {
    if (DATA_SOURCE === 'airtable') {
      const statuses = await airtableService.getStatusLogs();
      return calculateSumatraStatistics(statuses);
    }
    return apiService.getSumatraStatistics();
  },

  getProvincesStatistics: async () => {
    if (DATA_SOURCE === 'airtable') {
      const statuses = await airtableService.getStatusLogs();
      return calculateProvinceStatistics(statuses);
    }
    return apiService.getProvincesStatistics();
  },

  getStatisticsByProvinsi: async (kodeProvinsi) => {
    if (DATA_SOURCE === 'airtable') {
      const statuses = await airtableService.getStatusLogs();
      const provinceStatuses = statuses.filter(s => s.ProvinceCode === kodeProvinsi);
      return calculateStatistics(provinceStatuses);
    }
    return apiService.getStatisticsByProvinsi(kodeProvinsi);
  },

  // ===== ORGANIZATIONS =====
  getOrganizations: async () => {
    if (DATA_SOURCE === 'airtable') {
      return airtableService.getOrganizations();
    }
    // Backend doesn't have organizations endpoint
    throw new Error('Backend does not support organizations');
  },

  // ===== BOUNDARIES (Always use backend for GeoJSON) =====
  getBoundaries: async () => {
    // Always use backend for GeoJSON polygon data
    return apiService.getRegions();
  },

  // ===== UTILITIES =====
  getDataSource: () => DATA_SOURCE,

  isUsingAirtable: () => DATA_SOURCE === 'airtable',

  isUsingBackend: () => DATA_SOURCE === 'backend',
};

// Helper functions for statistics calculation
function calculateStatistics(statuses) {
  const active = statuses.filter(s => s.Status === 'Active' || s.Status === 'Ongoing');
  const resolved = statuses.filter(s => s.Status === 'Resolved' || s.Status === 'Closed');

  return {
    total: statuses.length,
    active: active.length,
    resolved: resolved.length,
    lastUpdated: new Date().toISOString()
  };
}

function calculateSumatraStatistics(statuses) {
  // Filter only Sumatra provinces
  const sumatraProvinces = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21'
  ];

  const sumatraStatuses = statuses.filter(s =>
    sumatraProvinces.includes(s.ProvinceCode)
  );

  return calculateStatistics(sumatraStatuses);
}

function calculateProvinceStatistics(statuses) {
  // Group by province
  const byProvince = {};

  statuses.forEach(status => {
    const provinceCode = status.ProvinceCode;
    if (!byProvince[provinceCode]) {
      byProvince[provinceCode] = [];
    }
    byProvince[provinceCode].push(status);
  });

  // Calculate stats for each province
  return Object.entries(byProvince).map(([code, provinceStatuses]) => ({
    provinceCode: code,
    provinceName: provinceStatuses[0]?.ProvinceName || 'Unknown',
    ...calculateStatistics(provinceStatuses)
  }));
}

export default dataService;
