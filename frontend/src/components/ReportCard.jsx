import { Clock, MapPin, User, ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { SEVERITY_CONFIG, CATEGORY_CONFIG, ANIMATIONS } from '../lib/constants';

export default function ReportCard({ report, isSelected, onClick }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          "p-2 rounded-full flex-shrink-0",
          severityConfig.color,
          "shadow-sm"
        )}>
          <span className="text-lg" role="img" aria-label={severityConfig.label}>
            {severityConfig.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Location Name */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base text-gray-900 leading-tight">
              {report.locationName}
            </h3>
            <Badge className={cn("flex-shrink-0", severityConfig.color)}>
              {severityConfig.label}
            </Badge>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDate(report.timestamp)}</span>
          </div>

          {/* Category */}
          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
            <span className="text-base" role="img" aria-label={categoryConfig.label}>
              {categoryConfig.icon}
            </span>
            <span className="capitalize font-medium">{categoryConfig.label}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-2 line-clamp-2 leading-relaxed">
            {report.description}
          </p>

          {/* Contact Source */}
          {report.contactSource && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1.5">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{report.contactSource}</span>
            </div>
          )}

          {/* Images Preview */}
          {report.imageUrls && report.imageUrls.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <ImageIcon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {report.imageUrls.length} foto dokumentasi
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
