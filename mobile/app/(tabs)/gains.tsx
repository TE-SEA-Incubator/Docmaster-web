import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useEarnings } from '@/core/hooks/useEarnings';
import { declarationsService } from '@/core/api/declarationsService';
import { BottomTabInset } from '@/constants/theme';
import { GainsSkeleton } from '@/components/Skeletons';
import { Declaration } from '@/types';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';
const GREEN_MID = '#2D5A42';

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR');
}

function fmtDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function getTxMeta(type: string, t: (key: string) => string) {
  if (type === 'finder_payout') return { icon: 'checkmark-circle-outline' as const, bg: '#F0FDF4', color: '#16A34A', label: t('gains:txCommission'), sub: t('gains:txCommissionSub') };
  if (type === 'recovery_fee') return { icon: 'arrow-up-outline' as const, bg: '#FFF7ED', color: '#EA580C', label: t('gains:txRecovery'), sub: t('gains:txRecoverySub') };
  if (type === 'withdrawal') return { icon: 'log-out-outline' as const, bg: '#EFF6FF', color: '#3B82F6', label: t('gains:txWithdrawal'), sub: t('gains:txWithdrawalSub') };
  return { icon: 'receipt-outline' as const, bg: '#F3F4F6', color: '#6B7280', label: type, sub: '—' };
}

function getEarningMeta(type: string, t: (key: string) => string) {
  if (type === 'declaration_points') return { icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap, bg: '#FFF3E0', color: PRIMARY, label: t('gains:earnDeclaration') };
  if (type === 'return_points') return { icon: 'hand-left-outline' as keyof typeof Ionicons.glyphMap, bg: '#F0FDF4', color: '#16A34A', label: t('gains:earnReturn') };
  if (type === 'referral_points') return { icon: 'person-add-outline' as keyof typeof Ionicons.glyphMap, bg: '#FFFBEB', color: '#D97706', label: t('gains:earnReferral') };
  if (type === 'referral_bonus') return { icon: 'gift-outline' as keyof typeof Ionicons.glyphMap, bg: '#F5F3FF', color: '#8B5CF6', label: t('gains:earnBonus') };
  if (type === 'finder_payout') return { icon: 'cash-outline' as keyof typeof Ionicons.glyphMap, bg: '#F0FDF4', color: '#16A34A', label: t('gains:earnReward') };
  return { icon: 'coins-outline' as keyof typeof Ionicons.glyphMap, bg: '#F3F4F6', color: '#6B7280', label: type };
}

function PotentialEarningsCard({ declarations, totalXaf, totalPts, fmtAmount, t }: any) {
  if (!declarations || declarations.length === 0) return null;

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#F0EAE0', overflow: 'hidden', marginTop: 20, marginHorizontal: 20 }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="cash-outline" size={16} color="#EA580C" />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{t('gains:potentialGains')}</Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{t('gains:potentialGainsSub')}</Text>
          </View>
        </View>
      </View>
      <View style={{ padding: 16, backgroundColor: '#FFF7ED' }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cash-outline" size={18} color="#EA580C" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>{fmtAmount(totalXaf)} <Text style={{ fontSize: 11, color: '#6B7280' }}>{t('common:fcf')}</Text></Text>
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF0DC', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="star-outline" size={18} color={PRIMARY} />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>{fmtAmount(totalPts)} <Text style={{ fontSize: 11, color: '#6B7280' }}>{t('gains:pts')}</Text></Text>
            </View>
          </View>
        </View>
      </View>
      {declarations.map((decl: any) => {
        const prix = decl.docTypeInfo?.prix_retrouvaille ?? 0;
        const pct = decl.docTypeInfo?.finder_percent ?? 80;
        const xafGain = Math.round((prix * pct) / 100);
        const ptsGain = decl.docTypeInfo?.points_recompense ?? 0;
        return (
          <View key={decl.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text-outline" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>{decl.docTypeInfo?.nom || 'Document'}</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{decl.identifiant_doc_dm}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#EA580C' }}>+{fmtAmount(xafGain)} {t('common:fcf')}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>+{ptsGain} {t('gains:pts')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GainsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { transactions, earnings, stats, minWithdrawal, loading, refresh } = useEarnings();
  const [refreshing, setRefreshing] = useState(false);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);

  useEffect(() => {
    declarationsService.getMyDeclarations().then(res => {
        if(res.success && res.data) setDeclarations(res.data);
    });
  }, []);

  const potentialDeclarations = declarations.filter(
    (d) => d.declaration_type === "FOUND" && ["AVAILABLE", "MATCHED"].includes(d.status || '')
  );
  const totalPotentialXaf = potentialDeclarations.reduce((acc, d) => {
    const prix = (d as any).docTypeInfo?.prix_retrouvaille ?? 0;
    const pct = (d as any).docTypeInfo?.finder_percent ?? 80;
    return acc + (prix * pct) / 100;
  }, 0);
  const totalPotentialPts = potentialDeclarations.reduce((acc, d) => {
    return acc + ((d as any).docTypeInfo?.points_recompense ?? 0);
  }, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), declarationsService.getMyDeclarations().then(res => { if(res.success && res.data) setDeclarations(res.data) })]);
    setRefreshing(false);
  }, [refresh]);

  const balance = user?.wallet_balance || 0;
  const points = user?.points || 0;
  const progressPct = Math.min((balance / minWithdrawal) * 100, 100);

  const totalFinderPayouts = transactions
    .filter((t) => t.type === 'finder_payout' && t.status === 'SUCCESS')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.type === 'withdrawal' && t.status === 'SUCCESS')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  const totalPoints = stats?.total_points || points;
  const pointsBreakdown = stats?.points_breakdown || {
    declarations: { points: 0, count: 0, pts_per_unit: 5 },
    returns: { points: 0, count: 0 },
    referrals: { points: 0, count: 0 },
  };
  const statsCards = stats?.stats || { total_found: 0, total_returned: 0 };

  const nextLevelPoints = 500;
  const pointsToNext = Math.max(nextLevelPoints - totalPoints, 0);
  const levelLabel = totalPoints >= 500 ? t('gains:levelGold') : t('gains:levelSilver');

  const handleWithdraw = () => {
    if (balance < minWithdrawal) {
      Alert.alert(t('gains:insufficientBalance'), t('gains:minWithdrawMsg', { amount: fmtAmount(minWithdrawal), balance: fmtAmount(balance) }));
    } else {
      router.push('/(tabs)/subscription');
    }
  };

  if (loading) {
    return <GainsSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: GREEN_DARK }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 12 })}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{t('gains:title')}</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wallet Card ── */}
        <View style={{
          backgroundColor: GREEN_DARK, padding: 24, paddingTop: 20,
          borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden',
        }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(245,166,75,0.08)', bottom: -20, left: 20 }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)', top: -30, right: -30 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{t('gains:availableBalance')}</Text>
              <Text style={{ fontSize: 34, fontWeight: '800', color: '#FFFFFF' }}>
                {fmtAmount(balance)} <Text style={{ fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>{t('common:fcf')}</Text>
              </Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(245,166,75,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="wallet-outline" size={22} color={PRIMARY} />
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t('gains:withdrawProgress')}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                {fmtAmount(balance)} / {fmtAmount(minWithdrawal)} {t('common:fcf')}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 3, width: `${progressPct}%`, backgroundColor: PRIMARY }} />
            </View>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {t('gains:minWithdraw', { amount: fmtAmount(minWithdrawal) })} {t('common:fcf')}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={handleWithdraw}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 13, borderRadius: 13,
                backgroundColor: PRIMARY, opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="card-outline" size={16} color={GREEN_DARK} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: GREEN_DARK }}>{t('gains:withdraw')}</Text>
            </Pressable>
            
            <Pressable
              onPress={() => Alert.alert(t('common:info'), t('gains:convertSoon'))}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 13, borderRadius: 13,
                backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="refresh-outline" size={16} color="#374151" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>{t('gains:convert')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <PotentialEarningsCard
            declarations={potentialDeclarations}
            totalXaf={totalPotentialXaf}
            totalPts={totalPotentialPts}
            fmtAmount={fmtAmount}
            t={t}
          />
          {/* Methods management */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="card-outline" size={16} color={GREEN_MID} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{t('gains:paymentMethods')}</Text>
              </View>
              <Pressable onPress={() => Alert.alert(t('common:info'), 'Gestion des paiements bientôt disponible.')}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: PRIMARY }}>{t('gains:manage')}</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Stats Grid ── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {[
              { icon: 'checkmark-circle-outline' as const, bg: '#F0FDF4', color: '#16A34A', value: String(statsCards.total_found ?? 0), label: t('gains:docsFound') },
              { icon: 'hand-left-outline' as const, bg: '#FFF3E0', color: PRIMARY, value: String(statsCards.total_returned ?? 0), label: t('gains:docsReturned') },
              { icon: 'cash-outline' as const, bg: '#FFFBEB', color: '#D97706', value: `${fmtAmount(totalFinderPayouts)}`, label: t('gains:xafEarned') },
              { icon: 'log-out-outline' as const, bg: '#EFF6FF', color: '#3B82F6', value: `${fmtAmount(totalWithdrawn)}`, label: t('gains:xafWithdrawn') },
            ].map((card) => (
              <View key={card.label} style={{
                width: '48%', flexGrow: 1, backgroundColor: '#FAFAFA', borderRadius: 16,
                borderWidth: 1, borderColor: '#F0F0F0', padding: 14,
              }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: card.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name={card.icon} size={17} color={card.color} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 }}>{card.value}</Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{card.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Points DocMaster ── */}
          <View style={{ backgroundColor: '#FAFAFA', borderRadius: 18, borderWidth: 1, borderColor: '#F0F0F0', padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="star" size={16} color={PRIMARY} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{t('gains:loyaltyPoints')}</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{t('gains:loyaltySubtitle')}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: PRIMARY }}>{fmtAmount(totalPoints)} {t('gains:pts')}</Text>
            </View>

            {/* Points breakdown */}
            {[
              { label: t('gains:breakdownDeclarations'), detail: `(+${pointsBreakdown.declarations.pts_per_unit || 5} ${t('gains:pts')} × ${pointsBreakdown.declarations.count})`, pts: pointsBreakdown.declarations.points, color: PRIMARY, max: 5 },
              { label: t('gains:breakdownReturned'), detail: `(${pointsBreakdown.returns.count} ${t('gains:docsReturned')})`, pts: pointsBreakdown.returns.points, color: GREEN_MID, max: 5 },
              { label: t('gains:breakdownReferrals'), detail: `(${pointsBreakdown.referrals.count} personnes)`, pts: pointsBreakdown.referrals.points, color: '#D97706', max: 5 },
            ].map((item) => {
              const pct = Math.min((item.pts / item.max) * 100, 100);
              return (
                <View key={item.label} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {item.label} <Text style={{ color: '#1A1A1A', fontWeight: '600' }}>{item.detail}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>{item.pts} {t('gains:pts')}</Text>
                  </View>
                  <View style={{ height: 5, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', backgroundColor: item.color, borderRadius: 3, width: `${pct}%` }} />
                  </View>
                </View>
              );
            })}

            {/* Level badge */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: `${PRIMARY}08`, borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: `${PRIMARY}20`,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trophy" size={16} color={PRIMARY} />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{levelLabel}</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {pointsToNext > 0 ? `${pointsToNext} ${t('gains:goldNext')}` : t('gains:goldReached')}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{t('gains:nextLevel')}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>{fmtAmount(nextLevelPoints)} {t('gains:pts')}</Text>
              </View>
            </View>
          </View>

          {/* ── Transactions récentes ── */}
          <View style={{ backgroundColor: '#FAFAFA', borderRadius: 18, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="time-outline" size={16} color={GREEN_MID} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{t('gains:recentTransactions')}</Text>
              </View>
              <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: PRIMARY }}>{t('gains:seeAll')}</Text>
              </Pressable>
            </View>

            {transactions.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt-outline" size={32} color="#D1D5DB" />
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{t('gains:noTransactions')}</Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((tx, idx) => {
                const meta = getTxMeta(tx.type || '', t);
                const isPositive = tx.amount > 0 && tx.type !== 'recovery_fee';
                return (
                  <View
                    key={tx.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: idx < Math.min(transactions.length, 5) - 1 ? 1 : 0,
                      borderBottomColor: '#F0F0F0',
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={meta.icon} size={17} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>{meta.label}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{meta.sub} · {fmtDate(tx.created_at)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: isPositive ? GREEN_MID : '#9CA3AF' }}>
                        {isPositive ? '+' : '-'}{fmtAmount(Math.abs(tx.amount))} {t('common:fcf')}
                      </Text>
                      <View style={{
                        backgroundColor: tx.status === 'SUCCESS' ? '#F0FDF4' : tx.status === 'PENDING' ? '#FFF7ED' : '#F3F4F6',
                        borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                      }}>
                        <Text style={{
                          fontSize: 9, fontWeight: '700',
                          color: tx.status === 'SUCCESS' ? '#16A34A' : tx.status === 'PENDING' ? '#EA580C' : '#6B7280',
                        }}>
                          {tx.status === 'SUCCESS' ? t('gains:statusSuccess') : tx.status === 'PENDING' ? t('gains:statusPending') : tx.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Historique des gains ── */}
          {earnings.length > 0 && (
            <View style={{ backgroundColor: '#FAFAFA', borderRadius: 18, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="wallet-outline" size={16} color={PRIMARY} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{t('gains:earningsHistory')}</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{earnings.length} {t('gains:entries')}</Text>
              </View>

              {earnings.slice(0, 5).map((entry, idx) => {
                const meta = getEarningMeta(entry.type, t);
                const isPoints = entry.currency === 'POINTS';
                return (
                  <View
                    key={entry.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: idx < Math.min(earnings.length, 5) - 1 ? 1 : 0,
                      borderBottomColor: '#F0F0F0',
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={meta.icon} size={17} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>
                        {entry.description || meta.label}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{fmtDate(entry.created_at)}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isPoints ? PRIMARY : GREEN_MID }}>
                      +{fmtAmount(entry.amount)} {isPoints ? t('gains:pts') : t('common:fcf')}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Méthodes de retrait ── */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="phone-portrait-outline" size={16} color={GREEN_MID} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{t('gains:withdrawMethods')}</Text>
            </View>

            <View style={{ gap: 10 }}>
              {[
                { icon: 'phone-portrait-outline', name: t('gains:mtn'), color: '#D97706', bg: '#FFFBEB', connected: true },
                { icon: 'phone-portrait-outline', name: t('gains:orange'), color: '#EA580C', bg: '#FFF7ED', connected: false },
                { icon: 'business-outline', name: t('gains:bankTransfer'), color: '#3B82F6', bg: '#EFF6FF', connected: false },
              ].map((method) => (
                <Pressable
                  key={method.name}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: '#FFFFFF', borderRadius: 14,
                    borderWidth: 2, borderColor: method.connected ? PRIMARY : '#F0F0F0',
                    padding: 14, opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: method.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={method.icon as any} size={18} color={method.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>{method.name}</Text>
                    <Text style={{ fontSize: 11, color: method.connected ? '#16A34A' : '#9CA3AF', fontWeight: method.connected ? '600' : '400' }}>
                      {method.connected ? t('gains:connected') : t('gains:add')}
                    </Text>
                  </View>
                  <Ionicons
                    name={method.connected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={method.connected ? PRIMARY : '#D1D5DB'}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
              {t('gains:minPrefix')}{fmtAmount(minWithdrawal)} {t('common:fcf')}{t('gains:delay')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
