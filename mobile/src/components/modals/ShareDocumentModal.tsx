import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, Alert, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Share as RNShare } from 'react-native';
import { documentsService } from '@/core/api/documentsService';
import type { ShareResponse } from '@/core/api/documentsService';

const DURATIONS = [
  { label: '1 jour', value: 1 },
  { label: '7 jours', value: 7 },
  { label: '30 jours', value: 30 },
  { label: 'Aucune limite', value: null },
];

interface ShareDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  documentName?: string;
}

export function ShareDocumentModal({ visible, onClose, documentId, documentName }: ShareDocumentModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(7);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [error, setError] = useState('');

  const handleGenerateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentsService.createShare(documentId, selectedDuration ?? undefined);
      if (res.success && res.data) {
        setShareData(res.data);
      } else {
        setError(res.message || 'Erreur lors de la génération du lien');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareData?.shareUrl) return;
    await Clipboard.setStringAsync(shareData.shareUrl);
    if (Platform.OS === 'android') {
      Alert.alert('Lien copié', 'Le lien de partage a été copié dans le presse-papier.');
    } else {
      Alert.alert('Lien copié', 'Le lien de partage a été copié.');
    }
  };

  const handleNativeShare = async () => {
    if (!shareData?.shareUrl) return;
    try {
      await RNShare.share({
        message: `👋 Voici mon document "${documentName || 'Document'}" sauvegardé sur Docmaster.\n\n🔗 ${shareData.shareUrl}`,
        url: shareData.shareUrl,
      });
    } catch {}
  };

  const handleReset = () => {
    setShareData(null);
    setError('');
    setSelectedDuration(7);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Aucune limite';
    try {
      return new Date(expiresAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
          paddingHorizontal: 20,
          paddingBottom: Platform.OS === 'ios' ? 60 : 44,
          maxHeight: '85%',
        }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          {!shareData ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>Partager le document</Text>
                <Pressable onPress={handleClose} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color="#9CA3AF" />
                </Pressable>
              </View>

              <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20, lineHeight: 18 }}>
                Générez un lien sécurisé pour partager ce document. Vous pouvez définir une durée de validité.
              </Text>

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Durée de validité
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d.label}
                    onPress={() => setSelectedDuration(d.value)}
                    style={{
                      flex: 1,
                      minWidth: 80,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: selectedDuration === d.value ? '#F5A64B' : '#F0F0F0',
                      backgroundColor: selectedDuration === d.value ? '#FFF9F2' : '#FAFAFA',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: selectedDuration === d.value ? '#F5A64B' : '#6B7280',
                    }}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10 }}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: '#EF4444', flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleGenerateLink}
                disabled={loading}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 14, borderRadius: 14,
                  backgroundColor: '#F5A64B',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="link-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {loading ? 'Génération...' : 'Générer le lien'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>Lien généré</Text>
                <Pressable onPress={handleClose} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color="#9CA3AF" />
                </Pressable>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
                  Lien prêt !
                </Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                  {shareData.expires_at
                    ? `Expire le ${formatExpiry(shareData.expires_at)}`
                    : 'Valable indéfiniment'}
                </Text>
              </View>

              <View style={{
                backgroundColor: '#FAFAFA',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#F0F0F0',
                padding: 12,
                marginBottom: 16,
              }}>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 12, color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}
                >
                  {shareData.shareUrl}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={handleCopyLink}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    paddingVertical: 14, borderRadius: 14,
                    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color="#6B7280" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280' }}>Copier</Text>
                </Pressable>
                <Pressable
                  onPress={handleNativeShare}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    paddingVertical: 14, borderRadius: 14,
                    backgroundColor: '#FFF9F2', borderWidth: 1, borderColor: '#FFE2B7',
                  }}
                >
                  <Ionicons name="share-outline" size={16} color="#F5A64B" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#F5A64B' }}>Partager</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleReset}
                style={{ alignItems: 'center', paddingVertical: 12, marginTop: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>
                  Générer un nouveau lien
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}