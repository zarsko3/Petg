import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../design-system/tokens';

// Button variant types matching web version
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  loading = false,
  children,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  // Get variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'default':
        return {
          container: {
            backgroundColor: theme.colors.primary,
            borderWidth: 0,
          },
          text: {
            color: theme.colors.primaryForeground,
          },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: theme.colors.destructive,
            borderWidth: 0,
          },
          text: {
            color: theme.colors.destructiveForeground,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
          text: {
            color: theme.colors.foreground,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: theme.colors.secondary,
            borderWidth: 0,
          },
          text: {
            color: theme.colors.secondaryForeground,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: theme.colors.foreground,
          },
        };
      case 'link':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: theme.colors.primary,
            textDecorationLine: 'underline',
          },
        };
      default:
        return {
          container: {
            backgroundColor: theme.colors.primary,
            borderWidth: 0,
          },
          text: {
            color: theme.colors.primaryForeground,
          },
        };
    }
  };

  // Get size styles
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            minHeight: 36,
          },
          text: {
            fontSize: theme.typography.small,
          },
        };
      case 'lg':
        return {
          container: {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
            minHeight: 52,
          },
          text: {
            fontSize: theme.typography.subtitle,
          },
        };
      default:
        return {
          container: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            minHeight: 44,
          },
          text: {
            fontSize: theme.typography.body,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const containerStyle = StyleSheet.flatten([
    styles.base,
    variantStyles.container,
    sizeStyles.container,
    disabled && styles.disabled,
    style,
  ]);

  const textStyles = StyleSheet.flatten([
    styles.text,
    variantStyles.text,
    sizeStyles.text,
    disabled && styles.disabledText,
    textStyle,
  ]);

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <ActivityIndicator
            size="small"
            color={variantStyles.text.color}
            style={styles.loader}
          />
          {typeof children === 'string' ? (
            <Text style={textStyles}>{children}</Text>
          ) : (
            children
          )}
        </>
      );
    }

    return typeof children === 'string' ? (
      <Text style={textStyles}>{children}</Text>
    ) : (
      children
    );
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.button,
    ...theme.shadows.sm,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  loader: {
    marginRight: 8,
  },
}); 