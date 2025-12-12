import { useState, useEffect, useCallback } from 'react';
import { airtableService } from '../services/airtable';

// Local storage keys
const CACHE_KEYS = {
  BOUNDARIES: 'kawalBanjir_boundaries',
  LOCATIONS_MINIMAL: 'kawalBanjir_locations_minimal', // 🔥 NEW: Only essential fields
  TIMESTAMP: 'kawalBanjir_timestamp'
  // 🔥 REMOVED: NEWS and REPORTS (fetch on-demand instead)
};

// 🔍 Utility: Calculate size of localStorage items
const getLocalStorageSize = () => {
  let totalSize = 0;
  const sizes = {};

  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const itemSize = ((localStorage[key].length + key.length) * 2); // UTF-16 = 2 bytes per char
      sizes[key] = {
        sizeBytes: itemSize,
        sizeKB: (itemSize / 1024).toFixed(2),
        sizeMB: (itemSize / 1024 / 1024).toFixed(2)
      };
      totalSize += itemSize;
    }
  }

  return {
    items: sizes,
    totalBytes: totalSize,
    totalKB: (totalSize / 1024).toFixed(2),
    totalMB: (totalSize / 1024 / 1024).toFixed(2)
  };
};

// 🔍 Utility: Log localStorage usage to console
const logLocalStorageUsage = () => {
  const usage = getLocalStorageSize();

  console.group('📊 LOCAL STORAGE USAGE');
  console.log(`Total Size: ${usage.totalMB} MB (${usage.totalKB} KB)`);
  console.log('');

  // Sort by size (largest first)
  const sortedItems = Object.entries(usage.items)
    .sort((a, b) => b[1].sizeBytes - a[1].sizeBytes);

  console.table(
    sortedItems.map(([key, size]) => ({
      'Key': key,
      'Size (MB)': size.sizeMB,
      'Size (KB)': size.sizeKB,
      'Size (Bytes)': size.sizeBytes.toLocaleString()
    }))
  );

  console.groupEnd();

  return usage;
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
        localStorage.getItem(CACHE_KEYS.LOCATIONS_MINIMAL) &&
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
      const locationsMinimal = JSON.parse(localStorage.getItem(CACHE_KEYS.LOCATIONS_MINIMAL));
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);

      // Note: localStorage usage logging disabled for production

      // DON'T set state here! This would cause infinite re-renders
      // Just return the data
      return {
        boundaries,
        locations: locationsMinimal, // Return as 'locations' for backward compatibility
        timestamp
      };
    } catch (e) {
      console.error('Error loading from cache:', e);
      return null;
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback((data) => {
    try {
      const timestamp = new Date().toISOString();

      // 🔥 Filter locations to keep only essential fields (80% size reduction!)
      const locationsMinimal = data.locations.map(loc => ({
        id: loc.id,
        'Loc Name': loc['Loc Name'],
        'BPS Code': loc['BPS Code'],
        'Type': loc['Type'], // 🔥 IMPORTANT: Needed for joinKerusakanToBoundaries()
        'Kerusakan': loc['Kerusakan'] || 0 // Total damage count
      }));

      // Save only boundaries and minimal locations
      localStorage.setItem(CACHE_KEYS.BOUNDARIES, JSON.stringify(data.boundaries));
      localStorage.setItem(CACHE_KEYS.LOCATIONS_MINIMAL, JSON.stringify(locationsMinimal));
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, timestamp);

      setLastUpdated(new Date(timestamp));

      // Note: Storage usage logging disabled for production

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
      // Clear current cache keys
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      // 🧹 Cleanup old cache keys from previous version
      const oldKeys = [
        'kawalBanjir_locations',  // Old full locations
        'kawalBanjir_news',       // Removed (fetch on-demand)
        'kawalBanjir_reports'     // Removed (fetch on-demand)
      ];
      oldKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      return true;
    } catch (e) {
      console.error('Error clearing cache:', e);
      return false;
    }
  }, []);

  // Fetch essential data for initial load (boundaries + locations minimal)
  // 🔥 NEWS and REPORTS are fetched on-demand in App.jsx
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch only essential data for map display
      const [boundaries, locations] = await Promise.all([
        // Boundaries - excluding kecamatan (already filtered in airtableService)
        airtableService.getBoundaries(0), // zoom 0 = get all (provinsi + kabupaten)

        // Locations - we'll filter to minimal fields in saveToCache()
        airtableService.getLocations()
      ]);

      const data = { boundaries, locations };

      // Save to cache (will automatically filter locations to minimal fields)
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
      // 🧹 Cleanup old cache keys from previous version (one-time migration)
      const oldKeys = ['kawalBanjir_locations', 'kawalBanjir_news', 'kawalBanjir_reports'];
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });

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

  // Helper: normalize BPS code (remove dots)
  const normalizeCode = (code) => {
    if (!code) return null;
    return String(code).replace(/\./g, '').replace(/^0+$/, '00');
  };

  // Helper: extract provinsi code from BPS code
  // "12" → "12", "1203" → "12", "12.03" → "12", "12.03.29" → "12"
  const extractProvinsiCode = (bpsCode) => {
    if (!bpsCode) return null;
    const normalized = normalizeCode(bpsCode);

    // Take first 2 digits as provinsi code
    return normalized.substring(0, 2);
  };

  // Helper: extract kabupaten code from BPS code (remove dots)
  // "120329" → "1203", "1203" → "1203", "12.03.29" → "1203", "12.03" → "1203"
  const extractKabupatenCode = (bpsCode) => {
    if (!bpsCode) return null;
    const normalized = normalizeCode(bpsCode);

    // If length >= 4, take first 4 digits as kabupaten code
    if (normalized.length >= 4) {
      return normalized.substring(0, 4);
    }

    // If length < 4 (provinsi only), return as-is
    return normalized;
  };

  // Helper: get admin level from BPS code
  // Support both formats: with dots ("12.03") and without ("1203")
  // "12" or "11" → "provinsi"
  // "1203" or "12.03" → "kabupaten"
  // "120329" or "12.03.29" → "kecamatan"
  const getAdminLevel = (bpsCode) => {
    if (!bpsCode) return null;

    // Normalize to remove dots for consistent length checking
    const normalized = normalizeCode(bpsCode);
    const length = normalized.length;

    if (length >= 6) return 'kecamatan';  // 6 digits: "110818" or "11.08.18"
    if (length >= 4) return 'kabupaten';  // 4 digits: "1108" or "11.08"
    return 'provinsi';                    // 2 digits: "11" or "12"
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

  // Determine search admin level from locationCode (only provinsi or kabupaten can be clicked)
  const searchAdminLevel = locationCode ? getAdminLevel(locationCode) : null;
  const searchProvinsiCode = locationCode ? extractProvinsiCode(locationCode) : null;
  const searchKabupatenCode = locationCode ? extractKabupatenCode(locationCode) : null;

  // Filter by location
  const normalizedLocation = normalize(locationName);

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

    // Match by name - but validate hierarchy to avoid false positives
    // IMPORTANT: Don't match parent provinsi when child kabupaten is selected
    // Example: "Aceh Utara" (kabupaten) should NOT match "Aceh" (provinsi)
    const nameMatch = newsLocation === normalizedLocation ||
      newsLocation.includes(normalizedLocation) ||
      normalizedLocation.includes(newsLocation);

    if (nameMatch) {
      // If we have locationCode, validate that this is not a provinsi parent
      if (locationCode && news.locationCode) {
        const newsAdminLevel = getAdminLevel(news.locationCode);

        // When kabupaten is selected, reject provinsi-level news matched by name
        // This prevents "Aceh" (provinsi) from matching "Aceh Utara" (kabupaten)
        if (searchAdminLevel === 'kabupaten' && newsAdminLevel === 'provinsi') {
          // Check if this is actually a parent provinsi match
          const newsProvinsiCode = extractProvinsiCode(news.locationCode);
          const searchProvinsiCode = extractProvinsiCode(locationCode);

          // If the provinsi codes match, this is the parent provinsi - SKIP it
          if (newsProvinsiCode === searchProvinsiCode) {
            return false;
          }
        }
        // If hierarchy is valid, accept the name match
        return true;
      } else {
        // No locationCode to validate - accept name match
        return true;
      }
    }

    // Match by BPS code hierarchy
    if (!news.locationCode) return false;

    const newsAdminLevel = getAdminLevel(news.locationCode);
    const newsProvinsiCode = extractProvinsiCode(news.locationCode);
    const newsKabupatenCode = extractKabupatenCode(news.locationCode);

    // 🔥 HIERARCHICAL MATCHING (only provinsi and kabupaten can be clicked)
    // When user clicks PROVINSI → show provinsi + all kabupaten + all kecamatan in that provinsi
    if (searchAdminLevel === 'provinsi' && searchProvinsiCode) {
      // Match any news in the same provinsi (provinsi, kabupaten, or kecamatan)
      return newsProvinsiCode === searchProvinsiCode;
    }

    // When user clicks KABUPATEN → show kabupaten + all kecamatan in that kabupaten (NOT provinsi)
    if (searchAdminLevel === 'kabupaten' && searchKabupatenCode) {
      // Match kabupaten or kecamatan in the same kabupaten
      // BUT exclude provinsi-level news (too general)
      if (newsAdminLevel === 'provinsi') {
        return false; // Don't show provinsi news when kabupaten is selected
      }

      // Match if news kabupaten code equals search kabupaten code
      // This will include both kabupaten news (12.03) and kecamatan news (12.03.29)
      return newsKabupatenCode === searchKabupatenCode;
    }

    return false;
  });
};

/**
 * Filter reports by location/region
 * 🔥 UPDATED: Support hierarchical matching using BPS codes (same logic as filterNewsByLocation)
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

  // Helper: normalize BPS code (remove dots)
  const normalizeCode = (code) => {
    if (!code) return null;
    return String(code).replace(/\./g, '').replace(/^0+$/, '00');
  };

  // Helper: extract provinsi code from BPS code
  const extractProvinsiCode = (bpsCode) => {
    if (!bpsCode) return null;
    const normalized = normalizeCode(bpsCode);
    return normalized.substring(0, 2);
  };

  // Helper: extract kabupaten code from BPS code (remove dots)
  const extractKabupatenCode = (bpsCode) => {
    if (!bpsCode) return null;
    const normalized = normalizeCode(bpsCode);
    if (normalized.length >= 4) {
      return normalized.substring(0, 4);
    }
    return normalized;
  };

  // Helper: get admin level from BPS code
  const getAdminLevel = (bpsCode) => {
    if (!bpsCode) return null;
    const normalized = normalizeCode(bpsCode);
    const length = normalized.length;
    if (length >= 6) return 'kecamatan';
    if (length >= 4) return 'kabupaten';
    return 'provinsi';
  };

  // Get search parameters
  const searchLocationName = regionData.namaKabupaten || regionData.namaProvinsi || '';
  const searchLocationCode = regionData.kodeKabupaten || regionData.kodeProvinsi || '';
  const searchAdminLevel = regionData.adminLevel || null;

  const normalizedSearchLocation = normalize(searchLocationName);
  const searchProvinsiCode = searchLocationCode ? extractProvinsiCode(searchLocationCode) : null;
  const searchKabupatenCode = searchLocationCode ? extractKabupatenCode(searchLocationCode) : null;

  return allReports.filter(report => {
    // Get report location info
    const locationText = normalize(report['Location Text'] || report.locationText || report.locationName || '');
    const locName = normalize(report['Loc Name (from Locations)'] || report.kabupatenName || '');
    const reportBpsCode = report.bpsCode || report['BPS Code'] || '';

    if (!locationText && !locName && !reportBpsCode) {
      return false;
    }

    // Match by name - but validate hierarchy to avoid false positives
    const reportLocation = locName || locationText;
    const nameMatch = reportLocation === normalizedSearchLocation ||
      reportLocation.includes(normalizedSearchLocation) ||
      normalizedSearchLocation.includes(reportLocation);

    if (nameMatch) {
      // If we have BPS codes, validate hierarchy
      if (searchLocationCode && reportBpsCode) {
        const reportAdminLevel = getAdminLevel(reportBpsCode);
        const reportProvinsiCode = extractProvinsiCode(reportBpsCode);

        // When kabupaten is selected, reject provinsi-level reports matched by name
        if (searchAdminLevel === 'kabupaten' && reportAdminLevel === 'provinsi') {
          // Check if this is the parent provinsi - SKIP it
          if (reportProvinsiCode === searchProvinsiCode) {
            return false;
          }
        }
        return true;
      } else {
        // No BPS code to validate - accept name match
        return true;
      }
    }

    // Match by BPS code hierarchy
    if (!reportBpsCode) return false;

    const reportAdminLevel = getAdminLevel(reportBpsCode);
    const reportProvinsiCode = extractProvinsiCode(reportBpsCode);
    const reportKabupatenCode = extractKabupatenCode(reportBpsCode);

    // 🔥 HIERARCHICAL MATCHING
    // When PROVINSI selected → show provinsi + all kabupaten + all kecamatan in that provinsi
    if (searchAdminLevel === 'provinsi' && searchProvinsiCode) {
      return reportProvinsiCode === searchProvinsiCode;
    }

    // When KABUPATEN selected → show kabupaten + all kecamatan in that kabupaten (NOT provinsi)
    if (searchAdminLevel === 'kabupaten' && searchKabupatenCode) {
      // Exclude provinsi-level reports
      if (reportAdminLevel === 'provinsi') {
        return false;
      }
      // Match kabupaten and kecamatan in that kabupaten
      return reportKabupatenCode === searchKabupatenCode;
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
      totalMenderita: 0,
      totalMengungsi: 0,
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
    totalMenderita: 0,
    totalMengungsi: 0,
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
    stats.totalMenderita += loc.Menderita || 0;
    stats.totalMengungsi += loc.Mengungsi || 0;

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
  // ✅ Filter only Province level - use aggregated province data
  // Province records already contain totals from all kabupaten/kota below them
  const provinceLocations = locations.filter(loc =>
    loc.Type === 'Province'
  );

  const stats = calculateStatistics(provinceLocations);

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
