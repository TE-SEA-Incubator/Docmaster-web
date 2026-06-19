import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import { useGlobalStats, usePerformanceStats } from '@/core/hooks/useStats';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBottomTabClearance } from '@/hooks/useBottomTabClearance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUICK_FILTERS = ['CNI', 'Passeport', 'Permis', 'Diplôme', 'Acte'];

type ResultDoc = {
  id: string;
  owner_name?: string;
  date_trouvaille?: string;
  date_perte?: string;
  created_at?: string;
  ville?: string;
  photo_recto?: string;
  document_type?: string;
  docTypeInfo?: { nom?: string };
  is_lost?: boolean;
  numero_document?: string;
  doc_type?: string;
};

function getDocIcon(name?: string): keyof typeof Ionicons.glyphMap {
  const t = (name || '').toLowerCase();
  if (t.includes('cni') || t.includes('carte')) return 'id-card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome')) return 'school-outline';
  if (t.includes('acte')) return 'document-text-outline';
  if (t.includes('banque') || t.includes('banq')) return 'card-outline';
  return 'document-text-outline';
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function StatCard({
  icon,
  value,
  label,
  iconBg,
  iconColor,
  loading,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  iconBg: string;
  iconColor: string;
  loading: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {loading ? '…' : value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function PerfCard({
  doc,
  colors,
  onPress,
}: {
  doc: { name: string; count: number; trend?: number };
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  const trend = parseFloat(String(doc.trend)) || 0;
  const isUp = trend >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.perfCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.perfTopRow}>
        <Ionicons name={getDocIcon(doc.name)} size={18} color={colors.primary} />
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: isUp ? colors.successBg : colors.dangerBg },
          ]}
        >
          <Ionicons
            name={isUp ? 'trending-up' : 'trending-down'}
            size={9}
            color={isUp ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.trendText,
              { color: isUp ? colors.success : colors.danger },
            ]}
          >
            {Math.abs(trend)}%
          </Text>
        </View>
      </View>
      <Text style={[styles.perfName, { color: colors.text }]} numberOfLines={1}>
        {doc.name}
      </Text>
      <Text style={[styles.perfCount, { color: colors.primary }]}>
        {doc.count.toLocaleString()}
      </Text>
      <View style={[styles.perfBarBg, { backgroundColor: colors.inputBg }]}>
        <View
          style={[
            styles.perfBarFill,
            {
              backgroundColor: colors.primary,
              width: `${Math.min(100, (doc.count / 1000) * 100)}%`,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function RechercherScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const clearance = useBottomTabClearance();
  const { user } = useAuthStore();
  const { stats, loading: statsLoading } = useGlobalStats();
  const { stats: perfStats, loading: perfLoading } = usePerformanceStats();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasLost = useMemo(() => {
    // Best-effort flag — page works for guest users too, so we don't fail if the
    // call returns 401. The CTA to claim a document is gated on this.
    return false;
  }, []);

  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await declarationsService.searchPublic(q.trim());
      setResults((res?.data as ResultDoc[]) || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await performSearch(query);
    setRefreshing(false);
  }, [performSearch, query]);

  const handleSearch = () => performSearch(query);
  const clearQuery = () => { setQuery(''); setResults([]); setSearched(false); };

  const handleQuick = (f: string) => {
    setQuery(f);
    performSearch(f);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
            backgroundColor: colors.surface,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.text }]}>Rechercher</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Statistiques & recherche de documents
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: clearance + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Platform stats — same role as the web Dashboard header */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="document-text-outline"
            value={stats?.total_declarations ?? 0}
            label="Déclarations"
            iconBg={colors.warningBg}
            iconColor={colors.warning}
            loading={statsLoading}
            colors={colors}
          />
          <StatCard
            icon="alert-outline"
            value={stats?.total_lost ?? 0}
            label="Documents perdus"
            iconBg={colors.dangerBg}
            iconColor={colors.danger}
            loading={statsLoading}
            colors={colors}
          />
          <StatCard
            icon="heart-outline"
            value={stats?.total_recovered ?? 0}
            label="Documents restitués"
            iconBg={colors.purpleBg}
            iconColor={colors.purple}
            loading={statsLoading}
            colors={colors}
          />
          <StatCard
            icon="people-outline"
            value={stats?.total_users ?? 0}
            label="Utilisateurs"
            iconBg={colors.infoBg}
            iconColor={colors.info}
            loading={statsLoading}
            colors={colors}
          />
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder="N° document, nom, type…"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={clearQuery} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSearch}
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.searchBtnText, { color: colors.onPrimary }]}>OK</Text>
            </Pressable>
          </View>
          <View style={styles.chipsRow}>
            <Text style={[styles.chipsLabel, { color: colors.textSecondary }]}>
              FILTRES&nbsp;:
            </Text>
            {QUICK_FILTERS.map((f) => {
              const active = query === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => handleQuick(f)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? colors.onPrimary : colors.text,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Performance per doc type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Activité par type
              </Text>
            </View>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              ce mois
            </Text>
          </View>

          {perfLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : perfStats.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              Pas encore d'activité disponible.
            </Text>
          ) : (
            <View style={styles.perfGrid}>
              {perfStats.slice(0, 6).map((doc) => (
                <PerfCard
                  key={doc.name}
                  doc={doc}
                  colors={colors}
                  onPress={() => {
                    setQuery(doc.name);
                    performSearch(doc.name);
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* Results */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-outline" size={16} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Résultats
              </Text>
            </View>
            {searched && !loading ? (
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                {results.length} trouvé{results.length > 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          ) : !searched ? (
            <View style={styles.placeholder}>
              <Ionicons name="search-outline" size={42} color={colors.textSecondary} />
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                Recherchez un document
              </Text>
              <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
                Saisissez un numéro, un nom ou un type de document. Les photos sont
                protégées tant que vous n'avez pas déclaré une perte.
              </Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.placeholder}>
              <Ionicons name="sad-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                Aucun résultat
              </Text>
              <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
                Essayez un autre terme ou retirez le filtre rapide.
              </Text>
              {!user ? null : (
                <Pressable
                  onPress={() => router.push('/(tabs)/declarer')}
                  style={[styles.cta, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.onPrimary} />
                  <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
                    Déclarer une perte
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {results.map((doc) => {
                const isLost = doc.is_lost;
                const docName =
                  doc.docTypeInfo?.nom || doc.document_type || doc.doc_type || 'Document';
                return (
                  <View
                    key={doc.id}
                    style={[
                      styles.resultCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.resultBadge,
                        { backgroundColor: isLost ? colors.dangerBg : colors.successBg },
                      ]}
                    >
                      <Ionicons
                        name={getDocIcon(docName)}
                        size={18}
                        color={isLost ? colors.danger : colors.success}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.resultTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {docName}
                      </Text>
                      {doc.numero_document ? (
                        <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                          N° {doc.numero_document}
                        </Text>
                      ) : null}
                      {doc.owner_name ? (
                        <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                          {doc.owner_name}
                        </Text>
                      ) : null}
                      <View style={styles.resultFooter}>
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: isLost ? colors.dangerBg : colors.successBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              { color: isLost ? colors.danger : colors.success },
                            ]}
                          >
                            {isLost ? 'Perdu' : 'Trouvé'}
                          </Text>
                        </View>
                        <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                          <Ionicons name="calendar-outline" size={10} /> {formatDate(
                            doc.date_trouvaille || doc.date_perte || doc.created_at,
                          )}
                        </Text>
                        {doc.ville ? (
                          <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                            <Ionicons name="location-outline" size={10} /> {doc.ville}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}

              {!hasLost && !user ? (
                <Pressable
                  onPress={() => router.push('/(tabs)/declarer')}
                  style={[styles.cta, { backgroundColor: colors.primary, alignSelf: 'center', marginTop: 8 }]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.onPrimary} />
                  <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
                    Déclarer une perte pour révéler les photos
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: (SCREEN_WIDTH - 16 * 2 - 10) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  statLabel: { fontSize: 11 },
  searchCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  searchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  searchBtnText: { fontSize: 12, fontWeight: '800' },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chipsLabel: { fontSize: 10, fontWeight: '800', marginRight: 4 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 11.5 },
  section: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionHint: { fontSize: 11, fontStyle: 'italic' },
  emptyHint: { textAlign: 'center', fontSize: 12, marginTop: 12 },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  perfCard: {
    width: (SCREEN_WIDTH - 16 * 2 - 10) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  perfTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: { fontSize: 10, fontWeight: '700' },
  perfName: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  perfCount: { fontSize: 16, fontWeight: '800' },
  perfBarBg: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  perfBarFill: { height: '100%', borderRadius: 2 },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  placeholderTitle: { fontSize: 15, fontWeight: '800' },
  placeholderSub: { fontSize: 12, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 13.5, fontWeight: '700' },
  resultMeta: { fontSize: 11, marginTop: 1 },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  resultDate: { fontSize: 10 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  ctaText: { fontSize: 12.5, fontWeight: '800' },
});
