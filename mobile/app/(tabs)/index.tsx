import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View, RefreshControl, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { Document, Declaration } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBottomTabClearance } from '@/hooks/useBottomTabClearance';
import { BannerCarousel } from '@/components/BannerCarousel';
import { DeclarationCard } from '@/components/declarations/DeclarationCard';
import { useDashboardData } from '@/core/hooks/useDashboardData';
import { HomeSkeleton } from '@/components/HomeSkeleton';

function timeAgo(dateString?: string, t?: (key: string, options?: any) => string) {
  if (!dateString) return '—';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (!t) return '—';
  if (diff < 60) return t('home:timeAgo:justNow');
  if (diff < 3600) return t('home:timeAgo:minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('home:timeAgo:hoursAgo', { n: Math.floor(diff / 3600) });
  if (diff < 604800) return t('home:timeAgo:daysAgo', { n: Math.floor(diff / 86400) });
  return new Date(dateString).toLocaleDateString('fr-FR');
}

function getInitials(name?: string) {
  if (!name) return 'DM';
  return name.split(' ').map((s) => s[0]).join('').toUpperCase().slice(0, 2);
}

function getDocIcon(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toLowerCase();
  if (t.includes('cni') || t.includes('carte')) return 'card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome') || t.includes('école')) return 'school-outline';
  return 'document-text-outline';
}

type QuickActionsProps = {
  onDeclareLost: () => void;
  onDeclareFound: () => void;
  colors: ReturnType<typeof useThemeColors>;
};

const QuickActions = React.memo(function QuickActions({ onDeclareLost, onDeclareFound, colors }: QuickActionsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.quickActionsRow}>
      <Pressable onPress={onDeclareLost} style={({ pressed }) => [
        styles.quickActionCard,
        {
          backgroundColor: colors.dangerBg,
          borderColor: colors.danger + '30',
        },
        pressed && { opacity: 0.85 },
      ]}>
        <View style={[styles.quickActionIconLost, { backgroundColor: colors.danger + '20' }]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
        </View>
        <Text style={[styles.quickActionTitleLost, { color: colors.danger }]}>{t('home:declareLost')}</Text>
        <Text style={[styles.quickActionSubLost, { color: colors.danger }]}>{t('home:declareLostSub')}</Text>
      </Pressable>
      <Pressable onPress={onDeclareFound} style={({ pressed }) => [
        styles.quickActionCard,
        {
          backgroundColor: colors.successBg,
          borderColor: colors.success + '30',
        },
        pressed && { opacity: 0.85 },
      ]}>
        <View style={[styles.quickActionIconFound, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="hand-left-outline" size={20} color={colors.success} />
        </View>
        <Text style={[styles.quickActionTitleFound, { color: colors.success }]}>{t('home:declareFound')}</Text>
        <Text style={[styles.quickActionSubFound, { color: colors.success }]}>{t('home:declareFoundSub')}</Text>
      </Pressable>
    </View>
  );
});

type StatsRowProps = {
  docCount: number;
  activeDeclCount: number;
  colors: ReturnType<typeof useThemeColors>;
};

const StatsRow = React.memo(function StatsRow({ docCount, activeDeclCount, colors }: StatsRowProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statHeader}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{docCount}</Text>
          <View style={[styles.statIconDoc, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="document-text-outline" size={16} color={colors.warning} />
          </View>
        </View>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home:registeredDocs')}</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statHeader}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{activeDeclCount}</Text>
          <View style={[styles.statIconDecl, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="megaphone-outline" size={16} color={colors.warning} />
          </View>
        </View>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home:activeDeclarations')}</Text>
      </View>
    </View>
  );
});

type GainsCardProps = {
  balance: number;
  colors: ReturnType<typeof useThemeColors>;
};

const GainsCard = React.memo(function GainsCard({ balance, colors }: GainsCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/gains')}
      style={({ pressed }) => [
        styles.gainsCard,
        {
          backgroundColor: colors.warningBg,
          borderColor: colors.warning + '30',
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.gainsLeft}>
        <View style={[styles.gainsIconBox, { backgroundColor: colors.warning + '25' }]}>
          <Ionicons name="wallet" size={22} color={colors.warning} />
        </View>
        <View>
          <Text style={[styles.gainsTitle, { color: colors.text }]}>{t('gains:title')}</Text>
          <Text style={[styles.gainsAmount, { color: colors.warning }]}>{t('gains:availableBalance', { amount: balance.toLocaleString() })} {t('gains:xaf')}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.warning} />
    </Pressable>
  );
});

type DocCardProps = {
  doc: Document;
  colors: ReturnType<typeof useThemeColors>;
};

const DocCard = React.memo(function DocCard({ doc, colors }: DocCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable style={({ pressed }) => [
      styles.docCard,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
      pressed && { opacity: 0.85 },
    ]}>
      <View style={[styles.docCardTop, { backgroundColor: colors.inputBg }]}>
        <Ionicons name={getDocIcon(doc.type_doc)} size={32} color={colors.textSecondary} />
        {doc.is_lost && (
          <View style={[styles.docBadgeLost, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.docBadgeLostText, { color: colors.danger }]}>{t('declarations:lostStatus')}</Text>
          </View>
        )}
        {doc.is_verified && (
          <View style={[styles.docBadgeVerified, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.docBadgeVerifiedText, { color: colors.success }]}>{t('documents:certify')}</Text>
          </View>
        )}
      </View>
      <View style={styles.docCardBottom}>
        <Text style={[styles.docCardName, { color: colors.text }]} numberOfLines={1}>
          {doc.nom_sur_doc || doc.type_doc || t('declarations:document')}
        </Text>
        <Text style={[styles.docCardType, { color: colors.textSecondary }]} numberOfLines={1}>{doc.type_doc}</Text>
      </View>
    </Pressable>
  );
});

type ActivityItemProps = {
  declaration: Declaration;
  index: number;
  total: number;
  colors: ReturnType<typeof useThemeColors>;
};

const ActivityItem = React.memo(function ActivityItem({ declaration: dec, index: _index, total: _total, colors }: ActivityItemProps) {
  const { t } = useTranslation();
  const isLost = dec.type === 'lost' || dec.is_lost;
  return (
    <Pressable style={({ pressed }) => [
      styles.activityItem,
      { backgroundColor: pressed ? colors.surface2 : 'transparent' },
    ]}>
      <View style={[
        styles.activityIcon,
        { backgroundColor: isLost ? colors.dangerBg : colors.successBg },
      ]}>
        <Ionicons name={getDocIcon(dec.doc_type)} size={17} color={isLost ? colors.danger : colors.success} />
      </View>
      <View style={styles.activityText}>
        <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
          {dec.docTypeInfo?.nom || dec.doc_type || t('declarations:document')} {isLost ? t('declarations:lost') : t('declarations:found')}
        </Text>
        <Text style={[styles.activityLocation, { color: colors.textSecondary }]}>
          {dec.lieu_perte || t('common:notSpecified')}
        </Text>
      </View>
      <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{timeAgo(dec.created_at, t)}</Text>
    </Pressable>
  );
});

type PlanCardProps = {
  planName: string;
  docLimit: number;
  objectLimit: number;
  docCount: number;
  objectCount: number;
  colors: ReturnType<typeof useThemeColors>;
};

const PlanCard = React.memo(function PlanCard({ planName, docLimit, objectLimit, docCount, objectCount, colors }: PlanCardProps) {
  const { t } = useTranslation();
  const usagePercent = Math.min(((docCount + objectCount) / (docLimit + objectLimit)) * 100, 100);
  return (
    <View style={[styles.planCard, { backgroundColor: colors.greenDark }]}>
      <View style={[styles.planBlob, { backgroundColor: colors.primary + '20' }]} />
      <View style={styles.planHeader}>
        <View style={[styles.planBadge, { backgroundColor: colors.primary + '30' }]}>
          <Ionicons name="star" size={10} color={colors.primary} />
          <Text style={[styles.planBadgeText, { color: colors.primary }]}>{t('subscription:currentPlan')}</Text>
        </View>
        <Text style={[styles.planName, { color: colors.onPrimary }]}>{planName}</Text>
        <Text style={[styles.planLimit, { color: '#FFFFFF' + '80' }]}>{t('home:planLimit', { count: docLimit + objectLimit })}</Text>
      </View>
      <View style={styles.planUsage}>
        <View style={styles.planUsageHeader}>
          <Text style={[styles.planUsageLabel, { color: '#FFFFFF' + '80' }]}>{t('home:usage')}</Text>
          <Text style={[styles.planUsageValue, { color: colors.primary }]}>{docCount + objectCount} / {docLimit + objectLimit}</Text>
        </View>
        <View style={[styles.planBar, { backgroundColor: '#FFFFFF' + '20' }]}>
          <View style={[styles.planBarFill, { backgroundColor: colors.primary, width: `${usagePercent}%` }]} />
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/subscription')}
        style={({ pressed }) => [
          styles.planUpgradeBtn,
          { backgroundColor: colors.primary },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="rocket-outline" size={14} color={colors.greenDark} />
        <Text style={[styles.planUpgradeText, { color: colors.greenDark }]}>{t('subscription:choosePlan')}</Text>
      </Pressable>
    </View>
  );
});

type ReferralCardProps = {
  code?: string;
  colors: ReturnType<typeof useThemeColors>;
};

const ReferralCard = React.memo(function ReferralCard({ code, colors }: ReferralCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const refCode = code || 'DOC-MASTER';

  const handleCopy = () => {
    try {
      const Clipboard = require('expo-clipboard');
      Clipboard.setStringAsync(refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Pressable
      onPress={handleCopy}
      style={({ pressed }) => [
        styles.referralCard,
        {
          backgroundColor: colors.purpleBg,
          borderColor: colors.purple + '30',
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.referralLeft}>
        <View style={[styles.referralIconBox, { backgroundColor: colors.purple + '25' }]}>
          <Ionicons name="gift-outline" size={20} color={colors.purple} />
        </View>
        <View>
          <Text style={[styles.referralTitle, { color: colors.text }]}>{t('parrainage:inviteCode')}</Text>
          <Text style={[styles.referralCode, { color: colors.purple }]}>{refCode}</Text>
        </View>
      </View>
      <View style={[styles.referralCopyBtn, { backgroundColor: copied ? '#16A34A' : colors.purple + '20' }]}>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={16}
          color={copied ? '#fff' : colors.purple}
        />
      </View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const clearance = useBottomTabClearance();
  const colors = useThemeColors();
  const user = useAuthStore(state => state.user);
  const { data, isLoading, refetch, isRefetching } = useDashboardData();

  const docs = data?.docs || [];
  const declarations = data?.declarations || [];
  const notifications = data?.notifications || [];

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const unreadCount = useMemo(() =>
    notifications.filter((n) => !n.is_read && !n.lue).length,
  [notifications]);

  const activeDecls = useMemo(() =>
    declarations.filter((d) => !['recovered', 'resolved', 'cancelled'].includes(d.status)),
  [declarations]);

  const planName = user?.subscription?.plan_name || t('subscription:free');
  const docLimit = user?.subscription?.doc_limit || 5; 
  const objectLimit = 10; 
  const walletBalance = user?.wallet_balance || 0;
  const userName = user?.prenom || t('common:unknown');
  const initials = getInitials(user?.prenom && user?.nom ? `${user.prenom} ${user.nom}` : undefined);
  const displayDeclarations = declarations.slice(0, 5);

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: clearance,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={({ pressed }) => [
                  styles.avatar,
                  { backgroundColor: colors.greenDark },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{initials}</Text>
              </Pressable>
              <Text style={[styles.headerName, { color: colors.text }]}>{userName}</Text>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => router.push('/(tabs)/rechercher')}
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  pressed && { opacity: 0.5 },
                ]}
                hitSlop={8}
              >
                <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  pressed && { opacity: 0.5 },
                ]}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
                {unreadCount > 0 && (
                  <View style={[styles.notifDot, { backgroundColor: colors.danger }]} />
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  pressed && { opacity: 0.5 },
                ]}
                hitSlop={8}
              >
                <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <BannerCarousel />

          <QuickActions
            onDeclareLost={() => router.push('/(tabs)/declarer')}
            onDeclareFound={() => router.push('/(tabs)/trouver')}
            colors={colors}
          />

          <StatsRow docCount={docs.length} activeDeclCount={activeDecls.length} colors={colors} />

          <GainsCard balance={walletBalance} colors={colors} />

          <ReferralCard code={user?.code_invitation} colors={colors} />

          {activeDecls.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="radio-outline" size={16} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('declarations:active')}</Text>
              </View>
              {activeDecls.slice(0, 3).map((dec) => (
                <DeclarationCard
                  key={dec.id}
                  type={dec.declaration_type === 'LOST' || dec.is_lost ? 'LOST' : 'FOUND'}
                  docType={dec.docTypeInfo?.nom || dec.doc_type || t('declarations:document')}
                  status={dec.status as any}
                  reference={dec.identifiant_doc_dm || dec.reference || '---'}
                  ownerName={dec.owner_name}
                  declarationId={dec.id}
                  hasPotentialMatches={dec.matches && dec.matches.length > 0}
                  onPress={() => {
                    router.push(`/declaration/${dec.id}`);
                  }}
                  onRecuperer={() => router.push({ pathname: '/(tabs)/recuperer', params: { id: dec.id } })}
                  onRendre={() => router.push({ pathname: '/(tabs)/rendre', params: { id: dec.id } })}
                />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <Ionicons name="folder-outline" size={16} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home:recentDocs')}</Text>
              </View>
              {docs.length > 0 && (
                <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.push('/(tabs)/documents')}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('home:seeAll')}</Text>
                </Pressable>
              )}
            </View>

            {docs.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.warningBg }]}>
                  <Ionicons name="document-outline" size={26} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('home:noDocs')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('home:addDoc')}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docsScroll} contentContainerStyle={styles.docsScrollInner}>
                {docs.map((doc) => (
                  <DocCard key={doc.id} doc={doc as Document} colors={colors} />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <Ionicons name="time-outline" size={16} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home:recentDeclarations')}</Text>
              </View>
              {displayDeclarations.length > 0 && (
                <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.push('/(tabs)/declarations')}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('home:seeAll')}</Text>
                </Pressable>
              )}
            </View>

            {displayDeclarations.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.warningBg }]}>
                  <Ionicons name="search-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('home:noDeclarations')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('home:declare')}
                </Text>
              </View>
            ) : (
              <View style={[styles.activityList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {displayDeclarations.map((dec, idx) => (
                  <ActivityItem
                    key={dec.id}
                    declaration={dec as Declaration}
                    index={idx}
                    total={displayDeclarations.length}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </View>

          <PlanCard
            planName={planName}
            docLimit={docLimit}
            objectLimit={objectLimit}
            docCount={docs.length}
            objectCount={0}
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  quickActionIconLost: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconFound: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitleLost: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickActionTitleFound: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickActionSubLost: {
    fontSize: 11,
  },
  quickActionSubFound: {
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
  },
  statIconDoc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconDecl: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
  },
  gainsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gainsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gainsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gainsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  gainsAmount: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  docsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  docsScrollInner: {
    flexDirection: 'row',
    gap: 12,
  },
  docCard: {
    width: 148,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  docCardTop: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeLost: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  docBadgeLostText: {
    fontSize: 9,
    fontWeight: '700',
  },
  docBadgeVerified: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  docBadgeVerifiedText: {
    fontSize: 9,
    fontWeight: '700',
  },
  docCardBottom: {
    padding: 10,
    gap: 2,
  },
  docCardName: {
    fontSize: 12,
    fontWeight: '700',
  },
  docCardType: {
    fontSize: 10,
  },
  activityList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityLocation: {
    fontSize: 11,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
  },
  referralCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  referralCode: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  referralCopyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  planBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    right: -30,
  },
  planHeader: {
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  planLimit: {
    fontSize: 12,
  },
  planUsage: {
    marginBottom: 14,
  },
  planUsageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planUsageLabel: {
    fontSize: 11,
  },
  planUsageValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  planBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  planBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  planUpgradeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  planUpgradeText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
