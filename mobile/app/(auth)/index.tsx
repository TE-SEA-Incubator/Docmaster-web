import React, { useState, useRef, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, View, TextInput, Image, Animated, Easing, ActivityIndicator, StyleSheet, type TextInputProps } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useGoogleAuth } from '@/core/api/googleAuthService';
import { Colors } from '@/constants/theme';

const LOGO = require('../../assets/docmaster.png');

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

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepDotsRow}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <View key={step} style={styles.stepDotItem}>
            <View
              style={[
                styles.stepDotCircle,
                isActive
                  ? styles.stepDotActive
                  : isDone
                    ? styles.stepDotDone
                    : styles.stepDotInactive,
              ]}
            >
              <ThemedText
                style={[
                  styles.stepDotText,
                  isActive || isDone ? styles.stepDotTextActive : styles.stepDotTextInactive,
                ]}
              >
                {step}
              </ThemedText>
            </View>
            {step < total && (
              <View style={[styles.stepDotLine, isDone ? styles.stepDotLineDone : styles.stepDotLineInactive]} />
            )}
          </View>
        );
      })}
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


function SocialLoginButtons({ loading }: { loading: boolean }) {
  // Fonctionnalité bloquée temporairement
  return (
    <Pressable style={[styles.socialBtn, { opacity: 0.5 }]} disabled={true}>
      <Ionicons name="logo-google" size={16} color="#db4437" />
      <ThemedText style={styles.socialBtnText}>Connexion bloquée</ThemedText>
    </Pressable>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
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
      setLoginError('Veuillez remplir tous les champs');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      await doLogin(loginForm.email, loginForm.password);
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || 'Identifiants invalides');
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
      setRegError(err?.response?.data?.message || err?.message || "Erreur lors de l'inscription");
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

  const TabPill = () => (
    <View style={styles.tabPillContainer}>
      <AnimatedTab
        active={tab === 'login'}
        onPress={() => setTab('login')}
        label="Connexion"
        icon="log-in"
      />
      <AnimatedTab
        active={tab === 'register'}
        onPress={() => setTab('register')}
        label="Inscription"
        icon="person-add"
      />
    </View>
  );

  const loginContent = (
    <View style={styles.loginContent}>
      <View style={styles.loginTitleBlock}>
        <ThemedText style={styles.loginTitle}>
          Bon retour 👋
        </ThemedText>
        <ThemedText style={styles.loginSubtitle}>
          Connectez-vous pour continuer
        </ThemedText>
      </View>

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
        placeholder="votre@email.com"
        keyboardType="email-address"
      />

      <FieldInput
        icon="lock-closed-outline"
        value={loginForm.password}
        onChangeText={(v) => setLoginForm((f) => ({ ...f, password: v }))}
        placeholder="Mot de passe"
        secureTextEntry={!pwVisible}
        rightButton={
          <Pressable onPress={() => setPwVisible(!pwVisible)} style={styles.pwToggle}>
            <Ionicons
              name={pwVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.light.textSecondary}
            />
          </Pressable>
        }
      />

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable style={styles.forgotPwLink}>
          <ThemedText style={styles.forgotPwText}>
            <Ionicons name="key-outline" size={12} color={Colors.light.tint} /> Mot de passe oublié ?
          </ThemedText>
        </Pressable>
      </Link>

      <Pressable
        onPress={handleLogin}
        disabled={loginLoading}
        style={[styles.primaryButton, loginLoading && styles.disabledBtn]}
      >
        {loginLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons name="log-in" size={16} color="white" />
            <ThemedText style={styles.primaryButtonText}>
              Se connecter
            </ThemedText>
          </>
        )}
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <ThemedText style={styles.dividerText}>ou continuer avec</ThemedText>
        <View style={styles.dividerLine} />
      </View>

      <SocialLoginButtons loading={loginLoading} />
    </View>
  );

  const registerContent = (
    <View style={styles.registerContent}>
      <View style={styles.registerTitleBlock}>
        <ThemedText style={styles.registerTitle}>
          Créer un compte
        </ThemedText>
        <ThemedText style={styles.registerSubtitle}>
          Rejoignez DocMaster en quelques étapes
        </ThemedText>
      </View>

      <StepDots current={regStep} total={4} />

      {regError ? (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>
            {regError}
          </ThemedText>
        </View>
      ) : null}

      {regStep === 1 && <Step1Fields />}
      {regStep === 2 && <Step2Confirm />}
      {regStep === 3 && <Step3Pin />}
      {regStep === 4 && <Step4Pseudo />}
    </View>
  );

  function Step1Fields() {
    return (
      <>
        <Pressable style={styles.googleBtn}>
          <Ionicons name="logo-google" size={16} color="#db4437" />
          <ThemedText style={styles.googleBtnText}>S'inscrire avec Google</ThemedText>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>ou s'inscrire avec</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <FieldInput icon="person-outline" value={regForm.nom} onChangeText={(v) => setRegForm((f) => ({ ...f, nom: v }))} placeholder="Nom" />
          </View>
          <View style={styles.nameField}>
            <FieldInput icon="person-outline" value={regForm.prenom} onChangeText={(v) => setRegForm((f) => ({ ...f, prenom: v }))} placeholder="Prénom" />
          </View>
        </View>

        <FieldInput icon="call-outline" value={regForm.telephone} onChangeText={(v) => setRegForm((f) => ({ ...f, telephone: v }))} placeholder="Téléphone" keyboardType="phone-pad" />

        <FieldInput icon="mail-outline" value={regForm.email} onChangeText={(v) => setRegForm((f) => ({ ...f, email: v }))} placeholder="votre@email.com" keyboardType="email-address" />

        <View>
          <FieldInput
            icon="lock-closed-outline"
            value={regForm.password}
            onChangeText={(v) => {
              setRegForm((f) => ({ ...f, password: v }));
              const s = calcPwStrength(v);
              setPwStrength(s);
            }}
            placeholder="Mot de passe"
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
          style={[styles.primaryButton, styles.mt1, !canGoNext(1) && styles.disabledBtn]}
        >
          <ThemedText style={styles.primaryButtonText}>Continuer</ThemedText>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </Pressable>
      </>
    );
  }

  function Step2Confirm() {
    return (
      <>
        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="shield-checkmark" size={18} color="white" />
          </View>
          <View style={styles.infoTextBlock}>
            <ThemedText style={styles.infoTitle}>Sécurisez votre compte</ThemedText>
            <ThemedText style={styles.infoSubtitle}>
              Confirmez votre mot de passe pour garantir la sécurité de votre compte.
            </ThemedText>
          </View>
        </View>

        <FieldInput icon="lock-closed-outline" value={regForm.password} placeholder="Mot de passe" secureTextEntry />

        <View>
          <FieldInput
            icon="lock-open-outline"
            value={regForm.passwordConfirm}
            onChangeText={(v) => {
              setRegForm((f) => ({ ...f, passwordConfirm: v }));
              setPwMatch(v === regForm.password && v.length > 0);
            }}
            placeholder="Confirmer le mot de passe"
            secureTextEntry={!pwVisible}
            rightButton={
              <Pressable onPress={() => setPwVisible(!pwVisible)} style={styles.pwToggle}>
                <Ionicons name={pwVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.light.textSecondary} />
              </Pressable>
            }
          />
          {regForm.passwordConfirm && pwMatch === false && (
            <ThemedText style={styles.pwMismatchText}>
              <Ionicons name="close-circle" size={12} color="#EF4444" /> Les mots de passe ne correspondent pas.
            </ThemedText>
          )}
          {pwMatch === true && (
            <ThemedText style={styles.pwMatchText}>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" /> Parfait !
            </ThemedText>
          )}
        </View>

        <View style={styles.stepNavRow}>
          <Pressable onPress={() => setRegStep(1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          </Pressable>
          <Pressable
            onPress={() => setRegStep(3)}
            disabled={!canGoNext(2)}
            style={[styles.primaryButton, styles.flex1, !canGoNext(2) && styles.disabledBtn]}
          >
            <ThemedText style={styles.primaryButtonText}>Valider</ThemedText>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </Pressable>
        </View>
      </>
    );
  }

  function Step3Pin() {
    return (
      <>
        <View style={styles.pinHeader}>
          <View style={styles.pinIconCircle}>
            <Ionicons name="phone-portrait-outline" size={24} color={Colors.light.tint} />
          </View>
          <ThemedText style={styles.pinHeaderText}>
            Un code PIN à 6 chiffres a été envoyé à{'\n'}
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
          Vous n'avez pas reçu le code ?{' '}
          <ThemedText style={styles.pinResendLink}>Renvoyer</ThemedText>
        </ThemedText>

        <View style={styles.stepNavRow}>
          <Pressable onPress={() => setRegStep(2)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          </Pressable>
          <Pressable
            onPress={() => setRegStep(4)}
            disabled={!canGoNext(3)}
            style={[styles.primaryButton, styles.flex1, !canGoNext(3) && styles.disabledBtn]}
          >
            <ThemedText style={styles.primaryButtonText}>Vérifier</ThemedText>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </Pressable>
        </View>
      </>
    );
  }

  function Step4Pseudo() {
    return (
      <>
        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="id-card-outline" size={18} color="white" />
          </View>
          <View style={styles.infoTextBlock}>
            <ThemedText style={styles.infoTitle}>Choisissez votre pseudo</ThemedText>
            <ThemedText style={styles.infoSubtitle}>
              Celui-ci sera votre identifiant unique sur la plateforme.
            </ThemedText>
          </View>
        </View>

        <View style={styles.pseudoSection}>
          <ThemedText style={styles.pseudoLabel}>
            <Ionicons name="at" size={11} color={Colors.light.tint} /> Pseudo
          </ThemedText>
          <View style={styles.pseudoInputWrapper}>
            <View style={styles.pseudoAtSign}>
              <ThemedText style={styles.pseudoAtText}>@</ThemedText>
            </View>
            <TextInput
              style={styles.pseudoInput}
              value={regForm.pseudo}
              onChangeText={(v) => setRegForm((f) => ({ ...f, pseudo: v }))}
              placeholder="jean_dupont42"
              placeholderTextColor="#c4bab0"
              autoCapitalize="none"
            />
          </View>
          <ThemedText style={styles.pseudoHint}>
            Votre pseudo doit être unique et contenir au moins 3 caractères.
          </ThemedText>
        </View>

        {pseudoSuggestions.length > 0 && (
          <View>
            <ThemedText style={styles.suggestionsTitle}>
              Suggestions
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
              Vous avez un code de parrainage ?
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
                placeholder="Code de parrainage"
              />
              <ThemedText style={styles.referralBonusText}>
                Vous recevrez un bonus de bienvenue de{' '}
                <ThemedText style={styles.referralBonusHighlight}>5%</ThemedText> sur votre premier abonnement.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.stepNavRow}>
          <Pressable onPress={() => setRegStep(3)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          </Pressable>
          <Pressable
            onPress={handleRegister}
            disabled={!regForm.pseudo || regLoading}
            style={[styles.registerFinalBtn, (!regForm.pseudo || regLoading) && styles.disabledBtn]}
          >
            {regLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="rocket" size={16} color="white" />
                <ThemedText style={styles.primaryButtonText}>
                  Créer mon compte
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <BlobBackground />

          <View style={styles.mainContent}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={LOGO}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Tab Pills */}
            <TabPill />

            {/* Form Card */}
            <View style={styles.formCard}>
              {tab === 'login' ? loginContent : registerContent}
            </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AnimatedTab({
  active,
  onPress,
  label,
  icon,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabItem, active && styles.tabItemActive]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? 'white' : Colors.light.textSecondary}
      />
      <ThemedText
        style={[styles.tabItemText, active && styles.tabItemTextActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2EBD9' },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  mainContent: { position: 'relative', zIndex: 10, paddingTop: 48 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoImage: { height: 56, width: undefined },
  formCard: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 20,
  },
  bottomSpacer: { height: 32 },

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

  // StepDots
  stepDotsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepDotItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDotCircle: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stepDotActive: { backgroundColor: '#1E3A2F', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  stepDotDone: { backgroundColor: Colors.light.tint },
  stepDotInactive: { backgroundColor: Colors.light.surface, borderWidth: 2, borderColor: '#E0D5C4' },
  stepDotText: { fontSize: 11, fontWeight: '700' },
  stepDotTextActive: { color: Colors.light.surface },
  stepDotTextInactive: { color: '#9CA3AF' },
  stepDotLine: { flex: 1, height: 2, marginHorizontal: 0 },
  stepDotLineDone: { backgroundColor: Colors.light.tint },
  stepDotLineInactive: { backgroundColor: '#E0D5C4' },

  // PasswordStrength
  pwStrengthRow: { flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 2 },
  pwStrengthBar: { height: 4, flex: 1, borderRadius: 9999 },

  // Login content
  loginContent: { gap: 14 },
  loginTitleBlock: { marginBottom: 4 },
  loginTitle: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 23, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5, marginBottom: 2 },
  loginSubtitle: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '500', fontStyle: 'italic' },

  // Register content
  registerContent: { gap: 16 },
  registerTitleBlock: { marginBottom: 4 },
  registerTitle: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 23, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5, marginBottom: 2 },
  registerSubtitle: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '500', fontStyle: 'italic' },

  // Error box
  errorBox: { padding: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14 },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // Primary button
  primaryButton: {
    width: '100%',
    height: 52,
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
  primaryButtonText: { color: Colors.light.surface, fontSize: 16, fontWeight: '700', fontFamily: 'BricolageGrotesque_700Bold' },
  disabledBtn: { opacity: 0.6 },
  mt1: { marginTop: 4 },

  // Forgot password link
  forgotPwLink: { marginTop: -4 },
  forgotPwText: { textAlign: 'right', fontSize: 12.5, color: Colors.light.tint, fontWeight: '600' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dividerText: { fontSize: 11.5, color: Colors.light.textSecondary, fontWeight: '500' },

  // Password toggle
  pwToggle: { padding: 4 },

  // Google button
  googleBtn: {
    width: '100%',
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  googleBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

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

  // Tab pill
  tabPillContainer: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tabItemActive: { backgroundColor: Colors.light.tint, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabItemText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  tabItemTextActive: { color: Colors.light.surface },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(254,240,220,0.5)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,166,75,0.2)',
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.tint,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  infoTextBlock: { flex: 1 },
  infoTitle: { fontWeight: '600', color: Colors.light.text, fontSize: 14, marginBottom: 2 },
  infoSubtitle: { fontSize: 12.5, color: Colors.light.textSecondary, lineHeight: 20 },

  // Step nav
  stepNavRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn: {
    paddingHorizontal: 16,
    height: 52,
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
  pinIconCircle: {
    width: 56,
    height: 56,
    backgroundColor: '#1E3A2F',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
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

  // Register final button
  registerFinalBtn: {
    flex: 1,
    height: 52,
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
