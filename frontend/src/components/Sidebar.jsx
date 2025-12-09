import { useState, useRef, useEffect } from 'react';
import { X, FileText, Newspaper, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ReportCard from './ReportCard';
import NewsCard from './NewsCard';
import NewsDetail from './NewsDetail';
import ReportDetail from './ReportDetail';
import { Z_INDEX, ANIMATIONS } from '../lib/constants';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const ITEMS_PER_PAGE = 10; // Jumlah item per halaman (berita atau laporan)

export default function Sidebar({
  reports,
  reportsLoading,
  selectedReport,
  onReportClick,
  news,
  newsLoading,
  selectedNews,
  onNewsClick,
  locationName,
  onClose
}) {
  // Tab state - default to 'berita'
  const [activeTab, setActiveTab] = useState('berita');

  // View mode state - 'list' or 'detail'
  const [viewMode, setViewMode] = useState('list');

  // Pagination state untuk berita
  const [displayedNewsCount, setDisplayedNewsCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMoreNews, setIsLoadingMoreNews] = useState(false);

  // Pagination state untuk laporan
  const [displayedReportsCount, setDisplayedReportsCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMoreReports, setIsLoadingMoreReports] = useState(false);

  // Ref untuk scroll container
  const scrollContainerRef = useRef(null);

  // Reset ke list view saat mulai loading (bukan saat data berubah)
  // Ini akan menutup detail view SEGERA saat user klik geografi baru
  useEffect(() => {
    if (newsLoading) {
      // Tutup detail view segera saat loading dimulai
      setViewMode('list');
      // Clear selection berita
      onNewsClick(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsLoading]);

  useEffect(() => {
    if (reportsLoading) {
      // Tutup detail view segera saat loading dimulai
      setViewMode('list');
      // Clear selection laporan
      onReportClick(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsLoading]);

  // Reset pagination ketika news berubah (misal ganti lokasi)
  useEffect(() => {
    setDisplayedNewsCount(ITEMS_PER_PAGE);
  }, [news]);

  // Reset pagination ketika reports berubah
  useEffect(() => {
    setDisplayedReportsCount(ITEMS_PER_PAGE);
  }, [reports]);

  // Handle scroll untuk infinite scroll (both tabs)
  const handleScroll = (e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Jika sudah scroll 80% ke bawah, load more
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8) {
      if (activeTab === 'berita' && news && news.length > 0) {
        if (!isLoadingMoreNews && displayedNewsCount < news.length) {
          loadMoreNews();
        }
      } else if (activeTab === 'laporan' && reports && reports.length > 0) {
        if (!isLoadingMoreReports && displayedReportsCount < reports.length) {
          loadMoreReports();
        }
      }
    }
  };

  // Load more news
  const loadMoreNews = () => {
    setIsLoadingMoreNews(true);

    // Simulate loading delay untuk UX yang lebih baik
    setTimeout(() => {
      setDisplayedNewsCount(prev => Math.min(prev + ITEMS_PER_PAGE, news.length));
      setIsLoadingMoreNews(false);
    }, 500);
  };

  // Load more reports
  const loadMoreReports = () => {
    setIsLoadingMoreReports(true);

    // Simulate loading delay untuk UX yang lebih baik
    setTimeout(() => {
      setDisplayedReportsCount(prev => Math.min(prev + ITEMS_PER_PAGE, reports.length));
      setIsLoadingMoreReports(false);
    }, 500);
  };

  // Handle card click - switch to detail view
  const handleNewsCardClick = (newsItem) => {
    onNewsClick(newsItem);
    setViewMode('detail');
  };

  const handleReportCardClick = (report) => {
    onReportClick(report);
    setViewMode('detail');
  };

  // Handle back button - return to list view
  const handleBackToList = () => {
    setViewMode('list');
    // Clear selection
    onNewsClick(null);
    onReportClick(null);
  };

  // Get displayed items (paginated)
  const displayedNews = news ? news.slice(0, displayedNewsCount) : [];
  const hasMoreNews = news && displayedNewsCount < news.length;

  const displayedReports = reports ? reports.slice(0, displayedReportsCount) : [];
  const hasMoreReports = reports && displayedReportsCount < reports.length;

  return (
    <div className="h-full flex flex-col bg-white" style={{ zIndex: Z_INDEX.sidebar }}>
      {/* Header */}
      <div className={cn(
        "border-b bg-gradient-to-r from-gray-50 to-white shadow-sm",
        viewMode === 'detail' ? "px-4 py-3" : "p-4"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          viewMode === 'detail' ? "mb-0" : "mb-3"
        )}>
          <h2 className="text-lg font-bold text-gray-900">
            {viewMode === 'detail'
              ? (activeTab === 'berita' ? 'Detail Berita' : 'Detail Laporan')
              : 'Informasi Bencana'
            }
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

        {/* Tab Navigation - Only show in list view */}
        {viewMode === 'list' && (
          <>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setActiveTab('laporan')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm",
                  ANIMATIONS.transition,
                  activeTab === 'laporan'
                    ? "bg-blue-100 text-blue-800 border-2 border-blue-300"
                    : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                )}
              >
                <FileText className="h-4 w-4" />
                <span>Laporan</span>
              </button>
              <button
                onClick={() => setActiveTab('berita')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm",
                  ANIMATIONS.transition,
                  activeTab === 'berita'
                    ? "bg-blue-100 text-blue-800 border-2 border-blue-300"
                    : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                )}
              >
                <Newspaper className="h-4 w-4" />
                <span>Berita</span>
              </button>
            </div>

            {/* Tab Info */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                {activeTab === 'laporan' ? (
                  reportsLoading ? (
                    /* Skeleton for reports info */
                    <div className="animate-pulse">
                      <div className="h-5 bg-blue-200/60 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-blue-200/60 rounded w-24"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {reports?.length || 0} Laporan
                      </p>
                      <p className="text-xs text-gray-900">Total tercatat</p>
                    </>
                  )
                ) : (
                  newsLoading ? (
                    /* Skeleton for news info */
                    <div className="animate-pulse">
                      <div className="h-5 bg-blue-200/60 rounded w-16 mb-1"></div>
                      <div className="h-3 bg-blue-200/60 rounded w-28"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {news?.length || 0} Berita
                      </p>
                      <p className="text-xs text-gray-900">{(locationName || 'Sumatra').toUpperCase()}</p>
                    </>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* DETAIL VIEW - Show detail component */}
        {viewMode === 'detail' ? (
          activeTab === 'berita' && selectedNews ? (
            <div className={cn("h-full", ANIMATIONS.fadeIn)}>
              <NewsDetail news={selectedNews} onBack={handleBackToList} />
            </div>
          ) : activeTab === 'laporan' && selectedReport ? (
            <div className={cn("h-full", ANIMATIONS.fadeIn)}>
              <ReportDetail report={selectedReport} onBack={handleBackToList} />
            </div>
          ) : null
        ) : (
          /* LIST VIEW - Show cards */
          activeTab === 'laporan' ? (
          /* Laporan Tab */
          reportsLoading ? (
            /* Loading Skeleton - tampil saat loading */
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    {/* Severity Icon Circle Skeleton */}
                    <div className="w-10 h-10 rounded-full bg-orange-200/60 flex-shrink-0"></div>

                    <div className="flex-1 min-w-0">
                      {/* Location Name + Severity Badge Skeleton */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="h-5 bg-gray-300/60 rounded w-2/3"></div>
                        <div className="h-5 bg-gray-200/60 rounded-full w-16 flex-shrink-0"></div>
                      </div>

                      {/* Timestamp Skeleton */}
                      <div className="h-3 bg-gray-200/60 rounded w-28 mb-2"></div>

                      {/* Category Skeleton */}
                      <div className="h-3 bg-gray-200/60 rounded w-20 mb-2"></div>

                      {/* Description Skeleton (2 lines) */}
                      <div className="space-y-1 mb-2">
                        <div className="h-3 bg-gray-200/60 rounded w-full"></div>
                        <div className="h-3 bg-gray-200/60 rounded w-4/5"></div>
                      </div>

                      {/* Contact Source Skeleton */}
                      <div className="h-6 bg-gray-100/60 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reports && reports.length === 0 ? (
            /* Empty State - tampil kalau tidak loading dan data kosong */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-32 h-32 mb-4">
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
            /* Actual Reports Content - tampil kalau tidak loading dan ada data */
            <>
              <div className="divide-y divide-gray-100">
                {displayedReports.map((report) => (
                  <ReportCard
                    key={report._id || report.id}
                    report={report}
                    isSelected={selectedReport?._id === report._id || selectedReport?.id === report.id}
                    onClick={() => handleReportCardClick(report)}
                  />
                ))}
              </div>

              {/* Loading More Indicator */}
              {isLoadingMoreReports && (
                <div className="flex items-center justify-center p-4 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Memuat laporan...</span>
                </div>
              )}

              {/* End of List Indicator */}
              {!hasMoreReports && displayedReports.length > 0 && (
                <div className="flex items-center justify-center p-4 text-gray-500">
                  <span className="text-xs">
                    {displayedReports.length} laporan ditampilkan
                  </span>
                </div>
              )}
            </>
          )
        ) : (
          /* Berita Tab */
          newsLoading ? (
            /* Loading Skeleton - tampil saat loading */
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    {/* Icon Circle Skeleton */}
                    <div className="w-10 h-10 rounded-full bg-gray-200/60 flex-shrink-0"></div>

                    <div className="flex-1 min-w-0">
                      {/* Title + Badge Skeleton */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="h-5 bg-gray-300/60 rounded w-3/4"></div>
                        <div className="h-5 bg-gray-200/60 rounded-full w-16 flex-shrink-0"></div>
                      </div>

                      {/* Timestamp Skeleton */}
                      <div className="h-3 bg-gray-200/60 rounded w-32 mb-2"></div>

                      {/* Location Skeleton (sometimes) */}
                      {index % 2 === 0 && (
                        <div className="h-3 bg-gray-200/60 rounded w-24 mb-2"></div>
                      )}

                      {/* Details Skeleton (2 lines) */}
                      <div className="space-y-1 mb-2">
                        <div className="h-3 bg-gray-200/60 rounded w-full"></div>
                        <div className="h-3 bg-gray-200/60 rounded w-5/6"></div>
                      </div>

                      {/* Source Link Skeleton */}
                      <div className="h-6 bg-blue-100/60 rounded w-28"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : news && news.length === 0 ? (
            /* Empty State - tampil kalau tidak loading dan data kosong */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-32 h-32 mb-4">
                <DotLottieReact
                  src="/No data Found.lottie"
                  loop
                  autoplay
                />
              </div>
              <p className="text-gray-900 font-medium mb-2">Belum ada berita</p>
              <p className="text-sm text-gray-900">
                Berita untuk {(locationName || 'Sumatra').toUpperCase()} akan muncul di sini
              </p>
            </div>
          ) : (
            /* Actual News Content - tampil kalau tidak loading dan ada data */
            <>
              <div className="divide-y divide-gray-100">
                {displayedNews.map((newsItem) => (
                  <NewsCard
                    key={newsItem.id}
                    news={newsItem}
                    isSelected={selectedNews?.id === newsItem.id}
                    onClick={() => handleNewsCardClick(newsItem)}
                  />
                ))}
              </div>

              {/* Loading More Indicator */}
              {isLoadingMoreNews && (
                <div className="flex items-center justify-center p-4 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Memuat berita...</span>
                </div>
              )}

              {/* End of List Indicator */}
              {!hasMoreNews && displayedNews.length > 0 && (
                <div className="flex items-center justify-center p-4 text-gray-500">
                  <span className="text-xs">
                    {displayedNews.length} berita ditampilkan
                  </span>
                </div>
              )}
            </>
          )
        )
        )}
      </div>
    </div>
  );
}
