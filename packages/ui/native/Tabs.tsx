import React, { useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ScrollView } from 'react-native';
import { designTokens, getColor } from './tokens';

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  style?: ViewStyle;
}

export interface TabsListProps {
  children: ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  style?: ViewStyle;
}

const TabsContext = React.createContext<{
  value: string;
  setValue: (v: string) => void;
} | null>(null);

export const Tabs: React.FC<TabsProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  style,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue! : uncontrolledValue;
  const setValue = (v: string) => {
    if (!isControlled) setUncontrolledValue(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <View style={[{ flexDirection: 'column', gap: 8 }, style]}>{children}</View>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ children, style, scrollable }) => {
  const content = (
    <View style={[styles.tabsList, style]}>{children}</View>
  );
  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {content}
      </ScrollView>
    );
  }
  return content;
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value: triggerValue, children, style, textStyle }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
  const { value, setValue } = ctx;
  const active = value === triggerValue;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => setValue(triggerValue)}
      style={[
        styles.tabsTrigger,
        active ? styles.tabsTriggerActive : null,
        style,
      ]}
    >
      <Text style={[styles.tabsTriggerText, active ? styles.tabsTriggerTextActive : null, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value: contentValue, children, style }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used within Tabs');
  if (ctx.value !== contentValue) return null;
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  tabsList: {
    flexDirection: 'row',
    backgroundColor: getColor('semantic.muted', 'light'),
    borderRadius: 8,
    padding: 3,
    alignItems: 'center',
    minHeight: 36,
    marginBottom: 4,
    gap: 4,
  },
  tabsTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 32,
    minWidth: 60,
    marginHorizontal: 2,
  },
  tabsTriggerActive: {
    backgroundColor: getColor('semantic.background', 'light'),
    borderColor: getColor('semantic.input', 'light'),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabsTriggerText: {
    color: getColor('semantic.foreground', 'light'),
    fontSize: 14,
    fontWeight: '500',
  },
  tabsTriggerTextActive: {
    color: getColor('semantic.foreground', 'light'),
    fontWeight: '700',
  },
}); 