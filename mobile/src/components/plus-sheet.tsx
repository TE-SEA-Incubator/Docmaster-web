import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACTIONS = [
  {
    key: 'add-device',
    title: 'Créer un appareil',
    subtitle: 'Enregistrez un nouvel appareil',
    icon: 'phone-portrait-outline' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    route: '/(tabs)/devices?openAdd=true',
  },
  {
    key: 'verify-device',
    title: 'Vérifier un appareil',
    subtitle: 'Vérifiez si un appareil est volé ou perdu',
    icon: 'shield-checkmark-outline' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    route: '/(tabs)/devices?openVerify=true',
  },
  {
    key: 'add-document',
    title: 'Créer un document',
    subtitle: 'Enregistrez un nouveau document',
    icon: 'document-text-outline' as const,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    route: '/(tabs)/documents?openAdd=true',
  },
  {
    key: 'lost',
    title: 'Déclarer une perte',
    subtitle: 'Signalez un document perdu',
    icon: 'alert-circle-outline' as const,
    color: '#EF4444',
    bg: '#FEF2F2',
    route: '/(tabs)/declarer',
  },
  {
    key: 'found',
    title: 'Document retrouvé',
    subtitle: 'Enregistrez un document trouvé',
    icon: 'checkmark-circle-outline' as const,
    color: '#16A34A',
    bg: '#F0FDF4',
    route: '/(tabs)/trouver',
  },
  {
    key: 'search',
    title: 'Rechercher un document',
    subtitle: 'Trouvez un document via la plateforme',
    icon: 'search-outline' as const,
    color: '#0EA5E9',
    bg: '#E0F2FE',
    route: '/(tabs)/rechercher',
  },
  {
    key: 'my-declarations',
    title: 'Mes déclarations',
    subtitle: 'Consultez vos signalements',
    icon: 'megaphone-outline' as const,
    color: '#F5A64B',
    bg: '#FFF9F2',
    route: '/(tabs)/declarations',
  },
];

interface PlusSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function PlusSheet({ visible, onClose }: PlusSheetProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const handlePress = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: scheme === 'dark' ? '#3A2E20' : '#FEF0DC' }]}>
              <Ionicons name="add-circle" size={28} color="#F5A64B" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Actions rapides</Text>
          </View>

          <View style={styles.actions}>
            {ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => handlePress(action.route)}
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { backgroundColor: action.bg, borderColor: action.color + '30' },
                ]}
              >
                {/* Icône de gauche enveloppée correctement */}
                <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>

                {/* Conteneur de texte avec un flex: 1 pour pousser le chevron à droite */}
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{action.subtitle}</Text>
                </View>

                {/* Chevron de droite aligné verticalement */}
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)', // Un poil plus sombre pour mieux détacher le sheet
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FEF0DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  actions: {
    gap: 12, // Légèrement espacé pour respirer comme sur ta maquette d'origine
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EAE0',
    backgroundColor: '#FFFFFF',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14, // Remplacement du gap global pour éviter les bugs de layout
  },
  actionTextContainer: {
    flex: 1, // Prends tout l'espace central disponible
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11.5,
    color: '#9CA3AF',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});