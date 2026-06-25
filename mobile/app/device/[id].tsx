import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { devicesService } from '@/core/api/devicesService';
import type { Device as ApiDevice } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TYPE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  telephone: { label: 'deviceDetail:typePhone', icon: 'phone-portrait-outline' },
  ordinateur: { label: 'deviceDetail:typeComputer', icon: 'laptop-outline' },
  tablette: { label: 'deviceDetail:typeTablet', icon: 'tablet-portrait-outline' },
  tv: { label: 'deviceDetail:typeTv', icon: 'tv-outline' },
  autre: { label: 'deviceDetail:typeOther', icon: 'cube-outline' },
};

function fmt(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

function val(v: any) { return v || '—'; }

function normaliseType(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('phone') || c.includes('téléphone') || c.includes('telephone')) return 'telephone';
  if (c.includes('laptop') || c.includes('ordinateur')) return 'ordinateur';
  if (c.includes('tablet') || c.includes('tablette')) return 'tablette';
  if (c.includes('tv')) return 'tv';
  return 'autre';
}

function normalise(d: ApiDevice | null, t: (key: string) => string) {
  if (!d) return null;
  return {
    id: d.id || '',
    nom: d.model || d.modele || d.nom || t('deviceDetail:title'),
    type: normaliseType(d.category || d.type || ''),
    marque: d.brand || d.marque || '',
    modele: d.model || d.modele || '',
    serial: d.serial_number_imei || d.serial_number || d.imei || '',
    couleur: d.color || d.couleur || '',
    dateAchat: d.purchase_date || '',
    garantie: d.garantie_end || '',
    prix: d.purchase_value || 0,
    lieu: d.where_buy || '',
    assurance: d.assurance || 'non',
    notes: d.notes || '',
    is_lost: ['LOST', 'STOLEN', 'VOLE', 'PERDU'].includes((d.status || '').toUpperCase()),
    status: d.status || 'SAFE',
    photos: Array.isArray(d.photos) ? d.photos : [],
  };
}

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const [device, setDevice] = useState<ReturnType<typeof normalise>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDevice = useCallback(async () => {
    if (!id) { setError(t('deviceDetail:noIdentifier')); setLoading(false); return; }
    try {
      const res = await devicesService.getById(id);
      if (res.success && res.data) {
        setDevice(normalise(res.data, t));
      } else {
        setError(t('deviceDetail:notFound'));
      }
    } catch {
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDevice(); }, [fetchDevice]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !device) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <View style={[styles.errorIconBox, { backgroundColor: colors.dangerBg }]}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>{t('common:oops')}</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error || t('deviceDetail:detailLoadError')}</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtnFull, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnFullText}>{t('common:back')}</Text>
        </Pressable>
      </View>
    );
  }

  const d = device;
  const meta = TYPE_META[d.type] || TYPE_META.autre;
  const deviceName = d.nom;
  const brand = d.marque;
  const model = d.modele;
  const serial = d.serial;
  const color = d.couleur;
  const purchaseDate = d.dateAchat;
  const warrantyEnd = d.garantie;
  const expired = warrantyEnd ? new Date(warrantyEnd) < new Date() : false;
  const price = d.prix;
  const location = d.lieu;
  const notes = d.notes;
  const isLost = d.is_lost;
  const warrantyStatus = d.status;
  const photos = d.photos;
  const warranty = d.assurance;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.hero}>
          {photos.length > 0 ? (
            <Image source={{ uri: photos[0] }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.surface2 }]}>
              <Ionicons name={meta.icon} size={64} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.heroOverlay}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
            </Pressable>
            {isLost && (
              <View style={[styles.lostBadge, { backgroundColor: colors.danger }]}>
                <Ionicons name="alert" size={12} color={colors.onPrimary} />
                <Text style={styles.lostBadgeText}>{warrantyStatus === 'STOLEN' ? t('deviceDetail:stolen') : t('deviceDetail:lost')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={[styles.typePill, { backgroundColor: colors.surface2 }]}>
              <Ionicons name={meta.icon} size={16} color={colors.text} />
              <Text style={[styles.typePillText, { color: colors.text }]}>{t(meta.label)}</Text>
            </View>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{deviceName}</Text>
          <Text style={styles.subtitle}>{brand}{model ? ` ${model}` : ''}</Text>

          <View style={styles.quickGrid}>
            <QuickCard icon="barcode-outline" label={t('deviceDetail:serieImei')} value={val(serial)} color={colors.primary} />
            <QuickCard icon="color-palette-outline" label={t('deviceDetail:color')} value={val(color)} color={colors.purple} />
            <QuickCard icon="wallet-outline" label={t('deviceDetail:price')} value={price ? `${Number(price).toLocaleString('fr')} F` : '—'} color={colors.success} />
            <QuickCard icon="shield-checkmark-outline" label={t('deviceDetail:insurance')} value={warranty === 'oui' ? t('common:yes') : t('common:no')} color={warranty === 'oui' ? colors.success : colors.tabInactive} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('deviceDetail:info')}</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Row icon="barcode-outline" label={t('deviceDetail:serialNumber')} value={val(serial)} color={colors.warning} />
            <Row icon="color-palette-outline" label={t('deviceDetail:color')} value={val(color)} color={colors.purple} />
            <Row icon="calendar-outline" label={t('deviceDetail:purchaseDate')} value={fmt(purchaseDate)} color={colors.info} />
            <Row icon="calendar-outline" label={t('deviceDetail:warrantyEnd')} value={fmt(warrantyEnd)} color={expired ? colors.danger : colors.success} extra={expired ? t('deviceDetail:expired') : undefined} />
            <Row icon="wallet-outline" label={t('deviceDetail:purchasePrice')} value={price ? `${Number(price).toLocaleString('fr')} FCFA` : '—'} color={colors.success} />
            <Row icon="location-outline" label={t('deviceDetail:purchasePlace')} value={val(location)} color={colors.warning} />
            <Row icon="document-text-outline" label={t('deviceDetail:notes')} value={val(notes)} color={colors.textSecondary} />
          </View>

          {photos.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('deviceDetail:photos')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.thumbPhoto} />
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.actions}>
            {!isLost ? (
              <Pressable style={[styles.dangerBtn, { backgroundColor: colors.danger }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.dangerBtnText}>{t('deviceDetail:reportLost')}</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.successBtn, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.successBtnText}>{t('deviceDetail:reportFound')}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.back()} style={styles.ghostBtn}>
              <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>{t('common:back')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.quickCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={[styles.quickValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Row({ icon, label, value, color, extra }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; extra?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[rowStyles.iconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={rowStyles.textCol}>
        <Text style={[rowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[rowStyles.value, { color: colors.text }]}>{value}</Text>
          {extra && <Text style={[rowStyles.extra, { color }]}>{extra}</Text>}
        </View>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  extra: { fontSize: 11, fontWeight: '700' },
});

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  backBtnFull: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
  backBtnFullText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
  hero: { height: 240, position: 'relative' },
  heroImg: { width: SCREEN_WIDTH, height: 240, resizeMode: 'cover' },
  heroPlaceholder: { width: SCREEN_WIDTH, height: 240, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  lostBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, height: 28 },
  lostBadgeText: { fontSize: 11, fontWeight: '700', color: colors.onPrimary },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  typePillText: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickCard: { width: (SCREEN_WIDTH - 40 - 8) / 2 - 4, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  quickLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  quickValue: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  detailCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 24 },
  photoRow: { marginBottom: 24, gap: 0 },
  thumbPhoto: { width: 120, height: 120, borderRadius: 12, marginRight: 8 },
  actions: { gap: 10, marginTop: 4 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
  successBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  successBtnText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
  ghostBtn: { alignItems: 'center', paddingVertical: 14 },
  ghostBtnText: { fontSize: 14, fontWeight: '600' },
});
