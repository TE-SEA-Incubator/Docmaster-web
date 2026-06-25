import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, View, Text, ActivityIndicator,
  RefreshControl, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/core/store/useAuthStore';
import { subscriptionsService, paymentsService } from '@/core/api';
import type { Plan, Transaction } from '@/types';
import { PaymentModal, type PaymentMethod } from '@/components/modals/PaymentModal';
import { useTranslation } from 'react-i18next';
import { ActionFeedbackModal, type FeedbackType } from '@/components/feedback/ActionFeedbackModal';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');

const PLAN_ICONS: Record<string, any> = {
  free: 'leaf-outline',
  starter: 'star-outline',
  pro: 'rocket-outline',
  business: 'briefcase-outline',
};

const FEATURE_ICONS: Record<string, any> = {
  objects: 'phone-portrait-outline',
  docs_per_type: 'shield-checkmark-outline',
  vault: 'lock-closed-outline',
  prioritaire: 'headset-outline',
  certification: 'ribbon-outline',
  matching_speed: 'flash-outline',
};

export default function SubscriptionScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState('');
  const [polling, setPolling] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; type: FeedbackType; title: string; message?: string }>({
    visible: false, type: 'success', title: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [plansRes, usageRes, txRes] = await Promise.all([
        subscriptionsService.getAllPlans(),
        subscriptionsService.getUsage(),
        paymentsService.getMyTransactions().catch(() => ({ success: false, data: [] })),
      ]);
      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (usageRes.success && usageRes.data) setUsage(usageRes.data);
      if (txRes.success && txRes.data) setTransactions(txRes.data);
    } finally {
      setLoadingPlans(false);
      setLoadingTx(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePay = async (method: PaymentMethod, phone: string) => {
    if (!selectedPlan) return;
    setProcessing(true);
    setPayError('');
    try {
      const paymentMethod = method === 'orange' ? 'ORANGE_MONEY' : method === 'mtn' ? 'MTN_MOMO' : 'POINTS';
      const months = billing === 'annual' ? 12 : 1;
      const result = await subscriptionsService.subscribe({ planId: selectedPlan.id, months, paymentMethod, phone });
      if (result.success) {
        if (method === 'points') {
          setModalOpen(false);
          setFeedback({ visible: true, type: 'success', title: t('subscription:activatedTitle'), message: t('subscription:activatedPointsMessage') });
          loadData();
        } else {
          setPolling(true);
          const interval = setInterval(async () => {
            try {
              const res = await subscriptionsService.getUsage();
              if (res.success && res.data?.subscription_id) {
                clearInterval(interval);
                setPolling(false);
                setModalOpen(false);
                setFeedback({ visible: true, type: 'success', title: t('subscription:activatedTitle'), message: t('subscription:activatedSuccessMessage') });
                loadData();
              }
            } catch {}
          }, 5000);
          setTimeout(() => { clearInterval(interval); setPolling(false); }, 300000);
        }
      } else {
        setPayError(result.message || t('subscription:subscribeError'));
      }
    } catch (e: any) {
      setPayError(e.response?.data?.message || t('subscription:paymentError'));
    } finally {
      setProcessing(false);
    }
  };

  const normalizeFeatures = (raw: any) => {
    if (!raw) return [];
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw).map(([key, val]) => ({
        label: t(`subscription:feature_${key}`) || key,
        value: val === true ? '✓' : val === false ? '✗' : String(val),
        icon: FEATURE_ICONS[key] || 'checkmark-circle-outline',
        included: val !== false && val !== 0,
      }));
    }
    return [];
  };

  const currentPlanName = usage?.plan_name || t('subscription:free');
  const pct = Math.min(100, usage?.percentage || 0);
  const displayedPlans = billing === 'annual'
    ? plans.map(p => ({ ...p, price: Math.round((p.price || 0) * 12 * 0.8) }))
    : plans;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={[s.backBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('subscription:title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>

          {/* ── Current plan hero ── */}
          <View style={[s.hero, { backgroundColor: colors.greenDark }]}>
            <View style={s.heroBadgeRow}>
              <View style={[s.heroBadge, { backgroundColor: 'rgba(245,166,75,0.18)' }]}>
                <Ionicons name="flash" size={11} color={colors.primary} />
                <Text style={[s.heroBadgeText, { color: colors.primary }]}>Plan actuel</Text>
              </View>
              {usage?.subscription_end && (
                <Text style={s.heroExpiry}>Expire le {new Date(usage.subscription_end).toLocaleDateString('fr-FR')}</Text>
              )}
            </View>
            <Text style={s.heroName}>{currentPlanName}</Text>
            <Text style={s.heroSub}>
              {usage?.usage?.objects || 0} / {usage?.limits?.objects || '∞'} appareils · {usage?.usage?.docs_per_type || 0} déclarations
            </Text>

            {/* Progress bar */}
            <View style={s.progressWrap}>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : colors.primary }]} />
              </View>
              <View style={s.progressLabels}>
                <Text style={s.progressLbl}>Capacité utilisée</Text>
                <Text style={s.progressPct}>{pct}%</Text>
              </View>
            </View>
          </View>

          {/* ── Billing toggle ── */}
          <View style={s.toggleSection}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Choisir un plan</Text>
            <View style={[s.toggle, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              {(['monthly', 'annual'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setBilling(p)}
                  style={[s.toggleOption, billing === p && { backgroundColor: colors.background, borderColor: colors.tint }]}
                >
                  <Text style={[s.toggleText, { color: billing === p ? colors.text : colors.textSecondary, fontWeight: billing === p ? '700' : '500' }]}>
                    {p === 'monthly' ? 'Mensuel' : 'Annuel'}
                  </Text>
                  {p === 'annual' && (
                    <View style={[s.saveBadge, { backgroundColor: colors.successBg }]}>
                      <Text style={[s.saveTxt, { color: colors.greenDark }]}>-20%</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Plans ── */}
          {loadingPlans ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {displayedPlans.map((plan, idx) => {
                const isCurrent = (plan.name || '').toLowerCase() === currentPlanName.toLowerCase();
                const isFeatured = plan.popular || idx === 1;
                const features = normalizeFeatures(plan.features);
                const planKey = (plan.name || '').toLowerCase();

                return (
                  <View key={plan.id} style={[
                    s.planCard,
                    { width: width * 0.72, backgroundColor: isFeatured ? colors.greenDark : colors.backgroundElement, borderColor: isFeatured ? colors.greenDark : colors.border },
                  ]}>
                    {isFeatured && (
                      <View style={[s.popularBadge, { backgroundColor: colors.primary }]}>
                        <Text style={s.popularTxt}>Populaire</Text>
                      </View>
                    )}

                    <View style={[s.planIconWrap, { backgroundColor: isFeatured ? 'rgba(245,166,75,0.15)' : colors.warningBg }]}>
                      <Ionicons name={PLAN_ICONS[planKey] || 'star-outline'} size={22} color={colors.primary} />
                    </View>

                    <Text style={[s.planName, { color: isFeatured ? '#fff' : colors.text }]}>{plan.name}</Text>
                    <View style={s.priceRow}>
                      <Text style={[s.planPrice, { color: isFeatured ? '#fff' : colors.text }]}>
                        {(plan.price || 0).toLocaleString('fr-FR')}
                      </Text>
                      <Text style={[s.planCurrency, { color: colors.primary }]}> XAF</Text>
                    </View>
                    <Text style={[s.planPeriod, { color: isFeatured ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>
                      /{billing === 'annual' ? 'an' : 'mois'}
                    </Text>

                    <View style={[s.divider, { backgroundColor: isFeatured ? 'rgba(255,255,255,0.1)' : colors.border }]} />

                    <View style={s.featureList}>
                      {features.slice(0, 5).map((f, fi) => (
                        <View key={fi} style={s.featureRow}>
                          <Ionicons
                            name={f.included ? 'checkmark-circle' : 'close-circle'}
                            size={15}
                            color={f.included ? colors.success : (isFeatured ? 'rgba(255,255,255,0.3)' : colors.border)}
                          />
                          <Text style={[s.featureTxt, { color: isFeatured ? (f.included ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)') : (f.included ? colors.text : colors.textSecondary) }]} numberOfLines={1}>
                            {f.label}: <Text style={{ fontWeight: '700' }}>{f.value}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => { if (!isCurrent) { setSelectedPlan(plan); setModalOpen(true); } }}
                      disabled={isCurrent}
                      style={({ pressed }) => ([
                        s.planBtn,
                        isFeatured
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.tint },
                        isCurrent && { opacity: 0.5 },
                        pressed && { opacity: 0.8 },
                      ])}
                    >
                      <Text style={[s.planBtnTxt, { color: isFeatured ? '#fff' : colors.tint }]}>
                        {isCurrent ? 'Plan actuel' : 'Choisir ce plan'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* ── Transactions ── */}
          <View style={s.sectionRow}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Historique</Text>
          </View>
          <View style={[s.txContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            {loadingTx ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : transactions.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="receipt-outline" size={32} color={colors.border} />
                <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>Aucune transaction</Text>
              </View>
            ) : transactions.slice(0, 5).map((tx, i) => (
              <View key={tx.id || i} style={[s.txRow, { borderBottomColor: colors.border }, i === Math.min(4, transactions.length - 1) && { borderBottomWidth: 0 }]}>
                <View style={[s.txIcon, { backgroundColor: colors.successBg }]}>
                  <Ionicons name="receipt-outline" size={16} color={colors.greenDark} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.txTitle, { color: colors.text }]}>
                    {tx.type === 'subscription' ? 'Abonnement' : 'Paiement'}
                  </Text>
                  <Text style={[s.txDate, { color: colors.textSecondary }]}>
                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString('fr-FR') : '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.txAmt, { color: colors.text }]}>{tx.amount?.toLocaleString()} XAF</Text>
                  <View style={[s.txStatusPill, { backgroundColor: tx.status === 'SUCCESS' ? colors.successBg : colors.dangerBg }]}>
                    <Text style={[s.txStatusTxt, { color: tx.status === 'SUCCESS' ? colors.greenDark : colors.danger }]}>
                      {tx.status === 'SUCCESS' ? 'Payé' : 'Échoué'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* ── Cancel ── */}
          {usage?.subscription_id && (
            <View style={s.sectionRow}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Gestion</Text>
            </View>
          )}
          {usage?.subscription_id && (
            <View style={[s.manageCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <View style={[s.manageIcon, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[s.manageTitle, { color: colors.text }]}>Annuler l'abonnement</Text>
                <Text style={[s.manageSub, { color: colors.textSecondary }]}>Votre accès reste actif jusqu'à la fin de la période.</Text>
              </View>
              <Pressable
                onPress={() => Alert.alert('Annuler ?', 'Votre abonnement sera résilié.', [
                  { text: 'Non', style: 'cancel' },
                  { text: 'Oui, annuler', style: 'destructive', onPress: async () => {
                    try {
                      await subscriptionsService.cancel();
                      setFeedback({ visible: true, type: 'success', title: 'Résilié', message: 'Abonnement annulé.' });
                      loadData();
                    } catch {
                      setFeedback({ visible: true, type: 'error', title: 'Erreur', message: 'Impossible d\'annuler.' });
                    }
                  }},
                ])}
                style={({ pressed }) => ([s.cancelBtn, { borderColor: colors.danger, opacity: pressed ? 0.7 : 1 }])}
              >
                <Text style={[s.cancelTxt, { color: colors.danger }]}>Résilier</Text>
              </Pressable>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── Payment modal ── */}
      <PaymentModal
        isOpen={modalOpen && !polling}
        onClose={() => setModalOpen(false)}
        onPay={handlePay}
        amount={selectedPlan?.price || 0}
        title="Passer au plan supérieur"
        description={`Activez le plan ${selectedPlan?.name || ''}`}
        processing={processing}
        error={payError}
        submitLabel="Payer maintenant"
      />

      {/* ── Polling overlay ── */}
      {polling && (
        <View style={[s.pollOverlay]}>
          <View style={[s.pollBox, { backgroundColor: colors.backgroundElement }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.pollTitle, { color: colors.text }]}>Confirmation en cours…</Text>
            <Text style={[s.pollSub, { color: colors.textSecondary }]}>Veuillez confirmer le paiement sur votre téléphone.</Text>
            <Pressable onPress={() => setPolling(false)} style={[s.pollClose, { borderColor: colors.border }]}>
              <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }]}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ActionFeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onDismiss={() => setFeedback(f => ({ ...f, visible: false }))}
        onPrimaryAction={() => setFeedback(f => ({ ...f, visible: false }))}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  // Hero
  hero: { borderRadius: 24, padding: 22, marginBottom: 28 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroExpiry: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  heroName: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 20, fontWeight: '500' },
  progressWrap: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLbl: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase' },
  progressPct: { fontSize: 11, color: '#fff', fontWeight: '800' },
  // Toggle
  toggleSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  toggle: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  toggleOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9, borderWidth: 1.5, borderColor: 'transparent' },
  toggleText: { fontSize: 12 },
  saveBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  saveTxt: { fontSize: 9, fontWeight: '800' },
  // Plan card
  planCard: { borderRadius: 22, borderWidth: 1, padding: 20, justifyContent: 'space-between' },
  popularBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  popularTxt: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  planIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  planName: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  planPrice: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  planCurrency: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  planPeriod: { fontSize: 12, marginBottom: 16, marginTop: 2 },
  divider: { height: 1, marginBottom: 16 },
  featureList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureTxt: { fontSize: 12, flex: 1 },
  planBtn: { paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planBtnTxt: { fontSize: 14, fontWeight: '700' },
  // Section
  sectionRow: { marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  // Transactions
  txContainer: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13, fontWeight: '600' },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700' },
  txStatusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginTop: 3 },
  txStatusTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  emptyWrap: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 13 },
  // Manage
  manageCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16 },
  manageIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  manageTitle: { fontSize: 14, fontWeight: '700' },
  manageSub: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  cancelTxt: { fontSize: 12, fontWeight: '700' },
  // Poll
  pollOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  pollBox: { width: '80%', borderRadius: 24, padding: 32, alignItems: 'center', gap: 12 },
  pollTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  pollSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  pollClose: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
});
