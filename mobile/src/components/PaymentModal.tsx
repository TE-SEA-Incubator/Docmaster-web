import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Modal, Dimensions, Animated,
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';

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

type Step = 'form' | 'processing' | 'success';

export default function PaymentModal({ visible, onClose, onPaymentSuccess, purpose, amount, label }: PaymentModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [selectedProvider, setSelectedProvider] = useState<string>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<Step>('form');
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN.height, duration: 250, useNativeDriver: true }).start(() => {
        setStep('form');
        setPhoneNumber('');
        checkScale.setValue(0);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (step === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      ] as any);
      setTimeout(() => {
        Animated.spring(checkScale, { toValue: 1, damping: 10, stiffness: 180, useNativeDriver: true }).start();
      }, 200);
    }
  }, [step]);

  const handlePay = async () => {
    if (phoneNumber.length < 9) return;
    setStep('processing');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('success');
  };

  const handleSuccessDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPaymentSuccess();
    setPhoneNumber('');
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const purposeLabel = purpose === 'subscription' ? 'Abonnement' : 'Récupération document';
  const purposeIcon = purpose === 'subscription' ? 'star-outline' : 'document-text-outline';

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const nextBilling = new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={handleClose} />

            <Animated.View style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              maxHeight: SCREEN.height * 0.85,
              backgroundColor: colors.backgroundElement,
              paddingBottom: insets.bottom + 24,
              transform: [{ translateY: slideAnim }],
            }}>
              <View style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: 4,
              }} />

              {step === 'form' && (
                <View style={{ paddingHorizontal: 20 }}>
                  {/* Header */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 12, marginBottom: 20,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name={purposeIcon as any} size={18} color={colors.tint} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{purposeLabel}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label || 'Paiement sécurisé'}</Text>
                      </View>
                    </View>
                    <Pressable onPress={handleClose} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                      <Ionicons name="close-circle" size={28} color={colors.border} />
                    </Pressable>
                  </View>

                  {/* Amount */}
                  <View style={{
                    backgroundColor: colors.backgroundSelected, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
                    padding: 16, marginBottom: 20, alignItems: 'center',
                  }}>
                    <Text style={{
                      fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                    }}>Montant à payer</Text>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.greenDark }}>{amount.toLocaleString()} XAF</Text>
                    {purpose === 'subscription' && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Facturation mensuelle</Text>
                    )}
                  </View>

                  {/* Providers */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Mode de paiement</Text>
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
                            backgroundColor: isSelected ? provider.color : colors.backgroundSelected,
                            borderWidth: 2, borderColor: isSelected ? provider.color : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <View style={{
                            width: 20, height: 20, borderRadius: 10,
                            borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                            borderColor: isSelected ? provider.textColor : colors.border,
                          }}>
                            {isSelected && (
                              <View style={{
                                width: 10, height: 10, borderRadius: 5,
                                backgroundColor: provider.textColor,
                              }} />
                            )}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? provider.textColor : colors.textSecondary }}>
                            {provider.name.replace(' Mobile Money', '').replace(' Money', '')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Phone */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Numéro de téléphone</Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundSelected,
                    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
                    paddingHorizontal: 16, marginBottom: 24,
                  }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginRight: 8 }}>+237</Text>
                    <View style={{
                      width: 1, height: 24, backgroundColor: colors.border, marginRight: 12,
                    }} />
                    <TextInput
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, '').slice(0, 9))}
                      placeholder="6XX XXX XXX"
                      placeholderTextColor={colors.border}
                      keyboardType="phone-pad"
                      maxLength={9}
                      style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 14 }}
                    />
                  </View>

                  {/* Info */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                    backgroundColor: colors.backgroundSelected, borderRadius: 12, padding: 12, marginBottom: 24,
                    borderWidth: 1, borderColor: colors.tint,
                  }}>
                    <Ionicons name="information-circle" size={18} color={colors.tint} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                      {purpose === 'subscription'
                        ? "Votre abonnement sera activé immédiatement après confirmation du paiement. Vous pouvez annuler à tout moment."
                        : "Le document sera disponible au téléchargement dès que le paiement sera confirmé."}
                    </Text>
                  </View>

                  {/* Pay */}
                  <Pressable
                    onPress={handlePay}
                    disabled={phoneNumber.length < 9}
                    style={({ pressed }) => ({
                      backgroundColor: phoneNumber.length < 9 ? colors.border : colors.greenDark,
                      borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                      shadowColor: colors.greenDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Payer {amount.toLocaleString()} XAF</Text>
                    </View>
                  </Pressable>

                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16,
                  }}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Paiement sécurisé & crypté</Text>
                  </View>
                </View>
              )}

              {step === 'processing' && (
                <View style={{ paddingHorizontal: 20, alignItems: 'center', paddingTop: 32, paddingBottom: 16 }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: colors.backgroundSelected, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 3, borderColor: colors.border, borderTopColor: colors.tint,
                  }}>
                    <Ionicons name="sync" size={32} color={colors.tint} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: 6, marginTop: 20 }}>Traitement en cours...</Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8, marginBottom: 24 }}>Veuillez patienter pendant la confirmation du paiement.</Text>
                </View>
              )}

              {step === 'success' && (
                <View style={{ paddingHorizontal: 20, alignItems: 'center', paddingTop: 32, paddingBottom: 16 }}>
                  <View style={{
                    width: 88, height: 88, borderRadius: 44,
                    backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: colors.successBg, marginBottom: 8,
                  }}>
                    <Animated.View style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
                      shadowColor: colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
                      transform: [{ scale: checkScale }],
                    }}>
                      <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                    </Animated.View>
                  </View>

                  <Text style={{
                    fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: 6,
                  }}>
                    {purpose === 'subscription' ? 'Abonnement activé !' : 'Paiement confirmé !'}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8, marginBottom: 24 }}>
                    {purpose === 'subscription'
                      ? 'Votre compte Pro est maintenant actif. Profitez de toutes les fonctionnalités premium.'
                      : 'Votre document sera bientôt disponible au téléchargement.'}
                  </Text>

                  <View style={{
                    backgroundColor: colors.backgroundSelected, borderRadius: 14, padding: 14, width: '100%', marginBottom: 24,
                    borderWidth: 1, borderColor: colors.border,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>Montant payé</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.greenDark }}>{amount.toLocaleString()} XAF</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        {purpose === 'subscription' ? 'Prochaine facturation' : 'Date'}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.greenDark }}>
                        {purpose === 'subscription' ? nextBilling : today}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSuccessDismiss}
                    style={({ pressed }) => ({
                      backgroundColor: colors.greenDark, borderRadius: 16, paddingVertical: 16,
                      width: '100%', alignItems: 'center', opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      {purpose === 'subscription' ? 'Commencer' : 'Télécharger'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}