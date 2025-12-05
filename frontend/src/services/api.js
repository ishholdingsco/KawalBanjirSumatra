import axios from 'axios';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Service
export const apiService = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Reports
  getReports: async () => {
    const response = await api.get('/reports');
    return response.data;
  },

  // Regions
  getProvinces: async () => {
    const response = await api.get('/regions/provinces');
    return response.data;
  },

  getRegions: async (params = {}) => {
    const response = await api.get('/regions', { params });
    return response.data;
  },

  getKabupaten: async (kodeProvinsi) => {
    const response = await api.get('/regions/kabupaten', {
      params: { provinsi: kodeProvinsi }
    });
    return response.data;
  },

  // Flood Data
  getFloodData: async (params = {}) => {
    const response = await api.get('/flood-data', { params });
    return response.data;
  },

  getFloodDataByProvinsi: async (kodeProvinsi) => {
    const response = await api.get(`/flood-data/provinsi/${kodeProvinsi}`);
    return response.data;
  },

  getActiveFloods: async (kodeProvinsi = null) => {
    const params = kodeProvinsi ? { provinsi: kodeProvinsi } : {};
    const response = await api.get('/flood-data/active', { params });
    return response.data;
  },

  // Statistics
  getStatistics: async (params = {}) => {
    const response = await api.get('/statistics', { params });
    return response.data;
  },

  getSumatraStatistics: async () => {
    const response = await api.get('/statistics/latest/sumatra');
    return response.data;
  },

  getProvincesStatistics: async () => {
    const response = await api.get('/statistics/provinsi/all/sumatra');
    return response.data;
  },

  getStatisticsByProvinsi: async (kodeProvinsi) => {
    const response = await api.get(`/statistics/provinsi/${kodeProvinsi}`);
    return response.data;
  },
};

export default api;
