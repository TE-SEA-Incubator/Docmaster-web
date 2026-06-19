import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useEarnings } from '@/core/hooks/useEarnings';
import { paymentsService, type Withdrawal } from '@/core/api/paymentsService';
import { BottomTabInset } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ActionFeedbackModal, type FeedbackType } from '@/components/feedback/ActionFeedbackModal';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR');
}

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

function formatTime(s?: string) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getTxMeta(type?: string) {
  if (type === 'finder_payout' || type === 'finder_reward') return { icon: 'checkmark-circle-outline' as const, bg: '#F0FDF4', color: '#16A34A', label: 'Récompense trouvaille' };
  if (type === 'recovery_fee') return { icon: 'arrow-up-outline' as const, bg: '#FFF7ED', color: '#EA580C', label: 'Frais récupération' };
  if (type === 'withdrawal') return { icon: 'log-out-outline' as const, bg: '#EFF6FF', color: '#3B82F6', label: 'Retrait' };
  if (type === 'referral_bonus') return { icon: 'people-outline' as const, bg: '#FFFBEB', color: '#D97706', label: 'Bonus parrainage' };
  if (type === 'subscription') return { icon: 'rocket-outline' as const, bg: '#F5F3FF', color: '#8B5CF6', label: 'Abonnement' };
  if (type === 'credit' || type === 'deposit') return { icon: 'add-circle-outline' as const, bg: '#F0FDF4', color: '#16A34A', label: 'Recharge' };
  return { icon: 'receipt-outline' as const, bg: '#F3F4F6', color: '#6B7280', label: 'Transaction' };
}

function WithdrawalStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    PENDING: { label: 'En attente', bg: '#FFF7ED', color: '#EA580C' },
    COMPLETED: { label: 'Effectué', bg: '#F0FDF4', color: '#16A34A' },
    REJECTED: { label: 'Rejeté', bg: '#FEF2F2', color: '#EF4444' },
  };
  const c = config[status] || { label: status, bg: '#F3F4F6', color: '#6B7280' };
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: c.color }}>{c.label}</Text>
    </View>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user, fetchProfile } = useAuthStore();
  const { transactions, loading, refresh } = useEarnings();
  const [refreshing, setRefreshing] = useState(false);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'MTN' | 'ORANGE'>('MTN');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);

  const [feedback, setFeedback] = useState<{ visible: boolean; type: FeedbackType; title: string; message?: string }>({
    visible: false, type: 'success', title: '',
  });

  const balance = user?.wallet_balance ?? 0;

  const credits = transactions.filter((t) => Number(t.amount) > 0 && t.type !== 'recovery_fee' && t.type !== 'withdrawal').reduce((s, t) => s + Number(t.amount), 0);
  const debits = transactions.filter((t) => Number(t.amount) < 0 || t.type === 'recovery_fee' || t.type === 'withdrawal').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchProfile()]);
    setRefreshing(false);
  }, [refresh, fetchProfile]);

  const openWithdraw = () => {
    setWithdrawAmount('');
    setWithdrawMethod('MTN');
    setWithdrawPhone(user?.telephone || '');
    setShowWithdraw(true);
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount.replace(/[^0-9]/g, ''));
    if (amount < 100) {
      Alert.alert('Montant invalide', 'Le montant minimum de retrait est de 100 FCFA.');
      return;
    }
    if (amount > balance) {
      Alert.alert('Solde insuffisant', `Votre solde est de ${fmtAmount(balance)} FCFA.`);
      return;
    }
    if (!withdrawPhone.trim() || withdrawPhone.length < 8) {
      Alert.alert('Téléphone requis', 'Veuillez entrer un numéro de téléphone valide.');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await paymentsService.requestWithdrawal({
        amount,
        payment_method: withdrawMethod,
        payment_details: withdrawPhone.trim(),
      });
      if (res.success) {
        setShowWithdraw(false);
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Demande envoyée',
          message: `Votre demande de retrait de ${fmtAmount(amount)} FCFA a été enregistrée. Elle sera traitée sous 24-48h.`,
        });
        await fetchProfile();
        refresh();
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de soumettre la demande.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur réseau. Réessayez.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const openHistory = async () => {
    setShowHistory(true);
    setWithdrawalsLoading(true);
    try {
      const res = await paymentsService.getMyWithdrawals();
      if (res.success && res.data) setWithdrawals(res.data);
    } catch {
      // silent
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 32, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>Portefeuille</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Gérez votre solde et transactions</Text>
        </View>

        {/* Balance card */}
        <View style={{
          backgroundColor: GREEN_DARK, borderRadius: 24, padding: 24, marginBottom: 24,
          overflow: 'hidden',
        }}>
          <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(245,166,75,0.1)', top: -40, right: -40 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,166,75,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 16 }}>
            <Ionicons name="wallet" size={11} color={PRIMARY} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: PRIMARY, letterSpacing: 0.5 }}>SOLDE DOCMASTER</Text>
          </View>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
            {fmtAmount(balance)} <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>FCFA</Text>
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {user?.currency || 'FCFA'}
          </Text>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Ionicons name="arrow-down-circle-outline" size={18} color="#10B981" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981', marginTop: 4 }}>
                +{fmtAmount(credits)}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Entrées</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Ionicons name="arrow-up-circle-outline" size={18} color="#EF4444" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#EF4444', marginTop: 4 }}>
                -{fmtAmount(debits)}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Sorties</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {[
            { icon: 'add-circle-outline', label: 'Recharger', color: '#16A34A', bg: '#F0FDF4', onPress: () => Alert.alert('Bientôt disponible', 'Le rechargement en ligne sera disponible prochainement.') },
            { icon: 'log-out-outline', label: 'Retirer', color: '#3B82F6', bg: '#EFF6FF', onPress: openWithdraw },
            { icon: 'receipt-outline', label: 'Historique', color: PRIMARY, bg: '#FFF3E0', onPress: openHistory },
          ].map((action, idx) => (
            <Pressable
              key={idx}
              onPress={action.onPress}
              style={({ pressed }) => ({
                flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14,
                backgroundColor: action.bg, borderRadius: 14,
                borderWidth: 1, borderColor: '#F0F0F0',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name={action.icon as any} size={22} color={action.color} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: action.color }}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Transactions */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Ionicons name="time-outline" size={16} color="#1A1A1A" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>Transactions récentes</Text>
          </View>

          {loading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={PRIMARY} />
            </View>
          ) : transactions.length === 0 ? (
            <View style={{
              backgroundColor: '#FAFAFA', borderRadius: 16,
              borderWidth: 1, borderColor: '#F0F0F0', borderStyle: 'dashed',
              padding: 32, alignItems: 'center', gap: 8,
            }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="wallet-outline" size={22} color={PRIMARY} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>Aucune transaction</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                Vos transactions apparaîtront ici
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#FAFAFA', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' }}>
              {transactions.slice(0, 10).map((tx, idx) => {
                const meta = getTxMeta(tx.type);
                const isPositive = Number(tx.amount) > 0 && tx.type !== 'recovery_fee';
                return (
                  <View
                    key={tx.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 16, paddingVertical: 14,
                      borderBottomWidth: idx < Math.min(transactions.length, 10) - 1 ? 1 : 0,
                      borderBottomColor: '#F0F0F0',
                    }}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>
                        {meta.label}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        {formatDate(tx.created_at)} · {formatTime(tx.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={{
                        fontSize: 14, fontWeight: '700',
                        color: isPositive ? '#16A34A' : '#EF4444',
                      }}>
                        {isPositive ? '+' : '-'}{fmtAmount(Math.abs(Number(tx.amount)))} FCFA
                      </Text>
                      <View style={{
                        backgroundColor: tx.status === 'SUCCESS' ? '#F0FDF4' : tx.status === 'PENDING' ? '#FFF7ED' : '#F3F4F6',
                        borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                      }}>
                        <Text style={{
                          fontSize: 9, fontWeight: '700',
                          color: tx.status === 'SUCCESS' ? '#16A34A' : tx.status === 'PENDING' ? '#EA580C' : '#6B7280',
                        }}>
                          {tx.status === 'SUCCESS' ? 'Succès' : tx.status === 'PENDING' ? 'En cours' : tx.status || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdraw} transparent animationType="fade" onRequestClose={() => setShowWithdraw(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setShowWithdraw(false)}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 420, padding: 28 }} onPress={e => e.stopPropagation()}>
            <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name="log-out-outline" size={28} color="#3B82F6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 }}>Retrait de fonds</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
              Solde disponible : {fmtAmount(balance)} FCFA
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 }}>Mode de paiement</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([{ key: 'MTN', icon: 'phone-portrait-outline', label: 'MTN Mobile Money' },
                   { key: 'ORANGE', icon: 'phone-portrait-outline', label: 'Orange Money' }] as const).map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setWithdrawMethod(m.key)}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 6,
                      borderWidth: 1.5, borderColor: withdrawMethod === m.key ? '#F5A64B' : '#E0D5C4',
                      backgroundColor: withdrawMethod === m.key ? '#FEF0DC' : '#FFFFFF',
                    }}
                  >
                    <Ionicons name={m.icon} size={20} color={withdrawMethod === m.key ? '#D98A30' : '#9CA3AF'} />
                    <Text style={{ fontSize: 10, fontWeight: '600', color: withdrawMethod === m.key ? '#D98A30' : '#6B7280', textAlign: 'center' }}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Input
                label="Montant (FCFA)"
                placeholder="Ex: 5000"
                icon="cash-outline"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
              <Input
                label="Numéro de téléphone"
                placeholder="Ex: 691234567"
                icon="call-outline"
                keyboardType="phone-pad"
                value={withdrawPhone}
                onChangeText={setWithdrawPhone}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <View style={{ flex: 1 }}>
                <Button title="Annuler" variant="outline" onPress={() => setShowWithdraw(false)} />
              </View>
              <View style={{ flex: 1.5 }}>
                <Button title="Retirer" onPress={handleWithdraw} loading={withdrawSubmitting} icon="log-out-outline" />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Withdrawal History Modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowHistory(false)}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: insets.bottom + 8 }} onPress={e => e.stopPropagation()}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>Historique des retraits</Text>
              <Pressable onPress={() => setShowHistory(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              {withdrawalsLoading ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              ) : withdrawals.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                  <Ionicons name="receipt-outline" size={32} color="#D1D5DB" />
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Aucun retrait pour le moment</Text>
                </View>
              ) : (
                <View style={{ gap: 10, paddingBottom: 32 }}>
                  {withdrawals.map((w) => (
                    <View key={w.id} style={{
                      backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14,
                      borderWidth: 1, borderColor: '#F0F0F0',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1A1A' }}>
                          {fmtAmount(w.amount)} FCFA
                        </Text>
                        <WithdrawalStatusBadge status={w.status} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {w.payment_method === 'MTN' ? 'MTN Mobile Money' : w.payment_method === 'ORANGE' ? 'Orange Money' : w.payment_method}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {w.payment_details}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        {formatDate(w.created_at)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ActionFeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onDismiss={() => setFeedback((f) => ({ ...f, visible: false }))}
        onPrimaryAction={() => setFeedback((f) => ({ ...f, visible: false }))}
      />
    </SafeAreaView>
  );
}
