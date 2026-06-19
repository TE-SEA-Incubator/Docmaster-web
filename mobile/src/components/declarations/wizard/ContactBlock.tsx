import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';

type ContactBlockProps = {
  phone: string;
  email: string;
  setPhone: (val: string) => void;
  setEmail: (val: string) => void;
};

export const ContactBlock: React.FC<ContactBlockProps> = ({ phone, email, setPhone, setEmail }) => (
  <View style={styles.container}>
    <Input label="Téléphone (requis)" value={phone} onChangeText={setPhone} placeholder="06XXXXXXXX" containerStyle={styles.input} />
    <Input label="Email (optionnel)" value={email} onChangeText={setEmail} placeholder="exemple@mail.com" containerStyle={styles.input} />
  </View>
);

const styles = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 },
});
