import React from 'react';
import { View, Pressable, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export const PRIMARY = '#F5A64B';
const DEEP_GREEN = '#1E3A2F';
const LOST_RED = '#DC2626';

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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLost: {
    borderColor: '#FECACA',
  },
  photoWrap: {
    height: 96,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 96,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  lostBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  lostBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  body: {
    padding: 10,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metaIcon: {
    color: '#C4BAB0',
  },
  metaText: {
    fontSize: 10,
    color: '#9CA3AF',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: DEEP_GREEN,
  },
  guaranteeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  guaranteeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

function formatPrice(n: number) {
  if (!n) return '—';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const TYPE_META_KEYS: Record<DeviceType, { labelKey: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  telephone: { labelKey: 'devices:typeTelephone', icon: 'phone-portrait-outline', color: '#3B82F6', bg: '#DBEAFE' },
  ordinateur: { labelKey: 'devices:typeOrdinateur', icon: 'laptop-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  tablette: { labelKey: 'devices:typeTablette', icon: 'tablet-portrait-outline', color: '#10B981', bg: '#D1FAE5' },
  tv: { labelKey: 'devices:typeTv', icon: 'tv-outline', color: '#F59E0B', bg: '#FEF3C7' },
  autre: { labelKey: 'devices:typeAutre', icon: 'cube-outline', color: '#6B7280', bg: '#F3F4F6' },
};

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
  const { t } = useTranslation();
  const meta = TYPE_META_KEYS[device.type] || TYPE_META_KEYS.autre;
  const hasPhoto = device.photo || device.photo_face || device.photo_facture;
  const photoUri = device.photo || device.photo_face || device.photo_facture;
  const expired = device.garantie ? new Date(device.garantie) < new Date() : false;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <View style={[styles.card, device.is_lost && styles.cardLost]}>
        {/* Photo */}
        <View style={[styles.photoWrap, !hasPhoto && { backgroundColor: meta.bg }]}>
          {hasPhoto ? (
            <Image source={{ uri: photoUri! }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name={meta.icon} size={32} color={meta.color} />
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{t(meta.labelKey)}</Text>
          </View>
          {device.is_lost && (
            <View style={styles.lostBadge}>
              <Text style={styles.lostBadgeText}>{t('devices:lostStatus')}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{device.nom}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{device.marque}{device.modele ? ` ${device.modele}` : ''}</Text>
          {(device.serial) && (
            <View style={styles.metaRow}>
              <Ionicons name="barcode-outline" size={11} style={styles.metaIcon} />
              <Text style={styles.metaText} numberOfLines={1}>•••{device.serial.slice(-6)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.price}>
            {device.prix ? `${formatPrice(device.prix)} ${t('devices:currency')}` : '—'}
          </Text>
          {device.garantie && (
            <View style={[styles.guaranteeBadge, { backgroundColor: expired ? '#FEF2F2' : '#F0FDF4' }]}>
              <Ionicons name={expired ? 'close-circle' : 'checkmark-circle'} size={10} color={expired ? '#EF4444' : '#16A34A'} />
              <Text style={[styles.guaranteeText, { color: expired ? '#EF4444' : '#16A34A' }]}>
                {expired ? t('devices:expired') : t('devices:warranty')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
