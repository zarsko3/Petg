// Design tokens utilities for React Native
import designTokensJson from './design-tokens.json';

export const designTokens = designTokensJson;

// Type definitions for design tokens
export interface ThemeMode {
  colors: Record<string, string>;
  spacing: typeof designTokens.spacing;
  typography: typeof designTokens.fonts;
  borderRadius: typeof designTokens.radii;
  shadows: typeof designTokens.shadows;
  transitions: typeof designTokens.transitions;
  breakpoints: typeof designTokens.breakpoints;
}

// Utility function to convert HSL to RGB/Hex for React Native
export const hslToHex = (hsl: string): string => {
  const hslMatch = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
  if (!hslMatch) return '#000000';
  
  const h = parseInt(hslMatch[1]) / 360;
  const s = parseInt(hslMatch[2]) / 100;
  const l = parseInt(hslMatch[3]) / 100;
  
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  
  const r = f(0).toString(16).padStart(2, '0');
  const g = f(8).toString(16).padStart(2, '0');
  const b = f(4).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};

// Color accessor with theme mode support
export const getColor = (colorPath: string, mode: 'light' | 'dark' = 'light'): string => {
  const pathParts = colorPath.split('.');
  let current: any = designTokens.colors;
  
  for (const part of pathParts) {
    current = current[part];
    if (!current) {
      console.warn(`Color path not found: ${colorPath}`);
      return '#000000';
    }
  }
  
  if (typeof current === 'object' && current.light && current.dark) {
    return hslToHex(current[mode]);
  }
  
  if (typeof current === 'string') {
    return current.includes('%') ? hslToHex(current) : current;
  }
  
  console.warn(`Invalid color value for path: ${colorPath}`);
  return '#000000';
};

// Spacing utilities
export const getSpacing = (spacingPath: string): number => {
  const pathParts = spacingPath.split('.');
  let current: any = designTokens.spacing;
  
  for (const part of pathParts) {
    current = current[part];
    if (!current) {
      console.warn(`Spacing path not found: ${spacingPath}`);
      return 0;
    }
  }
  
  if (typeof current === 'string') {
    // Convert rem to pixels (assuming 16px base)
    if (current.includes('rem')) {
      return parseFloat(current) * 16;
    }
    // Extract pixel values
    return parseInt(current) || 0;
  }
  
  return current || 0;
};

// Typography utilities
export const getFontSize = (size: string): number => {
  const fontSize = (designTokens.fonts.size as Record<string, string>)[size] || '14px';
  if (fontSize.includes('rem')) {
    return parseFloat(fontSize) * 16;
  }
  return parseInt(fontSize) || 14;
};

export const getFontWeight = (weight: string): string => {
  return (designTokens.fonts.weight as Record<string, string>)[weight] || '400';
};

export const getBorderRadius = (radius: string): number => {
  const radiusValue = (designTokens.radii as Record<string, string>)[radius];
  if (!radiusValue) return 0;
  
  return parseInt(radiusValue.toString()) || 0;
};

// Shadow utilities for React Native
export const getShadow = (shadowName: string) => {
  const shadowValue = (designTokens.shadows as Record<string, string>)[shadowName];
  if (!shadowValue) return {};
  
  // Parse CSS shadow to React Native shadow props
  // This is a simplified version - for production, use a proper shadow parser
  const isSmall = shadowName === 'sm';
  const isMedium = shadowName === 'md';
  const isLarge = shadowName === 'lg';
  const isXLarge = shadowName === 'xl';
  
  if (isSmall) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    };
  } else if (isMedium) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    };
  } else if (isLarge) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    };
  } else if (isXLarge) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    };
  }
  
  return {};
};

// Theme creator utility
export const createTheme = (mode: 'light' | 'dark' = 'light'): ThemeMode => {
  const colors: Record<string, string> = {};
  
  // Process semantic colors
  Object.entries(designTokens.colors.semantic).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'object' && value.light && value.dark) {
      colors[key] = hslToHex(value[mode]);
    } else if (typeof value === 'string') {
      colors[key] = value.includes('%') ? hslToHex(value) : value;
    }
  });
  
  // Add brand colors
  Object.entries(designTokens.colors.brand).forEach(([brand, brandColors]: [string, any]) => {
    Object.entries(brandColors).forEach(([colorKey, colorValue]) => {
      colors[`${brand}${colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}`] = colorValue as string;
    });
  });
  
  // Add domain colors
  Object.entries(designTokens.colors.domain).forEach(([domain, domainColors]: [string, any]) => {
    Object.entries(domainColors).forEach(([colorKey, colorValue]) => {
      colors[`${domain}${colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}`] = colorValue as string;
    });
  });
  
  // Add background colors
  Object.entries(designTokens.colors.background).forEach(([key, value]) => {
    colors[`background${key.charAt(0).toUpperCase() + key.slice(1)}`] = value as string;
  });
  
  return {
    colors,
    spacing: designTokens.spacing,
    typography: designTokens.fonts,
    borderRadius: designTokens.radii,
    shadows: designTokens.shadows,
    transitions: designTokens.transitions,
    breakpoints: designTokens.breakpoints,
  };
};

// Pre-created theme instances
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

// Quick access theme object
export const theme = {
  colors: {
    // Semantic colors
    background: getColor('semantic.background'),
    foreground: getColor('semantic.foreground'),
    card: getColor('semantic.card'),
    cardForeground: getColor('semantic.card-foreground'),
    primary: getColor('semantic.primary'),
    primaryForeground: getColor('semantic.primary-foreground'),
    secondary: getColor('semantic.secondary'),
    secondaryForeground: getColor('semantic.secondary-foreground'),
    muted: getColor('semantic.muted'),
    mutedForeground: getColor('semantic.muted-foreground'),
    accent: getColor('semantic.accent'),
    accentForeground: getColor('semantic.accent-foreground'),
    destructive: getColor('semantic.destructive'),
    destructiveForeground: getColor('semantic.destructive-foreground'),
    border: getColor('semantic.border'),
    input: getColor('semantic.input'),
    ring: getColor('semantic.ring'),
    
    // Brand colors
    brandPurple: getColor('brand.petg.purple'),
    brandYellow: getColor('brand.petg.yellow'),
    brandWhite: getColor('brand.petg.white'),
    
    // Domain colors
    healthPrimary: getColor('domain.health.primary'),
    healthLight: getColor('domain.health.light'),
    healthDark: getColor('domain.health.dark'),
    connectivityPrimary: getColor('domain.connectivity.primary'),
    connectivityLight: getColor('domain.connectivity.light'),
    connectivityDark: getColor('domain.connectivity.dark'),
    activityPrimary: getColor('domain.activity.primary'),
    activityLight: getColor('domain.activity.light'),
    activityDark: getColor('domain.activity.dark'),
    neutralPrimary: getColor('domain.neutral.primary'),
    neutralLight: getColor('domain.neutral.light'),
    neutralDark: getColor('domain.neutral.dark'),
    
    // Background colors
    backgroundCard: getColor('background.card'),
    backgroundPage: getColor('background.page'),
    backgroundSidebar: getColor('background.sidebar'),
  },
  spacing: {
    xs: getSpacing('padding.xs'),
    sm: getSpacing('padding.sm'),
    md: getSpacing('padding.md'),
    lg: getSpacing('padding.lg'),
    xl: getSpacing('padding.xl'),
    '2xl': getSpacing('padding.2xl'),
    '3xl': getSpacing('padding.3xl'),
  },
  typography: {
    h1: getFontSize('h1'),
    h2: getFontSize('h2'),
    h3: getFontSize('h3'),
    subtitle: getFontSize('subtitle'),
    body: getFontSize('body'),
    small: getFontSize('small'),
  },
  borderRadius: {
    none: getBorderRadius('none'),
    sm: getBorderRadius('sm'),
    md: getBorderRadius('md'),
    lg: getBorderRadius('lg'),
    xl: getBorderRadius('xl'),
    '2xl': getBorderRadius('2xl'),
    '3xl': getBorderRadius('3xl'),
    full: getBorderRadius('full'),
    card: getBorderRadius('card'),
    button: getBorderRadius('button'),
    pill: getBorderRadius('pill'),
  },
  shadows: {
    sm: getShadow('sm'),
    md: getShadow('md'),
    lg: getShadow('lg'),
    xl: getShadow('xl'),
  },
};

export default designTokens; 