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

interface CardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

const Card = React.forwardRef<View, CardProps>(
  ({ children, style, ...props }, ref) => {
    const cardColor = hslToRgb(designTokens.colors.semantic.card.light);
    const borderColor = hslToRgb(designTokens.colors.semantic.border.light);
    
    return (
      <View
        ref={ref}
        style={[
          styles.card,
          {
            backgroundColor: cardColor,
            borderColor: borderColor,
            borderRadius: parseInt(designTokens.radii.card),
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

const CardHeader = React.forwardRef<View, CardHeaderProps>(
  ({ children, style, ...props }, ref) => (
    <View
      ref={ref}
      style={[
        styles.cardHeader,
        {
          padding: parseInt(designTokens.spacing.padding['2xl']),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

const CardTitle = React.forwardRef<Text, CardTitleProps>(
  ({ children, style, ...props }, ref) => {
    const foregroundColor = hslToRgb(designTokens.colors.semantic['card-foreground'].light);
    
    return (
      <Text
        ref={ref}
        style={[
          styles.cardTitle,
          {
            color: foregroundColor,
            fontSize: parseInt(designTokens.fonts.size.h3),
            fontWeight: designTokens.fonts.weight.semibold,
            lineHeight: parseInt(designTokens.fonts.size.h3) * parseFloat(designTokens.fonts.lineHeight.tight),
          },
          style,
        ]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

const CardDescription = React.forwardRef<Text, CardDescriptionProps>(
  ({ children, style, ...props }, ref) => {
    const mutedForegroundColor = hslToRgb(designTokens.colors.semantic['muted-foreground'].light);
    
    return (
      <Text
        ref={ref}
        style={[
          styles.cardDescription,
          {
            color: mutedForegroundColor,
            fontSize: parseInt(designTokens.fonts.size.body),
            lineHeight: parseInt(designTokens.fonts.size.body) * parseFloat(designTokens.fonts.lineHeight.normal),
          },
          style,
        ]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

const CardContent = React.forwardRef<View, CardContentProps>(
  ({ children, style, ...props }, ref) => (
    <View
      ref={ref}
      style={[
        styles.cardContent,
        {
          padding: parseInt(designTokens.spacing.padding['2xl']),
          paddingTop: 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

const CardFooter = React.forwardRef<View, CardFooterProps>(
  ({ children, style, ...props }, ref) => (
    <View
      ref={ref}
      style={[
        styles.cardFooter,
        {
          padding: parseInt(designTokens.spacing.padding['2xl']),
          paddingTop: 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
);

CardFooter.displayName = 'CardFooter';

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'column',
  },
  cardTitle: {
    letterSpacing: -0.025,
    marginBottom: 6,
  },
  cardDescription: {
    marginTop: 0,
  },
  cardContent: {
    // Base content styles
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }; 