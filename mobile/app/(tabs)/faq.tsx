import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BottomTabInset } from '@/constants/theme';

const PRIMARY = '#F5A64B';
const GREEN_DARK = '#1E3A2F';

const FAQ_DATA = [
  {
    q: 'Comment déclarer un document perdu ?',
    r: 'Allez dans l\'onglet "Déclarer" et sélectionnez "Pour moi". Choisissez le type de document, remplissez les champs requis, puis soumettez. Vous recevrez un numéro de référence pour suivre votre déclaration.',
  },
  {
    q: 'Comment déclarer un document trouvé ?',
    r: 'Allez dans "J\'ai trouvé un document" dans l\'onglet "Trouvé". Prenez une photo du document et remplissez le formulaire. Le propriétaire sera notifié si le document est enregistré dans notre système.',
  },
  {
    q: 'Comment fonctionne le matching ?',
    r: 'Lorsqu\'une déclaration de perte et une déclaration de trouvaille correspondent (même type de document, même ville), notre système envoie une notification aux deux parties pour faciliter la restitution.',
  },
  {
    q: 'Puis-je suivre mes déclarations ?',
    r: 'Oui, rendez-vous dans l\'onglet "Déclarations" pour voir l\'historique et le statut de toutes vos déclarations (perte ou trouvaille).',
  },
  {
    q: 'Comment enregistrer un document dans mon coffre ?',
    r: 'Allez dans l\'onglet "Documents" et appuyez sur le bouton "+" pour scanner ou importer un document. Il sera sauvegardé sécurisé dans votre espace personnel.',
  },
  {
    q: 'Comment ajouter un appareil (téléphone, ordinateur) ?',
    r: 'Dans l\'onglet "Appareils", appuyez sur "Ajouter un appareil". Remplissez les informations (marque, modèle, numéro de série, etc.). En cas de perte, vous pourrez rapidement signaler l\'appareil comme perdu.',
  },
  {
    q: 'Comment modifier mes informations personnelles ?',
    r: 'Allez dans l\'onglet "Profil", appuyez sur l\'icône crayon en haut à droite pour modifier votre profil (nom, email, téléphone, mot de passe).',
  },
  {
    q: 'Comment parrainer des amis ?',
    r: 'Dans l\'onglet "Profil", sélectionnez "Parrainer des amis". Vous recevrez un code de parrainage à partager. Quand un ami s\'inscrit avec votre code, vous gagnez des points bonus.',
  },
  {
    q: 'Comment contacter le support ?',
    r: 'Envoyez-nous un email à support@docmaster.com ou utilisez l\'option "Signaler un bug" dans votre profil. Nous vous répondrons dans les plus brefs délais.',
  },
];

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => setOpenIndex(openIndex === idx ? null : idx);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={styles.headerTitle}>FAQ / Aide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="bulb-outline" size={28} color={PRIMARY} />
          </View>
          <Text style={styles.infoTitle}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.infoDesc}>
            Retrouvez ici les réponses aux questions les plus fréquentes.
          </Text>
        </View>

        {/* FAQ List */}
        <View style={styles.faqList}>
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => toggle(idx)}
                style={[styles.faqItem, isOpen && styles.faqItemOpen]}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </View>
                {isOpen && (
                  <View style={styles.faqAnswerWrap}>
                    <Text style={styles.faqAnswer}>{item.r}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Contact CTA */}
        <View style={styles.contactCta}>
          <View style={styles.contactIconWrap}>
            <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.contactTitle}>Vous n'avez pas trouvé votre réponse ?</Text>
          <Text style={styles.contactDesc}>
            Notre équipe support est là pour vous aider.
          </Text>
          <Pressable
            style={styles.contactBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={GREEN_DARK} />
            <Text style={styles.contactBtnText}>Nous contacter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
  },
  faqList: {
    gap: 10,
    marginBottom: 24,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  faqItemOpen: {
    borderColor: '#E5E7EB',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    lineHeight: 20,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  faqAnswer: {
    fontSize: 13.5,
    color: '#6B7280',
    lineHeight: 21,
  },
  contactCta: {
    backgroundColor: GREEN_DARK,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  contactDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: GREEN_DARK,
  },
});
