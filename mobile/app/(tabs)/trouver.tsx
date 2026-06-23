import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import { FoundDocTypeCard } from '@/components/declarations/found/FoundDocTypeCard';
import { FoundInfoForm } from '@/components/declarations/found/FoundInfoForm';
import { FoundLocationForm } from '@/components/declarations/found/FoundLocationForm';
import { FoundPhotoUpload } from '@/components/declarations/found/FoundPhotoUpload';
import { FoundContactForm } from '@/components/declarations/found/FoundContactForm';
import { FoundSuccessScreen } from '@/components/declarations/found/FoundSuccessScreen';

const PRIMARY = '#F5A64B';

export default function TrouverScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const STEPS = [t('trouver:stepType'), t('trouver:stepInfo'), t('trouver:stepLocation'), t('trouver:stepPhotos'), t('trouver:stepContact')];
  const [step, setStep] = useState(0);

  const [docTypeId, setDocTypeId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [docNum, setDocNum] = useState('');
  const [condition, setCondition] = useState('bon');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [dateFound, setDateFound] = useState(new Date());
  const [photoRecto, setPhotoRecto] = useState<string | null>(null);
  const [photoVerso, setPhotoVerso] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [contactMode, setContactMode] = useState('APP_CHAT');
  const [rewardChoice, setRewardChoice] = useState('NON_MERCI');
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [refNumber, setRefNumber] = useState('');

  const validateStep = (s: number): string | null => {
    if (s === 0 && !docTypeId) return t('trouver:selectType');
    if (s === 2) {
      if (!city.trim()) return t('trouver:selectCity');
    }
    if (s === 4) {
      if (!phone.trim()) return t('trouver:enterPhone');
      if (!consent) return t('trouver:acceptTerms');
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { Alert.alert(t('common:warning'), err); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const goBack = () => {
    if (step === 0) router.replace('/(tabs)');
    else setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('doc_type', docTypeId!);
      formData.append('owner_name', ownerName);
      formData.append('document_number', docNum);
      formData.append('etat_physique', condition);
      formData.append('ville', city);
      formData.append('date_perte', dateFound.toISOString().split('T')[0]);

      let desc = description;
      if (tags.length > 0) {
        desc = desc
          ? `${desc}\n\n${t('trouver:keywords')}${tags.join(', ')}`
          : `${t('trouver:keywords')}${tags.join(', ')}`;
      }
      formData.append('description', desc);
      formData.append('mode_contact', contactMode);
      formData.append('telephone_contact', phone);
      formData.append('pays', 'Cameroun');

      const metadata = { tags, reward_choice: rewardChoice };
      formData.append('metadata', JSON.stringify(metadata));

      if (photoRecto) {
        formData.append('photo_recto', {
          uri: photoRecto,
          type: 'image/jpeg',
          name: 'recto.jpg',
        } as any);
      }
      if (photoVerso) {
        formData.append('photo_verso', {
          uri: photoVerso,
          type: 'image/jpeg',
          name: 'verso.jpg',
        } as any);
      }

      const res = await declarationsService.createFound(formData);
      if (res.success && res.data) {
        setRefNumber(res.data.identifiant_doc_dm || res.data.id);
        setSuccess(true);
      } else {
        Alert.alert(t('common:error'), res.message || t('trouver:publishError'));
      }
    } catch (err: any) {
      Alert.alert(t('common:error'), err?.response?.data?.message || t('common:networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <FoundSuccessScreen referenceNumber={refNumber} />
      </SafeAreaView>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="search-outline" size={18} color={PRIMARY} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>{t('trouver:typeTitle')}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{t('trouver:typeDesc')}</Text>
              </View>
            </View>
            <FoundDocTypeCard selectedId={docTypeId} onSelect={setDocTypeId} />
          </View>
        );
      case 1:
        return (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>{t('trouver:infoTitle')}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{t('trouver:infoDesc')}</Text>
              </View>
            </View>
            <FoundInfoForm
              ownerName={ownerName} docNum={docNum} condition={condition} description={description} tags={tags}
              onChangeOwner={setOwnerName} onChangeDocNum={setDocNum}
              onChangeCondition={setCondition} onChangeDescription={setDescription} onChangeTags={setTags}
            />
          </View>
        );
      case 2:
        return (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="location-outline" size={18} color="#16A34A" />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>{t('trouver:locationTitle')}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{t('trouver:locationDesc')}</Text>
              </View>
            </View>
            <FoundLocationForm
              city={city} dateFound={dateFound}
              onChangeCity={setCity} onChangeDate={setDateFound}
            />
          </View>
        );
      case 3:
        return (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera-outline" size={18} color={PRIMARY} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>{t('trouver:photosTitle')}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{t('trouver:photosDesc')}</Text>
              </View>
            </View>
            <FoundPhotoUpload
              photoRecto={photoRecto} photoVerso={photoVerso}
              onChangeRecto={setPhotoRecto} onChangeVerso={setPhotoVerso}
            />
          </View>
        );
      case 4:
        return (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="hand-left-outline" size={18} color={PRIMARY} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>{t('trouver:contactTitle')}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{t('trouver:contactDesc')}</Text>
              </View>
            </View>
            <FoundContactForm
              phone={phone} contactMode={contactMode}
              rewardChoice={rewardChoice} consent={consent}
              summary={[
                { label: t('trouver:type'), value: t('trouver:documentFound') },
                { label: t('trouver:city'), value: city || '—' },
                { label: t('common:date'), value: dateFound.toLocaleDateString('fr-FR') },
                { label: t('trouver:photos'), value: `${[photoRecto, photoVerso].filter(Boolean).length}` },
              ]}
              onChangePhone={setPhone} onChangeContactMode={setContactMode}
              onChangeReward={setRewardChoice} onChangeConsent={setConsent}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={goBack} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={18} color="#1A1A1A" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{t('trouver:title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stepper */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 }}>
        {STEPS.map((label, i) => {
          const isDone = i < step;
          const isActive = i === step;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: isDone ? '#16A34A' : isActive ? PRIMARY : '#F0F0F0',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#FFFFFF' : '#9CA3AF' }}>{i + 1}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 9, fontWeight: '600', color: isActive ? PRIMARY : '#9CA3AF' }}>{label}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={{ flex: 1, height: 2, backgroundColor: isDone ? '#16A34A' : '#F0F0F0', marginHorizontal: 4, marginBottom: 16 }} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Bottom button */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
        <Pressable
          onPress={goNext}
          disabled={submitting}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 16, borderRadius: 14,
            backgroundColor: PRIMARY, opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name={step === STEPS.length - 1 ? 'checkmark-circle' : 'arrow-forward'} size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {step === STEPS.length - 1 ? t('trouver:publish') : t('trouver:continue')}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}