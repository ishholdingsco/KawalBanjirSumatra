import { Clock, MapPin, ExternalLink, Tag, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

// Category configuration for news - sama seperti di NewsCard
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

export default function NewsDetail({ news, onBack }) {
  if (!news) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const formatted = date.toLocaleString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
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
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4">
        {/* Header: Back button + Category Badge */}
        <div className="flex items-center justify-between mb-3">
          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-full shadow-sm",
              categoryConfig.color
            )}>
              <span className="text-base" role="img" aria-label={categoryConfig.label}>
                {categoryConfig.icon}
              </span>
            </div>
            <Badge variant="none" className={cn("text-xs", categoryConfig.color)}>
              {categoryConfig.label}
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

        {/* Headline */}
        <h1 className="text-base font-bold text-gray-900 leading-tight mb-2 uppercase">
          {news.headline || news.Headline || 'Berita Tanpa Judul'}
        </h1>

        {/* Meta Info */}
        <div className="space-y-1 mb-4">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDate(news.eventTime || news['Event Time'])}</span>
          </div>

          {/* Location */}
          {news.locationName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="capitalize">
                {news.locationName}
              </span>
            </div>
          )}
        </div>

        {/* Details / Description */}
        {(news.details || news.Details) && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3.5 w-3.5 text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Detail Berita
              </h2>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {news.details || news.Details}
              </p>
            </div>
          </div>
        )}

        {/* Source Link */}
        {(news.sourceLink || news['Source Link']) && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Sumber Berita
            </h2>
            <a
              href={news.sourceLink || news['Source Link']}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
            >
              <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-800 group-hover:text-blue-900">
                  Baca artikel lengkap
                </p>
                <p className="text-xs text-blue-600 truncate">
                  {news.sourceLink || news['Source Link']}
                </p>
              </div>
            </a>
          </div>
        )}

        {/* Footer Spacing */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}
