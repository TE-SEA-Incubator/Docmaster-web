import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, View, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/core/store/useAuthStore';
import { Colors } from '@/constants/theme';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const register = useAuthStore((state) => state.register);

  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', mot_de_passe: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const temp: Record<string, string> = {};
    if (!form.nom) temp.nom = 'Requis';
    if (!form.prenom) temp.prenom = 'Requis';
    if (!form.email) temp.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) temp.email = 'Email invalide';
    if (!form.telephone) temp.telephone = 'Requis';
    if (!form.mot_de_passe) temp.mot_de_passe = 'Requis';
    else if (form.mot_de_passe.length < 6) temp.mot_de_passe = 'Au moins 6 caractères';
    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setErrorApi('');
    setLoading(true);
    try {
      await register(form);
    } catch (err: any) {
      setErrorApi(err?.response?.data?.message || err?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: insets.bottom + 24 }}
          style={styles.scrollContent}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.headerBlock}>
              <ThemedText type="title" style={styles.titleText}>
                Créer un compte
              </ThemedText>
              <ThemedText style={styles.subtitleText}>
                Rejoignez DocMaster pour sécuriser vos documents
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.formBlock}>
              {errorApi ? (
                <View style={styles.errorBox}>
                  <ThemedText style={styles.errorText}>{errorApi}</ThemedText>
                </View>
              ) : null}

              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Input label="Nom" placeholder="Dupont" value={form.nom} onChangeText={(v) => setForm((f) => ({ ...f, nom: v }))} error={errors.nom} />
                </View>
                <View style={styles.nameField}>
                  <Input label="Prénom" placeholder="Jean" value={form.prenom} onChangeText={(v) => setForm((f) => ({ ...f, prenom: v }))} error={errors.prenom} />
                </View>
              </View>

              <Input label="Email" icon="mail-outline" placeholder="votre@email.com" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} error={errors.email} keyboardType="email-address" autoCapitalize="none" />

              <Input label="Téléphone" icon="call-outline" placeholder="+33 6 12 34 56 78" value={form.telephone} onChangeText={(v) => setForm((f) => ({ ...f, telephone: v }))} error={errors.telephone} keyboardType="phone-pad" />

              <Input label="Mot de passe" icon="lock-closed-outline" placeholder="••••••••" value={form.mot_de_passe} onChangeText={(v) => setForm((f) => ({ ...f, mot_de_passe: v }))} error={errors.mot_de_passe} secureTextEntry />

              <Button title="Créer mon compte" variant="secondary" loading={loading} onPress={handleRegister} />

              <ThemedView style={styles.dividerRow}>
                <ThemedView style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>ou</ThemedText>
                <ThemedView style={styles.dividerLine} />
              </ThemedView>

              <Button title="S'inscrire avec Google" variant="outline" icon="logo-google" onPress={() => {}} />
            </ThemedView>

            <ThemedView style={styles.loginLinkRow}>
              <ThemedText style={styles.loginLinkText}>Déjà un compte ? </ThemedText>
              <Link href={'/(auth)' as any} asChild>
                <Pressable style={styles.loginLinkPressable}>
                  <ThemedText style={styles.loginLinkBtn}>Se connecter</ThemedText>
                </Pressable>
              </Link>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  container: { gap: 24, backgroundColor: 'transparent' },
  headerBlock: { alignItems: 'center', gap: 8 },
  titleText: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 30, textAlign: 'center', color: Colors.light.tint },
  subtitleText: { color: Colors.light.textSecondary, textAlign: 'center', fontSize: 15 },
  formBlock: { gap: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 14 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  nameRow: { flexDirection: 'row', gap: 8 },
  nameField: { flex: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.light.border },
  dividerText: { color: Colors.light.textSecondary, fontSize: 13 },
  loginLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: Colors.light.textSecondary },
  loginLinkPressable: {},
  loginLinkBtn: { fontSize: 14, fontWeight: '700', color: Colors.light.tint },
});
