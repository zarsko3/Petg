import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import designTokens from '../design-tokens.json';

// Convert HSL to RGB for React Native
const hslToRgb = (hsl: string): string => {
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

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

const Header = React.forwardRef<View, HeaderProps>(
  ({ 
    title = 'Welcome!',
    subtitle,
    leftActions,
    rightActions,
    style,
    titleStyle,
    subtitleStyle,
    ...props 
  }, ref) => {
    const backgroundColor = hslToRgb(designTokens.colors.semantic.background.light);
    const borderColor = hslToRgb(designTokens.colors.semantic.border.light);
    const foregroundColor = hslToRgb(designTokens.colors.semantic.foreground.light);
    const mutedForegroundColor = hslToRgb(designTokens.colors.semantic['muted-foreground'].light);
    
    return (
      <View
        ref={ref}
        style={[
          styles.header,
          {
            backgroundColor: backgroundColor,
            borderBottomColor: borderColor,
            height: parseInt(designTokens.spacing.layout.topbar),
            paddingHorizontal: parseInt(designTokens.spacing.padding['2xl']),
          },
          style,
        ]}
        {...props}
      >
        <View style={styles.leftSection}>
          {leftActions}
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: foregroundColor,
                  fontSize: parseInt(designTokens.fonts.size.subtitle),
                  fontWeight: designTokens.fonts.weight.semibold,
                },
                titleStyle,
              ]}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: mutedForegroundColor,
                    fontSize: parseInt(designTokens.fonts.size.body),
                    fontWeight: designTokens.fonts.weight.normal,
                  },
                  subtitleStyle,
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.rightSection}>
          {rightActions}
        </View>
      </View>
    );
  }
);

Header.displayName = 'Header';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    // Note: backdrop-blur effect not available in React Native
    // Would need to use a library like @react-native-community/blur
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    marginLeft: 16,
  },
  title: {
    lineHeight: 22,
  },
  subtitle: {
    lineHeight: 18,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});

export { Header }; 