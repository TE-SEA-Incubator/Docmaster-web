import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import { BottomTabInset } from '@/constants/theme';
import type { Declaration } from '@/types';

const PRIMARY = '#F5A64B';

function getDocIcon(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toLowerCase();
  if (t.includes('cni') || t.includes('carte')) return 'card-outline';
  if (t.includes('pass')) return 'airplane-outline';
  if (t.includes('permis')) return 'car-outline';
  if (t.includes('diplome') || t.includes('école')) return 'school-outline';
  return 'document-text-outline';
}

function timeAgo(dateString?: string) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return new Date(dateString).toLocaleDateString('fr-FR');
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await declarationsService.searchPublic(q);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 32, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>Recherche</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Trouvez des documents perdus ou trouvés</Text>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#FAFAFA', borderRadius: 16,
          borderWidth: 1, borderColor: '#F0F0F0',
          paddingHorizontal: 16, height: 52, marginBottom: 20,
        }}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#1A1A1A' }}
            placeholder="Nom, numéro, type de document..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={20} color="#D1D5DB" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={{ marginTop: 12, color: '#9CA3AF', fontSize: 13 }}>Recherche en cours...</Text>
          </View>
        ) : !searched ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="search-outline" size={34} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>
              Recherchez un document
            </Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
              Tapez un nom, numéro ou type de document pour trouver des déclarations publiques
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="search-outline" size={28} color="#D1D5DB" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>Aucun résultat</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
              Aucune déclaration trouvée pour "{query}"
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>
              {results.length} résultat{results.length > 1 ? 's' : ''}
            </Text>
            {results.map((dec) => {
              const isLost = dec.type === 'lost' || dec.is_lost;
              return (
                <Pressable
                  key={dec.id}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    backgroundColor: pressed ? '#F9F9F9' : '#FAFAFA',
                    borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0',
                    padding: 14,
                  })}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: isLost ? '#FFF5F5' : '#F0FDF4',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={getDocIcon(dec.doc_type)} size={20} color={isLost ? '#EF4444' : '#16A34A'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                      {dec.docTypeInfo?.nom || dec.doc_type || 'Document'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>
                      {dec.lieu_perte || dec.lieu_trouvee || 'Lieu non spécifié'} · {timeAgo(dec.created_at)}
                    </Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                    backgroundColor: isLost ? '#FFF5F5' : '#F0FDF4',
                    borderWidth: 1, borderColor: isLost ? '#FECACA' : '#BBF7D0',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isLost ? '#EF4444' : '#16A34A' }}>
                      {isLost ? 'Perdu' : 'Trouvé'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
