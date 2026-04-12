import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { StatusBadge } from '../../src/components/StatusBadge';
import { colors, spacing, radius, font, shadows } from '../../src/theme';
import type { Lead, LeadsResponse } from '../../src/types';

export default function LeadsScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const perPage = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () =>
      api.get<LeadsResponse>(
        `/leads?page=${page}&per_page=${perPage}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      ),
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

  function fraudColor(score?: number) {
    if (score == null) return colors.gray[400];
    if (score >= 80) return colors.green[600];
    if (score >= 50) return colors.yellow[700];
    return colors.red[600];
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor={colors.gray[400]}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isFetching && <ActivityIndicator size="small" color={colors.brand[600]} />}
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.leadCard, shadows.sm]}
            onPress={() => router.push(`/lead/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.leadHeader}>
              <View style={styles.leadAvatar}>
                <Text style={styles.avatarText}>
                  {item.first_name[0]}{item.last_name[0]}
                </Text>
              </View>
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.leadEmail}>{item.email}</Text>
              </View>
            </View>
            <View style={styles.leadDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Country</Text>
                <Text style={styles.detailValue}>{item.country}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fraud Score</Text>
                <Text style={[styles.detailValue, { color: fraudColor(item.fraud_score) }]}>
                  {item.fraud_score != null ? `${item.fraud_score}%` : '—'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} size="large" color={colors.brand[600]} />
          ) : (
            <Text style={styles.empty}>No leads found</Text>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                {page} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.sizes.sm,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },
  list: {
    padding: spacing.lg,
  },
  leadCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  leadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.gray[900],
  },
  leadEmail: {
    fontSize: font.sizes.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  leadDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: font.sizes.xs,
    color: colors.gray[500],
  },
  detailValue: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
    color: colors.gray[700],
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  pageButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brand[600],
    borderRadius: radius.md,
  },
  pageButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  pageButtonText: {
    color: colors.white,
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  pageInfo: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
  },
  loader: {
    marginTop: spacing['4xl'],
  },
  empty: {
    textAlign: 'center',
    color: colors.gray[400],
    fontSize: font.sizes.sm,
    marginTop: spacing['4xl'],
  },
});
