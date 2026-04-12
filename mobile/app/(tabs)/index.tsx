import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { StatusBadge } from '../../src/components/StatusBadge';
import { colors, spacing, radius, font, shadows } from '../../src/theme';
import type { Lead, DashboardStats } from '../../src/types';

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, shadows.sm]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: () => api.get<{ leads: Lead[] }>('/leads?limit=5&sort=-created_at'),
  });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Leads"
              value={statsLoading ? '...' : stats?.total_leads ?? 0}
              color={colors.brand[600]}
            />
            <StatCard
              label="New"
              value={statsLoading ? '...' : stats?.recent_new ?? 0}
              color={colors.green[600]}
            />
            <StatCard
              label="Delivered"
              value={statsLoading ? '...' : stats?.recent_delivered ?? 0}
              color={colors.indigo[700]}
            />
            <StatCard
              label="Avg Fraud"
              value={statsLoading ? '...' : `${(stats?.avg_fraud_score ?? 0).toFixed(0)}%`}
              color={colors.yellow[700]}
            />
          </View>

          <Text style={styles.sectionTitle}>Recent Leads</Text>
        </>
      }
      data={recentLeads?.leads ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.leadRow, shadows.sm]}
          onPress={() => router.push(`/lead/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.leadAvatar}>
            <Text style={styles.avatarText}>
              {item.first_name[0]}{item.last_name[0]}
            </Text>
          </View>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.first_name} {item.last_name}</Text>
            <Text style={styles.leadEmail}>{item.email}</Text>
          </View>
          <View style={styles.leadMeta}>
            <StatusBadge status={item.status} />
            <Text style={styles.leadCountry}>{item.country}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        leadsLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brand[600]} />
        ) : (
          <Text style={styles.empty}>No leads yet</Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  statLabel: {
    fontSize: font.sizes.xs,
    color: colors.gray[500],
    fontWeight: font.weights.medium,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: font.sizes['2xl'],
    fontWeight: font.weights.bold,
  },
  sectionTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  leadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    color: colors.brand[700],
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
    color: colors.gray[900],
  },
  leadEmail: {
    fontSize: font.sizes.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  leadMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  leadCountry: {
    fontSize: font.sizes.xs,
    color: colors.gray[400],
  },
  loader: {
    marginTop: spacing['3xl'],
  },
  empty: {
    textAlign: 'center',
    color: colors.gray[400],
    fontSize: font.sizes.sm,
    marginTop: spacing['3xl'],
  },
});
