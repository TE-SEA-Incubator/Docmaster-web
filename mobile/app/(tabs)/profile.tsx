import React, { useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BottomTabInset } from '@/constants/theme';
import { useAuthStore } from '@/core/store/useAuthStore';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

const MENU_ITEMS = [
  { key: 'gains', icon: 'wallet-outline', title: 'Mes gains', route: '/gains', color: '#D97706', bgColor: '#FFFBEB' },
  { key: 'invite', icon: 'people-outline', title: 'Parrainer des amis', route: '/parrainage', color: '#7E22CE', bgColor: '#F3E8FF' },
  { key: 'manage', icon: 'settings-outline', title: 'Manage profile', route: '/manage-profile', color: '#F97316', bgColor: '#FFF7ED' },
  { key: 'customize', icon: 'options-outline', title: 'Customize my experience', route: null, color: '#2563EB', bgColor: '#EFF6FF' },
  { key: 'notifications', icon: 'notifications-outline', title: 'Manage notifications', route: '/notifications', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { key: 'faq', icon: 'bulb-outline', title: 'FAQ', route: null, color: '#CA8A04', bgColor: '#FEFCE8' },
  { key: 'subscription', icon: 'star-outline', title: 'Manage subscription', route: '/(tabs)/subscription', color: '#DC2626', bgColor: '#FEF2F2' },
  { key: 'bug', icon: 'bug-outline', title: 'Report a bug', route: null, color: '#EA580C', bgColor: '#FFF7ED' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F8F8', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ marginTop: 12, color: '#9CA3AF', fontSize: 14 }}>Chargement du profil...</Text>
      </SafeAreaView>
    );
  }

  const getInitials = () => {
    const p = user.prenom?.charAt(0) || '';
    const n = user.nom?.charAt(0) || '';
    return (p + n).toUpperCase() || 'DM';
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } catch {} finally { setLoggingOut(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: GREEN_DARK,
          paddingTop: insets.top,
          paddingBottom: 50,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, marginBottom: 24 }}>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable>
              <Ionicons name="pencil" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: '#FFFFFF',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
            }}>
              <Text style={{ color: GREEN_DARK, fontSize: 34, fontWeight: '800' }}>{getInitials()}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 }}>
            {user.prenom} {user.nom}
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 4 }}>
            {user.email}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            {user.ville ? `${user.ville}, ${user.pays || ''}` : 'DocMaster User'}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          backgroundColor: '#2A2A2A',
          marginHorizontal: 24,
          borderRadius: 20,
          paddingVertical: 18,
          marginTop: -30,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
          zIndex: 10,
        }}>
          <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#444' }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Documents</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: PRIMARY }}>12</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#444' }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Points</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: PRIMARY }}>{user.points || 0}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Portefeuille</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: PRIMARY }}>
              {Number(user.wallet_balance || 0).toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 24, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' }}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => item.route && router.push(item.route as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 18,
                borderBottomWidth: index < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: '#F3F4F6',
              }}>
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: item.bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: '#1F2937',
                  marginLeft: 14,
                  flexShrink: 1,
                }}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 16,
              paddingHorizontal: 18,
            }}>
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text style={{
                fontSize: 15,
                fontWeight: '500',
                color: '#EF4444',
                marginLeft: 14,
                flexShrink: 1,
              }}>
                {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </Text>
            </View>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
