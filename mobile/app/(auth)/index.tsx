import React, { useState, useRef, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, View, TextInput, Image, ActivityIndicator, type TextInputProps } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, G } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useGoogleAuth } from '@/core/api/googleAuthService';
import { useThemeColors } from '@/hooks/useThemeColors';

const STEP_IMAGES = [
  require('../../assets/onbording/19197294.jpg'),
  require('../../assets/onbording/document-vectoriel-vectoriel-conception-coloree.png'),
  require('../../assets/onbording/59337.jpg'),
  require('../../assets/onbording/Wavy_Bus-06_Single-06.jpg'),
];

function FieldInput({
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  rightButton,
  keyboardType,
  autoCapitalize,
  id,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  error?: string;
  rightButton?: React.ReactNode;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  id?: string;
}) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View style={{}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: error
              ? colors.dangerBg
              : focused
                ? colors.surface
                : colors.background,
            borderWidth: 1.5,
            borderRadius: 14,
            height: 52,
            paddingHorizontal: 12,
            borderColor: error
              ? colors.danger
              : focused
                ? colors.tint
                : colors.border,
          }}
        >
          {icon && (
            <View style={{ marginRight: 10, width: 16, alignItems: 'center' }}>
              <Ionicons
                name={icon}
                size={16}
                color={focused ? colors.tint : colors.border}
              />
            </View>
          )}
          <TextInput
            nativeID={id}
            style={{
              flex: 1,
              fontSize: 15,
              color: colors.text,
              fontFamily: 'Poppins_400Regular',
              height: '100%',
            }}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.border}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize || 'none'}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {rightButton && (
            <View style={{ marginLeft: 4 }}>{rightButton}</View>
          )}
        </View>
      </View>
      {error && (
        <ThemedText style={{ color: colors.danger, fontSize: 12, fontWeight: '500', marginTop: 4, marginLeft: 4 }}>{error}</ThemedText>
      )}
    </View>
  );
}

function BlobBackground() {
  const colors = useThemeColors();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
      {/* Top-right accent */}
      <View style={{
        position: 'absolute',
        top: -80, right: -80,
        width: 260, height: 260,
        borderRadius: 9999,
        backgroundColor: colors.tint,
        opacity: 0.06,
      }} />
      {/* Bottom-left accent */}
      <View style={{
        position: 'absolute',
        bottom: -60, left: -60,
        width: 200, height: 200,
        borderRadius: 9999,
        backgroundColor: colors.success,
        opacity: 0.06,
      }} />
      {/* Mid small accent */}
      <View style={{
        position: 'absolute',
        top: '40%', right: -30,
        width: 120, height: 120,
        borderRadius: 9999,
        backgroundColor: colors.tint,
        opacity: 0.04,
      }} />
    </View>
  );
}

function MotifBackground() {
  const colors = useThemeColors();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Defs />
        <G opacity={0.05}>
          <Path
            d="M0,80 C150,0 300,160 450,80 C600,0 700,120 800,60"
            stroke={colors.tint}
            strokeWidth={1.5}
            fill="none"
          />
          <Path
            d="M0,200 C120,280 280,120 430,220 C580,320 680,160 800,240"
            stroke={colors.tint}
            strokeWidth={1}
            fill="none"
          />
          <Path
            d="M0,350 C200,270 350,420 500,320 C650,220 720,380 800,300"
            stroke={colors.tint}
            strokeWidth={1}
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  const colors = useThemeColors();
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
    }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.border,
            ...(current === i + 1 ? { width: 20, backgroundColor: colors.tint } : {}),
          }}
        />
      ))}
    </View>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const colors = useThemeColors();
  if (!password) return null;
  const calcStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = calcStrength(password);
  const bars = [
    { active: strength >= 1, color: colors.danger },
    { active: strength >= 2, color: colors.warning },
    { active: strength >= 3, color: colors.success },
    { active: strength >= 4, color: colors.success },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 2 }}>
      {bars.map((b, i) => (
        <View
          key={i}
          style={{
            height: 4, flex: 1, borderRadius: 9999,
            backgroundColor: b.active ? b.color : 'rgba(0,0,0,0.1)',
          }}
        />
      ))}
    </View>
  );
}



export default function LoginScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const { t } = useTranslation();
  const STEP_DATA = [
    { title: t('auth:step1Title'), subtitle: t('auth:step1Subtitle') },
    { title: t('auth:step2Title'), subtitle: t('auth:step2Subtitle') },
    { title: t('auth:step3Title'), subtitle: t('auth:step3Subtitle') },
    { title: t('auth:step4Title'), subtitle: t('auth:step4Subtitle') },
  ];
  const { login: doLogin, register: doRegister, isAuthenticated } = useAuthStore();

  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register
  const [regStep, setRegStep] = useState(1);
  const [regForm, setRegForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    password: '',
    passwordConfirm: '',
    pseudo: '',
    referral: '',
  });
  const [pwStrength, setPwStrength] = useState(0);
  const [pwMatch, setPwMatch] = useState<boolean | null>(null);
  const [pinValues, setPinValues] = useState(['', '', '', '', '', '']);
  const [showReferral, setShowReferral] = useState(!!params?.ref);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  const pinRefs = useRef<(TextInput | null)[]>([]);



  React.useEffect(() => {
    if (params?.ref) {
      setRegForm((f) => ({ ...f, referral: params.ref || '' }));
      setShowReferral(true);
    }
  }, [params?.ref]);

  const calcPwStrength = useCallback((pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }, []);

  const pseudoSuggestions = regForm.nom
    ? [
        `${regForm.prenom?.toLowerCase?.() ?? ''}_${regForm.nom?.toLowerCase?.() ?? ''}`,
        `${regForm.nom?.toLowerCase?.() ?? ''}${Math.floor(Math.random() * 999)}`,
        `${(regForm.prenom?.[0] ?? '').toLowerCase()}${regForm.nom?.toLowerCase?.() ?? ''}${Math.floor(Math.random() * 99)}`,
        `${regForm.prenom?.toLowerCase?.() ?? ''}.${regForm.nom?.toLowerCase?.() ?? ''}${Math.floor(Math.random() * 99)}`,
      ]
    : [];

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginError(t('auth:fieldsRequired'));
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      await doLogin(loginForm.email, loginForm.password);
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || t('auth:loginError'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regForm.pseudo) return;
    setRegError('');
    setRegLoading(true);
    try {
      await doRegister({
        nom: regForm.nom,
        prenom: regForm.prenom,
        email: regForm.email,
        mot_de_passe: regForm.password,
        telephone: regForm.telephone,
      });
    } catch (err: any) {
      setRegError(err?.response?.data?.message || err?.message || t('auth:registerError'));
    } finally {
      setRegLoading(false);
    }
  };

  const canGoNext = (step: number): boolean => {
    if (step === 1) return !!(regForm.nom && regForm.prenom && regForm.email && regForm.telephone && regForm.password && pwStrength >= 2);
    if (step === 2) return pwMatch === true;
    if (step === 3) return pinValues.every((v) => v !== '');
    return true;
  };

  function Step1Fields() {
    return (
      <>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FieldInput icon="person-outline" value={regForm.nom} onChangeText={(v) => setRegForm((f) => ({ ...f, nom: v }))} placeholder={t('auth:lastName')} />
          </View>
          <View style={{ flex: 1 }}>
            <FieldInput icon="person-outline" value={regForm.prenom} onChangeText={(v) => setRegForm((f) => ({ ...f, prenom: v }))} placeholder={t('auth:firstName')} />
          </View>
        </View>

        <FieldInput icon="call-outline" value={regForm.telephone} onChangeText={(v) => setRegForm((f) => ({ ...f, telephone: v }))} placeholder={t('auth:phone')} keyboardType="phone-pad" />

        <FieldInput icon="mail-outline" value={regForm.email} onChangeText={(v) => setRegForm((f) => ({ ...f, email: v }))} placeholder={t('auth:emailPlaceholder')} keyboardType="email-address" />

        <View>
          <FieldInput
            icon="lock-closed-outline"
            value={regForm.password}
            onChangeText={(v) => {
              setRegForm((f) => ({ ...f, password: v }));
              const s = calcPwStrength(v);
              setPwStrength(s);
            }}
            placeholder={t('auth:password')}
            secureTextEntry={!pwVisible}
            rightButton={
              <Pressable onPress={() => setPwVisible(!pwVisible)} style={{ padding: 4 }}>
                <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
              </Pressable>
            }
          />
          <PasswordStrength password={regForm.password} />
        </View>

        <Pressable
          onPress={() => setRegStep(2)}
          disabled={!canGoNext(1)}
          style={{
            width: '100%',
            height: 50,
            backgroundColor: colors.tint,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: colors.tint,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 4,
            ...(!canGoNext(1) ? { opacity: 0.6 } : {}),
          }}
        >
          <ThemedText style={{ color: colors.surface, fontSize: 15, fontWeight: '700', fontFamily: 'BricolageGrotesque_700Bold' }}>{t('common:continue')}</ThemedText>
          <Ionicons name="arrow-forward" size={18} color={colors.surface} />
        </Pressable>
      </>
    );
  }

  function Step2Confirm() {
    return (
      <>
        <FieldInput icon="lock-closed-outline" value={regForm.password} placeholder={t('auth:password')} secureTextEntry />

        <View>
          <FieldInput
            icon="lock-open-outline"
            value={regForm.passwordConfirm}
            onChangeText={(v) => {
              setRegForm((f) => ({ ...f, passwordConfirm: v }));
              setPwMatch(v === regForm.password && v.length > 0);
            }}
            placeholder={t('auth:confirmPassword')}
            secureTextEntry={!pwVisible}
            rightButton={
              <Pressable onPress={() => setPwVisible(!pwVisible)} style={{ padding: 4 }}>
                <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
              </Pressable>
            }
          />
          {regForm.passwordConfirm && pwMatch === false && (
            <ThemedText style={{ fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4, color: colors.danger }}>
              <Ionicons name="close-circle" size={12} color={colors.danger} /> {t('auth:passwordMismatch')}
            </ThemedText>
          )}
          {pwMatch === true && (
            <ThemedText style={{ fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4, color: colors.success }}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} /> {t('auth:passwordMatch')}
            </ThemedText>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Pressable onPress={() => setRegStep(1)} style={{
            paddingHorizontal: 16,
            height: 50,
            backgroundColor: 'rgba(255,255,255,0.65)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.9)',
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setRegStep(3)}
            disabled={!canGoNext(2)}
            style={{
              flex: 1,
              width: '100%',
              height: 50,
              backgroundColor: colors.tint,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: colors.tint,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 4,
              ...(!canGoNext(2) ? { opacity: 0.6 } : {}),
            }}
          >
            <ThemedText style={{ color: colors.surface, fontSize: 15, fontWeight: '700', fontFamily: 'BricolageGrotesque_700Bold' }}>{t('common:validate')}</ThemedText>
            <Ionicons name="arrow-forward" size={18} color={colors.surface} />
          </Pressable>
        </View>
      </>
    );
  }

  function Step3Pin() {
    return (
      <>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <ThemedText style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            {t('auth:pinSentTo')}{'\n'}
            <ThemedText style={{ fontWeight: '600', color: colors.text }}>{regForm.telephone}</ThemedText>
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 8 }}>
          {pinValues.map((val, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => { pinRefs.current[idx] = ref; }}
              style={{
                width: 44,
                height: 52,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: '700',
                backgroundColor: val ? colors.successBg : colors.surface,
                borderWidth: 2,
                borderRadius: 14,
                color: colors.text,
                borderColor: val ? colors.greenDark : colors.border,
              }}
              maxLength={1}
              keyboardType="number-pad"
              value={val}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9]/g, '');
                const newPin = [...pinValues];
                newPin[idx] = clean;
                setPinValues(newPin);
                if (clean && idx < 5) {
                  pinRefs.current[idx + 1]?.focus();
                }
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !val && idx > 0) {
                  pinRefs.current[idx - 1]?.focus();
                }
              }}
            />
          ))}
        </View>

        <ThemedText style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
          {t('auth:pinNotReceived')}{' '}
          <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('auth:resend')}</ThemedText>
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Pressable onPress={() => setRegStep(2)} style={{
            paddingHorizontal: 16,
            height: 50,
            backgroundColor: 'rgba(255,255,255,0.65)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.9)',
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setRegStep(4)}
            disabled={!canGoNext(3)}
            style={{
              flex: 1,
              width: '100%',
              height: 50,
              backgroundColor: colors.tint,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: colors.tint,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 4,
              ...(!canGoNext(3) ? { opacity: 0.6 } : {}),
            }}
          >
            <ThemedText style={{ color: colors.surface, fontSize: 15, fontWeight: '700', fontFamily: 'BricolageGrotesque_700Bold' }}>{t('auth:verify')}</ThemedText>
            <Ionicons name="arrow-forward" size={18} color={colors.surface} />
          </Pressable>
        </View>
      </>
    );
  }

  function Step4Pseudo() {
    return (
      <>
        <View style={{ flexDirection: 'column' }}>
          <ThemedText style={{
            fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1,
            flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginLeft: 4,
          }}>
            <Ionicons name="at" size={11} color={colors.tint} /> {t('auth:pseudo')}
          </ThemedText>
          <View style={{ position: 'relative' }}>
            <View style={{
              position: 'absolute',
              left: 14,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              zIndex: 10,
            }}>
              <ThemedText style={{ color: colors.border, fontSize: 14, fontWeight: '700' }}>@</ThemedText>
            </View>
            <TextInput
              style={{
                width: '100%',
                height: 52,
                paddingLeft: 28,
                paddingRight: 42,
                backgroundColor: colors.background,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: 14,
                fontSize: 15,
                color: colors.text,
              }}
              value={regForm.pseudo}
              onChangeText={(v) => setRegForm((f) => ({ ...f, pseudo: v }))}
              placeholder={t('auth:pseudoPlaceholder')}
              placeholderTextColor={colors.border}
              autoCapitalize="none"
            />
          </View>
          <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 6, marginLeft: 4 }}>
            {t('auth:pseudoHint')}
          </ThemedText>
        </View>

        {pseudoSuggestions.length > 0 && (
          <View>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>{t('auth:suggestions')}
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pseudoSuggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setRegForm((f) => ({ ...f, pseudo: s }))}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 9999,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    @{s}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'column', gap: 6 }}>
          <Pressable
            onPress={() => setShowReferral(!showReferral)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="people" size={14} color={colors.tint} />
            <ThemedText style={{ fontSize: 12.5, fontWeight: '600', color: colors.textSecondary }}>
              {t('auth:referralPrompt')}
            </ThemedText>
            <Ionicons
              name={showReferral ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textSecondary}
            />
          </Pressable>
          {showReferral && (
            <View style={{ gap: 6 }}>
              <FieldInput
                icon="link-outline"
                value={regForm.referral}
                onChangeText={(v) => setRegForm((f) => ({ ...f, referral: v }))}
                placeholder={t('auth:referralPlaceholder')}
              />
              <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary }}>
                {t('auth:referralBonus')}{' '}
                <ThemedText style={{ fontWeight: '600', color: colors.tint }}>5%</ThemedText>{t('auth:referralBonusEnd')}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Pressable onPress={() => setRegStep(3)} style={{
            paddingHorizontal: 16,
            height: 50,
            backgroundColor: 'rgba(255,255,255,0.65)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.9)',
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={handleRegister}
            disabled={!regForm.pseudo || regLoading}
            style={{
              flex: 1,
              height: 50,
              backgroundColor: colors.greenDark,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
              ...((!regForm.pseudo || regLoading) ? { opacity: 0.6 } : {}),
            }}
          >
            {regLoading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Ionicons name="rocket" size={16} color={colors.surface} />
                  <ThemedText style={{ color: colors.surface, fontSize: 15, fontWeight: '700', fontFamily: 'BricolageGrotesque_700Bold' }}>{t('auth:createMyAccount')}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </>
    );
  }

  function SocialLoginButtons({ loading }: { loading: boolean }) {
    const { promptAsync, loading: googleLoading } = useGoogleAuth();
    const isBusy = loading || googleLoading;

    return (
      <Pressable
        style={{
          width: '100%',
          height: 48,
          backgroundColor: 'rgba(255,255,255,0.65)',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.9)',
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          ...(isBusy ? { opacity: 0.5 } : {}),
        }}
        disabled={isBusy}
        onPress={() => promptAsync()}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Ionicons name="logo-google" size={16} color={colors.danger} />
        )}
        <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
          {t('auth:continueWithGoogle')}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundSelected }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {tab === 'register' ? (
          <View style={{ flex: 1 }}>
            <MotifBackground />
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
              style={{ paddingHorizontal: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={() => setTab('login')} style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingTop: 20,
                paddingBottom: 12,
              }}>
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t('auth:haveAccount')} <ThemedText style={{ fontWeight: '700', color: colors.tint }}>{t('auth:login')}</ThemedText>
                </ThemedText>
              </Pressable>

              <View style={{ flex: 1, paddingTop: 12 }}>
                <Image
                  source={STEP_IMAGES[regStep - 1]}
                  style={{
                    width: '100%',
                    height: 200,
                    marginBottom: 20,
                    borderRadius: 16,
                  }}
                  resizeMode="contain"
                />

                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <ThemedText style={{
                    fontFamily: 'BricolageGrotesque_700Bold',
                    fontSize: 20,
                    fontWeight: '800',
                    color: colors.text,
                    textAlign: 'center',
                    marginBottom: 4,
                  }}>
                    {STEP_DATA[regStep - 1].title}
                  </ThemedText>
                  <ThemedText style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    fontWeight: '500',
                  }}>
                    {STEP_DATA[regStep - 1].subtitle}
                  </ThemedText>
                </View>

                <StepDots current={regStep} total={4} />

                {regError ? (
                  <View style={{
                    padding: 12, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBg, borderRadius: 14,
                  }}>
                    <ThemedText style={{ color: colors.danger, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{regError}</ThemedText>
                  </View>
                ) : null}

                <View style={{ width: '100%', gap: 12 }}>
                  {regStep === 1 && <Step1Fields />}
                  {regStep === 2 && <Step2Confirm />}
                  {regStep === 3 && <Step3Pin />}
                  {regStep === 4 && <Step4Pseudo />}
                </View>
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
            style={{ paddingHorizontal: 0 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <BlobBackground />
            <MotifBackground />

            <View style={{
              position: 'relative',
              zIndex: 10,
              flex: 1,
              justifyContent: 'space-between',
              paddingTop: 60,
              paddingHorizontal: 24,
            }}>
              <View style={{
                alignItems: 'center',
                marginBottom: 40,
              }}>
                {/* App name */}
                <ThemedText style={{
                  fontFamily: 'BricolageGrotesque_700Bold',
                  fontSize: 36,
                  fontWeight: '800',
                  letterSpacing: -1,
                  marginBottom: 4,
                }}>
                  <ThemedText style={{ color: colors.tint }}>Doc</ThemedText>
                  <ThemedText style={{ color: colors.text }}>Master</ThemedText>
                </ThemedText>
                <View style={{ width: 28, height: 3, backgroundColor: colors.tint, borderRadius: 2, marginBottom: 28 }} />

                <ThemedText style={{
                  fontFamily: 'BricolageGrotesque_700Bold',
                  fontSize: 22,
                  fontWeight: '800',
                  color: colors.text,
                  textAlign: 'center',
                  marginBottom: 6,
                }}>
                  {t('auth:welcomeBack')}
                </ThemedText>
                <ThemedText style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: 20,
                }}>
                  {t('auth:loginToContinue')}
                </ThemedText>
              </View>

              <View style={{ gap: 14 }}>
                {loginError ? (
                  <View style={{
                    padding: 12, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBg, borderRadius: 14,
                  }}>
                    <ThemedText style={{ color: colors.danger, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                      {loginError}
                    </ThemedText>
                  </View>
                ) : null}

                <FieldInput
                  icon="mail-outline"
                  value={loginForm.email}
                  onChangeText={(v) => setLoginForm((f) => ({ ...f, email: v }))}
                  placeholder={t('auth:emailPlaceholder')}
                  keyboardType="email-address"
                />

                <FieldInput
                  icon="lock-closed-outline"
                  value={loginForm.password}
                  onChangeText={(v) => setLoginForm((f) => ({ ...f, password: v }))}
                  placeholder={t('auth:password')}
                  secureTextEntry={!pwVisible}
                  rightButton={
                    <Pressable onPress={() => setPwVisible(!pwVisible)} style={{ padding: 4 }}>
                      <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                    </Pressable>
                  }
                />

                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable style={{ alignSelf: 'flex-end' }}>
                    <ThemedText style={{ fontSize: 13, color: colors.tint, fontWeight: '600' }}>
                      {t('auth:forgotPassword')}
                    </ThemedText>
                  </Pressable>
                </Link>

                <Pressable
                  onPress={handleLogin}
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    height: 54,
                    backgroundColor: colors.tint,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.tint,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 4,
                    ...(loginLoading ? { opacity: 0.6 } : {}),
                  }}
                >
                  {loginLoading ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <ThemedText style={{
                      color: colors.surface,
                      fontSize: 17,
                      fontWeight: '700',
                      fontFamily: 'BricolageGrotesque_700Bold',
                    }}>
                      {t('auth:loginButton')}
                    </ThemedText>
                  )}
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                  <ThemedText style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{t('auth:or')}</ThemedText>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                </View>

                <SocialLoginButtons loading={loginLoading} />

                <Pressable onPress={() => setTab('register')} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                    {t('auth:noAccount')}{' '}
                    <ThemedText style={{ fontWeight: '700', color: colors.tint }}>{t('auth:createAccount')}</ThemedText>
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
