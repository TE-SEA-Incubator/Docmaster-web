import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationsService } from '@/core/api/notificationsService';
import type { Notification } from '@/types';

const PRIMARY = '#F5A64B';

type NotifMeta = { icon: keyof typeof Ionicons.glyphMap; bg: string; iconColor: string };
const typeMeta: Record<string, NotifMeta> = {
  MATCH_FOUND:       { icon: 'checkmark-circle-outline', bg: '#F0FDF4', iconColor: '#16A34A' },
  LOST_SUBMITTED:    { icon: 'alert-circle-outline',     bg: '#FFF3E0', iconColor: '#D97706' },
  FOUND_SUBMITTED:   { icon: 'hand-left-outline',        bg: '#EFF6FF', iconColor: '#2563EB' },
  DOC_ADDED:         { icon: 'shield-checkmark-outline', bg: '#F5F3FF', iconColor: '#7C3AED' },
  PAYMENT_RECEIVED:  { icon: 'wallet-outline',           bg: '#F0FDF4', iconColor: '#16A34A' },
};
const defaultMeta: NotifMeta = { icon: 'notifications-outline', bg: '#FFF3E0', iconColor: PRIMARY };

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await notificationsService.getAll();
      if (res.success && res.data) setNotifications(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true, is_read: true })));
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, lue: true, is_read: true } : n));
    } catch {}
  };

  const unread = notifications.filter((n) => !n.is_read && !n.lue).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
      }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: pressed ? '#F5F5F5' : '#FAFAFA',
            borderWidth: 1, borderColor: '#F0F0F0',
            alignItems: 'center', justifyContent: 'center',
          })}>
          <Ionicons name="close" size={20} color="#1A1A1A" />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>{t('notifications:title')}</Text>
          {unread > 0 && (
            <View style={{ backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{unread}</Text>
            </View>
          )}
        </View>

        {unread > 0 ? (
          <Pressable onPress={markAllRead} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>{t('notifications:markAllRead')}</Text>
          </Pressable>
        ) : <View style={{ width: 38 }} />}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-off-outline" size={28} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>{t('notifications:emptyTitle')}</Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
              {t('notifications:emptyDesc')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.map((notif) => {
              const meta = (notif.type && typeMeta[notif.type]) || defaultMeta;
              const isUnread = !notif.is_read && !notif.lue;
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => markRead(notif.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                    padding: 14, borderRadius: 14,
                    backgroundColor: pressed ? '#FAFAFA' : (isUnread ? '#FFFBF5' : '#FFFFFF'),
                    borderWidth: 1, borderColor: isUnread ? '#FFE4B5' : '#F0F0F0',
                  })}>
                  {isUnread && (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY, marginTop: 6 }} />
                  )}
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={meta.icon} size={20} color={meta.iconColor} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{notif.titre}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>{notif.message}</Text>
                    <Text style={{ fontSize: 11, color: '#C4C4C4', marginTop: 3 }}>
                      {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
