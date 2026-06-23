import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { authService } from '@/core/api/authService';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = getStyles(colors);
  
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
      {/* PARTIE SUPÉRIEURE */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.onPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('forgotPassword:title')}</Text>
          <View style={{ width: 24 }} /> {/* Spacer pour centrer le titre */}
        </View>

        <View style={styles.logoBlock}>
          <Ionicons name="document-text" size={48} color={colors.onPrimary} />
          <Text style={styles.logoText}>{t('forgotPassword:logoText')}</Text>
          <Text style={styles.descriptionText}>
            {t('forgotPassword:description')}
          </Text>
        </View>
      </View>

      {/* CARTE INFÉRIEURE */}
      <View style={styles.card}>
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
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
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

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.greenDark,
  },
  flex1: {
    flex: 1,
  },
  header: {
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
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  logoBlock: {
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: colors.onPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  descriptionText: {
    color: colors.glassTintStrong,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.backgroundElement,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
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
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
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
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  successSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
