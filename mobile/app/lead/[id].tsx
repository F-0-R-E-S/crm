import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';
import { StatusBadge } from '../../src/components/StatusBadge';
import { colors, spacing, radius, font, shadows } from '../../src/theme';
import type { Lead, LeadEvent } from '../../src/types';

interface LeadHistoryResponse {
  lead_id: string;
  history: Array<{
    id: string;
    event_type: string;
    raw_body?: Record<string, unknown>;
    created_at: string;
  }>;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function fraudScoreColor(score?: number) {
  if (score == null) return colors.gray[400];
  if (score >= 80) return colors.green[600];
  if (score >= 50) return colors.yellow[700];
  return colors.red[600];
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<Lead>(`/leads/${id}`),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ['lead-events', id],
    queryFn: () => api.get<LeadHistoryResponse>(`/leads/${id}/history`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>Lead not found</Text>
      </View>
    );
  }

  const events: LeadEvent[] = (historyData?.history ?? []).map((entry) => ({
    id: entry.id,
    event_type: entry.event_type,
    payload: entry.raw_body,
    created_at: entry.created_at,
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Identity */}
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.headerRow}>
          <Text style={styles.leadName}>{lead.first_name} {lead.last_name}</Text>
          <StatusBadge status={lead.status} />
        </View>
        <View style={styles.detailsGrid}>
          <DetailRow label="ID" value={lead.id} />
          <DetailRow label="Email" value={lead.email} />
          <DetailRow label="Phone" value={lead.phone} />
          <DetailRow label="Country" value={lead.country} />
          <DetailRow label="IP Address" value={lead.ip_address} />
          <DetailRow label="Affiliate" value={lead.affiliate_id} />
          <DetailRow label="Broker" value={lead.broker_id} />
          <DetailRow label="Funnel" value={lead.funnel_id} />
          <DetailRow label="Offer" value={lead.offer_id} />
          <DetailRow label="Click ID" value={lead.click_id} />
          <DetailRow label="Created" value={format(new Date(lead.created_at), 'MMM d, yyyy HH:mm')} />
          <DetailRow label="Updated" value={format(new Date(lead.updated_at), 'MMM d, yyyy HH:mm')} />
        </View>
      </View>

      {/* Fraud Verification */}
      {(lead.fraud_score != null || lead.fraud_checks) && (
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Fraud Verification</Text>
          {lead.fraud_score != null && (
            <View style={styles.fraudScoreRow}>
              <Text style={styles.fraudLabel}>Score</Text>
              <View style={[styles.fraudBadge, { backgroundColor: fraudScoreColor(lead.fraud_score) + '20' }]}>
                <Text style={[styles.fraudScoreText, { color: fraudScoreColor(lead.fraud_score) }]}>
                  {lead.fraud_score}%
                </Text>
              </View>
            </View>
          )}
          {lead.fraud_checks?.map((check, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={[styles.checkIcon, { backgroundColor: check.passed ? colors.green[100] : colors.red[100] }]}>
                <Text style={{ color: check.passed ? colors.green[600] : colors.red[600] }}>
                  {check.passed ? '✓' : '✗'}
                </Text>
              </View>
              <Text style={styles.checkName}>{check.check}</Text>
              {check.score != null && (
                <Text style={styles.checkScore}>{check.score}%</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Event Timeline */}
      {events.length > 0 && (
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Event Timeline</Text>
          {events.map((event, i) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.timelineDot} />
              {i < events.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.eventContent}>
                <Text style={styles.eventType}>{event.event_type}</Text>
                <Text style={styles.eventTime}>
                  {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                </Text>
                {event.payload && (
                  <Text style={styles.eventPayload}>
                    {JSON.stringify(event.payload, null, 2)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  errorText: {
    fontSize: font.sizes.md,
    color: colors.gray[500],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  leadName: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    color: colors.gray[900],
  },
  detailsGrid: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
  },
  detailValue: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
    color: colors.gray[700],
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.lg,
  },
  sectionTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  fraudScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  fraudLabel: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
  },
  fraudBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  fraudScoreText: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkName: {
    flex: 1,
    fontSize: font.sizes.sm,
    color: colors.gray[700],
  },
  checkScore: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
  },
  eventRow: {
    flexDirection: 'row',
    paddingLeft: spacing.sm,
    marginBottom: spacing.md,
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand[600],
    marginTop: 4,
    marginRight: spacing.md,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: spacing.sm + 4,
    top: 14,
    bottom: -spacing.md,
    width: 2,
    backgroundColor: colors.gray[200],
  },
  eventContent: {
    flex: 1,
  },
  eventType: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
    color: colors.gray[900],
  },
  eventTime: {
    fontSize: font.sizes.xs,
    color: colors.gray[400],
    marginTop: 2,
  },
  eventPayload: {
    fontSize: font.sizes.xs,
    color: colors.gray[500],
    fontFamily: 'monospace',
    marginTop: spacing.xs,
    backgroundColor: colors.gray[50],
    padding: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
