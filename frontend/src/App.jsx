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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showStatistics, setShowStatistics] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    fetchReports();
    fetchStatistics(null); // Fetch Sumatra statistics on initial load
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await dataService.getReports();
      setReports(data);
      setFilteredReports(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
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
      console.error('Error fetching statistics:', err);
      setStatsError(regionData ? 'Gagal memuat statistik untuk wilayah ini.' : 'Gagal memuat statistik.');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRegionClick = (regionData) => {
    setSelectedRegion(regionData);
    setShowStatistics(true);
    fetchStatistics(regionData);
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

  const handleAddReport = () => {
    // TODO: Open form modal or redirect to form page
    alert('Fitur tambah laporan akan segera hadir!\n\nAnda dapat menambahkan data langsung melalui Airtable.');
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
            <div className="absolute inset-0 bg-gray-100 overflow-hidden">
              {/* Skeleton for map controls (top right) */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <div className="w-8 h-8 bg-gray-300 rounded shadow-md animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-300 rounded shadow-md animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-300 rounded shadow-md animate-pulse"></div>
              </div>

              {/* Map skeleton with shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300">
                {/* Shimmer animation overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>

                {/* Fake map grid pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-4 grid-rows-4 h-full w-full">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className="border border-gray-400"></div>
                    ))}
                  </div>
                </div>

                {/* Random marker skeletons for realism */}
                <div className="absolute top-1/4 left-1/3 w-6 h-6 bg-blue-300 rounded-full animate-pulse shadow-md"></div>
                <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-red-300 rounded-full animate-pulse shadow-md"></div>
                <div className="absolute top-2/3 left-2/3 w-6 h-6 bg-yellow-300 rounded-full animate-pulse shadow-md"></div>
              </div>
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
          {showStatistics && (
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
        </div>

        {/* Sidebar Section - Always overlay (absolute) on all devices */}
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
            selectedReport={selectedReport}
            onReportClick={handleReportClick}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Mobile Add Button */}
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

      {/* No overlay backdrop - let users see the map while sidebar is open */}
    </div>
  );
}

export default App;
