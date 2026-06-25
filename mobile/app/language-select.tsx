import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useLanguageStore } from '@/core/store/useLanguageStore';
import { LANGUAGES, type LanguageCode } from '@/i18n/config';
import { useThemeColors } from '@/hooks/useThemeColors';

const LANG_LIST: { code: LanguageCode; short: string }[] = [
  { code: 'fr', short: 'FR' },
  { code: 'en', short: 'EN' },
  { code: 'ar', short: 'AR' },
];

export default function LanguageSelectScreen() {
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const colors = useThemeColors();
  const [selected, setSelected] = useState<LanguageCode | null>(null);

  const handleSelect = async (code: LanguageCode) => {
    setSelected(code);
    await setLanguage(code);
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>

        {/* App name */}
        <View style={{ alignItems: 'center', marginBottom: 56 }}>
          <Text style={{
            fontSize: 38,
            fontWeight: '800',
            color: colors.tint,
            letterSpacing: -1,
          }}>
            Doc<Text style={{ color: colors.text }}>Master</Text>
          </Text>
          <View style={{ width: 32, height: 3, backgroundColor: colors.tint, borderRadius: 2, marginTop: 8 }} />
        </View>

        {/* Heading */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{
            fontSize: 22,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 6,
          }}>
            Choisissez votre langue
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 21 }}>
            Sélectionnez la langue dans laquelle vous souhaitez utiliser l'application.
          </Text>
        </View>

        {/* Language options */}
        <View style={{ gap: 10 }}>
          {LANG_LIST.map(({ code, short }) => {
            const lang = LANGUAGES[code];
            const isSelected = selected === code;
            return (
              <Pressable
                key={code}
                onPress={() => handleSelect(code)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.tint : colors.border,
                  backgroundColor: isSelected ? colors.backgroundSelected : colors.backgroundElement,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {/* Short code badge */}
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: isSelected ? colors.tint : colors.background,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.tint : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isSelected ? '#fff' : colors.textSecondary,
                    letterSpacing: 0.5,
                  }}>
                    {short}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                    {lang.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                    {lang.nativeLabel}
                  </Text>
                </View>

                {/* Selection indicator */}
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.tint : colors.border,
                  backgroundColor: isSelected ? colors.tint : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isSelected && (
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#fff',
                    }} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
