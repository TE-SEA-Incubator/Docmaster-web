import React, { useEffect, useState, useRef } from 'react';
import {
  View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert,
  StyleSheet, Text, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { declarationsService } from '@/core/api/declarationsService';
import { claimsService } from '@/core/api/claimsService';
import { useThemeColors } from '@/hooks/useThemeColors';

type DeclarationStatus = 'SEARCHING' | 'MATCHED' | 'PAYMENT_PENDING' | 'PAYMENT_DONE' | 'RETURNED' | 'CLAIMED' | 'CANCELLED';

function getStepFromStatus(status: DeclarationStatus): number {
  switch (status) {
    case 'SEARCHING': return 0;
    case 'MATCHED': return 1;
    case 'PAYMENT_PENDING':
    case 'PAYMENT_DONE': return 2;
    case 'RETURNED':
    case 'CLAIMED': return 3;
    default: return 0;
  }
}

function formatDate(s?: string): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return s; }
}

export default function RendreScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [loading, setLoading] = useState(true);
  const [declaration, setDeclaration] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [validatingCode, setValidatingCode] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const fetchDeclaration = async () => {
    if (!id) return;
    try {
      const res = await declarationsService.getById(id);
      if (res.success && res.data) {
        setDeclaration(res.data);
        setCurrentStep(getStepFromStatus(res.data.status as DeclarationStatus));
      } else {
        Alert.alert(t('common:error'), t('rendre:loadError'));
      }
    } catch (err: any) {
      Alert.alert(t('common:error'), err?.response?.data?.message || t('rendre:loadGenericError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeclaration(); }, [id]);

  const handleCodeChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateCode = async () => {
    const finalCode = code.join('');
    if (finalCode.length < 6) {
      Alert.alert(t('rendre:codeIncomplete'), t('rendre:codeInstructions'));
      return;
    }
    setValidatingCode(true);
    try {
      const res = await claimsService.validateRecoveryCode({ docId: id!, code: finalCode });
      if (res.success) {
        Alert.alert(t('common:success'), res.message || t('rendre:codeValidated'));
        setCurrentStep(3);
      } else {
        Alert.alert(t('rendre:invalidCode'), res.message || t('rendre:invalidCodeMessage'));
      }
    } catch (err: any) {
      Alert.alert(t('common:error'), err?.response?.data?.message || t('rendre:validationError'));
    } finally {
      setValidatingCode(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!declaration) {
    return (
      <SafeAreaView style={[s.center, { backgroundColor: colors.background, padding: 24, gap: 16 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[s.bodyBold, { color: colors.text, fontSize: 17 }]}>{t('rendre:declarationNotFound')}</Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={[s.btn, { backgroundColor: colors.primary }]}>
          <Text style={s.btnText}>{t('common:back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progressPercent = Math.round((currentStep / 3) * 100);
  const rewardAmount = declaration.reward_amount || 1500;
  const pointsReward = declaration.reward_points || 50;

  const statusLabel =
    currentStep >= 3 ? t('rendre:statusReturned') :
    currentStep >= 2 ? t('rendre:statusPaymentConfirmed') :
    currentStep >= 1 ? t('rendre:statusOwnerIdentified') :
    t('rendre:statusWaiting');

  const timelineSteps = [
    { label: t('rendre:stepFound'), done: currentStep >= 0, active: currentStep === 0, date: formatDate(declaration.created_at) },
    { label: t('rendre:stepOwner'), done: currentStep >= 1, active: currentStep === 1, date: declaration.matched_at ? formatDate(declaration.matched_at) : '—' },
    { label: t('rendre:stepPayment'), done: currentStep >= 2, active: currentStep === 2, date: currentStep >= 2 ? t('rendre:stepPaymentDone') : t('rendre:stepPaymentPending') },
    { label: t('rendre:stepReturned'), done: currentStep >= 3, active: currentStep === 3, date: currentStep >= 3 ? formatDate(declaration.returned_at) : t('rendre:stepUpcoming') },
  ];

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={[s.iconBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('rendre:title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Banner */}
        <View style={[s.banner, { backgroundColor: colors.greenDark, marginBottom: 20 }]}>
          <View style={s.bannerRow}>
            <View style={s.bannerIcon}>
              <Ionicons name="return-down-back-outline" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.bannerLabel}>{t('rendre:statusLabel')}</Text>
              <Text style={s.bannerStatus} numberOfLines={2}>{statusLabel}</Text>
            </View>
            <Text style={s.bannerPercent}>{progressPercent}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressBar, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Timeline */}
        <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginBottom: 20 }]}>
          <View style={s.cardHeaderRow}>
            <Text style={[s.cardTitle, { color: colors.text }]}>
              {t('rendre:trackingId')}{id?.slice(0, 8).toUpperCase()}
            </Text>
            <View style={[s.badge, { backgroundColor: colors.successBg, borderColor: '#bbf7d0' }]}>
              <View style={s.badgeDot} />
              <Text style={[s.badgeText, { color: colors.greenDark }]}>{t('rendre:statusActive')}</Text>
            </View>
          </View>

          {timelineSteps.map((step, idx) => (
            <View key={idx} style={s.timelineRow}>
              {idx < 3 && (
                <View style={[s.timelineLine, {
                  backgroundColor: step.done ? colors.success : colors.border,
                }]} />
              )}
              <View style={[s.timelineDot, {
                backgroundColor: step.done ? colors.success : step.active ? colors.primary : colors.backgroundElement,
                borderWidth: step.done || step.active ? 0 : 2,
                borderColor: colors.border,
              }]}>
                <Ionicons
                  name={step.done ? 'checkmark' : step.active ? 'hourglass' : 'ellipse'}
                  size={11}
                  color={step.done || step.active ? '#fff' : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.stepLabel, {
                  color: step.active ? colors.primary : step.done ? colors.text : colors.textSecondary,
                }]}>
                  {step.label}
                </Text>
                {step.date && <Text style={[s.stepDate, { color: colors.textSecondary }]}>{step.date}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Rewards */}
        <View style={[s.rewardsRow, { marginBottom: 20 }]}>
          <View style={[s.rewardCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={[s.rewardIcon, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="cash" size={20} color="#d97706" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[s.rewardLabel, { color: colors.textSecondary }]}>{t('common:earnings')}</Text>
              <Text style={[s.rewardValue, { color: colors.text }]}>{rewardAmount.toLocaleString()} FCFA</Text>
            </View>
          </View>
          <View style={[s.rewardCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={[s.rewardIcon, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="star" size={20} color="#7c3aed" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[s.rewardLabel, { color: colors.textSecondary }]}>{t('common:points')}</Text>
              <Text style={[s.rewardValue, { color: '#7c3aed' }]}>+{pointsReward} pts</Text>
            </View>
          </View>
        </View>

        {/* Code Validation */}
        {currentStep < 3 && (
          <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, alignItems: 'center', marginBottom: 20 }]}>
            <View style={[s.bigIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="key" size={32} color={colors.primary} />
            </View>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('rendre:validationTitle')}</Text>
            <Text style={[s.sectionDesc, { color: colors.textSecondary }]}>{t('rendre:validationDesc')}</Text>

            <Text style={[s.codeLabel, { color: colors.textSecondary }]}>{t('rendre:securityCode')}</Text>
            <View style={s.pinRow}>
              {code.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  style={[s.pinInput, {
                    backgroundColor: digit ? colors.successBg : colors.background,
                    borderColor: digit ? colors.success : colors.border,
                    color: colors.text,
                  }]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(v) => handleCodeChange(v, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  selectTextOnFocus
                />
              ))}
            </View>

            <Pressable
              onPress={handleValidateCode}
              disabled={validatingCode || code.join('').length < 6}
              style={[s.ctaBtn, {
                backgroundColor: colors.greenDark,
                opacity: (validatingCode || code.join('').length < 6) ? 0.6 : 1,
                marginTop: 20,
              }]}
            >
              {validatingCode ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.ctaBtnText}>{t('rendre:validateAndEarn')}</Text>
                </>
              )}
            </Pressable>

            <View style={s.hintRow}>
              <Ionicons name="lock-closed" size={10} color={colors.textSecondary} />
              <Text style={[s.hintText, { color: colors.textSecondary }]}>{t('rendre:codeHint')}</Text>
            </View>
          </View>
        )}

        {/* Success */}
        {currentStep >= 3 && (
          <View style={[s.card, { backgroundColor: colors.successBg, borderColor: '#bbf7d0', alignItems: 'center', marginBottom: 20 }]}>
            <View style={[s.bigIcon, { backgroundColor: '#fff', borderColor: '#bbf7d0' }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text style={[s.sectionTitle, { color: colors.greenDark }]}>{t('rendre:successTitle')}</Text>
            <Text style={[s.sectionDesc, { color: colors.textSecondary }]}>
              {t('rendre:successDesc', { amount: rewardAmount.toLocaleString() })}
            </Text>
          </View>
        )}

        {/* Document Summary */}
        <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginBottom: 20 }]}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('rendre:summaryTitle')}</Text>
          <View style={[s.docRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[s.docIcon, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Ionicons name="document-text" size={22} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              {/* Nom du propriétaire */}
              {(declaration.nom_complet || declaration.owner_name || (declaration.nom_owner && declaration.prenom_owner)) && (
                <Text style={[{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }]}>
                  {declaration.nom_complet || declaration.owner_name || `${declaration.prenom_owner} ${declaration.nom_owner}`}
                </Text>
              )}
              {/* Type du document (label, pas ID) */}
              <Text style={[s.docType, { color: colors.text }]}>
                {declaration.docTypeInfo?.nom || declaration.doc_type || t('rendre:documentFallback')}
                {declaration.document_number ? ` · N°${declaration.document_number}` : ''}
                {declaration.numero_document ? ` · N°${declaration.numero_document}` : ''}
              </Text>
              {/* Date trouvée */}
              {(declaration.date_trouvee || declaration.created_at) && (
                <Text style={[{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }]}>
                  📅 Trouvé le {formatDate(declaration.date_trouvee || declaration.created_at)}
                </Text>
              )}
              {/* Lieu */}
              {(declaration.ville || declaration.lieu_trouvee) && (
                <Text style={[s.docLoc, { color: colors.textSecondary }]}>
                  📍 {declaration.ville || declaration.lieu_trouvee}
                </Text>
              )}
            </View>
          </View>

          {declaration.counterPart && (
            <View style={[s.finderRow, { backgroundColor: colors.successBg, borderColor: '#bbf7d0', marginTop: 12 }]}>
              <View style={[s.finderAvatar, { backgroundColor: colors.greenDark }]}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.finderName, { color: colors.greenDark }]}>
                  {declaration.counterPart.nom} {declaration.counterPart.prenom}
                </Text>
                <Text style={[s.finderPhone, { color: colors.success }]}>{t('rendre:documentOwner')}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Bar */}
      {currentStep < 3 && (
        <View style={[s.stickyBar, {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 8,
        }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[s.stickyDocType, { color: colors.text }]} numberOfLines={1}>
                {declaration.docTypeInfo?.nom || declaration.doc_type || t('rendre:documentFallback')}
              </Text>
              <View style={[s.stickyDot, { backgroundColor: colors.primary }]} />
              <Text style={[s.stickyReward, { color: colors.success }]}>+{rewardAmount.toLocaleString()} FCFA</Text>
            </View>
            <Text style={[s.stickyHint, { color: colors.textSecondary }]}>{t('rendre:validationRequired')}</Text>
          </View>
          <Pressable
            onPress={() => inputRefs.current[0]?.focus()}
            style={[s.stickyBtn, { backgroundColor: colors.greenDark }]}
          >
            <Text style={s.stickyBtnText}>{t('rendre:validate')}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bodyBold: { fontWeight: '700' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Banner
  banner: { borderRadius: 20, padding: 20 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bannerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  bannerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  bannerStatus: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bannerPercent: { fontSize: 28, fontWeight: '900', color: 'rgba(255,255,255,0.18)', marginLeft: 10 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 99 },
  // Card
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, position: 'relative' },
  timelineLine: { position: 'absolute', left: 11, top: 24, width: 2, height: '100%' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepLabel: { fontSize: 13, fontWeight: '600' },
  stepDate: { fontSize: 11, marginTop: 2 },
  // Rewards
  rewardsRow: { flexDirection: 'row', gap: 12 },
  rewardCard: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16 },
  rewardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rewardValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  // Section
  bigIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  sectionDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16, textAlign: 'center', paddingHorizontal: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  // CTA
  ctaBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // PIN
  codeLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14, textAlign: 'center' },
  pinRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  pinInput: { width: 42, height: 54, borderWidth: 1.5, borderRadius: 14, textAlign: 'center', fontWeight: '700', fontSize: 20 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  hintText: { fontSize: 11, fontStyle: 'italic' },
  // Finder / Doc
  finderRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  finderAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  finderName: { fontSize: 13, fontWeight: '700' },
  finderPhone: { fontSize: 11, marginTop: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  docIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  docType: { fontSize: 13, fontWeight: '600' },
  docLoc: { fontSize: 11, marginTop: 3 },
  // Sticky bar
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  stickyDocType: { fontSize: 13, fontWeight: '700' },
  stickyDot: { width: 5, height: 5, borderRadius: 3 },
  stickyReward: { fontSize: 13, fontWeight: '800' },
  stickyHint: { fontSize: 10, marginTop: 2 },
  stickyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  stickyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
