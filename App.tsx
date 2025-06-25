import React from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, SafeAreaView, TouchableOpacity } from 'react-native';

export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>PETG Design System</Text>
          <Text style={styles.subtitle}>React Native Demo - Working!</Text>
        </View>

        {/* Simple Counter Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Functionality Test</Text>
          <Text style={styles.description}>
            This is a simplified version to test basic React Native functionality
          </Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setCount(count + 1)}
          >
            <Text style={styles.buttonText}>Count: {count}</Text>
          </TouchableOpacity>
        </View>

        {/* Color Palette Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Palette</Text>
          <View style={styles.colorGrid}>
            <View style={[styles.colorCard, { backgroundColor: '#8844ee' }]}>
              <Text style={styles.colorLabel}>Brand Purple</Text>
            </View>
            <View style={[styles.colorCard, { backgroundColor: '#ffdd22' }]}>
              <Text style={[styles.colorLabel, { color: '#000' }]}>Brand Yellow</Text>
            </View>
            <View style={[styles.colorCard, { backgroundColor: '#22c55e' }]}>
              <Text style={styles.colorLabel}>Health</Text>
            </View>
            <View style={[styles.colorCard, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.colorLabel}>Connectivity</Text>
            </View>
          </View>
        </View>

        {/* Button Variants Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Button Variants</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={[styles.button, styles.primaryButton]}>
              <Text style={styles.buttonText}>Primary Button</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
              <Text style={[styles.buttonText, { color: '#333' }]}>Secondary Button</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.outlineButton]}>
              <Text style={[styles.buttonText, { color: '#8844ee' }]}>Outline Button</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Typography Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Typography Scale</Text>
          <Text style={[styles.typeDemo, { fontSize: 32 }]}>Heading 1 (32px)</Text>
          <Text style={[styles.typeDemo, { fontSize: 28 }]}>Heading 2 (28px)</Text>
          <Text style={[styles.typeDemo, { fontSize: 24 }]}>Heading 3 (24px)</Text>
          <Text style={[styles.typeDemo, { fontSize: 18 }]}>Subtitle (18px)</Text>
          <Text style={[styles.typeDemo, { fontSize: 14 }]}>Body text (14px)</Text>
        </View>

        {/* Status Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Indicators</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.statusText}>Battery: 85%</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#a855f7' }]} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ✅ Basic React Native app is working!{'\n'}
            Design tokens will be added next.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCard: {
    width: 80,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  colorLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonGrid: {
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#8844ee',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8844ee',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  typeDemo: {
    color: '#333333',
    marginBottom: 8,
  },
  statusGrid: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#333333',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 