import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { StatusBadge } from '../../src/components/StatusBadge';
import { colors, spacing, radius, font, shadows } from '../../src/theme';
import type { Lead } from '../../src/types';

interface AnalyticsDashboardResponse {
  kpi: {
    leads_today: number;
    leads_week: number;
    leads_month: number;
    conversion_rate: number;
    fraud_rate: number;
    active_brokers: number;
    active_affiliates: number;
    revenue_today: number;
    rejected_rate: number;
    ftd_today: number;
  };
  period: string;
  updated_at: string;
}

interface KPIConfig {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  format: (v: number) => string;
}

const KPI_CARDS: KPIConfig[] = [
  { key: 'leads_today', label: 'Leads Today', color: colors.brand[600], bgColor: colors.brand[50], icon: '📥', format: v => v.toLocaleString() },
  { key: 'ftd_today', label: 'FTD Today', color: colors.green[600], bgColor: colors.green[50], icon: '💰', format: v => v.toLocaleString() },
  { key: 'conversion_rate', label: 'CR%', color: colors.indigo[600], bgColor: colors.indigo[50], icon: '📈', format: v => `${v.toFixed(1)}%` },
  { key: 'revenue_today', label: 'Revenue', color: colors.emerald[600], bgColor: colors.emerald[50], icon: '💵', format: v => `$${(v / 1000).toFixed(1)}K` },
  { key: 'active_brokers', label: 'Active Caps', color: colors.yellow[600], bgColor: colors.yellow[50], icon: '🏢', format: v => `${v}` },
  { key: 'fraud_rate', label: 'Rejected', color: colors.red[600], bgColor: colors.red[50], icon: '⊘', format: v => `${v.toFixed(1)}%` },
];

function KPICard({ config, value, isLoading, delta }: { config: KPIConfig; value: number; isLoading: boolean; delta?: number }) {
  return (
    <View style={[styles.kpiCard, shadows.sm, { borderLeftColor: config.color, borderLeftWidth: 3 }]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: config.bgColor }]}>
          <Text style={{ fontSize: 16 }}>{config.icon}</Text>
        </View>
        {delta != null && (
          <View style={[styles.kpiDelta, { backgroundColor: delta >= 0 ? colors.green[50] : colors.red[50] }]}>
            <Text style={[styles.kpiDeltaText, { color: delta >= 0 ? colors.green[600] : colors.red[600] }]}>
              {delta >= 0 ? '+' : ''}{delta}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.kpiValue, { color: config.color }]}>
        {isLoading ? '...' : config.format(value)}
      </Text>
      <Text style={styles.kpiLabel}>{config.label}</Text>
    </View>
  );
}

function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.miniChart}>
      {data.map((v, i) => (
        <View key={i} style={[styles.miniBar, { height: `${(v / max) * 100}%`, backgroundColor: i === data.length - 1 ? colors.brand[500] : colors.brand[200] }]} />
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: analytics, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-dashboard-mobile'],
    queryFn: () => api.get<AnalyticsDashboardResponse>('/analytics/dashboard'),
    refetchInterval: 30_000,
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: () => api.get<{ leads: Lead[] }>('/leads?limit=8&sort=-created_at'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['analytics-dashboard-mobile'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-leads'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const kpi = analytics?.kpi;
  const mockDeltas = [12, 8, 1.2, 15, 0, -2];
  const mockChart = [420, 380, 510, 460, 590, 540, 620, 580, 710, 680, 750, 820, 790, 860];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[600]} />}
      ListHeaderComponent={
        <>
          {/* Sparkline overview */}
          <View style={[styles.overviewCard, shadows.sm]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={styles.overviewLabel}>Leads (14d)</Text>
              <Text style={[styles.overviewDelta, { color: colors.green[600] }]}>+18%</Text>
            </View>
            <MiniBarChart data={mockChart} />
          </View>

          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            {KPI_CARDS.map((config, i) => (
              <KPICard
                key={config.key}
                config={config}
                value={kpi?.[config.key as keyof typeof kpi] as number ?? 0}
                isLoading={statsLoading}
                delta={mockDeltas[i]}
              />
            ))}
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, shadows.sm]} onPress={() => router.push('/(tabs)/leads')}>
              <Text style={{ fontSize: 16 }}>👤</Text>
              <Text style={styles.quickBtnText}>All Leads</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, shadows.sm]} onPress={() => router.push('/(tabs)/analytics')}>
              <Text style={{ fontSize: 16 }}>📈</Text>
              <Text style={styles.quickBtnText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, shadows.sm]} onPress={() => router.push('/(tabs)/brokers')}>
              <Text style={{ fontSize: 16 }}>🏢</Text>
              <Text style={styles.quickBtnText}>Caps</Text>
            </TouchableOpacity>
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
            {item.fraud_score != null && (
              <Text style={[styles.fraudScore, {
                color: item.fraud_score >= 70 ? colors.green[600] : item.fraud_score >= 50 ? colors.yellow[600] : colors.red[600],
              }]}>{item.fraud_score}</Text>
            )}
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
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg },
  overviewCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.gray[200], marginBottom: spacing.lg,
  },
  overviewLabel: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, color: colors.gray[700] },
  overviewDelta: { fontSize: font.sizes.xs, fontWeight: font.weights.bold },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 48 },
  miniBar: { flex: 1, borderRadius: 2, minHeight: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  kpiCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.gray[200],
  },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  kpiIcon: { width: 30, height: 30, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  kpiDelta: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  kpiDeltaText: { fontSize: 10, fontWeight: font.weights.bold },
  kpiValue: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, marginBottom: 2 },
  kpiLabel: { fontSize: font.sizes.xs, color: colors.gray[500], fontWeight: font.weights.medium },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  quickBtn: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.gray[200],
  },
  quickBtnText: { fontSize: font.sizes.xs, fontWeight: font.weights.medium, color: colors.gray[700] },
  sectionTitle: { fontSize: font.sizes.lg, fontWeight: font.weights.semibold, color: colors.gray[900], marginBottom: spacing.md },
  leadRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.gray[200],
  },
  leadAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand[100],
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  avatarText: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, color: colors.brand[700] },
  leadInfo: { flex: 1 },
  leadName: { fontSize: font.sizes.sm, fontWeight: font.weights.medium, color: colors.gray[900] },
  leadEmail: { fontSize: font.sizes.xs, color: colors.gray[500], marginTop: 2 },
  leadMeta: { alignItems: 'flex-end', gap: spacing.xs },
  leadCountry: { fontSize: font.sizes.xs, color: colors.gray[400] },
  fraudScore: { fontSize: font.sizes.xs, fontWeight: font.weights.bold },
  loader: { marginTop: spacing['3xl'] },
  empty: { textAlign: 'center', color: colors.gray[400], fontSize: font.sizes.sm, marginTop: spacing['3xl'] },
});
