import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { declarationsService } from '@/core/api/declarationsService';
import { documentsService } from '@/core/api/documentsService';
import { BottomTabInset } from '@/constants/theme';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { Declaration, Document } from '@/types';

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

type SearchResult = {
  id: string;
  type: 'declaration' | 'document';
  title: string;
  subtitle: string;
  status: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  isLost?: boolean;
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<'tous' | 'declarations' | 'documents'>('tous');

  const handleSearch = useCallback(async () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const allResults: SearchResult[] = [];

      if (mode === 'tous' || mode === 'declarations') {
        const [decRes] = await Promise.all([
          declarationsService.searchPublic(q).catch(() => ({ success: false, data: [] })),
        ]);
        if (decRes.success && decRes.data) {
          (decRes.data as Declaration[]).forEach(d => {
            const docName = (d as any).docTypeInfo?.nom || d.doc_type || 'Document';
            const isLost = (d as any).declaration_type === 'LOST' || d.is_lost;
            allResults.push({
              id: d.id,
              type: 'declaration',
              title: docName,
              subtitle: d.owner_name || (d as any).ville || 'Lieu non spécifié',
              status: isLost ? 'Perdu' : 'Trouvé',
              date: d.created_at,
              icon: getDocIcon(docName),
              color: isLost ? '#EF4444' : '#16A34A',
              bgColor: isLost ? '#FEF2F2' : '#F0FDF4',
              isLost,
            });
          });
        }
      }

      if ((mode === 'tous' || mode === 'documents') && user) {
        const docRes = await documentsService.getAll().catch(() => ({ success: false, data: [] }));
        if (docRes.success && docRes.data) {
          (docRes.data as Document[])
            .filter(d =>
              d.nom_sur_doc?.toLowerCase().includes(q) ||
              d.numero_doc?.toLowerCase().includes(q) ||
              d.type_doc?.toLowerCase().includes(q) ||
              d.notes?.toLowerCase().includes(q)
            )
            .forEach(d => {
              allResults.push({
                id: d.id,
                type: 'document',
                title: d.type_doc || 'Document',
                subtitle: d.numero_doc || d.nom_sur_doc || '—',
                status: d.is_lost ? 'Perdu' : 'Actif',
                date: d.created_at || '',
                icon: getDocIcon(d.type_doc),
                color: d.is_lost ? '#EF4444' : '#16A34A',
                bgColor: d.is_lost ? '#FEF2F2' : '#F0FDF4',
                isLost: d.is_lost,
              });
            });
        }
      }

      setResults(allResults);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, mode, user]);

  useEffect(() => {
    if (searched && query.trim()) handleSearch();
  }, [mode]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 32, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>Recherche</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Documents et déclarations</Text>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#FAFAFA', borderRadius: 16,
          borderWidth: 1, borderColor: '#F0F0F0',
          paddingHorizontal: 16, height: 52, marginBottom: 12,
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

        {/* Filter chips */}
        {user && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['tous', 'declarations', 'documents'] as const).map(m => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: mode === m ? PRIMARY : '#F5F5F5',
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: mode === m ? '#FFFFFF' : '#6B7280',
                }}>
                  {m === 'tous' ? 'Tout' : m === 'declarations' ? 'Déclarations' : 'Documents'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

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
              Tapez un nom, numéro ou type de document pour trouver des déclarations publiques ou vos documents
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
              Aucun document trouvé pour "{query}"
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>
              {results.length} résultat{results.length > 1 ? 's' : ''}
            </Text>
            {results.map((item) => (
              <Pressable
                key={`${item.type}-${item.id}`}
                onPress={() => router.push(item.type === 'declaration' ? `/declaration/${item.id}` : `/document/${item.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: pressed ? '#F9F9F9' : '#FFFFFF',
                  borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0',
                  padding: 14,
                })}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: item.bgColor,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={{
                      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
                      backgroundColor: item.bgColor,
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: item.color }}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }} numberOfLines={1}>
                    {item.subtitle} · {timeAgo(item.date)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
