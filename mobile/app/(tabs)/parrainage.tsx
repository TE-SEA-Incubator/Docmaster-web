import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform, ToastAndroid, Dimensions, Linking, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { i18next } from '@/i18n';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useReferrals } from '@/core/hooks/useReferrals';
import { BottomTabInset } from '@/constants/theme';
import { ParrainageSkeleton } from '@/components/Skeletons';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';
const GREEN_MID = '#2D5A42';
const SCREEN = Dimensions.get('window');

const COLORS = [
  '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981',
  '#EF4444', '#14B8A6', '#6366F1', '#EC4899',
];

function getInitials(prenom?: string, nom?: string): string {
  const full = `${prenom || ''} ${nom || ''}`.trim();
  if (!full) return '??';
  return full.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(dateString?: string) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return i18next.t('home:timeAgo.justNow');
  if (diff < 3600) return i18next.t('home:timeAgo.minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return i18next.t('home:timeAgo.hoursAgo', { n: Math.floor(diff / 3600) });
  if (diff < 604800) return i18next.t('home:timeAgo.daysAgo', { n: Math.floor(diff / 86400) });
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
}

export default function ParrainageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { referrals, stats, loading } = useReferrals();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const code = user?.code_invitation || 'DOC-MASTER';

  const activeCount = stats.activeReferrals;
  const totalGains = stats.totalEarned;
  const totalFriends = referrals.length;
  const totalSlots = referrals.filter((r) => r.recompense_attribuee).length * 2;
  const progressPct = Math.min((totalFriends / 10) * 100, 100);

  const sortedReferrals = [...referrals].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    showToast(t('parrainage:codeCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVia = async (platform: 'whatsapp' | 'share') => {
    const msg = t('parrainage:shareMsg', { code });
    if (platform === 'whatsapp') {
      const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            await Share.share({ message: msg });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      await Share.share({ message: msg });
    }
  };

  if (loading) {
    return <ParrainageSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: GREEN_DARK }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 12 })}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{t('parrainage:title')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: GREEN_DARK, padding: 24, paddingTop: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(245,166,75,0.08)', top: -40, right: -40 }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,166,75,0.05)', bottom: -20, left: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(245,166,75,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 }}>
            <Ionicons name="gift-outline" size={12} color={PRIMARY} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: PRIMARY, letterSpacing: 0.5 }}>{t('parrainage:badge')}</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', lineHeight: 32, marginBottom: 8 }}>{t('parrainage:hero')}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 20 }}>{t('parrainage:desc')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, minWidth: 100, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '800', color: PRIMARY }}>{activeCount}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{t('parrainage:activeGodchildren')}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(245,166,75,0.15)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="wallet-outline" size={14} color={PRIMARY} /></View>
                <View><Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>{totalGains.toLocaleString()} XAF</Text><Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{t('parrainage:totalEarnings')}</Text></View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="file-tray-outline" size={14} color="#10B981" /></View>
                <View><Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>+{totalSlots}</Text><Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{t('parrainage:bonusSlots')}</Text></View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ backgroundColor: '#FAFAFA', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', padding: 18, marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>{t('parrainage:inviteCode')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 }}>
              <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', color: '#1A1A1A', letterSpacing: 3 }}>{code}</Text>
              <Pressable onPress={copyCode} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: copied ? '#10B981' : PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, opacity: pressed ? 0.8 : 1 })}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{copied ? t('parrainage:copied') : t('common:copy')}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => shareVia('whatsapp')} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(37,211,102,0.1)', borderWidth: 1, borderColor: 'rgba(37,211,102,0.2)', opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" /><Text style={{ fontSize: 13, fontWeight: '700', color: '#1a9e4e' }}>{t('parrainage:whatsapp')}</Text>
              </Pressable>
              <Pressable onPress={() => shareVia('share')} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="share-outline" size={18} color="#3B82F6" /><Text style={{ fontSize: 13, fontWeight: '700', color: '#3B82F6' }}>{t('common:share')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 }}>{t('parrainage:howItWorks')}</Text>
            {[
              { step: '1', icon: 'share-social-outline', color: PRIMARY, title: t('parrainage:step1Title'), desc: t('parrainage:step1Desc') },
              { step: '2', icon: 'person-add-outline', color: '#10B981', title: t('parrainage:step2Title'), desc: t('parrainage:step2Desc') },
              { step: '3', icon: 'trophy-outline', color: '#F59E0B', title: t('parrainage:step3Title'), desc: t('parrainage:step3Desc') },
            ].map((item, idx) => (
              <View key={item.step} style={{ flexDirection: 'row', gap: 14, marginBottom: idx < 2 ? 16 : 0, alignItems: 'flex-start' }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${item.color}15`, borderWidth: 1.5, borderColor: `${item.color}30`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
                <View style={{ flex: 1 }}><Text style={{ fontSize: 10, fontWeight: '800', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{t('parrainage:stepPrefix')}{item.step}</Text><Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 }}>{item.title}</Text><Text style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 17 }}>{item.desc}</Text></View>
              </View>
            ))}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 }}>{t('parrainage:yourRewards')}</Text>
            <View style={{ backgroundColor: '#FAFAFA', borderRadius: 18, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' }}>
              {[
                { icon: 'cash-outline', bg: '#FFF3E0', color: PRIMARY, label: t('parrainage:cashBonus'), sub: t('parrainage:perReferral'), value: t('parrainage:cashValue') },
                { icon: 'file-tray-outline', bg: '#F0FDF4', color: '#10B981', label: t('parrainage:reportBonus'), sub: t('parrainage:perReferral'), value: t('parrainage:slotsValue') },
                { icon: 'ribbon-outline', bg: '#FFFBEB', color: '#F59E0B', label: t('parrainage:planUpgrade'), sub: t('parrainage:from5'), value: t('parrainage:monthPro') },
              ].map((item, idx, arr) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon as any} size={16} color={item.color} /></View>
                    <View><Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>{item.label}</Text><Text style={{ fontSize: 11, color: '#9CA3AF' }}>{item.sub}</Text></View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: item.color }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
