import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/useThemeColors';

type DeclarationStatus = 'SEARCHING' | 'MATCHED' | 'RETURNED' | 'AVAILABLE' | 'CANCELLED' | 'CLAIMED';

interface DeclarationCardProps {
  type: 'LOST' | 'FOUND';
  docType: string;
  status: DeclarationStatus;
  reference: string;
  ownerName?: string;
  date?: string;
  onPress?: () => void;
  onRecuperer?: () => void;
  onRendre?: () => void;
  declarationId?: string;
  hasPotentialMatches?: boolean;
}

export const DeclarationCard: React.FC<DeclarationCardProps> = React.memo(({
  type,
  docType,
  status,
  reference,
  ownerName,
  hasPotentialMatches,
  onPress,
  onRecuperer,
  onRendre,
  declarationId,
}) => {
  const colors = useThemeColors();
  const router = useRouter();
  const { t } = useTranslation();
  const isMatch = status === 'MATCHED' || status === 'RETURNED';
  const colorKey = isMatch ? 'green' : (type === 'LOST' ? (hasPotentialMatches ? 'orange' : 'red') : 'blue');

  // Build palettes dynamically from theme colors so dark mode swaps cleanly.
  const PALETTES: Record<string, { border: string; bg: string; text: string; light: string }> = {
    red: { border: colors.danger, bg: colors.dangerBg, text: colors.danger, light: colors.dangerBg },
    orange: { border: colors.warning, bg: colors.warningBg, text: colors.warning, light: colors.warningBg },
    green: { border: colors.success, bg: colors.successBg, text: colors.success, light: colors.successBg },
    blue: { border: colors.info, bg: colors.infoBg, text: colors.info, light: colors.infoBg },
  };
  const palette = PALETTES[colorKey] || PALETTES.red;

  // Détermination de l'étape actuelle (1 à 4)
  let currentStep = 1;
  if (status === 'SEARCHING' || status === 'AVAILABLE') currentStep = 2;
  if (status === 'MATCHED') currentStep = 3;
  if (status === 'RETURNED' || status === 'CLAIMED') currentStep = 4;

  const steps = t(
    type === 'LOST' ? 'declarations:stepsLost' : 'declarations:stepsFound',
    { returnObjects: true }
  ) as string[];

  const headerTitle = isMatch
    ? t('declarations:matchedTitle')
    : (type === 'LOST' ? t('declarations:lostTitle') : t('declarations:foundTitle'));

  const statusLabel = t(`declarations:${status.toLowerCase()}`);

  return (
    <TouchableOpacity
      style={{
        borderWidth: 2,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderColor: palette.border,
        backgroundColor: colors.backgroundElement,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        backgroundColor: palette.bg,
        borderBottomColor: palette.light,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Ionicons
            name={isMatch ? "checkmark-circle" : (type === 'LOST' ? "warning" : "hand-left")}
            size={16}
            color={palette.text}
          />
          <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>
            {headerTitle}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: palette.text }}>
          <Text style={{ color: colors.onPrimary, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }}>{statusLabel}</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* Doc Info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.bg,
          }}>
            <FontAwesome5 name={getIconName(docType)} size={20} color={palette.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>{docType} — {ownerName || t('declarations:unknown')}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{t('declarations:reference')}{reference}</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={{ marginTop: 8 }}>
          <View style={{ position: 'absolute', top: 10, left: 20, right: 20, height: 2 }}>
             <View style={{ height: 2, width: '100%', backgroundColor: palette.light }} />
             <View style={{
               height: 2,
               position: 'absolute',
               left: 0,
               backgroundColor: palette.border,
               width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
             }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {steps.map((step, i) => {
              const isActive = i <= currentStep - 1;
              const isCurrent = i === currentStep - 1;
              return (
                <View key={i} style={{ alignItems: 'center', width: 60 }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                    zIndex: 1,
                    backgroundColor: isActive ? palette.border : colors.backgroundElement,
                    borderColor: isActive ? palette.border : palette.light,
                    borderWidth: isCurrent ? 2 : 1,
                  }}>
                    {isActive && <Ionicons name="checkmark" size={10} color={colors.onPrimary} />}
                  </View>
                  <Text style={{
                    fontSize: 9,
                    textAlign: 'center',
                    color: isActive ? palette.text : colors.textSecondary,
                    fontWeight: isCurrent ? 'bold' : 'normal',
                  }}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Match action button */}
        {status === 'MATCHED' && type === 'LOST' && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.success,
              borderRadius: 12,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
            }}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onRecuperer) onRecuperer();
              else if (declarationId) router.push(`/recuperer?id=${declarationId}`);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={18} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontSize: 14, fontWeight: '800' }}>{t('declarations:recover')}</Text>
          </TouchableOpacity>
        )}
        {status === 'MATCHED' && type === 'FOUND' && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.success,
              borderRadius: 12,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
            }}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onRendre) onRendre();
              else if (declarationId) router.push(`/rendre?id=${declarationId}`);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="return-down-back-outline" size={18} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontSize: 14, fontWeight: '800' }}>{t('declarations:return')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const getIconName = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('cni')) return 'id-card';
  if (t.includes('pass')) return 'passport';
  if (t.includes('permis')) return 'car';
  return 'file-alt';
};
