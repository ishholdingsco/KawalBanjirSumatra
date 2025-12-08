import { X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ReportCard from './ReportCard';
import { Z_INDEX } from '../lib/constants';
import { Button } from './ui/button';

export default function Sidebar({ reports, selectedReport, onReportClick, onClose }) {
  return (
    <div className="h-full flex flex-col bg-white" style={{ zIndex: Z_INDEX.sidebar }}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">
            Timeline Bencana
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-200"
            title="Tutup"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">
              {reports.length} Laporan
            </p>
            <p className="text-xs text-gray-900">Total tercatat</p>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-48 h-48 mb-4">
              <DotLottieReact
                src="/No data Found.lottie"
                loop
                autoplay
              />
            </div>
            <p className="text-gray-900 font-medium mb-2">Belum ada laporan bencana</p>
            <p className="text-sm text-gray-900">Laporan akan muncul di sini saat ada data</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <ReportCard
                key={report._id}
                report={report}
                isSelected={selectedReport?._id === report._id}
                onClick={() => onReportClick(report)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
