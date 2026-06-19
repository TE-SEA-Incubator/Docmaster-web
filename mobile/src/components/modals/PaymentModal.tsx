import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/components/feedback/Modal';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Spacing } from '@/constants/theme';

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

export function PaymentModal({
  isOpen,
  onClose,
  onPay,
  amount,
  title,
  description,
  processing,
  error,
  submitLabel,
  children
}: PaymentModalProps) {
  const [method, setMethod] = useState<'orange' | 'mtn'>('orange');
  const [phone, setPhone] = useState('');

  const handlePay = () => {
    if (!phone) return;
    onPay(method, phone);
  };

  return (
    <Modal visible={isOpen} onClose={onClose}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.subtitle}>{description}</ThemedText>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {children}

      <View style={styles.methodContainer}>
        <ThemedText style={styles.methodTitle}>Mode de paiement</ThemedText>
        <View style={styles.methodRow}>
          <TouchableOpacity
            onPress={() => setMethod('orange')}
            style={[
              styles.methodItem,
              method === 'orange' && styles.methodItemActive,
              { borderColor: method === 'orange' ? '#F96900' : '#EAE3D8' }
            ]}
          >
            <View style={[styles.methodLogo, { backgroundColor: '#F96900' }]}>
               <Text style={styles.logoText}>OM</Text>
            </View>
            <ThemedText style={styles.methodLabel}>Orange</ThemedText>
            {method === 'orange' && <Ionicons name="checkmark-circle" size={16} color="#F96900" />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMethod('mtn')}
            style={[
              styles.methodItem,
              method === 'mtn' && styles.methodItemActive,
              { borderColor: method === 'mtn' ? '#FFCC00' : '#EAE3D8' }
            ]}
          >
            <View style={[styles.methodLogo, { backgroundColor: '#FFCC00' }]}>
               <Text style={[styles.logoText, { color: '#000' }]}>MTN</Text>
            </View>
            <ThemedText style={styles.methodLabel}>MoMo</ThemedText>
            {method === 'mtn' && <Ionicons name="checkmark-circle" size={16} color="#FFCC00" />}
          </TouchableOpacity>
        </View>
      </View>

      <Input
        label="Numéro de téléphone"
        placeholder="6XX XXX XXX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        icon="call-outline"
        error={error}
      />

      <Button
        title={processing ? "Traitement..." : `${submitLabel} (${amount.toLocaleString()} XAF)`}
        onPress={handlePay}
        loading={processing}
        disabled={!phone || processing}
        style={styles.payBtn}
      />

      <ThemedText style={styles.footerText}>
        <Ionicons name="lock-closed" size={10} /> Paiement 100% sécurisé via DocMaster Pay
      </ThemedText>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  methodContainer: {
    marginBottom: Spacing.four,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: Spacing.two,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  methodItemActive: {
    backgroundColor: '#FAFAFA',
  },
  methodLogo: {
    width: 28,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  payBtn: {
    marginTop: Spacing.two,
  },
  footerText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: Spacing.two,
  }
});
