import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { declarationsService, documentTypesService } from '@/core/api/declarationsService';
import { useAuthStore } from '@/core/store/useAuthStore';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { BottomTabInset } from '@/constants/theme';
import type { DocTypeCatalog } from '@/types';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { type: initialType } = useLocalSearchParams<{ type?: string }>();
  const { user } = useAuthStore();

  const [declarationType, setDeclarationType] = useState<'lost' | 'found'>(initialType === 'found' ? 'found' : 'lost');
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    type_id: '',
    nom_complet: '',
    numero_document: '',
    date_perte: '',
    lieu_perte: '',
    description: '',
    urgence: '3',
    recompense: '',
  });

  useEffect(() => {
    if (initialType === 'found' || initialType === 'lost') {
      setDeclarationType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await documentTypesService.getActive();
        if (res.success && res.data) setDocTypes(res.data);
      } catch {} finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = useCallback(async () => {
    const errors: string[] = [];
    if (!form.type_id) errors.push('Type de document');
    if (!form.nom_complet.trim()) errors.push('Nom complet');
    if (!form.numero_document.trim()) errors.push('Numéro du document');
    if (!form.description.trim() || form.description.length < 10) errors.push('Description (min 10 caractères)');

    if (declarationType === 'lost') {
      if (!form.date_perte.trim()) errors.push('Date de perte');
      if (!form.lieu_perte.trim()) errors.push('Lieu de perte');
    } else {
      if (!form.date_perte.trim()) errors.push('Date de trouvaille');
      if (!form.lieu_perte.trim()) errors.push('Lieu de trouvaille');
    }

    if (errors.length > 0) {
      Alert.alert('Champs requis', `Veuillez remplir: ${errors.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type_id: form.type_id,
        nom_complet: form.nom_complet,
        numero_document: form.numero_document,
        description: form.description,
        urgence: Number(form.urgence),
        nom_owner: user?.nom || '',
        prenom_owner: user?.prenom || '',
        email_owner: user?.email || '',
        telephone_owner: user?.telephone || '',
      };

      if (declarationType === 'lost') {
        payload.date_perte = form.date_perte;
        payload.lieu_perte = form.lieu_perte;
        if (form.recompense) payload.recompense_montant = form.recompense;
        await declarationsService.createLost(payload);
      } else {
        payload.date_trouvee = form.date_perte;
        payload.lieu_trouvee = form.lieu_perte;
        await declarationsService.createFound(payload);
      }

      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }, [form, declarationType, user]);

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: declarationType === 'lost' ? '#FEF2F2' : '#F0FDF4',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons
              name={declarationType === 'lost' ? 'alert-circle' : 'checkmark-circle'}
              size={40}
              color={declarationType === 'lost' ? '#EF4444' : '#16A34A'}
            />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
            Déclaration envoyée
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 }}>
            Votre déclaration de document {declarationType === 'lost' ? 'perdu' : 'trouvé'} a été enregistrée avec succès.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => ({
                paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14,
                backgroundColor: GREEN_DARK, opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Retour à l'accueil</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: pressed ? '#F5F5F5' : '#FAFAFA',
              borderWidth: 1, borderColor: '#F0F0F0',
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Ionicons name="arrow-back" size={18} color="#1A1A1A" />
          </Pressable>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>
              {declarationType === 'lost' ? 'Déclarer perdu' : 'Déclarer trouvé'}
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
              {declarationType === 'lost' ? 'Signalez un document perdu' : 'Enregistrez un document trouvé'}
            </Text>
          </View>
        </View>

        {/* Type toggle */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {([
            { key: 'lost' as const, label: 'Perdu', icon: 'alert-circle-outline' as const, color: '#EF4444', bg: '#FEF2F2' },
            { key: 'found' as const, label: 'Trouvé', icon: 'checkmark-circle-outline' as const, color: '#16A34A', bg: '#F0FDF4' },
          ] as const).map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setDeclarationType(opt.key)}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                borderWidth: 2,
                borderColor: declarationType === opt.key ? opt.color : '#E5E7EB',
                backgroundColor: declarationType === opt.key ? opt.bg : '#FFFFFF',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name={opt.icon} size={20} color={declarationType === opt.key ? opt.color : '#9CA3AF'} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: declarationType === opt.key ? opt.color : '#6B7280' }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Document type selector */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 }}>Type de document *</Text>
          {loadingTypes ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {docTypes.map((dt) => {
                const selected = form.type_id === dt.id;
                return (
                  <Pressable
                    key={dt.id}
                    onPress={() => updateForm('type_id', dt.id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: selected ? PRIMARY : '#E5E7EB',
                      backgroundColor: selected ? '#FEF3C7' : '#FFFFFF',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Ionicons name="document-text-outline" size={16} color={selected ? PRIMARY : '#9CA3AF'} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#92400E' : '#6B7280' }}>
                      {dt.nom}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Form fields */}
        <View style={{ gap: 14 }}>
          <Input
            label="Nom complet *"
            placeholder="Nom et prénom du propriétaire"
            icon="person-outline"
            value={form.nom_complet}
            onChangeText={(v) => updateForm('nom_complet', v)}
          />

          <Input
            label="Numéro du document *"
            placeholder="Ex: 123456789"
            icon="finger-print-outline"
            value={form.numero_document}
            onChangeText={(v) => updateForm('numero_document', v)}
          />

          <Input
            label={declarationType === 'lost' ? 'Date de perte *' : 'Date de trouvaille *'}
            placeholder="AAAA-MM-JJ"
            icon="calendar-outline"
            value={form.date_perte}
            onChangeText={(v) => updateForm('date_perte', v)}
          />

          <Input
            label={declarationType === 'lost' ? 'Lieu de perte *' : 'Lieu de trouvaille *'}
            placeholder="Ex: Marché Central, Douala"
            icon="location-outline"
            value={form.lieu_perte}
            onChangeText={(v) => updateForm('lieu_perte', v)}
          />

          <View style={{ gap: 1.5 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 4 }}>
              Description * <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(min. 10 caractères)</Text>
            </Text>
            <View style={{
              backgroundColor: '#FFFFFF', borderRadius: 16,
              borderWidth: 1, borderColor: '#F0F0F0',
              paddingHorizontal: 16, paddingVertical: 12, minHeight: 100,
            }}>
              <Input
                placeholder="Décrivez le document en détail..."
                value={form.description}
                onChangeText={(v) => updateForm('description', v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                containerStyle={{ backgroundColor: 'transparent', borderWidth: 0, padding: 0 }}
              />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 }}>Urgence</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((level) => {
                const selected = Number(form.urgence) === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => updateForm('urgence', String(level))}
                    style={({ pressed }) => ({
                      flex: 1, paddingVertical: 12, borderRadius: 10,
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: selected ? PRIMARY : '#E5E7EB',
                      backgroundColor: selected ? '#FEF3C7' : '#FFFFFF',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: selected ? PRIMARY : '#9CA3AF' }}>
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {declarationType === 'lost' && (
            <Input
              label="Récompense (optionnel)"
              placeholder="Montant en FCFA"
              icon="wallet-outline"
              keyboardType="numeric"
              value={form.recompense}
              onChangeText={(v) => updateForm('recompense', v)}
            />
          )}
        </View>

        <View style={{ marginTop: 28 }}>
          <Button
            title={declarationType === 'lost' ? 'Envoyer la déclaration' : 'Enregistrer le document trouvé'}
            onPress={handleSubmit}
            loading={submitting}
            icon={declarationType === 'lost' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
