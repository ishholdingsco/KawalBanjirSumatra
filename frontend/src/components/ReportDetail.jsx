import { Clock, MapPin, User, Tag, ChevronRight, Image as ImageIcon, Building2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { SEVERITY_CONFIG, CATEGORY_CONFIG } from '../lib/constants';

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

  const severityConfig = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG['ringan'];
  const categoryConfig = CATEGORY_CONFIG[report.category] || CATEGORY_CONFIG['lainnya'];

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4">
        {/* Header: Back button + Severity Badge */}
        <div className="flex items-center justify-between mb-3">
          {/* Severity Badge */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-full shadow-sm",
              severityConfig.color
            )}>
              <span className="text-base" role="img" aria-label={severityConfig.label}>
                {severityConfig.icon}
              </span>
            </div>
            <Badge variant="none" className={cn("text-xs", severityConfig.color)}>
              {severityConfig.label}
            </Badge>
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
            <div className="grid grid-cols-2 gap-2">
              {report.imageUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors group"
                >
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12"%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-gray-700" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer Spacing */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}
