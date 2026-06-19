import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';
const SCREEN = Dimensions.get('window');

interface PaymentSuccessModalProps {
  purpose: 'subscription' | 'document';
  amount: number;
  onDismiss: () => void;
}

export default function PaymentSuccessModal({ purpose, amount, onDismiss }: PaymentSuccessModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Triple haptic burst for celebration
    const triggerHaptics = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 400);
    };
    triggerHaptics();
  }, []);

  const title = purpose === 'subscription' ? 'Abonnement activé !' : 'Paiement confirmé !';
  const subtitle = purpose === 'subscription'
    ? 'Votre compte Pro est maintenant actif. Profitez de toutes les fonctionnalités premium.'
    : 'Votre document sera bientôt disponible au téléchargement.';

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    }}>
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        backgroundColor: '#FFFFFF',
        borderRadius: 28, padding: 32, marginHorizontal: 40,
        alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
      }}>
        {/* Success icon with rings */}
        <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', borderWidth: 2, borderColor: '#BBF7D0' }} />
          <View style={{ position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </View>
        </View>

        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19, marginBottom: 24 }}>{subtitle}</Text>

        {/* Amount paid */}
        <View style={{
          backgroundColor: '#F8F9FA', borderRadius: 14, padding: 14, width: '100%', marginBottom: 24,
          borderWidth: 1, borderColor: '#F0F0F0',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Montant payé</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: GREEN_DARK }}>{amount.toLocaleString()} XAF</Text>
          </View>
          {purpose === 'subscription' && (
            <>
              <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Prochaine facturation</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>
                  {new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </>
          )}
        </View>

        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => ({
            backgroundColor: GREEN_DARK, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
            width: '100%', alignItems: 'center', opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
            {purpose === 'subscription' ? 'Commencer' : 'Télécharger'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
