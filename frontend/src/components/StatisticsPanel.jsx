import { School, Hospital, Church, Home, Users, MapPin, Construction, X, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { formatCompactNumber } from '../lib/utils';

export default function StatisticsPanel({ statistics, loading, error, onRefresh, onClose }) {
  if (loading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 md:p-5 w-full max-w-[280px] md:max-w-md border-2 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="h-5 md:h-6 bg-gray-300/60 rounded w-40 md:w-48 mb-0.5"></div>
            <div className="h-3 bg-gray-200/60 rounded w-32 mt-0.5 hidden md:block"></div>
          </div>
          {onClose && (
            <div className="h-7 w-7 md:h-8 md:w-8 bg-gray-200/60 rounded-full flex-shrink-0"></div>
          )}
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-3">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 md:p-3 border border-red-200">
            <div className="h-7 md:h-8 bg-red-300/60 rounded w-16 md:w-20 mb-0.5 md:mb-1"></div>
            <div className="h-3 md:h-4 bg-red-200/60 rounded w-full"></div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-2 md:p-3 border border-yellow-200">
            <div className="h-7 md:h-8 bg-yellow-300/60 rounded w-12 md:w-16 mb-0.5 md:mb-1"></div>
            <div className="h-3 md:h-4 bg-yellow-200/60 rounded w-full"></div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 md:p-3 border border-orange-200">
            <div className="h-7 md:h-8 bg-orange-300/60 rounded w-14 md:w-20 mb-0.5 md:mb-1"></div>
            <div className="h-3 md:h-4 bg-orange-200/60 rounded w-full"></div>
          </div>
        </div>

        {/* Detailed Stats Skeleton */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="bg-gray-50 rounded-lg p-2 md:p-3 border border-gray-200">
            <div className="h-4 md:h-5 bg-gray-300/60 rounded w-2/3 mb-1.5 md:mb-2"></div>
            <div className="space-y-0.5 md:space-y-1 text-[10px] md:text-xs">
              <div className="flex justify-between items-center">
                <div className="h-3 md:h-4 bg-gray-200/60 rounded w-20"></div>
                <div className="h-3 md:h-4 bg-gray-300/60 rounded w-12"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 md:h-4 bg-gray-200/60 rounded w-16"></div>
                <div className="h-3 md:h-4 bg-gray-300/60 rounded w-10"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 md:h-4 bg-gray-200/60 rounded w-20"></div>
                <div className="h-3 md:h-4 bg-gray-300/60 rounded w-14"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 md:h-4 bg-gray-200/60 rounded w-20"></div>
                <div className="h-3 md:h-4 bg-gray-300/60 rounded w-14"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 md:h-4 bg-gray-200/60 rounded w-20"></div>
                <div className="h-3 md:h-4 bg-gray-300/60 rounded w-16"></div>
              </div>
              <div className="flex justify-between items-center pt-0.5 md:pt-1 border-t border-gray-300">
                <div className="h-3 md:h-4 bg-gray-300/60 rounded w-24"></div>
                <div className="h-3 md:h-4 bg-gray-400/60 rounded w-14"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-2.5 md:mt-4 pt-2 md:pt-3 border-t border-gray-200">
          <div className="h-3 md:h-3.5 bg-gray-200/60 rounded w-24 mx-auto"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 w-full max-w-[280px] md:max-w-md border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Data Belum Tersedia</h3>
            <p className="text-xs text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) return null;

  // BNPB data from Airtable
  const totalMeninggal = statistics.totalKorbanMeninggal || 0;
  const totalHilang = statistics.totalKorbanHilang || 0;
  const totalLukaSakit = statistics.totalKorbanLukaSakit || 0;
  const totalMenderita = statistics.totalMenderita || 0;
  const totalMengungsi = statistics.totalPengungsi || 0;
  const totalKerusakan = statistics.totalKerusakan || 0;
  const totalKorban = totalMeninggal + totalHilang + totalLukaSakit;

  return (
    <Card className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 md:p-5 w-full max-w-[280px] md:max-w-md border-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 className="text-sm md:text-lg font-bold text-gray-900 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            {statistics.regionName || 'Data Banjir Sumatra'}
          </h2>
          {statistics.lastSync && new Date(statistics.lastSync).getTime() > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 hidden md:block">
              Update: {new Date(statistics.lastSync).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}, {new Date(statistics.lastSync).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })} WIB
            </p>
          )}
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-gray-200 flex-shrink-0"
            title="Tutup"
          >
            <X className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2 mb-3">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 md:p-3 border border-red-200">
          <div className="text-lg md:text-2xl font-bold text-red-700">{formatCompactNumber(totalMeninggal)}</div>
          <div className="text-[10px] md:text-xs text-red-600 font-medium mt-0.5 md:mt-1">Meninggal</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-2 md:p-3 border border-yellow-200">
          <div className="text-lg md:text-2xl font-bold text-yellow-700">{formatCompactNumber(totalHilang)}</div>
          <div className="text-[10px] md:text-xs text-yellow-600 font-medium mt-0.5 md:mt-1">Hilang</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 md:p-3 border border-orange-200">
          <div className="text-lg md:text-2xl font-bold text-orange-700">{formatCompactNumber(totalKerusakan)}</div>
          <div className="text-[10px] md:text-xs text-orange-600 font-medium mt-0.5 md:mt-1">Kerusakan</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-1.5 md:space-y-2">
        {/* Korban & Dampak */}
        <div className="bg-gray-50 rounded-lg p-2 md:p-3 border border-gray-200">
          <div className="flex items-center gap-1.5 mb-1.5 md:mb-2">
            <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600" />
            <span className="text-xs md:text-sm font-semibold text-gray-700">Detail Korban & Dampak</span>
          </div>
          <div className="space-y-0.5 md:space-y-1 text-[10px] md:text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Meninggal</span>
              <span className="font-bold text-red-700">{totalMeninggal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hilang</span>
              <span className="font-bold text-yellow-700">{totalHilang.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Luka/Sakit</span>
              <span className="font-bold text-orange-700">{totalLukaSakit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kerusakan</span>
              <span className="font-bold text-red-600">{totalKerusakan.toLocaleString()}</span>
            </div>
            {totalMenderita > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Menderita</span>
                <span className="font-bold text-gray-900">{totalMenderita.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Mengungsi</span>
              <span className="font-bold text-purple-700">{totalMengungsi.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-300">
              <span className="text-gray-700 font-semibold">Total Korban</span>
              <span className="font-bold text-gray-900">{totalKorban.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2.5 md:mt-4 pt-2 md:pt-3 border-t border-gray-200">
        <div className="text-[10px] md:text-xs text-gray-500 text-center">
          <span>Sumber: {statistics.sumberData || 'BNPB'}</span>
        </div>
      </div>
    </Card>
  );
}
