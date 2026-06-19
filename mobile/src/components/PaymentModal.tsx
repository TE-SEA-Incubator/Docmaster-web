import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Modal, Dimensions, Animated, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type Step = 'form' | 'processing' | 'success';

export default function PaymentModal({ visible, onClose, onPaymentSuccess, purpose, amount, label }: PaymentModalProps) {
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
          <View style={styles.backdrop}>
            <Pressable style={styles.backdropPress} onPress={handleClose} />

            <Animated.View style={[
              styles.sheet,
              {
                backgroundColor: '#FFFFFF',
                paddingBottom: insets.bottom + 24,
                transform: [{ translateY: slideAnim }],
              },
            ]}>
              <View style={styles.handleBar} />

              {step === 'form' && (
                <View style={styles.content}>
                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerLeft}>
                      <View style={styles.headerIcon}>
                        <Ionicons name={purposeIcon as any} size={18} color="#F5A64B" />
                      </View>
                      <View>
                        <Text style={styles.headerTitle}>{purposeLabel}</Text>
                        <Text style={styles.headerSub}>{label || 'Paiement sécurisé'}</Text>
                      </View>
                    </View>
                    <Pressable onPress={handleClose} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                      <Ionicons name="close-circle" size={28} color="#D1D5DB" />
                    </Pressable>
                  </View>

                  {/* Amount */}
                  <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Montant à payer</Text>
                    <Text style={styles.amountValue}>{amount.toLocaleString()} XAF</Text>
                    {purpose === 'subscription' && (
                      <Text style={styles.amountSub}>Facturation mensuelle</Text>
                    )}
                  </View>

                  {/* Providers */}
                  <Text style={styles.sectionLabel}>Mode de paiement</Text>
                  <View style={styles.providerRow}>
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
                          <View style={[
                            styles.radio,
                            { borderColor: isSelected ? provider.textColor : '#D1D5DB' },
                          ]}>
                            {isSelected && <View style={[styles.radioDot, { backgroundColor: provider.textColor }]} />}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? provider.textColor : '#6B7280' }}>
                            {provider.name.replace(' Mobile Money', '').replace(' Money', '')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Phone */}
                  <Text style={styles.sectionLabel}>Numéro de téléphone</Text>
                  <View style={styles.phoneRow}>
                    <Text style={styles.phonePrefix}>+237</Text>
                    <View style={styles.phoneDivider} />
                    <TextInput
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, '').slice(0, 9))}
                      placeholder="6XX XXX XXX"
                      placeholderTextColor="#C4C4C4"
                      keyboardType="phone-pad"
                      maxLength={9}
                      style={styles.phoneInput}
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={18} color="#F5A64B" style={{ marginTop: 1 }} />
                    <Text style={styles.infoText}>
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
                      backgroundColor: phoneNumber.length < 9 ? '#D1D5DB' : GREEN_DARK,
                      borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                      shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Payer {amount.toLocaleString()} XAF</Text>
                    </View>
                  </Pressable>

                  <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                    <Text style={styles.securityText}>Paiement sécurisé & crypté</Text>
                  </View>
                </View>
              )}

              {step === 'processing' && (
                <View style={[styles.content, styles.centerContent]}>
                  <View style={styles.spinnerRing}>
                    <Ionicons name="sync" size={32} color="#F5A64B" />
                  </View>
                  <Text style={[styles.title, { marginTop: 20 }]}>Traitement en cours...</Text>
                  <Text style={styles.message}>Veuillez patienter pendant la confirmation du paiement.</Text>
                </View>
              )}

              {step === 'success' && (
                <View style={[styles.content, styles.centerContent]}>
                  <View style={styles.successRing}>
                    <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
                      <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                    </Animated.View>
                  </View>

                  <Text style={styles.title}>
                    {purpose === 'subscription' ? 'Abonnement activé !' : 'Paiement confirmé !'}
                  </Text>
                  <Text style={styles.message}>
                    {purpose === 'subscription'
                      ? 'Votre compte Pro est maintenant actif. Profitez de toutes les fonctionnalités premium.'
                      : 'Votre document sera bientôt disponible au téléchargement.'}
                  </Text>

                  <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Montant payé</Text>
                      <Text style={styles.summaryValue}>{amount.toLocaleString()} XAF</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {purpose === 'subscription' ? 'Prochaine facturation' : 'Date'}
                      </Text>
                      <Text style={[styles.summaryValue, { fontSize: 14, fontWeight: '600' }]}>
                        {purpose === 'subscription' ? nextBilling : today}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSuccessDismiss}
                    style={({ pressed }) => ({
                      backgroundColor: GREEN_DARK, borderRadius: 16, paddingVertical: 16,
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: SCREEN.height * 0.85,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  centerContent: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEF0DC', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: '#1A1A1A',
  },
  headerSub: {
    fontSize: 12, color: '#9CA3AF',
  },
  amountBox: {
    backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0',
    padding: 16, marginBottom: 20, alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  amountValue: {
    fontSize: 32, fontWeight: '800', color: '#1E3A2F',
  },
  amountSub: {
    fontSize: 12, color: '#9CA3AF', marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 12,
  },
  providerRow: {
    flexDirection: 'row', gap: 12, marginBottom: 20,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  radioDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, marginBottom: 24,
  },
  phonePrefix: {
    fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginRight: 8,
  },
  phoneDivider: {
    width: 1, height: 24, backgroundColor: '#E5E7EB', marginRight: 12,
  },
  phoneInput: {
    flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 14,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8ED', borderRadius: 12, padding: 12, marginBottom: 24,
    borderWidth: 1, borderColor: '#F5A64B30',
  },
  infoText: {
    flex: 1, fontSize: 12, color: '#92702D', lineHeight: 17,
  },
  securityBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16,
  },
  securityText: {
    fontSize: 11, color: '#9CA3AF',
  },
  spinnerRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF8ED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#F5A64B40', borderTopColor: '#F5A64B',
  },
  successRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#BBF7D0', marginBottom: 8,
  },
  successCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  title: {
    fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', letterSpacing: -0.4, marginBottom: 6,
  },
  message: {
    fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, paddingHorizontal: 8, marginBottom: 24,
  },
  summaryBox: {
    backgroundColor: '#F8F9FA', borderRadius: 14, padding: 14, width: '100%', marginBottom: 24,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13, color: '#9CA3AF',
  },
  summaryValue: {
    fontSize: 18, fontWeight: '800', color: '#1E3A2F',
  },
  summaryDivider: {
    height: 1, backgroundColor: '#F0F0F0', marginVertical: 10,
  },
});
