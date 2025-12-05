import { School, Hospital, Church, Home, AlertTriangle, Users, MapPin, Construction, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export default function StatisticsPanel({ statistics, loading, error, onRefresh, onClose }) {
  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 max-w-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 max-w-md border-2 border-orange-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Gagal Memuat Data</h3>
            <p className="text-xs text-gray-600 mb-3">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                🔄 Coba Lagi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) return null;

  const totalRumah = statistics.totalRumahRusak || 0;
  const totalInfrastruktur = statistics.totalInfrastrukturRusak || 0;
  const totalKorban = statistics.totalKorban || 0;

  return (
    <Card className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-5 max-w-md border-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {statistics.regionName || 'Data Banjir Sumatra'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Update: {new Date(statistics.lastSync).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}, {new Date(statistics.lastSync).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit'
            })} WIB
          </p>
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-200 flex-shrink-0"
            title="Tutup"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
          <div className="text-2xl font-bold text-red-700">{totalRumah.toLocaleString()}</div>
          <div className="text-xs text-red-600 font-medium mt-1">Rumah Rusak</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
          <div className="text-2xl font-bold text-orange-700">{totalInfrastruktur.toLocaleString()}</div>
          <div className="text-xs text-orange-600 font-medium mt-1">Infrastruktur</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
          <div className="text-2xl font-bold text-purple-700">{totalKorban.toLocaleString()}</div>
          <div className="text-xs text-purple-600 font-medium mt-1">Korban</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-2">
        {/* Rumah */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Kerusakan Rumah</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-red-600 font-bold">{statistics.totalRumahRusakBerat?.toLocaleString() || 0}</div>
              <div className="text-gray-500">Berat</div>
            </div>
            <div>
              <div className="text-orange-600 font-bold">{statistics.totalRumahRusakSedang?.toLocaleString() || 0}</div>
              <div className="text-gray-500">Sedang</div>
            </div>
            <div>
              <div className="text-yellow-600 font-bold">{statistics.totalRumahRusakRingan?.toLocaleString() || 0}</div>
              <div className="text-gray-500">Ringan</div>
            </div>
          </div>
        </div>

        {/* Infrastruktur */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <School className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Infrastruktur</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <School className="h-3 w-3" /> Pendidikan
              </span>
              <span className="font-bold text-gray-900">{statistics.totalPendidikanRusak || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Hospital className="h-3 w-3" /> Fasyankes
              </span>
              <span className="font-bold text-gray-900">{statistics.totalFasyankesRusak || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Church className="h-3 w-3" /> Ibadah
              </span>
              <span className="font-bold text-gray-900">{statistics.totalRumahIbadatRusak || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Construction className="h-3 w-3" /> Jembatan
              </span>
              <span className="font-bold text-gray-900">{statistics.totalJembatanRusak || 0}</span>
            </div>
          </div>
        </div>

        {/* Korban & Pengungsi */}
        {(statistics.totalPengungsi > 0 || totalKorban > 0) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Korban & Pengungsi</span>
            </div>
            <div className="space-y-1 text-xs">
              {statistics.totalKorbanMeninggal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Meninggal</span>
                  <span className="font-bold text-gray-900">{statistics.totalKorbanMeninggal}</span>
                </div>
              )}
              {statistics.totalKorbanHilang > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Hilang</span>
                  <span className="font-bold text-gray-900">{statistics.totalKorbanHilang}</span>
                </div>
              )}
              {statistics.totalPengungsi > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pengungsi</span>
                  <span className="font-bold text-gray-900">{statistics.totalPengungsi.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <span>Sumber: {statistics.sumberData || 'BNPB'}</span>
        </div>
      </div>
    </Card>
  );
}
