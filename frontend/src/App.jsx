import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Map from './components/Map';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Button } from './components/ui/button';
import { Z_INDEX, ANIMATIONS } from './lib/constants';
import axios from 'axios';

// API Configuration
// Default to localhost for development
// In production, set VITE_API_URL in GitHub Secrets or use your deployed backend URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Check if we're in production and API is not configured
const isProduction = import.meta.env.MODE === 'production';
const apiConfigured = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '';

function App() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch reports from API (disabled for now - backend not running)
  useEffect(() => {
    // Uncomment line below when backend is ready
    // fetchReports();

    // For now, just set loading to false to show the map
    setLoading(false);
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // If in production and API not configured, show message
      if (isProduction && !apiConfigured) {
        setError('Backend API belum dikonfigurasi. Silakan setup VITE_API_URL di environment variables.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/reports`);
      setReports(response.data);
      setFilteredReports(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      const errorMessage = isProduction && !apiConfigured
        ? 'Backend API belum dikonfigurasi. Deploy backend terlebih dahulu atau set VITE_API_URL.'
        : 'Gagal memuat data. Pastikan backend server berjalan di ' + API_URL;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
    alert('Fitur tambah laporan akan segera hadir!\n\nAnda dapat menambahkan data melalui API endpoint:\nPOST ' + API_URL + '/reports');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <Header
        onSearch={handleSearch}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative">
          {/* Always show the map */}
          <Map
            reports={filteredReports}
            onMarkerClick={handleMarkerClick}
          />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50/90 to-gray-100/90 backdrop-blur-sm" style={{ zIndex: Z_INDEX.overlay }}>
              <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium text-lg">Memuat data bencana...</p>
                <p className="text-gray-500 text-sm mt-2">Mohon tunggu sebentar</p>
              </div>
            </div>
          )}

          {/* Error Notification Banner */}
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full mx-4" style={{ zIndex: Z_INDEX.overlay }}>
              <div className="bg-white rounded-xl shadow-xl border-2 border-orange-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm mb-1">Backend Belum Terhubung</h3>
                    <p className="text-xs text-gray-600 mb-3">{error}</p>
                    <Button onClick={fetchReports} size="sm" className="text-xs h-8">
                      🔄 Coba Lagi
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Report Button (Desktop) */}
          <Button
            onClick={handleAddReport}
            className={`
              hidden md:flex absolute bottom-6 left-6 items-center gap-2 px-5 py-3
              bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full
              shadow-xl hover:shadow-2xl hover:scale-105
              ${ANIMATIONS.transition}
            `}
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Tambah Laporan</span>
          </Button>
        </div>

        {/* Sidebar Section */}
        <div
          className={`
            fixed md:relative inset-y-0 right-0
            w-full sm:w-80 md:w-96
            transform ${ANIMATIONS.transition}
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            border-l shadow-2xl md:shadow-lg
          `}
          style={{ zIndex: Z_INDEX.sidebar }}
        >
          <Sidebar
            reports={filteredReports}
            selectedReport={selectedReport}
            onReportClick={handleReportClick}
          />
        </div>
      </div>

      {/* Mobile Add Button */}
      <Button
        onClick={handleAddReport}
        className={`
          md:hidden fixed bottom-6 right-6 w-16 h-16
          bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full
          shadow-2xl hover:shadow-3xl hover:scale-110 active:scale-95
          ${ANIMATIONS.transition}
        `}
        style={{ zIndex: Z_INDEX.fab }}
        size="icon"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className={`
            md:hidden fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm
            ${ANIMATIONS.transitionFast}
          `}
          style={{ zIndex: Z_INDEX.overlay }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
