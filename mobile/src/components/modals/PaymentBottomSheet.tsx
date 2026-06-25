import React, { forwardRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { type PaymentMethod } from './PaymentModal';

interface PaymentBottomSheetProps {
  onPay: (method: PaymentMethod, phone: string) => void;
  amount: number;
  title: string;
  description: string;
  processing: boolean;
  error: string;
  submitLabel: string;
}

export const PaymentBottomSheet = forwardRef<BottomSheetModal, PaymentBottomSheetProps>(
  ({ onPay, amount, title, description, processing, error, submitLabel }, ref) => {
    const colors = useThemeColors();
    const snapPoints = useMemo(() => ['50%', '90%'], []);
    const [method, setMethod] = React.useState<PaymentMethod>('orange');
    const [phone, setPhone] = React.useState('');

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.65}
          pressBehavior="close"
        />
      ),
      []
    );

    const handlePay = () => {
      onPay(method, method === 'points' ? '' : phone);
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={{ backgroundColor: colors.backgroundElement }}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={styles.container}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{title}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>{description}</Text>
          
          {/* Amount Display */}
          <View style={[styles.amountContainer, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.greenDark }}>{amount.toLocaleString()} XAF</Text>
          </View>

          {/* Method Selection (Simplified for brevity) */}
          <Pressable onPress={() => setMethod('orange')} style={[styles.methodBtn, method === 'orange' && { borderColor: colors.tint }]}>
              <Text style={{color: colors.text}}>Orange Money</Text>
          </Pressable>
          <Pressable onPress={() => setMethod('mtn')} style={[styles.methodBtn, method === 'mtn' && { borderColor: colors.tint }]}>
              <Text style={{color: colors.text}}>MTN MoMo</Text>
          </Pressable>

          {/* Phone Input */}
          {method !== 'points' && (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Numéro de téléphone"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          )}

          {/* Submit */}
          <Pressable onPress={handlePay} disabled={processing} style={[styles.submitBtn, { backgroundColor: colors.greenDark }]}>
              <Text style={{color: '#FFF', fontWeight: '700'}}>{processing ? 'Traitement...' : submitLabel}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  container: { padding: 20 },
  amountContainer: { padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  methodBtn: { padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  input: { padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  submitBtn: { padding: 16, borderRadius: 16, alignItems: 'center' }
});
