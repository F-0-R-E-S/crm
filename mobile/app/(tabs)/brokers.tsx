import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { colors, spacing, radius, font, shadows } from '../../src/theme';

interface CapStatus {
  broker_id: string;
  broker_name: string;
  daily_cap: number;
  daily_used: number;
  daily_pct: number;
  total_cap: number;
  total_used: number;
  total_pct: number;
  eta_full_minutes?: number;
  fill_rate_per_hour: number;
  status: 'normal' | 'warning' | 'critical' | 'full' | 'paused';
}

function capColor(status: string) {
  if (status === 'full') return colors.red[500];
  if (status === 'critical') return colors.red[500];
  if (status === 'warning') return colors.yellow[500];
  if (status === 'paused') return colors.gray[400];
  return colors.green[500];
}

function ProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color, height }]} />
    </View>
  );
}

function CapCard({ cap, onPause, onResume, onReset }: { cap: CapStatus; onPause: () => void; onResume: () => void; onReset: () => void }) {
  const statusColor = capColor(cap.status);
  return (
    <View style={[styles.capCard, shadows.sm]}>
      <View style={styles.capHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.capName}>{cap.broker_name}</Text>
          <View style={styles.capStatusRow}>
            <View style={[styles.capStatusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.capStatusText, { color: statusColor }]}>{cap.status.toUpperCase()}</Text>
            </View>
            {cap.eta_full_minutes != null && cap.status !== 'full' && cap.status !== 'paused' && (
              <Text style={[styles.capEta, { color: cap.eta_full_minutes < 60 ? colors.red[500] : colors.yellow[600] }]}>
                Full in ~{cap.eta_full_minutes}m
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.capPct, { color: statusColor }]}>{cap.daily_pct.toFixed(0)}%</Text>
          <Text style={styles.capRate}>{cap.fill_rate_per_hour}/h</Text>
        </View>
      </View>

      <View style={styles.capSection}>
        <View style={styles.capLabelRow}>
          <Text style={styles.capLabel}>Daily</Text>
          <Text style={styles.capValues}>{cap.daily_used} / {cap.daily_cap}</Text>
        </View>
        <ProgressBar pct={cap.daily_pct} color={statusColor} height={8} />
      </View>

      <View style={styles.capSection}>
        <View style={styles.capLabelRow}>
          <Text style={styles.capLabel}>Total</Text>
          <Text style={styles.capValues}>{cap.total_used.toLocaleString()} / {cap.total_cap.toLocaleString()}</Text>
        </View>
        <ProgressBar pct={cap.total_pct} color={colors.brand[400]} />
      </View>

      <View style={styles.capActions}>
        {cap.status !== 'paused' ? (
          <TouchableOpacity style={[styles.capActionBtn, { borderColor: colors.yellow[400] }]} onPress={onPause}>
            <Text style={[styles.capActionText, { color: colors.yellow[600] }]}>Pause</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.capActionBtn, { borderColor: colors.green[400] }]} onPress={onResume}>
            <Text style={[styles.capActionText, { color: colors.green[600] }]}>Resume</Text>
          </TouchableOpacity>
        )}
        {cap.status === 'full' && (
          <TouchableOpacity style={[styles.capActionBtn, { borderColor: colors.brand[400] }]} onPress={onReset}>
            <Text style={[styles.capActionText, { color: colors.brand[600] }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const MOCK_CAPS: CapStatus[] = [
  { broker_id: '1', broker_name: 'AlphaFX Pro', daily_cap: 500, daily_used: 437, daily_pct: 87.4, total_cap: 10000, total_used: 9360, total_pct: 93.6, eta_full_minutes: 28, fill_rate_per_hour: 45, status: 'critical' },
  { broker_id: '2', broker_name: 'TradingHub', daily_cap: 400, daily_used: 312, daily_pct: 78.0, total_cap: 12000, total_used: 8610, total_pct: 71.8, eta_full_minutes: 120, fill_rate_per_hour: 32, status: 'warning' },
  { broker_id: '3', broker_name: 'ForexDirect', daily_cap: 300, daily_used: 189, daily_pct: 63.0, total_cap: 8000, total_used: 5220, total_pct: 65.3, fill_rate_per_hour: 22, status: 'normal' },
  { broker_id: '4', broker_name: 'CryptoLeads+', daily_cap: 350, daily_used: 350, daily_pct: 100, total_cap: 7000, total_used: 5940, total_pct: 84.9, fill_rate_per_hour: 0, status: 'full' },
  { broker_id: '5', broker_name: 'BinaryWorld', daily_cap: 250, daily_used: 124, daily_pct: 49.6, total_cap: 6000, total_used: 4290, total_pct: 71.5, fill_rate_per_hour: 15, status: 'normal' },
  { broker_id: '6', broker_name: 'MarketPlus', daily_cap: 200, daily_used: 78, daily_pct: 39.0, total_cap: 4000, total_used: 2670, total_pct: 66.8, fill_rate_per_hour: 10, status: 'normal' },
];

export default function BrokersScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: capsData } = useQuery({
    queryKey: ['broker-caps'],
    queryFn: () => api.get<{ caps: CapStatus[] }>('/brokers/caps').catch(() => ({ caps: MOCK_CAPS })),
    refetchInterval: 30_000,
  });

  const caps = capsData?.caps ?? MOCK_CAPS;
  const sorted = [...caps].sort((a, b) => b.daily_pct - a.daily_pct);
  const criticalCount = caps.filter(c => c.status === 'critical' || c.status === 'full').length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['broker-caps'] });
    setRefreshing(false);
  }, [queryClient]);

  function handlePause(broker: CapStatus) {
    Alert.alert('Pause Broker', `Pause ${broker.broker_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pause', style: 'destructive', onPress: () => {
        api.post(`/brokers/${broker.broker_id}/pause`, {}).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['broker-caps'] });
      }},
    ]);
  }

  function handleResume(broker: CapStatus) {
    api.post(`/brokers/${broker.broker_id}/resume`, {}).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['broker-caps'] });
  }

  function handleReset(broker: CapStatus) {
    Alert.alert('Reset Cap', `Reset daily counter for ${broker.broker_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => {
        api.post(`/brokers/${broker.broker_id}/reset-cap`, {}).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['broker-caps'] });
      }},
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[600]} />}>
      {/* Summary */}
      <View style={[styles.summaryCard, shadows.sm]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{caps.length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, criticalCount > 0 && { color: colors.red[500] }]}>{criticalCount}</Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{caps.reduce((s, c) => s + c.fill_rate_per_hour, 0)}</Text>
            <Text style={styles.summaryLabel}>Leads/h</Text>
          </View>
        </View>
      </View>

      {/* Batch actions */}
      <View style={styles.batchRow}>
        <TouchableOpacity style={[styles.batchBtn, { borderColor: colors.yellow[400] }]} onPress={() => Alert.alert('Pause All', 'Pause all active brokers?', [{ text: 'Cancel' }, { text: 'Pause All', style: 'destructive' }])}>
          <Text style={[styles.batchBtnText, { color: colors.yellow[600] }]}>Pause All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.batchBtn, { borderColor: colors.green[400] }]} onPress={() => Alert.alert('Resume All', 'Resume all paused brokers?', [{ text: 'Cancel' }, { text: 'Resume All' }])}>
          <Text style={[styles.batchBtnText, { color: colors.green[600] }]}>Resume All</Text>
        </TouchableOpacity>
      </View>

      {sorted.map(cap => (
        <CapCard key={cap.broker_id} cap={cap} onPause={() => handlePause(cap)} onResume={() => handleResume(cap)} onReset={() => handleReset(cap)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  summaryCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.gray[200], marginBottom: spacing.lg,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.gray[200] },
  summaryValue: { fontSize: font.sizes['2xl'], fontWeight: font.weights.bold, color: colors.gray[900] },
  summaryLabel: { fontSize: font.sizes.xs, color: colors.gray[500], marginTop: 2 },
  batchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  batchBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center',
    borderWidth: 1, backgroundColor: colors.white,
  },
  batchBtnText: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold },
  capCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.gray[200], marginBottom: spacing.md,
  },
  capHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  capName: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.gray[900] },
  capStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  capStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  capStatusText: { fontSize: 10, fontWeight: font.weights.bold },
  capEta: { fontSize: font.sizes.xs, fontWeight: font.weights.medium },
  capPct: { fontSize: font.sizes.xl, fontWeight: font.weights.bold },
  capRate: { fontSize: font.sizes.xs, color: colors.gray[400], marginTop: 2 },
  capSection: { marginBottom: spacing.sm },
  capLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  capLabel: { fontSize: font.sizes.xs, color: colors.gray[500], fontWeight: font.weights.medium },
  capValues: { fontSize: font.sizes.xs, color: colors.gray[600] },
  progressTrack: { borderRadius: 4, backgroundColor: colors.gray[100], overflow: 'hidden' },
  progressFill: { borderRadius: 4 },
  capActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  capActionBtn: { flex: 1, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1 },
  capActionText: { fontSize: font.sizes.xs, fontWeight: font.weights.semibold },
});
