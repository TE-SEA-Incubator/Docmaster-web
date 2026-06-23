import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { declarationsService, documentTypesService } from '@/core/api/declarationsService';
import { useAuthStore } from '@/core/store/useAuthStore';
import { WizardTopBar } from '@/components/declarations/wizard/Wizardtopbar';
import { Stepper } from '@/components/declarations/wizard/Stepper';
import { DeclarationTypePicker } from '@/components/declarations/wizard/DeclarationTypePicker';
import { DocTypePicker } from '@/components/declarations/wizard/DocTypePicker';
import { DocDynamicFields } from '@/components/declarations/wizard/DocDynamicFields';
import { PlaceChipInput } from '@/components/declarations/wizard/PlaceChipInput';
import { ContactBlock } from '@/components/declarations/wizard/ContactBlock';
import { UrgencySelector } from '@/components/declarations/wizard/UrgencySelector';
import { SuccessOverlay } from '@/components/declarations/wizard/SuccessOverlay';
import { DatePickerInput } from '@/components/declarations/wizard/DatePickerInput';
import { DOC_FIELDS_META, getDocFields } from '@/components/declarations/wizard/DOC_FIELDS_META';
import { Button } from '@/components/common/Button';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, TEXT_MUTED, BORDER, CREAM, TEXT_MAIN, GREEN } from '@/components/declarations/wizard/DOC_TYPE_META';
import { ActionFeedbackModal, type FeedbackType } from '@/components/feedback/ActionFeedbackModal';

type Urgency = 'Basse' | 'Modérée' | 'Haute';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Ajoute N mois à une date (aligné sur web Declarer.tsx addMonths).
 * Si la date initiale est le 31 et que le mois cible n'a pas de jour 31,
 * on retombe sur le dernier jour du mois (comportement ISO/JS).
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

export default function DeclarerScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const STEPS = [t('declarer:step0Short'), t('declarer:step1Short'), t('declarer:step2Short'), t('declarer:step3Short'), t('declarer:step4Short'), t('declarer:step5Short')];
  const STEP_HEADINGS = [
    { title: t('declarer:step0Title'), desc: t('declarer:step0Desc') },
    { title: t('declarer:step1Title'), desc: t('declarer:step1Desc') },
    { title: t('declarer:step2Title'), desc: t('declarer:step2Desc') },
    { title: t('declarer:step3Title'), desc: t('declarer:step3Desc') },
    { title: t('declarer:step4Title'), desc: t('declarer:step4Desc') },
    { title: t('declarer:step5Title'), desc: t('declarer:step5Desc') },
  ];
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [declType, setDeclType] = useState<'self' | 'other' | null>(null);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [docType, setDocType] = useState<string | null>(null);
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [place, setPlace] = useState('');
  const [datePerte, setDatePerte] = useState(new Date());
  const [lossTime, setLossTime] = useState<Date | null>(null);
  const [quartier, setQuartier] = useState('');
  const [lieuPrecis, setLieuPrecis] = useState('');
  const [circumstances, setCircumstances] = useState('');
  const [dateDelivrance, setDateDelivrance] = useState<Date | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ visible: boolean; type: FeedbackType; title: string; message?: string }>({
    visible: false, type: 'error', title: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    documentTypesService.getActive().then(res => {
      if (res.success && res.data) setDocTypes(res.data);
    });
  }, []);

  const selectedTypeMeta = useMemo(() => {
    if (!docType) return null;
    const fromBackend = docTypes.find(t => t.code === docType);
    const fields = getDocFields(docType);
    const delai = fromBackend?.delai_expiration_mois ?? 0;
    return {
      ...(fromBackend || { code: docType, nom: docType, icone: 'document-text-outline' }),
      fields,
      hasExpiration: delai > 0,
    };
  }, [docTypes, docType]);

  const hasDateDelivranceField = !!selectedTypeMeta?.fields.some((f: any) => f.key === 'date_delivrance');
  const hasDateExpirationField = !!selectedTypeMeta?.fields.some((f: any) => f.key === 'date_expiration');

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return !!declType;
      case 1: return !!docType;
      case 2: {
        if (!selectedTypeMeta) return false;
        const fields = selectedTypeMeta.fields || [];
        const required = fields.filter((f: any) => !f.optional);
        // Si le type a une expiration et qu'aucun champ date_delivrance n'est défini,
        // on exige ce champ (cf. comportement web Declarer.tsx:344-348)
        if (selectedTypeMeta.hasExpiration && !hasDateDelivranceField) {
          return required.every((f: any) => !!dynamicValues[f.key]?.trim()) && !!dateDelivrance;
        }
        return required.every((f: any) => !!dynamicValues[f.key]?.trim());
      }
      case 3: return !!place.trim();
      case 4: return !!phone.trim();
      case 5: return true;
      default: return false;
    }
  }, [step, declType, docType, dynamicValues, place, phone, dateDelivrance, selectedTypeMeta, hasDateDelivranceField]);

  const handleNext = () => {
    if (!canProceed()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (step === 0 && declType === 'self' && user) {
      setPhone(user.telephone || '');
      setEmail(user.email || '');
    }
    if (step === 5) {
      handleSubmit();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(s => s + 1);
    Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => s - 1);
    Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("doc_type", docType!);
      formData.append("owner_name", dynamicValues.titulaire || "");
      formData.append("document_number", dynamicValues.numero || "");
      formData.append("date_perte", datePerte.toISOString().split('T')[0]);
      formData.append("ville", place);
      formData.append("telephone_contact", phone);
      if (email) formData.append("email_contact", email);
      if (urgency) formData.append("urgence_niveau", urgency);
      formData.append("description", dynamicValues.description || "");

      // Si une date de délivrance a été saisie (champ auto pour types expirants
      // ou champ explicite dans DOC_FIELDS_META), on l'envoie + calcule l'expiration.
      const delai = selectedTypeMeta?.delai_expiration_mois ?? 0;
      const effectiveDelivrance = hasDateDelivranceField
        ? dynamicValues.date_delivrance
        : dateDelivrance?.toISOString().split('T')[0];
      if (effectiveDelivrance) {
        formData.append("date_delivrance", effectiveDelivrance);
        if (delai > 0) {
          const exp = addMonths(new Date(effectiveDelivrance), delai);
          formData.append("date_expiration", exp.toISOString().split('T')[0]);
        }
      }
      if (dynamicValues.date_expiration && !hasDateDelivranceField) {
        // Cas passeport : l'utilisateur remplit date_expiration directement
        formData.append("date_expiration", dynamicValues.date_expiration);
      }

      const metadata: Record<string, string> = {};
      Object.entries(dynamicValues).forEach(([key, val]) => {
        if (!['titulaire', 'numero', 'description', 'date_expiration'].includes(key)) {
          metadata[key] = val;
        }
      });
      if (Object.keys(metadata).length > 0) {
        formData.append("metadata", JSON.stringify(metadata));
      }

      const result = await declarationsService.createLost(formData);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessRef(result.data?.identifiant_doc_dm || "SUCCES");
      } else {
        setFeedback({ visible: true, type: 'error', title: t('common:error'), message: result.message || t('declarer:genericErrorMessage') });
      }
    } catch (error) {
      setFeedback({ visible: true, type: 'error', title: t('common:networkError'), message: t('declarer:networkErrorMessage') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setDynamicValues(prev => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    const heading = STEP_HEADINGS[step];

    return (
      <View style={styles.stepContent}>
        <View style={styles.headingBlock}>
          <ThemedText style={styles.stepTitle}>{heading.title}</ThemedText>
          <ThemedText style={styles.stepDesc}>{heading.desc}</ThemedText>
        </View>

        {step === 0 && <DeclarationTypePicker selected={declType} onSelect={setDeclType} />}
        {step === 1 && <DocTypePicker types={docTypes} selectedCode={docType} onSelect={setDocType} />}
        {step === 2 && (selectedTypeMeta ? (
          <View style={{ gap: 14 }}>
            <DocDynamicFields
              fields={selectedTypeMeta.fields.filter((f: any) => !(selectedTypeMeta.hasExpiration && f.key === 'date_expiration'))}
              values={dynamicValues}
              onChange={handleFieldChange}
            />
            {/* Si le type a une expiration et qu'aucun champ date_delivrance n'est défini,
                on l'exige (cf. web Declarer.tsx:810-848). */}
            {selectedTypeMeta.hasExpiration && !hasDateDelivranceField && (
              <DatePickerInput
                label={t('declarer:dateDelivrance')}
                value={dateDelivrance || new Date()}
                onChange={setDateDelivrance}
              />
            )}
            {selectedTypeMeta.hasExpiration && (
              <View style={styles.expirationBox}>
                <ThemedText style={styles.expirationLabel}>{t('declarer:expirationDate')}</ThemedText>
                <View style={styles.expirationInput}>
                  <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
                  <ThemedText style={styles.expirationText}>
                    {dateDelivrance
                      ? addMonths(dateDelivrance, selectedTypeMeta.delai_expiration_mois).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                      : t('declarer:fillDelivranceDate')}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.gap}>
            <ThemedText style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
              {t('declarer:loadingFields')}
            </ThemedText>
          </View>
        ))}
        {step === 3 && (
          <View style={styles.gap}>
            <DatePickerInput label={t('declarer:dateLost')} value={datePerte} onChange={setDatePerte} />
            <DatePickerInput
              mode="time"
              label={t('declarer:timeLost')}
              value={lossTime || new Date()}
              onChange={setLossTime}
            />
            <PlaceChipInput value={place} onChange={setPlace} />
            <Input
              label={t('declarer:district')}
              value={quartier}
              onChangeText={setQuartier}
              placeholder={t('declarer:districtPlaceholder')}
              icon="location-outline"
            />
            <Input
              label={t('declarer:exactPlace')}
              value={lieuPrecis}
              onChangeText={setLieuPrecis}
              placeholder={t('declarer:exactPlacePlaceholder')}
              icon="map-outline"
            />
            <Input
              label={t('declarer:circumstances')}
              value={circumstances}
              onChangeText={setCircumstances}
              placeholder={t('declarer:circumstancesPlaceholder')}
              icon="chatbox-ellipses-outline"
              multiline
              numberOfLines={3}
              style={{ height: 90, paddingTop: 12, textAlignVertical: 'top' }}
            />
          </View>
        )}
        {step === 4 && (
          <View style={styles.gap}>
            <ContactBlock phone={phone} email={email} setPhone={setPhone} setEmail={setEmail} />
            <UrgencySelector selected={urgency} onSelect={setUrgency} />
          </View>
        )}
        {step === 5 && (
          <RecapSection
            declType={declType}
            selectedTypeMeta={selectedTypeMeta}
            dynamicValues={dynamicValues}
            datePerte={datePerte}
            place={place}
            phone={phone}
            email={email}
            urgency={urgency}
            onEditStep={setStep}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <WizardTopBar
        title={t('declarer:title')}
        onBack={handleBack}
        onClose={() => router.back()}
      />
      <Stepper steps={STEPS} current={step} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          {step > 0 ? (
            <Button title={t('common:back')} variant="outline" onPress={handleBack} style={styles.backBtn} />
          ) : (
            <View style={styles.backBtn} />
          )}
          <Button
            title={step === 5 ? (submitting ? t('declarer:sending') : t('declarer:submit')) : t('common:continue')}
            onPress={handleNext}
            disabled={!canProceed() || submitting}
            loading={submitting}
            icon={step === 5 ? 'checkmark-circle-outline' : 'arrow-forward-outline'}
            iconPosition={step === 5 ? 'left' : 'right'}
            style={styles.nextBtn}
          />
        </View>
      </View>

      <ActionFeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onDismiss={() => setFeedback((f) => ({ ...f, visible: false }))}
        onPrimaryAction={() => setFeedback((f) => ({ ...f, visible: false }))}
      />
    </View>
  );
}

function RecapSection({
  declType, selectedTypeMeta, dynamicValues, datePerte, place, phone, email, urgency, onEditStep,
}: {
  declType: 'self' | 'other' | null;
  selectedTypeMeta: any;
  dynamicValues: Record<string, string>;
  datePerte: Date;
  place: string;
  phone: string;
  email: string;
  urgency: Urgency | null;
  onEditStep: (s: number) => void;
}) {
  const { t } = useTranslation();
  const formatDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const FIELDS: { label: string; value: string; step: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('declarer:recapDeclarationFor'), value: declType === 'self' ? t('declarer:myself') : t('declarer:someoneElse'), step: 0, icon: declType === 'self' ? 'person-outline' : 'people-outline' },
    { label: t('declarer:documentType'), value: selectedTypeMeta?.nom || '—', step: 1, icon: selectedTypeMeta?.icone || 'document-text-outline' },
  ];

  // Add dynamic fields
  if (selectedTypeMeta?.fields) {
    (selectedTypeMeta.fields as any[]).forEach((f: any) => {
      if (dynamicValues[f.key]) {
        FIELDS.push({ label: f.label, value: dynamicValues[f.key], step: 2, icon: f.icon || 'create-outline' });
      }
    });
  }

  FIELDS.push(
    { label: t('declarer:dateLost'), value: formatDate(datePerte), step: 3, icon: 'calendar-outline' },
    { label: t('declarer:recapPlace'), value: place || '—', step: 3, icon: 'location-outline' },
    { label: t('declarer:recapPhone'), value: phone || '—', step: 4, icon: 'call-outline' },
    { label: t('declarer:recapEmail'), value: email || t('common:notProvided'), step: 4, icon: 'mail-outline' },
    { label: t('declarer:recapUrgency'), value: urgency || t('declarer:urgencyNotSpecified'), step: 4, icon: 'flash-outline' },
  );

  return (
    <View style={recapStyles.container}>
      <View style={recapStyles.card}>
        {FIELDS.map((field, idx) => (
          <View key={idx}>
            {idx > 0 && <View style={recapStyles.divider} />}
            <View style={recapStyles.row}>
              <View style={recapStyles.iconWrap}>
                <Ionicons name={field.icon} size={14} color={PRIMARY} />
              </View>
              <View style={recapStyles.textWrap}>
                <ThemedText style={recapStyles.label}>{field.label}</ThemedText>
                <ThemedText style={recapStyles.value} numberOfLines={2}>{field.value}</ThemedText>
              </View>
              <TouchableOpacity onPress={() => onEditStep(field.step)} style={recapStyles.editBtn} hitSlop={8}>
                <Ionicons name="create-outline" size={14} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <View style={recapStyles.notice}>
        <Ionicons name="shield-checkmark-outline" size={16} color={GREEN} />
        <ThemedText style={recapStyles.noticeText}>
          {t('declarer:recapNotice')}
        </ThemedText>
      </View>
    </View>
  );
}

const recapStyles = StyleSheet.create({
  container: { gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF0DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EAE0',
    marginHorizontal: 16,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  flex: { flex: 1 },
  content: { padding: 16, gap: 20 },
  stepContent: { gap: 20 },
  headingBlock: {
    gap: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_MAIN,
    letterSpacing: -0.4,
  },
  stepDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
  },
  gap: { gap: 24 },
  expirationBox: {
    gap: 6,
  },
  expirationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MAIN,
    marginLeft: 4,
  },
  expirationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    gap: 10,
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  expirationText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
});
