import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/core/store/useAuthStore';
import { BottomTabInset } from '@/constants/theme';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

type Transaction = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  label: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'credit', amount: 2000, label: 'Abonnement Premium', date: '2026-06-10T14:30:00Z', icon: 'rocket-outline', color: '#16A34A', bg: '#F0FDF4' },
  { id: '2', type: 'debit', amount: 500, label: 'Récupération de document', date: '2026-06-08T09:15:00Z', icon: 'document-text-outline', color: '#EF4444', bg: '#FEF2F2' },
  { id: '3', type: 'credit', amount: 1000, label: 'Parrainage - Amadou', date: '2026-06-05T11:00:00Z', icon: 'people-outline', color: '#3B82F6', bg: '#EFF6FF' },
  { id: '4', type: 'debit', amount: 200, label: 'Frais de vérification IMEI', date: '2026-06-03T16:45:00Z', icon: 'shield-checkmark-outline', color: '#F59E0B', bg: '#FFFBEB' },
  { id: '5', type: 'credit', amount: 5000, label: 'Recharge Mobile Money', date: '2026-06-01T10:20:00Z', icon: 'phone-portrait-outline', color: '#16A34A', bg: '#F0FDF4' },
];

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

function formatTime(s: string) {
  try {
    return new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const balance = user?.wallet_balance ?? 0;

  const totalCredits = MOCK_TRANSACTIONS.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = MOCK_TRANSACTIONS.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
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
            {balance.toLocaleString('fr')} <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>FCFA</Text>
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {user?.currency || 'FCFA'}
          </Text>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Ionicons name="arrow-down-circle-outline" size={18} color="#10B981" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981', marginTop: 4 }}>
                +{totalCredits.toLocaleString('fr')}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Entrées</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Ionicons name="arrow-up-circle-outline" size={18} color="#EF4444" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#EF4444', marginTop: 4 }}>
                -{totalDebits.toLocaleString('fr')}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Sorties</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {[
            { icon: 'add-circle-outline', label: 'Recharger', color: '#16A34A', bg: '#F0FDF4' },
            { icon: 'send-outline', label: 'Transférer', color: '#3B82F6', bg: '#EFF6FF' },
            { icon: 'receipt-outline', label: 'Historique', color: PRIMARY, bg: '#FFF3E0' },
          ].map((action, idx) => (
            <Pressable
              key={idx}
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

          {MOCK_TRANSACTIONS.length === 0 ? (
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
              {MOCK_TRANSACTIONS.map((tx, idx) => (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderBottomWidth: idx < MOCK_TRANSACTIONS.length - 1 ? 1 : 0,
                    borderBottomColor: '#F0F0F0',
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: tx.bg, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={tx.icon} size={18} color={tx.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>
                      {tx.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {formatDate(tx.date)} · {formatTime(tx.date)}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 14, fontWeight: '700',
                    color: tx.type === 'credit' ? '#16A34A' : '#EF4444',
                  }}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString('fr')} FCFA
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
