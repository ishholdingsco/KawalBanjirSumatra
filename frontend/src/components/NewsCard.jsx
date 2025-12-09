import { Clock, ExternalLink, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { ANIMATIONS } from '../lib/constants';

// Category configuration for news - mirip struktur SEVERITY_CONFIG
const NEWS_CATEGORY_CONFIG = {
  'Flood Level': {
    label: 'Tingkat Banjir',
    color: 'bg-blue-100 text-blue-800',
    icon: '💧'
  },
  'Official': {
    label: 'Resmi',
    color: 'bg-green-100 text-green-800',
    icon: '📋'
  },
  'Aid/Relief': {
    label: 'Bantuan',
    color: 'bg-purple-100 text-purple-800',
    icon: '🤝'
  },
  'Access': {
    label: 'Akses',
    color: 'bg-orange-100 text-orange-800',
    icon: '🚧'
  }
};

export default function NewsCard({ news, isSelected, onClick }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const formatted = date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${formatted} WIB`;
    } catch (e) {
      return dateString;
    }
  };

  const categoryConfig = NEWS_CATEGORY_CONFIG[news.category] || {
    label: news.category || 'Berita',
    color: 'bg-gray-100 text-gray-800',
    icon: '📰'
  };

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
        {/* Category Icon - sama seperti Severity Icon di ReportCard */}
        <div
          className={cn(
            "p-2 rounded-full flex-shrink-0 shadow-sm pointer-events-none select-none",
            categoryConfig.color
          )}
        >
          <span className="text-lg" role="img" aria-label={categoryConfig.label}>
            {categoryConfig.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Headline - sama seperti Location Name di ReportCard */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base text-gray-900 leading-tight">
              {news.headline || 'Berita Tanpa Judul'}
            </h3>
            <Badge
              noHover={true}
              variant="none"
              className={cn("flex-shrink-0", categoryConfig.color)}
            >
              {categoryConfig.label}
            </Badge>
          </div>

          {/* Timestamp - sama seperti di ReportCard */}
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDate(news.eventTime)}</span>
          </div>

          {/* Location - hanya tampil jika bukan Indonesia */}
          {news.locationName && news.locationName.toLowerCase() !== 'indonesia' && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="capitalize font-medium">{news.locationName}</span>
            </div>
          )}

          {/* Preview Text - Tampilkan headline atau details (untuk X thread) */}
          {/* Untuk X thread yang tidak ada headline, tampilkan details sebagai preview */}
          {!news.headline && news.details && (
            <p className="text-sm text-gray-700 mb-2 line-clamp-2 leading-relaxed">
              {news.details}
            </p>
          )}

          {/* Source Link - mirip Contact Source tapi dengan link */}
          {news.sourceLink && (
            <a
              href={news.sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 rounded-md px-2 py-1.5 hover:bg-blue-100 inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Baca selengkapnya</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
