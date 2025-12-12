import { School, Hospital, Church, Home, Users, MapPin, Construction, X, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { formatCompactNumber } from '../lib/utils';

export default function StatisticsPanel({ statistics, loading, error, onRefresh, onClose }) {
  if (loading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-2 md:p-3 w-full max-w-[280px] md:max-w-md border-2 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="h-4 md:h-5 bg-gray-300/60 rounded w-28 md:w-36 mb-0.5"></div>
            <div className="h-2.5 bg-gray-200/60 rounded w-24 mt-0.5 hidden md:block"></div>
          </div>
          {onClose && (
            <div className="h-6 w-6 md:h-7 md:w-7 bg-gray-200/60 rounded-full flex-shrink-0"></div>
          )}
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-3 gap-1 md:gap-1.5 mb-2">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-md p-1.5 md:p-2 border border-red-200">
            <div className="h-5 md:h-6 bg-red-300/60 rounded w-10 md:w-14 mb-0.5"></div>
            <div className="h-2.5 md:h-3 bg-red-200/60 rounded w-16"></div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-md p-1.5 md:p-2 border border-yellow-200">
            <div className="h-5 md:h-6 bg-yellow-300/60 rounded w-8 md:w-12 mb-0.5"></div>
            <div className="h-2.5 md:h-3 bg-yellow-200/60 rounded w-12"></div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-md p-1.5 md:p-2 border border-orange-200">
            <div className="h-5 md:h-6 bg-orange-300/60 rounded w-10 md:w-14 mb-0.5"></div>
            <div className="h-2.5 md:h-3 bg-orange-200/60 rounded w-16"></div>
          </div>
        </div>

        {/* Detailed Stats Skeleton */}
        <div className="space-y-1 md:space-y-1.5">
          <div className="bg-gray-50 rounded-md p-1.5 md:p-2 border border-gray-200">
            <div className="h-3.5 md:h-4 bg-gray-300/60 rounded w-32 md:w-40 mb-1 md:mb-1.5"></div>
            <div className="space-y-0.5 text-[9px] md:text-[10px]">
              {/* Meninggal */}
              <div className="flex justify-between items-center">
                <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-14"></div>
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-8"></div>
              </div>
              {/* Hilang */}
              <div className="flex justify-between items-center">
                <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-12"></div>
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-6"></div>
              </div>
              {/* Luka/Sakit */}
              <div className="flex justify-between items-center">
                <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-14"></div>
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-10"></div>
              </div>
              {/* Total Korban */}
              <div className="flex justify-between items-center pt-0.5 border-t border-gray-300">
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-18"></div>
                <div className="h-2.5 md:h-3 bg-gray-400/60 rounded w-10"></div>
              </div>
              {/* Menderita */}
              <div className="flex justify-between items-center pt-0.5">
                <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-14"></div>
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-12"></div>
              </div>
              {/* Mengungsi */}
              <div className="flex justify-between items-center">
                <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-16"></div>
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-10"></div>
              </div>
              {/* Total Terdampak */}
              <div className="flex justify-between items-center pt-0.5 border-t border-gray-300">
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-20"></div>
                <div className="h-2.5 md:h-3 bg-gray-400/60 rounded w-12"></div>
              </div>
              {/* Kerusakan */}
              <div className="flex justify-between items-center pt-0.5 border-t border-gray-300">
                <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-14"></div>
                <div className="h-2.5 md:h-3 bg-gray-300/60 rounded w-10"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-1.5 md:mt-2">
          <div className="h-2.5 md:h-3 bg-gray-200/60 rounded w-20 mx-auto"></div>
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
  const totalMengungsi = statistics.totalMengungsi || 0;
  const totalKerusakan = statistics.totalKerusakan || 0;
  const totalKorban = totalMeninggal + totalHilang + totalLukaSakit;
  const totalTerdampak = totalMenderita + totalMengungsi;

  return (
    <Card className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-2 md:p-3 w-full max-w-[280px] md:max-w-md border-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h2 className="text-xs md:text-sm font-bold text-gray-900 flex items-center gap-1">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
            {statistics.regionName || 'Data Banjir Sumatra'}
          </h2>
          {statistics.lastSync && new Date(statistics.lastSync).getTime() > 0 && (
            <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5">
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
            className="h-6 w-6 md:h-7 md:w-7 rounded-full hover:bg-gray-200 flex-shrink-0"
            title="Tutup"
          >
            <X className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-1 md:gap-1.5 mb-2">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-md p-1.5 md:p-2 border border-red-200">
          <div className="text-sm md:text-lg font-bold text-red-700">{formatCompactNumber(totalMeninggal)}</div>
          <div className="text-[9px] md:text-[10px] text-red-600 font-medium mt-0.5">Meninggal</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-md p-1.5 md:p-2 border border-yellow-200">
          <div className="text-sm md:text-lg font-bold text-yellow-700">{formatCompactNumber(totalHilang)}</div>
          <div className="text-[9px] md:text-[10px] text-yellow-600 font-medium mt-0.5">Hilang</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-md p-1.5 md:p-2 border border-orange-200">
          <div className="text-sm md:text-lg font-bold text-orange-700">{formatCompactNumber(totalKerusakan)}</div>
          <div className="text-[9px] md:text-[10px] text-orange-600 font-medium mt-0.5">Kerusakan</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-1 md:space-y-1.5">
        {/* Korban & Dampak */}
        <div className="bg-gray-50 rounded-md p-1.5 md:p-2 border border-gray-200">
          <div className="flex items-center gap-1 mb-1 md:mb-1.5">
            <AlertTriangle className="h-3 w-3 md:h-3.5 md:w-3.5 text-red-600" />
            <span className="text-[10px] md:text-xs font-semibold text-gray-700">Detail Korban & Dampak</span>
          </div>
          <div className="space-y-0.5 text-[9px] md:text-[10px]">
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
            <div className="flex justify-between pt-0.5 border-t border-gray-300">
              <span className="text-gray-700 font-semibold">Total Korban</span>
              <span className="font-bold text-gray-900">{totalKorban.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-gray-600">Menderita</span>
              <span className="font-bold text-blue-700">{totalMenderita.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mengungsi</span>
              <span className="font-bold text-purple-700">{totalMengungsi.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-0.5 border-t border-gray-300">
              <span className="text-gray-700 font-semibold">Total Terdampak</span>
              <span className="font-bold text-gray-900">{totalTerdampak.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-0.5 border-t border-gray-300">
              <span className="text-gray-600">Kerusakan</span>
              <span className="font-bold text-red-600">{totalKerusakan.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1.5 md:mt-2">
        <div className="text-[9px] md:text-[10px] text-gray-500 text-center">
          <span>Sumber: {statistics.sumberData || 'BNPB'}</span>
        </div>
      </div>
    </Card>
  );
}
