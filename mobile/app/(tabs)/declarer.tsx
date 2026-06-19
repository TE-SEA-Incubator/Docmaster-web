import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
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
import { DOC_TYPE_META, PRIMARY, TEXT_MUTED, BORDER, CREAM, TEXT_MAIN } from '@/components/declarations/wizard/DOC_TYPE_META';

type Urgency = 'Basse' | 'Modérée' | 'Haute';
const STEPS = ['Pour qui', 'Type', 'Détails', 'Lieu', 'Contact', 'Récap'];

export default function DeclarerScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);

  // Form state
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
    if (step === 5) handleSubmit();
    else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(s => s + 1); }
  };

  const handleBack = () => {
    if (step === 0) router.back();
    else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(s => s - 1); }
  };

  const handleSubmit = async () => {
    try {
        const formData = new FormData();
        formData.append("doc_type", docType!);
        formData.append("nom", dynamicValues.titulaire || "");
        formData.append("numero", dynamicValues.numero || "");
        formData.append("date_perte", datePerte.toISOString()); 
        formData.append("lieu", place);
        formData.append("telephone", phone);
        formData.append("description", dynamicValues.description || "");
        
        // Include other dynamic fields in metadata
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
            Alert.alert("Erreur", result.message || "Une erreur est survenue");
        }
    } catch (error) {
        Alert.alert("Erreur", "Impossible de soumettre la déclaration");
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setDynamicValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <WizardTopBar
        title="Déclarer une perte"
        step={step}
        totalSteps={STEPS.length}
        onBack={handleBack}
        onClose={() => router.back()}
      />
      <Stepper steps={STEPS} current={step} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 && <DeclarationTypePicker selected={declType} onSelect={setDeclType} />}
          {step === 1 && <DocTypePicker types={docTypes} selectedCode={docType} onSelect={setDocType} />}
          {step === 2 && selectedTypeMeta && <DocDynamicFields fields={selectedTypeMeta.fields} values={dynamicValues} onChange={handleFieldChange} />}
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
          {step === 5 && <ThemedText>Récap...</ThemedText>}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottomBar}>
        <Button title={step === 5 ? 'Soumettre' : 'Continuer'} onPress={handleNext} disabled={!canProceed()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  flex: { flex: 1 },
  content: { padding: 16, gap: 20 },
  gap: { gap: 24 },
  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
});
