import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CONTACT_MODES = [
  { value: 'APP_CHAT', label: 'Via l\'application', icon: 'chatbubble-ellipses', desc: 'Restez anonyme' },
  { value: 'PHONE', label: 'Par téléphone', icon: 'call', desc: 'Appel direct' },
];

const REWARDS = [
  { id: 'NON_MERCI', label: 'Non merci', icon: 'hand-left', desc: 'Geste gratuit', color: '#6B7280', bg: '#F3F4F6' },
  { id: 'POINTS', label: 'Points DocMaster', icon: 'star', desc: '+50 pts bonus', color: '#F5A64B', bg: '#FFF3E0' },
  { id: 'GRE', label: 'Gré du propriétaire', icon: 'cash', desc: 'À sa discrétion', color: '#16A34A', bg: '#F0FDF4' },
];

interface FoundContactFormProps {
  phone: string;
  contactMode: string;
  rewardChoice: string;
  consent: boolean;
  summary: { label: string; value: string }[];
  onChangePhone: (v: string) => void;
  onChangeContactMode: (v: string) => void;
  onChangeReward: (v: string) => void;
  onChangeConsent: (v: boolean) => void;
}

export function FoundContactForm({
  phone, contactMode, rewardChoice, consent, summary,
  onChangePhone, onChangeContactMode, onChangeReward, onChangeConsent,
}: FoundContactFormProps) {
  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Votre numéro de téléphone
        </Text>
        <TextInput
          value={phone}
          onChangeText={onChangePhone}
          placeholder="6XX XXX XXX"
          placeholderTextColor="#D1D5DB"
          keyboardType="phone-pad"
          style={{
            padding: 14, borderRadius: 12, fontSize: 14, color: '#1A1A1A',
            backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
          }}
        />
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 8 }}>
          Mode de contact préféré
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {CONTACT_MODES.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => onChangeContactMode(m.value)}
              style={{
                flex: 1, gap: 6, padding: 14, borderRadius: 14,
                borderWidth: 2,
                borderColor: contactMode === m.value ? '#F5A64B' : '#F0F0F0',
                backgroundColor: contactMode === m.value ? '#FFF9F2' : '#FAFAFA',
                alignItems: 'center',
              }}
            >
              <Ionicons name={m.icon as any} size={22} color={contactMode === m.value ? '#F5A64B' : '#9CA3AF'} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: contactMode === m.value ? '#F5A64B' : '#6B7280' }}>
                {m.label}
              </Text>
              <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{m.desc}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 8 }}>
          Souhaitez-vous une récompense ?
        </Text>
        <View style={{ gap: 8 }}>
          {REWARDS.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => onChangeReward(r.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 14,
                borderWidth: 2,
                borderColor: rewardChoice === r.id ? r.color : '#F0F0F0',
                backgroundColor: rewardChoice === r.id ? r.bg : '#FAFAFA',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: rewardChoice === r.id ? r.bg : '#F0F0F0',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={r.icon as any} size={18} color={rewardChoice === r.id ? r.color : '#9CA3AF'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{r.label}</Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{r.desc}</Text>
              </View>
              {rewardChoice === r.id && (
                <Ionicons name="checkmark-circle" size={20} color={r.color} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: '#FAFAFA', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 10 }}>Récapitulatif</Text>
        {summary.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < summary.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => onChangeConsent(!consent)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
      >
        <View style={{
          width: 22, height: 22, borderRadius: 6, borderWidth: 2,
          borderColor: consent ? '#F5A64B' : '#D1D5DB',
          backgroundColor: consent ? '#F5A64B' : 'transparent',
          alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>
          {consent && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text style={{ fontSize: 12, color: '#4B5563', flex: 1, lineHeight: 18 }}>
          Je certifie sur l'honneur que les informations fournies sont exactes et que le document trouvé ne m'appartient pas.
        </Text>
      </Pressable>
    </View>
  );
}