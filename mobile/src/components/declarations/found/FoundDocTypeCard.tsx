import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { documentTypesService } from '@/core/api/declarationsService';
import type { DocTypeCatalog } from '@/types';

const PRIMARY = '#F5A64B';

function getDocIcon(code: string): keyof typeof Ionicons.glyphMap {
  if (code.includes('cni') || code.includes('carte')) return 'card-outline';
  if (code.includes('pass')) return 'airplane-outline';
  if (code.includes('permis') || code.includes('conduire')) return 'car-outline';
  if (code.includes('diplome') || code.includes('ecole') || code.includes('école')) return 'school-outline';
  if (code.includes('acte')) return 'newspaper-outline';
  return 'document-text-outline';
}

interface FoundDocTypeCardProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FoundDocTypeCard({ selectedId, onSelect }: FoundDocTypeCardProps) {
  const [types, setTypes] = useState<DocTypeCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      if (res.success && res.data) setTypes(res.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 24 }} />;
  }

  return (
    <View style={{ gap: 8 }}>
      {types.map((t) => {
        const isSelected = t.id === selectedId;
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: isSelected ? PRIMARY : '#F0F0F0',
              backgroundColor: isSelected ? '#FFF9F2' : '#FAFAFA',
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: isSelected ? '#FFF3E0' : '#F0F0F0',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={getDocIcon(t.code || t.nom)} size={24} color={isSelected ? PRIMARY : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>{t.nom}</Text>
            </View>
            {isSelected && (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}