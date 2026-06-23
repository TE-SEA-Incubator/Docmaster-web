import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BottomTabInset } from '@/constants/theme';
import { useAuthStore } from '@/core/store/useAuthStore';
import { authService } from '@/core/api/authService';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ManageProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { user, fetchProfile } = useAuthStore();

  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', ville: '', pays: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setForm({
        nom: user.nom || '',
        prenom: user.prenom || '',
        telephone: user.telephone || '',
        ville: user.ville || '',
        pays: user.pays || '',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    const errs: Record<string, string> = {};
    if (!form.nom.trim()) errs.nom = t('manageProfile:required');
    if (!form.prenom.trim()) errs.prenom = t('manageProfile:required');
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await authService.updateProfile(form);
      if (res.success) {
        await fetchProfile();
        setMessage({ text: t('manageProfile:saved'), type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        setMessage({ text: res.error || t('common:error'), type: 'error' });
      }
    } catch {
      setMessage({ text: t('common:networkError'), type: 'error' });
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword) errs.currentPassword = t('manageProfile:required');
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) errs.newPassword = t('manageProfile:min6Chars');
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) errs.confirmNewPassword = t('manageProfile:noMatch');
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }

    setPasswordErrors({});
    setPasswordLoading(true);
    setPasswordMessage({ text: '', type: '' });
    try {
      const res = await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (res.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        setIsPasswordOpen(false);
        setPasswordMessage({ text: t('manageProfile:passwordChanged'), type: 'success' });
        setTimeout(() => setPasswordMessage({ text: '', type: '' }), 3000);
      } else {
        setPasswordMessage({ text: res.error || t('common:error'), type: 'error' });
      }
    } catch {
      setPasswordMessage({ text: t('common:networkError'), type: 'error' });
    } finally { setPasswordLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundElement }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('manageProfile:title')}</Text>
        </View>

        {message.text ? (
          <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: message.type === 'success' ? colors.successBg : colors.dangerBg }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: message.type === 'success' ? colors.success : colors.danger, textAlign: 'center' }}>{message.text}</Text>
          </View>
        ) : null}

        <View style={{ marginHorizontal: 16, marginTop: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input label={t('manageProfile:nom')} value={form.nom} onChangeText={(v: string) => setForm(p => ({ ...p, nom: v }))} error={errors.nom} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('manageProfile:prenom')} value={form.prenom} onChangeText={(v: string) => setForm(p => ({ ...p, prenom: v }))} error={errors.prenom} />
            </View>
          </View>
          <Input label={t('manageProfile:telephone')} value={form.telephone} onChangeText={(v: string) => setForm(p => ({ ...p, telephone: v }))} keyboardType="phone-pad" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input label={t('manageProfile:ville')} value={form.ville} onChangeText={(v: string) => setForm(p => ({ ...p, ville: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('manageProfile:pays')} value={form.pays} onChangeText={(v: string) => setForm(p => ({ ...p, pays: v }))} />
            </View>
          </View>
          <Button title={loading ? t('manageProfile:saving') : t('manageProfile:save')} onPress={handleUpdate} loading={loading} />
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 28, backgroundColor: colors.backgroundElement, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <Pressable
            onPress={() => setIsPasswordOpen(!isPasswordOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>{t('manageProfile:changePassword')}</Text>
            </View>
            <Ionicons name={isPasswordOpen ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.border} />
          </Pressable>

          {isPasswordOpen && (
            <View style={{ padding: 18, paddingTop: 0, gap: 12 }}>
              {passwordMessage.text ? (
                <View style={{ padding: 10, borderRadius: 10, backgroundColor: passwordMessage.type === 'success' ? colors.successBg : colors.dangerBg }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: passwordMessage.type === 'success' ? colors.success : colors.danger, textAlign: 'center' }}>{passwordMessage.text}</Text>
                </View>
              ) : null}
              <Input label={t('manageProfile:currentPassword')} secureTextEntry value={passwordForm.currentPassword} onChangeText={(v: string) => setPasswordForm(p => ({ ...p, currentPassword: v }))} error={passwordErrors.currentPassword} />
              <Input label={t('manageProfile:newPassword')} secureTextEntry value={passwordForm.newPassword} onChangeText={(v: string) => setPasswordForm(p => ({ ...p, newPassword: v }))} error={passwordErrors.newPassword} />
              <Input label={t('manageProfile:confirmPassword')} secureTextEntry value={passwordForm.confirmNewPassword} onChangeText={(v: string) => setPasswordForm(p => ({ ...p, confirmNewPassword: v }))} error={passwordErrors.confirmNewPassword} />
              <Button title={passwordLoading ? t('manageProfile:modifying') : t('manageProfile:modify')} variant="secondary" onPress={handleChangePassword} loading={passwordLoading} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
