import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Animated, Dimensions, Modal,
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  ScrollView, StyleSheet,
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
  title?: string;
  description?: string;
  processing: boolean;
  error: string;
  submitLabel?: string;
  children?: React.ReactNode;
}

const METHODS = [
  {
    id: 'orange' as PaymentMethod,
    name: 'Orange Money',
    icon: 'chatbubble-ellipses' as const,
    color: '#F96900',
    bg: '#fff4ee',
  },
  {
    id: 'mtn' as PaymentMethod,
    name: 'MTN MoMo',
    icon: 'flash' as const,
    color: '#FFCC00',
    textColor: '#000',
    bg: '#fffde7',
  },
  {
    id: 'points' as PaymentMethod,
    name: 'Mes Points',
    icon: 'star' as const,
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    id: 'paypoint' as 'paypoint',
    name: 'PayPoint',
    icon: 'card' as const,
    color: '#9ca3af',
    bg: '#f9fafb',
    disabled: true,
  },
];

export function PaymentModal({
  isOpen, onClose, onPay, amount, title = 'Paiement', description, processing, error, submitLabel, children,
}: PaymentModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<PaymentMethod>('orange');
  const [phone, setPhone] = useState('');
  const [pointsNeeded, setPointsNeeded] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN.height, duration: 220, useNativeDriver: true }).start(() => {
        setPhone('');
        setMethod('orange');
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || amount <= 0) return;
    let cancelled = false;
    paymentsService.getPointsRate().then((rate) => {
      if (!cancelled) setPointsNeeded(Math.ceil(amount * rate));
    }).catch(() => {
      if (!cancelled) setPointsNeeded(null);
    });
    return () => { cancelled = true; };
  }, [amount, isOpen]);

  const handlePay = () => {
    if (!method || method === 'paypoint' as any) return;
    if (method !== 'points' && !phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPay(method, method === 'points' ? '' : phone);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const isFormValid = method === 'points' ? true : phone.length >= 9;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={handleClose} />
            <Animated.View style={[s.sheet, {
              backgroundColor: colors.backgroundElement,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY: slideAnim }],
            }]}>
              {/* Handle */}
              <View style={[s.handle, { backgroundColor: colors.border }]} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={s.headerRow}>
                  <View style={[s.headerIcon, { backgroundColor: colors.backgroundSelected }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.headerTitle, { color: colors.text }]}>{title}</Text>
                    {description && <Text style={[s.headerSub, { color: colors.textSecondary }]}>{description}</Text>}
                  </View>
                  <Pressable onPress={handleClose} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={26} color={colors.border} />
                  </Pressable>
                </View>

                {/* Amount */}
                <View style={[s.amountBox, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
                  <Text style={[s.amountLabel, { color: colors.textSecondary }]}>Montant à payer</Text>
                  <Text style={[s.amountValue, { color: colors.greenDark }]}>{amount.toLocaleString('fr-FR')} XAF</Text>
                </View>

                {children}

                {/* Method selector — horizontal scroll */}
                <Text style={[s.label, { color: colors.text, marginBottom: 10 }]}>Mode de paiement</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}
                  style={{ marginBottom: 18 }}
                >
                  {METHODS.map((m) => {
                    const sel = method === m.id;
                    const disabled = (m as any).disabled;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => !disabled && setMethod(m.id as PaymentMethod)}
                        style={[
                          s.methodCard,
                          {
                            backgroundColor: sel ? m.color : colors.backgroundSelected,
                            borderColor: sel ? m.color : colors.border,
                            opacity: disabled ? 0.5 : 1,
                          },
                        ]}
                      >
                        <View style={[s.methodIconWrap, { backgroundColor: sel ? 'rgba(255,255,255,0.2)' : m.bg }]}>
                          <Ionicons name={m.icon} size={20} color={sel ? '#fff' : m.color} />
                        </View>
                        <Text style={[s.methodName, { color: sel ? '#fff' : colors.text }]}>{m.name}</Text>
                        {m.id === 'points' && (
                          <Text style={[s.methodSub, { color: sel ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                            {pointsNeeded ? `${pointsNeeded.toLocaleString()} pts` : '…'}
                          </Text>
                        )}
                        {disabled && (
                          <Text style={[s.methodSub, { color: colors.textSecondary }]}>Bientôt</Text>
                        )}
                        {sel && !disabled && (
                          <View style={s.methodCheck}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Phone input */}
                {method !== 'points' && (
                  <>
                    <Text style={[s.label, { color: colors.text, marginBottom: 8 }]}>Numéro de téléphone</Text>
                    <View style={[s.phoneRow, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
                      <Text style={[s.phonePrefix, { color: colors.text }]}>+237</Text>
                      <View style={[s.phoneDivider, { backgroundColor: colors.border }]} />
                      <TextInput
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 9))}
                        placeholder="6XX XXX XXX"
                        placeholderTextColor={colors.border}
                        keyboardType="phone-pad"
                        maxLength={9}
                        style={[s.phoneInput, { color: colors.text }]}
                      />
                    </View>
                    <Text style={[s.phoneHint, { color: colors.textSecondary }]}>
                      {method === 'mtn' ? 'Ex: 677 000 000' : 'Ex: 699 000 000'}
                    </Text>
                  </>
                )}

                {/* Error */}
                {!!error && (
                  <View style={[s.errorBox, { backgroundColor: colors.dangerBg }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={[s.errorTxt, { color: colors.danger }]}>{error}</Text>
                  </View>
                )}

                {/* Submit */}
                <Pressable
                  onPress={handlePay}
                  disabled={!isFormValid || processing}
                  style={({ pressed }) => ([
                    s.submitBtn,
                    { backgroundColor: (!isFormValid || processing) ? colors.border : colors.greenDark },
                    pressed && { opacity: 0.85 },
                  ])}
                >
                  {processing ? (
                    <View style={s.submitInner}>
                      <Ionicons name="sync" size={18} color="#fff" />
                      <Text style={s.submitTxt}>Traitement en cours…</Text>
                    </View>
                  ) : (
                    <View style={s.submitInner}>
                      <Ionicons name="lock-closed" size={18} color="#fff" />
                      <Text style={s.submitTxt}>{submitLabel || `Payer ${amount.toLocaleString('fr-FR')} XAF`}</Text>
                    </View>
                  )}
                </Pressable>

                <View style={s.secureRow}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                  <Text style={[s.secureTxt, { color: colors.textSecondary }]}>Paiement sécurisé & crypté</Text>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, maxHeight: SCREEN.height * 0.9 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  amountBox: { borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center', marginBottom: 20 },
  amountLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  amountValue: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  label: { fontSize: 13, fontWeight: '700' },
  // Method cards
  methodCard: { width: 100, borderRadius: 16, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 8, position: 'relative' },
  methodIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  methodSub: { fontSize: 10, textAlign: 'center' },
  methodCheck: { position: 'absolute', top: 6, right: 6 },
  // Phone
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, marginBottom: 6 },
  phonePrefix: { fontSize: 15, fontWeight: '700', marginRight: 10 },
  phoneDivider: { width: 1, height: 24, marginRight: 12 },
  phoneInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  phoneHint: { fontSize: 11, marginBottom: 16 },
  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, marginBottom: 12 },
  errorTxt: { fontSize: 13, flex: 1 },
  // Submit
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  // Secure
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, marginBottom: 4 },
  secureTxt: { fontSize: 11 },
});
