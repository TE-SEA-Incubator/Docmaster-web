import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { declarationsService } from '@/core/api/declarationsService';
import { claimsService } from '@/core/api/claimsService';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E312B';

type DeclarationStatus = 'SEARCHING' | 'MATCHED' | 'PAYMENT_PENDING' | 'PAYMENT_DONE' | 'RETURNED' | 'CLAIMED' | 'CANCELLED';

const STEP_LABELS = ['Trouvé', 'Propriétaire', 'Paiement', 'Remis'];

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

export default function RendreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

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
        Alert.alert('Erreur', 'Impossible de charger les détails de la déclaration');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur de chargement');
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
      Alert.alert('Code incomplet', 'Veuillez entrer les 6 chiffres du code de sécurité');
      return;
    }
    setValidatingCode(true);
    try {
      const res = await claimsService.validateRecoveryCode({ docId: id!, code: finalCode });
      if (res.success) {
        Alert.alert('Succès', res.message || 'Code validé avec succès !');
        setCurrentStep(3);
      } else {
        Alert.alert('Code invalide', res.message || 'Le code saisi est incorrect');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la validation du code');
    } finally {
      setValidatingCode(false);
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
        <ThemedText className="text-lg font-bold text-textMain">Déclaration introuvable</ThemedText>
        <Pressable onPress={() => router.back()} className="px-6 py-3 bg-primary rounded-2xl">
          <ThemedText className="text-white font-bold">Retour</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progressPercent = Math.round((currentStep / 3) * 100);
  const rewardAmount = declaration.reward_amount || 1500;
  const pointsReward = declaration.reward_points || 50;

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
          <ThemedText className="text-base font-bold text-textMain">Rendre le document</ThemedText>
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
              <Ionicons name="return-down-back-outline" size={28} color={PRIMARY} />
            </View>
            <View className="flex-1">
              <ThemedText className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-0.5">
                Statut de la remise
              </ThemedText>
              <ThemedText className="text-base font-bold text-white" numberOfLines={2}>
                {currentStep >= 3 ? 'Document remis avec succès' :
                 currentStep >= 2 ? 'Paiement confirmé par le propriétaire' :
                 currentStep >= 1 ? 'Propriétaire identifié' :
                 'En attente de correspondance'}
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
              Suivi #{id?.slice(0, 8).toUpperCase()}
            </ThemedText>
            <View className="flex-row items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
              <View className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <ThemedText className="text-[10px] font-bold text-green-700 uppercase">ACTIF</ThemedText>
            </View>
          </View>

          {[
            { label: 'Document trouvé signalé', done: currentStep >= 0, active: currentStep === 0, date: formatDate(declaration.created_at), icon: 'hand-left' },
            { label: 'Propriétaire identifié', done: currentStep >= 1, active: currentStep === 1, date: declaration.matched_at ? formatDate(declaration.matched_at) : '—', icon: 'people' },
            { label: 'Paiement reçu du propriétaire', done: currentStep >= 2, active: currentStep === 2, date: currentStep >= 2 ? 'Effectué' : 'En attente', icon: 'cash' },
            { label: 'Remise & Gains versés', done: currentStep >= 3, active: currentStep === 3, date: currentStep >= 3 ? formatDate(declaration.returned_at) : 'À venir', icon: 'checkmark-circle' },
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

        {/* Gains Cards */}
        <View className="flex-row gap-3 mb-6">
          <ThemedView className="flex-1 bg-white rounded-3xl border border-borderMain p-5 flex-row items-center gap-4 shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center">
              <Ionicons name="cash" size={22} color="#D97706" />
            </View>
            <View>
              <ThemedText className="text-[10px] font-bold text-textMuted uppercase">Gains</ThemedText>
              <ThemedText className="text-lg font-extrabold text-textMain">{rewardAmount.toLocaleString()} FCFA</ThemedText>
            </View>
          </ThemedView>
          <ThemedView className="flex-1 bg-white rounded-3xl border border-borderMain p-5 flex-row items-center gap-4 shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-purple-50 items-center justify-center">
              <Ionicons name="star" size={22} color="#7C3AED" />
            </View>
            <View>
              <ThemedText className="text-[10px] font-bold text-textMuted uppercase">Points</ThemedText>
              <ThemedText className="text-lg font-extrabold text-purple-700">+{pointsReward} pts</ThemedText>
            </View>
          </ThemedView>
        </View>

        {/* Code Validation */}
        {currentStep < 3 && (
          <ThemedView className="bg-white rounded-[40px] border border-borderMain p-8 items-center mb-6 shadow-sm">
            <View className="w-20 h-20 rounded-full bg-[#FAF7F2] border border-borderMain items-center justify-center mb-5 relative">
              <Ionicons name="key" size={32} color={PRIMARY} />
              <View className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white border border-borderMain items-center justify-center shadow-sm">
                <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              </View>
            </View>

            <ThemedText className="text-lg font-bold text-textMain mb-2">Validation de la remise</ThemedText>
            <ThemedText className="text-[12px] text-textMuted leading-relaxed mb-8 text-center px-4">
              Une fois en agence ou face au propriétaire, saisissez le code qu'il vous fournira pour confirmer la remise et percevoir vos gains.
            </ThemedText>

            <View className="w-full gap-6">
              <View>
                <ThemedText className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-4 text-center">
                  Code de sécurité
                </ThemedText>
                <View className="flex-row justify-center gap-2">
                  {code.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      className="w-10 h-14 bg-[#FAF7F2] border border-borderMain rounded-2xl text-center font-bold text-xl text-textMain outline-none"
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(v) => handleCodeChange(v, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      selectTextOnFocus
                    />
                  ))}
                </View>
              </View>

              <Pressable
                onPress={handleValidateCode}
                disabled={validatingCode || code.join('').length < 6}
                style={{ backgroundColor: GREEN_DARK }}
                className="w-full py-4 rounded-[24px] items-center justify-center flex-row gap-2 shadow-lg active:scale-[0.98] disabled:opacity-60"
              >
                {validatingCode ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <ThemedText className="text-white font-bold text-sm">Valider & percevoir mes gains</ThemedText>
                  </>
                )}
              </Pressable>

              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="lock-closed" size={10} color="#9CA3AF" />
                <ThemedText className="text-[10px] text-textMuted italic">
                  Le code sera fourni par le propriétaire après validation du paiement
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        )}

        {/* Success State */}
        {currentStep >= 3 && (
          <ThemedView className="bg-white rounded-[40px] border border-green-200 p-8 items-center mb-6 shadow-sm">
            <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-5">
              <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
            </View>
            <ThemedText className="text-lg font-bold text-green-700 mb-2">Document remis avec succès !</ThemedText>
            <ThemedText className="text-[12px] text-textMuted text-center mb-6">
              Vos gains de {rewardAmount.toLocaleString()} FCFA ont été crédités sur votre portefeuille.
            </ThemedText>
          </ThemedView>
        )}

        {/* Document Summary */}
        <ThemedView className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm mb-6">
          <ThemedText className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-4">
            Résumé du document
          </ThemedText>

          <View className="flex-row items-center gap-4 p-4 bg-[#FAF7F2] rounded-2xl border border-borderMain/50">
            <View className="w-12 h-12 rounded-xl bg-white items-center justify-center border border-borderMain shadow-sm">
              <Ionicons name="document-text" size={24} color="#6B7280" />
            </View>
            <View className="flex-1">
              <ThemedText className="text-[13px] font-bold text-textMain">
                {declaration.doc_type || 'Document'} {declaration.document_number ? `N°${declaration.document_number}` : ''}
              </ThemedText>
              <ThemedText className="text-[10px] text-textMuted italic mt-0.5">
                <Ionicons name="location" size={9} /> {declaration.ville || declaration.lieu_trouvee || 'Non spécifié'}
              </ThemedText>
            </View>
          </View>

          {declaration.counterPart && (
            <View className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-100 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-green-dark items-center justify-center">
                <Ionicons name="person" size={20} color="white" />
              </View>
              <View className="flex-1">
                <ThemedText className="text-[13px] font-bold text-green-900">
                  {declaration.counterPart.nom} {declaration.counterPart.prenom}
                </ThemedText>
                <ThemedText className="text-[10px] text-green-700/80">
                  Propriétaire du document
                </ThemedText>
              </View>
            </View>
          )}
        </ThemedView>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {currentStep < 3 && (
        <View
          className="bg-white border-t border-borderMain px-4 py-3 flex-row items-center justify-between shadow-2xl"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <ThemedText className="text-[12px] font-black text-textMain truncate" numberOfLines={1}>
                {declaration.doc_type || 'Document'}
              </ThemedText>
              <View className="w-1.5 h-1.5 rounded-full bg-primary" />
              <ThemedText className="text-[12px] text-green-600 font-black">+{rewardAmount.toLocaleString()} FCFA</ThemedText>
            </View>
            <ThemedText className="text-[10px] text-textMuted">Validation requise • Code à 6 chiffres</ThemedText>
          </View>
          <Pressable
            onPress={() => inputRefs.current[0]?.focus()}
            style={{ backgroundColor: GREEN_DARK }}
            className="px-6 py-3 rounded-2xl shadow-lg active:scale-95"
          >
            <ThemedText className="text-white font-black text-[12px]">Valider</ThemedText>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
