import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

type ConfirmModalProps = {
  visible: boolean;
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
  withPassword?: boolean;
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ visible, text, onConfirm, onCancel, withPassword }) => (
  <Modal visible={visible} transparent>
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ThemedText>{text}</ThemedText>
        {withPassword && <Input placeholder="Mot de passe" secureTextEntry />}
        <Button title="Annuler" onPress={onCancel} />
        <Button title="Confirmer" onPress={onConfirm} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '80%', gap: 16 },
});
