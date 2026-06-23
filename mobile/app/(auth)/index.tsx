import React, { useState, useRef, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, View, TextInput, Image, Animated, Easing, ActivityIndicator, StyleSheet, type TextInputProps } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, G } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useGoogleAuth } from '@/core/api/googleAuthService';
import { Colors } from '@/constants/theme';

const LOGO = require('../../assets/docmaster.png');

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
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View style={styles.fieldRelative}>
        <View
          style={[
            styles.fieldBase,
            error
              ? styles.fieldError
              : focused
                ? styles.fieldFocused
                : styles.fieldDefault,
          ]}
        >
          {icon && (
            <View style={styles.fieldIconWrapper}>
              <Ionicons
                name={icon}
                size={16}
                color={focused ? Colors.light.tint : '#c4bab0'}
              />
            </View>
          )}
          <TextInput
            nativeID={id}
            style={styles.fieldInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#c4bab0"
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize || 'none'}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {rightButton && (
            <View style={styles.fieldRightBtn}>{rightButton}</View>
          )}
        </View>
      </View>
      {error && (
        <ThemedText style={styles.fieldErrorText}>{error}</ThemedText>
      )}
    </View>
  );
}

function BlobBackground() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = (anim: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    loop(anim1, 5000).start();
    loop(anim2, 6000).start();
    loop(anim3, 7000).start();
  }, []);

  const translateY = (anim: Animated.Value, range: number) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0, -range] });

  return (
    <View style={styles.blobContainer} pointerEvents="none">
      <Animated.View
        style={[styles.blob1, { top: -40, right: -30, transform: [{ translateY: translateY(anim1, 15) }] }]}
      />
      <Animated.View
        style={[styles.blob2, { top: 20, right: 170, transform: [{ translateY: translateY(anim2, 10) }] }]}
      />
      <Animated.View
        style={[styles.blob3, { bottom: -30, left: -40, transform: [{ translateY: translateY(anim3, 12) }] }]}
      />
      <Animated.View
        style={[styles.blob4, { bottom: 40, right: 20, transform: [{ translateY: translateY(anim2, 8) }] }]}
      />
      <Animated.View
        style={[styles.blob5, { top: '48%', left: 5, transform: [{ translateY: translateY(anim1, 18) }] }]}
      />
    </View>
  );
}

function MotifBackground() {
  return (
    <View style={styles.motifContainer} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs />
        <G opacity={0.08}>
          <Path
            d="M0,100 C100,0 200,200 300,100 C400,0 500,150 600,50"
            stroke="#1E3A2F"
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M0,200 C120,300 250,100 380,250 C510,400 600,200 700,300"
            stroke="#1E3A2F"
            strokeWidth={1.5}
            fill="none"
          />
          <Path
            d="M50,400 C200,300 300,500 450,350 C550,250 650,450 750,300"
            stroke="#1E3A2F"
            strokeWidth={1}
            fill="none"
          />
          <Circle cx={80} cy={80} r={40} fill="#1E3A2F" />
          <Circle cx={320} cy={420} r={30} fill="#1E3A2F" />
          <Circle cx={600} cy={120} r={25} fill="#1E3A2F" />
          <Circle cx={700} cy={380} r={35} fill="#1E3A2F" />
        </G>
      </Svg>
    </View>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.onbDotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.onbDot,
            current === i + 1 && styles.onbDotActive,
          ]}
        />
      ))}
    </View>
  );
}

function PasswordStrength({ password }: { password: string }) {
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
    { active: strength >= 1, color: '#EF4444' },
    { active: strength >= 2, color: '#EAB308' },
    { active: strength >= 3, color: '#22C55E' },
    { active: strength >= 4, color: '#16A34A' },
  ];

  return (
    <View style={styles.pwStrengthRow}>
      {bars.map((b, i) => (
        <View
          key={i}
          style={[
            styles.pwStrengthBar,
            { backgroundColor: b.active ? b.color : 'rgba(0,0,0,0.1)' },
          ]}
        />
      ))}
    </View>
  );
}



export default function LoginScreen() {
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
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <FieldInput icon="person-outline" value={regForm.nom} onChangeText={(v) => setRegForm((f) => ({ ...f, nom: v }))} placeholder={t('auth:lastName')} />
          </View>
          <View style={styles.nameField}>
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
              <Pressable onPress={() => setPwVisible(!pwVisible)} style={styles.pwToggle}>
                <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.light.textSecondary} />
              </Pressable>
            }
          />
          <PasswordStrength password={regForm.password} />
        </View>

        <Pressable
          onPress={() => setRegStep(2)}
          disabled={!canGoNext(1)}
          style={[styles.onbNextBtn, !canGoNext(1) && styles.disabledBtn]}
        >
          <ThemedText style={styles.onbNextBtnText}>{t('common:continue')}</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="white" />
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
              <Pressable onPress={() => setPwVisible(!pwVisible)} style={styles.pwToggle}>
                <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.light.textSecondary} />
              </Pressable>
            }
          />
          {regForm.passwordConfirm && pwMatch === false && (
            <ThemedText style={styles.pwMismatchText}>
              <Ionicons name="close-circle" size={12} color="#EF4444" /> {t('auth:passwordMismatch')}
            </ThemedText>
          )}
          {pwMatch === true && (
            <ThemedText style={styles.pwMatchText}>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" /> {t('auth:passwordMatch')}
            </ThemedText>
          )}
        </View>

        <View style={styles.onbStepNav}>
          <Pressable onPress={() => setRegStep(1)} style={styles.onbBackBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          </Pressable>
          <Pressable
            onPress={() => setRegStep(3)}
            disabled={!canGoNext(2)}
            style={[styles.onbNextBtn, styles.flex1, !canGoNext(2) && styles.disabledBtn]}
          >
            <ThemedText style={styles.onbNextBtnText}>{t('common:validate')}</ThemedText>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </Pressable>
        </View>
      </>
    );
  }

  function Step3Pin() {
    return (
      <>
        <View style={styles.pinHeader}>
          <ThemedText style={styles.pinHeaderText}>
            {t('auth:pinSentTo')}{'\n'}
            <ThemedText style={styles.pinPhone}>{regForm.telephone}</ThemedText>
          </ThemedText>
        </View>

        <View style={styles.pinRow}>
          {pinValues.map((val, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => { pinRefs.current[idx] = ref; }}
              style={[
                styles.pinInput,
                val ? styles.pinInputFilled : styles.pinInputEmpty,
              ]}
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

        <ThemedText style={styles.pinResendText}>
          {t('auth:pinNotReceived')}{' '}
          <ThemedText style={styles.pinResendLink}>{t('auth:resend')}</ThemedText>
        </ThemedText>

        <View style={styles.onbStepNav}>
          <Pressable onPress={() => setRegStep(2)} style={styles.onbBackBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          </Pressable>
          <Pressable
            onPress={() => setRegStep(4)}
            disabled={!canGoNext(3)}
            style={[styles.onbNextBtn, styles.flex1, !canGoNext(3) && styles.disabledBtn]}
          >
            <ThemedText style={styles.onbNextBtnText}>{t('auth:verify')}</ThemedText>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </Pressable>
        </View>
      </>
    );
  }

  function Step4Pseudo() {
    return (
      <>
        <View style={styles.pseudoSection}>
          <ThemedText style={styles.pseudoLabel}>
            <Ionicons name="at" size={11} color={Colors.light.tint} /> {t('auth:pseudo')}
          </ThemedText>
          <View style={styles.pseudoInputWrapper}>
            <View style={styles.pseudoAtSign}>
              <ThemedText style={styles.pseudoAtText}>@</ThemedText>
            </View>
            <TextInput
              style={styles.pseudoInput}
              value={regForm.pseudo}
              onChangeText={(v) => setRegForm((f) => ({ ...f, pseudo: v }))}
              placeholder={t('auth:pseudoPlaceholder')}
              placeholderTextColor="#c4bab0"
              autoCapitalize="none"
            />
          </View>
          <ThemedText style={styles.pseudoHint}>
            {t('auth:pseudoHint')}
          </ThemedText>
        </View>

        {pseudoSuggestions.length > 0 && (
          <View>
              <ThemedText style={styles.suggestionsTitle}>{t('auth:suggestions')}
            </ThemedText>
            <View style={styles.suggestionsRow}>
              {pseudoSuggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setRegForm((f) => ({ ...f, pseudo: s }))}
                  style={styles.suggestionPill}
                >
                  <ThemedText style={styles.suggestionPillText}>
                    @{s}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.referralSection}>
          <Pressable
            onPress={() => setShowReferral(!showReferral)}
            style={styles.referralToggle}
          >
            <Ionicons name="people" size={14} color={Colors.light.tint} />
            <ThemedText style={styles.referralToggleText}>
              {t('auth:referralPrompt')}
            </ThemedText>
            <Ionicons
              name={showReferral ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={Colors.light.textSecondary}
            />
          </Pressable>
          {showReferral && (
            <View style={styles.referralInputBlock}>
              <FieldInput
                icon="link-outline"
                value={regForm.referral}
                onChangeText={(v) => setRegForm((f) => ({ ...f, referral: v }))}
                placeholder={t('auth:referralPlaceholder')}
              />
              <ThemedText style={styles.referralBonusText}>
                {t('auth:referralBonus')}{' '}
                <ThemedText style={styles.referralBonusHighlight}>5%</ThemedText>{t('auth:referralBonusEnd')}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.onbStepNav}>
          <Pressable onPress={() => setRegStep(3)} style={styles.onbBackBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          </Pressable>
          <Pressable
            onPress={handleRegister}
            disabled={!regForm.pseudo || regLoading}
            style={[styles.onbFinalBtn, (!regForm.pseudo || regLoading) && styles.disabledBtn]}
          >
            {regLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="rocket" size={16} color="white" />
                  <ThemedText style={styles.onbNextBtnText}>{t('auth:createMyAccount')}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </>
    );
  }

  function SocialLoginButtons({ loading }: { loading: boolean }) {
    return (
      <Pressable style={[styles.socialBtn, { opacity: 0.5 }]} disabled={true}>
        <Ionicons name="logo-google" size={16} color="#db4437" />
        <ThemedText style={styles.socialBtnText}>{t('auth:loginBlocked')}</ThemedText>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {tab === 'register' ? (
          <View style={styles.flex1}>
            <MotifBackground />
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
              style={styles.onbScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={() => setTab('login')} style={styles.onbTopBack}>
                <Ionicons name="chevron-back" size={18} color={Colors.light.textSecondary} />
                <ThemedText style={styles.onbTopBackText}>
                  {t('auth:haveAccount')} <ThemedText style={styles.onbTopBackBold}>{t('auth:login')}</ThemedText>
                </ThemedText>
              </Pressable>

              <View style={styles.onbFullContent}>
                <Image
                  source={STEP_IMAGES[regStep - 1]}
                  style={styles.onbFullImage}
                  resizeMode="contain"
                />

                <View style={styles.onbTextBlock}>
                  <ThemedText style={styles.onbTitle}>
                    {STEP_DATA[regStep - 1].title}
                  </ThemedText>
                  <ThemedText style={styles.onbSubtitle}>
                    {STEP_DATA[regStep - 1].subtitle}
                  </ThemedText>
                </View>

                <StepDots current={regStep} total={4} />

                {regError ? (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>{regError}</ThemedText>
                  </View>
                ) : null}

                <View style={styles.onbFieldsContainer}>
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
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <BlobBackground />
            <MotifBackground />

            <View style={styles.loginFullPage}>
              <View style={styles.loginBrandSection}>
                <Image
                  source={LOGO}
                  style={styles.loginLogo}
                  resizeMode="contain"
                />
                <ThemedText style={styles.loginBrandTitle}>
                  {t('auth:welcomeBack')}
                </ThemedText>
                <ThemedText style={styles.loginBrandSubtitle}>
                  {t('auth:loginToContinue')}
                </ThemedText>
              </View>

              <View style={styles.loginFormSection}>
                {loginError ? (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>
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
                    <Pressable onPress={() => setPwVisible(!pwVisible)} style={styles.pwToggle}>
                      <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.light.textSecondary} />
                    </Pressable>
                  }
                />

                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable style={styles.loginForgotLink}>
                    <ThemedText style={styles.loginForgotText}>
                      {t('auth:forgotPassword')}
                    </ThemedText>
                  </Pressable>
                </Link>

                <Pressable
                  onPress={handleLogin}
                  disabled={loginLoading}
                  style={[styles.loginButton, loginLoading && styles.disabledBtn]}
                >
                  {loginLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ThemedText style={styles.loginButtonText}>
                      {t('auth:loginButton')}
                    </ThemedText>
                  )}
                </Pressable>

                <View style={styles.loginDivider}>
                  <View style={styles.loginDividerLine} />
                  <ThemedText style={styles.loginDividerText}>{t('auth:or')}</ThemedText>
                  <View style={styles.loginDividerLine} />
                </View>

                <SocialLoginButtons loading={loginLoading} />

                <Pressable onPress={() => setTab('register')} style={styles.loginSignupLink}>
                  <ThemedText style={styles.loginSignupText}>
                    {t('auth:noAccount')}{' '}
                    <ThemedText style={styles.loginSignupBold}>{t('auth:createAccount')}</ThemedText>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2EBD9' },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 0 },

  // FieldInput
  fieldRelative: {},
  fieldBase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf8f5',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
  },
  fieldDefault: { borderColor: '#E0D5C4' },
  fieldFocused: { borderColor: Colors.light.tint, backgroundColor: Colors.light.surface },
  fieldError: { borderColor: '#F87171', backgroundColor: 'rgba(254,242,242,0.3)' },
  fieldIconWrapper: { marginRight: 10, width: 16, alignItems: 'center' },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    fontFamily: 'Poppins_400Regular',
    height: '100%',
  },
  fieldRightBtn: { marginLeft: 4 },
  fieldErrorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', marginTop: 4, marginLeft: 4 },

  // BlobBackground
  blobContainer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  blob1: {
    ...StyleSheet.absoluteFill,
    width: 220, height: 200,
    borderRadius: 9999,
    backgroundColor: '#A8CBAF',
    opacity: 0.5,
  },
  blob2: {
    ...StyleSheet.absoluteFill,
    width: 130, height: 120,
    borderRadius: 9999,
    backgroundColor: '#E8B89A',
    opacity: 0.5,
  },
  blob3: {
    ...StyleSheet.absoluteFill,
    width: 170, height: 160,
    borderRadius: 9999,
    backgroundColor: '#A8CBAF',
    opacity: 0.5,
  },
  blob4: {
    ...StyleSheet.absoluteFill,
    width: 100, height: 100,
    borderRadius: 9999,
    backgroundColor: Colors.light.tint,
    opacity: 0.6,
  },
  blob5: {
    ...StyleSheet.absoluteFill,
    width: 90, height: 80,
    borderRadius: 9999,
    backgroundColor: '#E8B89A',
    opacity: 0.4,
  },

  // Onboarding dots
  onbDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  onbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4BAB0',
  },
  onbDotActive: {
    width: 20,
    backgroundColor: Colors.light.tint,
  },

  // PasswordStrength
  pwStrengthRow: { flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 2 },
  pwStrengthBar: { height: 4, flex: 1, borderRadius: 9999 },

  // Error box
  errorBox: { padding: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14 },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  disabledBtn: { opacity: 0.6 },

  // Password toggle
  pwToggle: { padding: 4 },

  // Login full page
  loginFullPage: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  loginBrandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loginLogo: {
    height: 64,
    width: undefined,
    marginBottom: 24,
  },
  loginBrandTitle: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginBrandSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  loginFormSection: {
    gap: 14,
  },
  loginForgotLink: {
    alignSelf: 'flex-end',
  },
  loginForgotText: {
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.light.tint,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonText: {
    color: Colors.light.surface,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  loginDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  loginDividerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },

  // Social button
  socialBtn: {
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
  },
  socialBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Motif background
  motifContainer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },

  // Onboarding full page
  onbScroll: {
    paddingHorizontal: 24,
  },
  onbTopBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 20,
    paddingBottom: 12,
  },
  onbTopBackText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  onbTopBackBold: {
    fontWeight: '700',
    color: Colors.light.tint,
  },
  onbFullContent: {
    flex: 1,
    paddingTop: 12,
  },
  onbFullImage: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 16,
  },

  // Login signup link
  loginSignupLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginSignupText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  loginSignupBold: {
    fontWeight: '700',
    color: Colors.light.tint,
  },

  // Onboarding text block
  onbTextBlock: {
    alignItems: 'center',
    marginBottom: 12,
  },
  onbTitle: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  onbSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  onbFieldsContainer: {
    width: '100%',
    gap: 12,
  },
  onbNextBtn: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  onbNextBtnText: {
    color: Colors.light.surface,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  onbStepNav: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  onbBackBtn: {
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Name row
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },

  // Pin
  pinHeader: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  pinHeaderText: { fontSize: 13, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 20 },
  pinPhone: { fontWeight: '600', color: Colors.light.text },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 8 },
  pinInput: {
    width: 44,
    height: 52,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: Colors.light.surface,
    borderWidth: 2,
    borderRadius: 14,
    color: Colors.light.text,
  },
  pinInputFilled: { borderColor: '#1E3A2F', backgroundColor: '#E8F5EE' },
  pinInputEmpty: { borderColor: '#E0D5C4' },
  pinResendText: { fontSize: 12, color: Colors.light.textSecondary, textAlign: 'center' },
  pinResendLink: { color: Colors.light.tint, fontWeight: '600' },

  // Pseudo section
  pseudoSection: { flexDirection: 'column' },
  pseudoLabel: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginLeft: 4 },
  pseudoInputWrapper: { position: 'relative' },
  pseudoAtSign: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
  pseudoAtText: { color: '#c4bab0', fontSize: 14, fontWeight: '700' },
  pseudoInput: {
    width: '100%',
    height: 52,
    paddingLeft: 28,
    paddingRight: 42,
    backgroundColor: '#faf8f5',
    borderWidth: 1.5,
    borderColor: '#E0D5C4',
    borderRadius: 14,
    fontSize: 15,
    color: Colors.light.text,
  },
  pseudoHint: { fontSize: 11.5, color: Colors.light.textSecondary, marginTop: 6, marginLeft: 4 },

  // Suggestions
  suggestionsTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#E0D5C4',
    backgroundColor: Colors.light.surface,
  },
  suggestionPillText: { fontSize: 13, fontWeight: '600', color: Colors.light.text },

  // Referral
  referralSection: { flexDirection: 'column', gap: 6 },
  referralToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  referralToggleText: { fontSize: 12.5, fontWeight: '600', color: Colors.light.textSecondary },
  referralInputBlock: { gap: 6 },
  referralBonusText: { fontSize: 11.5, color: Colors.light.textSecondary },
  referralBonusHighlight: { fontWeight: '600', color: Colors.light.tint },

  // Password match/mismatch
  pwMismatchText: { fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4, color: '#EF4444' },
  pwMatchText: { fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4, color: '#16a34a' },

  // Onboarding final button
  onbFinalBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#1E3A2F',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
