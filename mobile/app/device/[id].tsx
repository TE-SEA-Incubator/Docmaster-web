import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { devicesService } from '@/core/api/devicesService';
import type { Device as ApiDevice } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#F5A64B';

const TYPE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  telephone: { label: 'Téléphone', icon: 'phone-portrait-outline', color: '#3B82F6', bg: '#DBEAFE' },
  ordinateur: { label: 'Ordinateur', icon: 'laptop-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  tablette: { label: 'Tablette', icon: 'tablet-portrait-outline', color: '#10B981', bg: '#D1FAE5' },
  tv: { label: 'TV', icon: 'tv-outline', color: '#F59E0B', bg: '#FEF3C7' },
  autre: { label: 'Autre', icon: 'cube-outline', color: '#6B7280', bg: '#F3F4F6' },
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

function normalise(d: ApiDevice | null) {
  if (!d) return null;
  return {
    id: d.id || '',
    nom: d.model || d.modele || d.nom || 'Appareil',
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
  const insets = useSafeAreaInsets();
  const [device, setDevice] = useState<ReturnType<typeof normalise>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDevice = useCallback(async () => {
    if (!id) { setError('Aucun identifiant'); setLoading(false); return; }
    try {
      const res = await devicesService.getById(id);
      if (res.success && res.data) {
        setDevice(normalise(res.data));
      } else {
        setError('Appareil introuvable');
      }
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger les informations');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDevice(); }, [fetchDevice]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (error || !device) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 }}>Oups !</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>{error || 'Impossible de charger les détails de cet appareil.'}</Text>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 14, paddingHorizontal: 32, backgroundColor: PRIMARY, borderRadius: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Retour</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.hero}>
          {photos.length > 0 ? (
            <Image source={{ uri: photos[0] }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={64} color={meta.color} />
            </View>
          )}
          <View style={styles.heroOverlay}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            {isLost && (
              <View style={styles.lostBadge}>
                <Ionicons name="alert" size={12} color="#FFFFFF" />
                <Text style={styles.lostBadgeText}>{warrantyStatus === 'STOLEN' ? 'Volé' : 'Perdu'}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text style={[styles.typePillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <Text style={styles.name}>{deviceName}</Text>
          <Text style={styles.subtitle}>{brand}{model ? ` ${model}` : ''}</Text>

          <View style={styles.quickGrid}>
            <View style={styles.quickCard}>
              <Ionicons name="barcode-outline" size={18} color={PRIMARY} />
              <Text style={styles.quickLabel}>Série/IMEI</Text>
              <Text style={styles.quickValue} numberOfLines={1}>{val(serial)}</Text>
            </View>
            <View style={styles.quickCard}>
              <Ionicons name="color-palette-outline" size={18} color="#7C3AED" />
              <Text style={styles.quickLabel}>Couleur</Text>
              <Text style={styles.quickValue}>{val(color)}</Text>
            </View>
            <View style={styles.quickCard}>
              <Ionicons name="wallet-outline" size={18} color="#059669" />
              <Text style={styles.quickLabel}>Prix</Text>
              <Text style={styles.quickValue}>{price ? `${Number(price).toLocaleString('fr')} F` : '—'}</Text>
            </View>
            <View style={styles.quickCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={warranty === 'oui' ? '#059669' : '#9CA3AF'} />
              <Text style={styles.quickLabel}>Assurance</Text>
              <Text style={styles.quickValue}>{warranty === 'oui' ? 'Oui' : 'Non'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.detailCard}>
            <Row icon="barcode-outline" label="N° série / IMEI" value={val(serial)} color="#D97706" />
            <Row icon="color-palette-outline" label="Couleur" value={val(color)} color="#7C3AED" />
            <Row icon="calendar-outline" label="Date d'achat" value={fmt(purchaseDate)} color="#2563EB" />
            <Row icon="calendar-outline" label="Fin garantie" value={fmt(warrantyEnd)} color={expired ? '#EF4444' : '#059669'} extra={expired ? 'Expirée' : undefined} />
            <Row icon="wallet-outline" label="Prix d'achat" value={price ? `${Number(price).toLocaleString('fr')} FCFA` : '—'} color="#059669" />
            <Row icon="location-outline" label="Lieu d'achat" value={val(location)} color="#D97706" />
            <Row icon="document-text-outline" label="Notes" value={val(notes)} color="#6B7280" />
          </View>

          {photos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.thumbPhoto} />
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.actions}>
            {!isLost ? (
              <Pressable style={styles.dangerBtn}>
                <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.dangerBtnText}>Signaler perdu / volé</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.successBtn}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.successBtnText}>Marquer comme retrouvé</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.back()} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>Retour</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, color, extra }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; extra?: string;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={rowStyles.textCol}>
        <Text style={rowStyles.label}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={rowStyles.value}>{value}</Text>
          {extra && <Text style={[rowStyles.extra, { color }]}>{extra}</Text>}
        </View>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 2 },
  extra: { fontSize: 11, fontWeight: '700' },
});

const styles = StyleSheet.create({
  hero: { height: 240, position: 'relative' },
  heroImg: { width: SCREEN_WIDTH, height: 240, resizeMode: 'cover' },
  heroPlaceholder: { width: SCREEN_WIDTH, height: 240, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  lostBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, height: 28 },
  lostBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  typePillText: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickCard: { width: (SCREEN_WIDTH - 40 - 8) / 2 - 4, backgroundColor: '#FAFAFA', borderRadius: 14, borderWidth: 1, borderColor: '#F0F0F0', padding: 14, gap: 4 },
  quickLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', marginTop: 2 },
  quickValue: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, marginTop: 4 },
  detailCard: { backgroundColor: '#FAFAFA', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', paddingHorizontal: 16, marginBottom: 24 },
  photoRow: { marginBottom: 24, gap: 0 },
  thumbPhoto: { width: 120, height: 120, borderRadius: 12, marginRight: 8 },
  actions: { gap: 10, marginTop: 4 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#EF4444' },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  successBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#16A34A' },
  successBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  ghostBtn: { alignItems: 'center', paddingVertical: 14 },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});
