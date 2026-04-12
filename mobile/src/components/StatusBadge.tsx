import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

const statusStyles: Record<string, { bg: string; text: string }> = {
  new: { bg: colors.blue[100], text: colors.blue[700] },
  processing: { bg: colors.yellow[100], text: colors.yellow[700] },
  qualified: { bg: colors.indigo[100], text: colors.indigo[700] },
  delivered: { bg: colors.green[100], text: colors.green[700] },
  deposited: { bg: colors.emerald[100], text: colors.emerald[700] },
  rejected: { bg: colors.red[100], text: colors.red[700] },
  fraud: { bg: colors.red[200], text: colors.red[800] },
  duplicate: { bg: colors.orange[100], text: colors.orange[700] },
  invalid: { bg: colors.gray[100], text: colors.gray[600] },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] ?? { bg: colors.gray[100], text: colors.gray[600] };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs - 1,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  text: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.medium,
    textTransform: 'capitalize',
  },
});
