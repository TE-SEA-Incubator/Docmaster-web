import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
  StyleSheet, Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { DatePickerInput } from '@/components/declarations/wizard/DatePickerInput';
import { useDevices } from '@/core/hooks/useDevices';
import { useTranslation } from 'react-i18next';
import type { DeviceType } from '@/components/devices/DeviceCard';

const TYPE_META: Record<DeviceType, { labelKey: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  telephone: { labelKey: 'devices:deviceTelephone', icon: 'phone-portrait-outline', color: '#3B82F6', bg: '#EFF6FF' },
  ordinateur: { labelKey: 'devices:deviceOrdinateur', icon: 'laptop-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  tablette: { labelKey: 'devices:deviceTablette', icon: 'tablet-portrait-outline', color: '#10B981', bg: '#ECFDF5' },
  tv: { labelKey: 'devices:deviceTv', icon: 'tv-outline', color: '#F59E0B', bg: '#FFFBEB' },
  autre: { labelKey: 'devices:deviceAutre', icon: 'cube-outline', color: '#6B7280', bg: '#F9FAFB' },
};

const EMPTY_FORM = {
  nom: '', type: 'telephone' as DeviceType, marque: '', modele: '', serial: '',
  couleur: '', dateAchat: '', garantie: '', prix: 0, lieu: '',
  assurance: 'non' as 'oui' | 'non', notes: '',
  photo_facture: null as string | null,
  photo_face: null as string | null,
  photo_serial: null as string | null,
};

function PhotoPicker({ label, uri, onSelect }: { label: string; uri: string | null; onSelect: (uri: string) => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const pick = () => {
    Alert.alert(t('devices:imageSource'), t('devices:imageSourceQuestion'), [
      { text: t('devices:takePhoto'), onPress: async () => {
        const r = await ImagePicker.launchCameraAsync({ quality: 0.7, exif: false });
        if (!r.canceled && r.assets?.[0]) onSelect(r.assets[0].uri);
      }},
      { text: t('devices:chooseFromGallery'), onPress: async () => {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, exif: false });
        if (!r.canceled && r.assets?.[0]) onSelect(r.assets[0].uri);
      }},
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  return (
    <Pressable onPress={pick} style={[ps.photoPicker, { backgroundColor: colors.background, borderColor: uri ? 'transparent' : colors.border }]}>
      {uri
        ? <Image source={{ uri }} style={ps.photoImg} />
        : <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
      }
      <Text style={[ps.photoLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const ps = StyleSheet.create({
  photoPicker: { flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  photoImg: { width: '100%', height: 80, borderRadius: 8 },
  photoLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});

export default function AddDevicePage() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { create, isCreating } = useDevices();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useCallback((key: string, value: any) => setForm(f => ({ ...f, [key]: value })), []);

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.nom.trim()) errs.nom = t('common:required');
    if (!form.marque.trim()) errs.marque = t('common:required');
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const fd = new FormData();
    fd.append('category', form.type);
    fd.append('brand', form.marque);
    fd.append('model', form.modele);
    fd.append('serial_number_imei', form.serial);
    fd.append('color', form.couleur);
    fd.append('purchase_date', form.dateAchat || '');
    fd.append('garantie_end', form.garantie || '');
    fd.append('purchase_value', String(form.prix || 0));
    fd.append('currency', 'XAF');
    fd.append('where_buy', form.lieu);
    fd.append('assurance', form.assurance);
    fd.append('notes', form.notes);
    fd.append('status', 'SAFE');
    const appendFile = (field: string, uri: string | null) => {
      if (uri) fd.append(field, { uri, type: 'image/jpeg', name: `${field}.jpg` } as any);
    };
    appendFile('photo_facture', form.photo_facture);
    appendFile('photo_face', form.photo_face);
    appendFile('photo_serial', form.photo_serial);

    create(fd, {
      onSuccess: () => router.back(),
      onError: () => Alert.alert(t('common:error'), t('devices:saveErrorMessage')),
    });
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('devices:addDevice')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('devices:deviceType')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
          {(Object.keys(TYPE_META) as DeviceType[]).map((type) => {
            const m = TYPE_META[type];
            const sel = form.type === type;
            return (
              <Pressable key={type} onPress={() => update('type', type)} style={[s.typeCard, {
                borderColor: sel ? m.color : colors.border,
                backgroundColor: sel ? m.bg : colors.backgroundElement,
              }]}>
                <View style={[s.typeIcon, { backgroundColor: sel ? `${m.color}22` : colors.background }]}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <Text style={[s.typeLabel, { color: sel ? m.color : colors.text }]}>{t(m.labelKey)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Nom & marque */}
        <Input label={t('devices:deviceNameLabel')} placeholder={t('devices:deviceNamePlaceholder')} icon="pricetag-outline" value={form.nom} onChangeText={v => update('nom', v)} error={errors.nom} />
        <View style={[s.row, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}><Input label={t('devices:brandLabel')} placeholder={t('devices:brandPlaceholder')} icon="business-outline" value={form.marque} onChangeText={v => update('marque', v)} error={errors.marque} /></View>
          <View style={{ flex: 1 }}><Input label={t('devices:modelLabel')} placeholder={t('devices:modelPlaceholder')} icon="git-branch-outline" value={form.modele} onChangeText={v => update('modele', v)} /></View>
        </View>

        {/* Serial & couleur */}
        <View style={[s.row, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}><Input label={t('devices:serialLabel')} placeholder={t('devices:serialPlaceholder')} icon="barcode-outline" value={form.serial} onChangeText={v => update('serial', v)} /></View>
          <View style={{ flex: 1 }}><Input label={t('devices:colorLabel')} placeholder={t('devices:colorPlaceholder')} icon="color-palette-outline" value={form.couleur} onChangeText={v => update('couleur', v)} /></View>
        </View>

        {/* Dates */}
        <View style={[s.row, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}><DatePickerInput label={t('devices:purchaseDateLabel')} value={form.dateAchat ? new Date(form.dateAchat) : new Date()} onChange={d => update('dateAchat', d.toISOString().split('T')[0])} /></View>
          <View style={{ flex: 1 }}><DatePickerInput label={t('devices:warrantyLabel')} value={form.garantie ? new Date(form.garantie) : new Date()} onChange={d => update('garantie', d.toISOString().split('T')[0])} /></View>
        </View>

        {/* Prix & lieu */}
        <View style={[s.row, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}><Input label={t('devices:priceLabel')} placeholder={t('devices:pricePlaceholder')} icon="wallet-outline" keyboardType="numeric" value={form.prix ? String(form.prix) : ''} onChangeText={v => update('prix', v ? Number(v.replace(/[^0-9]/g, '')) : 0)} /></View>
          <View style={{ flex: 1 }}><Input label={t('devices:locationLabel')} placeholder={t('devices:locationPlaceholder')} icon="location-outline" value={form.lieu} onChangeText={v => update('lieu', v)} /></View>
        </View>

        {/* Assurance */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>{t('devices:insuranceLabel')}</Text>
        <View style={[s.row, { gap: 10, marginBottom: 20 }]}>
          {(['oui', 'non'] as const).map(v => (
            <Pressable key={v} onPress={() => update('assurance', v)} style={[s.assuranceBtn, {
              borderColor: form.assurance === v ? colors.warning : colors.border,
              backgroundColor: form.assurance === v ? colors.warningBg : colors.backgroundElement,
            }]}>
              <Ionicons name={v === 'oui' ? 'shield-checkmark-outline' : 'shield-outline'} size={18} color={form.assurance === v ? colors.warning : colors.textSecondary} />
              <Text style={[s.assuranceTxt, { color: form.assurance === v ? colors.warning : colors.textSecondary }]}>
                {v === 'oui' ? t('devices:insured') : t('devices:notInsured')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Photos */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('devices:photos')}</Text>
        <View style={[s.row, { gap: 10, marginBottom: 20 }]}>
          <PhotoPicker label={t('devices:receiptPhoto')} uri={form.photo_facture} onSelect={uri => update('photo_facture', uri)} />
          <PhotoPicker label={t('devices:facePhoto')} uri={form.photo_face} onSelect={uri => update('photo_face', uri)} />
          <PhotoPicker label={t('devices:serialPhoto')} uri={form.photo_serial} onSelect={uri => update('photo_serial', uri)} />
        </View>

        {/* Notes */}
        <Input label={t('devices:notesLabel')} placeholder={t('devices:notesPlaceholder')} icon="document-text-outline" value={form.notes} onChangeText={v => update('notes', v)} />

        {/* Save button */}
        <View style={{ marginTop: 28, gap: 12 }}>
          <Button title={t('common:add')} onPress={handleSave} loading={isCreating} icon="checkmark-circle-outline" />
          <Button title={t('common:cancel')} variant="outline" onPress={() => router.back()} />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  typeCard: { alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, minWidth: 90 },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 12, fontWeight: '700' },
  assuranceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  assuranceTxt: { fontSize: 13, fontWeight: '600' },
});
