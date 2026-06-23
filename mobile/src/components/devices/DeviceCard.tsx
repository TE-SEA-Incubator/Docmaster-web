import React from 'react';
import { View, Pressable, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/useThemeColors';

export type DeviceType = 'telephone' | 'ordinateur' | 'tablette' | 'tv' | 'autre';

export type Device = {
  id: string;
  nom: string;
  type: DeviceType;
  marque: string;
  modele: string;
  serial: string;
  couleur: string;
  dateAchat: string;
  garantie: string;
  prix: number;
  lieu: string;
  assurance: string;
  notes: string;
  is_lost: boolean;
  status: string;
  photo: string | null;
  photo_facture?: string | null;
  photo_face?: string | null;
  photo_serial?: string | null;
};

function formatPrice(n: number) {
  if (!n) return '—';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const DeviceCard = React.memo(function DeviceCard({
  device,
  index,
  onPress,
  onReportLost,
  onReportFound,
}: {
  device: Device;
  index: number;
  onPress: () => void;
  onReportLost?: () => void;
  onReportFound?: () => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const TYPE_META_KEYS: Record<DeviceType, { labelKey: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
    telephone: { labelKey: 'devices:typeTelephone', icon: 'phone-portrait-outline', color: colors.info, bg: colors.infoBg },
    ordinateur: { labelKey: 'devices:typeOrdinateur', icon: 'laptop-outline', color: colors.purple, bg: colors.purpleBg },
    tablette: { labelKey: 'devices:typeTablette', icon: 'tablet-portrait-outline', color: colors.success, bg: colors.successBg },
    tv: { labelKey: 'devices:typeTv', icon: 'tv-outline', color: colors.warning, bg: colors.warningBg },
    autre: { labelKey: 'devices:typeAutre', icon: 'cube-outline', color: colors.textSecondary, bg: colors.backgroundSelected },
  };

  const meta = TYPE_META_KEYS[device.type] || TYPE_META_KEYS.autre;
  const hasPhoto = device.photo || device.photo_face || device.photo_facture;
  const photoUri = device.photo || device.photo_face || device.photo_facture;
  const expired = device.garantie ? new Date(device.garantie) < new Date() : false;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 4,
          backgroundColor: colors.backgroundElement,
          borderWidth: 1,
          borderColor: device.is_lost ? colors.dangerBg : colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Photo */}
        <View
          style={{
            height: 96,
            backgroundColor: colors.backgroundSelected,
            position: 'relative',
          }}
        >
          {hasPhoto ? (
            <Image source={{ uri: photoUri! }} style={{ width: '100%', height: 96, resizeMode: 'cover' }} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={meta.icon} size={32} color={meta.color} />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: meta.bg,
            }}
          >
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: meta.color }}>{t(meta.labelKey)}</Text>
          </View>
          {device.is_lost && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: colors.danger,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: colors.backgroundElement, fontSize: 8, fontWeight: '800' }}>{t('devices:lostStatus')}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ padding: 10, gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{device.nom}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{device.marque}{device.modele ? ` ${device.modele}` : ''}</Text>
          {(device.serial) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="barcode-outline" size={11} color={colors.border} />
              <Text style={{ fontSize: 10, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>•••{device.serial.slice(-6)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundSelected,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.greenDark }}>
            {device.prix ? `${formatPrice(device.prix)} ${t('devices:currency')}` : '—'}
          </Text>
          {device.garantie && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 99,
                backgroundColor: expired ? colors.dangerBg : colors.successBg,
              }}
            >
              <Ionicons name={expired ? 'close-circle' : 'checkmark-circle'} size={10} color={expired ? colors.danger : colors.success} />
              <Text style={{ fontSize: 9, fontWeight: '700', color: expired ? colors.danger : colors.success }}>
                {expired ? t('devices:expired') : t('devices:warranty')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
