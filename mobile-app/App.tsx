import React from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, SafeAreaView } from 'react-native';
import { Button } from './src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './src/components/ui/Card';
import { theme } from './src/design-system/tokens';

export default function App() {
  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);

  const handleButtonPress = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const incrementCounter = () => {
    setCount(count + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>PETG Design System</Text>
          <Text style={styles.subtitle}>React Native Demo - Working! ✅</Text>
        </View>

        {/* Interactive Counter Test */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Interactive Test</CardTitle>
            <CardDescription>Testing design system components with state</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              onPress={incrementCounter}
              style={styles.marginBottom}
            >
              Counter: {count}
            </Button>
            <Button 
              variant="outline" 
              onPress={handleButtonPress} 
              loading={loading}
            >
              {loading ? 'Loading...' : 'Test Loading State'}
            </Button>
          </CardContent>
        </Card>

        {/* Color Palette Demo */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Design system colors using tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <View style={styles.colorGrid}>
              <View style={[styles.colorCard, { backgroundColor: theme.colors.brandPurple }]}>
                <Text style={styles.colorLabel}>Brand Purple</Text>
              </View>
              <View style={[styles.colorCard, { backgroundColor: theme.colors.brandYellow }]}>
                <Text style={[styles.colorLabel, { color: '#000' }]}>Brand Yellow</Text>
              </View>
              <View style={[styles.colorCard, { backgroundColor: theme.colors.healthPrimary }]}>
                <Text style={styles.colorLabel}>Health</Text>
              </View>
              <View style={[styles.colorCard, { backgroundColor: theme.colors.connectivityPrimary }]}>
                <Text style={styles.colorLabel}>Connectivity</Text>
              </View>
              <View style={[styles.colorCard, { backgroundColor: theme.colors.activityPrimary }]}>
                <Text style={styles.colorLabel}>Activity</Text>
              </View>
              <View style={[styles.colorCard, { backgroundColor: theme.colors.neutralPrimary }]}>
                <Text style={styles.colorLabel}>Neutral</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Button Variants Demo */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>All button styles with design tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <View style={styles.buttonGrid}>
              <Button variant="default" onPress={handleButtonPress}>
                Primary Button
              </Button>
              <Button variant="secondary" onPress={handleButtonPress}>
                Secondary Button
              </Button>
              <Button variant="outline" onPress={handleButtonPress}>
                Outline Button
              </Button>
              <Button variant="destructive" onPress={handleButtonPress}>
                Destructive Button
              </Button>
              <Button variant="ghost" onPress={handleButtonPress}>
                Ghost Button
              </Button>
              <Button variant="link" onPress={handleButtonPress}>
                Link Button
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Button Sizes Demo */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
            <CardDescription>Responsive sizing from design tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <View style={styles.buttonGrid}>
              <Button size="sm" variant="outline" onPress={handleButtonPress}>
                Small Button
              </Button>
              <Button size="default" variant="default" onPress={handleButtonPress}>
                Default Button
              </Button>
              <Button size="lg" variant="secondary" onPress={handleButtonPress}>
                Large Button
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Typography Demo */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Typography Scale</CardTitle>
            <CardDescription>Font sizes from design tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <Text style={[styles.typeDemo, { fontSize: theme.typography.h1 }]}>
              Heading 1 ({theme.typography.h1}px)
            </Text>
            <Text style={[styles.typeDemo, { fontSize: theme.typography.h2 }]}>
              Heading 2 ({theme.typography.h2}px)
            </Text>
            <Text style={[styles.typeDemo, { fontSize: theme.typography.h3 }]}>
              Heading 3 ({theme.typography.h3}px)
            </Text>
            <Text style={[styles.typeDemo, { fontSize: theme.typography.subtitle }]}>
              Subtitle ({theme.typography.subtitle}px)
            </Text>
            <Text style={[styles.typeDemo, { fontSize: theme.typography.body }]}>
              Body text ({theme.typography.body}px)
            </Text>
            <Text style={[styles.typeDemo, { fontSize: theme.typography.small }]}>
              Small text ({theme.typography.small}px)
            </Text>
          </CardContent>
        </Card>

        {/* Status Indicators Demo */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Status Indicators</CardTitle>
            <CardDescription>Domain-specific colors from tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.healthPrimary }]} />
                <Text style={styles.statusText}>Battery: 85% (Healthy)</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.connectivityPrimary }]} />
                <Text style={styles.statusText}>WiFi Connected</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.activityPrimary }]} />
                <Text style={styles.statusText}>Pet Active</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.neutralPrimary }]} />
                <Text style={styles.statusText}>System Idle</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Footer Card */}
        <Card style={styles.section}>
          <CardContent>
            <Text style={styles.footerText}>
              ✅ Design System Integration Complete!{'\n'}
              • Cross-platform design tokens working{'\n'}
              • Component APIs match web version{'\n'}
              • Ready for production use
            </Text>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" onPress={() => console.log('Footer button pressed')}>
              View Documentation
            </Button>
          </CardFooter>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundPage,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.h1,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.subtitle,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  marginBottom: {
    marginBottom: theme.spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  colorCard: {
    width: 100,
    height: 70,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    margin: theme.spacing.xs,
  },
  colorLabel: {
    color: '#fff',
    fontSize: theme.typography.small,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonGrid: {
    gap: theme.spacing.md,
  },
  typeDemo: {
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  statusGrid: {
    gap: theme.spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  footerText: {
    fontSize: theme.typography.body,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    lineHeight: theme.typography.body * 1.5,
  },
});
