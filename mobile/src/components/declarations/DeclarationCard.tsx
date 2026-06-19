import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type DeclarationStatus = 'SEARCHING' | 'MATCHED' | 'RETURNED' | 'AVAILABLE' | 'CANCELLED' | 'CLAIMED';

interface DeclarationCardProps {
  type: 'LOST' | 'FOUND';
  docType: string;
  status: DeclarationStatus;
  reference: string;
  ownerName?: string;
  date?: string;
  onPress?: () => void;
  onRecuperer?: () => void;
  onRendre?: () => void;
  declarationId?: string;
  hasPotentialMatches?: boolean;
}

const PALETTES = {
  red: { border: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', light: '#FEE2E2' },
  orange: { border: '#F59E0B', bg: '#FFFBEB', text: '#B45309', light: '#FEF3C7' },
  green: { border: '#10B981', bg: '#ECFDF5', text: '#047857', light: '#D1FAE5' },
  blue: { border: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', light: '#DBEAFE' },
};

export const DeclarationCard: React.FC<DeclarationCardProps> = React.memo(({
  type,
  docType,
  status,
  reference,
  ownerName,
  hasPotentialMatches,
  onPress,
  onRecuperer,
  onRendre,
  declarationId,
}) => {
  const router = useRouter();
  const isMatch = status === 'MATCHED' || status === 'RETURNED';
  const colorKey = isMatch ? 'green' : (type === 'LOST' ? (hasPotentialMatches ? 'orange' : 'red') : 'blue');
  const palette = PALETTES[colorKey as keyof typeof PALETTES] || PALETTES.red;

  // Détermination de l'étape actuelle (1 à 4)
  let currentStep = 1;
  if (status === 'SEARCHING' || status === 'AVAILABLE') currentStep = 2;
  if (status === 'MATCHED') currentStep = 3;
  if (status === 'RETURNED' || status === 'CLAIMED') currentStep = 4;

  const steps = type === 'LOST' 
    ? ['Dépôt', 'Recherche', 'Match', 'Récupéré']
    : ['Trouvé', 'Signalé', 'Propriétaire', 'Remis'];

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: palette.border, backgroundColor: '#FFFFFF' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.bg, borderBottomColor: palette.light }]}>
        <View style={styles.headerLeft}>
          <Ionicons 
            name={isMatch ? "checkmark-circle" : (type === 'LOST' ? "warning" : "hand-left")} 
            size={16} 
            color={palette.text} 
          />
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            {isMatch ? "Document Matché !" : (type === 'LOST' ? "Objet Perdu" : "Objet Trouvé")}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: palette.text }]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Doc Info */}
        <View style={styles.docInfo}>
          <View style={[styles.iconContainer, { backgroundColor: palette.bg }]}>
            <FontAwesome5 name={getIconName(docType)} size={20} color={palette.text} />
          </View>
          <View style={styles.docText}>
            <Text style={styles.docName}>{docType} — {ownerName || 'Inconnu'}</Text>
            <Text style={styles.docRef}>Réf: {reference}</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepsWrapper}>
          <View style={styles.stepLineContainer}>
             <View style={[styles.stepLine, { backgroundColor: palette.light }]} />
             <View style={[
               styles.stepLineActive, 
               { 
                 backgroundColor: palette.border, 
                 width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
               }
             ]} />
          </View>
          
          <View style={styles.stepsContainer}>
            {steps.map((step, i) => {
              const isActive = i <= currentStep - 1;
              const isCurrent = i === currentStep - 1;
              return (
                <View key={i} style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle, 
                    { 
                      backgroundColor: isActive ? palette.border : '#FFFFFF',
                      borderColor: isActive ? palette.border : palette.light,
                      borderWidth: isCurrent ? 2 : 1,
                    }
                  ]}>
                    {isActive && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                  </View>
                  <Text style={[
                    styles.stepLabel, 
                    { color: isActive ? palette.text : '#999', fontWeight: isCurrent ? 'bold' : 'normal' }
                  ]}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Match action button */}
        {status === 'MATCHED' && type === 'LOST' && (
          <TouchableOpacity
            style={styles.matchActionBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onRecuperer) onRecuperer();
              else if (declarationId) router.push(`/recuperer?id=${declarationId}`);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="handshake-outline" size={18} color="#FFFFFF" />
            <Text style={styles.matchActionText}>Récupérer</Text>
          </TouchableOpacity>
        )}
        {status === 'MATCHED' && type === 'FOUND' && (
          <TouchableOpacity
            style={styles.matchActionBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onRendre) onRendre();
              else if (declarationId) router.push(`/rendre?id=${declarationId}`);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="return-down-back-outline" size={18} color="#FFFFFF" />
            <Text style={styles.matchActionText}>Rendre</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const getIconName = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('cni')) return 'id-card';
  if (t.includes('pass')) return 'passport';
  if (t.includes('permis')) return 'car';
  return 'file-alt';
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docText: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  docRef: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  stepsWrapper: {
    marginTop: 8,
  },
  stepLineContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    height: 2,
  },
  stepLine: {
    height: 2,
    width: '100%',
  },
  stepLineActive: {
    height: 2,
    position: 'absolute',
    left: 0,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  stepLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  matchActionBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  matchActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
