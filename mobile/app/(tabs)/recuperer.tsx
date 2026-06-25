import React, { useEffect, useState, useRef } from 'react';
import {
  View, ScrollView, Pressable, ActivityIndicator, Alert,
  StyleSheet, Text, Image, Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { declarationsService } from '@/core/api/declarationsService';
import { useThemeColors } from '@/hooks/useThemeColors';
import PaymentModal from '@/components/PaymentModal';

type Status = 'SEARCHING' | 'MATCHED' | 'PAYMENT_PENDING' | 'PAYMENT_DONE' | 'RETURNED' | 'CLAIMED' | 'CANCELLED';

function stepFromStatus(status: string): number {
  const s = (status || '').toUpperCase();
  if (['RETURNED', 'CLAIMED'].includes(s)) return 3;
  if (['PAYMENT_DONE', 'PAID'].includes(s)) return 2;
  if (s === 'PAYMENT_PENDING') return 2;
  if (s === 'MATCHED') return 1;
  return 0;
}

function fmt(s?: string): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return s; }
}

const POLL_MS = 5000;

export default function RecupererScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [loading, setLoading] = useState(true);
  const [dec, setDec] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blurAnim = useRef(new Animated.Value(0)).current;

  const load = async () => {
    if (!id) return;
    try {
      const res = await declarationsService.getById(id);
      if (res.success && res.data) {
        const d = res.data;
        setDec(d);
        const s = stepFromStatus(d.status);
        setStep(s);
        const paid = s >= 2;
        if (paid) {
          setRecoveryCode((d as any).claim?.verification_code || d.reference || '');
          Animated.timing(blurAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible de charger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  // Poll payment status after opening modal
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await declarationsService.checkPaymentStatus(id!);
        if (res.success && (res as any).data?.paid) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          await load();
          setShowPayment(false);
        }
      } catch {}
    }, POLL_MS);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    if (pollRef.current) clearInterval(pollRef.current);
    await load();
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!dec) {
    return (
      <SafeAreaView style={[s.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>Déclaration introuvable</Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={[s.btn, { backgroundColor: colors.primary }]}>
          <Text style={s.btnTxt}>Retour</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const paid = step >= 2;
  const done = step >= 3;
  const hasFinder = !!(dec.counterPart?.nom);
  const photoUri = dec.photo_recto || dec.photo_verso || null;
  const amount = dec.docTypeInfo?.prix_retrouvaille || dec.recompense_montant || 5000;
  const finder = dec.counterPart;

  const timelineSteps = [
    { label: 'Document déclaré', done: true, date: fmt(dec.created_at) },
    { label: 'Correspondance trouvée', done: step >= 1, date: dec.matched_at ? fmt(dec.matched_at) : '—' },
    { label: 'Paiement & Récupération', done: paid, date: paid ? 'Effectué' : 'À faire' },
    { label: 'Document récupéré', done, date: done ? fmt(dec.returned_at) : 'À venir' },
  ];

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={[s.iconBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[s.title, { color: colors.text }]}>Récupérer mon document</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Status banner ── */}
        <View style={[s.banner, { backgroundColor: colors.greenDark }]}>
          <View style={s.bannerRow}>
            <View style={s.bannerIconWrap}>
              <Ionicons name={done ? 'checkmark-circle' : step >= 1 ? 'hand-left' : 'hourglass'} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.bannerEyebrow}>Statut de la récupération</Text>
              <Text style={s.bannerMain}>
                {done ? 'Document récupéré ✓' : paid ? 'Code de retrait disponible' : step >= 1 ? 'Correspondance trouvée' : 'En recherche…'}
              </Text>
            </View>
            <Text style={s.bannerPct}>{Math.round((step / 3) * 100)}%</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${Math.round((step / 3) * 100)}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* ── Timeline ── */}
        <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginTop: 16 }]}>
          <View style={s.cardTop}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Suivi #{(id || '').slice(0, 8).toUpperCase()}</Text>
            <View style={[s.pill, { backgroundColor: colors.successBg, borderColor: '#bbf7d0' }]}>
              <View style={[s.pillDot, { backgroundColor: colors.success }]} />
              <Text style={[s.pillTxt, { color: colors.greenDark }]}>ACTIF</Text>
            </View>
          </View>
          {timelineSteps.map((ts, idx) => (
            <View key={idx} style={s.tsRow}>
              {idx < 3 && <View style={[s.tsLine, { backgroundColor: ts.done ? colors.success : colors.border }]} />}
              <View style={[s.tsDot, {
                backgroundColor: ts.done ? colors.success : colors.backgroundElement,
                borderWidth: ts.done ? 0 : 2, borderColor: colors.border,
              }]}>
                <Ionicons name={ts.done ? 'checkmark' : 'ellipse'} size={10} color={ts.done ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.tsLabel, { color: ts.done ? colors.text : colors.textSecondary }]}>{ts.label}</Text>
                <Text style={[s.tsDate, { color: colors.textSecondary }]}>{ts.date}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Document card (photo + infos) ── */}
        <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginTop: 16, overflow: 'hidden' }]}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary, marginBottom: 14 }]}>Pièce maîtresse</Text>

          {/* Photo avec overlay flou si pas payé */}
          <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {photoUri ? (
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: 180, borderRadius: 14 }}
                  resizeMode="cover"
                  blurRadius={paid ? 0 : 18}
                />
                {!paid && (
                  <View style={s.lockedOverlay}>
                    <View style={[s.lockBadge, { backgroundColor: colors.backgroundElement }]}>
                      <Ionicons name="lock-closed" size={22} color={colors.primary} />
                      <Text style={[s.lockTxt, { color: colors.text }]}>Photo disponible après paiement</Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={[s.photoPlaceholder, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
                <Text style={[{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }]}>Pas de photo disponible</Text>
              </View>
            )}
          </View>

          {/* Infos doc */}
          <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="card-outline" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Type</Text>
            <Text style={[s.infoValue, { color: colors.text }]}>
              {dec.docTypeInfo?.nom || dec.doc_type || dec.document_type || 'Document'}
            </Text>
          </View>
          {/* Nom sur le document */}
          {(dec.nom_complet || dec.owner_name || dec.nom_owner) && (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Titulaire</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>
                {dec.nom_complet || dec.owner_name || `${dec.prenom_owner || ''} ${dec.nom_owner || ''}`.trim()}
              </Text>
            </View>
          )}
          {dec.document_number || dec.numero_document ? (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="barcode-outline" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Numéro</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>N°{dec.document_number || dec.numero_document}</Text>
            </View>
          ) : null}
          {/* Date de perte */}
          {(dec.date_perte || dec.created_at) && (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Perdu le</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>{fmt(dec.date_perte || dec.created_at)}</Text>
            </View>
          )}
          {(dec.ville || dec.lieu_perte) && (
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Lieu</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>{dec.ville || dec.lieu_perte}</Text>
            </View>
          )}
        </View>

        {/* ── Trouveur (bloqué si pas payé) ── */}
        {step >= 1 && (
          <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginTop: 16, overflow: 'hidden' }]}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary, marginBottom: 14 }]}>Informations du trouveur</Text>
            {paid && hasFinder ? (
              <View style={[s.finderCard, { backgroundColor: colors.successBg, borderColor: '#bbf7d0' }]}>
                <View style={[s.finderAvatar, { backgroundColor: colors.greenDark }]}>
                  <Ionicons name="person" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[s.finderName, { color: colors.greenDark }]}>{finder.nom} {finder.prenom}</Text>
                  {finder.telephone && (
                    <Text style={[s.finderPhone, { color: colors.success }]}>📞 {finder.telephone}</Text>
                  )}
                </View>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
            ) : (
              <View style={[s.lockedCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                <Text style={[s.lockedTxt, { color: colors.textSecondary }]}>Payez pour obtenir les coordonnées du trouveur</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Code de retrait (après paiement) ── */}
        {paid && recoveryCode ? (
          <View style={[s.card, { backgroundColor: colors.successBg, borderColor: '#bbf7d0', marginTop: 16, alignItems: 'center' }]}>
            <Ionicons name="key" size={28} color={colors.greenDark} style={{ marginBottom: 10 }} />
            <Text style={[s.sectionLabel, { color: colors.greenDark, marginBottom: 8 }]}>Votre code de retrait</Text>
            <View style={[s.codeBox, { backgroundColor: '#fff', borderColor: '#bbf7d0' }]}>
              <Text style={[s.codeTxt, { color: colors.greenDark }]}>{recoveryCode}</Text>
            </View>
            <Text style={[{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 18 }]}>
              Présentez ce code au trouveur pour récupérer votre document.
            </Text>
          </View>
        ) : null}

        {/* ── Succès ── */}
        {done && (
          <View style={[s.card, { backgroundColor: colors.successBg, borderColor: '#bbf7d0', marginTop: 16, alignItems: 'center' }]}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} style={{ marginBottom: 10 }} />
            <Text style={[s.sectionTitle, { color: colors.greenDark }]}>Document récupéré !</Text>
            <Text style={[{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6 }]}>
              Votre document a bien été récupéré. Merci d'utiliser DocMaster.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky pay button (si pas encore payé et match trouvé) ── */}
      {step >= 1 && !paid && (
        <View style={[s.stickyBar, {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 8,
        }]}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={[s.stickyDoc, { color: colors.text }]} numberOfLines={1}>
              {dec.doc_type || 'Document'}{dec.document_number ? ` · N°${dec.document_number}` : ''}
            </Text>
            <Text style={[s.stickyAmount, { color: colors.primary }]}>
              {Number(amount).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <Pressable
            onPress={() => { setShowPayment(true); startPolling(); }}
            style={[s.payBtn, { backgroundColor: colors.greenDark }]}
          >
            <Ionicons name="lock-open-outline" size={18} color="#fff" />
            <Text style={s.payBtnTxt}>Payer & Récupérer</Text>
          </Pressable>
        </View>
      )}

      {/* ── Payment Modal ── */}
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onPaymentSuccess={handlePaymentSuccess}
        purpose="document"
        amount={Number(amount)}
        label={`Récupération : ${dec.doc_type || 'Document'}`}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Banner
  banner: { borderRadius: 20, padding: 18 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  bannerIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  bannerEyebrow: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  bannerMain: { fontSize: 14, fontWeight: '700', color: '#fff' },
  bannerPct: { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.16)', marginLeft: 8 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  // Card
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, gap: 5 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillTxt: { fontSize: 10, fontWeight: '700' },
  // Timeline
  tsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, position: 'relative' },
  tsLine: { position: 'absolute', left: 11, top: 24, width: 2, height: '100%' },
  tsDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tsLabel: { fontSize: 13, fontWeight: '600' },
  tsDate: { fontSize: 11, marginTop: 2 },
  // Info rows
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12, fontWeight: '600', width: 70 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1 },
  // Photo
  lockedOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  lockBadge: { alignItems: 'center', padding: 16, borderRadius: 16, gap: 8 },
  lockTxt: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  photoPlaceholder: { height: 140, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  // Finder
  finderCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  finderAvatar: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  finderName: { fontSize: 14, fontWeight: '700' },
  finderPhone: { fontSize: 12, marginTop: 3 },
  lockedCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  lockedTxt: { fontSize: 13, fontWeight: '500', flex: 1 },
  // Code
  codeBox: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  codeTxt: { fontSize: 32, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  // Sticky bar
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  stickyDoc: { fontSize: 13, fontWeight: '600' },
  stickyAmount: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16 },
  payBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
