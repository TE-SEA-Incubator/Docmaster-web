import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Image, NativeScrollEvent, NativeSyntheticEvent, Dimensions, ToastAndroid, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import type { Declaration } from '@/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return s;
  }
}

function timeAgo(dateString?: string, t?: (key: string, opts?: Record<string, any>) => string) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return t ? t('home:timeAgo.justNow') : "À l'instant";
  if (diff < 3600) return t ? t('home:timeAgo.minutesAgo', { count: Math.floor(diff / 60) }) : `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return t ? t('home:timeAgo.hoursAgo', { count: Math.floor(diff / 3600) }) : `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return t ? t('home:timeAgo.daysAgo', { count: Math.floor(diff / 86400) }) : `Il y a ${Math.floor(diff / 86400)}j`;
  return new Date(dateString).toLocaleDateString('fr-FR');
}

function getStatusMeta(status: string, isLost?: boolean, t?: (key: string) => string) {
  if (status === 'SEARCHING' || status === 'AVAILABLE') return {
    label: isLost ? (t ? t('declarationDetail:statusSearching') : 'En recherche') : (t ? t('declarationDetail:statusWaiting') : 'En attente'),
    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: 'time-outline',
  };
  if (status === 'MATCHED') return {
    label: t ? t('declarationDetail:statusMatched') : 'Match trouvé', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: 'checkmark-circle-outline',
  };
  if (status === 'RETURNED' || status === 'CLAIMED') return {
    label: t ? t('declarationDetail:statusResolved') : 'Résolu', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: 'shield-checkmark-outline',
  };
  if (status === 'CANCELLED') return {
    label: t ? t('declarationDetail:statusCancelled') : 'Annulé', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: 'close-circle-outline',
  };
  return {
    label: t ? t('declarationDetail:statusDraft') : 'Brouillon', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: 'document-outline',
  };
}

function getDocIcon(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toLowerCase();
  if (t.includes('cni') || t.includes('carte')) return 'card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome') || t.includes('école')) return 'school-outline';
  return 'document-text-outline';
}

const URGENCY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Très faible', color: '#9CA3AF' },
  2: { label: 'Faible', color: '#6B7280' },
  3: { label: 'Moyenne', color: '#F59E0B' },
  4: { label: 'Urgente', color: '#F97316' },
  5: { label: 'Très urgente', color: '#EF4444' },
};

export default function DeclarationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [dec, setDec] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const fetchDeclaration = useCallback(async () => {
    if (!id) return;
    try {
      const res = await declarationsService.getById(id);
      if (res.success && res.data) setDec(res.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDeclaration(); }, [fetchDeclaration]);

  const isLost = dec?.declaration_type === 'LOST' || dec?.is_lost;
  const statusMeta = getStatusMeta(dec?.status || '', isLost, t);

  const photos: string[] = [];
  if (dec?.photo_recto) photos.push(dec.photo_recto);
  if (dec?.photo_verso) photos.push(dec.photo_verso);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(index);
  };

  const generatePDF = async () => {
    if (!dec) return;
    const htmlContent = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #F5A64B;">${t('declarationDetail:title')} DocMaster</h1>
          <p><strong>${t('declarationDetail:reference')}:</strong> ${dec.identifiant_doc_dm || '---'}</p>
          <p><strong>${t('declarationDetail:documentType')}:</strong> ${dec.doc_type}</p>
          <p><strong>${t('declarationDetail:date')}:</strong> ${formatDate(dec.created_at)}</p>
          <p><strong>${t('declarationDetail:owner')}:</strong> ${dec.nom_complet || dec.owner_name}</p>
          <p><strong>${t('declarationDetail:description')}:</strong> ${dec.description || '---'}</p>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
      Alert.alert(t('common:error'), t('declarationDetail:pdfError'));
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      t('declarationDetail:deleteTitle'),
      t('declarationDetail:deleteConfirm'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'), style: 'destructive',
          onPress: async () => {
            try {
              const res = await declarationsService.delete(id);
              if (res.success) {
                if (Platform.OS === 'android') ToastAndroid.show(t('declarationDetail:deletedSuccess'), ToastAndroid.SHORT);
                else Alert.alert(t('common:success'), t('declarationDetail:deletedSuccess'));
                router.back();
              } else {
                Alert.alert(t('common:error'), res.message || t('declarationDetail:deleteError'));
              }
            } catch {
              Alert.alert(t('common:error'), t('declarationDetail:deleteException'));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (error || !dec) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: pressed ? '#F5F5F5' : '#FAFAFA',
            borderWidth: 1, borderColor: '#F0F0F0',
            alignItems: 'center', justifyContent: 'center',
          })}>
            <Ionicons name="arrow-back" size={18} color="#1A1A1A" />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A' }}>{t('declarationDetail:title')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{t('declarationDetail:notFound')}</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
            {t('declarationDetail:notFoundDesc')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right']}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Carousel - Full Width */}
        {photos.length > 0 ? (
          <View>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              style={{ width: SCREEN_WIDTH }}
            >
              {photos.map((photo, index) => (
                <View key={index} style={{ width: SCREEN_WIDTH }}>
                  <Image
                    source={{ uri: photo }}
                    style={{
                      width: SCREEN_WIDTH,
                      height: SCREEN_WIDTH * 0.65,
                      resizeMode: 'cover',
                    }}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 80,
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingTop: 16,
              paddingHorizontal: 20,
              justifyContent: 'space-between',
            }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: pressed ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
                  alignItems: 'center', justifyContent: 'center',
                })}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {photos.length > 1 && (
              <View style={{
                position: 'absolute',
                bottom: 12,
                left: 0, right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}>
                {photos.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: activePhotoIndex === index ? 20 : 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: activePhotoIndex === index ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{
            width: SCREEN_WIDTH,
            height: SCREEN_WIDTH * 0.45,
            backgroundColor: '#FAF7F2',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
          }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24,
              backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: '#FFE2B7',
            }}>
              <Ionicons name={getDocIcon(dec.doc_type)} size={36} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 12 }}>{t('declarationDetail:noPhoto')}</Text>
            <View style={{ position: 'absolute', top: 16, left: 20 }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: pressed ? '#F5F5F5' : '#FAFAFA',
                  borderWidth: 1, borderColor: '#F0F0F0',
                  alignItems: 'center', justifyContent: 'center',
                })}
              >
                <Ionicons name="arrow-back" size={18} color="#1A1A1A" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Content below photo */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Status Banner */}
          <View style={{
            backgroundColor: statusMeta.bg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: statusMeta.border,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: statusMeta.color + '20',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={statusMeta.icon as any} size={20} color={statusMeta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: statusMeta.color }}>
                {isLost ? t('declarationDetail:loss') : t('declarationDetail:found')}
              </Text>
              <Text style={{ fontSize: 12, color: statusMeta.color, marginTop: 1 }}>
                {t('declarationDetail:status')} : {statusMeta.label}
              </Text>
            </View>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
              backgroundColor: statusMeta.color + '20',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: statusMeta.color }}>
                {dec.status}
              </Text>
            </View>
          </View>

          {/* Référence & Urgence */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{
              flex: 1, backgroundColor: '#FAFAFA', borderRadius: 12,
              padding: 12, borderWidth: 1, borderColor: '#F0F0F0',
            }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                {t('declarationDetail:reference')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
                {dec.identifiant_doc_dm || dec.reference || '---'}
              </Text>
            </View>
            {dec.urgence && (
              <View style={{
                flex: 1, backgroundColor: '#FAFAFA', borderRadius: 12,
                padding: 12, borderWidth: 1, borderColor: '#F0F0F0',
              }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                  {t('declarationDetail:urgency')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="speedometer-outline" size={14} color={URGENCY_LABELS[dec.urgence]?.color || '#9CA3AF'} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: URGENCY_LABELS[dec.urgence]?.color || '#1A1A1A' }}>
                    {t(`declarationDetail:urgency${dec.urgence}`, { defaultValue: URGENCY_LABELS[dec.urgence]?.label }) || `${dec.urgence}/5`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Informations déclarant */}
          <View style={{
            backgroundColor: '#FAFAFA', borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: '#F0F0F0',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              {t('declarationDetail:info')}
            </Text>
            <View style={{ gap: 10 }}>
              {[
                { icon: 'person-outline', label: t('declarationDetail:fullName'), value: dec.nom_complet || dec.owner_name },
                { icon: 'document-text-outline', label: t('declarationDetail:documentType'), value: dec.docTypeInfo?.nom || dec.doc_type },
                { icon: 'barcode-outline', label: t('declarationDetail:documentNumber'), value: dec.numero_document || dec.document_number },
                { icon: 'calendar-outline', label: isLost ? t('declarationDetail:lossDate') : t('declarationDetail:foundDate'), value: formatDate(isLost ? dec.date_perte : dec.date_trouvee) },
                { icon: 'location-outline', label: t('declarationDetail:location'), value: dec.lieu_perte || dec.lieu_trouvee || dec.found_location },
                { icon: 'map-outline', label: t('declarationDetail:cityRegionCountry'), value: [dec.ville, dec.region, dec.pays].filter(Boolean).join(', ') },
                { icon: 'calendar-outline', label: t('declarationDetail:issueDate'), value: formatDate(dec.date_delivrance) },
                { icon: 'calendar-outline', label: t('declarationDetail:expiryDate'), value: formatDate(dec.date_expiration) },
                { icon: 'document-text-outline', label: t('declarationDetail:physicalState'), value: dec.etat_physique },
              ].filter((r) => r.value && r.value !== '—' && r.value !== '').map((row, idx, arr) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                    paddingBottom: idx < arr.length - 1 ? 10 : 0,
                    borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                    borderBottomColor: '#F0F0F0',
                  }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ionicons name={row.icon as any} size={14} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                      {row.label}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                      {row.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact propriétaire */}
          {(dec.nom_owner || dec.prenom_owner || dec.email_owner || dec.telephone_owner) && (
            <View style={{
              backgroundColor: '#FAFAFA', borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: '#F0F0F0',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                {t('declarationDetail:ownerContact')}
              </Text>
              <View style={{ gap: 10 }}>
                {[
                  { icon: 'person-outline', label: t('declarationDetail:owner'), value: dec.prenom_owner && dec.nom_owner ? `${dec.prenom_owner} ${dec.nom_owner}` : undefined },
                  { icon: 'mail-outline', label: t('common:email'), value: dec.email_owner },
                  { icon: 'call-outline', label: t('common:phone'), value: dec.telephone_owner },
                ].filter((r) => r.value).map((row, idx, arr) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                      paddingBottom: idx < arr.length - 1 ? 10 : 0,
                      borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0F0F0',
                    }}
                  >
                    <View style={{
                      width: 28, height: 28, borderRadius: 8,
                      backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Ionicons name={row.icon as any} size={14} color={PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                        {row.label}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Récompense */}
          {(dec.recompense || dec.recompense_montant) && (
            <View style={{
              backgroundColor: '#FFFBEB', borderRadius: 16,
              padding: 14, borderWidth: 1, borderColor: '#FDE68A',
              marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="gift-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>{t('declarationDetail:reward')}</Text>
                <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                  {dec.recompense === 'yes' && dec.recompense_montant ? `${dec.recompense_montant} FCFA` : dec.recompense || t('common:yes')}
                </Text>
              </View>
            </View>
          )}

          {/* Mode de contact */}
          {dec.mode_contact && (
            <View style={{
              backgroundColor: '#EFF6FF', borderRadius: 12,
              padding: 12, borderWidth: 1, borderColor: '#BFDBFE',
              marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Ionicons name="chatbubbles-outline" size={16} color="#2563EB" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1D4ED8', flex: 1 }}>
                {t('declarationDetail:preferredContact')} : {dec.mode_contact}
              </Text>
            </View>
          )}

          {/* Description */}
          {dec.description && (
            <View style={{
              backgroundColor: '#FAFAFA', borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: '#F0F0F0',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                {t('declarationDetail:description')}
              </Text>
              <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>
                {dec.description}
              </Text>
            </View>
          )}

          {/* Photos recto/verso */}
          {photos.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                {t('declarationDetail:documentPhotos')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {dec.photo_recto && (
                  <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' }}>
                    <Image source={{ uri: dec.photo_recto }} style={{ width: '100%', height: 140, resizeMode: 'cover' }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', backgroundColor: '#FFF', paddingVertical: 3 }}>{t('declarationDetail:recto')}</Text>
                  </View>
                )}
                {dec.photo_verso && (
                  <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' }}>
                    <Image source={{ uri: dec.photo_verso }} style={{ width: '100%', height: 140, resizeMode: 'cover' }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', backgroundColor: '#FFF', paddingVertical: 3 }}>{t('declarationDetail:verso')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Créé le */}
          <Text style={{ fontSize: 11, color: '#C4C4C4', marginBottom: 20 }}>
            {t('declarationDetail:created')} {timeAgo(dec.created_at, t)}
          </Text>

          {/* Actions */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            <Pressable
              onPress={generatePDF}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? '#FFF3E0' : '#FFF3E0',
                borderWidth: 1, borderColor: PRIMARY,
              })}
            >
              <Ionicons name="document-text-outline" size={18} color={PRIMARY} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>{t('declarationDetail:downloadPDF')}</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? '#FEE8E8' : '#FEF2F2',
                borderWidth: 1, borderColor: '#FECACA',
              })}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>{t('common:delete')}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? '#F5F5F5' : '#FAFAFA',
                borderWidth: 1, borderColor: '#F0F0F0',
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>{t('common:back')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}
