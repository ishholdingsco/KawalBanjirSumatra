import { useState, useEffect, useCallback } from 'react';
import { airtableService } from '../services/airtable';

// Local storage keys
const CACHE_KEYS = {
  BOUNDARIES: 'kawalBanjir_boundaries',
  LOCATIONS: 'kawalBanjir_locations',
  NEWS: 'kawalBanjir_news',
  REPORTS: 'kawalBanjir_reports',
  TIMESTAMP: 'kawalBanjir_timestamp'
};

/**
 * Custom hook for managing cached Airtable data
 * Fetches all data once and stores in localStorage for offline use
 */
export const useCachedData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheReady, setCacheReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Check if cache exists
  const hasCachedData = useCallback(() => {
    try {
      return (
        localStorage.getItem(CACHE_KEYS.BOUNDARIES) &&
        localStorage.getItem(CACHE_KEYS.LOCATIONS) &&
        localStorage.getItem(CACHE_KEYS.NEWS) &&
        localStorage.getItem(CACHE_KEYS.REPORTS) &&
        localStorage.getItem(CACHE_KEYS.TIMESTAMP)
      );
    } catch (e) {
      console.error('Error checking cache:', e);
      return false;
    }
  }, []);

  // Load data from cache (pure function - no state updates!)
  const loadFromCache = useCallback(() => {
    try {
      const boundaries = JSON.parse(localStorage.getItem(CACHE_KEYS.BOUNDARIES));
      const locations = JSON.parse(localStorage.getItem(CACHE_KEYS.LOCATIONS));
      const news = JSON.parse(localStorage.getItem(CACHE_KEYS.NEWS));
      const reports = JSON.parse(localStorage.getItem(CACHE_KEYS.REPORTS));
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);

      // DON'T set state here! This would cause infinite re-renders
      // Just return the data
      return { boundaries, locations, news, reports, timestamp };
    } catch (e) {
      console.error('Error loading from cache:', e);
      return null;
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback((data) => {
    try {
      const timestamp = new Date().toISOString();

      localStorage.setItem(CACHE_KEYS.BOUNDARIES, JSON.stringify(data.boundaries));
      localStorage.setItem(CACHE_KEYS.LOCATIONS, JSON.stringify(data.locations));
      localStorage.setItem(CACHE_KEYS.NEWS, JSON.stringify(data.news));
      localStorage.setItem(CACHE_KEYS.REPORTS, JSON.stringify(data.reports));
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, timestamp);

      setLastUpdated(new Date(timestamp));

      return true;
    } catch (e) {
      console.error('❌ Error saving to cache:', e);
      // Check if quota exceeded
      if (e.name === 'QuotaExceededError') {
        setError('Storage penuh. Silakan hapus data browser atau gunakan mode incognito.');
      }
      return false;
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (e) {
      console.error('Error clearing cache:', e);
      return false;
    }
  }, []);

  // Fetch all data from Airtable (EXCEPT kecamatan)
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel for better performance
      const [boundaries, locations, news, reports] = await Promise.all([
        // Boundaries - excluding kecamatan (already filtered in airtableService)
        airtableService.getBoundaries(0), // zoom 0 = get all (provinsi + kabupaten)

        // Locations - excluding kecamatan (already filtered in airtableService)
        airtableService.getLocations(),

        // News/Status Log - all records
        airtableService.getNews(),

        // Reports - all records
        airtableService.getReportsInbox()
      ]);

      const data = { boundaries, locations, news, reports };

      // Save to cache
      const saved = saveToCache(data);

      if (saved) {
        setCacheReady(true);
        return data;
      } else {
        throw new Error('Failed to save data to cache');
      }
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError(err.message || 'Gagal mengambil data dari Airtable');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [saveToCache]);

  // Refresh data - clear cache and fetch again
  const refreshData = useCallback(async () => {
    clearCache();
    setCacheReady(false);
    return await fetchAllData();
  }, [clearCache, fetchAllData]);

  // Initialize - load from cache or fetch if not available
  useEffect(() => {
    const initialize = async () => {
      if (hasCachedData()) {
        const cached = loadFromCache();
        if (cached) {
          // Set lastUpdated from cached timestamp
          if (cached.timestamp) {
            setLastUpdated(new Date(cached.timestamp));
          }
          setCacheReady(true);
          setIsLoading(false);
          return;
        }
      }

      // No cache or failed to load - fetch from Airtable
      await fetchAllData();
    };

    initialize();
  }, [hasCachedData, loadFromCache, fetchAllData]);

  return {
    isLoading,
    error,
    cacheReady,
    lastUpdated,
    loadFromCache,
    refreshData,
    clearCache,
    hasCachedData: hasCachedData()
  };
};

// ===== CLIENT-SIDE FILTERING FUNCTIONS =====

/**
 * 🔥 NEW: Join Kerusakan data from Locations into Boundaries
 * This enriches boundaries with damage data for color gradient visualization
 */
export const joinKerusakanToBoundaries = (boundaries, locations) => {
  if (!boundaries || !boundaries.features || !locations) {
    return boundaries;
  }

  // Create lookup map: namaWilayah -> kerusakanValue
  const kerusakanMap = {};

  // Filter only Province and Kabupaten/Kota (exclude Kecamatan)
  const relevantLocations = locations.filter(loc =>
    loc.Type === 'Province' || loc.Type === 'Kabupaten' || loc.Type === 'Kota'
  );

  // Helper: normalize name by removing prefix and converting to lowercase
  const normalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/^(kabupaten|kota|provinsi)\s+/i, '')  // Remove prefix
      .replace(/sumatra/g, 'sumatera')  // 🔥 NEW: Normalize Sumatra → Sumatera
      .replace(/\s+/g, ' ');  // Normalize spaces
  };

  // Build kerusakan map
  relevantLocations.forEach((loc) => {
    // Try multiple possible field names for location name
    const rawName = loc.Name || loc.name || loc.Nama || loc.nama ||
                    loc['Loc Name'] || loc.locName || '';

    // Try multiple possible field names for kerusakan
    const kerusakan = loc.Kerusakan || loc.kerusakan ||
                      loc.Damage || loc.damage ||
                      loc['Total Damage'] || loc.totalDamage || 0;

    if (rawName) {
      const normalizedName = normalizeName(rawName);
      const kerusakanValue = parseFloat(kerusakan) || 0;
      kerusakanMap[normalizedName] = kerusakanValue;
    }
  });

  // Enrich boundaries features with kerusakan data
  const enrichedFeatures = boundaries.features.map(feature => {
    const props = feature.properties;
    const adminLevel = props.adminLevel || props.admin_level;
    const namaProvinsi = props.namaProvinsi || props.nama_provinsi || '';
    const namaKabupaten = props.namaKabupaten || props.nama_kabupaten || '';

    // Lookup kerusakan value based on admin level
    // Use normalizeName to match with Locations data
    let kerusakan = 0;
    if (adminLevel === 'kabupaten' && namaKabupaten) {
      const normalizedKabupaten = normalizeName(namaKabupaten);
      kerusakan = kerusakanMap[normalizedKabupaten] || 0;
    } else if (adminLevel === 'provinsi' && namaProvinsi) {
      const normalizedProvinsi = normalizeName(namaProvinsi);
      kerusakan = kerusakanMap[normalizedProvinsi] || 0;
    }

    // Return enriched feature
    return {
      ...feature,
      properties: {
        ...props,
        kerusakan: kerusakan
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features: enrichedFeatures
  };
};

/**
 * Filter boundaries by zoom level
 * 🔥 UPDATED: Prevent overlap between provinsi and kabupaten at zoom level 7
 */
export const filterBoundariesByZoom = (boundaries, zoom) => {
  if (!boundaries || !boundaries.features) return boundaries;

  const filteredFeatures = boundaries.features.filter(feature => {
    const adminLevel = feature.properties.adminLevel || feature.properties.admin_level;

    // 🔥 NEW: Strict zoom filtering to prevent overlap
    if (adminLevel === 'provinsi') {
      // Provinsi: show only at zoom < 7
      return zoom < 7;
    } else if (adminLevel === 'kabupaten') {
      // Kabupaten: show only at zoom >= 7
      return zoom >= 7;
    }

    // Fallback to original logic for other levels (kecamatan, etc)
    const zoomMin = feature.properties.zoomMin || feature.properties.zoom_min || 0;
    const zoomMax = feature.properties.zoomMax || feature.properties.zoom_max || 22;
    return zoom >= zoomMin && zoom <= zoomMax;
  });

  return {
    type: 'FeatureCollection',
    features: filteredFeatures
  };
};

/**
 * Filter news by location name and code
 */
export const filterNewsByLocation = (allNews, locationName, locationCode = null) => {
  if (!allNews || !Array.isArray(allNews)) return [];

  // Helper: normalize string
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/sumatera/g, 'sumatra')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper: normalize BPS code
  const normalizeCode = (code) => {
    if (!code) return null;
    return String(code).replace(/\./g, '').replace(/^0+$/, '00');
  };

  // Helper: extract kabupaten code
  const extractKabupatenCode = (bpsCode) => {
    if (!bpsCode) return null;
    const parts = String(bpsCode).split('.');
    if (parts.length >= 3) return parts.slice(0, 2).join('');
    if (parts.length === 2) return parts.join('');
    return normalizeCode(bpsCode);
  };

  // Default view - Indonesia or Sumatra
  const isDefaultView = !locationName ||
    locationName.toLowerCase() === 'indonesia' ||
    locationName.toLowerCase() === 'sumatra' ||
    locationName.toLowerCase() === 'sumatera';

  if (isDefaultView) {
    return allNews.filter(news => {
      const newsLoc = (news.locationName || '').toLowerCase().trim();
      return newsLoc === 'indonesia' || newsLoc === 'sumatra' || newsLoc === 'sumatera';
    });
  }

  // Filter by location
  const normalizedLocation = normalize(locationName);
  const normalizedSearchCode = locationCode ? normalizeCode(locationCode) : null;

  return allNews.filter(news => {
    const newsLocation = normalize(news.locationName || '');
    if (!newsLocation) return false;

    // Skip generic Sumatra when searching specific province
    const isGenericSumatra = newsLocation === 'sumatra';
    const isSearchingSpecificProvince = normalizedLocation.includes('utara') ||
      normalizedLocation.includes('barat') ||
      normalizedLocation.includes('selatan');

    if (isGenericSumatra && isSearchingSpecificProvince) {
      return false;
    }

    // Match by name
    const nameMatch = newsLocation === normalizedLocation ||
      newsLocation.includes(normalizedLocation) ||
      normalizedLocation.includes(newsLocation);

    if (nameMatch) return true;

    // Match by BPS code hierarchy
    if (normalizedSearchCode && news.locationCode) {
      const newsKabCode = extractKabupatenCode(news.locationCode);
      if (newsKabCode && newsKabCode === normalizedSearchCode) {
        return true;
      }

      const newsProvinsiCode = normalizeCode(news.locationCode);
      if (newsProvinsiCode && newsProvinsiCode === normalizedSearchCode) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Filter reports by location/region
 */
export const filterReportsByLocation = (allReports, regionData = null) => {
  if (!allReports || !Array.isArray(allReports)) return [];
  if (!regionData) return allReports;

  // Helper: normalize string
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/sumatera/g, 'sumatra')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const namaProvinsi = normalize(regionData.namaProvinsi || '');
  const namaKabupaten = normalize(regionData.namaKabupaten || '');
  const namaKecamatan = normalize(regionData.namaKecamatan || '');

  return allReports.filter(report => {
    const locationText = normalize(report['Location Text'] || report.locationText || report.locationName || '');
    const locationsLinked = report.Locations || report.locations || '';
    const locName = normalize(report['Loc Name (from Locations)'] || '');

    if (!locationText && !locationsLinked && !locName) {
      return false;
    }

    const combinedLocation = `${locationText} ${locationsLinked} ${locName}`.toLowerCase();

    // Match by admin level
    if (regionData.adminLevel === 'provinsi' && namaProvinsi) {
      return combinedLocation.includes(namaProvinsi) || namaProvinsi.includes(locationText);
    } else if (regionData.adminLevel === 'kabupaten' && namaKabupaten) {
      return combinedLocation.includes(namaKabupaten) || namaKabupaten.includes(locationText);
    } else if (regionData.adminLevel === 'kecamatan' && namaKecamatan) {
      return combinedLocation.includes(namaKecamatan) || namaKecamatan.includes(locationText);
    }

    return false;
  });
};

/**
 * Calculate statistics from locations data
 */
export const calculateStatistics = (locations) => {
  if (!locations || !Array.isArray(locations)) {
    return {
      totalKorbanMeninggal: 0,
      totalKorbanHilang: 0,
      totalKorbanLukaSakit: 0,
      totalPengungsi: 0,
      totalKorban: 0,
      totalRumahRusakBerat: 0,
      totalRumahRusakSedang: 0,
      totalRumahRusakRingan: 0,
      totalRumahRusak: 0,
      totalPendidikanRusak: 0,
      totalFasyankesRusak: 0,
      totalRumahIbadatRusak: 0,
      totalJembatanRusak: 0,
      totalInfrastrukturRusak: 0,
      totalKerusakan: 0,
      lastSync: null,
      sumberData: 'BNPB'
    };
  }

  const stats = {
    totalKorbanMeninggal: 0,
    totalKorbanHilang: 0,
    totalKorbanLukaSakit: 0,
    totalPengungsi: 0,
    totalRumahRusakBerat: 0,
    totalRumahRusakSedang: 0,
    totalRumahRusakRingan: 0,
    totalRumahRusak: 0,
    totalPendidikanRusak: 0,
    totalFasyankesRusak: 0,
    totalRumahIbadatRusak: 0,
    totalJembatanRusak: 0,
    totalInfrastrukturRusak: 0,
    totalKerusakan: 0,
    lastSync: null,
    sumberData: 'BNPB'
  };

  locations.forEach(loc => {
    stats.totalKorbanMeninggal += loc.Meninggal || 0;
    stats.totalKorbanHilang += loc.Hilang || 0;
    stats.totalKorbanLukaSakit += loc.Luka_Sakit || 0;
    stats.totalPengungsi += loc['Final Displaced'] || loc.Menderita_Mengungsi || loc.Mengungsi || 0;

    stats.totalRumahRusakBerat += loc.Rumah_Rusak_Berat || 0;
    stats.totalRumahRusakSedang += loc.Rumah_Rusak_Sedang || 0;
    stats.totalRumahRusakRingan += loc.Rumah_Rusak_Ringan || 0;

    stats.totalPendidikanRusak += loc.Pendidikan_Rusak || 0;
    stats.totalFasyankesRusak += loc.Fasyankes_Rusak || 0;
    stats.totalRumahIbadatRusak += loc.Rumah_Ibadat_Rusak || 0;
    stats.totalJembatanRusak += loc.Jembatan_Rusak || 0;

    stats.totalKerusakan += loc.Kerusakan || 0;

    if (loc['Last Updated']) {
      const syncTime = new Date(loc['Last Updated']);
      if (!stats.lastSync || syncTime > new Date(stats.lastSync)) {
        stats.lastSync = loc['Last Updated'];
      }
    }
  });

  stats.totalRumahRusak = stats.totalRumahRusakBerat + stats.totalRumahRusakSedang + stats.totalRumahRusakRingan;
  stats.totalInfrastrukturRusak = stats.totalPendidikanRusak + stats.totalFasyankesRusak +
    stats.totalRumahIbadatRusak + stats.totalJembatanRusak;
  stats.totalKorban = stats.totalKorbanMeninggal + stats.totalKorbanHilang + stats.totalKorbanLukaSakit;

  return stats;
};

/**
 * Calculate Sumatra-wide statistics
 */
export const calculateSumatraStatistics = (locations) => {
  // Filter only Kabupaten/Kota to avoid double counting
  const kabupatenLocations = locations.filter(loc =>
    loc.Type === 'Kabupaten' || loc.Type === 'Kota'
  );

  const stats = calculateStatistics(kabupatenLocations);

  return {
    ...stats,
    regionName: 'Data Banjir Sumatra'
  };
};

/**
 * Calculate statistics by province
 */
export const calculateStatisticsByProvinsi = (locations, kodeProvinsi, namaProvinsi) => {
  // Filter only Kabupaten/Kota
  const kabupatenLocations = locations.filter(loc =>
    (loc.Type === 'Kabupaten' || loc.Type === 'Kota')
  );

  // Filter by province using BPS Code
  const provinceLocations = kabupatenLocations.filter(loc => {
    const bpsCode = loc['BPS Code'];

    if (bpsCode) {
      const bpsCodeStr = String(bpsCode).trim();
      const provinceCodeFromBPS = bpsCodeStr.split('.')[0];

      if (kodeProvinsi) {
        const provinceCode = String(kodeProvinsi).substring(0, 2);
        return provinceCodeFromBPS === provinceCode;
      }

      // Fallback: match by name
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

  return {
    ...stats,
    regionName: namaProvinsi || 'Provinsi'
  };
};

/**
 * Calculate statistics by kabupaten
 */
export const calculateStatisticsByKabupaten = (locations, namaKabupaten) => {
  // Helper: normalize for matching
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/^(kabupaten|kota)\s+/i, '')
      .trim();
  };

  const searchName = normalize(namaKabupaten);

  // Filter all kabupaten/kota first
  const allKabupaten = locations.filter(loc =>
    loc.Type === 'Kabupaten' || loc.Type === 'Kota'
  );

  // Find matches with priority: exact > shortest contains
  let exactMatch = null;
  let containsMatches = [];

  for (const loc of allKabupaten) {
    const locName = normalize(loc['Loc Name'] || '');
    if (!locName) continue;

    // Exact match (highest priority)
    if (locName === searchName) {
      exactMatch = loc;
      break;
    }

    // Contains match (collect all for shortest selection)
    if (locName.includes(searchName) || searchName.includes(locName)) {
      containsMatches.push({
        location: loc,
        length: locName.length
      });
    }
  }

  // Select best match
  let kabupatenLocation = null;

  if (exactMatch) {
    kabupatenLocation = exactMatch;
  } else if (containsMatches.length > 0) {
    // Pick shortest match (most specific)
    const shortest = containsMatches.reduce((shortest, current) =>
      current.length < shortest.length ? current : shortest
    );
    kabupatenLocation = shortest.location;
  }

  if (kabupatenLocation) {
    const stats = calculateStatistics([kabupatenLocation]);
    return {
      ...stats,
      regionName: kabupatenLocation['Loc Name'] || namaKabupaten
    };
  }

  // Not found - return empty stats
  return {
    totalKorbanMeninggal: 0,
    totalKorbanHilang: 0,
    totalKorbanLukaSakit: 0,
    totalPengungsi: 0,
    totalKorban: 0,
    regionName: namaKabupaten,
    sumberData: 'BNPB'
  };
};

/**
 * Search boundaries by location name (provinsi, kabupaten, or kecamatan)
 * Returns the first matching boundary with region data
 */
export const searchBoundaries = (boundaries, query) => {
  if (!boundaries || !boundaries.features || !query) return null;

  // Helper: normalize string for comparison
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/sumatera/g, 'sumatra')
      .replace(/^(kabupaten|kota)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedQuery = normalize(query);

  // Search through all boundaries
  // Priority: exact match > starts with > shortest contains
  let exactMatch = null;
  let startsWithMatch = null;
  let containsMatches = []; // Store ALL contains matches to find shortest

  for (const feature of boundaries.features) {
    const props = feature.properties;
    const namaProvinsi = normalize(props.namaProvinsi || props.nama_provinsi || '');
    const namaKabupaten = normalize(props.namaKabupaten || props.nama_kabupaten || '');
    const namaKecamatan = normalize(props.namaKecamatan || props.nama_kecamatan || '');
    const adminLevel = props.adminLevel || props.admin_level;

    // Check each field for matches
    const fields = [
      { name: namaProvinsi, level: 'provinsi', fullName: props.namaProvinsi || props.nama_provinsi },
      { name: namaKabupaten, level: 'kabupaten', fullName: props.namaKabupaten || props.nama_kabupaten },
      { name: namaKecamatan, level: 'kecamatan', fullName: props.namaKecamatan || props.nama_kecamatan }
    ];

    for (const field of fields) {
      if (!field.name) continue;

      // Exact match (highest priority)
      if (field.name === normalizedQuery && adminLevel === field.level) {
        exactMatch = { feature, field, props };
        break;
      }

      // Starts with match (second priority)
      if (field.name.startsWith(normalizedQuery) && adminLevel === field.level && !startsWithMatch) {
        startsWithMatch = { feature, field, props };
      }

      // Contains match (collect ALL, we'll pick shortest later)
      if (field.name.includes(normalizedQuery) && adminLevel === field.level) {
        containsMatches.push({
          feature,
          field,
          props,
          length: field.name.length // Store length for comparison
        });
      }
    }

    if (exactMatch) break;
  }

  // Return best match with improved priority
  let match = null;

  if (exactMatch) {
    match = exactMatch;
  } else if (startsWithMatch) {
    match = startsWithMatch;
  } else if (containsMatches.length > 0) {
    // Pick the SHORTEST contains match (most specific)
    match = containsMatches.reduce((shortest, current) =>
      current.length < shortest.length ? current : shortest
    );
  }

  if (!match) return null;

  const { feature, props } = match;

  // Calculate boundary center for flyTo
  const bounds = calculateBounds(feature.geometry);
  const center = [
    (bounds.west + bounds.east) / 2,
    (bounds.south + bounds.north) / 2
  ];

  // Return region data for handleRegionClick
  return {
    regionData: {
      adminLevel: props.adminLevel || props.admin_level,
      namaProvinsi: props.namaProvinsi || props.nama_provinsi,
      namaKabupaten: props.namaKabupaten || props.nama_kabupaten,
      namaKecamatan: props.namaKecamatan || props.nama_kecamatan,
      kodeProvinsi: props.kodeProvinsi || props.kode_provinsi,
      kodeKabupaten: props.kodeKabupaten || props.kode_kabupaten,
      kodeKecamatan: props.kodeKecamatan || props.kode_kecamatan
    },
    center,
    bounds
  };
};

/**
 * Calculate bounding box from geometry
 */
const calculateBounds = (geometry) => {
  let coords = [];

  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      coords = coords.concat(polygon[0]);
    });
  }

  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;

  coords.forEach(coord => {
    const [lng, lat] = coord;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  });

  return { west, south, east, north };
};

/**
 * Extract parent BPS code from a location's BPS code
 * Examples:
 * - "13.71.01" (Kecamatan) → "13.71" (Kabupaten/Kota)
 * - "13.71" (Kabupaten/Kota) → "13" (Provinsi)
 * - "13" (Provinsi) → null
 */
export const getParentBPSCode = (bpsCode) => {
  if (!bpsCode) return null;

  const parts = bpsCode.toString().split('.');
  if (parts.length <= 1) return null; // Already at province level

  // Remove the last part to get parent
  parts.pop();
  return parts.join('.');
};

/**
 * Search locations by name (including Kecamatan)
 * Returns location data with BPS code for parent lookup
 */
export const searchLocations = (locations, query) => {
  if (!locations || !query) return null;

  // Helper: normalize string for comparison
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/sumatera/g, 'sumatra')
      .replace(/^(kabupaten|kota|kecamatan)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedQuery = normalize(query);

  // Search through all locations
  // Priority: exact match > starts with > contains
  let exactMatch = null;
  let startsWithMatch = null;
  let containsMatch = null;

  for (const location of locations) {
    const locName = normalize(location['Loc Name'] || '');
    const bpsCode = location['BPS Code'];
    const type = location['Type'];

    if (!locName) continue;

    // Exact match
    if (locName === normalizedQuery && !exactMatch) {
      exactMatch = { location, locName, bpsCode, type };
      break;
    }

    // Starts with match
    if (locName.startsWith(normalizedQuery) && !startsWithMatch) {
      startsWithMatch = { location, locName, bpsCode, type };
    }

    // Contains match
    if (locName.includes(normalizedQuery) && !containsMatch) {
      containsMatch = { location, locName, bpsCode, type };
    }
  }

  // Return best match
  return exactMatch || startsWithMatch || containsMatch;
};

/**
 * Enhanced search that looks in both boundaries AND locations
 * If a Kecamatan is found in locations, it maps to parent Kabupaten/Kota boundary
 */
export const searchWithLocations = (boundaries, locations, query) => {
  // First, try searching boundaries directly (Province, Kabupaten, Kota)
  const boundaryResult = searchBoundaries(boundaries, query);
  if (boundaryResult) {
    return boundaryResult;
  }

  // If not found in boundaries, search locations (including Kecamatan)
  const locationMatch = searchLocations(locations, query);
  if (!locationMatch) {
    return null;
  }

  const { bpsCode, type } = locationMatch;

  // If it's a Kecamatan, get parent Kabupaten/Kota BPS code
  let searchBPSCode = bpsCode;
  if (type === 'Kecamatan') {
    searchBPSCode = getParentBPSCode(bpsCode);
    if (!searchBPSCode) {
      return null;
    }
  }

  // Normalize BPS code for matching (remove dots)
  // Location format: "11.02" → Boundary format: "1102"
  const normalizedSearchCode = searchBPSCode.toString().replace(/\./g, '');

  // Find the boundary that matches the parent BPS code
  const matchingBoundary = boundaries.features.find(feature => {
    const props = feature.properties;
    const boundaryBPSCode = props.kodeKabupaten || props.kode_kabupaten;

    if (!boundaryBPSCode) return false;

    // Normalize both codes (remove dots) for comparison
    const normalizedBoundaryCode = boundaryBPSCode.toString().replace(/\./g, '');

    // Match by BPS code
    return normalizedBoundaryCode === normalizedSearchCode;
  });

  if (!matchingBoundary) return null;

  // Calculate boundary center for flyTo
  const bounds = calculateBounds(matchingBoundary.geometry);
  const center = [
    (bounds.west + bounds.east) / 2,
    (bounds.south + bounds.north) / 2
  ];

  const props = matchingBoundary.properties;

  // Return region data for handleRegionClick
  return {
    regionData: {
      adminLevel: props.adminLevel || props.admin_level,
      namaProvinsi: props.namaProvinsi || props.nama_provinsi,
      namaKabupaten: props.namaKabupaten || props.nama_kabupaten,
      namaKecamatan: props.namaKecamatan || props.nama_kecamatan,
      kodeProvinsi: props.kodeProvinsi || props.kode_provinsi,
      kodeKabupaten: props.kodeKabupaten || props.kode_kabupaten,
      kodeKecamatan: props.kodeKecamatan || props.kode_kecamatan
    },
    center,
    bounds,
    // Include the original searched location info
    searchedLocation: {
      name: locationMatch.location['Loc Name'],
      type: locationMatch.type,
      bpsCode: locationMatch.bpsCode
    }
  };
};
