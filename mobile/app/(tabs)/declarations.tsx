import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import { DeclarationCard } from '@/components/declarations/DeclarationCard';
import type { Declaration } from '@/types';
import { BottomTabInset } from '@/constants/theme';
import { DeclarationsSkeleton } from '@/components/Skeletons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/useThemeColors';

// ── Filters ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',    icon: 'layers-outline'    },
  { key: 'lost',   icon: 'alert-circle-outline' },
  { key: 'found',  icon: 'checkmark-circle-outline' },
  { key: 'active', icon: 'time-outline'      },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

// ────────────────────────────────────────────────────────────────────────────
export default function DeclarationsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + BottomTabInset + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 16, gap: 10 }}>
          {/* Row 1 : back + title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.backgroundElement,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
              {t('declarations:title')}
            </Text>
          </View>

          {/* Row 2 : count badge */}
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500', letterSpacing: 0.2, paddingLeft: 2 }}>
            {filtered.length} {t(filtered.length !== 1 ? 'declarations:results' : 'declarations:result')}
          </Text>

          {/* Row 3 : CTA buttons — full-width, well-separated */}
          <View style={{ gap: 8, marginTop: 4 }}>
            {/* Primary action: Déclarer une perte */}
            <Pressable
              onPress={() => router.push('/declarer')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 16,
                borderWidth: 1.5,
                backgroundColor: colors.warningBg,
                borderColor: colors.tint,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.warningBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: -0.1 }}>
                  {t('declarations:declareLost')}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                  {t('declarations:declareLostSub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>

            {/* Secondary action: Signaler un trouvé — greenDark breaks the orange monotony */}
            <Pressable
              onPress={() => router.push('/trouver')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 16,
                borderWidth: 1.5,
                backgroundColor: colors.successBg,
                borderColor: colors.success,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.successBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="search-outline" size={16} color={colors.greenDark} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.greenDark, letterSpacing: -0.1 }}>
                  {t('declarations:declareFound')}
                </Text>
                <Text style={{ fontSize: 11, color: colors.success, fontWeight: '500' }}>
                  {t('declarations:declareFoundSub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.greenDark} />
            </Pressable>
          </View>
        </View>

        {/* ── FILTER CHIPS ───────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            gap: 8,
            paddingVertical: 2,
            paddingRight: 4,
          }}
          style={{ marginBottom: 12 }}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: active ? colors.primary : colors.backgroundElement,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons
                  name={f.icon as any}
                  size={13}
                  color={active ? colors.onPrimary : colors.textSecondary}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: active ? colors.onPrimary : colors.textSecondary,
                }}>
                  {t('declarations:' + f.key)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── LIST ───────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState activeFilter={activeFilter} t={t} />
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((dec) => (
              <DeclarationCard
                key={dec.id}
                type={dec.declaration_type === 'LOST' || dec.is_lost ? 'LOST' : 'FOUND'}
                docType={dec.docTypeInfo?.nom || dec.doc_type || t('declarations:document')}
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
function EmptyState({ activeFilter, t }: { activeFilter: FilterKey; t: (key: string) => string }) {
  const colors = useThemeColors();
  return (
    <View style={{
      backgroundColor: colors.backgroundElement,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      padding: 36,
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
    }}>
      <View style={{
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.warningBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
      }}>
        <Ionicons name="megaphone-outline" size={28} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }}>
        {t('declarations:noDeclarations')}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }}>
        {activeFilter === 'all'
          ? t('declarations:noDeclarationsDesc')
          : t('declarations:noFilterResults')}
      </Text>
      <Pressable
        onPress={() => router.push('/declarer')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="add" size={16} color={colors.onPrimary} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.onPrimary }}>
          {t('declarations:newDeclaration')}
        </Text>
      </Pressable>
    </View>
  );
}