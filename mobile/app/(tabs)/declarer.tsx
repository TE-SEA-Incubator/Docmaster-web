import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

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
import { Button } from '@/components/common/Button';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, TEXT_MUTED, BORDER, CREAM, TEXT_MAIN, GREEN } from '@/components/declarations/wizard/DOC_TYPE_META';
import { ActionFeedbackModal, type FeedbackType } from '@/components/feedback/ActionFeedbackModal';

type Urgency = 'Basse' | 'Modérée' | 'Haute';
const STEPS = ['Pour qui', 'Type', 'Détails', 'Lieu', 'Contact', 'Récap'];

const STEP_HEADINGS = [
  { title: 'Pour qui déclarez-vous ?', desc: 'Choisissez si c\'est pour vous ou un proche' },
  { title: 'Quel document ?', desc: 'Sélectionnez le type de document perdu' },
  { title: 'Détails du document', desc: 'Remplissez les informations du document' },
  { title: 'Lieu et date', desc: 'Où et quand a eu lieu la perte ?' },
  { title: 'Contact & urgence', desc: 'Comment vous joindre et priorité' },
  { title: 'Vérification', desc: 'Confirmez les informations avant envoi' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DeclarerScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [declType, setDeclType] = useState<'self' | 'other' | null>(null);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [docType, setDocType] = useState<string | null>(null);
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [place, setPlace] = useState('');
  const [datePerte, setDatePerte] = useState(new Date());
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [urgency, setUrgency] = useState<Urgency | null>(null);
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

  const selectedTypeMeta = useMemo(() =>
    docTypes.find(t => t.code === docType),
  [docTypes, docType]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return !!declType;
      case 1: return !!docType;
      case 2: {
        if (!selectedTypeMeta) return false;
        const fields = selectedTypeMeta.fields || [];
        const required = fields.filter((f: any) => f.required);
        return required.every((f: any) => !!dynamicValues[f.key]?.trim());
      }
      case 3: return !!place.trim();
      case 4: return !!phone.trim();
      case 5: return true;
      default: return false;
    }
  }, [step, declType, docType, dynamicValues, place, phone, selectedTypeMeta]);

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

      const metadata: Record<string, string> = {};
      Object.entries(dynamicValues).forEach(([key, val]) => {
        if (!['titulaire', 'numero', 'description'].includes(key)) {
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
        setFeedback({ visible: true, type: 'error', title: 'Erreur', message: result.message || "Une erreur est survenue lors de la déclaration." });
      }
    } catch (error) {
      setFeedback({ visible: true, type: 'error', title: 'Erreur réseau', message: "Impossible de soumettre la déclaration. Vérifiez votre connexion." });
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
        {step === 2 && (selectedTypeMeta ? <DocDynamicFields fields={selectedTypeMeta.fields} values={dynamicValues} onChange={handleFieldChange} /> : (
          <View style={styles.gap}>
            <ThemedText style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
              Chargement des champs pour ce type de document...
            </ThemedText>
          </View>
        ))}
        {step === 3 && (
          <View style={styles.gap}>
            <DatePickerInput label="Date de la perte" value={datePerte} onChange={setDatePerte} />
            <PlaceChipInput value={place} onChange={setPlace} />
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
        title="Déclarer une perte"
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
            <Button title="Retour" variant="outline" onPress={handleBack} style={styles.backBtn} />
          ) : (
            <View style={styles.backBtn} />
          )}
          <Button
            title={step === 5 ? (submitting ? 'Envoi en cours...' : 'Soumettre') : 'Continuer'}
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
  const formatDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const FIELDS: { label: string; value: string; step: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'Déclaration pour', value: declType === 'self' ? 'Moi-même' : 'Un proche', step: 0, icon: declType === 'self' ? 'person-outline' : 'people-outline' },
    { label: 'Type de document', value: selectedTypeMeta?.nom || '—', step: 1, icon: selectedTypeMeta?.icone || 'document-text-outline' },
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
    { label: 'Date de perte', value: formatDate(datePerte), step: 3, icon: 'calendar-outline' },
    { label: 'Lieu', value: place || '—', step: 3, icon: 'location-outline' },
    { label: 'Téléphone', value: phone || '—', step: 4, icon: 'call-outline' },
    { label: 'Email', value: email || 'Non renseigné', step: 4, icon: 'mail-outline' },
    { label: 'Urgence', value: urgency || 'Non spécifiée', step: 4, icon: 'flash-outline' },
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
          En soumettant, vous confirmez que ces informations sont authentiques.
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
