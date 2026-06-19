import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import { DeclarationCard } from '@/components/declarations/DeclarationCard';
import type { Declaration } from '@/types';
import { BottomTabInset } from '@/constants/theme';
import { DeclarationsSkeleton } from '@/components/Skeletons';

// ── Design tokens (from DOC_TYPE_META) ──────────────────────────────────────
const PRIMARY    = '#F5A64B';          // orange principal
const GREEN_DARK = '#1E3A2F';          // vert profond DocMaster
const GREEN      = '#16A34A';
const CREAM      = '#FAF7F2';
const BORDER     = '#EAE3D8';
const TEXT_MAIN  = '#1A1A1A';
const TEXT_MUTED = '#6B7280';
const TEXT_SUBTLE = '#9CA3AF';

// ── Filters ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',    label: 'Toutes',   icon: 'layers-outline'    },
  { key: 'lost',   label: 'Perdues',  icon: 'alert-circle-outline' },
  { key: 'found',  label: 'Trouvées', icon: 'checkmark-circle-outline' },
  { key: 'active', label: 'Actives',  icon: 'time-outline'      },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

// ────────────────────────────────────────────────────────────────────────────
export default function DeclarationsScreen() {
  const insets = useSafeAreaInsets();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await declarationsService.getMyDeclarations();
      if (res.success && res.data) setDeclarations(res.data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeclarations(); }, [fetchDeclarations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeclarations();
    setRefreshing(false);
  }, [fetchDeclarations]);

  const filtered = declarations.filter((d) => {
    if (activeFilter === 'all')    return true;
    if (activeFilter === 'lost')   return d.declaration_type === 'LOST'  || d.is_lost;
    if (activeFilter === 'found')  return d.declaration_type === 'FOUND' || d.is_found;
    if (activeFilter === 'active') return !['recovered','resolved','cancelled'].includes(d.status);
    return true;
  });

  if (loading) {
    return <DeclarationsSkeleton />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 8, paddingBottom: insets.bottom + BottomTabInset + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          {/* Row 1 : back + title */}
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
            >
              <Ionicons name="arrow-back" size={20} color={TEXT_MAIN} />
            </Pressable>
            <Text style={styles.headerTitle}>Mes déclarations</Text>
          </View>

          {/* Row 2 : count badge */}
          <Text style={styles.headerCount}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </Text>

          {/* Row 3 : CTA buttons — full-width, well-separated */}
          <View style={styles.ctaRow}>
            {/* Primary action: Déclarer une perte */}
            <Pressable
              onPress={() => router.push('/declarer')}
              style={({ pressed }) => [styles.ctaBtn, styles.ctaBtnLost, pressed && styles.ctaPressed]}
            >
              <View style={styles.ctaBtnIcon}>
                <Ionicons name="alert-circle-outline" size={16} color={PRIMARY} />
              </View>
              <View style={styles.ctaBtnText}>
                <Text style={styles.ctaBtnLabel}>Déclarer une perte</Text>
                <Text style={styles.ctaBtnSub}>Signaler un document perdu</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
            </Pressable>

            {/* Secondary action: Signaler un trouvé — GREEN_DARK breaks the orange monotony */}
            <Pressable
              onPress={() => router.push('/trouver')}
              style={({ pressed }) => [styles.ctaBtn, styles.ctaBtnFound, pressed && styles.ctaPressed]}
            >
              <View style={[styles.ctaBtnIcon, styles.ctaBtnIconFound]}>
                <Ionicons name="search-outline" size={16} color={GREEN_DARK} />
              </View>
              <View style={styles.ctaBtnText}>
                <Text style={[styles.ctaBtnLabel, styles.ctaBtnLabelFound]}>Document trouvé</Text>
                <Text style={[styles.ctaBtnSub, styles.ctaBtnSubFound]}>Signaler un document récupéré</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={GREEN_DARK} />
            </Pressable>
          </View>
        </View>

        {/* ── FILTER CHIPS ───────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons
                  name={f.icon as any}
                  size={13}
                  color={active ? '#fff' : TEXT_MUTED}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── LIST ───────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState activeFilter={activeFilter} />
        ) : (
          <View style={styles.list}>
            {filtered.map((dec) => (
              <DeclarationCard
                key={dec.id}
                type={dec.declaration_type === 'LOST' || dec.is_lost ? 'LOST' : 'FOUND'}
                docType={dec.docTypeInfo?.nom || dec.doc_type || 'Document'}
                status={dec.status as any}
                reference={dec.identifiant_doc_dm || dec.reference || '---'}
                ownerName={dec.nom_complet || dec.owner_name}
                declarationId={dec.id}
                onPress={() => router.push(`/declaration/${dec.id}`)}
                onRecuperer={() => router.push(`/recuperer?id=${dec.id}`)}
                onRendre={() => router.push(`/rendre?id=${dec.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ activeFilter }: { activeFilter: FilterKey }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name="megaphone-outline" size={28} color={PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>Aucune déclaration</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'all'
          ? "Vous n'avez encore fait aucune déclaration."
          : 'Aucune déclaration ne correspond à ce filtre.'}
      </Text>
      <Pressable
        onPress={() => router.push('/declarer')}
        style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Nouvelle déclaration</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: {
    marginBottom: 16,
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_MAIN,
    letterSpacing: -0.4,
  },
  headerCount: {
    fontSize: 12,
    color: TEXT_SUBTLE,
    fontWeight: '500',
    letterSpacing: 0.2,
    paddingLeft: 2,
  },

  // CTA buttons
  ctaRow: {
    gap: 8,
    marginTop: 4,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  ctaBtnLost: {
    backgroundColor: '#FFF8EE',
    borderColor: '#FDDCAC',
  },
  ctaBtnFound: {
    backgroundColor: '#F0F5F2',
    borderColor: '#B8D4C4',
  },
  ctaPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  ctaBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnIconFound: {
    backgroundColor: '#D4EAE0',
  },
  ctaBtnText: {
    flex: 1,
    gap: 2,
  },
  ctaBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.1,
  },
  ctaBtnLabelFound: {
    color: GREEN_DARK,
  },
  ctaBtnSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  ctaBtnSubFound: {
    color: '#5A8A70',
  },

  // Filters
  filtersScroll: { marginBottom: 12 },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // List
  list: { gap: 12 },

  // Empty
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    padding: 36,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_SUBTLE,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});