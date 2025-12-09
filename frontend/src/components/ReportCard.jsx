import { Clock, MapPin, User, ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { SEVERITY_CONFIG, CATEGORY_CONFIG, ANIMATIONS } from '../lib/constants';

export default function ReportCard({ report, isSelected, onClick }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${formatted} WIB`;
  };

  const severityConfig = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG['ringan'];
  const categoryConfig = CATEGORY_CONFIG[report.category] || CATEGORY_CONFIG['lainnya'];

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer border-l-4 hover:shadow-md",
        ANIMATIONS.transition,
        isSelected
          ? "bg-blue-50 border-blue-500 shadow-sm"
          : "bg-white border-transparent hover:bg-gray-50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Severity Icon */}
        <div className={cn(
          "p-2 rounded-full flex-shrink-0 shadow-sm pointer-events-none select-none",
          severityConfig.color
        )}>
          <span className="text-lg" role="img" aria-label={severityConfig.label}>
            {severityConfig.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Reporter Name as Title */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base text-gray-900 leading-tight">
              {report.reporterName || report['Reporter Name'] || 'Anonim'}
            </h3>
            <Badge
              noHover={true}
              variant="none"
              className={cn("flex-shrink-0", severityConfig.color)}
            >
              {severityConfig.label}
            </Badge>
          </div>

          {/* Location (Kabupaten/Kota) */}
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-600">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="capitalize font-medium">{report.locationName || 'Lokasi tidak diketahui'}</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDate(report.timestamp)}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-2 line-clamp-2 leading-relaxed">
            {report.description}
          </p>

          {/* Contact Source */}
          {report.contactSource && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-600 bg-blue-50 rounded-md px-2 py-1.5 inline-flex">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate font-medium">{report.contactSource}</span>
            </div>
          )}

          {/* Images Preview */}
          {report.imageUrls && report.imageUrls.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 bg-blue-50 rounded-md px-2 py-1.5 inline-flex">
              <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium">
                {report.imageUrls.length} foto dokumentasi
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
