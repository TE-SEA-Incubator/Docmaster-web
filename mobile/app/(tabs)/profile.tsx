import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, Text, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BottomTabInset } from '@/constants/theme';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useLanguageStore } from '@/core/store/useLanguageStore';
import { useThemeStore } from '@/core/store/useThemeStore';
import { documentsService } from '@/core/api/documentsService';
import { LANGUAGES, type LanguageCode } from '@/i18n/config';
import { useThemeColors } from '@/hooks/useThemeColors';

const LANG_LIST: { code: LanguageCode; flag: string }[] = [
  { code: 'fr', flag: '🇫🇷' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'ar', flag: '🇸🇦' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { mode, setMode } = useThemeStore();
  const colors = useThemeColors();
  const [loggingOut, setLoggingOut] = useState(false);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);

  useEffect(() => {
    documentsService.getAll().then(res => {
      if (res.success && res.data) setDocCount(res.data.length);
    }).catch(() => {});
  }, []);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>{t('profile:loading')}</Text>
      </SafeAreaView>
    );
  }

  const getInitials = () => {
    const p = user.prenom?.charAt(0) || '';
    const n = user.nom?.charAt(0) || '';
    return (p + n).toUpperCase() || 'DM';
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } catch {} finally { setLoggingOut(false); }
  };

  const handleLanguageChange = async (code: LanguageCode) => {
    setShowLangModal(false);
    await setLanguage(code);
    const isRTL = LANGUAGES[code].dir === 'rtl';
    const msg = isRTL
      ? t('language:restartMessageAr')
      : t('language:restartMessageFr');
    Alert.alert(t('language:restartTitle'), msg);
  };

  const themeOptions: { value: 'system' | 'light' | 'dark'; label: string; icon: string }[] = [
    { value: 'system', label: t('profile:themeSystem'), icon: 'contrast-outline' },
    { value: 'light', label: t('profile:themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('profile:themeDark'), icon: 'moon-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: colors.greenDark,
          paddingTop: insets.top,
          paddingBottom: 50,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, marginBottom: 24 }}>
            <Pressable onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.onPrimary} />
            </Pressable>
            <Pressable onPress={() => router.push('/manage-profile')}>
              <Ionicons name="pencil" size={22} color={colors.onPrimary} />
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: colors.backgroundElement,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
            }}>
              <Text style={{ color: colors.greenDark, fontSize: 34, fontWeight: '800' }}>{getInitials()}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.onPrimary, textAlign: 'center', marginBottom: 4 }}>
            {user.prenom} {user.nom}
          </Text>
          <Text style={{ fontSize: 13, color: colors.onPrimary + '99', textAlign: 'center', marginBottom: 4 }}>
            {user.email}
          </Text>
          <Text style={{ fontSize: 12, color: colors.onPrimary + '66', textAlign: 'center' }}>
            {user.ville ? `${user.ville}, ${user.pays || ''}` : t('common:fallbackCityLabel')}
          </Text>
        </View>

        {/* Stats card */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface2,
          marginHorizontal: 24,
          borderRadius: 20,
          paddingVertical: 18,
          marginTop: -30,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
          zIndex: 10,
        }}>
          <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>{t('profile:documents')}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{docCount ?? '...'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>{t('profile:points')}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{user.points || 0}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>{t('profile:wallet')}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
              {Number(user.wallet_balance || 0).toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Theme toggle */}
        <View style={{ marginHorizontal: 16, marginTop: 24, backgroundColor: colors.backgroundElement, borderRadius: 20, overflow: 'hidden', padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('profile:appearance')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {themeOptions.map(opt => {
              const isActive = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setMode(opt.value)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isActive ? colors.tint + '20' : 'transparent',
                    borderWidth: 1,
                    borderColor: isActive ? colors.tint : colors.border,
                  }}
                >
                  <Ionicons name={opt.icon as any} size={20} color={isActive ? colors.tint : colors.textSecondary} />
                  <Text style={{ fontSize: 11, color: isActive ? colors.tint : colors.textSecondary, marginTop: 4, fontWeight: isActive ? '600' : '400' }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Menu items */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: colors.backgroundElement, borderRadius: 20, overflow: 'hidden' }}>
          {[
            { key: 'gains', icon: 'wallet-outline', title: t('profile:menuTitle'), route: '/gains' as const, color: '#D97706', bgColor: '#FFFBEB' },
            { key: 'invite', icon: 'people-outline', title: t('profile:menuInvite'), route: '/parrainage' as const, color: '#7E22CE', bgColor: '#F3E8FF' },
            { key: 'manage', icon: 'settings-outline', title: t('profile:menuManage'), route: '/manage-profile' as const, color: '#F97316', bgColor: '#FFF7ED' },
            { key: 'language', icon: 'language-outline', title: t('profile:menuLanguage'), route: null, color: '#6366F1', bgColor: '#EEF2FF', onPress: () => setShowLangModal(true) },
            { key: 'notifications', icon: 'notifications-outline', title: t('profile:menuNotifications'), route: '/notifications' as const, color: '#8B5CF6', bgColor: '#F5F3FF' },
            { key: 'faq', icon: 'bulb-outline', title: t('profile:menuFaq'), route: '/faq' as const, color: '#CA8A04', bgColor: '#FEFCE8' },
            { key: 'subscription', icon: 'star-outline', title: t('profile:menuSubscription'), route: '/(tabs)/subscription' as const, color: '#DC2626', bgColor: '#FEF2F2' },
            { key: 'bug', icon: 'bug-outline', title: t('profile:menuBug'), route: null, color: '#EA580C', bgColor: '#FFF7ED' },
          ].map((item, index, arr) => (
            <Pressable
              key={item.key}
              onPress={() => { if (item.onPress) { item.onPress(); } else if (item.route) { router.push(item.route); } }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 18,
                borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}>
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: item.bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: colors.text,
                  marginLeft: 14,
                  flexShrink: 1,
                }}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: colors.backgroundElement, borderRadius: 20, overflow: 'hidden' }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 16,
              paddingHorizontal: 18,
            }}>
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: colors.dangerBg,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </View>
              <Text style={{
                fontSize: 15,
                fontWeight: '500',
                color: colors.danger,
                marginLeft: 14,
                flexShrink: 1,
              }}>
                {loggingOut ? t('profile:loggingOut') : t('profile:logout')}
              </Text>
            </View>
          </Pressable>
        </View>

      </ScrollView>

      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 }} onPress={() => setShowLangModal(false)}>
          <Pressable style={{ backgroundColor: colors.backgroundElement, borderRadius: 24, width: '100%', maxWidth: 400, padding: 24 }} onPress={e => e.stopPropagation()}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{t('language:changeTitle')}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{t('language:currentLanguage')}: {LANGUAGES[language].flag} {LANGUAGES[language].label}</Text>
            </View>
            {LANG_LIST.map(({ code, flag }) => {
              const lang = LANGUAGES[code];
              const isActive = language === code;
              return (
                <Pressable
                  key={code}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: isActive ? colors.warningBg : 'transparent',
                    marginBottom: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => handleLanguageChange(code)}
                >
                  <Text style={{ fontSize: 28, marginRight: 12 }}>{flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{lang.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{lang.nativeLabel}</Text>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowLangModal(false)}
              style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>{t('common:close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
