import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Modal, Dimensions, Animated,
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaymentSuccessModal from './PaymentSuccessModal';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';
const SCREEN = Dimensions.get('window');

type PaymentPurpose = 'subscription' | 'document';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  purpose: PaymentPurpose;
  amount: number;
  label?: string;
}

const PROVIDERS = [
  { id: 'mtn', name: 'MTN Mobile Money', color: '#FFCC00', textColor: '#000000' },
  { id: 'moov', name: 'Moov Money', color: '#0066B3', textColor: '#FFFFFF' },
];

export default function PaymentModal({ visible, onClose, onPaymentSuccess, purpose, amount, label }: PaymentModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedProvider, setSelectedProvider] = useState<string>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const successPlayer = useAudioPlayer(require('../../assets/sounds/payment_success.wav'));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN.height, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const playSuccessSound = async () => {
    try {
      successPlayer.play();
    } catch (e) {
      // Sound not available, continue silently
    }
  };

  const handlePay = async () => {
    if (phoneNumber.length < 9) return;
    setProcessing(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await playSuccessSound();

      setProcessing(false);
      setShowSuccess(true);
    } catch (e) {
      setProcessing(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSuccessDismiss = () => {
    setShowSuccess(false);
    onPaymentSuccess();
    setPhoneNumber('');
    onClose();
  };

  const purposeLabel = purpose === 'subscription' ? 'Abonnement' : 'Récupération document';
  const purposeIcon = purpose === 'subscription' ? 'star-outline' : 'document-text-outline';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} />

            <Animated.View style={{
              transform: [{ translateY: slideAnim }],
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingBottom: insets.bottom + 20,
              maxHeight: SCREEN.height * 0.85,
            }}>
              {/* Handle bar */}
              <View style={{ alignItems: 'center', paddingTop: 12 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={purposeIcon as any} size={18} color={PRIMARY} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A' }}>{purposeLabel}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{label || 'Paiement sécurisé'}</Text>
                  </View>
                </View>
                <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                  <Ionicons name="close-circle" size={28} color="#D1D5DB" />
                </Pressable>
              </View>

              <View style={{ paddingHorizontal: 20 }}>
                {/* Amount */}
                <View style={{
                  backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0',
                  padding: 16, marginBottom: 20, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Montant à payer</Text>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: GREEN_DARK }}>{amount.toLocaleString()} XAF</Text>
                  {purpose === 'subscription' && (
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Facturation mensuelle</Text>
                  )}
                </View>

                {/* Provider selection */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>Mode de paiement</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  {PROVIDERS.map((provider) => {
                    const isSelected = selectedProvider === provider.id;
                    return (
                      <Pressable
                        key={provider.id}
                        onPress={() => setSelectedProvider(provider.id)}
                        style={({ pressed }) => ({
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                          paddingVertical: 14, borderRadius: 14,
                          backgroundColor: isSelected ? provider.color : '#F8F9FA',
                          borderWidth: 2, borderColor: isSelected ? provider.color : '#F0F0F0',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <View style={{
                          width: 20, height: 20, borderRadius: 10,
                          borderWidth: 2, borderColor: isSelected ? provider.textColor : '#D1D5DB',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: provider.textColor }} />}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? provider.textColor : '#6B7280' }}>
                          {provider.name.replace(' Mobile Money', '').replace(' Money', '')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Phone number */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 }}>Numéro de téléphone</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA',
                  borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
                  paddingHorizontal: 16, marginBottom: 24,
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginRight: 8 }}>+237</Text>
                  <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB', marginRight: 12 }} />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, '').slice(0, 9))}
                    placeholder="6XX XXX XXX"
                    placeholderTextColor="#C4C4C4"
                    keyboardType="phone-pad"
                    maxLength={9}
                    style={{ flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 14 }}
                  />
                </View>

                {/* Info */}
                <View style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                  backgroundColor: '#FFF8ED', borderRadius: 12, padding: 12, marginBottom: 24,
                  borderWidth: 1, borderColor: `${PRIMARY}30`,
                }}>
                  <Ionicons name="information-circle" size={18} color={PRIMARY} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: '#92702D', lineHeight: 17 }}>
                    {purpose === 'subscription'
                      ? 'Votre abonnement sera activé immédiatement après confirmation du paiement. Vous pouvez annuler à tout moment.'
                      : 'Le document sera disponible au téléchargement dès que le paiement sera confirmé.'}
                  </Text>
                </View>

                {/* Pay button */}
                <Pressable
                  onPress={handlePay}
                  disabled={phoneNumber.length < 9 || processing}
                  style={({ pressed }) => ({
                    backgroundColor: phoneNumber.length < 9 ? '#D1D5DB' : GREEN_DARK,
                    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                    opacity: pressed ? 0.85 : 1,
                    shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
                  })}
                >
                  {processing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="sync" size={18} color="#FFFFFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Traitement en cours...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Payer {amount.toLocaleString()} XAF</Text>
                    </View>
                  )}
                </Pressable>

                {/* Security badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Paiement sécurisé & crypté</Text>
                </View>
              </View>
            </Animated.View>

            {/* Success Modal */}
            {showSuccess && (
              <PaymentSuccessModal purpose={purpose} amount={amount} onDismiss={handleSuccessDismiss} />
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
