import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView, View, Pressable, ActivityIndicator, RefreshControl, Text, Image,
  TextInput, Alert, Platform, ToastAndroid, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomTabInset } from '@/constants/theme';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { DeviceCard, PRIMARY, type Device, type DeviceType } from '@/components/devices/DeviceCard';
import { useDevices } from '@/core/hooks/useDevices';
import { DevicesSkeleton } from '@/components/Skeletons';
import { DatePickerInput } from '@/components/declarations/wizard/DatePickerInput';
import { ActionFeedbackModal, type FeedbackType } from '@/components/feedback/ActionFeedbackModal';
import { devicesService } from '@/core/api/devicesService';
import { useTranslation, getI18n } from 'react-i18next';

const SCREEN = Dimensions.get('window');

const TYPE_META: Record<DeviceType, { labelKey: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  telephone: { labelKey: 'devices:deviceTelephone', icon: 'phone-portrait-outline', color: '#3B82F6', bg: '#EFF6FF' },
  ordinateur: { labelKey: 'devices:deviceOrdinateur', icon: 'laptop-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  tablette: { labelKey: 'devices:deviceTablette', icon: 'tablet-portrait-outline', color: '#10B981', bg: '#ECFDF5' },
  tv: { labelKey: 'devices:deviceTv', icon: 'tv-outline', color: '#F59E0B', bg: '#FFFBEB' },
  autre: { labelKey: 'devices:deviceAutre', icon: 'cube-outline', color: '#6B7280', bg: '#F9FAFB' },
};

const FILTERS: { key: string; labelKey: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', labelKey: 'devices:filterAll' },
  { key: 'telephone', labelKey: 'devices:filterTelephones', icon: 'phone-portrait-outline' },
  { key: 'ordinateur', labelKey: 'devices:filterOrdinateurs', icon: 'laptop-outline' },
  { key: 'tablette', labelKey: 'devices:filterTablettes', icon: 'tablet-portrait-outline' },
  { key: 'autre', labelKey: 'devices:filterAutres', icon: 'cube-outline' },
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
const CARD_H = 216;

function formatDate(s: string) {
  if (!s) return '—';
  try {
    const locale = getI18n().language || 'fr';
    return new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
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
  const { t } = useTranslation();
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
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: meta.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: meta.color }}>{t(meta.labelKey)}</Text></View>
        {d.assurance === 'oui' && <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: '#FEF0DC' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#D98A30' }}>{t('devices:insured')}</Text></View>}
        {d.garantie ? <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: expired ? '#FEF2F2' : '#E8F5EE' }}><Text style={{ fontSize: 11, fontWeight: '700', color: expired ? '#EF4444' : '#1E3A2F' }}>{expired ? t('devices:warrantyExpired') : t('devices:warrantyOk')}</Text></View> : null}
        {d.is_lost && <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: '#EF4444' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{t('devices:reported')} {d.status === 'STOLEN' ? t('devices:stolen') : t('devices:lost')}</Text></View>}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{t('devices:details')}</Text>
      <InfoRow icon="barcode-outline" label={t('devices:serialLabel')} value={d.serial} />
      <InfoRow icon="color-palette-outline" label={t('devices:colorLabel')} value={d.couleur} />
      <InfoRow icon="calendar-outline" label={t('devices:purchaseDateLabel')} value={d.dateAchat ? formatDate(d.dateAchat) : ''} />
      <InfoRow icon="calendar-outline" label={t('devices:warrantyLabel')} value={d.garantie ? formatDate(d.garantie) : ''} />
      <InfoRow icon="wallet-outline" label={t('devices:priceLabel')} value={d.prix ? d.prix.toLocaleString(getI18n().language || 'fr') + ' FCFA' : ''} />
      <InfoRow icon="location-outline" label={t('devices:locationLabel')} value={d.lieu} />
      <InfoRow icon="document-text-outline" label={t('devices:notesLabel')} value={d.notes} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        <View style={{ flex: 1 }}><Button title={t('common:close')} variant="outline" onPress={onClose} /></View>
        <View style={{ flex: 1 }}><Button title={d.is_lost ? t('devices:found') : t('devices:reportLost')} variant={d.is_lost ? 'secondary' : 'danger'} onPress={onReport} /></View>
      </View>
    </View>
  );
}

function ReportTypeSelector({ value, onChange }: { value: 'LOST' | 'STOLEN'; onChange: (v: 'LOST' | 'STOLEN') => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {([{ key: 'LOST' as const, label: t('devices:lost'), icon: 'search-outline' as const },
         { key: 'STOLEN' as const, label: t('devices:stolen'), icon: 'lock-closed-outline' as const }] as const).map((opt) => (
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
  const { t } = useTranslation();
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
          t('devices:permissionRequired'),
          t('devices:cameraPermissionDesc'),
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
        t('devices:cameraUnavailable'),
        t('devices:cameraUnavailableDesc'),
        [
          { text: t('devices:chooseFromGallery'), onPress: () => { launchLibrarySafely(); } },
          { text: t('common:cancel'), style: 'cancel' },
        ],
      );
    }
  };

  const launchLibrarySafely = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          t('devices:permissionRequired'),
          t('devices:galleryPermissionDesc'),
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
        t('devices:galleryUnavailable'),
        t('devices:galleryUnavailableDesc'),
      );
    }
  };

  const pickImage = () => {
    Alert.alert(
      t('devices:imageSource'),
      t('devices:imageSourceQuestion'),
      [
        { text: t('devices:takePhoto'), onPress: () => { launchCameraSafely(); } },
        { text: t('devices:chooseFromGallery'), onPress: () => { launchLibrarySafely(); } },
        { text: t('common:cancel'), style: 'cancel' },
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
  const { t } = useTranslation();
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
  const [feedback, setFeedback] = useState<{ visible: boolean; type: FeedbackType; title: string; message?: string; detail?: string; detailLabel?: string }>({
    visible: false, type: 'success', title: '',
  });

  const addSheetRef = useRef<BottomSheet>(null);
  const addSnapPoints = ['92%'];

  // Real data only — empty state is rendered when the user has no devices.
  const devices: Device[] = cachedDevices;
  const loading = isLoading && cachedDevices.length === 0;

  const params = useLocalSearchParams<{ openAdd?: string; openVerify?: string }>();
  const openAddConsumed = useRef(false);
  const openVerifyConsumed = useRef(false);

  useEffect(() => {
    if (showAddModal) {
      addSheetRef.current?.expand();
    } else {
      addSheetRef.current?.close();
    }
  }, [showAddModal]);

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
    if (!form.nom.trim()) errs.nom = t('common:required');
    if (!form.marque.trim()) errs.marque = t('common:required');
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    const formData = new FormData();
    formData.append('category', form.type);
    formData.append('brand', form.marque);
    formData.append('model', form.modele);
    formData.append('serial_number_imei', form.serial);
    formData.append('color', form.couleur);
    formData.append('purchase_date', form.dateAchat || '');
    formData.append('garantie_end', form.garantie || '');
    formData.append('purchase_value', String(form.prix || 0));
    formData.append('currency', 'XAF');
    formData.append('where_buy', form.lieu);
    formData.append('assurance', form.assurance);
    formData.append('notes', form.notes);
    formData.append('status', 'SAFE');

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
        setFeedback({ visible: true, type: 'error', title: t('common:error'), message: t('devices:saveErrorMessage') });
        return;
      }
      closeAdd();
      setFeedback({
        visible: true,
        type: 'success',
        title: editingId ? t('devices:deviceUpdated') : t('devices:deviceAdded'),
        message: editingId
          ? t('devices:updateSuccessMessage')
          : t('devices:addSuccessMessage'),
      });
    };

    if (editingId) {
      update({ id: editingId, input: formData }, { onError: onDone, onSuccess: () => onDone(null) });
    } else {
      create(formData, { onError: onDone, onSuccess: () => onDone(null) });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('common:delete'), t('devices:deleteWarning'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: () => {
          remove(id, {
            onSuccess: () => {
              setShowDetail(false);
              setFeedback({ visible: true, type: 'success', title: t('devices:deviceDeleted'), message: t('devices:deleteSuccessMessage') });
            },
            onError: () => setFeedback({ visible: true, type: 'error', title: t('devices:deleteFailed'), message: t('devices:deleteFailedMessage') }),
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
        setFeedback({ visible: true, type: 'error', title: t('common:error'), message: t('devices:operationFailedMessage') });
        return;
      }
      setShowReport(false);
      setShowDetail(false);
      const title = reportIsFound ? t('devices:deviceFound') : t('devices:deviceReported');
      const msg = reportIsFound ? t('devices:foundSuccessMessage') : t('devices:reportedSuccessMessage');
      setFeedback({ visible: true, type: 'success', title, message: msg });
    };
    if (reportIsFound) {
      reportFound({ id, password: reportPassword }, { onError: finish, onSuccess: () => finish(null) });
    } else {
      reportLost({ id, password: reportPassword, type: reportType }, { onError: finish, onSuccess: () => finish(null) });
    }
  };

  const handleVerify = async () => {
    if (!verifyImei.trim()) { Alert.alert(t('common:error'), t('devices:enterImei')); return; }
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
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>{t('devices:title')}</Text>
            <Pressable onPress={() => setShowVerify(true)} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: pressed ? '#F5F5F5' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' })}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Search & Add */}
        <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
            <Ionicons name="search-outline" size={16} color="#C4BAB0" />
            <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#1A1A1A', paddingVertical: 0 }} placeholder={t('common:search')} placeholderTextColor="#C4BAB0" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <Pressable onPress={openAdd} style={({ pressed }) => ({ height: 42, paddingHorizontal: 18, backgroundColor: pressed ? '#E0932F' : PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{t('common:add')}</Text>
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => (
              <Pressable key={f.key} onPress={() => setCurrentFilter(f.key)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: currentFilter === f.key ? '#1A1A1A' : '#F5F5F5' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {f.icon && <Ionicons name={f.icon} size={11} color={currentFilter === f.key ? '#FFFFFF' : '#6B7280'} />}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: currentFilter === f.key ? '#FFFFFF' : '#6B7280' }}>{t(f.labelKey)}</Text>
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
                {devices.length === 0 ? t('devices:noDevicesDesc') : t('devices:noResults')}
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                {devices.length === 0 ? t('devices:addDevicesPrompt') : t('devices:adjustFilters')}
              </Text>
              {devices.length === 0 && (
                <Pressable onPress={openAdd} style={({ pressed }) => ({ marginTop: 10, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: pressed ? '#E0932F' : PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 })}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{t('devices:addFirstDevice')}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {filtered.map((d, i) => (
                <View
                  key={d.id}
                  style={{
                    width: (SCREEN.width - PAD * 2 - GAP) / 2,
                  }}
                >
                  <DeviceCard
                    device={d}
                    index={i}
                    onPress={() => router.push(`/device/${d.id}`)}
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

      {/* Add/Edit Bottom Sheet */}
      {showAddModal && (
        <BottomSheet
          ref={addSheetRef}
          snapPoints={addSnapPoints}
          enablePanDownToClose
          onClose={closeAdd}
          handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40, height: 4, borderRadius: 2 }}
          backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          <BottomSheetView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>{editingId ? t('devices:editDevice') : t('devices:addDevice')}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t('devices:addDeviceDesc')}</Text>
              </View>
              <Pressable onPress={closeAdd} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: '#E0D5C4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>{t('devices:deviceType')}</Text>
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
                        <Text style={{ fontSize: 12, fontWeight: '700', color: color }}>{t(m.labelKey)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <Input label={t('devices:deviceNameLabel')} placeholder={t('devices:deviceNamePlaceholder')} icon="pricetag-outline" value={form.nom} onChangeText={(v) => updateForm('nom', v)} error={formErrors.nom} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Input label={t('devices:brandLabel')} placeholder={t('devices:brandPlaceholder')} icon="business-outline" value={form.marque} onChangeText={(v) => updateForm('marque', v)} error={formErrors.marque} /></View>
                <View style={{ flex: 1 }}><Input label={t('devices:modelLabel')} placeholder={t('devices:modelPlaceholder')} icon="git-branch-outline" value={form.modele} onChangeText={(v) => updateForm('modele', v)} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Input label={t('devices:serialLabel')} placeholder={t('devices:serialPlaceholder')} icon="barcode-outline" value={form.serial} onChangeText={(v) => updateForm('serial', v)} /></View>
                <View style={{ flex: 1 }}><Input label={t('devices:colorLabel')} placeholder={t('devices:colorPlaceholder')} icon="color-palette-outline" value={form.couleur} onChangeText={(v) => updateForm('couleur', v)} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><DatePickerInput label={t('devices:purchaseDateLabel')} value={form.dateAchat ? new Date(form.dateAchat) : new Date()} onChange={(d) => updateForm('dateAchat', d.toISOString().split('T')[0])} /></View>
                <View style={{ flex: 1 }}><DatePickerInput label={t('devices:warrantyLabel')} value={form.garantie ? new Date(form.garantie) : new Date()} onChange={(d) => updateForm('garantie', d.toISOString().split('T')[0])} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}><Input label={t('devices:priceLabel')} placeholder={t('devices:pricePlaceholder')} icon="wallet-outline" keyboardType="numeric" value={form.prix ? String(form.prix) : ''} onChangeText={(v) => updateForm('prix', v ? Number(v.replace(/[^0-9]/g, '')) : 0)} /></View>
                <View style={{ flex: 1 }}><Input label={t('devices:locationLabel')} placeholder={t('devices:locationPlaceholder')} icon="location-outline" value={form.lieu} onChangeText={(v) => updateForm('lieu', v)} /></View>
              </View>
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 }}>{t('devices:photos')}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <PhotoPicker label={t('devices:receiptPhoto')} uri={form.photo_facture} onSelect={(uri) => updateForm('photo_facture', uri)} />
                  <PhotoPicker label={t('devices:facePhoto')} uri={form.photo_face} onSelect={(uri) => updateForm('photo_face', uri)} />
                  <PhotoPicker label={t('devices:serialPhoto')} uri={form.photo_serial} onSelect={(uri) => updateForm('photo_serial', uri)} />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 }}>{t('devices:insurance')}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {['non', 'oui'].map((v) => (
                    <Pressable key={v} onPress={() => updateForm('assurance', v)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: form.assurance === v ? PRIMARY : '#E0D5C4', backgroundColor: form.assurance === v ? '#FEF0DC' : '#FFFFFF' }}>
                      <Ionicons name={v === 'oui' ? 'shield-checkmark' : 'shield-outline'} size={20} color={form.assurance === v ? '#D98A30' : '#9CA3AF'} />
                      <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 4, color: form.assurance === v ? '#D98A30' : '#6B7280' }}>{v === 'oui' ? t('devices:insured') : t('devices:notInsured')}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Input label={t('devices:notesLabel')} placeholder={t('devices:notesPlaceholder')} icon="document-text-outline" value={form.notes} onChangeText={(v) => updateForm('notes', v)} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 40 }}>
                <View style={{ flex: 1 }}><Button title={t('common:cancel')} variant="outline" onPress={closeAdd} /></View>
                <View style={{ flex: 2 }}><Button title={editingId ? t('common:save') : t('common:add')} onPress={handleSave} loading={isCreating || isUpdating} icon={editingId ? 'checkmark-circle-outline' : 'add-circle-outline'} /></View>
              </View>
            </ScrollView>
          </BottomSheetView>
        </BottomSheet>
      )}

      {/* Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowDetail(false)}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', marginBottom: insets.bottom + 8 }} onPress={(e) => e.stopPropagation()}>
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
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>{t('devices:verifyDevice')}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24, marginTop: 8, lineHeight: 20 }}>
              {t('devices:verifyDescription')}
            </Text>
            <Input label={t('devices:serialLabel')} placeholder={t('devices:verifyPlaceholder')} icon="barcode-outline" value={verifyImei} onChangeText={(v) => { setVerifyImei(v); setVerifyResult(null); }} />
            {verifyResult && (
              <View style={{ marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: verifyResult.status === 'safe' ? '#F0FDF4' : verifyResult.status === 'stolen' ? '#FEF2F2' : '#F8FAFC', borderWidth: 1, borderColor: verifyResult.status === 'safe' ? '#BBF7D0' : verifyResult.status === 'stolen' ? '#FECACA' : '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: verifyResult.status === 'safe' ? '#22C55E' : verifyResult.status === 'stolen' ? '#EF4444' : '#64748B', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={verifyResult.status === 'safe' ? 'checkmark' : verifyResult.status === 'stolen' ? 'warning' : 'help'} size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: verifyResult.status === 'safe' ? '#166534' : verifyResult.status === 'stolen' ? '#991B1B' : '#1E293B' }}>
                      {verifyResult.status === 'safe' ? t('devices:deviceSafe') : verifyResult.status === 'stolen' ? t('devices:attention') : t('devices:unknown')}
                    </Text>
                    <Text style={{ fontSize: 12, marginTop: 2, color: verifyResult.status === 'safe' ? '#15803D' : verifyResult.status === 'stolen' ? '#B91C1C' : '#475569' }}>
                      {verifyResult.status === 'safe' ? t('devices:safeStatus', { device: verifyResult.device || t('devices:device') }) : verifyResult.status === 'stolen' ? t('devices:stolenStatus', { device: verifyResult.device || t('devices:device') }) : t('devices:unknownStatus')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <View style={{ flex: 1 }}><Button title={t('common:cancel')} variant="outline" onPress={() => { setShowVerify(false); setVerifyResult(null); setVerifyImei(''); }} /></View>
              <View style={{ flex: 1.5 }}><Button title={t('devices:verify')} onPress={handleVerify} loading={verifyLoading} icon="search-outline" /></View>
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
              {reportIsFound ? t('devices:confirmFound') : t('devices:reportProblem')}
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginVertical: 12, lineHeight: 20 }}>
              {reportIsFound ? t('devices:confirmFoundDesc') : t('devices:reportProblemDesc')}
            </Text>
            {!reportIsFound && (
              <View style={{ marginBottom: 16, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFEDD5' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 }}>{t('devices:reportType')}</Text>
                <ReportTypeSelector value={reportType} onChange={setReportType} />
              </View>
            )}
            <View style={{ backgroundColor: reportIsFound ? '#F0FDF4' : '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: reportIsFound ? '#BBF7D0' : '#FFEDD5' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t('devices:confirmPassword')}</Text>
              <Input placeholder={t('devices:passwordPlaceholder')} icon="lock-closed-outline" secureTextEntry value={reportPassword} onChangeText={(v) => { setReportPassword(v); setReportError(false); }} error={reportError ? t('devices:passwordError') : undefined} autoComplete="password" />
              <View style={{ marginTop: 16 }}>
                <Button title={reportIsFound ? t('devices:confirmReturn') : t('devices:confirmDeclaration')} variant={reportIsFound ? 'secondary' : 'danger'} onPress={handleReport} loading={confirming} icon={reportIsFound ? 'checkmark-circle-outline' : 'warning-outline'} />
              </View>
            </View>
            <View style={{ marginTop: 12 }}><Button title={t('common:cancel')} variant="outline" onPress={() => setShowReport(false)} /></View>
          </Pressable>
        </Pressable>
      </Modal>

      <ActionFeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        detail={feedback.detail}
        detailLabel={feedback.detailLabel}
        onDismiss={() => setFeedback((f) => ({ ...f, visible: false }))}
        onPrimaryAction={() => setFeedback((f) => ({ ...f, visible: false }))}
      />
    </SafeAreaView>
  );
}
