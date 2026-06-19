import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Dimensions, Modal,
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN = Dimensions.get('window');
const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: (method: 'orange' | 'mtn', phone: string) => void;
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
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<'orange' | 'mtn'>('orange');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<Step>('form');
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN.height, duration: 220, useNativeDriver: true }).start(() => {
        setStep('form');
        setPhone('');
      });
    }
  }, [isOpen]);

  const handlePay = () => {
    if (!phone || !method) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPay(method, phone);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.outer}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.backdrop}>
            <Pressable style={s.backdropPress} onPress={handleClose} />
            <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}>
              <View style={s.handleBar} />

              <View style={s.content}>
                {/* Icon + Title */}
                <View style={s.headerSection}>
                  <View style={s.iconWrap}>
                    <Ionicons name="card-outline" size={24} color={PRIMARY} />
                  </View>
                  <Text style={s.title}>{title}</Text>
                  <Text style={s.desc}>{description}</Text>
                </View>

                {/* Amount */}
                <View style={s.amountCard}>
                  <Text style={s.amountValue}>{amount.toLocaleString()} XAF</Text>
                  <Text style={s.amountLabel}>Montant à payer</Text>
                </View>

                {children}

                {/* Payment method */}
                <Text style={s.sectionLabel}>Mode de paiement</Text>
                <View style={s.methodRow}>
                  {([
                    { id: 'orange', name: 'Orange Money', icon: 'chatbubble-ellipses', color: '#F96900' },
                    { id: 'mtn', name: 'MTN MoMo', icon: 'flash', color: '#FFCC00' },
                  ] as const).map((p) => {
                    const sel = method === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setMethod(p.id)}
                        style={[s.methodBtn, sel && { backgroundColor: p.color, borderColor: p.color }]}
                      >
                        <Ionicons name={p.icon} size={18} color={sel ? '#FFF' : p.color} />
                        <Text style={[s.methodText, sel && { color: '#FFF' }]}>{p.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Phone */}
                <Text style={s.sectionLabel}>Numéro de téléphone</Text>
                <View style={s.phoneRow}>
                  <Text style={s.phonePrefix}>+237</Text>
                  <View style={s.phoneDivider} />
                  <TextInput
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 9))}
                    placeholder="6XX XXX XXX"
                    placeholderTextColor="#C4C4C4"
                    keyboardType="phone-pad"
                    maxLength={9}
                    style={s.phoneInput}
                  />
                </View>

                {error ? (
                  <View style={s.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Submit */}
                <Pressable
                  onPress={handlePay}
                  disabled={!phone || processing}
                  style={({ pressed }) => [s.submitBtn, (!phone || processing) && s.submitDisabled, pressed && !processing && { opacity: 0.85 }]}
                >
                  {processing ? (
                    <View style={s.submitInner}>
                      <Ionicons name="sync" size={18} color="#FFF" />
                      <Text style={s.submitText}>Traitement...</Text>
                    </View>
                  ) : (
                    <View style={s.submitInner}>
                      <Ionicons name="lock-closed" size={18} color="#FFF" />
                      <Text style={s.submitText}>{submitLabel}</Text>
                    </View>
                  )}
                </Pressable>

                <View style={s.securityRow}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={s.securityText}>Paiement sécurisé</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropPress: { flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: SCREEN.height * 0.88,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 8,
  },
  content: { paddingHorizontal: 20 },
  headerSection: { alignItems: 'center', paddingVertical: 16 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  desc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  amountCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16,
    borderWidth: 1, borderColor: '#F0F0F0',
    paddingVertical: 20, alignItems: 'center', marginBottom: 20,
  },
  amountValue: { fontSize: 34, fontWeight: '800', color: GREEN_DARK, letterSpacing: -0.5 },
  amountLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F0F0F0',
  },
  methodText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#F0F0F0',
    paddingHorizontal: 16, marginBottom: 14,
  },
  phonePrefix: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginRight: 10 },
  phoneDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB', marginRight: 12 },
  phoneInput: { flex: 1, fontSize: 15, paddingVertical: 14, color: '#1A1A1A' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },
  submitBtn: {
    backgroundColor: GREEN_DARK, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  submitDisabled: { backgroundColor: '#D1D5DB' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  securityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 16, marginBottom: 8,
  },
  securityText: { fontSize: 11, color: '#9CA3AF' },
});
