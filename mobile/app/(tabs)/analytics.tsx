import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useState } from 'react';
import { colors, spacing, radius, font, shadows } from '../../src/theme';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - spacing.lg * 2 - spacing.lg * 2;

type Period = 'today' | '7d' | '30d';

function MiniBarChart({ data, color = colors.brand[500], height = 120 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  const barW = Math.max(4, (CHART_W - data.length * 2) / data.length);
  return (
    <View style={[styles.chartArea, { height }]}>
      {data.map((v, i) => (
        <View key={i} style={{ width: barW, height: `${(v / max) * 100}%`, backgroundColor: i === data.length - 1 ? color : color + '88', borderRadius: 3 }} />
      ))}
    </View>
  );
}

function HorizontalBarRow({ label, value, maxValue, color, suffix = '' }: { label: string; value: number; maxValue: number; color: string; suffix?: string }) {
  return (
    <View style={styles.hbarRow}>
      <Text style={styles.hbarLabel}>{label}</Text>
      <View style={styles.hbarTrack}>
        <View style={[styles.hbarFill, { width: `${(value / maxValue) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.hbarValue, { color }]}>{value.toLocaleString()}{suffix}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('7d');

  const mockLeadsByHour = Array.from({ length: 24 }, (_, i) => Math.round(30 + Math.sin(i / 3) * 20 + Math.random() * 15));
  const mockLeadsByDay = Array.from({ length: period === '7d' ? 7 : 30 }, (_, i) => Math.round(600 + Math.sin(i / 2.5) * 200 + i * 8));

  const topAffiliates = [
    { name: 'TrafficKing', ftd: 148, color: colors.brand[500] },
    { name: 'LeadGen Pro', ftd: 112, color: colors.green[500] },
    { name: 'ClickMedia', ftd: 87, color: colors.indigo[500] },
    { name: 'AffPro', ftd: 64, color: colors.yellow[500] },
    { name: 'MediaBuyer X', ftd: 42, color: colors.red[400] },
    { name: 'CPA Network', ftd: 38, color: colors.emerald[500] },
    { name: 'AdsCorp', ftd: 31, color: colors.orange[500] },
    { name: 'LeadFactory', ftd: 24, color: colors.brand[300] },
    { name: 'ClickPro', ftd: 18, color: colors.gray[500] },
    { name: 'TraffMax', ftd: 14, color: colors.gray[400] },
  ];

  const topCountries = [
    { name: 'DE', leads: 2840, color: colors.brand[500] },
    { name: 'UA', leads: 2120, color: colors.green[500] },
    { name: 'PL', leads: 1680, color: colors.indigo[500] },
    { name: 'RO', leads: 1240, color: colors.yellow[500] },
    { name: 'TR', leads: 980, color: colors.red[400] },
    { name: 'BR', leads: 840, color: colors.emerald[500] },
    { name: 'GB', leads: 620, color: colors.orange[500] },
    { name: 'CA', leads: 480, color: colors.brand[300] },
    { name: 'AU', leads: 340, color: colors.gray[500] },
    { name: 'NL', leads: 290, color: colors.gray[400] },
  ];

  const maxFtd = Math.max(...topAffiliates.map(a => a.ftd));
  const maxLeads = Math.max(...topCountries.map(c => c.leads));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['today', '7d', '30d'] as Period[]).map(p => (
          <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.periodBtn, period === p && styles.periodBtnActive]}>
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
              {p === 'today' ? 'Today' : p === '7d' ? 'Last 7d' : 'Last 30d'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leads by hour/day */}
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>
          {period === 'today' ? 'Leads by Hour' : `Leads — ${period === '7d' ? '7' : '30'} Days`}
        </Text>
        <MiniBarChart data={period === 'today' ? mockLeadsByHour : mockLeadsByDay} height={140} />
      </View>

      {/* Top affiliates by FTD */}
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>Top 10 Affiliates by FTD</Text>
        {topAffiliates.map(a => (
          <HorizontalBarRow key={a.name} label={a.name} value={a.ftd} maxValue={maxFtd} color={a.color} />
        ))}
      </View>

      {/* Top GEO by leads */}
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>Top 10 GEO by Leads</Text>
        {topCountries.map(c => (
          <HorizontalBarRow key={c.name} label={c.name} value={c.leads} maxValue={maxLeads} color={c.color} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  periodBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center',
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200],
  },
  periodBtnActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  periodBtnText: { fontSize: font.sizes.sm, fontWeight: font.weights.medium, color: colors.gray[600] },
  periodBtnTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.gray[200], marginBottom: spacing.lg,
  },
  cardTitle: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.gray[900], marginBottom: spacing.lg },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  hbarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  hbarLabel: { width: 90, fontSize: font.sizes.xs, color: colors.gray[600], fontWeight: font.weights.medium },
  hbarTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.gray[100], overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 5 },
  hbarValue: { width: 50, textAlign: 'right', fontSize: font.sizes.xs, fontWeight: font.weights.bold },
});
