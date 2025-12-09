import { useState, useEffect, lazy, Suspense } from 'react';
import { Plus, Info } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatisticsPanel from './components/StatisticsPanel';
import { Button } from './components/ui/button';
import { Z_INDEX, ANIMATIONS } from './lib/constants';
import { dataService } from './services/dataService';

// Lazy load Map component to reduce initial bundle size
const Map = lazy(() => import('./components/Map'));

function App() {
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
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showStatistics, setShowStatistics] = useState(true);

  // News state
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [selectedLocationName, setSelectedLocationName] = useState('Sumatra');

  // Fetch data on mount
  useEffect(() => {
    fetchReports(null); // Fetch all reports by default (no region filter)
    fetchStatistics(null); // Fetch Sumatra statistics on initial load
    fetchNews('Sumatra'); // Fetch Sumatra news by default (includes Indonesia + Sumatra)
  }, []);

  const fetchReports = async (regionData = null) => {
    try {
      setLoading(true);

      // Fetch reports filtered by region (or all if regionData is null)
      const data = await dataService.getReportsByLocation(regionData);

      setReports(data);
      setFilteredReports(data);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data laporan. Periksa koneksi Airtable Anda.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async (regionData) => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      let data;

      // If no region data, fetch Sumatra-wide statistics
      if (!regionData) {
        data = await dataService.getSumatraStatistics();
      } else {
        // Fetch statistics based on admin level
        if (regionData.adminLevel === 'provinsi') {
          // For province: sum all kabupaten in that province
          data = await dataService.getStatisticsByProvinsi(
            regionData.kodeProvinsi,
            regionData.namaProvinsi
          );
        } else if (regionData.adminLevel === 'kabupaten') {
          // For kabupaten: get specific kabupaten data
          data = await dataService.getStatisticsByKabupaten(regionData.namaKabupaten);
        } else if (regionData.adminLevel === 'kecamatan') {
          // For kecamatan: get kabupaten data (kecamatan level not stored)
          data = await dataService.getStatisticsByKabupaten(regionData.namaKabupaten);
        }
      }

      if (data) {
        // regionName is already included in data from service functions
        setStatistics(data);
      }
    } catch (err) {
      setStatsError(regionData ? 'Gagal memuat statistik untuk wilayah ini.' : 'Gagal memuat statistik.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchNews = async (locationName, locationCode = null) => {
    try {
      setNewsLoading(true);
      setNewsError(null);

      // Fetch news filtered by location name and optionally by location code
      // locationCode helps group kecamatan news under kabupaten
      const data = await dataService.getNewsByLocation(locationName || 'Sumatra', locationCode);
      setNews(data);
      setSelectedLocationName(locationName || 'Sumatra');
    } catch (err) {
      setNewsError('Gagal memuat berita untuk wilayah ini.');
    } finally {
      setNewsLoading(false);
    }
  };

  const handleRegionClick = (regionData) => {
    setSelectedRegion(regionData);
    setShowStatistics(true);

    // Only auto-open sidebar on desktop (>= 768px), not on mobile
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }

    // Fetch statistics for the region
    fetchStatistics(regionData);

    // Fetch reports filtered by region
    fetchReports(regionData);

    // Fetch news for the region based on admin level
    // Pass both location name and location code for better filtering
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

    // Pass location code to enable kecamatan-to-kabupaten grouping
    fetchNews(locationNameForNews, locationCodeForNews);
  };

  const handleCloseStatistics = () => {
    setShowStatistics(false);
  };

  const handleSearch = (query) => {
    if (!query.trim()) {
      setFilteredReports(reports);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = reports.filter(report =>
      report.locationName.toLowerCase().includes(lowercaseQuery) ||
      report.description.toLowerCase().includes(lowercaseQuery) ||
      report.category.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredReports(filtered);
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
          <Suspense fallback={
            <div
              className="absolute inset-0 flex items-center justify-center"
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
          }>
            <Map
              reports={filteredReports}
              onMarkerClick={handleMarkerClick}
              onMapLoaded={() => setMapLoaded(true)}
              onRegionClick={handleRegionClick}
            />
          </Suspense>

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
