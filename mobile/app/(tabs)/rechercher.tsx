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
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { declarationsService } from '@/core/api/declarationsService';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBottomTabClearance } from '@/hooks/useBottomTabClearance';
import { useGlobalStats, usePerformanceStats } from '@/core/hooks/useStats';
import { documentTypesService } from '@/core/api/declarationsService';
import { API_URL } from '@/constants/api';
import type { Declaration } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUICK_FILTERS = ['CNI', 'Passeport', 'Permis', 'Diplôme'];
const CARD_GAP = 12;
const PAD = 16;
const BACKEND_ROOT = API_URL.replace(/\/api\/?$/, '');

function getFullImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${BACKEND_ROOT}/${path.replace(/^\//, '')}`;
}

function getDocIcon(name?: string): keyof typeof Ionicons.glyphMap {
  const t = (name || '').toLowerCase();
  if (t.includes('cni') || t.includes('carte')) return 'id-card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome')) return 'school-outline';
  if (t.includes('acte')) return 'document-text-outline';
  return 'document-text-outline';
}

function formatDate(d?: string): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function timeAgo(d?: string): string {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return formatDate(d);
}

function SkeletonCard({ width }: { width: number }) {
  const colors = useThemeColors();
  return (
    <View style={[s.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border, width }]}>
      <View style={[s.skeletonPhoto, { backgroundColor: colors.skeleton }]} />
      <View style={s.skeletonBody}>
        <View style={[s.skeletonLine, { backgroundColor: colors.skeleton, width: '60%' }]} />
        <View style={[s.skeletonLine, { backgroundColor: colors.skeleton, width: '40%' }]} />
      </View>
    </View>
  );
}

export default function RechercherScreen() {
  const colors = useThemeColors();
  const clearance = useBottomTabClearance();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');
  const [filterMode, setFilterMode] = useState<'all' | 'found' | 'lost'>('found');

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewTypeName, setPreviewTypeName] = useState('');

  const [docTypeMap, setDocTypeMap] = useState<Record<string, string>>({});

  const { stats, loading: statsLoading } = useGlobalStats();
  const { stats: perfStats, loading: perfLoading } = usePerformanceStats(selectedPeriod);

  const resolveName = useCallback((docType?: string, info?: { nom?: string } | null) => {
    if (info?.nom) return info.nom;
    if (!docType) return t('rechercher:found');
    if (docTypeMap[docType]) return docTypeMap[docType];
    const upper = docType.toUpperCase();
    if (docTypeMap[upper]) return docTypeMap[upper];
    const lower = docType.toLowerCase();
    if (docTypeMap[lower]) return docTypeMap[lower];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docType)) {
      for (const [id, name] of Object.entries(docTypeMap)) {
        if (id.toLowerCase() === lower) return name;
      }
    }
    return docType.replace(/_/g, ' ').replace(/-/g, ' ');
  }, [docTypeMap, t]);

  useEffect(() => {
    documentTypesService.getActive().then(res => {
      if (res.success && res.data) {
        const map: Record<string, string> = {};
        res.data.forEach((dt: any) => { map[dt.id] = dt.nom; if (dt.code) map[dt.code] = dt.nom; });
        setDocTypeMap(map);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    declarationsService.getMyDeclarations().then((res: any) => {
      if (res.success && res.data) {
        const has = res.data.some(
          (d: any) => d.declaration_type === 'LOST' && !['RETURNED', 'CANCELLED', 'CLAIMED'].includes(d.status)
        );
        setHasLost(has);
      }
    }).catch(() => {});
  }, [user]);

  const performSearch = useCallback(async (q: string, mode: 'all' | 'found' | 'lost' = filterMode) => {
    setLoading(true);
    setSearched(true);
    const trimmed = q.trim();
    try {
      const res = await declarationsService.searchPublic(trimmed);
      const all = (res?.data as Declaration[]) || [];
      const filtered = mode === 'all'
        ? all
        : all.filter((d: any) => (mode === 'found'
            ? d.declaration_type === 'FOUND'
            : d.declaration_type === 'LOST'));
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  // Auto-load recent found documents on mount (the page is meant to list
  // documents that have been "retrouvés" first, before the user types anything).
  useEffect(() => {
    performSearch('', 'found');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await performSearch(query, filterMode);
    setRefreshing(false);
  }, [performSearch, query, filterMode]);

  const handleSearch = () => { performSearch(query.trim(), filterMode); };
  const clearQuery = () => { setQuery(''); performSearch('', filterMode); };
  const handleQuick = (f: string) => { setQuery(f); performSearch(f, filterMode); };

  const handlePeriodChange = (period: 'week' | 'month') => {
    setSelectedPeriod(period);
  };

  const openPreview = (doc: any) => {
    setPreviewDoc(doc);
    setShowPreview(true);
  };

  const openTypePreview = (typeName: string, items: any[]) => {
    setPreviewTypeName(typeName);
    setPreviewItems(items || []);
    setShowPreview(true);
  };

  const showFull = hasLost || !!user;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.headerBorder }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={[s.title, { color: colors.text }]}>{t('rechercher:title')}</Text>
          </View>
          <View style={s.iconBtn} />
        </View>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('rechercher:subtitle')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: clearance + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ═══ STATS DASHBOARD ═══ */}
        <View style={s.statsSection}>
          <View style={s.statsHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.text} />
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('rechercher:statsTitle')}</Text>
            </View>
            <View style={s.periodToggle}>
              {(['week', 'month'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => handlePeriodChange(p)}
                  style={[s.periodBtn, {
                    backgroundColor: selectedPeriod === p ? colors.primary : 'transparent',
                    borderColor: selectedPeriod === p ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[s.periodBtnText, {
                    color: selectedPeriod === p ? colors.onPrimary : colors.textSecondary,
                  }]}>{p === 'week' ? t('rechercher:periodWeek') : t('rechercher:periodMonth')}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Global stats cards */}
          <View style={s.statsGrid}>
            <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.statIcon, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.warning} />
              </View>
              <Text style={[s.statValue, { color: colors.text }]}>
                {statsLoading ? '…' : stats?.total_declarations ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>{t('rechercher:statsTotal')}</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.statIcon, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="alert-outline" size={16} color={colors.danger} />
              </View>
              <Text style={[s.statValue, { color: colors.text }]}>
                {statsLoading ? '…' : stats?.total_lost ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>{t('rechercher:statsLost')}</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.statIcon, { backgroundColor: colors.successBg }]}>
                <Ionicons name="heart-outline" size={16} color={colors.success} />
              </View>
              <Text style={[s.statValue, { color: colors.text }]}>
                {statsLoading ? '…' : stats?.total_recovered ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>{t('rechercher:statsFound')}</Text>
            </View>
          </View>

          {/* Performance by doc type */}
          <View style={s.perfSection}>
            <View style={s.perfHeader}>
              <Text style={[s.perfTitle, { color: colors.text }]}>{t('rechercher:perfSectionTitle')}</Text>
              <Text style={[s.perfSubtitle, { color: colors.textSecondary }]}>
                {selectedPeriod === 'week' ? t('rechercher:perfWeek') : t('rechercher:perfMonth')}
              </Text>
            </View>

            {perfLoading ? (
              <View style={s.perfSkeletonRow}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[s.perfSkeletonCard, { backgroundColor: colors.skeleton }]} />
                ))}
              </View>
            ) : perfStats.length === 0 ? (
              <Text style={[s.emptyHint, { color: colors.textSecondary }]}>
                {t('rechercher:perfEmpty')}
              </Text>
            ) : (
              <View style={s.perfGrid}>
                {perfStats.slice(0, 6).map((doc) => {
                  const trend = parseFloat(String(doc.trend)) || 0;
                  const isUp = trend >= 0;
                  return (
                    <Pressable
                      key={doc.name}
                      onPress={() => openTypePreview(resolveName(doc.name), doc.recent_items || [])}
                      style={({ pressed }) => [s.perfCard, {
                        backgroundColor: colors.surface,
                        borderColor: pressed ? colors.primary : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      }]}
                    >
                      <View style={s.perfTopRow}>
                        <Ionicons name={getDocIcon(resolveName(doc.name))} size={16} color={colors.primary} />
                        <View style={[s.trendBadge, { backgroundColor: isUp ? colors.successBg : colors.dangerBg }]}>
                          <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={9} color={isUp ? colors.success : colors.danger} />
                          <Text style={[s.trendText, { color: isUp ? colors.success : colors.danger }]}>
                            {Math.abs(trend)}%
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.perfName, { color: colors.text }]} numberOfLines={1}>{resolveName(doc.name)}</Text>
                      <Text style={[s.perfCount, { color: colors.primary }]}>{doc.count}</Text>
                      <View style={[s.perfBarBg, { backgroundColor: colors.inputBg }]}>
                        <View style={[s.perfBarFill, {
                          backgroundColor: colors.primary,
                          width: `${Math.min(100, (doc.count / Math.max(...perfStats.map(d => d.count), 1)) * 100)}%`,
                        }]} />
                      </View>
                      <Text style={[s.perfPreviewHint, { color: colors.textSecondary }]}>{t('rechercher:perfPreview')}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* ═══ SEARCH ═══ */}
        <View style={[s.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder={t('rechercher:searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={[s.searchInput, { color: colors.text }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={clearQuery} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable onPress={handleSearch} style={[s.searchBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="search" size={16} color={colors.onPrimary} />
            </Pressable>
          </View>

          <View style={s.chipsRow}>
            <Text style={[s.chipsLabel, { color: colors.textSecondary }]}>{t('rechercher:filtersLabel')}</Text>
            {QUICK_FILTERS.map((f) => {
              const active = query === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => handleQuick(f)}
                  style={[s.chip, {
                    backgroundColor: active ? colors.primary : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[s.chipText, {
                    color: active ? colors.onPrimary : colors.text,
                    fontWeight: active ? '700' : '500',
                  }]}>{f}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ═══ DATA PROTECTION NOTICE ═══ */}
        <View style={[s.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.noticeIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[s.noticeText, { color: colors.textSecondary }]}>
            {t('rechercher:protectionNotice')}
          </Text>
        </View>

        {/* ═══ SEARCH RESULTS ═══ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="document-outline" size={16} color={colors.text} />
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                {searched ? t('rechercher:searchedLabel') : t('rechercher:searchLabel')}
              </Text>
            </View>
            {searched && !loading ? (
              <Text style={[s.sectionHint, { color: colors.textSecondary }]}>
                {t('rechercher:foundCount', { count: results.length })}
              </Text>
            ) : null}
          </View>

          {loading ? (
            <View style={s.resultsSkeletonRow}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} width={(SCREEN_WIDTH - PAD * 2 - CARD_GAP) / 2} />
              ))}
            </View>
          ) : !searched ? (
            <View style={s.placeholder}>
              <View style={[s.placeholderIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Ionicons name="search-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[s.placeholderTitle, { color: colors.text }]}>{t('rechercher:placeholderTitle')}</Text>
              <Text style={[s.placeholderSub, { color: colors.textSecondary }]}>
                {t('rechercher:placeholderSub')}
              </Text>
            </View>
          ) : results.length === 0 ? (
            <View style={s.placeholder}>
              <View style={[s.placeholderIcon, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="sad-outline" size={30} color={colors.textSecondary} />
              </View>
              <Text style={[s.placeholderTitle, { color: colors.text }]}>{t('rechercher:emptyTitleSearch')}</Text>
              <Text style={[s.placeholderSub, { color: colors.textSecondary }]}>
                {t('rechercher:emptySubSearch')}
              </Text>
              {user ? (
                <Pressable onPress={() => router.push('/(tabs)/declarer')} style={[s.cta, { backgroundColor: colors.primary }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.onPrimary} />
                  <Text style={[s.ctaText, { color: colors.onPrimary }]}>{t('rechercher:emptyCta')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={s.resultsGrid}>
              {results.map((doc) => {
                const docName = resolveName(doc.doc_type, (doc as any).docTypeInfo);
                const photoUrl = getFullImageUrl(doc.photo_recto);
                const displayName = doc.owner_name || t('rechercher:ownerFallback');
                const dateField = (doc as any).date_trouvee || doc.date_perte || doc.created_at;
                const location = doc.ville || '';
                const isLost = (doc as any).declaration_type === 'LOST' || doc.is_lost;

                return (
                  <Pressable
                    key={doc.id}
                    onPress={() => openPreview(doc)}
                    style={({ pressed }) => [s.resultCard, {
                      backgroundColor: colors.surface,
                      borderColor: pressed ? colors.primary : colors.border,
                      opacity: pressed ? 0.9 : 1,
                    }]}
                  >
                    {/* Photo */}
                    <View style={[s.photoSection, { backgroundColor: colors.skeleton }]}>
                      {photoUrl && showFull ? (
                        <Image source={{ uri: photoUrl }} style={s.photo} />
                      ) : (
                        <View style={s.photoPlaceholder}>
                          <Text style={[s.photoPlaceholderText, { color: colors.textSecondary }]}>{t('rechercher:photoProtected')}</Text>
                        </View>
                      )}
                      <View style={[s.docTypeBadge, { backgroundColor: `${colors.surface}E6` }]}>
                        <Ionicons name={getDocIcon(docName)} size={10} color={colors.primary} />
                        <Text style={[s.docTypeBadgeText, { color: colors.text }]} numberOfLines={1}>{docName}</Text>
                      </View>
                      {isLost && (
                        <View style={[s.statusBadge, { backgroundColor: colors.dangerBg }]}>
                          <Text style={[s.statusBadgeText, { color: colors.danger }]}>{t('rechercher:lost')}</Text>
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={s.infoSection}>
                      <Text style={[s.ownerName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                      {dateField ? (
                        <View style={s.infoRow}>
                          <Ionicons name="time-outline" size={11} color={colors.primary} />
                          <Text style={[s.infoText, { color: colors.textSecondary }]}>{timeAgo(dateField)}</Text>
                        </View>
                      ) : null}
                      {location ? (
                        <View style={s.infoRow}>
                          <Ionicons name="location-outline" size={11} color={colors.primary} />
                          <Text style={[s.infoText, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═══ PREVIEW MODAL ═══ */}
      <Modal visible={showPreview} transparent animationType="slide" onRequestClose={() => setShowPreview(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowPreview(false)}>
          <Pressable style={[s.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />

            {/* Single doc preview */}
            {previewDoc ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: colors.text }]}>{t('rechercher:previewTitle')}</Text>
                  <Pressable onPress={() => { setShowPreview(false); setPreviewDoc(null); }} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {(previewDoc as any).photo_recto && showFull ? (
                  <Image
                    source={{ uri: getFullImageUrl((previewDoc as any).photo_recto) }}
                    style={s.modalPhoto}
                  />
                ) : (
                  <View style={[s.modalPhotoPlaceholder, { backgroundColor: colors.skeleton }]}>
                    <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
                  </View>
                )}

                <View style={s.modalInfo}>
                  <Text style={[s.modalDocType, { color: colors.primary }]}>
                    {resolveName((previewDoc as any).doc_type, (previewDoc as any).docTypeInfo)}
                  </Text>
                  <Text style={[s.modalOwner, { color: colors.text }]}>
                    {previewDoc.owner_name || t('rechercher:ownerFallback')}
                  </Text>
                  {previewDoc.ville ? (
                    <View style={s.modalInfoRow}>
                      <Ionicons name="location-outline" size={14} color={colors.primary} />
                      <Text style={[s.modalInfoText, { color: colors.textSecondary }]}>{previewDoc.ville}</Text>
                    </View>
                  ) : null}
                  {((previewDoc as any).date_trouvee || previewDoc.date_perte) ? (
                    <View style={s.modalInfoRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                      <Text style={[s.modalInfoText, { color: colors.textSecondary }]}>
                        {formatDate((previewDoc as any).date_trouvee || previewDoc.date_perte)}
                      </Text>
                    </View>
                  ) : null}
                  {previewDoc.description ? (
                    <Text style={[s.modalDesc, { color: colors.textSecondary }]}>{previewDoc.description}</Text>
                  ) : null}

                  <View style={s.modalActions}>
                    {showFull ? (
                      <Pressable
                        onPress={() => { setShowPreview(false); setPreviewDoc(null); router.push({ pathname: '/(tabs)/recuperer', params: { id: previewDoc.id } }); }}
                        style={[s.modalCta, { backgroundColor: colors.primary }]}
                      >
                        <Ionicons name="hand-left-outline" size={16} color={colors.onPrimary} />
                        <Text style={[s.modalCtaText, { color: colors.onPrimary }]}>{t('rechercher:previewClaim')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => { setShowPreview(false); setPreviewDoc(null); router.push('/(tabs)/declarer'); }}
                        style={[s.modalCta, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border }]}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={colors.text} />
                        <Text style={[s.modalCtaText, { color: colors.text }]}>{t('rechercher:previewDeclare')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </ScrollView>
            ) : previewItems.length > 0 ? (
              /* Type preview (list of items) */
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: colors.text }]}>{previewTypeName}</Text>
                  <Pressable onPress={() => { setShowPreview(false); setPreviewItems([]); }} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
                  {t('rechercher:itemsCount', { count: previewItems.length })}
                </Text>

                {previewItems.map((item: any, idx: number) => (
                  <View key={item.id || idx} style={[s.previewItem, { borderBottomColor: colors.border }]}>
                    <View style={[s.previewItemIcon, {
                      backgroundColor: item.type === 'LOST' ? colors.dangerBg : colors.successBg,
                    }]}>
                      <Ionicons
                        name={item.type === 'LOST' ? 'search-outline' : 'heart-outline'}
                        size={14}
                        color={item.type === 'LOST' ? colors.danger : colors.success}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.previewItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.type === 'LOST' ? t('rechercher:previewLoss') : t('rechercher:previewFound')}
                      </Text>
                      <Text style={[s.previewItemMeta, { color: colors.textSecondary }]}>
                        {item.ville || t('rechercher:previewUnknownLocation')} · {timeAgo(item.date)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 4, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 48 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 13, paddingHorizontal: 16, marginTop: 2 },

  /* Stats */
  statsSection: { paddingHorizontal: PAD, paddingTop: 14 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  periodToggle: { flexDirection: 'row', gap: 4 },
  periodBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  periodBtnText: { fontSize: 11, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'center', gap: 3 },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },

  perfSection: { marginTop: 4 },
  perfHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  perfTitle: { fontSize: 12, fontWeight: '700' },
  perfSubtitle: { fontSize: 10, fontStyle: 'italic', color: '#9CA3AF' },
  perfSkeletonRow: { flexDirection: 'row', gap: 8 },
  perfSkeletonCard: { flex: 1, height: 100, borderRadius: 10 },
  emptyHint: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  perfCard: {
    width: (SCREEN_WIDTH - PAD * 2 - 8) / 2 - 4,
    borderRadius: 12, borderWidth: 1, padding: 10, gap: 3,
  },
  perfTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  trendText: { fontSize: 9, fontWeight: '700' },
  perfName: { fontSize: 11, fontWeight: '700' },
  perfCount: { fontSize: 15, fontWeight: '800' },
  perfBarBg: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 3 },
  perfBarFill: { height: '100%', borderRadius: 2 },
  perfPreviewHint: { fontSize: 9, marginTop: 3, fontStyle: 'italic' },

  /* Search */
  searchCard: {
    marginHorizontal: PAD, marginTop: 14, borderRadius: 16,
    borderWidth: 1, padding: 10, gap: 8,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  searchBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' },
  chipsLabel: { fontSize: 9, fontWeight: '800', marginRight: 2 },
  chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 10 },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: PAD, marginTop: 10, borderRadius: 10,
    borderWidth: 1, padding: 10,
  },
  noticeIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  noticeText: { fontSize: 11, flex: 1, lineHeight: 15 },

  section: { paddingHorizontal: PAD, paddingTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHint: { fontSize: 10, fontStyle: 'italic' },

  resultsSkeletonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  skeletonCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  skeletonPhoto: { height: 100 },
  skeletonBody: { padding: 10, gap: 6 },
  skeletonLine: { height: 8, borderRadius: 4 },

  placeholder: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  placeholderIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  placeholderTitle: { fontSize: 14, fontWeight: '800' },
  placeholderSub: { fontSize: 11, textAlign: 'center', paddingHorizontal: 20, lineHeight: 16 },

  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  resultCard: { width: (SCREEN_WIDTH - PAD * 2 - CARD_GAP) / 2, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  photoSection: { height: 110, position: 'relative', overflow: 'hidden' },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  photoPlaceholderText: { fontSize: 8, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  docTypeBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
    maxWidth: '60%',
  },
  docTypeBadgeText: { fontSize: 9, fontWeight: '700', flexShrink: 1 },
  statusBadge: {
    position: 'absolute', top: 6, right: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  infoSection: { padding: 8, gap: 4 },
  ownerName: { fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoText: { fontSize: 10, flexShrink: 1 },

  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, marginTop: 10,
  },
  ctaText: { fontSize: 11, fontWeight: '800' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 20,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 32 },
  modalTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  modalSubtitle: { fontSize: 12, marginBottom: 12 },
  modalPhoto: { width: '100%', height: 180, borderRadius: 14, marginBottom: 14 },
  modalPhotoPlaceholder: { width: '100%', height: 180, borderRadius: 14, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  modalInfo: { gap: 6 },
  modalDocType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalOwner: { fontSize: 16, fontWeight: '800' },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  modalInfoText: { fontSize: 12 },
  modalDesc: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  modalActions: { marginTop: 16, gap: 8 },
  modalCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, minHeight: 48, borderRadius: 12,
  },
  modalCtaText: { fontSize: 13, fontWeight: '700' },

  previewItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  previewItemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewItemTitle: { fontSize: 12, fontWeight: '700' },
  previewItemMeta: { fontSize: 10, marginTop: 1 },
});
