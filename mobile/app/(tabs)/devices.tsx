import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView, View, Pressable, ActivityIndicator, RefreshControl, Text, Image,
  Modal, TextInput, Alert, Platform, ToastAndroid, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { BottomTabInset } from '@/constants/theme';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { DeviceCard, PRIMARY, type Device, type DeviceType } from '@/components/devices/DeviceCard';
import { useDevices } from '@/core/hooks/useDevices';
import { DevicesSkeleton } from '@/components/Skeletons';
import { DatePickerInput } from '@/components/declarations/wizard/DatePickerInput';

const SCREEN = Dimensions.get('window');

const TYPE_META: Record<DeviceType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  telephone: { label: 'Téléphone', icon: 'phone-portrait-outline', color: '#3B82F6', bg: '#EFF6FF' },
  ordinateur: { label: 'Ordinateur', icon: 'laptop-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  tablette: { label: 'Tablette', icon: 'tablet-portrait-outline', color: '#10B981', bg: '#ECFDF5' },
  tv: { label: 'TV', icon: 'tv-outline', color: '#F59E0B', bg: '#FFFBEB' },
  autre: { label: 'Autre', icon: 'cube-outline', color: '#6B7280', bg: '#F9FAFB' },
};

const FILTERS: { key: string; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'telephone', label: 'Téléphones', icon: 'phone-portrait-outline' },
  { key: 'ordinateur', label: 'Ordinateurs', icon: 'laptop-outline' },
  { key: 'tablette', label: 'Tablettes', icon: 'tablet-portrait-outline' },
  { key: 'autre', label: 'Autres', icon: 'cube-outline' },
];

function getDeviceType(category: string): DeviceType {
  const c = (category || '').toLowerCase();
  if (c.includes('phone') || c.includes('téléphone') || c.includes('telephone')) return 'telephone';
  if (c.includes('laptop') || c.includes('ordinateur')) return 'ordinateur';
  if (c.includes('tablet') || c.includes('tablette')) return 'tablette';
  if (c.includes('tv')) return 'tv';
  return 'autre';
}

const EMPTY_FORM: Omit<Device, 'id' | 'is_lost' | 'status' | 'photo'> & { photo_facture: string | null; photo_face: string | null; photo_serial: string | null; } = {
  nom: '', type: 'telephone', marque: '', modele: '', serial: '',
  couleur: '', dateAchat: '', garantie: '', prix: 0, lieu: '',
  assurance: 'non', notes: '',
  photo_facture: null,
  photo_face: null,
  photo_serial: null,
};

const GAP = 12;
const COLS = 2;
const PAD = 20;
const CARD_W = (SCREEN.width - PAD * 2 - GAP) / 2;
const CARD_H = 140;
const TALL_W = SCREEN.width - PAD * 2;
const TALL_H = 280;

function formatDate(s: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF0DC', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={icon} size={14} color="#D98A30" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#1A1A1A', lineHeight: 20 }}>{value}</Text>
      </View>
    </View>
  );
}

function DetailContent({ d, onClose, onEdit, onDelete, onReport }: {
  d: Device; onClose: () => void; onEdit: () => void; onDelete: () => void; onReport: () => void;
}) {
  const meta = TYPE_META[d.type] || TYPE_META.autre;
  const expired = d.garantie ? new Date(d.garantie) < new Date() : false;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: d.is_lost ? '#FEF2F2' : meta.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={meta.icon} size={28} color={d.is_lost ? '#EF4444' : meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>{d.nom}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>{d.marque} {d.modele}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={onEdit} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="pencil-outline" size={16} color="#4B5563" />
          </Pressable>
          <Pressable onPress={onDelete} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 20, flexWrap: 'wrap' }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: meta.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: meta.color }}>{meta.label}</Text></View>
        {d.assurance === 'oui' && <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: '#FEF0DC' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#D98A30' }}>Assuré</Text></View>}
        {d.garantie ? <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: expired ? '#FEF2F2' : '#E8F5EE' }}><Text style={{ fontSize: 11, fontWeight: '700', color: expired ? '#EF4444' : '#1E3A2F' }}>{expired ? 'Garantie expirée' : 'Garantie OK'}</Text></View> : null}
        {d.is_lost && <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: '#EF4444' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Signalé {d.status === 'STOLEN' ? 'volé' : 'perdu'}</Text></View>}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Détails</Text>
      <InfoRow icon="barcode-outline" label="N° série / IMEI" value={d.serial} />
      <InfoRow icon="color-palette-outline" label="Couleur" value={d.couleur} />
      <InfoRow icon="calendar-outline" label="Date d'achat" value={d.dateAchat ? formatDate(d.dateAchat) : ''} />
      <InfoRow icon="calendar-outline" label="Fin garantie" value={d.garantie ? formatDate(d.garantie) : ''} />
      <InfoRow icon="wallet-outline" label="Prix" value={d.prix ? d.prix.toLocaleString('fr') + ' FCFA' : ''} />
      <InfoRow icon="location-outline" label="Lieu d'achat" value={d.lieu} />
      <InfoRow icon="document-text-outline" label="Notes" value={d.notes} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        <View style={{ flex: 1 }}><Button title="Fermer" variant="outline" onPress={onClose} /></View>
        <View style={{ flex: 1 }}><Button title={d.is_lost ? 'Retrouvé' : 'Signaler perdu'} variant={d.is_lost ? 'secondary' : 'danger'} onPress={onReport} /></View>
      </View>
    </View>
  );
}

function ReportTypeSelector({ value, onChange }: { value: 'LOST' | 'STOLEN'; onChange: (v: 'LOST' | 'STOLEN') => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {([{ key: 'LOST' as const, label: 'Perdu', icon: 'search-outline' as const },
         { key: 'STOLEN' as const, label: 'Volé', icon: 'lock-closed-outline' as const }] as const).map((opt) => (
        <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
          borderColor: value === opt.key ? '#EF4444' : '#E5E7EB',
          backgroundColor: value === opt.key ? '#FEF2F2' : '#FFFFFF',
        }}>
          <Ionicons name={opt.icon} size={16} color={value === opt.key ? '#EF4444' : '#9CA3AF'} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt.key ? '#991B1B' : '#6B7280' }}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PhotoPicker({ label, uri, onSelect }: { label: string, uri: string | null, onSelect: (uri: string) => void }) {
  // Wraps the camera intent in a safety net: some Android OEM ROMs
  // (Samsung One UI 6+, Xiaomi MIUI 14+, Vivo FunTouch) throw an
  // IllegalStateException from CameraX initialisation when the system
  // camera activity is launched without all prerequisites in place.
  // The result is a hard app crash — so we isolate the call, surface a
  // user-friendly message and automatically open the gallery picker as a
  // graceful fallback. Same defensive wrap around launchImageLibraryAsync
  // for OEM gallery crashes.
  const launchCameraSafely = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'accès à l'appareil photo est nécessaire. Activez-le dans les réglages.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        exif: false,
        // presentationStyle helps on iOS — without it the picker can
        // throw on iPad multi-task.
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });
      if (!result.canceled && result.assets?.[0]) {
        onSelect(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('[PhotoPicker] Camera unavailable, falling back to gallery:', error);
      Alert.alert(
        'Caméra indisponible',
        "L'appareil photo n'a pas pu s'ouvrir sur ce téléphone. Choisissez une photo depuis votre galerie.",
        [
          { text: 'Choisir dans la galerie', onPress: () => { launchLibrarySafely(); } },
          { text: 'Annuler', style: 'cancel' },
        ],
      );
    }
  };

  const launchLibrarySafely = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'accès à la galerie est nécessaire. Activez-le dans les réglages.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 0.7,
        exif: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });
      if (!result.canceled && result.assets?.[0]) {
        onSelect(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('[PhotoPicker] Gallery unavailable:', error);
      Alert.alert(
        'Galerie indisponible',
        "Impossible d'accéder à vos photos. Vérifiez les permissions dans les réglages.",
      );
    }
  };

  const pickImage = () => {
    Alert.alert(
      "Source de l'image",
      "Voulez-vous prendre une photo ou choisir dans la galerie ?",
      [
        { text: 'Prendre une photo', onPress: () => { launchCameraSafely(); } },
        { text: 'Choisir dans la galerie', onPress: () => { launchLibrarySafely(); } },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Pressable onPress={pickImage} style={{ width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: uri ? 'transparent' : '#E0D5C4' }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        ) : (
          <Ionicons name="camera-outline" size={24} color="#C4BAB0" />
        )}
      </Pressable>
      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const {
    devices: cachedDevices,
    isLoading,
    isFetching,
    refresh,
    create,
    update,
    remove,
    reportLost,
    reportFound,
    isCreating,
    isUpdating,
    isReporting,
  } = useDevices();
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDetail, setShowDetail] = useState(false);
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyImei, setVerifyImei] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ status: 'safe' | 'stolen' | 'unknown'; device?: string } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportDeviceId, setReportDeviceId] = useState<string | null>(null);
  const [reportIsFound, setReportIsFound] = useState(false);
  const [reportType, setReportType] = useState<'LOST' | 'STOLEN'>('LOST');
  const [reportPassword, setReportPassword] = useState('');
  const [reportError, setReportError] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Real data only — empty state is rendered when the user has no devices.
  const devices: Device[] = cachedDevices;
  const loading = isLoading && cachedDevices.length === 0;

  const params = useLocalSearchParams<{ openAdd?: string; openVerify?: string }>();
  const openAddConsumed = useRef(false);
  const openVerifyConsumed = useRef(false);

  useEffect(() => {
    if (params.openAdd === 'true' && !openAddConsumed.current) {
      openAddConsumed.current = true;
      openAdd();
      router.replace('/(tabs)/devices');
    }
    if (params.openVerify === 'true' && !openVerifyConsumed.current) {
      openVerifyConsumed.current = true;
      setShowVerify(true);
      router.replace('/(tabs)/devices');
    }
  }, [params.openAdd, params.openVerify]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  const filtered = devices.filter((d) => {
    const matchFilter = currentFilter === 'all' || d.type === currentFilter;
    const q = searchQuery.toLowerCase().trim();
    return !q || matchFilter && (d.nom.toLowerCase().includes(q) || d.marque.toLowerCase().includes(q) || d.modele.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q) || d.lieu.toLowerCase().includes(q));
  });

  const updateForm = (key: string, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));
  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setShowAddModal(true); };
  const openEdit = (d: Device) => {
    setEditingId(d.id);
    setForm({
      nom: d.nom, type: d.type, marque: d.marque, modele: d.modele,
      serial: d.serial, couleur: d.couleur, dateAchat: d.dateAchat,
      garantie: d.garantie, prix: d.prix, lieu: d.lieu,
      assurance: d.assurance, notes: d.notes,
      photo_facture: null, photo_face: null, photo_serial: null,
    });
    setFormErrors({});
    setShowAddModal(true);
  };
  const closeAdd = () => { setShowAddModal(false); setEditingId(null); };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.nom.trim()) errs.nom = 'Requis';
    if (!form.marque.trim()) errs.marque = 'Requis';
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined && !key.startsWith('photo_')) {
         formData.append(key, value as any);
      }
    });

    const appendFile = (fieldName: string, uri: string | null) => {
      if (uri) {
        formData.append(fieldName, {
          uri: uri,
          type: 'image/jpeg',
          name: `${fieldName}.jpg`,
        } as any);
      }
    };

    appendFile('photo_facture', form.photo_facture);
    appendFile('photo_face', form.photo_face);
    appendFile('photo_serial', form.photo_serial);

    const onDone = (error: unknown) => {
      if (error) {
        Alert.alert('Erreur', "Impossible de sauvegarder l'appareil. Réessayez ou vérifiez votre connexion.");
        return;
      }
      closeAdd();
    };

    if (editingId) {
      update({ id: editingId, input: formData }, { onError: onDone, onSuccess: () => onDone(null) });
    } else {
      create(formData, { onError: onDone, onSuccess: () => onDone(null) });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          remove(id, {
            onSuccess: () => setShowDetail(false),
            onError: () => Alert.alert('Erreur', "Suppression impossible pour le moment."),
          });
        },
      },
    ]);
  };

  const openReport = (id: string, isFound: boolean) => { setReportDeviceId(id); setReportIsFound(isFound); setReportType('LOST'); setReportPassword(''); setReportError(false); setShowReport(true); };

  const handleReport = () => {
    if (reportPassword.length < 4) { setReportError(true); return; }
    setConfirming(true);
    const id = reportDeviceId!;
    const finish = (error: unknown) => {
      setConfirming(false);
      if (error) {
        Alert.alert('Erreur', "L'opération a échoué. Réessayez.");
        return;
      }
      setShowReport(false);
      setShowDetail(false);
      const msg = reportIsFound ? 'Appareil marqué comme retrouvé !' : 'Appareil signalé avec succès !';
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Succès', msg);
    };
    if (reportIsFound) {
      reportFound({ id, password: reportPassword }, { onError: finish, onSuccess: () => finish(null) });
    } else {
      reportLost({ id, password: reportPassword, type: reportType }, { onError: finish, onSuccess: () => finish(null) });
    }
  };

  const handleVerify = async () => {
    if (!verifyImei.trim()) { Alert.alert('Erreur', 'Veuillez saisir un IMEI ou numéro de série.'); return; }
    setVerifyLoading(true); setVerifyResult(null);
    try {
      const res = await devicesService.verifyDevice(verifyImei.trim());
      const resultData = res as { success: boolean; data?: { success: boolean; data: Record<string, unknown> } };
      if (res && res.success && resultData.data?.success) { const dev = resultData.data.data; const isReported = dev && (dev as Record<string, unknown>).is_reported; setVerifyResult({ status: isReported ? 'stolen' : 'safe', device: `${(dev as Record<string, unknown>)?.brand || ''} ${(dev as Record<string, unknown>)?.model || ''}`.trim() }); }
      else setVerifyResult({ status: 'unknown' });
    } catch { setVerifyResult({ status: 'unknown' }); } finally { setVerifyLoading(false); }
  };

  if (loading) {
    return <DevicesSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 16 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>Mes appareils</Text>
            <Pressable onPress={() => setShowVerify(true)} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: pressed ? '#F5F5F5' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' })}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Search & Add */}
        <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
            <Ionicons name="search-outline" size={16} color="#C4BAB0" />
            <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#1A1A1A', paddingVertical: 0 }} placeholder="Rechercher..." placeholderTextColor="#C4BAB0" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <Pressable onPress={openAdd} style={({ pressed }) => ({ height: 42, paddingHorizontal: 18, backgroundColor: pressed ? '#E0932F' : PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Ajouter</Text>
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => (
              <Pressable key={f.key} onPress={() => setCurrentFilter(f.key)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: currentFilter === f.key ? '#1A1A1A' : '#F5F5F5' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {f.icon && <Ionicons name={f.icon} size={11} color={currentFilter === f.key ? '#FFFFFF' : '#6B7280'} />}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: currentFilter === f.key ? '#FFFFFF' : '#6B7280' }}>{f.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Grid */}
        <View style={{ marginHorizontal: 20 }}>
          {filtered.length === 0 ? (
            <View style={{ backgroundColor: '#F5F5F5', borderRadius: 20, padding: 40, alignItems: 'center', gap: 12 }}>
              <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="phone-portrait-outline" size={34} color="#9CA3AF" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>
                {devices.length === 0 ? 'Aucun appareil enregistré' : 'Aucun résultat'}
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                {devices.length === 0 ? 'Ajoutez vos appareils pour les gérer.' : 'Essayez de modifier vos filtres.'}
              </Text>
              {devices.length === 0 && (
                <Pressable onPress={openAdd} style={({ pressed }) => ({ marginTop: 10, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: pressed ? '#E0932F' : PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 })}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Ajouter mon premier appareil</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {filtered.map((d, i) => (
                <View
                  key={d.id}
                  style={{
                    width: i === 0 ? TALL_W : CARD_W,
                    height: i === 0 ? TALL_H : CARD_H,
                  }}
                >
                  <DeviceCard
                    device={d}
                    index={i}
                    onPress={() => { setDetailDevice(d); setShowDetail(true); }}
                    onReportLost={() => openReport(d.id, false)}
                    onReportFound={() => openReport(d.id, true)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeAdd}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={closeAdd}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }} onPress={(e) => e.stopPropagation()}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>{editingId ? "Modifier l'appareil" : 'Ajouter un appareil'}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Conservez toutes les infos importantes</Text>
              </View>
              <Pressable onPress={closeAdd} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: '#E0D5C4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Type d'appareil</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
                  {(Object.keys(TYPE_META) as DeviceType[]).map((type) => {
                    const m = TYPE_META[type]; const selected = form.type === type;
                    const color = selected ? m.color : '#374151';
                    const bgColor = selected ? m.bg : '#FFFFFF';
                    const iconBg = selected ? `${m.color}25` : '#F2EBD9';
                    
                    return (
                      <Pressable key={type} onPress={() => updateForm('type', type)} style={{ alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: selected ? m.color : '#E0D5C4', backgroundColor: bgColor, marginRight: 8, minWidth: 90 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={m.icon} size={22} color={m.color} />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: color }}>{m.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <Input label="Nom de l'appareil *" placeholder="Ex: iPhone 15 Pro, MacBook Air M2…" icon="pricetag-outline" value={form.nom} onChangeText={(v) => updateForm('nom', v)} error={formErrors.nom} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Input label="Marque *" placeholder="Ex: Apple, Samsung…" icon="business-outline" value={form.marque} onChangeText={(v) => updateForm('marque', v)} error={formErrors.marque} /></View>
                <View style={{ flex: 1 }}><Input label="Modèle" placeholder="Ex: Galaxy S23" icon="git-branch-outline" value={form.modele} onChangeText={(v) => updateForm('modele', v)} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Input label="N° série / IMEI" placeholder="SN ou IMEI" icon="barcode-outline" value={form.serial} onChangeText={(v) => updateForm('serial', v)} /></View>
                <View style={{ flex: 1 }}><Input label="Couleur" placeholder="Ex: Noir" icon="color-palette-outline" value={form.couleur} onChangeText={(v) => updateForm('couleur', v)} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><DatePickerInput label="Date d'achat" value={form.dateAchat ? new Date(form.dateAchat) : new Date()} onChange={(d) => updateForm('dateAchat', d.toISOString().split('T')[0])} /></View>
                <View style={{ flex: 1 }}><DatePickerInput label="Fin garantie" value={form.garantie ? new Date(form.garantie) : new Date()} onChange={(d) => updateForm('garantie', d.toISOString().split('T')[0])} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Input label="Prix (FCFA)" placeholder="Ex: 850000" icon="wallet-outline" keyboardType="numeric" value={form.prix ? String(form.prix) : ''} onChangeText={(v) => updateForm('prix', v ? Number(v.replace(/[^0-9]/g, '')) : 0)} /></View>
                <View style={{ flex: 1 }}><Input label="Lieu d'achat" placeholder="Ex: Jumia" icon="location-outline" value={form.lieu} onChangeText={(v) => updateForm('lieu', v)} /></View>
              </View>
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 }}>Photos</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <PhotoPicker label="Facture" uri={form.photo_facture} onSelect={(uri) => updateForm('photo_facture', uri)} />
                  <PhotoPicker label="Face" uri={form.photo_face} onSelect={(uri) => updateForm('photo_face', uri)} />
                  <PhotoPicker label="Série" uri={form.photo_serial} onSelect={(uri) => updateForm('photo_serial', uri)} />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 }}>Notes</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {['non', 'oui'].map((v) => (
                    <Pressable key={v} onPress={() => updateForm('assurance', v)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: form.assurance === v ? PRIMARY : '#E0D5C4', backgroundColor: form.assurance === v ? '#FEF0DC' : '#FFFFFF' }}>
                      <Ionicons name={v === 'oui' ? 'shield-checkmark' : 'shield-outline'} size={20} color={form.assurance === v ? '#D98A30' : '#9CA3AF'} />
                      <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 4, color: form.assurance === v ? '#D98A30' : '#6B7280' }}>{v === 'oui' ? 'Assuré' : 'Non assuré'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 40 }}>
                <View style={{ flex: 1 }}><Button title="Annuler" variant="outline" onPress={closeAdd} /></View>
                <View style={{ flex: 2 }}><Button title={editingId ? 'Enregistrer' : 'Ajouter'} onPress={handleSave} loading={isCreating || isUpdating} icon={editingId ? 'checkmark-circle-outline' : 'add-circle-outline'} /></View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowDetail(false)}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }} onPress={(e) => e.stopPropagation()}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12 }} />
            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {detailDevice ? (
                <DetailContent d={detailDevice} onClose={() => setShowDetail(false)} onEdit={() => { setShowDetail(false); setTimeout(() => openEdit(detailDevice), 300); }} onDelete={() => handleDelete(detailDevice.id)} onReport={() => { setShowDetail(false); openReport(detailDevice.id, detailDevice.is_lost); }} />
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Verify IMEI Modal */}
      <Modal visible={showVerify} transparent animationType="fade" onRequestClose={() => { setShowVerify(false); setVerifyResult(null); setVerifyImei(''); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => { setShowVerify(false); setVerifyResult(null); setVerifyImei(''); }}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 420, padding: 28 }} onPress={(e) => e.stopPropagation()}>
            <View style={{ width: 70, height: 70, borderRadius: 20, backgroundColor: '#FEF0DC', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 }}>
              <Ionicons name="shield-checkmark" size={34} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>Vérifier un appareil</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24, marginTop: 8, lineHeight: 20 }}>
              Vous souhaitez acheter un appareil d'occasion ? Vérifiez si l'appareil n'a pas été déclaré <Text style={{ fontWeight: '700' }}>volé ou perdu</Text>.
            </Text>
            <Input label="Numéro de série / IMEI" placeholder="Saisissez l'IMEI ou N° de série" icon="barcode-outline" value={verifyImei} onChangeText={(v) => { setVerifyImei(v); setVerifyResult(null); }} />
            {verifyResult && (
              <View style={{ marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: verifyResult.status === 'safe' ? '#F0FDF4' : verifyResult.status === 'stolen' ? '#FEF2F2' : '#F8FAFC', borderWidth: 1, borderColor: verifyResult.status === 'safe' ? '#BBF7D0' : verifyResult.status === 'stolen' ? '#FECACA' : '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: verifyResult.status === 'safe' ? '#22C55E' : verifyResult.status === 'stolen' ? '#EF4444' : '#64748B', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={verifyResult.status === 'safe' ? 'checkmark' : verifyResult.status === 'stolen' ? 'warning' : 'help'} size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: verifyResult.status === 'safe' ? '#166534' : verifyResult.status === 'stolen' ? '#991B1B' : '#1E293B' }}>
                      {verifyResult.status === 'safe' ? 'Appareil sûr' : verifyResult.status === 'stolen' ? 'Attention !' : 'Inconnu'}
                    </Text>
                    <Text style={{ fontSize: 12, marginTop: 2, color: verifyResult.status === 'safe' ? '#15803D' : verifyResult.status === 'stolen' ? '#B91C1C' : '#475569' }}>
                      {verifyResult.status === 'safe' ? `${verifyResult.device || 'Appareil'} — Statut: sûr` : verifyResult.status === 'stolen' ? `${verifyResult.device || 'Appareil'} — Signalé` : 'Non enregistré dans notre base.'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <View style={{ flex: 1 }}><Button title="Annuler" variant="outline" onPress={() => { setShowVerify(false); setVerifyResult(null); setVerifyImei(''); }} /></View>
              <View style={{ flex: 1.5 }}><Button title="Vérifier" onPress={handleVerify} loading={verifyLoading} icon="search-outline" /></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Lost/Found Modal */}
      <Modal visible={showReport} transparent animationType="fade" onRequestClose={() => setShowReport(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setShowReport(false)}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 420, padding: 28 }} onPress={(e) => e.stopPropagation()}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: reportIsFound ? '#F0FDF4' : '#FEF2F2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name={reportIsFound ? 'checkmark-circle' : 'warning-outline'} size={30} color={reportIsFound ? '#16A34A' : '#EF4444'} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
              {reportIsFound ? 'Confirmer la trouvaille ?' : 'Signaler un problème'}
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginVertical: 12, lineHeight: 20 }}>
              {reportIsFound ? 'Marquer cet appareil comme sécurisé ?' : 'Voulez-vous déclarer cet appareil comme perdu ou volé ?'}
            </Text>
            {!reportIsFound && (
              <View style={{ marginBottom: 16, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFEDD5' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 }}>Type de signalement</Text>
                <ReportTypeSelector value={reportType} onChange={setReportType} />
              </View>
            )}
            <View style={{ backgroundColor: reportIsFound ? '#F0FDF4' : '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: reportIsFound ? '#BBF7D0' : '#FFEDD5' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Confirmer avec votre mot de passe</Text>
              <Input placeholder="Votre mot de passe" icon="lock-closed-outline" secureTextEntry value={reportPassword} onChangeText={(v) => { setReportPassword(v); setReportError(false); }} error={reportError ? 'Mot de passe incorrect ou trop court.' : undefined} autoComplete="password" />
              <View style={{ marginTop: 16 }}>
                <Button title={reportIsFound ? 'Confirmer le retour' : 'Confirmer la déclaration'} variant={reportIsFound ? 'secondary' : 'danger'} onPress={handleReport} loading={confirming} icon={reportIsFound ? 'checkmark-circle-outline' : 'warning-outline'} />
              </View>
            </View>
            <View style={{ marginTop: 12 }}><Button title="Annuler" variant="outline" onPress={() => setShowReport(false)} /></View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
