import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { declarationsService } from '@/core/api/declarationsService';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E312B';

type DeclarationStatus = 'SEARCHING' | 'MATCHED' | 'PAYMENT_PENDING' | 'PAYMENT_DONE' | 'RETURNED' | 'CLAIMED' | 'CANCELLED';

const STEP_LABELS = ['Déclaré', 'Match', 'Paiement', 'Récupéré'];

function getStepFromStatus(status: DeclarationStatus): number {
  switch (status) {
    case 'SEARCHING': return 0;
    case 'MATCHED': return 1;
    case 'PAYMENT_PENDING': return 2;
    case 'PAYMENT_DONE': return 2;
    case 'RETURNED': return 3;
    case 'CLAIMED': return 3;
    default: return 0;
  }
}

function formatDate(s?: string): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return s; }
}

export default function RecupererScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [declaration, setDeclaration] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [paying, setPaying] = useState(false);

  const fetchDeclaration = async () => {
    if (!id) return;
    try {
      const res = await declarationsService.getById(id);
      if (res.success && res.data) {
        setDeclaration(res.data);
        setCurrentStep(getStepFromStatus(res.data.status as DeclarationStatus));
      } else {
        Alert.alert(t('common:error'), t('recuperer:loadError'));
      }
    } catch (err: any) {
      Alert.alert(t('common:error'), err?.response?.data?.message || t('recuperer:loadingError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeclaration(); }, [id]);

  const handlePayAndRecover = async () => {
    setPaying(true);
    try {
      const res = await declarationsService.initiateRecovery({ declaration_id: id! });
      if (res.success) {
        Alert.alert(t('common:success'), t('recuperer:paymentInitiated'));
        setCurrentStep(2);
      } else {
        Alert.alert(t('common:error'), res.message || t('recuperer:paymentInitError'));
      }
    } catch (err: any) {
      Alert.alert(t('common:error'), err?.response?.data?.message || t('recuperer:paymentError'));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4EFE6] items-center justify-center">
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (!declaration) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4EFE6] items-center justify-center p-6 gap-4">
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <ThemedText className="text-lg font-bold text-textMain">{t('recuperer:declarationNotFound')}</ThemedText>
        <Pressable onPress={() => router.back()} className="px-6 py-3 bg-primary rounded-2xl">
          <ThemedText className="text-white font-bold">{t('common:back')}</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progressPercent = Math.round((currentStep / 3) * 100);
  const recoveryCode = declaration.claim?.verification_code || declaration.reference || '';
  const finder = declaration.counterPart;

  return (
    <SafeAreaView className="flex-1 bg-[#F4EFE6]">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        className="px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white items-center justify-center border border-borderMain">
            <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
          </Pressable>
          <ThemedText className="text-base font-bold text-textMain">{t('recuperer:title')}</ThemedText>
          <View className="w-10" />
        </View>

        {/* Status Banner */}
        <ThemedView
          style={{ backgroundColor: GREEN_DARK }}
          className="rounded-[28px] p-6 relative overflow-hidden mb-6"
        >
          <View className="absolute inset-0 bg-white/5" />
          <View className="flex-row items-center gap-4 mb-4">
            <View className="w-14 h-14 rounded-[22px] bg-white/10 items-center justify-center border border-white/10">
              <Ionicons name="hand-left-outline" size={28} color={PRIMARY} />
            </View>
            <View className="flex-1">
              <ThemedText className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-0.5">
                {t('recuperer:statusLabel')}
              </ThemedText>
              <ThemedText className="text-base font-bold text-white" numberOfLines={2}>
                {currentStep >= 3 ? t('recuperer:successMessage') :
                 currentStep >= 2 ? t('recuperer:paymentProcessing') :
                 currentStep >= 1 ? t('recuperer:matchFound') :
                 t('recuperer:waitingMatch')}
              </ThemedText>
            </View>
            <ThemedText className="text-3xl font-black text-white/20">{progressPercent}%</ThemedText>
          </View>
          <View className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <View className="bg-primary h-full rounded-full" style={{ width: `${progressPercent}%` }} />
          </View>
        </ThemedView>

        {/* Timeline */}
        <ThemedView className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <ThemedText className="text-base font-bold text-textMain">
              {t('recuperer:tracking')} #{id?.slice(0, 8).toUpperCase()}
            </ThemedText>
            <View className="flex-row items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
              <View className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <ThemedText className="text-[10px] font-bold text-green-700 uppercase">{t('recuperer:active')}</ThemedText>
            </View>
          </View>

          {[
            { label: t('recuperer:stepDeclared'), done: currentStep >= 0, active: currentStep === 0, date: formatDate(declaration.created_at), icon: 'document-text' },
            { label: t('recuperer:stepMatched'), done: currentStep >= 1, active: currentStep === 1, date: declaration.matched_at ? formatDate(declaration.matched_at) : '—', icon: 'people' },
            { label: t('recuperer:stepPayment'), done: currentStep >= 2, active: currentStep === 2, date: currentStep >= 2 ? t('recuperer:done') : t('recuperer:toDo'), icon: 'card' },
            { label: t('recuperer:stepRecovered'), done: currentStep >= 3, active: currentStep === 3, date: currentStep >= 3 ? formatDate(declaration.returned_at) : t('recuperer:toCome'), icon: 'checkmark-circle' },
          ].map((step, idx) => (
            <View key={idx} className="flex-row gap-3 mb-6 relative">
              {idx < 3 && (
                <View
                  className={`absolute left-[11px] top-6 w-0.5 h-full ${step.done ? 'bg-green-500' : 'bg-borderMain'}`}
                />
              )}
              <View
                className={`w-6 h-6 rounded-full items-center justify-center z-10 ${
                  step.done ? 'bg-green-500' : step.active ? 'bg-primary' : 'bg-white border-2 border-borderMain'
                }`}
              >
                <Ionicons
                  name={step.done ? 'checkmark' : step.active ? 'hourglass' : 'ellipse'}
                  size={12}
                  color={step.done ? 'white' : step.active ? 'white' : '#9CA3AF'}
                />
              </View>
              <View className="flex-1">
                <ThemedText className={`text-[13px] font-bold ${step.active ? 'text-primary' : step.done ? 'text-textMain' : 'text-textMuted'}`}>
                  {step.label}
                </ThemedText>
                {step.date && <ThemedText className="text-[10px] text-textMuted mt-0.5">{step.date}</ThemedText>}
              </View>
            </View>
          ))}
        </ThemedView>

        {/* Payment / Recovery Section */}
        {currentStep === 1 && (
          <ThemedView className="bg-white rounded-[40px] border border-borderMain p-8 items-center mb-6 shadow-sm">
            <View className="w-20 h-20 rounded-full bg-[#FAF7F2] border border-borderMain items-center justify-center mb-5">
              <Ionicons name="wallet-outline" size={32} color={PRIMARY} />
            </View>
            <ThemedText className="text-lg font-bold text-textMain mb-2">{t('recuperer:payAndRecover')}</ThemedText>
            <ThemedText className="text-[12px] text-textMuted leading-relaxed mb-8 text-center px-4">
              {t('recuperer:payDescription')}
            </ThemedText>
            <Pressable
              onPress={handlePayAndRecover}
              disabled={paying}
              style={{ backgroundColor: GREEN_DARK }}
              className="w-full py-4 rounded-[24px] items-center justify-center flex-row gap-2 shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {paying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={20} color="white" />
                  <ThemedText className="text-white font-bold text-sm">{t('recuperer:payAndRecover')}</ThemedText>
                </>
              )}
            </Pressable>
          </ThemedView>
        )}

        {/* Code Display (after payment) */}
        {currentStep >= 2 && currentStep < 3 && (
          <ThemedView className="bg-white rounded-[40px] border border-borderMain p-8 items-center mb-6 shadow-sm">
            <View className="w-20 h-20 rounded-full bg-[#FAF7F2] border border-borderMain items-center justify-center mb-5 relative">
              <Ionicons name="key" size={32} color={PRIMARY} />
              <View className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white border border-borderMain items-center justify-center shadow-sm">
                <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              </View>
            </View>
            <ThemedText className="text-lg font-bold text-textMain mb-2">{t('recuperer:yourRecoveryCode')}</ThemedText>
            <ThemedText className="text-[12px] text-textMuted leading-relaxed mb-6 text-center px-4">
              {t('recuperer:codeInstructions')}
            </ThemedText>
            <View className="bg-[#FAF7F2] border border-borderMain rounded-2xl px-8 py-4 mb-6">
              <ThemedText className="text-3xl font-black text-center tracking-[8px] text-textMain">
                {recoveryCode || '------'}
              </ThemedText>
            </View>
            {finder && (
              <View className="w-full p-4 bg-green-50 rounded-2xl border border-green-100 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-green-dark items-center justify-center">
                  <Ionicons name="person" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <ThemedText className="text-[13px] font-bold text-green-900">
                    {finder.nom} {finder.prenom}
                  </ThemedText>
                  <ThemedText className="text-[10px] text-green-700/80">
                    {finder.telephone || t('recuperer:contactAvailable')}
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedView>
        )}

        {/* Success State */}
        {currentStep >= 3 && (
          <ThemedView className="bg-white rounded-[40px] border border-green-200 p-8 items-center mb-6 shadow-sm">
            <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-5">
              <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
            </View>
            <ThemedText className="text-lg font-bold text-green-700 mb-2">{t('recuperer:successMessageBis')}</ThemedText>
            <ThemedText className="text-[12px] text-textMuted text-center mb-6">
              {t('recuperer:successDescription')}
            </ThemedText>
          </ThemedView>
        )}

        {/* Document Summary */}
        <ThemedView className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm mb-6">
          <ThemedText className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-4">
            {t('recuperer:documentSummary')}
          </ThemedText>
          <View className="flex-row items-center gap-4 p-4 bg-[#FAF7F2] rounded-2xl border border-borderMain/50">
            <View className="w-12 h-12 rounded-xl bg-white items-center justify-center border border-borderMain shadow-sm">
              <Ionicons name="document-text" size={24} color="#6B7280" />
            </View>
            <View className="flex-1">
              <ThemedText className="text-[13px] font-bold text-textMain">
                {declaration.doc_type || t('recuperer:document')} {declaration.document_number ? `N°${declaration.document_number}` : ''}
              </ThemedText>
              <ThemedText className="text-[10px] text-textMuted italic mt-0.5">
                <Ionicons name="location" size={9} /> {declaration.ville || declaration.lieu_perte || t('common:notSpecified')}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
