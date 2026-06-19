import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { BottomTabInset } from '@/constants/theme';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

export default function CardScreen() {
  const insets = useSafeAreaInsets();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<'safe' | 'stolen' | 'unknown' | null>(null);

  const handleVerify = () => {
    if (!manualCode.trim()) return;
    setVerifyResult(Math.random() > 0.5 ? 'safe' : 'stolen');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 32, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>Scanner</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Vérifiez l'authenticité d'un document</Text>
        </View>

        {/* Scanner area */}
        <View style={{
          backgroundColor: '#1A1A1A', borderRadius: 24, padding: 40,
          alignItems: 'center', gap: 16, marginBottom: 24, overflow: 'hidden',
        }}>
          <View style={{
            width: 160, height: 160, borderRadius: 20,
            borderWidth: 3, borderColor: PRIMARY, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              width: 120, height: 120, borderRadius: 16,
              backgroundColor: 'rgba(245,166,75,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="scan-outline" size={48} color={PRIMARY} />
            </View>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
            Scanner un document
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            Placez le document dans le cadre{'\n'}pour vérifier son authenticité
          </Text>
        </View>

        {/* Feature cards */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {[
            { icon: 'shield-checkmark-outline', title: 'Vérification', desc: 'Vérifiez si un document est authentique ou signalé', color: '#16A34A', bg: '#F0FDF4' },
            { icon: 'document-text-outline', title: 'Enregistrement', desc: 'Scannez et enregistrez vos documents en un clic', color: '#3B82F6', bg: '#EFF6FF' },
            { icon: 'search-outline', title: 'Recherche rapide', desc: 'Trouvez des informations sur un document trouvé', color: '#8B5CF6', bg: '#F5F3FF' },
          ].map((feature, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: '#FAFAFA', borderRadius: 16,
                borderWidth: 1, borderColor: '#F0F0F0', padding: 16,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: feature.bg, alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={feature.icon as any} size={22} color={feature.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{feature.title}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Manual entry */}
        <Pressable
          onPress={() => { setShowManualEntry(true); setVerifyResult(null); setManualCode(''); }}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 14, borderRadius: 14,
            backgroundColor: pressed ? '#FFF3E0' : '#FFFFFF',
            borderWidth: 1.5, borderStyle: 'dashed', borderColor: PRIMARY,
          })}
        >
          <Ionicons name="keypad-outline" size={18} color={PRIMARY} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: PRIMARY }}>Saisie manuelle du code</Text>
        </Pressable>
      </ScrollView>

      {/* Manual entry modal */}
      <Modal visible={showManualEntry} transparent animationType="fade" onRequestClose={() => setShowManualEntry(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setShowManualEntry(false)}>
          <Pressable style={{ backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24 }} onPress={e => e.stopPropagation()}>
            <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name="keypad" size={30} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
              Vérifier un code
            </Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
              Saisissez le code de vérification du document
            </Text>

            <Input
              label="Code de vérification"
              placeholder="Ex: DM-123456"
              icon="key-outline"
              value={manualCode}
              onChangeText={(v) => { setManualCode(v); setVerifyResult(null); }}
            />

            {verifyResult && (
              <View style={{
                marginTop: 14, padding: 14, borderRadius: 14,
                backgroundColor: verifyResult === 'safe' ? '#F0FDF4' : verifyResult === 'stolen' ? '#FEF2F2' : '#F9FAFB',
                borderWidth: 1, borderColor: verifyResult === 'safe' ? '#BBF7D0' : verifyResult === 'stolen' ? '#FECACA' : '#E5E7EB',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: verifyResult === 'safe' ? '#16A34A' : verifyResult === 'stolen' ? '#EF4444' : '#6B7280',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={verifyResult === 'safe' ? 'checkmark' : verifyResult === 'stolen' ? 'warning' : 'help'} size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: verifyResult === 'safe' ? '#166534' : verifyResult === 'stolen' ? '#991B1B' : '#1F2937' }}>
                      {verifyResult === 'safe' ? 'Document authentique' : verifyResult === 'stolen' ? 'Attention !' : 'Inconnu'}
                    </Text>
                    <Text style={{ fontSize: 12, color: verifyResult === 'safe' ? '#15803D' : verifyResult === 'stolen' ? '#B91C1C' : '#6B7280' }}>
                      {verifyResult === 'safe' ? "Ce document n'est pas signalé." : verifyResult === 'stolen' ? 'Ce document est signalé !' : 'Code non reconnu.'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <Button title="Fermer" variant="outline" onPress={() => setShowManualEntry(false)} />
              </View>
              <View style={{ flex: 1.5 }}>
                <Button title="Vérifier" onPress={handleVerify} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
