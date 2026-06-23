import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Platform, ToastAndroid, Dimensions, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { documentsService } from '@/core/api/documentsService';
import { documentTypesService } from '@/core/api/declarationsService';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { DatePickerInput } from '@/components/declarations/wizard/DatePickerInput';
import { BottomTabInset } from '@/constants/theme';
import type { Document, DocTypeCatalog } from '@/types';
import { DocumentsSkeleton } from '@/components/Skeletons';
import { ActionFeedbackModal, type FeedbackType } from '@/components/feedback/ActionFeedbackModal';
import { useThemeColors } from '@/hooks/useThemeColors';

function getIcon(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('cni')) return 'id-card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome')) return 'school-outline';
  if (t.includes('acte')) return 'document-text-outline';
  return 'document-outline';
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) date.setDate(0);
  return date.toISOString().split('T')[0];
}

/**
 * Returns true if the document has a date_expiration in the past
 * (compared to the current local date). Permanent docs (no date_expiration)
 * are never considered expired.
 */
function isDocumentExpired(doc: Document): boolean {
  if (!doc.date_expiration) return false;
  const exp = new Date(doc.date_expiration);
  if (isNaN(exp.getTime())) return false;
  return exp.getTime() < Date.now();
}

const SCREEN = Dimensions.get('window');

const EMPTY_FORM = {
  type_id: '',
  custom_type_name: '',
  numero_doc: '',
  nom_sur_doc: '',
  nom_autorite: '',
  date_delivrance: '',
  date_expiration: '',
  notes: '',
  photo_recto: '',
  photo_verso: '',
};

export default function DocumentsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [step, setStep] = useState(1);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [certify, setCertify] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [validityOption, setValidityOption] = useState<'EXPIRING' | 'PERMANENT'>('EXPIRING');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [feedback, setFeedback] = useState<{ visible: boolean; type: FeedbackType; title: string; message?: string; detail?: string; detailLabel?: string }>({
    visible: false, type: 'success', title: '',
  });

  const visibleDocs = docs.filter((doc) =>
    viewMode === 'archived' ? !!doc.is_archived : !doc.is_archived
  );

  const uniqueTypes = [...new Set(visibleDocs.map(d => d.type_doc).filter(Boolean))] as string[];

  const filteredDocs = visibleDocs.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (doc.nom_sur_doc || '').toLowerCase().includes(q) || (doc.type_doc || '').toLowerCase().includes(q) || (doc.numero_doc || '').toLowerCase().includes(q);
    const matchesType = !selectedType || doc.type_doc === selectedType;
    return matchesSearch && matchesType;
  });

  const params = useLocalSearchParams<{ openAdd?: string }>();
  const openAddConsumed = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await documentsService.getAll().catch(() => ({ success: false, data: [] }));
      if (res.success && res.data) {
        setDocs(res.data);
        // Archivage immédiat côté UI : pour tout document actif dont la
        // date d'expiration est dépassée, on demande au backend de l'archiver
        // (défense en profondeur — évite d'attendre le cron quotidien de 2h).
        const expiredActive = res.data.filter(
          (d) => !d.is_archived && isDocumentExpired(d)
        );
        if (expiredActive.length > 0) {
          const results = await Promise.allSettled(
            expiredActive.map((d) => documentsService.archive(d.id))
          );
          setDocs((prev) =>
            prev.map((d) => {
              const match = results.find(
                (r, i) => r.status === 'fulfilled' && expiredActive[i].id === d.id
              );
              return match
                ? { ...d, is_archived: true, archived_at: new Date().toISOString() }
                : d;
            })
          );
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const res = await documentTypesService.getActive();
      if (res.success && res.data) setDocTypes(res.data);
    } catch {} finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTypes();
  }, [fetchData, fetchTypes]);

  useEffect(() => {
    if (params.openAdd === 'true' && !openAddConsumed.current) {
      openAddConsumed.current = true;
      openAdd();
      router.replace('/(tabs)/documents');
    }
  }, [params.openAdd]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setStep(1);
    setCertify(false);
    setFormErrors({});
    setSelectedType(null);
    setValidityOption('EXPIRING');
    setShowTypePicker(false);
    setShowAddModal(true);
  };

  const closeAdd = () => {
    setShowAddModal(false);
    setStep(1);
    setShowTypePicker(false);
  };

  const activeCount = docs.filter((doc) => !doc.is_archived).length;
  const archivedCount = docs.filter((doc) => !!doc.is_archived).length;
  const expiredUnarchivedCount = docs.filter(
    (doc) => !doc.is_archived && isDocumentExpired(doc)
  ).length;

  const selectedDocType = docTypes.find(dt => dt.id === form.type_id) || null;
  const isCustomType = form.type_id === 'AUTRES';
  const hasExpiration = validityOption === 'EXPIRING';
  const autoExpirationMonths = selectedDocType?.delai_expiration_mois ?? 0;
  const isAutoExpiry = validityOption === 'EXPIRING' && !isCustomType && autoExpirationMonths > 0;
  const availableDocTypes = docTypes.filter((dt) =>
    validityOption === 'EXPIRING'
      ? (dt.delai_expiration_mois ?? 0) > 0
      : (dt.delai_expiration_mois ?? 0) === 0
  );

  const handleScanDocument = async (side: 'photo_recto' | 'photo_verso') => {
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 85,
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        updateForm(side, scannedImages[0]);
      } else if (status === 'cancel') {
        return;
      } else {
        Alert.alert(t('documents:error'), t('documents:scanError'));
      }
    } catch (error) {
      console.error(t('documents:scanErrorLog'), error);
      Alert.alert(t('documents:error'), t('documents:scanLaunchError'));
    }
  };

  const handleSubmit = async () => {
    if (!certify) {
      Alert.alert(t('documents:certificationRequired'), t('documents:certifyAlertMessage'));
      return;
    }

    setSaving(true);
    try {
      const typeName = isCustomType ? 'AUTRES' : (selectedDocType?.nom || form.type_id);
      // Si la date d'expiration est déjà dépassée à la soumission, on force
      // l'archivage immédiat (le backend applique aussi la même règle).
      const expDate = form.date_expiration ? new Date(form.date_expiration) : null;
      const submitAlreadyExpired = !!(
        validityOption === 'EXPIRING' &&
        expDate && !isNaN(expDate.getTime()) && expDate.getTime() < Date.now()
      );
      const payload = {
        type_doc: typeName,
        numero_doc: form.numero_doc,
        nom_sur_doc: form.nom_sur_doc,
        nom_autorite: form.nom_autorite || undefined,
        date_delivrance: validityOption === 'PERMANENT' ? undefined : (form.date_delivrance || undefined),
        date_expiration: validityOption === 'PERMANENT' ? undefined : (form.date_expiration || undefined),
        photo_recto: form.photo_recto || undefined,
        photo_verso: form.photo_verso || undefined,
        notes: form.notes || undefined,
        validity_option: validityOption,
        custom_type_name: isCustomType ? (form.custom_type_name || undefined) : undefined,
        is_archived: submitAlreadyExpired ? true : undefined,
      };

      const res = await documentsService.register(payload);
      if (res.success) {
        closeAdd();
        fetchData();
        setFeedback({
          visible: true,
          type: 'success',
          title: submitAlreadyExpired ? t('documents:documentArchived') : t('documents:documentRegistered'),
          message: submitAlreadyExpired
            ? t('documents:documentArchivedDesc')
            : t('documents:documentRegisteredDesc'),
        });
      } else {
        setFeedback({ visible: true, type: 'error', title: t('documents:error'), message: res.message || t('documents:registrationError') });
      }
    } catch (err: any) {
      setFeedback({ visible: true, type: 'error', title: t('documents:networkError'), message: err?.response?.data?.message || t('documents:networkErrorDesc') });
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      const errs: Record<string, string> = {};
      if (!form.type_id) errs.type_id = t('documents:required');
      if (isCustomType && !form.custom_type_name.trim()) errs.custom_type_name = t('documents:required');
      if (!form.nom_sur_doc.trim()) errs.nom_sur_doc = t('documents:required');
      if (!form.numero_doc.trim()) errs.numero_doc = t('documents:required');
      if (validityOption === 'EXPIRING' && !form.date_delivrance.trim()) errs.date_delivrance = t('documents:required');
      if (validityOption === 'EXPIRING' && !isAutoExpiry && !form.date_expiration.trim()) errs.date_expiration = t('documents:required');
      if (!form.photo_recto.trim()) errs.photo_recto = t('documents:required');
      if (Object.keys(errs).length > 0) {
        setFormErrors(errs);
        return;
      }
      setFormErrors({});
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleValidityChange = (nextValidity: 'EXPIRING' | 'PERMANENT') => {
    setValidityOption(nextValidity);
    setForm((prev) => ({
      ...prev,
      type_id: '',
      custom_type_name: '',
      date_delivrance: '',
      date_expiration: '',
    }));
    setShowTypePicker(false);
  };

  const updateIssuedDate = (value: string) => {
    setForm((prev) => ({
      ...prev,
      date_delivrance: value,
      date_expiration: isAutoExpiry && value ? addMonths(value, autoExpirationMonths) : prev.date_expiration,
    }));
  };

  if (loading) {
    return <DocumentsSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <ThemedText style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{t('documents:title')}</ThemedText>
              <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{t('documents:subtitle')}</ThemedText>
            </View>
            <Pressable
              onPress={openAdd}
              style={({ pressed }) => ({
                width: 42, height: 42, borderRadius: 14,
                backgroundColor: pressed ? '#FEE8C8' : '#FFF3E0',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: '#FFD49A',
              })}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={() => {
                setViewMode('active');
                setSelectedType(null);
              }}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: viewMode === 'active' ? colors.primary : colors.border,
                backgroundColor: viewMode === 'active' ? '#FFF3E0' : (pressed ? '#FAFAFA' : colors.backgroundElement),
              })}
            >
              <Ionicons name="document-text-outline" size={16} color={viewMode === 'active' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: viewMode === 'active' ? '#92400E' : colors.textSecondary }}>
                {t('documents:active')} ({activeCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setViewMode('archived');
                setSelectedType(null);
              }}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: viewMode === 'archived' ? colors.primary : colors.border,
                backgroundColor: viewMode === 'archived' ? '#FFF3E0' : (pressed ? '#FAFAFA' : colors.backgroundElement),
              })}
            >
              <Ionicons name="archive-outline" size={16} color={viewMode === 'archived' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: viewMode === 'archived' ? '#92400E' : colors.textSecondary }}>
                {t('documents:archived')} ({archivedCount})
              </Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#F5F5F5', borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 12,
            marginBottom: 16, gap: 10,
          }}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder={t('documents:searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 14, color: colors.text, padding: 0 }}
              placeholderTextColor={colors.textSecondary}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Category Filters */}
          {uniqueTypes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              <Pressable
                onPress={() => setSelectedType(null)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: !selectedType ? colors.primary : (pressed ? '#F5F5F5' : '#FAFAFA'),
                  borderWidth: 1, borderColor: !selectedType ? colors.primary : colors.border,
                })}
              >
                <Ionicons name="layers-outline" size={14} color={!selectedType ? '#FFFFFF' : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: !selectedType ? '#FFFFFF' : colors.textSecondary }}>
                  {t('documents:all')}
                </Text>
                <View style={{
                  backgroundColor: !selectedType ? 'rgba(255,255,255,0.3)' : colors.border,
                  paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: !selectedType ? '#FFFFFF' : colors.textSecondary }}>
                    {docs.length}
                  </Text>
                </View>
              </Pressable>

              {uniqueTypes.map((type) => {
                const count = docs.filter(d => d.type_doc === type).length;
                const active = selectedType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedType(active ? null : type)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: active ? colors.primary : (pressed ? '#F5F5F5' : '#FAFAFA'),
                      borderWidth: 1, borderColor: active ? colors.primary : colors.border,
                    })}
                  >
                    <Ionicons
                      name={getIcon(type) as any}
                      size={14}
                      color={active ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : colors.textSecondary }}>
                      {type}
                    </Text>
                    <View style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.border,
                      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : colors.textSecondary }}>
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Document Cards */}
        {docs.length === 0 ? (
          <View style={{ marginHorizontal: 20, backgroundColor: '#FAFAFA', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 40, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text-outline" size={30} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('documents:noDocuments')}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
              {t('documents:noDocumentsDesc')}
            </Text>
          </View>
        ) : filteredDocs.length === 0 ? (
          <View style={{ marginHorizontal: 20, backgroundColor: '#FAFAFA', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 40, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search-outline" size={30} color={colors.textSecondary} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{viewMode === 'archived' ? t('documents:noArchivedDocs') : t('documents:noResults')}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
              {viewMode === 'archived'
                ? t('documents:archivedDesc')
                : t('documents:noSearchResultsDesc')}
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            {filteredDocs.map((doc) => {
              const hasPhoto = !!doc.photo_recto;
              const isArchived = !!doc.is_archived;
              return (
                <Pressable
                  key={doc.id}
                  onPress={() => router.push(`/document/${doc.id}`)}
                  style={({ pressed }) => ({
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: colors.backgroundElement,
                    borderWidth: 1,
                    borderColor: pressed ? colors.primary : colors.border,
                    shadowColor: '#1A1A1A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  {/* Image Section */}
                  <View style={{ height: 200, backgroundColor: '#F5F0EA' }}>
                    {hasPhoto ? (
                      <Image
                        source={{ uri: doc.photo_recto }}
                        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                      />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <View style={{
                          width: 64, height: 64, borderRadius: 20,
                          backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2, borderColor: '#FFE2B7',
                        }}>
                          <Ionicons name={getIcon(doc.type_doc) as any} size={28} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#C4BAB0' }}>{t('documents:noPhoto')}</Text>
                      </View>
                    )}

                    {/* Gradient overlay at bottom */}
                    {hasPhoto && (
                      <View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: 100,
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                      }} pointerEvents="none">
                        <View style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
                          backgroundColor: 'rgba(0,0,0,0.35)',
                        }} />
                      </View>
                    )}

                    {/* Status badge top-right */}
                    <View style={{ position: 'absolute', top: 12, right: 12 }}>
                      {doc.is_lost ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.9)' }}>
                          <Ionicons name="alert-circle" size={11} color="#FFFFFF" />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{t('documents:lost')}</Text>
                        </View>
                      ) : doc.is_verified ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(22,163,74,0.9)' }}>
                          <Ionicons name="checkmark-circle" size={11} color="#FFFFFF" />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{t('documents:certified')}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Type badge top-left */}
                    <View style={{ position: 'absolute', top: 12, left: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: isArchived ? 'rgba(107,114,128,0.9)' : 'rgba(255,255,255,0.9)' }}>
                        <Ionicons name={isArchived ? 'archive-outline' : (getIcon(doc.type_doc) as any)} size={12} color={isArchived ? '#FFFFFF' : colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isArchived ? '#FFFFFF' : colors.text }}>
                          {isArchived ? t('documents:archived') : (doc.type_doc || t('documents:document'))}
                        </Text>
                      </View>
                    </View>

                    {isArchived && (
                      <View style={{ position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(107,114,128,0.9)' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{t('documents:archived').toUpperCase()}</Text>
                      </View>
                    )}

                    {/* Bottom info overlay on image */}
                    {hasPhoto && (
                      <View style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 }} numberOfLines={1}>
                          {doc.nom_sur_doc || doc.type_doc || t('documents:document')}
                        </Text>
                        {doc.numero_doc && (
                          <Text style={{
                            fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)',
                            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                          }} numberOfLines={1}>
                            {doc.numero_doc}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Bottom Info Bar (below image) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      {isArchived ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="archive-outline" size={13} color={colors.textSecondary} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                            {t('documents:archived')}{doc.archived_at ? ` ${t('documents:on')} ${new Date(doc.archived_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                          </Text>
                        </View>
                      ) : doc.date_expiration ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={new Date(doc.date_expiration).getTime() < Date.now() ? colors.danger : colors.textSecondary}
                          />
                          <Text style={{
                            fontSize: 12, fontWeight: '600',
                            color: new Date(doc.date_expiration).getTime() < Date.now() ? colors.danger : colors.textSecondary,
                          }}>
                            {new Date(doc.date_expiration).getTime() < Date.now()
                              ? t('documents:expired')
                              : new Date(doc.date_expiration).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            }
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="infinite-outline" size={13} color={colors.textSecondary} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{t('documents:permanent')}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#C4BAB0" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 3-Step Creation Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeAdd}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={closeAdd}>
          <Pressable style={{ backgroundColor: colors.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', marginBottom: insets.bottom + 8 }} onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('documents:registerDocument')}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {step === 1 ? t('documents:step1') : step === 2 ? t('documents:step2') : t('documents:step3')}
                </Text>
              </View>
              <Pressable onPress={closeAdd} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: '#E0D5C4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Step Progress Bar */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, gap: 6 }}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: s <= step ? colors.primary : colors.border,
                  }}
                />
              ))}
            </View>

            {/* Scrollable Step Form */}
            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
              
              {/* STEP 1: SELECT DOCUMENT TYPE */}
              {step === 1 && (
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    {t('documents:chooseValidity')}
                  </Text>

                  <View style={{ gap: 10 }}>
                    <Pressable onPress={() => handleValidityChange('EXPIRING')} style={{ padding: 16, borderRadius: 16, borderWidth: 2, borderColor: validityOption === 'EXPIRING' ? colors.primary : colors.border, backgroundColor: validityOption === 'EXPIRING' ? colors.warningBg : colors.backgroundElement }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{t('documents:expirable')}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{t('documents:expirableDesc')}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleValidityChange('PERMANENT')} style={{ padding: 16, borderRadius: 16, borderWidth: 2, borderColor: validityOption === 'PERMANENT' ? colors.primary : colors.border, backgroundColor: validityOption === 'PERMANENT' ? colors.warningBg : colors.backgroundElement }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{t('documents:permanent')}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{t('documents:permanentDesc')}</Text>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 30, marginBottom: 20 }}>
                    <Button
                      title={t('documents:next')}
                      onPress={handleNextStep}
                      disabled={!validityOption}
                      icon="arrow-forward-outline"
                      iconPosition="right"
                    />
                  </View>
                </View>
              )}

              {/* STEP 2: DOCUMENT DETAILS & PHOTO UPLOAD */}
              {step === 2 && (
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    {t('documents:typeAndInfo')}
                  </Text>

                  {loadingTypes ? (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>{t('documents:loadingTypes')}</Text>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                        {t('documents:documentType')} {validityOption === 'EXPIRING' ? `(${t('documents:expirable')})` : `(${t('documents:permanent')})`}
                      </Text>

                      <Pressable onPress={() => setShowTypePicker(prev => !prev)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.backgroundElement }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: form.type_id ? colors.text : colors.textSecondary }}>
                          {form.type_id === 'AUTRES' ? t('documents:otherDocument') : (selectedDocType?.nom || t('documents:chooseType'))}
                        </Text>
                        <Ionicons name={showTypePicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                      </Pressable>

                      {showTypePicker && (
                        <View style={{ marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundElement, overflow: 'hidden' }}>
                          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                            {availableDocTypes.map((dt) => {
                              const selected = form.type_id === dt.id;
                              return (
                                <Pressable
                                  key={dt.id}
                                  onPress={() => {
                                    updateForm('type_id', dt.id);
                                    if (form.date_delivrance && (dt.delai_expiration_mois ?? 0) > 0) {
                                      updateForm('date_expiration', addMonths(form.date_delivrance, dt.delai_expiration_mois ?? 0));
                                    }
                                    setShowTypePicker(false);
                                  }}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', backgroundColor: selected ? colors.warningBg : colors.backgroundElement }}
                                >
                                  <Ionicons name={getIcon(dt.nom) as any} size={16} color={selected ? colors.primary : colors.textSecondary} />
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? '#92400E' : '#374151' }}>{dt.nom}</Text>
                                </Pressable>
                              );
                            })}
                            <Pressable
                              onPress={() => {
                                updateForm('type_id', 'AUTRES');
                                setShowTypePicker(false);
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: form.type_id === 'AUTRES' ? colors.warningBg : colors.backgroundElement }}
                            >
                              <Ionicons name="create-outline" size={16} color={form.type_id === 'AUTRES' ? colors.primary : colors.textSecondary} />
                              <Text style={{ fontSize: 14, fontWeight: '700', color: form.type_id === 'AUTRES' ? '#92400E' : '#374151' }}>{t('documents:otherDocument')}</Text>
                            </Pressable>
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                  
                  <Input
                    label={t('documents:customType')}
                    placeholder={t('documents:documentName')}
                    icon="create-outline"
                    value={form.custom_type_name}
                    onChangeText={(v) => updateForm('custom_type_name', v)}
                    error={formErrors.custom_type_name}
                    containerStyle={{ display: form.type_id === 'AUTRES' ? 'flex' : 'none' }}
                  />

                  <Input
                    label={t('documents:fullName')}
                    placeholder={t('documents:fullNamePlaceholder')}
                    icon="person-outline"
                    value={form.nom_sur_doc}
                    onChangeText={(v) => updateForm('nom_sur_doc', v)}
                    error={formErrors.nom_sur_doc}
                  />

                  <View style={{ marginTop: 12 }}>
                    <Input
                      label={t('documents:documentNumber')}
                      placeholder={t('documents:documentNumberPlaceholder')}
                      icon="barcode-outline"
                      value={form.numero_doc}
                      onChangeText={(v) => updateForm('numero_doc', v)}
                      error={formErrors.numero_doc}
                    />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Input
                      label={t('documents:issuingAuthority')}
                      placeholder={t('documents:issuingAuthorityPlaceholder')}
                      icon="business-outline"
                      value={form.nom_autorite}
                      onChangeText={(v) => updateForm('nom_autorite', v)}
                    />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Input
                      label={t('documents:notes')}
                      placeholder={t('documents:notesPlaceholder')}
                      icon="document-text-outline"
                      value={form.notes}
                      onChangeText={(v) => updateForm('notes', v)}
                    />
                  </View>
                  {validityOption === 'EXPIRING' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <DatePickerInput 
                          label={t('documents:issueDate')} 
                          value={form.date_delivrance ? new Date(form.date_delivrance) : new Date()} 
                          onChange={(d) => updateIssuedDate(d.toISOString().split('T')[0])} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <DatePickerInput 
                          label={t('documents:expiryDate')} 
                          value={form.date_expiration ? new Date(form.date_expiration) : new Date()} 
                          onChange={(d) => updateForm('date_expiration', d.toISOString().split('T')[0])}
                        />
                      </View>
                    </View>
                  )}

                  {/* Photo Section */}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 }}>
                    {t('documents:documentPhotos')}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Recto Card */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>{t('documents:photoRecto')}</Text>
                      {form.photo_recto ? (
                        <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EAE0' }}>
                          <Image source={{ uri: form.photo_recto }} style={{ width: '100%', height: 110, resizeMode: 'cover' }} />
                          <Pressable
                            onPress={() => handleScanDocument('photo_recto')}
                            style={{
                              position: 'absolute', bottom: 4, right: 4,
                              backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 8
                            }}
                          >
                            <Ionicons name="scan" size={14} color="#FFF" />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleScanDocument('photo_recto')}
                          style={{
                            height: 110, borderRadius: 14, borderWidth: 1.5, borderColor: '#C4BAB0',
                            borderStyle: 'dashed', backgroundColor: '#FAFAFA',
                            alignItems: 'center', justifyContent: 'center', gap: 6
                          }}
                        >
                          <Ionicons name="scan-outline" size={24} color={colors.textSecondary} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{t('documents:scanRecto')}</Text>
                        </Pressable>
                      )}
                      {formErrors.photo_recto ? <Text style={{ marginTop: 6, fontSize: 11, fontWeight: '700', color: colors.danger }}>{formErrors.photo_recto}</Text> : null}
                    </View>

                    {/* Verso Card */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>{t('documents:photoVerso')}</Text>
                      {form.photo_verso ? (
                        <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EAE0' }}>
                          <Image source={{ uri: form.photo_verso }} style={{ width: '100%', height: 110, resizeMode: 'cover' }} />
                          <Pressable
                            onPress={() => handleScanDocument('photo_verso')}
                            style={{
                              position: 'absolute', bottom: 4, right: 4,
                              backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 8
                            }}
                          >
                            <Ionicons name="scan" size={14} color="#FFF" />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleScanDocument('photo_verso')}
                          style={{
                            height: 110, borderRadius: 14, borderWidth: 1.5, borderColor: '#C4BAB0',
                            borderStyle: 'dashed', backgroundColor: '#FAFAFA',
                            alignItems: 'center', justifyContent: 'center', gap: 6
                          }}
                        >
                          <Ionicons name="scan-outline" size={24} color={colors.textSecondary} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{t('documents:scanVerso')}</Text>
                        </Pressable>
                      )}
                      {formErrors.photo_verso ? <Text style={{ marginTop: 6, fontSize: 11, fontWeight: '700', color: colors.danger }}>{formErrors.photo_verso}</Text> : null}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Button title={t('documents:back')} variant="outline" onPress={handlePrevStep} />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Button title={t('documents:next')} onPress={handleNextStep} icon="arrow-forward-outline" iconPosition="right" />
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 3: RECAP & CERTIFY */}
              {step === 3 && (
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    {t('documents:recap')}
                  </Text>
                  
                  {/* Summary Box */}
                  <View style={{ backgroundColor: '#FAF7F2', borderRadius: 16, padding: 16, borderStyle: 'solid', borderWidth: 1, borderColor: colors.border, gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:validity')}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{validityOption === 'PERMANENT' ? t('documents:permanent') : t('documents:expirable')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:type')}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{isCustomType ? (form.custom_type_name || t('documents:otherDocument')) : (selectedDocType?.nom || t('documents:document'))}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:number')}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{form.numero_doc}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:fullNameLabel')}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{form.nom_sur_doc}</Text>
                    </View>
                    {form.nom_autorite ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:authority')}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{form.nom_autorite}</Text>
                      </View>
                    ) : null}
                    {validityOption === 'EXPIRING' && form.date_delivrance ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:issuedOn')}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{form.date_delivrance}</Text>
                      </View>
                    ) : null}
                    {validityOption === 'EXPIRING' && form.date_expiration ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('documents:expiresOn')}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{form.date_expiration}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Summary Photos */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    {form.photo_recto ? (
                      <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EAE0' }}>
                        <Image source={{ uri: form.photo_recto }} style={{ width: '100%', height: 80, resizeMode: 'cover' }} />
                        <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', backgroundColor: colors.backgroundElement, paddingVertical: 2 }}>{t('documents:recto')}</Text>
                      </View>
                    ) : null}
                    {form.photo_verso ? (
                      <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EAE0' }}>
                        <Image source={{ uri: form.photo_verso }} style={{ width: '100%', height: 80, resizeMode: 'cover' }} />
                        <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', backgroundColor: colors.backgroundElement, paddingVertical: 2 }}>{t('documents:verso')}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Certification check row */}
                  <Pressable
                    onPress={() => setCertify(!certify)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: 24,
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: certify ? '#E8F5EE' : '#FAFAFA',
                      borderWidth: 1.5,
                      borderColor: certify ? '#10B981' : '#F0EAE0'
                    }}
                  >
                    <Ionicons
                      name={certify ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={certify ? '#10B981' : colors.textSecondary}
                    />
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: certify ? colors.greenDark : colors.textSecondary, lineHeight: 18 }}>
                      {t('documents:certifyText')}
                    </Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Button title={t('documents:back')} variant="outline" onPress={handlePrevStep} />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Button
                        title={t('documents:certifyAndSave')}
                        onPress={handleSubmit}
                        loading={saving}
                        disabled={!certify}
                        icon="checkmark-circle-outline"
                      />
                    </View>
                  </View>
                </View>
              )}

            </ScrollView>
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
