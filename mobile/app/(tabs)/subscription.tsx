import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, ScrollView, View, Text, ActivityIndicator, RefreshControl, StyleSheet, Dimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '@/core/store/useAuthStore';
import { subscriptionsService, paymentsService } from '@/core/api';
import type { Plan, Transaction } from '@/types';
import { Spacing, Colors } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { ThemedText } from '@/components/themed-text';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';
const { width } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState('');
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadingPlans(true);
    setLoadingUsage(true);
    setLoadingTransactions(true);
    try {
      const [plansRes, usageRes, txRes] = await Promise.all([
        subscriptionsService.getAllPlans(),
        subscriptionsService.getUsage(),
        paymentsService.getMyTransactions().catch(() => ({ success: false, data: [] })),
      ]);
      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (usageRes.success && usageRes.data) setUsage(usageRes.data);
      if (txRes.success && txRes.data) setTransactions(txRes.data);
    } catch (e) {
      console.error('[Subscription] Error loading data:', e);
    } finally {
      setLoadingPlans(false);
      setLoadingUsage(false);
      setLoadingTransactions(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePay = async (method: 'orange' | 'mtn', phone: string) => {
    if (!selectedPlan) return;
    setProcessing(true);
    setPayError('');
    try {
      const paymentMethod = method === 'orange' ? 'ORANGE_MONEY' : 'MTN_MOMO';
      const months = billingPeriod === 'annual' ? 12 : 1;
      const result = await subscriptionsService.subscribe({
        planId: selectedPlan.id,
        months,
        paymentMethod,
        phone,
      });
      if (result.success) {
        setPollingStatus('Validation du paiement en cours...');
        startPolling();
      } else {
        setPayError(result.message || 'Erreur lors de la souscription');
      }
    } catch (e: any) {
      setPayError(e.response?.data?.message || 'Erreur de paiement');
    } finally {
      setProcessing(false);
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const res = await subscriptionsService.getUsage();
        if (res.success && res.data?.subscription_id) {
          clearInterval(interval);
          setPollingStatus(null);
          setModalOpen(false);
          Alert.alert('Succès', 'Votre abonnement a été activé !');
          loadData();
        }
      } catch (e) {
        console.error('[Subscription] Polling error:', e);
      }
    }, 5000);
    setTimeout(() => {
      clearInterval(interval);
      setPollingStatus(null);
    }, 300000);
  };

  const normalizeFeatures = (raw: any) => {
    if (!raw) return [];
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const featureMap: Record<string, { label: string; icon: string }> = {
        objects: { label: 'Objets personnels', icon: 'mobile-outline' },
        docs_per_type: { label: 'Déclarations actives', icon: 'shield-checkmark-outline' },
        vault: { label: 'Coffre-fort numérique', icon: 'lock-closed-outline' },
        prioritaire: { label: 'Support Prioritaire', icon: 'headset-outline' },
        certification: { label: 'Certification', icon: 'ribbon-outline' },
        matching_speed: { label: 'Vitesse Matching', icon: 'flash-outline' },
      };
      return Object.entries(raw).map(([key, val]) => ({
        label: featureMap[key]?.label || key,
        value: val === true ? 'Inclus' : val === false ? 'Non inclus' : String(val),
        icon: featureMap[key]?.icon || 'check',
      }));
    }
    return Array.isArray(raw) ? raw.map(f => (typeof f === 'string' ? { label: '', value: f, icon: 'check' } : f)) : [];
  };

  const currentPlanName = usage?.plan_name || 'Gratuit';
  const percentage = usage?.percentage || 0;
  const displayedPlans = billingPeriod === 'annual'
    ? plans.map(p => ({ ...p, price: Math.round((p.price || 0) * 12 * 0.8) }))
    : plans;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={styles.headerTitle}>Abonnement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Current Plan ── */}
        <View style={styles.currentPlanCard}>
          <View style={styles.planHeader}>
            <View style={styles.planBadge}>
              <Ionicons name="flash" size={12} color={PRIMARY} />
              <Text style={styles.planBadgeText}>PLAN ACTUEL</Text>
            </View>
            <ThemedText style={styles.currentPlanName}>{currentPlanName}</ThemedText>
            <Text style={styles.usageText}>
               {usage?.usage?.objects || 0} / {usage?.limits?.objects || 0} objets utilisés
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
             <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
             </View>
             <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Capacité utilisée</Text>
                <Text style={styles.progressValue}>{percentage}%</Text>
             </View>
          </View>
        </View>

        {/* ── Billing Toggle ── */}
        <View style={styles.toggleRow}>
           <Text style={styles.sectionTitle}>Nos Formules</Text>
           <View style={styles.toggleContainer}>
              <Pressable 
                onPress={() => setBillingPeriod('monthly')}
                style={[styles.toggleBtn, billingPeriod === 'monthly' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>Mensuel</Text>
              </Pressable>
              <Pressable 
                onPress={() => setBillingPeriod('annual')}
                style={[styles.toggleBtn, billingPeriod === 'annual' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, billingPeriod === 'annual' && styles.toggleTextActive]}>Annuel</Text>
                <View style={styles.discountBadge}><Text style={styles.discountText}>-20%</Text></View>
              </Pressable>
           </View>
        </View>

        {/* ── Plans List ── */}
        {loadingPlans ? (
          <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 40 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            {displayedPlans.map((plan, idx) => {
              const isCurrent = plan.name?.toLowerCase() === currentPlanName.toLowerCase();
              const isFeatured = plan.popular || idx === 1;
              const features = normalizeFeatures(plan.features);

              return (
                <View 
                  key={plan.id} 
                  style={[
                    styles.planCard, 
                    isFeatured && styles.planCardFeatured,
                    { width: width * 0.75 }
                  ]}
                >
                  <View style={styles.planCardHeader}>
                    <View style={[styles.planIcon, { backgroundColor: isFeatured ? 'rgba(245,166,75,0.2)' : '#FFF3E0' }]}>
                       <Ionicons name={isFeatured ? "rocket" : "star"} size={24} color={PRIMARY} />
                    </View>
                    <Text style={[styles.planName, isFeatured && { color: '#FFF' }]}>{plan.name}</Text>
                    <Text style={[styles.planPrice, isFeatured && { color: '#FFF' }]}>
                      {plan.price?.toLocaleString()} <Text style={styles.currency}>XAF</Text>
                    </Text>
                    <Text style={[styles.planPeriod, isFeatured && { color: 'rgba(255,255,255,0.6)' }]}>
                      {billingPeriod === 'annual' ? 'par an' : 'par mois'}
                    </Text>
                  </View>

                  <View style={styles.featuresList}>
                    {features.map((f, fi) => (
                      <View key={fi} style={styles.featureItem}>
                        <FontAwesome5 name={f.icon as any} size={12} color={PRIMARY} style={{ width: 20 }} />
                        <Text style={[styles.featureText, isFeatured && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
                          {f.label ? `${f.label}: ` : ''}{f.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Button
                    title={isCurrent ? "Plan actuel" : "Choisir ce plan"}
                    variant={isFeatured ? 'primary' : 'outline'}
                    disabled={isCurrent}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setModalOpen(true);
                    }}
                    style={styles.planBtn}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* ── Transactions ── */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Historique de paiement</Text>
        </View>
        <View style={styles.transactionsContainer}>
          {loadingTransactions ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyText}>Aucune transaction trouvée.</Text>
          ) : (
            transactions.slice(0, 5).map((t, i) => (
              <View key={t.id || i} style={styles.transactionItem}>
                <View style={styles.txIcon}>
                   <Ionicons name="receipt-outline" size={18} color={GREEN_DARK} />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.txTitle}>{t.type === 'subscription' ? 'Abonnement' : 'Paiement'}</Text>
                   <Text style={styles.txDate}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                   <Text style={styles.txAmount}>{t.amount} XAF</Text>
                   <View style={[styles.txStatus, { backgroundColor: t.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={[styles.txStatusText, { color: t.status === 'SUCCESS' ? '#16A34A' : '#EF4444' }]}>
                        {t.status === 'SUCCESS' ? 'Payé' : 'Échoué'}
                      </Text>
                   </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Subscription Management ── */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Gestion de l'abonnement</Text>
        </View>
        <View style={styles.managementContainer}>
           <Text style={styles.managementText}>
              Votre abonnement se renouvelle automatiquement. Vous pouvez l'annuler à tout moment.
           </Text>
           <Button 
             title="Annuler l'abonnement" 
             variant="outline" 
             style={styles.cancelBtn}
             textStyle={{ color: '#EF4444' }}
             onPress={() => {
               Alert.alert(
                 'Annuler l' + "'" + 'abonnement',
                 'Êtes-vous sûr de vouloir annuler votre abonnement actuel ? Vos avantages resteront actifs jusqu' + "'" + 'à la fin de la période.',
                 [
                   { text: 'Non', style: 'cancel' },
                   { 
                     text: 'Oui, annuler', 
                     style: 'destructive',
                     onPress: async () => {
                       try {
                         await subscriptionsService.cancel();
                         Alert.alert('Succès', 'Votre abonnement a été annulé.');
                         loadData();
                       } catch (e) {
                         Alert.alert('Erreur', 'Impossible d' + "'" + 'annuler l' + "'" + 'abonnement.');
                       }
                     }
                   }
                 ]
               );
             }}
           />
        </View>

      </ScrollView>

      {/* ── Payment Modal ── */}
      <PaymentModal
        isOpen={modalOpen && !pollingStatus}
        onClose={() => setModalOpen(false)}
        onPay={handlePay}
        amount={selectedPlan?.price || 0}
        title="Confirmation"
        description="Activez vos avantages DocMaster"
        processing={processing}
        error={payError}
        submitLabel="Payer maintenant"
      />

      {/* ── Polling Overlay ── */}
      {pollingStatus && (
        <View style={styles.pollingOverlay}>
           <View style={styles.pollingContent}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.pollingTitle}>Traitement en cours</Text>
              <Text style={styles.pollingSubtitle}>{pollingStatus}</Text>
              <Button 
                title="Fermer" 
                variant="ghost" 
                onPress={() => setPollingStatus(null)} 
                style={{ marginTop: 20 }}
              />
           </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  currentPlanCard: {
    backgroundColor: GREEN_DARK,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    overflow: 'hidden',
  },
  planHeader: {
    marginBottom: 20,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,166,75,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  planBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currentPlanName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
  },
  usageText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  progressContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 12,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#1A1A1A',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 8,
    color: '#16A34A',
    fontWeight: '800',
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 24,
    justifyContent: 'space-between',
  },
  planCardFeatured: {
    backgroundColor: GREEN_DARK,
    borderColor: GREEN_DARK,
  },
  planCardHeader: {
    marginBottom: 20,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  currency: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },
  planPeriod: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  planBtn: {
    height: 48,
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  transactionsContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  txDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  txStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  txStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    paddingVertical: 20,
  },
  managementContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  managementText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  cancelBtn: {
    borderColor: '#FEE2E2',
    height: 48,
  },
  pollingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pollingContent: {
    backgroundColor: '#FFF',
    width: '80%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  pollingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  pollingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
