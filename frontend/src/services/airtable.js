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

// Helper: Convert Google Drive URL to direct image URL
// Using /thumbnail endpoint which works as of 2024-2025
// Reference: https://www.labnol.org/embed/google/drive
const convertGoogleDriveUrl = (url) => {
  if (!url) return null;

  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com')) {
    // Extract file ID from various Google Drive URL formats
    let fileId = null;

    // Format: https://drive.google.com/open?id=FILE_ID
    let match = url.match(/[?&]id=([^&]+)/);
    if (match) {
      fileId = match[1];
    }

    // Format: https://drive.google.com/file/d/FILE_ID/
    if (!fileId) {
      match = url.match(/\/file\/d\/([^\/]+)/);
      if (match) {
        fileId = match[1];
      }
    }

    // Convert to direct image URL using Google User Content CDN
    // Note: File must be shared as "Anyone with the link can view"
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=w2000`;
    }
  }

  // Return original URL if not Google Drive or conversion fails
  return url;
};

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
    throw error;
  }
};

// Airtable Service
export const airtableService = {
  // ===== LOCATIONS =====
  getLocations: async (filters = {}) => {
    try {
      // Fetch all location types including Kecamatan for comprehensive search
      // Kecamatan data is needed for search functionality (to map to parent boundaries)
      const params = {
        filterByFormula: "OR({Type} = 'Province', {Type} = 'Kabupaten', {Type} = 'Kota', {Type} = 'Kecamatan')"
      };

      const records = await getAllRecords(TABLES.LOCATIONS, params);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
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
      throw error;
    }
  },

  // 🔥 NEW: Get location details by BPS Code (for on-demand fetching)
  // Returns full location data with all statistics fields
  getLocationByBpsCode: async (bpsCode) => {
    try {
      const formula = `{BPS Code} = '${bpsCode}'`;
      const params = {
        filterByFormula: formula,
        maxRecords: 1
      };

      const records = await getAllRecords(TABLES.LOCATIONS, params);

      if (records.length === 0) {
        return null;
      }

      return {
        id: records[0].id,
        ...records[0].fields
      };
    } catch (error) {
      console.error(`Error fetching location by BPS Code ${bpsCode}:`, error);
      throw error;
    }
  },

  // ===== REPORTS INBOX =====
  getReportsInbox: async (filters = {}) => {
    try {
      const records = await getAllRecords(TABLES.REPORTS_INBOX);

      const reports = records.map(record => {
        const fields = record.fields;

        // Parse coordinates - handle different formats and field names
        let coordinates = [];
        const coordField = fields.coordinates ||
                          fields.Coordinates ||
                          fields['Location Coordinates'] ||
                          fields['coordinates (from Locations)'] ||  // Lookup field
                          fields['Coordinates (from Locations)'];    // Lookup field

        if (coordField) {
          // Handle Airtable lookup fields (returns array)
          let coordValue = coordField;
          if (Array.isArray(coordField) && coordField.length > 0) {
            coordValue = coordField[0]; // Take first value from lookup array
          }

          if (typeof coordValue === 'string') {
            // Parse string format "lng,lat" or "[lng,lat]"
            const coordStr = coordValue.replace(/[\[\]]/g, '').trim();
            const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              coordinates = [parts[0], parts[1]];
            }
          } else if (Array.isArray(coordValue) && coordValue.length >= 2) {
            coordinates = coordValue;
          }
        }

        // Parse imageUrls - handle string or array and different field names
        let imageUrls = [];
        const imgField = fields.imageUrls || fields.ImageUrls || fields['Image URLs'] || fields.Images || fields.Photo;


        if (imgField) {
          if (typeof imgField === 'string') {
            imageUrls = imgField.split(',').map(url => url.trim());
          } else if (Array.isArray(imgField)) {
            // Airtable attachments are objects with 'url' property
            imageUrls = imgField.map(item => {
              if (typeof item === 'string') return item;
              if (item && item.url) {
                return item.url;
              }
              return null;
            }).filter(url => url !== null);
          }
        }

        // Convert Google Drive URLs to direct image URLs
        imageUrls = imageUrls.map(url => convertGoogleDriveUrl(url)).filter(url => url !== null);


        // NOTE: Coordinates are optional - reports are only shown in sidebar, not on map
        // Only validate coordinates if they exist (for potential future use)
        if (coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
        } else {
          coordinates = []; // Clear invalid coordinates
        }

        // Map field names - support different naming conventions
        // Priority: Use Loc Name lookup field (shows actual name), NOT Locations (which is record ID)
        const locNameLookup = fields['Loc Name (from Locations)'];  // Lookup field - best option
        const bpsCodeLookup = fields['BPS Code (from Locations)'];   // BPS Code lookup
        const locationTextUser = fields['Location Text'];             // User input (provinsi)

        // Extract kabupaten name from lookup (Airtable returns array for lookup fields)
        let kabupatenName = '';
        if (locNameLookup) {
          if (Array.isArray(locNameLookup) && locNameLookup.length > 0) {
            kabupatenName = locNameLookup[0]; // Take first element
          } else if (typeof locNameLookup === 'string') {
            kabupatenName = locNameLookup;
          }
        } else {
        }

        // Extract BPS code for reference
        let bpsCode = '';
        if (bpsCodeLookup) {
          if (Array.isArray(bpsCodeLookup) && bpsCodeLookup.length > 0) {
            bpsCode = bpsCodeLookup[0];
          } else if (typeof bpsCodeLookup === 'string') {
            bpsCode = bpsCodeLookup;
          }
        }

        // Build location name: "Provinsi, Kabupaten" format
        // Example: "Aceh, Kabupaten Aceh Utara"
        let locationName = '';

        // Priority: Try to build "Provinsi, Kabupaten" format
        if (kabupatenName && locationTextUser) {
          // Both available: "Aceh, Kabupaten Aceh Utara"
          locationName = `${locationTextUser}, ${kabupatenName}`;
        } else if (kabupatenName) {
          // Only kabupaten: just show it
          locationName = kabupatenName;
        } else if (locationTextUser) {
          // Only provinsi: just show it (current issue)
          locationName = locationTextUser;
        } else {
          // Fallback
          locationName = fields.locationName || fields.location_name || 'Lokasi tidak diketahui';
        }

        const description = fields.description ||
                           fields.Description ||
                           fields.details ||
                           fields.Details ||
                           '';

        // Get reporter name for display
        const reporterName = fields['Reporter Name'] || fields.ReporterName || fields.reporter_name || '';

        const contactSource = fields.contactSource ||
                             fields.contact_source ||
                             fields['Contact (Social Media Handle)'] ||
                             fields.Contact ||
                             '';

        // Transform to backend-compatible format
        const report = {
          // Include all other fields FIRST (so our custom fields override them)
          ...fields,
          // Then add our processed fields (these will override any conflicts)
          _id: record.id,  // Use Airtable record ID as _id
          id: record.id,   // Keep id for compatibility
          locationName: locationName,  // "Provinsi, Kabupaten" format - OVERRIDE!
          kabupatenName: kabupatenName,  // Just kabupaten name
          provinsiName: locationTextUser,  // Just provinsi name
          bpsCode: bpsCode,  // BPS code for reference
          reporterName: reporterName,  // Reporter name
          description: description,
          category: fields.category || fields.Category || fields.Kategori_Bencana || 'banjir',  // Default to banjir instead of lainnya
          severity: fields.severity || fields.Severity || 'ringan',
          timestamp: fields.timestamp || fields.Timestamp || fields['Submission Time'] || fields.created || fields.Created || new Date().toISOString(),
          contactSource: contactSource,
          imageUrls: imageUrls
        };

        // Add location object only if coordinates are valid
        if (coordinates.length === 2) {
          report.location = {
            type: 'Point',
            coordinates: coordinates
          };
        }

        return report;
      });

      // All reports are valid - no filtering needed (reports don't need coordinates for sidebar display)

      return reports;
    } catch (error) {
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
      throw error;
    }
  },

  // Get reports filtered by location (similar to getNewsByLocation)
  getReportsByLocation: async (regionData = null) => {
    try {

      // Get all reports
      const allReports = await airtableService.getReportsInbox();

      // If no region specified, return all reports
      if (!regionData) {
        return allReports;
      }

      // Helper: normalize string for comparison (remove spaces, lowercase, handle sumatra/sumatera)
      const normalize = (str) => {
        if (!str) return '';
        return str.toLowerCase()
          .replace(/sumatera/g, 'sumatra')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Filter reports by location name matching
      const filteredReports = allReports.filter(report => {
        // Get location from report - check multiple field names
        const locationText = normalize(report['Location Text'] || report.locationText || report.locationName || '');
        const locationsLinked = report.Locations || report.locations || ''; // Linked record (could be name or ID)
        const locName = normalize(report['Loc Name (from Locations)'] || '');

        if (!locationText && !locationsLinked && !locName) {
          return false;
        }

        // Get region names to match
        const namaProvinsi = normalize(regionData.namaProvinsi || '');
        const namaKabupaten = normalize(regionData.namaKabupaten || '');
        const namaKecamatan = normalize(regionData.namaKecamatan || '');

        // Combine all location fields for matching
        const combinedLocation = `${locationText} ${locationsLinked} ${locName}`.toLowerCase();


        // Match by admin level
        if (regionData.adminLevel === 'provinsi' && namaProvinsi) {
          const matches = combinedLocation.includes(namaProvinsi) ||
                         namaProvinsi.includes(locationText);
          return matches;
        } else if (regionData.adminLevel === 'kabupaten' && namaKabupaten) {
          const matches = combinedLocation.includes(namaKabupaten) ||
                         namaKabupaten.includes(locationText);
          return matches;
        } else if (regionData.adminLevel === 'kecamatan' && namaKecamatan) {
          const matches = combinedLocation.includes(namaKecamatan) ||
                         namaKecamatan.includes(locationText);
          return matches;
        }

        return false;
      });

      return filteredReports;
    } catch (error) {
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
      throw error;
    }
  },

  // ===== STATUS LOG / NEWS =====
  getStatusLogs: async (filters = {}) => {
    try {
      const records = await getAllRecords(TABLES.STATUS_LOG);
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      throw error;
    }
  },

  // Get news (alias for getStatusLogs)
  getNews: async () => {
    try {
      const records = await getAllRecords(TABLES.STATUS_LOG);
      return records.map(record => {
        const fields = record.fields;

        // Handle locationName - Airtable lookup fields return ARRAY, not string
        let locationName = '';
        const locNameField = fields['Loc Name (from Locations)'];

        if (locNameField) {
          if (Array.isArray(locNameField)) {
            // Airtable lookup field - take first element
            locationName = locNameField[0] || '';
          } else if (typeof locNameField === 'string') {
            // Already a string
            locationName = locNameField;
          }
        }

        // Handle locationCode - ONLY from BPS Code lookup field, NOT from Locations (which is record ID)
        let locationCode = '';
        const bpsCodeField = fields['BPS Code (from Locations)'];

        if (bpsCodeField) {
          if (Array.isArray(bpsCodeField)) {
            locationCode = bpsCodeField[0] || '';
          } else {
            locationCode = bpsCodeField;
          }
        }

        // Transform to consistent format
        return {
          id: record.id,
          headline: fields.Headline || '',
          locationCode: locationCode,
          locationName: locationName,
          eventTime: fields['Event Time'] || '',
          details: fields.Details || '',
          category: fields.Category || '',
          sourceLink: fields['Source Link'] || '',
          // Include all other fields
          ...fields
        };
      });
    } catch (error) {
      throw error;
    }
  },

  // Helper: Normalize BPS code format (remove dots)
  // "12.03" → "1203", "12.03.29" → "120329"
  normalizeCode: (code) => {
    if (!code) return null;
    return String(code).replace(/\./g, '').replace(/^0+$/, '00'); // Handle "00" case for Sumatra
  },

  // Helper: Extract kabupaten code from kecamatan BPS code
  // "12.03.29" → "1203", "12.03" → "1203", "12" → "12"
  extractKabupatenCode: (bpsCode) => {
    if (!bpsCode) return null;

    const parts = String(bpsCode).split('.');

    // If kecamatan (3 parts: "12.03.29"), extract kabupaten (first 2 parts)
    if (parts.length >= 3) {
      return parts.slice(0, 2).join(''); // "12" + "03" = "1203"
    }

    // If already kabupaten (2 parts: "12.03"), normalize
    if (parts.length === 2) {
      return parts.join(''); // "12" + "03" = "1203"
    }

    // If provinsi (1 part: "12"), return as-is
    return airtableService.normalizeCode(bpsCode);
  },

  // Get news filtered by location name and optionally by location code
  getNewsByLocation: async (locationName, locationCode = null) => {
    try {
      const allNews = await airtableService.getNews();

      // If no location specified or location is "Indonesia" or "Sumatra", return all news
      // INCLUDE both Indonesia and generic Sumatra news as default
      const isDefaultView = !locationName ||
                           locationName.toLowerCase() === 'indonesia' ||
                           locationName.toLowerCase() === 'sumatra' ||
                           locationName.toLowerCase() === 'sumatera';

      if (isDefaultView) {
        return allNews.filter(news => {
          const newsLoc = (news.locationName || '').toLowerCase().trim();
          // Include Indonesia + generic "Sumatra" news (that can't be selected by user)
          return newsLoc === 'indonesia' || newsLoc === 'sumatra' || newsLoc === 'sumatera';
        });
      }

      // Helper function to normalize Sumatra/Sumatera variants
      const normalizeSumatra = (str) => {
        return str.toLowerCase().trim()
          .replace(/sumatera/g, 'sumatra')  // Normalize to "sumatra"
          .replace(/\s+/g, ' ');             // Normalize whitespace
      };

      // Filter by location name (case-insensitive partial match)
      const normalizedLocation = normalizeSumatra(locationName);

      // Normalize search location code for comparison
      const normalizedSearchCode = locationCode ? airtableService.normalizeCode(locationCode) : null;

      const matchedNews = allNews.filter(news => {
        // locationName is now guaranteed to be a string (handled in getNews())
        const newsLocation = normalizeSumatra(news.locationName || '');

        // Skip empty locations
        if (!newsLocation) return false;

        // Skip generic "Sumatra" when searching for specific province
        // e.g., when searching "Sumatra Barat", don't include "Sumatra" news
        const isGenericSumatra = newsLocation === 'sumatra';
        const isSearchingSpecificProvince = normalizedLocation.includes('utara') ||
                                           normalizedLocation.includes('barat') ||
                                           normalizedLocation.includes('selatan');

        if (isGenericSumatra && isSearchingSpecificProvince) {
          return false; // Skip generic Sumatra news when searching specific province
        }

        // 1. Match by location name (exact match or contains)
        const nameMatch = newsLocation === normalizedLocation ||
                         newsLocation.includes(normalizedLocation) ||
                         normalizedLocation.includes(newsLocation);

        if (nameMatch) {
          return true;
        }

        // 2. Match by BPS Code hierarchy (untuk grouping kecamatan ke kabupaten)
        // This allows kecamatan news to appear when user clicks on kabupaten
        if (normalizedSearchCode && news.locationCode) {
          // Extract kabupaten code from news location code
          // If news is kecamatan "12.03.29", extract "1203"
          // If news is kabupaten "12.03", extract "1203"
          const newsKabCode = airtableService.extractKabupatenCode(news.locationCode);

          // If search is for kabupaten "1203", match news with kabupaten code "1203"
          // This makes kecamatan news (12.03.29 → 1203) appear under kabupaten (1203)
          if (newsKabCode && newsKabCode === normalizedSearchCode) {
            return true;
          }

          // Also check direct code match for provinsi level
          const newsProvinsiCode = airtableService.normalizeCode(news.locationCode);
          if (newsProvinsiCode && newsProvinsiCode === normalizedSearchCode) {
            return true;
          }
        }

        return false;
      });

      return matchedNews;
    } catch (error) {
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

      // 🔥 NEW: Fetch Kerusakan data from Locations table
      // Fetch only Province and Kabupaten/Kota (exclude Kecamatan)
      let locationsRecords = [];
      try {
        const locationsParams = {
          filterByFormula: "OR({Type} = 'Province', {Type} = 'Kabupaten', {Type} = 'Kota')"
        };
        locationsRecords = await getAllRecords(TABLES.LOCATIONS, locationsParams);

        // Log available field names from first record
        if (locationsRecords.length > 0) {
        }
      } catch (error) {
        console.error('🔍 DEBUG: ❌❌❌ ERROR fetching Locations ❌❌❌');
        console.error('🔍 DEBUG: Error object:', error);
        console.error('🔍 DEBUG: Error message:', error.message);
        console.error('🔍 DEBUG: Error stack:', error.stack);
        alert('ERROR: Gagal fetch Locations! Check console untuk detail.');
      }

      // Log after try-catch to see what we got

      // Create lookup map: namaWilayah -> kerusakanValue
      // Use normalized names for matching (lowercase, trim spaces)
      const kerusakanMap = {};

      locationsRecords.forEach((record, index) => {
        const fields = record.fields;

        // Try multiple possible field names for location name
        const name = fields.Name || fields.name || fields.Nama || fields.nama ||
                     fields['Location Name'] || fields.locationName || '';

        // Try multiple possible field names for kerusakan
        const kerusakan = fields.Kerusakan || fields.kerusakan ||
                          fields.Damage || fields.damage ||
                          fields['Total Damage'] || fields.totalDamage || 0;

        if (index < 3) {
        }

        if (name) {
          // Normalize name for matching (lowercase, trim)
          const normalizedName = name.toLowerCase().trim();
          const kerusakanValue = parseFloat(kerusakan) || 0;
          kerusakanMap[normalizedName] = kerusakanValue;

          if (index < 5) {
          }
        } else {
          console.warn(`🔍 DEBUG: ⚠️ Record ${index + 1} has no name field!`);
        }
      });

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
              return null;
            }
          } else if (typeof fields.geometry === 'object') {
            geometry = fields.geometry;
          }
        }

        if (!geometry) {
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

        // Get nama wilayah based on admin level for Kerusakan lookup
        const namaProvinsi = fields['Nama Provinsi'] || fields.namaProvinsi || fields.nama_provinsi || fields.ProvinceName || '';
        const namaKabupaten = fields['Nama Kabupaten '] || fields['Nama Kabupaten'] || fields.namaKabupaten || fields.nama_kabupaten || fields.KabupatenName || '';
        const namaKecamatan = fields['Nama Kecamatan '] || fields['Nama Kecamatan'] || fields.namaKecamatan || fields.nama_kecamatan || fields.KecamatanName || '';

        // 🔥 NEW: Lookup Kerusakan value based on admin level
        // Match by name (kabupaten takes priority over provinsi)
        let kerusakan = 0;
        if (adminLevel === 'kabupaten' && namaKabupaten) {
          // Try to match kabupaten name first
          const normalizedKabupaten = namaKabupaten.toLowerCase().trim();
          kerusakan = kerusakanMap[normalizedKabupaten] || 0;

        } else if (adminLevel === 'provinsi' && namaProvinsi) {
          // Match provinsi name
          const normalizedProvinsi = namaProvinsi.toLowerCase().trim();
          kerusakan = kerusakanMap[normalizedProvinsi] || 0;

        }

        const properties = {
          adminLevel: adminLevel,  // Hardcoded logic based on kode fields
          namaProvinsi: namaProvinsi,
          namaKabupaten: namaKabupaten,
          namaKecamatan: namaKecamatan,
          kodeProvinsi: kodeProvinsi,
          kodeKabupaten: kodeKabupaten,
          kodeKecamatan: kodeKecamatan,
          kerusakan: kerusakan,  // 🔥 NEW: Add Kerusakan value
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

      // 🔍 DEBUG: Log summary of kerusakan values in features
      const featuresWithKerusakan = features.filter(f => f.properties.kerusakan > 0);

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
      return {
        status: 'error',
        message: error.message
      };
    }
  }
};

export default airtableService;
