import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, font } from '../../src/theme';

export default function BrokersScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.empty}>
        <Text style={styles.icon}>🏢</Text>
        <Text style={styles.title}>Brokers</Text>
        <Text style={styles.subtitle}>Manage your broker integrations</Text>
        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Add Broker</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  empty: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
    marginBottom: spacing['2xl'],
  },
  button: {
    backgroundColor: colors.brand[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
  },
});
