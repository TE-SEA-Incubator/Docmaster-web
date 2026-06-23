import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { authService } from '@/core/api/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email) { setError(t('forgotPassword:emailRequired')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('forgotPassword:emailInvalid')); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authService.requestPasswordReset({ email });
      if (res.success) setSuccess(true);
      else setError(res.error || res.message || t('forgotPassword:requestError'));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('forgotPassword:requestErrorDesc'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      {/* PARTIE SUPÉRIEURE VERTE */}
      <View style={[styles.greenHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('forgotPassword:title')}</Text>
          <View style={{ width: 24 }} /> {/* Spacer pour centrer le titre */}
        </View>

        <View style={styles.logoBlock}>
          {/* Remplacer cette icône par l'Image de votre logo DocMaster si nécessaire */}
          <Ionicons name="document-text" size={48} color="#FFFFFF" />
          <Text style={styles.logoText}>{t('forgotPassword:logoText')}</Text>
          <Text style={styles.descriptionText}>
            {t('forgotPassword:description')}
          </Text>
        </View>
      </View>

      {/* CARTE BLANCHE INFÉRIEURE */}
      <View style={styles.whiteCard}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!success ? (
              <View style={styles.formContainer}>
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Input 
                  label={t('forgotPassword:emailLabel')} 
                  placeholder={t('forgotPassword:emailPlaceholder')} 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                  icon="mail-outline" 
                />
                
                <View style={styles.buttonWrapper}>
                  <Button 
                    title={t('forgotPassword:sendLink')} 
                    variant="primary" 
                    loading={loading} 
                    onPress={handleSubmit} 
                  />
                </View>
              </View>
            ) : (
              <View style={styles.successBlock}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={64} color="#1A8744" />
                </View>
                <Text style={styles.successTitle}>{t('forgotPassword:emailSent')}</Text>
                <Text style={styles.successSubtitle}>
                  {t('forgotPassword:emailSentDesc').replace('{{email}}', email)}
                </Text>
                <Button 
                  title={t('forgotPassword:backToLogin')} 
                  variant="secondary" 
                  onPress={() => router.replace('/(auth)')} 
                  style={{ marginTop: 24 }}
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#1A8744', // Le vert de ton design
  },
  flex1: {
    flex: 1,
  },
  greenHeader: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'BricolageGrotesque_700Bold', // Ajuster avec votre typo
    fontWeight: '600',
  },
  logoBlock: {
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: 16,
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  whiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10, // Pour Android
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  formContainer: {
    gap: 20,
  },
  buttonWrapper: {
    marginTop: 12,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  successBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: '#111827',
  },
  successSubtitle: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  successEmail: {
    fontWeight: '600',
    color: '#111827',
  },
});