import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ToastAndroid } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentsService } from '@/core/api/documentsService';
import type { Document } from '@/types';
import { ShareDocumentModal } from '@/components/modals/ShareDocumentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

function getDocIcon(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toLowerCase();
  if (t.includes('cni') || t.includes('carte')) return 'card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome') || t.includes('école')) return 'school-outline';
  return 'document-text-outline';
}

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return s;
  }
}

function timeAgo(dateString?: string) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return new Date(dateString).toLocaleDateString('fr-FR');
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchDoc = useCallback(async () => {
    if (!id) return;
    try {
      const res = await documentsService.getAll();
      if (res.success && res.data) {
        const found = res.data.find(d => d.id === id);
        if (found) setDoc(found);
        else setError(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const photos: string[] = [];
  if (doc?.photo_recto) photos.push(doc.photo_recto);
  if (doc?.photo_verso) photos.push(doc.photo_verso);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(index);
  };

  const handleDelete = async () => {
    if (!id) return;
    Alert.alert(
      'Supprimer le document',
      'Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await documentsService.delete(id);
              if (res.success) {
                if (Platform.OS === 'android') {
                  ToastAndroid.show('Document supprimé', ToastAndroid.SHORT);
                } else {
                  Alert.alert('Succès', 'Document supprimé avec succès.');
                }
                router.back();
              } else {
                Alert.alert('Erreur', res.message || 'Impossible de supprimer le document.');
              }
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la suppression.');
            }
          },
        },
      ],
    );
  };

  const handleReportLost = async () => {
    if (!id) return;
    try {
      await documentsService.reportLost(id);
      setDoc(prev => prev ? { ...prev, is_lost: true } : prev);
    } catch {}
  };

  const handleDownloadPDF = async () => {
    if (!doc) return;

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 24px;
              color: #1a1a1a;
              background-color: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #F5A64B;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              color: #1a1a1a;
            }
            .subtitle {
              font-size: 14px;
              color: #9CA3AF;
              margin-top: 4px;
            }
            .section {
              margin-bottom: 24px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              color: #F5A64B;
              border-bottom: 1px solid #E5E7EB;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #F3F4F6;
            }
            .info-label {
              font-size: 12px;
              color: #6B7280;
            }
            .info-value {
              font-size: 13px;
              font-weight: bold;
              color: #1F2937;
            }
            .images-container {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin-top: 20px;
              page-break-before: always;
            }
            .image-card {
              border: 1px solid #E5E7EB;
              border-radius: 12px;
              overflow: hidden;
              text-align: center;
              background: #F9FAFB;
              padding: 12px;
            }
            .image-title {
              font-size: 12px;
              font-weight: bold;
              color: #6B7280;
              margin-bottom: 8px;
            }
            .document-img {
              max-width: 100%;
              max-height: 300px;
              object-fit: contain;
              border-radius: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 11px;
              color: #9CA3AF;
              border-top: 1px solid #E5E7EB;
              padding-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${doc.nom_sur_doc || doc.type_doc || 'Document'}</h1>
            <p class="subtitle">Sauvegardé sur Docmaster</p>
          </div>

          <div class="section">
            <div class="section-title">Informations du document</div>
            <div class="info-row">
              <span class="info-label">Type</span>
              <span class="info-value">${doc.type_doc || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Numéro</span>
              <span class="info-value">${doc.numero_doc || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nom complet</span>
              <span class="info-value">${doc.nom_sur_doc || '—'}</span>
            </div>
            ${doc.date_delivrance ? `
            <div class="info-row">
              <span class="info-label">Date de délivrance</span>
              <span class="info-value">${formatDate(doc.date_delivrance)}</span>
            </div>
            ` : ''}
            ${doc.date_expiration ? `
            <div class="info-row">
              <span class="info-label">Date d'expiration</span>
              <span class="info-value">${formatDate(doc.date_expiration)}</span>
            </div>
            ` : ''}
            ${doc.nom_autorite ? `
            <div class="info-row">
              <span class="info-label">Autorité</span>
              <span class="info-value">${doc.nom_autorite}</span>
            </div>
            ` : ''}
          </div>

          ${doc.notes ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <p style="font-size: 13px; line-height: 18px; color: #4B5563; margin: 0;">${doc.notes}</p>
          </div>
          ` : ''}

          ${(doc.photo_recto || doc.photo_verso) ? `
          <div class="images-container">
            <div class="section-title" style="page-break-after: avoid;">Photos des pièces justificatives</div>

            ${doc.photo_recto ? `
            <div class="image-card">
              <div class="image-title">Recto / Face Avant</div>
              <img class="document-img" src="${doc.photo_recto}" />
            </div>
            ` : ''}

            ${doc.photo_verso ? `
            <div class="image-card">
              <div class="image-title">Verso / Face Arrière</div>
              <img class="document-img" src="${doc.photo_verso}" />
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="footer">
            Docmaster - Document sauvegardé de manière sécurisée.<br/>
            Généré le ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        } else {
          Alert.alert('Erreur', "Impossible d'ouvrir la fenêtre d'impression. Veuillez vérifier vos bloqueurs de pop-up.");
        }
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Télécharger ${doc.nom_sur_doc || 'Document'}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Impression terminée', `Le fichier PDF a été généré avec succès : ${fileUri}`);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de générer le fichier PDF.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (error || !doc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, marginBottom: 20 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: pressed ? '#F5F5F5' : '#FAFAFA',
              borderWidth: 1, borderColor: '#F0F0F0',
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Ionicons name="arrow-back" size={18} color="#1A1A1A" />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A' }}>Document</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>Document introuvable</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
            Ce document n'existe pas ou a été supprimé.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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

            {/* Gradient overlay at bottom for back button */}
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
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={handleDownloadPDF}
                  style={({ pressed }) => ({
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: pressed ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
                    alignItems: 'center', justifyContent: 'center',
                  })}
                >
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                </Pressable>
                {!doc.is_lost && (
                  <Pressable
                    onPress={handleReportLost}
                    style={({ pressed }) => ({
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: pressed ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
                      alignItems: 'center', justifyContent: 'center',
                    })}
                  >
                    <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Pagination Dots */}
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
          /* No photo placeholder */
          <View style={{
            width: SCREEN_WIDTH,
            height: SCREEN_WIDTH * 0.45,
            backgroundColor: '#FAF7F2',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24,
              backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: '#FFE2B7',
            }}>
              <Ionicons name={getDocIcon(doc.type_doc)} size={36} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 12 }}>Aucune photo</Text>

            {/* Back button for no-photo case */}
            <View style={{
              position: 'absolute',
              top: 16, left: 20,
            }}>
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

        {/* Content below the photo */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Title & Type */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>
              {doc.nom_sur_doc || doc.type_doc || 'Document'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>
                {doc.type_doc || 'Type inconnu'}
              </Text>
              {doc.numero_doc && (
                <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
                  • {doc.numero_doc}
                </Text>
              )}
            </View>
          </View>

          {/* Status Badges */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {doc.is_lost && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Perdu</Text>
              </View>
            )}
            {doc.is_verified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Certifié</Text>
              </View>
            )}
            {!doc.is_lost && !doc.is_verified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}>
                <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Actif</Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={{
            backgroundColor: '#FAFAFA', borderRadius: 20, padding: 20,
            borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 16,
          }}>
            {[
              { icon: 'pricetags-outline', label: 'Numéro', value: doc.numero_doc },
              { icon: 'person-outline', label: 'Nom sur document', value: doc.nom_sur_doc },
              { icon: 'calendar-outline', label: 'Délivré le', value: formatDate(doc.date_delivrance) },
              { icon: 'calendar-outline', label: 'Expire le', value: formatDate(doc.date_expiration) },
              { icon: 'business-outline', label: 'Autorité', value: doc.nom_autorite },
              { icon: 'document-text-outline', label: 'Notes', value: doc.notes },
            ].filter((r) => r.value && r.value !== '—').map((row, idx, arr) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0',
                }}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Ionicons name={row.icon as any} size={15} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                    {row.label}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', lineHeight: 20 }}>
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Meta */}
          <Text style={{ fontSize: 11, color: '#C4C4C4', marginBottom: 20 }}>
            Enregistré {timeAgo(doc.created_at)}
          </Text>

          {/* Action Buttons */}
          <View style={{ gap: 10 }}>
            {!doc.is_lost && (
              <Pressable
                onPress={handleReportLost}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 14, borderRadius: 14,
                  backgroundColor: pressed ? '#FEE8E8' : '#FEF2F2',
                  borderWidth: 1, borderColor: '#FECACA',
                })}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Déclarer perdu</Text>
              </Pressable>
            )}
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Supprimer</Text>
            </Pressable>
            <Pressable
              onPress={() => setShareModalVisible(true)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? '#FFF3E0' : '#FFF9F2',
                borderWidth: 1, borderColor: '#FFE2B7',
              })}
            >
              <Ionicons name="share-outline" size={18} color={PRIMARY} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>Partager</Text>
            </Pressable>
            <Pressable
              onPress={handleDownloadPDF}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? '#FFF3E0' : '#FFF9F2',
                borderWidth: 1, borderColor: '#FFE2B7',
              })}
            >
              <Ionicons name="download-outline" size={18} color={PRIMARY} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY }}>Télécharger en PDF</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Retour</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ShareDocumentModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        documentId={doc.id}
        documentName={doc.nom_sur_doc || doc.type_doc}
      />
    </SafeAreaView>
  );
}
