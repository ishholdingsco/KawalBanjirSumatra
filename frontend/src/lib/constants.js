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

export const SEVERITY_CONFIG = {
  'ringan': {
    label: 'Ringan',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    markerColor: '#fbbf24', // yellow-400
    icon: '⚠️'
  },
  'sedang': {
    label: 'Sedang',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    markerColor: '#f97316', // orange-500
    icon: '🔶'
  },
  'berat': {
    label: 'Berat',
    color: 'bg-red-100 text-red-800 border-red-300',
    markerColor: '#dc2626', // red-600
    icon: '🔴'
  },
  'sangat-berat': {
    label: 'Sangat Berat',
    color: 'bg-red-900 text-white border-red-900',
    markerColor: '#7f1d1d', // red-900
    icon: '🚨'
  }
}

export const CATEGORY_CONFIG = {
  'banjir': {
    label: 'Banjir',
    icon: '🌊',
    color: 'text-blue-600'
  },
  'banjir-bandang': {
    label: 'Banjir Bandang',
    icon: '🌪️',
    color: 'text-red-600'
  },
  'longsor': {
    label: 'Longsor',
    icon: '🏔️',
    color: 'text-orange-600'
  },
  'lainnya': {
    label: 'Lainnya',
    icon: '📍',
    color: 'text-gray-600'
  }
}

export const ANIMATIONS = {
  transition: 'transition-all duration-300 ease-in-out',
  transitionFast: 'transition-all duration-150 ease-in-out',
  transitionSlow: 'transition-all duration-500 ease-in-out',
}
