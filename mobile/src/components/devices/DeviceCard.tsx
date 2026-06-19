import React, { useMemo } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PRIMARY = '#F5A64B';
const DEEP_GREEN = '#1E3A2F';
const CREAM = '#F4EFE6';
const INK = '#1A1A1A';
const LOST_RED = '#B3432F';
const SAFE_GREEN = '#2F6F4E';

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
};

const TYPE_META: Record<DeviceType, { label: string; icon: keyof typeof Ionicons.glyphMap; mono: string }> = {
  telephone: { label: 'Téléphone', icon: 'phone-portrait-outline', mono: 'IMEI' },
  ordinateur: { label: 'Ordinateur', icon: 'laptop-outline', mono: 'S/N' },
  tablette: { label: 'Tablette', icon: 'tablet-portrait-outline', mono: 'S/N' },
  tv: { label: 'TV', icon: 'tv-outline', mono: 'S/N' },
  autre: { label: 'Autre', icon: 'cube-outline', mono: 'REF' },
};

// Format "1 200 000" style FCFA grouping
function formatPrice(n: number) {
  if (!n) return '—';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const styles = StyleSheet.create({
  pressable: { width: '100%', height: '100%' },
  container: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
  },
  containerFirst: {
    backgroundColor: DEEP_GREEN,
  },
  containerDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE3D6',
  },
  // subtle corner texture stripes to evoke a registry / dossier card
  cornerStripe: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    borderTopRightRadius: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  body: { marginTop: 12 },
  title: { fontWeight: '800', letterSpacing: -0.2 },
  titleFirst: { fontSize: 19, color: '#FFFFFF' },
  titleDefault: { fontSize: 14.5, color: INK },
  subtitle: { fontSize: 11.5, marginTop: 3, fontWeight: '500' },
  subtitleFirst: { color: 'rgba(244,239,230,0.65)' },
  subtitleDefault: { color: '#8A8275' },

  serialRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 },
  serialDot: { width: 3, height: 3, borderRadius: 1.5 },
  serialText: { fontSize: 10, fontVariant: ['tabular-nums'] },

  footer: {
    marginTop: 'auto',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceBlock: {},
  priceLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  price: { fontWeight: '800', letterSpacing: -0.3 },
  priceFirst: { fontSize: 20, color: '#FFFFFF' },
  priceDefault: { fontSize: 16.5, color: INK },
  currency: { fontSize: 10.5, fontWeight: '700' },
  currencyFirst: { color: 'rgba(244,239,230,0.75)' },
  currencyDefault: { color: '#A39A8B' },

  // Wax-seal style status mark, replaces the generic pill badge
  seal: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  // Footer action cluster: small wax-seal button + status text
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

function StatusSeal({ isLost, onFirst }: { isLost: boolean; onFirst: boolean }) {
  const color = isLost ? LOST_RED : SAFE_GREEN;
  const borderTint = onFirst ? 'rgba(255,255,255,0.18)' : `${color}33`;
  const fill = onFirst ? 'rgba(255,255,255,0.06)' : `${color}14`;
  return (
    <View style={[styles.seal, { borderColor: borderTint, backgroundColor: fill }]}>
      <Ionicons name={isLost ? 'alert' : 'shield-checkmark'} size={14} color={onFirst ? '#FFFFFF' : color} />
    </View>
  );
}

function DeviceCardInner({
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
  const meta = TYPE_META[device.type] || TYPE_META.autre;
  const isFirst = index === 0;

  const containerStyle = useMemo(
    () => [styles.container, isFirst ? styles.containerFirst : styles.containerDefault],
    [isFirst]
  );

  const serialTail = device.serial ? device.serial.slice(-6) : null;

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      {({ pressed }) => (
        <View style={[containerStyle, { opacity: pressed ? 0.92 : 1 }]}>
          {/* corner texture: faint diagonal hairline, registry-card feel */}
          <View
            style={[
              styles.cornerStripe,
              {
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderColor: isFirst ? 'rgba(245,166,75,0.18)' : 'rgba(30,58,47,0.06)',
                margin: 8,
                borderRadius: 12,
              },
            ]}
          />

          <View style={styles.header}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFirst ? 'rgba(245,166,75,0.16)' : 'rgba(30,58,47,0.06)' },
              ]}
            >
              <Ionicons name={meta.icon} size={18} color={isFirst ? PRIMARY : DEEP_GREEN} />
            </View>
            <StatusSeal isLost={device.is_lost} onFirst={isFirst} />
          </View>

          <View style={styles.body}>
            <Text
              style={[styles.eyebrow, { color: isFirst ? PRIMARY : '#B98A4A' }]}
              numberOfLines={1}
            >
              {meta.label}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.title, isFirst ? styles.titleFirst : styles.titleDefault]}
            >
              {device.nom}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.subtitle, isFirst ? styles.subtitleFirst : styles.subtitleDefault]}
            >
              {device.marque}{device.modele ? ` · ${device.modele}` : ''}
            </Text>

            {serialTail && (
              <View style={styles.serialRow}>
                <View
                  style={[
                    styles.serialDot,
                    { backgroundColor: isFirst ? 'rgba(244,239,230,0.4)' : '#C9C0AE' },
                  ]}
                />
                <Text
                  style={[
                    styles.serialText,
                    { color: isFirst ? 'rgba(244,239,230,0.55)' : '#A39A8B' },
                  ]}
                >
                  {meta.mono} •••{serialTail}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.priceBlock}>
              <Text
                style={[
                  styles.priceLabel,
                  { color: isFirst ? 'rgba(244,239,230,0.5)' : '#C9C0AE' },
                ]}
              >
                Valeur déclarée
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, isFirst ? styles.priceFirst : styles.priceDefault]}>
                  {formatPrice(device.prix)}
                </Text>
                <Text style={[styles.currency, isFirst ? styles.currencyFirst : styles.currencyDefault]}>
                  FCFA
                </Text>
              </View>
            </View>

            <View style={styles.footerActions}>
              {!device.is_lost && onReportLost && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onReportLost();
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Signaler perdu ou volé"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isFirst ? 'rgba(244,239,230,0.12)' : '#FEF2F2',
                      borderColor: isFirst ? 'rgba(244,239,230,0.22)' : '#FECACA',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="warning-outline" size={13} color={isFirst ? '#FFFFFF' : LOST_RED} />
                </Pressable>
              )}
              {device.is_lost && onReportFound && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onReportFound();
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Marquer comme retrouvé"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isFirst ? 'rgba(244,239,230,0.12)' : '#F0FDF4',
                      borderColor: isFirst ? 'rgba(244,239,230,0.22)' : '#BBF7D0',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={13} color={isFirst ? '#FFFFFF' : SAFE_GREEN} />
                </Pressable>
              )}

              <Text
                style={[
                  styles.eyebrow,
                  {
                    color: device.is_lost ? LOST_RED : isFirst ? 'rgba(244,239,230,0.5)' : '#A39A8B',
                    fontSize: 9,
                  },
                ]}
              >
                {device.is_lost ? 'Signalé' : 'OK'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export const DeviceCard = React.memo(DeviceCardInner);