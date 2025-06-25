import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import designTokens from '../design-tokens.json';

// Convert HSL to RGB for React Native
const hslToRgb = (hsl: string): string => {
  // Simple conversion - in a real app, you'd use a proper color library
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

// Native button style variants
const buttonVariants = cva('', {
  variants: {
    variant: {
      default: '',
      destructive: '',
      outline: '',
      secondary: '',
      ghost: '',
      link: '',
    },
    size: {
      default: '',
      sm: '',
      lg: '',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  asChild?: boolean; // Keep API compatibility but not used in RN
}

const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  ({ 
    children, 
    variant = 'default', 
    size = 'default', 
    onPress, 
    disabled = false, 
    loading = false, 
    style, 
    textStyle, 
    ...props 
  }, ref) => {
    const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
      const primaryColor = hslToRgb(designTokens.colors.semantic.primary.light);
      const primaryForegroundColor = hslToRgb(designTokens.colors.semantic['primary-foreground'].light);
      const secondaryColor = hslToRgb(designTokens.colors.semantic.secondary.light);
      const secondaryForegroundColor = hslToRgb(designTokens.colors.semantic['secondary-foreground'].light);
      const destructiveColor = hslToRgb(designTokens.colors.semantic.destructive.light);
      const destructiveForegroundColor = hslToRgb(designTokens.colors.semantic['destructive-foreground'].light);
      const borderColor = hslToRgb(designTokens.colors.semantic.border.light);
      const backgroundColor = hslToRgb(designTokens.colors.semantic.background.light);
      const mutedForegroundColor = hslToRgb(designTokens.colors.semantic['muted-foreground'].light);

      switch (variant) {
        case 'destructive':
          return {
            container: {
              backgroundColor: destructiveColor,
              borderWidth: 0,
            },
            text: {
              color: destructiveForegroundColor,
            },
          };
        case 'outline':
          return {
            container: {
              backgroundColor: backgroundColor,
              borderWidth: 1,
              borderColor: borderColor,
            },
            text: {
              color: secondaryForegroundColor,
            },
          };
        case 'secondary':
          return {
            container: {
              backgroundColor: secondaryColor,
              borderWidth: 0,
            },
            text: {
              color: secondaryForegroundColor,
            },
          };
        case 'ghost':
          return {
            container: {
              backgroundColor: 'transparent',
              borderWidth: 0,
            },
            text: {
              color: secondaryForegroundColor,
            },
          };
        case 'link':
          return {
            container: {
              backgroundColor: 'transparent',
              borderWidth: 0,
            },
            text: {
              color: primaryColor,
              textDecorationLine: 'underline',
            },
          };
        default: // 'default'
          return {
            container: {
              backgroundColor: primaryColor,
              borderWidth: 0,
            },
            text: {
              color: primaryForegroundColor,
            },
          };
      }
    };

    const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
      switch (size) {
        case 'sm':
          return {
            container: {
              height: 36,
              paddingHorizontal: 12,
              borderRadius: parseInt(designTokens.radii.button),
            },
            text: {
              fontSize: parseInt(designTokens.fonts.size.small),
            },
          };
        case 'lg':
          return {
            container: {
              height: 44,
              paddingHorizontal: 32,
              borderRadius: parseInt(designTokens.radii.button),
            },
            text: {
              fontSize: parseInt(designTokens.fonts.size.body),
            },
          };
        case 'icon':
          return {
            container: {
              height: 40,
              width: 40,
              paddingHorizontal: 0,
              borderRadius: parseInt(designTokens.radii.button),
            },
            text: {
              fontSize: parseInt(designTokens.fonts.size.body),
            },
          };
        default: // 'default'
          return {
            container: {
              height: 40,
              paddingHorizontal: 16,
              borderRadius: parseInt(designTokens.radii.button),
            },
            text: {
              fontSize: parseInt(designTokens.fonts.size.body),
            },
          };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    const containerStyle = [
      styles.base,
      variantStyles.container,
      sizeStyles.container,
      disabled && styles.disabled,
      style,
    ];

    const textStyles = [
      styles.text,
      variantStyles.text,
      sizeStyles.text,
      disabled && styles.disabledText,
      textStyle,
    ];

    return (
      <TouchableOpacity
        ref={ref}
        style={containerStyle}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.text.color} />
        ) : (
          <Text style={textStyles}>{children}</Text>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '500',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export { Button, buttonVariants }; 