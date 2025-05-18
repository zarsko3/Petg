export const colors = {
  // Semantic colors
  health: {
    primary: '#22c55e',    // Green for battery/health indicators
    light: '#86efac',
    dark: '#15803d',
  },
  connectivity: {
    primary: '#3b82f6',    // Blue for connection status
    light: '#93c5fd',
    dark: '#1d4ed8',
  },
  activity: {
    primary: '#a855f7',    // Purple for play/activity metrics
    light: '#d8b4fe',
    dark: '#7e22ce',
  },
  neutral: {
    primary: '#6b7280',    // Gray for non-semantic elements
    light: '#e5e7eb',
    dark: '#374151',
  },
  background: {
    card: '#ffffff',
    page: '#f9fafb',
    sidebar: '#f3f4f6',
  }
} as const;

export const typography = {
  scale: {
    h1: '32px',
    h2: '28px',
    h3: '24px',
    subtitle: '18px',
    body: '14px',
    small: '12px',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
} as const;

export const spacing = {
  card: {
    desktop: '24px',
    tablet: '20px',
    mobile: '16px',
  },
  section: {
    vertical: '40px',
    horizontal: '24px',
  },
  layout: {
    sidebar: {
      expanded: '240px',
      collapsed: '72px',
    },
    topbar: '64px',
  }
} as const;

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

export const borderRadius = {
  card: '12px',
  button: '8px',
  pill: '9999px',
} as const;

export const transitions = {
  default: '200ms ease-in-out',
  fast: '100ms ease-in-out',
  slow: '300ms ease-in-out',
} as const; 