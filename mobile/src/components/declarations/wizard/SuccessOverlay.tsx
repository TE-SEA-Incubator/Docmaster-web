import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Modal, Animated, TouchableOpacity, Share, Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/common/Button';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import apiClient from '@/core/api/apiClient';

type SuccessOverlayProps = {
  visible: boolean;
  reference: string;
  declarationId?: string;
  docLabel?: string;
  onClose: () => void;
};

export const SuccessOverlay: React.FC<SuccessOverlayProps> = ({
  visible,
  reference,
  declarationId,
  docLabel,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }),
      ]).start();
    } else {
      scale.setValue(0.7);
      opacity.setValue(0);
      checkScale.setValue(0);
    }
  }, [visible]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Ma déclaration de perte${docLabel ? ` (${docLabel})` : ''} a été soumise sur DocMaster.\nRéférence : ${reference}`,
    });
  };

  const handleDownloadPdf = async () => {
    if (!declarationId) {
      Alert.alert('Erreur', 'Identifiant de déclaration manquant.');
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Non disponible', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
      return;
    }

    setDownloadingPdf(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get the auth token from the API client headers
      const baseURL = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
      const token = (apiClient.defaults.headers?.common?.['Authorization'] as string)?.replace('Bearer ', '');

      const pdfPath = `${FileSystem.cacheDirectory}declaration_${reference}.pdf`;

      const downloadResult = await FileSystem.downloadAsync(
        `${baseURL}/declarations/${declarationId}/pdf`,
        pdfPath,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      if (downloadResult.status !== 200) {
        throw new Error(`HTTP ${downloadResult.status}`);
      }

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Déclaration ${reference}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      console.error('[SuccessOverlay] PDF download error:', err);
      Alert.alert(
        'Erreur',
        'Impossible de télécharger le PDF. Vous pourrez le récupérer depuis la page de vos déclarations.',
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleViewDeclarations = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <Animated.View style={[s.card, {
          opacity,
          transform: [{ scale }],
          paddingBottom: insets.bottom + 24,
          backgroundColor: colors.backgroundElement,
        }]}>
          {/* Check icon */}
          <Animated.View style={[s.iconCircle, {
            transform: [{ scale: checkScale }],
            backgroundColor: colors.success,
            shadowColor: colors.success,
          }]}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </Animated.View>

          <ThemedText style={[s.title, { color: colors.text }]}>Déclaration envoyée !</ThemedText>
          <ThemedText style={[s.subtitle, { color: colors.textSecondary }]}>
            {docLabel ? `Votre ${docLabel} a été déclaré perdu.` : 'Votre document a été déclaré perdu.'}{'\n'}
            Conservez votre numéro de référence.
          </ThemedText>

          {/* Reference box */}
          <View style={[s.refBox, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <ThemedText style={[s.refLabel, { color: colors.success }]}>Numéro de référence</ThemedText>
            <ThemedText style={[s.refValue, { color: colors.greenDark }]}>{reference}</ThemedText>
          </View>

          {/* Info */}
          <View style={[s.infoRow, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[s.infoText, { color: colors.textSecondary }]}>
              Gardez ce numéro pour suivre votre déclaration. Le document officiel est disponible en PDF.
            </ThemedText>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            {/* PDF download — primary action */}
            {declarationId && (
              <TouchableOpacity
                onPress={handleDownloadPdf}
                disabled={downloadingPdf}
                activeOpacity={0.85}
                style={[s.pdfBtn, { backgroundColor: colors.greenDark, opacity: downloadingPdf ? 0.7 : 1 }]}
              >
                {downloadingPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                )}
                <ThemedText style={s.pdfBtnText}>
                  {downloadingPdf ? 'Téléchargement…' : 'Télécharger le PDF officiel'}
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Secondary actions */}
            <View style={s.secondaryRow}>
              <TouchableOpacity
                style={[s.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSelected }]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={16} color={colors.tint} />
                <ThemedText style={[s.secondaryBtnText, { color: colors.tint }]}>Partager</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSelected }]}
                onPress={handleViewDeclarations}
                activeOpacity={0.8}
              >
                <Ionicons name="list-outline" size={16} color={colors.tint} />
                <ThemedText style={[s.secondaryBtnText, { color: colors.tint }]}>Mes déclarations</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  refBox: {
    width: '100%', borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1.5,
  },
  refLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  refValue: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, width: '100%',
  },
  infoText: { flex: 1, fontSize: 11.5, lineHeight: 17 },
  actions: { width: '100%', gap: 10, marginTop: 4 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16, width: '100%',
  },
  pdfBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },
});
