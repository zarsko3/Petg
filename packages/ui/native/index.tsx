// Native component exports with identical APIs to web components
export { Button, buttonVariants, type ButtonProps } from './Button';
export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from './Card';
export { Header, type HeaderProps } from './Header';

// Re-export design tokens for convenience
export { default as designTokens } from '../design-tokens.json';

// Utility functions
export const hslToRgb = (hsl: string): string => {
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
  
  return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
};

// Theme utilities for React Native
export const createTheme = (mode: 'light' | 'dark' = 'light') => {
  const tokens = require('../design-tokens.json');
  const colors = tokens.colors.semantic;
  
  return {
    colors: Object.keys(colors).reduce((acc, key) => {
      const colorValue = colors[key];
      if (typeof colorValue === 'object' && colorValue[mode]) {
        acc[key] = hslToRgb(colorValue[mode]);
      }
      return acc;
    }, {} as Record<string, string>),
    spacing: tokens.spacing,
    fonts: tokens.fonts,
    radii: tokens.radii,
    shadows: tokens.shadows,
    transitions: tokens.transitions,
    breakpoints: tokens.breakpoints,
  };
}; 