import axios from 'axios';

// Airtable Configuration
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// Table Names
const TABLES = {
  LOCATIONS: 'Locations',
  REPORTS_INBOX: 'Reports_Inbox',
  STATUS_LOG: 'Status_Log',
  ORGANIZATIONS: 'Organizations'
};

// Create axios instance for Airtable
const airtableApi = axios.create({
  baseURL: AIRTABLE_API_URL,
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Helper function to get all records (handles pagination)
const getAllRecords = async (tableName, params = {}) => {
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
    console.error(`Error fetching records from ${tableName}:`, error.response?.data || error.message);
    throw error;
  }
};

// Airtable Service
export const airtableService = {
  // ===== LOCATIONS =====
  getLocations: async (filters = {}) => {
    try {
      const records = await getAllRecords(TABLES.LOCATIONS);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  getLocationById: async (recordId) => {
    try {
      const response = await airtableApi.get(`/${TABLES.LOCATIONS}/${recordId}`);
      return {
        id: response.data.id,
        ...response.data.fields
      };
    } catch (error) {
      console.error('Error fetching location:', error);
      throw error;
    }
  },

  // ===== REPORTS INBOX =====
  getReportsInbox: async (filters = {}) => {
    try {
      const records = await getAllRecords(TABLES.REPORTS_INBOX);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  getReportById: async (recordId) => {
    try {
      const response = await airtableApi.get(`/${TABLES.REPORTS_INBOX}/${recordId}`);
      return {
        id: response.data.id,
        ...response.data.fields
      };
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  },

  createReport: async (reportData) => {
    try {
      const response = await airtableApi.post(`/${TABLES.REPORTS_INBOX}`, {
        fields: reportData
      });
      return {
        id: response.data.id,
        ...response.data.fields
      };
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  },

  updateReport: async (recordId, reportData) => {
    try {
      const response = await airtableApi.patch(`/${TABLES.REPORTS_INBOX}/${recordId}`, {
        fields: reportData
      });
      return {
        id: response.data.id,
        ...response.data.fields
      };
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  },

  // ===== STATUS LOG =====
  getStatusLogs: async (filters = {}) => {
    try {
      const records = await getAllRecords(TABLES.STATUS_LOG);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Error fetching status logs:', error);
      throw error;
    }
  },

  getActiveStatuses: async () => {
    try {
      // Filter for active/ongoing flood statuses
      const params = {
        filterByFormula: "OR({Status} = 'Active', {Status} = 'Ongoing')",
        sort: [{ field: 'Created', direction: 'desc' }]
      };
      const records = await getAllRecords(TABLES.STATUS_LOG, params);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Error fetching active statuses:', error);
      throw error;
    }
  },

  createStatusLog: async (statusData) => {
    try {
      const response = await airtableApi.post(`/${TABLES.STATUS_LOG}`, {
        fields: statusData
      });
      return {
        id: response.data.id,
        ...response.data.fields
      };
    } catch (error) {
      console.error('Error creating status log:', error);
      throw error;
    }
  },

  // ===== ORGANIZATIONS =====
  getOrganizations: async () => {
    try {
      const records = await getAllRecords(TABLES.ORGANIZATIONS);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }
  },

  getOrganizationById: async (recordId) => {
    try {
      const response = await airtableApi.get(`/${TABLES.ORGANIZATIONS}/${recordId}`);
      return {
        id: response.data.id,
        ...response.data.fields
      };
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  },

  // ===== HEALTH CHECK =====
  healthCheck: async () => {
    try {
      // Try to fetch a small amount of data to check connection
      const response = await airtableApi.get(`/${TABLES.LOCATIONS}`, {
        params: { maxRecords: 1 }
      });
      return {
        status: 'connected',
        message: 'Airtable connection successful',
        baseId: AIRTABLE_BASE_ID
      };
    } catch (error) {
      console.error('Airtable health check failed:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
};

export default airtableService;
