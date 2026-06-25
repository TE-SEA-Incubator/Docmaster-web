import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView, View, Pressable, ActivityIndicator, RefreshControl, Text, Image,
  TextInput, Alert, Platform, ToastAndroid, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { BottomSheetView, BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomTabInset } from '@/constants/theme';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { DeviceCard, type Device, type DeviceType } from '@/components/devices/DeviceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
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
  const colors = useThemeColors();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={icon} size={14} color={colors.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text, lineHeight: 20 }}>{value}</Text>
      </View>
    </View>
  );
}

function DetailContent({ d, onClose, onEdit, onDelete, onReport }: {
  d: Device; onClose: () => void; onEdit: () => void; onDelete: () => void; onReport: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const meta = TYPE_META[d.type] || TYPE_META.autre;
  const expired = d.garantie ? new Date(d.garantie) < new Date() : false;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: d.is_lost ? colors.dangerBg : meta.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={meta.icon} size={28} color={d.is_lost ? colors.danger : meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{d.nom}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{d.marque} {d.modele}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={onEdit} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={onDelete} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 20, flexWrap: 'wrap' }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: meta.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: meta.color }}>{t(meta.labelKey)}</Text></View>
        {d.assurance === 'oui' && <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.warningBg }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>{t('devices:insured')}</Text></View>}
        {d.garantie ? <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: expired ? colors.dangerBg : colors.successBg }}><Text style={{ fontSize: 11, fontWeight: '700', color: expired ? colors.danger : colors.greenDark }}>{expired ? t('devices:warrantyExpired') : t('devices:warrantyOk')}</Text></View> : null}
        {d.is_lost && <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.danger }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{t('devices:reported')} {d.status === 'STOLEN' ? t('devices:stolen') : t('devices:lost')}</Text></View>}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{t('devices:details')}</Text>
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
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {([{ key: 'LOST' as const, label: t('devices:lost'), icon: 'search-outline' as const },
         { key: 'STOLEN' as const, label: t('devices:stolen'), icon: 'lock-closed-outline' as const }] as const).map((opt) => (
        <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
          borderColor: value === opt.key ? colors.danger : colors.border,
          backgroundColor: value === opt.key ? colors.dangerBg : colors.backgroundElement,
        }}>
          <Ionicons name={opt.icon} size={16} color={value === opt.key ? colors.danger : colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt.key ? colors.danger : colors.textSecondary }}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PhotoPicker({ label, uri, onSelect }: { label: string, uri: string | null, onSelect: (uri: string) => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
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
      <Pressable onPress={pickImage} style={{ width: '100%', height: 100, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: uri ? 'transparent' : colors.border }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        ) : (
          <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
        )}
      </Pressable>
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export default function DevicesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
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
  const [showDetail, setShowDetail] = useState(false);
  // Edit form state (used by openEdit from detail sheet)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showEditModal, setShowEditModal] = useState(false);
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

  const detailSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const verifySheetRef = useRef<BottomSheetModal>(null);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  // Real data only — empty state is rendered when the user has no devices.
  const devices: Device[] = cachedDevices;
  const loading = isLoading && cachedDevices.length === 0;

  const params = useLocalSearchParams<{ openAdd?: string; openVerify?: string }>();
  const openAddConsumed = useRef(false);
  const openVerifyConsumed = useRef(false);

  useEffect(() => {
    if (showDetail) {
      detailSheetRef.current?.present();
    } else {
      detailSheetRef.current?.dismiss();
    }
  }, [showDetail]);

  useEffect(() => {
    if (showEditModal) {
      editSheetRef.current?.present();
    } else {
      editSheetRef.current?.dismiss();
    }
  }, [showEditModal]);

  useEffect(() => {
    if (showVerify) {
      verifySheetRef.current?.present();
    } else {
      verifySheetRef.current?.dismiss();
    }
  }, [showVerify]);

  useEffect(() => {
    if (showReport) {
      reportSheetRef.current?.present();
    } else {
      reportSheetRef.current?.dismiss();
    }
  }, [showReport]);

  useEffect(() => {
    if (params.openAdd === 'true' && !openAddConsumed.current) {
      openAddConsumed.current = true;
      router.replace('/(tabs)/devices');
      setTimeout(() => router.push('/device/add'), 100);
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
  const openAdd = () => { router.push('/device/add'); };
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
    setShowEditModal(true);
  };
  const closeAdd = () => { setShowEditModal(false); setEditingId(null); };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 16 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{t('devices:title')}</Text>
            <Pressable onPress={() => setShowVerify(true)} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.backgroundSelected, alignItems: 'center', justifyContent: 'center' })}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Search & Add */}
        <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.text, paddingVertical: 0 }} placeholder={t('common:search')} placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <Pressable onPress={openAdd} style={({ pressed }) => ({ height: 42, paddingHorizontal: 18, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.onPrimary }}>{t('common:add')}</Text>
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => (
              <Pressable key={f.key} onPress={() => setCurrentFilter(f.key)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: currentFilter === f.key ? colors.text : colors.background }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {f.icon && <Ionicons name={f.icon} size={11} color={currentFilter === f.key ? colors.onPrimary : colors.textSecondary} />}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: currentFilter === f.key ? colors.onPrimary : colors.textSecondary }}>{t(f.labelKey)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Grid */}
        <View style={{ marginHorizontal: 20 }}>
          {filtered.length === 0 ? (
            <View style={{ backgroundColor: colors.background, borderRadius: 20, padding: 40, alignItems: 'center', gap: 12 }}>
              <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="phone-portrait-outline" size={34} color={colors.textSecondary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                {devices.length === 0 ? t('devices:noDevicesDesc') : t('devices:noResults')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                {devices.length === 0 ? t('devices:addDevicesPrompt') : t('devices:adjustFilters')}
              </Text>
              {devices.length === 0 && (
                <Pressable onPress={openAdd} style={({ pressed }) => ({ marginTop: 10, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 })}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.onPrimary} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.onPrimary }}>{t('devices:addFirstDevice')}</Text>
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

      {/* Add Device → navigates to /device/add page */}

      {/* Edit Device Bottom Sheet */}
      <BottomSheetModal
        ref={editSheetRef}
        snapPoints={['92%']}
        enablePanDownToClose
        onDismiss={() => { setShowEditModal(false); setEditingId(null); }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} pressBehavior="close" />
        )}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40, height: 4, borderRadius: 2 }}
        backgroundStyle={{ backgroundColor: colors.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetView style={{ flex: 1, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('devices:editDevice')}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{t('devices:addDeviceDesc')}</Text>
            </View>
            <Pressable onPress={() => setShowEditModal(false)} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
            <Input label={t('devices:deviceNameLabel')} placeholder={t('devices:deviceNamePlaceholder')} icon="pricetag-outline" value={form.nom} onChangeText={(v) => setForm(f => ({ ...f, nom: v }))} error={formErrors.nom} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}><Input label={t('devices:brandLabel')} placeholder={t('devices:brandPlaceholder')} icon="business-outline" value={form.marque} onChangeText={(v) => setForm(f => ({ ...f, marque: v }))} error={formErrors.marque} /></View>
              <View style={{ flex: 1 }}><Input label={t('devices:modelLabel')} placeholder={t('devices:modelPlaceholder')} icon="git-branch-outline" value={form.modele} onChangeText={(v) => setForm(f => ({ ...f, modele: v }))} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}><Input label={t('devices:serialLabel')} placeholder={t('devices:serialPlaceholder')} icon="barcode-outline" value={form.serial} onChangeText={(v) => setForm(f => ({ ...f, serial: v }))} /></View>
              <View style={{ flex: 1 }}><Input label={t('devices:colorLabel')} placeholder={t('devices:colorPlaceholder')} icon="color-palette-outline" value={form.couleur} onChangeText={(v) => setForm(f => ({ ...f, couleur: v }))} /></View>
            </View>
            <View style={{ marginTop: 14 }}>
              <Input label={t('devices:notesLabel')} placeholder={t('devices:notesPlaceholder')} icon="document-text-outline" value={form.notes} onChangeText={(v) => setForm(f => ({ ...f, notes: v }))} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 20 }}>
              <View style={{ flex: 1 }}><Button title={t('common:cancel')} variant="outline" onPress={() => setShowEditModal(false)} /></View>
              <View style={{ flex: 2 }}><Button title={t('common:save')} onPress={handleSave} loading={isUpdating} icon="checkmark-circle-outline" /></View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Detail Bottom Sheet */}
      {/* Detail Bottom Sheet */}
      <BottomSheetModal
        ref={detailSheetRef}
        snapPoints={['70%']}
        enablePanDownToClose
        onDismiss={() => setShowDetail(false)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} pressBehavior="close" />
        )}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40, height: 4, borderRadius: 2 }}
        backgroundStyle={{ backgroundColor: colors.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}>
          {detailDevice ? (
            <DetailContent
              d={detailDevice}
              onClose={() => setShowDetail(false)}
              onEdit={() => { setShowDetail(false); setTimeout(() => openEdit(detailDevice), 300); }}
              onDelete={() => handleDelete(detailDevice.id)}
              onReport={() => { setShowDetail(false); openReport(detailDevice.id, detailDevice.is_lost); }}
            />
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Verify IMEI Bottom Sheet */}
      <BottomSheetModal
        ref={verifySheetRef}
        snapPoints={['65%']}
        enablePanDownToClose
        onDismiss={() => { setShowVerify(false); setVerifyResult(null); setVerifyImei(''); }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} pressBehavior="close" />
        )}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40, height: 4, borderRadius: 2 }}
        backgroundStyle={{ backgroundColor: colors.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}>
          <View style={{ width: 70, height: 70, borderRadius: 20, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 }}>
            <Ionicons name="shield-checkmark" size={34} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{t('devices:verifyDevice')}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 8, lineHeight: 20 }}>
            {t('devices:verifyDescription')}
          </Text>
          <Input label={t('devices:serialLabel')} placeholder={t('devices:verifyPlaceholder')} icon="barcode-outline" value={verifyImei} onChangeText={(v) => { setVerifyImei(v); setVerifyResult(null); }} />
          {verifyResult && (
            <View style={{ marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: verifyResult.status === 'safe' ? colors.successBg : verifyResult.status === 'stolen' ? colors.dangerBg : colors.background, borderWidth: 1, borderColor: verifyResult.status === 'safe' ? '#BBF7D0' : verifyResult.status === 'stolen' ? '#FECACA' : '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: verifyResult.status === 'safe' ? colors.success : verifyResult.status === 'stolen' ? colors.danger : colors.textSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={verifyResult.status === 'safe' ? 'checkmark' : verifyResult.status === 'stolen' ? 'warning' : 'help'} size={20} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: verifyResult.status === 'safe' ? colors.success : verifyResult.status === 'stolen' ? colors.danger : colors.text }}>
                    {verifyResult.status === 'safe' ? t('devices:deviceSafe') : verifyResult.status === 'stolen' ? t('devices:attention') : t('devices:unknown')}
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 2, color: verifyResult.status === 'safe' ? colors.success : verifyResult.status === 'stolen' ? colors.danger : colors.textSecondary }}>
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
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Report Lost/Found Bottom Sheet */}
      <BottomSheetModal
        ref={reportSheetRef}
        snapPoints={['60%']}
        enablePanDownToClose
        onDismiss={() => setShowReport(false)}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} pressBehavior="close" />
        )}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40, height: 4, borderRadius: 2 }}
        backgroundStyle={{ backgroundColor: colors.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: reportIsFound ? colors.successBg : colors.dangerBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
            <Ionicons name={reportIsFound ? 'checkmark-circle' : 'warning-outline'} size={30} color={reportIsFound ? colors.success : colors.danger} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            {reportIsFound ? t('devices:confirmFound') : t('devices:reportProblem')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginVertical: 12, lineHeight: 20 }}>
            {reportIsFound ? t('devices:confirmFoundDesc') : t('devices:reportProblemDesc')}
          </Text>
          {!reportIsFound && (
            <View style={{ marginBottom: 16, backgroundColor: colors.warningBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>{t('devices:reportType')}</Text>
              <ReportTypeSelector value={reportType} onChange={setReportType} />
            </View>
          )}
          <View style={{ backgroundColor: reportIsFound ? colors.successBg : colors.warningBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t('devices:confirmPassword')}</Text>
            <Input placeholder={t('devices:passwordPlaceholder')} icon="lock-closed-outline" secureTextEntry value={reportPassword} onChangeText={(v) => { setReportPassword(v); setReportError(false); }} error={reportError ? t('devices:passwordError') : undefined} autoComplete="password" />
            <View style={{ marginTop: 16 }}>
              <Button title={reportIsFound ? t('devices:confirmReturn') : t('devices:confirmDeclaration')} variant={reportIsFound ? 'secondary' : 'danger'} onPress={handleReport} loading={confirming} icon={reportIsFound ? 'checkmark-circle-outline' : 'warning-outline'} />
            </View>
          </View>
          <View style={{ marginTop: 12 }}><Button title={t('common:cancel')} variant="outline" onPress={() => setShowReport(false)} /></View>
        </BottomSheetScrollView>
      </BottomSheetModal>

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
