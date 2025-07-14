import React from 'react';
import { Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { designTokens, getColor } from './tokens';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const getBadgeStyles = (variant: BadgeVariant = 'default'): { container: ViewStyle; text: TextStyle } => {
  switch (variant) {
    case 'secondary':
      return {
        container: {
          backgroundColor: getColor('semantic.secondary', 'light'),
          borderColor: 'transparent',
        },
        text: {
          color: getColor('semantic.secondary-foreground', 'light'),
        },
      };
    case 'destructive':
      return {
        container: {
          backgroundColor: getColor('semantic.destructive', 'light'),
          borderColor: 'transparent',
        },
        text: {
          color: getColor('semantic.destructive-foreground', 'light'),
        },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: getColor('semantic.border', 'light'),
        },
        text: {
          color: getColor('semantic.foreground', 'light'),
        },
      };
    case 'default':
    default:
      return {
        container: {
          backgroundColor: getColor('semantic.primary', 'light'),
          borderColor: 'transparent',
        },
        text: {
          color: getColor('semantic.primary-foreground', 'light'),
        },
      };
  }
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const badgeStyles = getBadgeStyles(variant);
  return (
    <View
      style={[
        styles.container,
        badgeStyles.container,
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.text, badgeStyles.text, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minHeight: 20,
    minWidth: 32,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default Badge; 