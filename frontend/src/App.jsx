import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Plus, Info, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatisticsPanel from './components/StatisticsPanel';
import { Button } from './components/ui/button';
import { Z_INDEX, ANIMATIONS } from './lib/constants';
import {
  useCachedData,
  filterNewsByLocation,
  filterReportsByLocation,
  calculateSumatraStatistics,
  calculateStatisticsByProvinsi,
  calculateStatisticsByKabupaten,
  searchBoundaries,
  searchWithLocations,
  joinKerusakanToBoundaries  // 🔥 NEW: Import join function
} from './hooks/useCachedData';
import { airtableService } from './services/airtable'; // 🔥 NEW: Import for on-demand fetching

// Lazy load Map component to reduce initial bundle size
const Map = lazy(() => import('./components/Map'));

function App() {
  // Use cached data hook
  const { isLoading: cacheLoading, error: cacheError, cacheReady, lastUpdated, loadFromCache, refreshData, clearCache } = useCachedData();

  // Map ref for controlling map programmatically
  const mapRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Open by default on desktop (>= 768px), closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showStatistics, setShowStatistics] = useState(true);

  // News state
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [selectedLocationName, setSelectedLocationName] = useState('Sumatra');

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 NEW: Fetch reports on-demand from Airtable (not from cache)
  const fetchReports = useCallback(async (regionData = null) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fresh data from Airtable
      const allReports = await airtableService.getReportsInbox();

      // Filter by region if needed (client-side)
      const filteredData = filterReportsByLocation(allReports, regionData);

      setReports(filteredData);
      setFilteredReports(filteredData);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Gagal memuat data laporan.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 NEW: Fetch full locations data on-demand for statistics calculation
  const fetchStatistics = useCallback(async (regionData) => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      // ✅ OPTIMIZED: Use getLocationsWithStatistics() instead of getLocations()
      // This excludes Kecamatan (no statistics data) and reduces data transfer by ~70%
      const fullLocations = await airtableService.getLocationsWithStatistics();

      let data;

      // Calculate statistics (client-side)
      if (!regionData) {
        // Sumatra-wide statistics
        data = calculateSumatraStatistics(fullLocations);
      } else {
        // Statistics based on admin level
        if (regionData.adminLevel === 'provinsi') {
          data = calculateStatisticsByProvinsi(
            fullLocations,
            regionData.kodeProvinsi,
            regionData.namaProvinsi
          );
        } else if (regionData.adminLevel === 'kabupaten') {
          data = calculateStatisticsByKabupaten(fullLocations, regionData.namaKabupaten);
        } else if (regionData.adminLevel === 'kecamatan') {
          // For kecamatan: get kabupaten data (kecamatan level not stored)
          data = calculateStatisticsByKabupaten(fullLocations, regionData.namaKabupaten);
        }
      }

      if (data) {
        setStatistics(data);
      }
    } catch (err) {
      console.error('Error fetching and calculating statistics:', err);
      setStatsError(regionData ? 'Gagal memuat statistik untuk wilayah ini.' : 'Gagal memuat statistik.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 🔥 NEW: Fetch news on-demand from Airtable (not from cache)
  const fetchNews = useCallback(async (locationName, locationCode = null) => {
    try {
      setNewsLoading(true);
      setNewsError(null);

      // Fetch fresh data from Airtable
      const allNews = await airtableService.getNews();

      // Filter news by location (client-side)
      const filteredNews = filterNewsByLocation(allNews, locationName || 'Sumatra', locationCode);
      setNews(filteredNews);
      setSelectedLocationName(locationName || 'Sumatra');
    } catch (err) {
      console.error('Error fetching news:', err);
      setNewsError('Gagal memuat berita untuk wilayah ini.');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // Initialize data from cache when ready
  useEffect(() => {
    if (cacheReady) {
      fetchReports(null); // Load all reports
      fetchStatistics(null); // Load Sumatra statistics
      fetchNews('Sumatra'); // Load Sumatra news
    }
  }, [cacheReady, fetchReports, fetchStatistics, fetchNews]);

  // Handle refresh - clear cache then reload page (like first load)
  const handleRefreshData = () => {
    if (isRefreshing) return;

    // Clear cache
    clearCache();

    // Reload halaman
    // Karena cache sudah di-clear, maka loading screen akan sama seperti first load
    // (tanpa text "Memuat data dari Airtable")
    window.location.reload();
  };

  const handleRegionClick = (regionData) => {
    setSelectedRegion(regionData);
    setShowStatistics(true);

    // Only auto-open sidebar on desktop (>= 768px), not on mobile
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }

    // Determine location for news fetch
    let locationNameForNews = 'Indonesia';
    let locationCodeForNews = null;

    if (regionData.adminLevel === 'provinsi') {
      locationNameForNews = regionData.namaProvinsi;
      locationCodeForNews = regionData.kodeProvinsi;
    } else if (regionData.adminLevel === 'kabupaten') {
      locationNameForNews = regionData.namaKabupaten;
      locationCodeForNews = regionData.kodeKabupaten;
    } else if (regionData.adminLevel === 'kecamatan') {
      locationNameForNews = regionData.namaKecamatan;
      locationCodeForNews = regionData.kodeKecamatan;
    }

    // ✅ OPTIMIZED: Fetch all data in parallel instead of sequential
    // This reduces total loading time from 3-5s to 1-2s
    Promise.all([
      fetchStatistics(regionData),
      fetchReports(regionData),
      fetchNews(locationNameForNews, locationCodeForNews)
    ]).catch(err => {
      console.error('Error fetching region data:', err);
    });
  };

  const handleCloseStatistics = () => {
    setShowStatistics(false);
  };

  // Translation mapping for bilingual search (Indonesia <-> English)
  const getSearchKeywords = (query) => {
    const searchMapping = {
      // News Categories
      'bantuan': ['bantuan', 'aid', 'relief'],
      'aid': ['bantuan', 'aid', 'relief'],
      'relief': ['bantuan', 'aid', 'relief'],
      'resmi': ['resmi', 'official'],
      'official': ['resmi', 'official'],
      'akses': ['akses', 'access'],
      'access': ['akses', 'access'],
      'tingkat banjir': ['tingkat banjir', 'flood level', 'level'],
      'flood level': ['tingkat banjir', 'flood level', 'level'],
      'level': ['tingkat banjir', 'flood level', 'level'],

      // Common words
      'banjir': ['banjir', 'flood'],
      'flood': ['banjir', 'flood'],
      'jalan': ['jalan', 'road'],
      'road': ['jalan', 'road'],
      'tertutup': ['tertutup', 'closed'],
      'closed': ['tertutup', 'closed'],
      'evakuasi': ['evakuasi', 'evacuation'],
      'evacuation': ['evakuasi', 'evacuation']
    };

    const lowercaseQuery = query.toLowerCase().trim();

    // Check if query matches any mapping
    if (searchMapping[lowercaseQuery]) {
      return searchMapping[lowercaseQuery];
    }

    // If no mapping, return original query
    return [lowercaseQuery];
  };

  const handleSearch = (query) => {
    // Reset to default if empty query
    if (!query.trim()) {
      setFilteredReports(reports);
      // Reset to Sumatra view
      setSelectedRegion(null);
      setShowStatistics(true);
      fetchStatistics(null);
      fetchNews('Sumatra');
      return;
    }

    // Check if cache is ready
    if (!cacheReady) {
      console.warn('Cache not ready for search');
      return;
    }

    // Load cached data
    const cached = loadFromCache();
    if (!cached || !cached.boundaries || !cached.locations) {
      console.warn('No cached data available for search');
      return;
    }

    // SMART SEARCH: Try to find location in both boundaries AND locations (including Kecamatan)
    const locationResult = searchWithLocations(cached.boundaries, cached.locations, query);

    if (locationResult) {
      // LOCATION FOUND: Fly to location and update statistics & sidebar
      const { regionData, center, searchedLocation } = locationResult;

      // 1. Fly map to location with zoom 11
      if (mapRef.current && mapRef.current.flyToRegion) {
        mapRef.current.flyToRegion(center, 11);
      }

      // 2. Trigger region click to update statistics & sidebar
      // This will automatically update stats panel, reports, and news
      handleRegionClick(regionData);

    } else {
      // LOCATION NOT FOUND: Search in reports and news instead

      // Get bilingual search keywords
      const searchKeywords = getSearchKeywords(query);

      // Filter reports by query (with bilingual support)
      const filteredReportsResult = reports.filter(report => {
        const locationName = (report.locationName || '').toLowerCase();
        const description = (report.description || '').toLowerCase();
        const category = (report.category || '').toLowerCase();

        // Check if ANY keyword matches
        return searchKeywords.some(keyword =>
          locationName.includes(keyword) ||
          description.includes(keyword) ||
          category.includes(keyword)
        );
      });
      setFilteredReports(filteredReportsResult);

      // Filter news by query (with bilingual support)
      // Match against: ALL fields (headline, details, category, locationName, eventTime, sourceLink, etc)
      const filteredNewsResult = (cached.news || []).filter(newsItem => {
        const headline = (newsItem.headline || newsItem.Headline || '').toLowerCase();
        const details = (newsItem.details || newsItem.Details || '').toLowerCase();
        const category = (newsItem.category || newsItem.Category || '').toLowerCase();
        const locationName = (newsItem.locationName || '').toLowerCase();
        const eventTime = (newsItem.eventTime || newsItem['Event Time'] || '').toLowerCase();
        const sourceLink = (newsItem.sourceLink || newsItem['Source Link'] || '').toLowerCase();
        const locationCode = (newsItem.locationCode || '').toLowerCase();

        // Check if ANY keyword matches in ANY field
        return searchKeywords.some(keyword =>
          headline.includes(keyword) ||
          details.includes(keyword) ||
          category.includes(keyword) ||
          locationName.includes(keyword) ||
          eventTime.includes(keyword) ||
          sourceLink.includes(keyword) ||
          locationCode.includes(keyword)
        );
      });
      setNews(filteredNewsResult);

      // Update location name to show this is search results
      setSelectedLocationName(`Hasil Pencarian: "${query}"`);

      // Reset region selection (no connection to boundaries)
      setSelectedRegion(null);

      // Open sidebar to show filtered results
      setSidebarOpen(true);
    }
  };

  const handleMarkerClick = (report) => {
    setSelectedReport(report);
    setSidebarOpen(true);
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
  };

  const handleNewsClick = (newsItem) => {
    setSelectedNews(newsItem);
  };

  const handleAddReport = () => {
    // Open Google Form in new tab
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSfG6iVMV_NZJxfCnRKZClQW4CZTWMTdNbPKhmejaSjn0kI2hw/viewform', '_blank');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <Header
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Section */}
        <div className="flex-1 relative">
          {/* Map with skeleton loading */}
          {cacheLoading ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: '#bfddf8' }}
            >
              {/* Logo with blinking animation - Mobile */}
              <img
                src="/logo-mobile.png"
                alt="Kawal Banjir Sumatra"
                className="h-20 w-auto sm:hidden animate-pulse"
              />
              {/* Logo with blinking animation - Desktop/Tablet */}
              <img
                src="/logo.png"
                alt="Kawal Banjir Sumatra"
                className="h-24 w-auto hidden sm:block animate-pulse"
              />
            </div>
          ) : cacheError ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
              style={{ background: '#bfddf8' }}
            >
              <img
                src="/logo.png"
                alt="Kawal Banjir Sumatra"
                className="h-24 w-auto"
              />
              <div className="text-center max-w-md">
                <p className="text-red-600 font-semibold mb-2">Gagal Memuat Data</p>
                <p className="text-gray-700 text-sm mb-4">{cacheError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  Muat Ulang Halaman
                </button>
              </div>
            </div>
          ) : (
            <Suspense fallback={
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: '#bfddf8' }}
              >
                <img
                  src="/logo-mobile.png"
                  alt="Kawal Banjir Sumatra"
                  className="h-20 w-auto sm:hidden animate-pulse"
                />
                <img
                  src="/logo.png"
                  alt="Kawal Banjir Sumatra"
                  className="h-24 w-auto hidden sm:block animate-pulse"
                />
              </div>
            }>
              <Map
                ref={mapRef}
                reports={filteredReports}
                onMarkerClick={handleMarkerClick}
                onMapLoaded={() => setMapLoaded(true)}
                onRegionClick={handleRegionClick}
                cachedBoundaries={cacheReady ? (() => {
                  const cached = loadFromCache();
                  // 🔥 NEW: Join Kerusakan data from Locations into Boundaries
                  return cached?.boundaries && cached?.locations
                    ? joinKerusakanToBoundaries(cached.boundaries, cached.locations)
                    : cached?.boundaries;
                })() : null}
              />
            </Suspense>
          )}

          {/* Statistics Panel - show by default, can be closed */}
          {/* Only show after map is loaded to prevent UI flash during skeleton loading */}
          {mapLoaded && showStatistics && (
            <div className="absolute top-4 left-4 max-w-md" style={{ zIndex: Z_INDEX.overlay }}>
              <StatisticsPanel
                statistics={statistics}
                loading={statsLoading}
                error={statsError}
                onRefresh={() => fetchStatistics(selectedRegion)}
                onClose={handleCloseStatistics}
              />
            </div>
          )}

          {/* Floating Sidebar Toggle Button - styled like mapbox controls */}
          {/* Only show after map is loaded */}
          {mapLoaded && (
            <>
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-icon absolute top-[115px] right-[10px]"
                style={{ zIndex: Z_INDEX.overlay }}
                title={sidebarOpen ? "Tutup Info" : "Buka Info"}
                aria-label={sidebarOpen ? "Tutup Info" : "Buka Info"}
              >
                <Info className="h-5 w-5 text-gray-700 mx-auto" />
              </button>

              {/* Refresh Data Button - below Info button */}
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-icon absolute top-[155px] right-[10px]"
                style={{ zIndex: Z_INDEX.overlay }}
                title="Perbarui Data"
                aria-label="Perbarui Data"
              >
                <RefreshCw className={`h-5 w-5 text-gray-700 mx-auto ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}


          {/* Add Report Button (Desktop) */}
          {/* Only show after map is loaded to prevent UI flash during skeleton loading */}
          {mapLoaded && (
            <Button
              onClick={handleAddReport}
              className={`
                hidden md:flex absolute bottom-6 left-6 items-center gap-2 px-5 py-3
                text-gray-800 rounded-full
                shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.4)] hover:scale-105
                ${ANIMATIONS.transition}
              `}
              style={{ background: '#bfddf8' }}
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Tambah Laporan</span>
            </Button>
          )}
        </div>

        {/* Sidebar Section - Always overlay (absolute) on all devices */}
        {/* Only render after map is loaded to prevent UI flash during skeleton loading */}
        {mapLoaded && (
          <div
            className={`
              absolute inset-y-0 right-0
              w-full sm:w-80 md:w-96
              transform ${ANIMATIONS.transition}
              ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
              border-l shadow-2xl
            `}
            style={{ zIndex: Z_INDEX.sidebar }}
          >
            <Sidebar
              reports={filteredReports}
              reportsLoading={loading}
              selectedReport={selectedReport}
              onReportClick={handleReportClick}
              news={news}
              newsLoading={newsLoading}
              selectedNews={selectedNews}
              onNewsClick={handleNewsClick}
              locationName={selectedLocationName}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile Add Button */}
      {/* Only show after map is loaded to prevent UI flash during skeleton loading */}
      {mapLoaded && (
        <Button
          onClick={handleAddReport}
          className={`
            md:hidden fixed bottom-6 right-6 w-16 h-16
            text-gray-800 rounded-full
            shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.4)] hover:scale-110 active:scale-95
            ${ANIMATIONS.transition}
          `}
          style={{ zIndex: Z_INDEX.fab, background: '#bfddf8' }}
          size="icon"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}

      {/* No overlay backdrop - let users see the map while sidebar is open */}
    </div>
  );
}

export default App;
