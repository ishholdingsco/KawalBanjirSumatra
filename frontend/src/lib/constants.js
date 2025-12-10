// Design System Constants
// Consistent spacing, typography, and design tokens

export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
}

export const TYPOGRAPHY = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
}

export const LAYOUT = {
  headerHeight: '120px',      // Desktop header
  headerHeightMobile: '140px', // Mobile header (with search)
  sidebarWidth: '384px',      // Desktop sidebar (96 * 4 = 384px)
  sidebarWidthTablet: '320px', // Tablet sidebar (80 * 4)
  sidebarWidthMobile: '100%',  // Mobile sidebar
  mapMinHeight: '400px',
}

export const BREAKPOINTS = {
  sm: 640,   // Small devices
  md: 768,   // Medium devices
  lg: 1024,  // Large devices
  xl: 1280,  // Extra large devices
  '2xl': 1536, // 2X Extra large
}

export const Z_INDEX = {
  base: 1,
  dropdown: 10,
  overlay: 20,
  modal: 30,
  header: 40,
  sidebar: 45,
  fab: 50,
  toast: 100,
}

// 🔥 Damage Severity Config - Based on Kerusakan (Total Damage)
// Aligned with Map.jsx color gradient (line 417-427)
export const SEVERITY_CONFIG = {
  'no-damage': {
    label: 'Tidak Ada Kerusakan',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    markerColor: '#3B82F6', // blue-500
    icon: '✅',
    min: 0,
    max: 0.1
  },
  'minimal': {
    label: 'Minimal',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    markerColor: '#FDE047', // yellow-300
    icon: '⚠️',
    min: 0.1,
    max: 100
  },
  'light': {
    label: 'Ringan',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    markerColor: '#FBBF24', // yellow-400
    icon: '⚠️',
    min: 100,
    max: 500
  },
  'moderate': {
    label: 'Sedang',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    markerColor: '#F97316', // orange-500
    icon: '🔶',
    min: 500,
    max: 1000
  },
  'significant': {
    label: 'Signifikan',
    color: 'bg-orange-200 text-orange-900 border-orange-400',
    markerColor: '#EA580C', // orange-600
    icon: '🔶',
    min: 1000,
    max: 5000
  },
  'severe': {
    label: 'Berat',
    color: 'bg-red-100 text-red-800 border-red-300',
    markerColor: '#DC2626', // red-600
    icon: '🔴',
    min: 5000,
    max: 10000
  },
  'catastrophic': {
    label: 'Sangat Berat',
    color: 'bg-red-900 text-white border-red-900',
    markerColor: '#7F1D1D', // red-900
    icon: '🚨',
    min: 10000,
    max: Infinity
  }
}

// Report & News Category Config - Based on Airtable field "Category"
// Used by ReportCard, ReportDetail, NewsCard, NewsDetail
export const CATEGORY_CONFIG = {
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
  },
  // Default fallback
  'default': {
    label: 'Lainnya',
    color: 'bg-gray-100 text-gray-800',
    icon: '📰'
  }
}

export const ANIMATIONS = {
  transition: 'transition-all duration-300 ease-in-out',
  transitionFast: 'transition-all duration-150 ease-in-out',
  transitionSlow: 'transition-all duration-500 ease-in-out',
}
