import React, { useCallback } from 'react';
import { View, Text, Pressable, Share, Platform, ToastAndroid, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

interface FoundSuccessScreenProps {
  referenceNumber: string;
}

function FoundSuccessScreenInner({ referenceNumber }: FoundSuccessScreenProps) {
  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(referenceNumber);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Référence copiée', ToastAndroid.SHORT);
    } else {
      Alert.alert('Copié', 'La référence a été copiée.');
    }
  }, [referenceNumber]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `J'ai trouvé un document et je l'ai déclaré sur Docmaster.\nNuméro de déclaration : ${referenceNumber}`,
      });
    } catch {}
  }, [referenceNumber]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={44} color="#16A34A" />
      </View>

      <Text style={styles.title}>
        Déclaration publiée !
      </Text>
      <Text style={styles.subtitle}>
        {'Merci d\u2019avoir signal\u00e9 ce document. Nous esp\u00e9rons qu\'il retrouvera rapidement son propri\u00e9taire.'}
      </Text>

      <View style={styles.refCard}>
        <Text style={styles.refLabel}>
          Numéro de déclaration
        </Text>
        <Text style={styles.refValue}>
          {referenceNumber}
        </Text>
        <View style={styles.refActions}>
          <Pressable
            onPress={handleCopy}
            style={styles.refActionBtn}
          >
            <Ionicons name="copy-outline" size={16} color="#6B7280" />
            <Text style={styles.refActionText}>Copier</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={[styles.refActionBtn, styles.shareBtn]}
          >
            <Ionicons name="share-outline" size={16} color="#F5A64B" />
            <Text style={[styles.refActionText, { color: '#F5A64B' }]}>Partager</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Pressable
          onPress={() => router.replace('/(tabs)/declarations')}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>Mes déclarations</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Nouvelle recherche</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const FoundSuccessScreen = React.memo(FoundSuccessScreenInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#BBF7D0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  refCard: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 8,
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  refActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  refActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  shareBtn: {
    backgroundColor: '#FFF9F2',
    borderColor: '#FFE2B7',
  },
  refActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F5A64B',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
