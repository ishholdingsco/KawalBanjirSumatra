import { Clock, MapPin, User, Tag, ChevronRight, Image as ImageIcon, Building2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { CATEGORY_CONFIG } from '../lib/constants';
import { getReportSeverity } from '../lib/reportUtils';

export default function ReportDetail({ report, onBack }) {
  if (!report) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch (e) {
      return dateString;
    }
  };

  // 🔥 Get severity dynamically from location damage
  const severityConfig = getReportSeverity(report);

  // Get category config from Airtable field "Category"
  const categoryConfig = CATEGORY_CONFIG[report.category || report.Category] || CATEGORY_CONFIG['default'];

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4">
        {/* Header: Badges + Back button */}
        <div className="flex items-center justify-between mb-3">
          {/* Severity & Category Badges */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-full shadow-sm",
              severityConfig.color
            )}>
              <span className="text-base" role="img" aria-label={severityConfig.label}>
                {severityConfig.icon}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <Badge variant="none" className={cn("text-xs", severityConfig.color)}>
                {severityConfig.label}
              </Badge>
              <Badge variant="none" className={cn("text-xs", categoryConfig.color)}>
                {categoryConfig.label}
              </Badge>
            </div>
          </div>

          {/* Back Button - di kanan */}
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Kembali"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Reporter Name */}
        <h1 className="text-base font-bold text-gray-900 leading-tight mb-2 uppercase">
          {report.reporterName || report['Reporter Name'] || 'Laporan Anonim'}
        </h1>

        {/* Meta Info */}
        <div className="space-y-1 mb-4">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDate(report.timestamp)}</span>
          </div>

          {/* Location - Provinsi */}
          {(report.provinsiName || report['Location Text']) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium">
                {report.provinsiName || report['Location Text']}
              </span>
            </div>
          )}

          {/* Location - Kabupaten/Kota */}
          {(report.kabupatenName || report.bpsCode) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium">
                {report.kabupatenName || report.bpsCode}
              </span>
            </div>
          )}
        </div>
        {/* Description */}
        {report.description && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3.5 w-3.5 text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Deskripsi Laporan
              </h2>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {report.description}
              </p>
            </div>
          </div>
        )}

        {/* Contact Source */}
        {report.contactSource && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Sumber Kontak
            </h2>
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <User className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <span className="text-xs text-gray-800 font-medium">{report.contactSource}</span>
            </div>
          </div>
        )}

        {/* Images */}
        {report.imageUrls && report.imageUrls.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Foto Dokumentasi
              </h2>
            </div>
            <div className="space-y-2">
              {report.imageUrls.map((url, index) => {
                const reporterName = report.reporterName || report['Reporter Name'] || 'Pelapor';
                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
                  >
                    <div className="flex-shrink-0 p-2 bg-blue-500 rounded-lg">
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Foto dari {reporterName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Klik untuk melihat foto
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Lihat foto">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Spacing */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}
