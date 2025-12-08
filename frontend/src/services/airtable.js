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
  ORGANIZATIONS: 'Organizations',
  BOUNDARIES: 'Boundaries'
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
      // Filter out Kecamatan type to improve performance
      // Only fetch Province, Kabupaten, and Kota levels
      const params = {
        filterByFormula: "OR({Type} = 'Province', {Type} = 'Kabupaten', {Type} = 'Kota')"
      };

      const records = await getAllRecords(TABLES.LOCATIONS, params);
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
      return records.map(record => {
        const fields = record.fields;

        // Parse coordinates - handle different formats
        let coordinates = [];
        if (fields.coordinates) {
          if (typeof fields.coordinates === 'string') {
            // Parse string format "lng,lat" or "[lng,lat]"
            const coordStr = fields.coordinates.replace(/[\[\]]/g, '').trim();
            const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              coordinates = [parts[0], parts[1]];
            }
          } else if (Array.isArray(fields.coordinates)) {
            coordinates = fields.coordinates;
          }
        }

        // Parse imageUrls - handle string or array
        let imageUrls = [];
        if (fields.imageUrls) {
          if (typeof fields.imageUrls === 'string') {
            imageUrls = fields.imageUrls.split(',').map(url => url.trim());
          } else if (Array.isArray(fields.imageUrls)) {
            imageUrls = fields.imageUrls;
          }
        }

        // ⚠️ Skip reports with invalid coordinates (don't use [0,0] fallback!)
        // [0,0] is in the ocean near Africa and causes map to pan there
        if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
          return null;  // Skip this report
        }

        // Transform to backend-compatible format
        return {
          _id: record.id,  // Use Airtable record ID as _id
          id: record.id,   // Keep id for compatibility
          location: {
            type: 'Point',
            coordinates: coordinates  // Already validated above
          },
          locationName: fields.locationName || fields.location_name || '',
          description: fields.description || '',
          category: fields.category || 'lainnya',
          severity: fields.severity || 'ringan',
          timestamp: fields.timestamp || fields.created || new Date().toISOString(),
          contactSource: fields.contactSource || fields.contact_source || '',
          imageUrls: imageUrls,
          // Include all other fields
          ...fields
        };
      }).filter(report => report !== null);  // Filter out null (invalid) reports
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

  // ===== BOUNDARIES =====
  getBoundaries: async (zoom = 6) => {
    try {
      // ⚡ PERFORMANCE OPTIMIZATION: Filter kecamatan at API level
      // Only fetch records where "Kode Kecamatan " is empty (not kecamatan)
      // This significantly reduces data transfer from Airtable
      const params = {
        filterByFormula: "OR({Kode Kecamatan } = '', NOT({Kode Kecamatan }))"
      };
      const records = await getAllRecords(TABLES.BOUNDARIES, params);

      // Convert Airtable records to GeoJSON FeatureCollection
      const features = records.map(record => {
        const fields = record.fields;

        // Parse geometry - handle different possible formats
        let geometry;

        // OPTION 1: Field "Geometry Coordinates" contains FULL GeoJSON (as JSON string)
        const geometryCoordinatesField = fields['Geometry Coordinates'] || fields.geometryCoordinates;

        if (geometryCoordinatesField) {
          if (typeof geometryCoordinatesField === 'string') {
            try {
              // Parse the JSON string which contains full GeoJSON object
              geometry = JSON.parse(geometryCoordinatesField);
            } catch (e) {
              console.warn('❌ Failed to parse Geometry Coordinates for record:', record.id, e.message);
              return null;
            }
          } else if (typeof geometryCoordinatesField === 'object') {
            geometry = geometryCoordinatesField;
          }
        }
        // OPTION 2: Airtable has single 'geometry' field with full GeoJSON
        else if (fields.geometry) {
          if (typeof fields.geometry === 'string') {
            try {
              geometry = JSON.parse(fields.geometry);
            } catch (e) {
              console.warn('❌ Failed to parse geometry field for record:', record.id);
              return null;
            }
          } else if (typeof fields.geometry === 'object') {
            geometry = fields.geometry;
          }
        }

        if (!geometry) {
          console.warn('⚠️ No geometry found for record:', record.id);
          return null;
        }

        // Build properties object - support Airtable field names (with spaces)
        // IMPORTANT: Check fields WITH SPACES first (from CSV export)
        // Extract codes from BPS Code if specific code fields don't exist
        const bpsCode = fields['BPS Code'] || fields.bpsCode || fields.BPSCode || '';
        const bpsCodeParts = bpsCode ? String(bpsCode).split('.') : [];

        let kodeProvinsi = fields['Kode Provinsi'] || fields.kodeProvinsi || fields.kode_provinsi || fields.ProvinceCode;
        let kodeKabupaten = fields['Kode Kabupaten '] || fields['Kode Kabupaten'] || fields.kodeKabupaten || fields.kode_kabupaten || fields.KabupatenCode;
        let kodeKecamatan = fields['Kode Kecamatan '] || fields['Kode Kecamatan'] || fields.kodeKecamatan || fields.kode_kecamatan || fields.KecamatanCode;

        // Fallback: Extract from BPS Code if specific fields are empty
        // BPS Code format: "11" (provinsi), "11.01" (kabupaten), "11.01.01" (kecamatan)
        if (!kodeProvinsi && bpsCodeParts.length >= 1) {
          kodeProvinsi = bpsCodeParts[0];
        }
        if (!kodeKabupaten && bpsCodeParts.length >= 2) {
          kodeKabupaten = bpsCodeParts.slice(0, 2).join('.');
        }
        if (!kodeKecamatan && bpsCodeParts.length >= 3) {
          kodeKecamatan = bpsCodeParts.join('.');
        }

        // 🔧 HARDCODED LOGIC: Determine admin level based on kode fields
        // - If Kode Kecamatan exists → kecamatan (SKIP - we don't want kecamatan)
        // - If Kode Kabupaten exists but not Kode Kecamatan → kabupaten
        // - If only Kode Provinsi exists → provinsi
        let adminLevel;
        if (kodeKecamatan) {
          adminLevel = 'kecamatan';
        } else if (kodeKabupaten) {
          adminLevel = 'kabupaten';
        } else {
          adminLevel = 'provinsi';
        }

        const properties = {
          adminLevel: adminLevel,  // Hardcoded logic based on kode fields
          namaProvinsi: fields['Nama Provinsi'] || fields.namaProvinsi || fields.nama_provinsi || fields.ProvinceName,
          namaKabupaten: fields['Nama Kabupaten '] || fields['Nama Kabupaten'] || fields.namaKabupaten || fields.nama_kabupaten || fields.KabupatenName,
          namaKecamatan: fields['Nama Kecamatan '] || fields['Nama Kecamatan'] || fields.namaKecamatan || fields.nama_kecamatan || fields.KecamatanName,
          kodeProvinsi: kodeProvinsi,
          kodeKabupaten: kodeKabupaten,
          kodeKecamatan: kodeKecamatan,
          jumlah_penduduk: fields['Population '] || fields.Population || fields.jumlah_penduduk || fields.population,
          jumlah_kk: fields.jumlah_kk || fields.households,
          zoomMin: parseFloat(fields['Zoom Min']) || fields.zoomMin || fields.zoom_min || 0,
          zoomMax: parseFloat(fields['Zoom Max']) || fields.zoomMax || fields.zoom_max || 22,
          // Include all other fields
          ...fields
        };

        return {
          type: 'Feature',
          geometry: geometry,
          properties: properties
        };
      }).filter(feature => feature !== null); // Remove null features

      // Helper function: Check if coordinates are within Sumatra bounds
      const isWithinSumatraBounds = (geometry) => {
        const sumatraBounds = {
          west: 94.5,
          east: 106.5,
          south: -6.0,
          north: 6.5
        };

        // Extract coordinates based on geometry type
        let coords = [];
        if (geometry.type === 'Polygon') {
          coords = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
          // Check first polygon
          coords = geometry.coordinates[0]?.[0] || [];
        }

        // Check if at least one coordinate is within Sumatra bounds
        const hasValidCoords = coords.some(coord => {
          const [lng, lat] = coord;
          return lng >= sumatraBounds.west && lng <= sumatraBounds.east &&
                 lat >= sumatraBounds.south && lat <= sumatraBounds.north;
        });

        return hasValidCoords;
      };

      // Filter by zoom level if zoomMin/zoomMax fields exist
      // ALSO FILTER OUT KECAMATAN - only show provinsi and kabupaten
      const filteredFeatures = features.filter(feature => {
        const adminLevel = feature.properties.adminLevel || feature.properties.admin_level;

        // ❌ EXCLUDE kecamatan - only show provinsi and kabupaten/kota
        if (adminLevel === 'kecamatan') {
          return false;
        }

        // ❌ EXCLUDE boundaries with invalid coordinates (outside Sumatra)
        if (!isWithinSumatraBounds(feature.geometry)) {
          console.warn('⚠️ [Airtable] Skipping boundary outside Sumatra:', {
            nama: feature.properties.namaProvinsi || feature.properties.namaKabupaten,
            adminLevel: adminLevel
          });
          return false;
        }

        const zoomMin = feature.properties.zoomMin || feature.properties.zoom_min || 0;
        const zoomMax = feature.properties.zoomMax || feature.properties.zoom_max || 22;
        const inRange = zoom >= zoomMin && zoom <= zoomMax;

        return inRange;
      });

      // Return GeoJSON FeatureCollection
      const geojson = {
        type: 'FeatureCollection',
        features: filteredFeatures.length > 0 ? filteredFeatures : features
      };

      return geojson;
    } catch (error) {
      console.error('❌ [Airtable] Error fetching boundaries:', error);
      throw error;
    }
  },

  getBoundariesByZoom: async (zoom) => {
    // Alias for getBoundaries with zoom parameter
    return airtableService.getBoundaries(zoom);
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
