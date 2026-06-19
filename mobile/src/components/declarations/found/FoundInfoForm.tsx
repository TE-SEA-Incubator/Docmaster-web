import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CONDITIONS = [
  { value: 'bon', label: 'Bon état', icon: 'checkmark-circle', color: '#16A34A', bg: '#F0FDF4' },
  { value: 'moyen', label: 'État moyen', icon: 'alert-circle', color: '#D97706', bg: '#FFFBEB' },
  { value: 'abime', label: 'Abîmé', icon: 'close-circle', color: '#EF4444', bg: '#FEF2F2' },
];

interface FoundInfoFormProps {
  ownerName: string;
  docNum: string;
  condition: string;
  description: string;
  tags: string[];
  onChangeOwner: (v: string) => void;
  onChangeDocNum: (v: string) => void;
  onChangeCondition: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangeTags: (v: string[]) => void;
}

export function FoundInfoForm({
  ownerName, docNum, condition, description, tags,
  onChangeOwner, onChangeDocNum, onChangeCondition, onChangeDescription, onChangeTags,
}: FoundInfoFormProps) {
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) {
      onChangeTags([...tags, v]);
    }
    setTagInput('');
  };

  const removeTag = (v: string) => {
    onChangeTags(tags.filter((t) => t !== v));
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Nom du titulaire <Text style={{ fontWeight: '400', color: '#9CA3AF' }}>(si lisible)</Text>
        </Text>
        <TextInput
          value={ownerName}
          onChangeText={onChangeOwner}
          placeholder="Ex: Jean Dupont"
          placeholderTextColor="#D1D5DB"
          style={{
            padding: 14, borderRadius: 12, fontSize: 14, color: '#1A1A1A',
            backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
          }}
        />
        <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
          <Ionicons name="eye-off-outline" size={10} /> Visible uniquement pour le propriétaire
        </Text>
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Numéro du document <Text style={{ fontWeight: '400', color: '#9CA3AF' }}>(si visible)</Text>
        </Text>
        <TextInput
          value={docNum}
          onChangeText={onChangeDocNum}
          placeholder="Ex: 123456789"
          placeholderTextColor="#D1D5DB"
          style={{
            padding: 14, borderRadius: 12, fontSize: 14, color: '#1A1A1A',
            backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
          }}
        />
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 8 }}>
          État physique du document
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => onChangeCondition(c.value)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: 20, borderWidth: 1.5,
                borderColor: condition === c.value ? c.color : '#F0F0F0',
                backgroundColor: condition === c.value ? c.bg : '#FFFFFF',
              }}
            >
              <Ionicons name={c.icon as any} size={14} color={condition === c.value ? c.color : '#D1D5DB'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: condition === c.value ? c.color : '#6B7280' }}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Description / Particularités
        </Text>
        <TextInput
          value={description}
          onChangeText={onChangeDescription}
          placeholder="Couleur, mentions spéciales, etc."
          placeholderTextColor="#D1D5DB"
          multiline
          numberOfLines={3}
          style={{
            padding: 14, borderRadius: 12, fontSize: 14, color: '#1A1A1A',
            backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
            minHeight: 80, textAlignVertical: 'top',
          }}
        />
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Mots-clés <Text style={{ fontWeight: '400', color: '#9CA3AF' }}>(appuyez sur Entrée pour ajouter)</Text>
        </Text>
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap', gap: 6,
          padding: 10, borderRadius: 12,
          backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
          minHeight: 44,
        }}>
          {tags.map((tag) => (
            <View key={tag} style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: '#FFF3E0', borderRadius: 16,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: PRIMARY }}>{tag}</Text>
              <Pressable onPress={() => removeTag(tag)}>
                <Ionicons name="close-circle" size={14} color={PRIMARY} />
              </Pressable>
            </View>
          ))}
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="Ajouter..."
            placeholderTextColor="#D1D5DB"
            style={{ fontSize: 13, color: '#1A1A1A', flex: 1, minWidth: 80 }}
          />
        </View>
      </View>
    </View>
  );
}

const PRIMARY = '#F5A64B';