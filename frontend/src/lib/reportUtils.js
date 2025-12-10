import { SEVERITY_CONFIG } from './constants';

/**
 * Get damage severity level based on kerusakan value
 * Matches the color gradient used in Map.jsx (line 417-427)
 *
 * @param {number} kerusakan - Total damage count from Locations table
 * @returns {string} Severity level key ('no-damage', 'minimal', 'light', 'moderate', 'significant', 'severe', 'catastrophic')
 */
export const getDamageSeverity = (kerusakan) => {
  const damage = parseFloat(kerusakan) || 0;

  // Find matching severity level based on damage range
  for (const [key, config] of Object.entries(SEVERITY_CONFIG)) {
    if (damage >= config.min && damage < config.max) {
      return key;
    }
  }

  // Default to no-damage if no match found
  return 'no-damage';
};

/**
 * Get location damage value from localStorage
 * Searches cached locations data and returns kerusakan value
 *
 * @param {string} locationName - Name of the location (provinsi or kabupaten)
 * @returns {number} Kerusakan value (0 if not found)
 */
export const getLocationDamage = (locationName) => {
  if (!locationName) {
    console.log('🔍 [getLocationDamage] No locationName provided');
    return 0;
  }

  try {
    // Load locations from localStorage
    const cachedLocations = localStorage.getItem('kawalBanjir_locations_minimal');
    if (!cachedLocations) {
      console.warn('🔍 [getLocationDamage] No cached locations in localStorage');
      return 0;
    }

    const locations = JSON.parse(cachedLocations);
    if (!Array.isArray(locations)) {
      console.warn('🔍 [getLocationDamage] Cached locations is not an array');
      return 0;
    }

    console.log('🔍 [getLocationDamage] Searching for:', locationName);
    console.log('🔍 [getLocationDamage] Total locations in cache:', locations.length);

    // 🔥 Log locations with damage > 0 for debugging
    const locationsWithDamage = locations.filter(loc => (loc.Kerusakan || 0) > 0);
    console.log(`🔍 [getLocationDamage] Locations with damage (${locationsWithDamage.length} total):`);
    locationsWithDamage.slice(0, 10).forEach((loc, i) => {
      console.log(`  ${i + 1}. ${loc['Loc Name'] || loc.Name} (Type: ${loc.Type}, Kerusakan: ${loc.Kerusakan})`);
    });

    // Helper: normalize name for matching
    const normalizeName = (name) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .trim()
        .replace(/^(kabupaten|kota|provinsi)\s+/i, '')  // Remove prefix
        .replace(/sumatra/g, 'sumatera')  // Normalize variants
        .replace(/sumatera/g, 'sumatra')  // Also normalize back (bidirectional)
        .replace(/\s+/g, ' ');  // Normalize spaces
    };

    const normalizedSearchName = normalizeName(locationName);
    console.log('🔍 [getLocationDamage] Normalized search name:', normalizedSearchName);

    // Search for matching location
    // Try exact match first, then contains match
    let exactMatch = null;
    let containsMatches = [];

    for (const loc of locations) {
      const locName = normalizeName(loc['Loc Name'] || loc.Name || '');
      if (!locName) continue;

      // Exact match (highest priority)
      if (locName === normalizedSearchName) {
        exactMatch = loc;
        console.log('✅ [getLocationDamage] EXACT MATCH found:', loc['Loc Name'], 'Kerusakan:', loc.Kerusakan);
        break;
      }

      // Contains match (collect for shortest selection)
      if (locName.includes(normalizedSearchName) || normalizedSearchName.includes(locName)) {
        containsMatches.push({
          location: loc,
          length: locName.length
        });
      }
    }

    // Select best match
    let matchedLocation = null;

    if (exactMatch) {
      matchedLocation = exactMatch;
    } else if (containsMatches.length > 0) {
      console.log(`🔍 [getLocationDamage] Found ${containsMatches.length} contains matches:`);
      containsMatches.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.location['Loc Name']} (Kerusakan: ${m.location.Kerusakan})`);
      });

      // Pick shortest match (most specific)
      const shortest = containsMatches.reduce((shortest, current) =>
        current.length < shortest.length ? current : shortest
      );
      matchedLocation = shortest.location;
      console.log('✅ [getLocationDamage] BEST MATCH (shortest):', matchedLocation['Loc Name'], 'Kerusakan:', matchedLocation.Kerusakan);
    }

    if (matchedLocation) {
      const damage = parseFloat(matchedLocation.Kerusakan) || 0;
      console.log('✅ [getLocationDamage] Final result:', damage);
      return damage;
    }

    console.warn('❌ [getLocationDamage] NO MATCH found for:', locationName);
    return 0;
  } catch (error) {
    console.error('❌ [getLocationDamage] Error:', error);
    return 0;
  }
};

/**
 * Get damage severity configuration for a report
 * Combines location lookup and severity calculation
 *
 * @param {Object} report - Report object with locationName or kabupatenName
 * @returns {Object} Severity configuration from SEVERITY_CONFIG
 */
export const getReportSeverity = (report) => {
  if (!report) {
    console.log('🔍 [getReportSeverity] No report provided');
    return SEVERITY_CONFIG['no-damage'];
  }

  console.group('🔍 [getReportSeverity] Processing report');

  // Log all available location fields
  console.log('Report location fields:', {
    'Loc Name (from Locations)': report['Loc Name (from Locations)'],
    kabupatenName: report.kabupatenName,
    provinsiName: report.provinsiName,
    locationName: report.locationName,
    'Location Text': report['Location Text'],
    bpsCode: report.bpsCode
  });

  // 🔥 Try to get location name from various fields
  // Priority: Loc Name (from Locations) > kabupatenName > provinsiName > locationName
  let locationName = '';

  // Handle Airtable lookup field (can be array or string)
  const locNameLookup = report['Loc Name (from Locations)'];
  if (locNameLookup) {
    if (Array.isArray(locNameLookup) && locNameLookup.length > 0) {
      locationName = locNameLookup[0];
    } else if (typeof locNameLookup === 'string') {
      locationName = locNameLookup;
    }
  }

  // Fallback to other fields
  if (!locationName) {
    locationName = report.kabupatenName ||
                  report.provinsiName ||
                  report.locationName ||
                  report['Location Text'] ||
                  '';
  }

  console.log('Selected locationName for lookup:', locationName);

  // Get damage value for this location
  const damage = getLocationDamage(locationName);

  // Get severity level
  const severityKey = getDamageSeverity(damage);
  console.log('Severity key:', severityKey, 'for damage:', damage);

  console.groupEnd();

  // Return severity config
  return SEVERITY_CONFIG[severityKey] || SEVERITY_CONFIG['no-damage'];
};
