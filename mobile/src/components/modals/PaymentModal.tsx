import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Animated, Dimensions, Modal,
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentsService } from '@/core/api/paymentsService';
import { useThemeColors } from '@/hooks/useThemeColors';

const SCREEN = Dimensions.get('window');

export type PaymentMethod = 'orange' | 'mtn' | 'points';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: (method: PaymentMethod, phone: string) => void;
  amount: number;
  title: string;
  description: string;
  processing: boolean;
  error: string;
  submitLabel: string;
  children?: React.ReactNode;
}

type Step = 'form' | 'success';

export function PaymentModal({
  isOpen, onClose, onPay, amount, title, description, processing, error, submitLabel, children
}: PaymentModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<PaymentMethod>('orange');
  const [phone, setPhone] = useState('');
  const [pointsNeeded, setPointsNeeded] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('form');
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN.height, duration: 220, useNativeDriver: true }).start(() => {
        setStep('form');
        setPhone('');
        setMethod('orange');
      });
    }
  }, [isOpen]);

  // Calcul du coût en points via /points/rate (aligné sur le web).
  useEffect(() => {
    if (!isOpen || amount <= 0) return;
    let cancelled = false;
    paymentsService
      .getPointsRate()
      .then((rate) => {
        if (!cancelled) setPointsNeeded(Math.ceil(amount * rate));
      })
      .catch(() => {
        if (!cancelled) setPointsNeeded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [amount, isOpen]);

  const handlePay = () => {
    if (!method) return;
    // Le paiement par points ne nécessite pas de numéro de téléphone.
    if (method !== 'points' && !phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPay(method, method === 'points' ? '' : phone);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const isFormValid = method === 'points' ? true : !!phone;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={handleClose} />
            <Animated.View style={{
              backgroundColor: colors.backgroundElement,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              maxHeight: SCREEN.height * 0.92,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            }}>
              <View style={{
                width: 40, height: 4, borderRadius: 2,
                backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8,
              }} />

              <View style={{ paddingHorizontal: 20 }}>
                {/* Icon + Title */}
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 16,
                    backgroundColor: colors.backgroundSelected, alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="card-outline" size={24} color={colors.tint} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{description}</Text>
                </View>

                {/* Amount */}
                <View style={{
                  backgroundColor: colors.backgroundSelected, borderRadius: 16,
                  borderWidth: 1, borderColor: colors.border,
                  paddingVertical: 20, alignItems: 'center', marginBottom: 20,
                }}>
                  <Text style={{ fontSize: 34, fontWeight: '800', color: colors.greenDark, letterSpacing: -0.5 }}>{amount.toLocaleString()} XAF</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Montant à payer</Text>
                </View>

                {children}

                {/* Payment method — Mobile Money */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Mode de paiement</Text>
                <Text style={{
                  fontSize: 10, fontWeight: '700', color: colors.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
                }}>Mobile Money</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                  {([
                    { id: 'orange', name: 'Orange Money', icon: 'chatbubble-ellipses', color: '#F96900' },
                    { id: 'mtn', name: 'MTN MoMo', icon: 'flash', color: colors.warning },
                  ] as const).map((p) => {
                    const sel = method === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setMethod(p.id)}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                          paddingVertical: 14, borderRadius: 14,
                          backgroundColor: sel ? p.color : colors.backgroundSelected,
                          borderWidth: 1.5,
                          borderColor: sel ? p.color : colors.border,
                        }}
                      >
                        <Ionicons name={p.icon} size={18} color={sel ? '#FFF' : p.color} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? '#FFF' : colors.textSecondary }}>{p.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Other payment methods: Points (actif) + PayPoint (bientôt dispo) */}
                <Text style={{
                  fontSize: 10, fontWeight: '700', color: colors.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
                }}>Autres</Text>
                <View style={{ gap: 10, marginBottom: 18 }}>
                  <Pressable
                    onPress={() => setMethod('points')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 14, borderRadius: 14,
                      backgroundColor: method === 'points' ? colors.successBg : colors.backgroundSelected,
                      borderWidth: 1.5,
                      borderColor: method === 'points' ? colors.success : colors.border,
                    }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: colors.success,
                    }}>
                      <Ionicons name="star" size={18} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 }}>Payer avec mes Points</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        {pointsNeeded === null
                          ? 'Chargement...'
                          : `Coût: ${pointsNeeded.toLocaleString()} pts`}
                      </Text>
                    </View>
                    {method === 'points' && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    )}
                  </Pressable>

                  {/* PayPoint (désactivé, bientôt disponible) */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 14, borderRadius: 14,
                    backgroundColor: colors.backgroundSelected,
                    borderWidth: 1.5, borderColor: colors.border,
                    opacity: 0.7,
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: colors.textSecondary,
                    }}>
                      <Ionicons name="card" size={18} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>PayPoint</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Bientôt disponible</Text>
                    </View>
                  </View>
                </View>

                {/* Phone (uniquement pour Orange / MTN) */}
                {method !== 'points' && (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Numéro de téléphone</Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: colors.backgroundSelected, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 16, marginBottom: 14,
                    }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginRight: 10 }}>+237</Text>
                      <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginRight: 12 }} />
                      <TextInput
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 9))}
                        placeholder="6XX XXX XXX"
                        placeholderTextColor={colors.border}
                        keyboardType="phone-pad"
                        maxLength={9}
                        style={{ flex: 1, fontSize: 15, paddingVertical: 14, color: colors.text }}
                      />
                    </View>
                  </>
                )}

                {error ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={{ fontSize: 13, color: colors.danger, flex: 1 }}>{error}</Text>
                  </View>
                ) : null}

                {/* Submit */}
                <Pressable
                  onPress={handlePay}
                  disabled={!isFormValid || processing}
                  style={({ pressed }) => ({
                    backgroundColor: (!isFormValid || processing) ? colors.border : colors.greenDark,
                    borderRadius: 16, paddingVertical: 16,
                    alignItems: 'center', marginTop: 4,
                    opacity: pressed && !processing ? 0.85 : 1,
                  })}
                >
                  {processing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="sync" size={18} color="#FFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Traitement...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="lock-closed" size={18} color="#FFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>{submitLabel}</Text>
                    </View>
                  )}
                </Pressable>

                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, marginTop: 16, marginBottom: 8,
                }}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Paiement sécurisé</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}