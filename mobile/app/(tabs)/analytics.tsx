import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, font, shadows } from '../../src/theme';

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <View style={[styles.chartCard, shadows.sm]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartArea}>
        <Text style={styles.chartPlaceholder}>📈</Text>
        <Text style={styles.chartHint}>Chart coming soon</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <ChartPlaceholder title="Leads Over Time" />
      <ChartPlaceholder title="Conversion by Broker" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing.lg,
    gap: spacing.lg,
  },
  chartCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chartTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  chartArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholder: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  chartHint: {
    fontSize: font.sizes.sm,
    color: colors.gray[400],
  },
});
