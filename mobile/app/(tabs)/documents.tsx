import React, { useEffect, useState, useCallback, useRef } from 'react';
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

function getIcon(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('cni')) return 'id-card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome')) return 'school-outline';
  if (t.includes('acte')) return 'document-text-outline';
  return 'document-outline';
}

const SCREEN = Dimensions.get('window');
const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

const EMPTY_FORM = {
  type_id: '',
  numero_doc: '',
  nom_sur_doc: '',
  date_delivrance: '',
  date_expiration: '',
  notes: '',
  photo_recto: '',
  photo_verso: '',
};

export default function DocumentsScreen() {
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

  const uniqueTypes = [...new Set(docs.map(d => d.type_doc).filter(Boolean))] as string[];

  const filteredDocs = docs.filter((doc) => {
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
      if (res.success && res.data) setDocs(res.data);
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
    setShowAddModal(true);
  };

  const closeAdd = () => {
    setShowAddModal(false);
    setStep(1);
  };

  const handleScanDocument = async (side: 'photo_recto' | 'photo_verso') => {
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 85,
        documentScannerOptions: {
          detectionMode: 'auto',
          enableAutoCrop: true,
        },
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        updateForm(side, scannedImages[0]);
      } else if (status === 'failed') {
        Alert.alert('Erreur', 'Une erreur est survenue lors du scan.');
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      Alert.alert('Erreur', 'Impossible de lancer le scanner.');
    }
  };

  const handleSubmit = async () => {
    if (!certify) {
      Alert.alert('Certification requise', 'Veuillez certifier que les informations sont authentiques.');
      return;
    }

    setSaving(true);
    try {
      const typeName = docTypes.find(dt => dt.id === form.type_id)?.nom || form.type_id;
      const payload = {
        type_doc: typeName,
        numero_doc: form.numero_doc,
        nom_sur_doc: form.nom_sur_doc,
        date_delivrance: form.date_delivrance || undefined,
        date_expiration: form.date_expiration || undefined,
        photo_recto: form.photo_recto || undefined,
        photo_verso: form.photo_verso || undefined,
        notes: form.notes || undefined,
      };

      const res = await documentsService.register(payload);
      if (res.success) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Document enregistré avec succès !', ToastAndroid.SHORT);
        } else {
          Alert.alert('Succès', 'Document enregistré avec succès !');
        }
        closeAdd();
        fetchData();
      } else {
        Alert.alert('Erreur', res.message || 'Une erreur est survenue lors de l\'enregistrement.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur réseau lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!form.type_id) {
        Alert.alert('Type requis', 'Veuillez sélectionner un type de document.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const errs: Record<string, string> = {};
      if (!form.nom_sur_doc.trim()) errs.nom_sur_doc = 'Requis';
      if (!form.numero_doc.trim()) errs.numero_doc = 'Requis';
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

  if (loading) {
    return <DocumentsSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A64B" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <ThemedText style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>Mes documents</ThemedText>
              <ThemedText style={{ fontSize: 13, color: '#9CA3AF' }}>Tous vos documents enregistrés</ThemedText>
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
              <Ionicons name="add" size={24} color="#F5A64B" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#F5F5F5', borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 12,
            marginBottom: 16, gap: 10,
          }}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 14, color: '#1A1A1A', padding: 0 }}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
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
                  backgroundColor: !selectedType ? '#F5A64B' : (pressed ? '#F5F5F5' : '#FAFAFA'),
                  borderWidth: 1, borderColor: !selectedType ? '#F5A64B' : '#E5E7EB',
                })}
              >
                <Ionicons name="layers-outline" size={14} color={!selectedType ? '#FFFFFF' : '#6B7280'} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: !selectedType ? '#FFFFFF' : '#6B7280' }}>
                  Tous
                </Text>
                <View style={{
                  backgroundColor: !selectedType ? 'rgba(255,255,255,0.3)' : '#F0F0F0',
                  paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: !selectedType ? '#FFFFFF' : '#6B7280' }}>
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
                      backgroundColor: active ? '#F5A64B' : (pressed ? '#F5F5F5' : '#FAFAFA'),
                      borderWidth: 1, borderColor: active ? '#F5A64B' : '#E5E7EB',
                    })}
                  >
                    <Ionicons
                      name={getIcon(type) as any}
                      size={14}
                      color={active ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : '#6B7280' }}>
                      {type}
                    </Text>
                    <View style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.3)' : '#F0F0F0',
                      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : '#6B7280' }}>
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
          <View style={{ marginHorizontal: 20, backgroundColor: '#FAFAFA', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', padding: 40, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text-outline" size={30} color="#F5A64B" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>Aucun document</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
              Enregistrez vos documents pour les sécuriser
            </Text>
          </View>
        ) : filteredDocs.length === 0 ? (
          <View style={{ marginHorizontal: 20, backgroundColor: '#FAFAFA', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', padding: 40, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search-outline" size={30} color="#9CA3AF" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>Aucun résultat</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
              Aucun document ne correspond à votre recherche
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            {filteredDocs.map((doc) => {
              const hasPhoto = !!doc.photo_recto;
              return (
                <Pressable
                  key={doc.id}
                  onPress={() => router.push(`/document/${doc.id}`)}
                  style={({ pressed }) => ({
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: pressed ? '#F5A64B' : '#EAE3D8',
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
                          <Ionicons name={getIcon(doc.type_doc) as any} size={28} color="#F5A64B" />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#C4BAB0' }}>Aucune photo</Text>
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
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>Perdu</Text>
                        </View>
                      ) : doc.is_verified ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(22,163,74,0.9)' }}>
                          <Ionicons name="checkmark-circle" size={11} color="#FFFFFF" />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>Certifié</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Type badge top-left */}
                    <View style={{ position: 'absolute', top: 12, left: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                        <Ionicons name={getIcon(doc.type_doc) as any} size={12} color="#F5A64B" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>
                          {doc.type_doc || 'Document'}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom info overlay on image */}
                    {hasPhoto && (
                      <View style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 }} numberOfLines={1}>
                          {doc.nom_sur_doc || doc.type_doc || 'Document'}
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
                      {doc.date_expiration ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={new Date(doc.date_expiration).getTime() < Date.now() ? '#EF4444' : '#9CA3AF'}
                          />
                          <Text style={{
                            fontSize: 12, fontWeight: '600',
                            color: new Date(doc.date_expiration).getTime() < Date.now() ? '#EF4444' : '#9CA3AF',
                          }}>
                            {new Date(doc.date_expiration).getTime() < Date.now()
                              ? 'Expiré'
                              : new Date(doc.date_expiration).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            }
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="infinite-outline" size={13} color="#9CA3AF" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF' }}>Permanent</Text>
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
          <Pressable style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }} onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>Enregistrer un document</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  {step === 1 ? 'Étape 1 : Choisir le type' : step === 2 ? 'Étape 2 : Saisir les détails' : 'Étape 3 : Certification'}
                </Text>
              </View>
              <Pressable onPress={closeAdd} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: '#E0D5C4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color="#6B7280" />
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
                    backgroundColor: s <= step ? PRIMARY : '#E5E7EB',
                  }}
                />
              ))}
            </View>

            {/* Scrollable Step Form */}
            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
              
              {/* STEP 1: SELECT DOCUMENT TYPE */}
              {step === 1 && (
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    Quel document voulez-vous sauvegarder ?
                  </Text>
                  
                  {loadingTypes ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={PRIMARY} />
                      <Text style={{ marginTop: 10, color: '#9CA3AF', fontSize: 13 }}>Chargement des types...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {docTypes.map((dt) => {
                        const selected = form.type_id === dt.id;
                        return (
                          <Pressable
                            key={dt.id}
                            onPress={() => updateForm('type_id', dt.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              padding: 16,
                              borderRadius: 14,
                              borderWidth: 2,
                              borderColor: selected ? PRIMARY : '#F0EAE0',
                              backgroundColor: selected ? '#FFF9F2' : '#FFFFFF',
                              width: (SCREEN.width - 50) / 2, // 2 columns
                            }}
                          >
                            <View style={{
                              width: 32, height: 32, borderRadius: 8,
                              backgroundColor: selected ? 'rgba(245,166,75,0.2)' : '#F5F5F5',
                              alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Ionicons name={getIcon(dt.nom) as any} size={16} color={selected ? PRIMARY : '#6B7280'} />
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? '#92400E' : '#374151', flex: 1 }} numberOfLines={1}>
                              {dt.nom}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View style={{ marginTop: 30, marginBottom: 20 }}>
                    <Button
                      title="Suivant"
                      onPress={handleNextStep}
                      disabled={!form.type_id}
                      icon="arrow-forward-outline"
                      iconPosition="right"
                    />
                  </View>
                </View>
              )}

              {/* STEP 2: DOCUMENT DETAILS & PHOTO UPLOAD */}
              {step === 2 && (
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    Informations du document
                  </Text>
                  
                  <Input
                    label="Nom complet sur le document *"
                    placeholder="Nom complet"
                    icon="person-outline"
                    value={form.nom_sur_doc}
                    onChangeText={(v) => updateForm('nom_sur_doc', v)}
                    error={formErrors.nom_sur_doc}
                  />

                  <View style={{ marginTop: 12 }}>
                    <Input
                      label="Numéro du document *"
                      placeholder="Ex: CNI, N° de passeport, etc."
                      icon="barcode-outline"
                      value={form.numero_doc}
                      onChangeText={(v) => updateForm('numero_doc', v)}
                      error={formErrors.numero_doc}
                    />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Input
                      label="Notes"
                      placeholder="Ajouter des notes ou remarques..."
                      icon="document-text-outline"
                      value={form.notes}
                      onChangeText={(v) => updateForm('notes', v)}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <DatePickerInput 
                        label="Date de délivrance" 
                        value={form.date_delivrance ? new Date(form.date_delivrance) : new Date()} 
                        onChange={(d) => updateForm('date_delivrance', d.toISOString().split('T')[0])} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DatePickerInput 
                        label="Date d'expiration" 
                        value={form.date_expiration ? new Date(form.date_expiration) : new Date()} 
                        onChange={(d) => updateForm('date_expiration', d.toISOString().split('T')[0])} 
                      />
                    </View>
                  </View>

                  {/* Photo Section */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 }}>
                    Photos du document
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Recto Card */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 6 }}>Photo Recto</Text>
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
                          <Ionicons name="scan-outline" size={24} color="#9CA3AF" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF' }}>Scanner Recto</Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Verso Card */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 6 }}>Photo Verso</Text>
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
                          <Ionicons name="scan-outline" size={24} color="#9CA3AF" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF' }}>Scanner Verso</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Button title="Retour" variant="outline" onPress={handlePrevStep} />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Button title="Suivant" onPress={handleNextStep} icon="arrow-forward-outline" iconPosition="right" />
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 3: RECAP & CERTIFY */}
              {step === 3 && (
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    Récapitulatif des données
                  </Text>
                  
                  {/* Summary Box */}
                  <View style={{ backgroundColor: '#FAF7F2', borderRadius: 16, padding: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#EAE3D8', gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Type :</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                        {docTypes.find(dt => dt.id === form.type_id)?.nom || 'Document'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Numéro :</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{form.numero_doc}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Nom complet :</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{form.nom_sur_doc}</Text>
                    </View>
                    {form.date_delivrance ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Délivré le :</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{form.date_delivrance}</Text>
                      </View>
                    ) : null}
                    {form.date_expiration ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Expire le :</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{form.date_expiration}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Summary Photos */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    {form.photo_recto ? (
                      <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EAE0' }}>
                        <Image source={{ uri: form.photo_recto }} style={{ width: '100%', height: 80, resizeMode: 'cover' }} />
                        <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', backgroundColor: '#FFF', paddingVertical: 2 }}>Recto</Text>
                      </View>
                    ) : null}
                    {form.photo_verso ? (
                      <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EAE0' }}>
                        <Image source={{ uri: form.photo_verso }} style={{ width: '100%', height: 80, resizeMode: 'cover' }} />
                        <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', backgroundColor: '#FFF', paddingVertical: 2 }}>Verso</Text>
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
                      color={certify ? '#10B981' : '#9CA3AF'}
                    />
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: certify ? '#1E3A2F' : '#6B7280', lineHeight: 18 }}>
                      Je certifie que toutes les informations saisies sont authentiques et correctes.
                    </Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Button title="Retour" variant="outline" onPress={handlePrevStep} />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Button
                        title="Certifier & Enregistrer"
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
    </SafeAreaView>
  );
}
