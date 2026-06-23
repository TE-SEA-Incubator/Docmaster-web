import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/core/store/useLanguageStore';
import { LANGUAGES, type LanguageCode } from '@/i18n/config';

const GREEN_DARK = '#1E3A2F';
const PRIMARY = '#F5A64B';

const LANG_LIST: { code: LanguageCode; flag: string }[] = [
  { code: 'fr', flag: '🇫🇷' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'ar', flag: '🇸🇦' },
];

export default function LanguageSelectScreen() {
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const handleSelect = async (code: LanguageCode) => {
    await setLanguage(code);
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="language-outline" size={48} color={PRIMARY} />
        </View>
        <Text style={styles.title}>Choisissez votre langue</Text>
        <Text style={styles.subtitle}>Sélectionnez la langue de votre choix</Text>

        <View style={styles.cardContainer}>
          {LANG_LIST.map(({ code, flag }) => {
            const lang = LANGUAGES[code];
            return (
              <Pressable
                key={code}
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => handleSelect(code)}
              >
                <Text style={styles.flag}>{flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>{lang.label}</Text>
                  <Text style={styles.langNative}>{lang.nativeLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EFE6',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  cardContainer: {
    width: '100%',
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  flag: {
    fontSize: 36,
    marginRight: 14,
  },
  langName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  langNative: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
