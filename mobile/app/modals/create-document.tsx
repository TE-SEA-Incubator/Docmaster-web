import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Input, Typography } from "@/components/ui";
import { useCreateDocument } from "@/hooks/useDocuments";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { colors } from "@/theme/colors";

/**
 * Concrete offline-first feature: create a document (POST /documents).
 *
 * - Online  -> the row appears, then reconciles with the server response.
 * - Offline -> the row appears as "En attente", the payload is queued,
 *              and it syncs automatically when the network returns.
 * Either way the user never sees a blocking error.
 */
export default function CreateDocumentModal() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { submit, isPending } = useCreateDocument();

  const [typeId, setTypeId] = useState("");
  const [numero, setNumero] = useState("");
  const [nomComplet, setNomComplet] = useState("");

  const onSave = async () => {
    try {
      const result = await submit({
        type_id: typeId,
        numero,
        nom_complet: nomComplet,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        result.queued ? "Enregistré hors-ligne" : "Document enregistré",
        result.queued
          ? "Votre document sera synchronisé dès le retour de la connexion."
          : "Votre document a bien été ajouté.",
      );
      router.back();
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erreur", "Impossible d'enregistrer le document.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bgMain">
      <View className="flex-row items-center justify-between px-6 py-4">
        <Typography variant="h3">Nouveau document</Typography>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textMain} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {!isOnline ? (
            <View className="mb-4 rounded-xl bg-green-light p-3">
              <Typography variant="caption" className="text-green-dark">
                Hors-ligne : l'enregistrement sera mis en file d'attente.
              </Typography>
            </View>
          ) : null}

          <View className="gap-4">
            <Input
              label="Type de document"
              placeholder="CNI, Passeport, Permis..."
              value={typeId}
              onChangeText={setTypeId}
            />
            <Input
              label="Numéro du document"
              value={numero}
              onChangeText={setNumero}
            />
            <Input
              label="Nom complet sur le document"
              value={nomComplet}
              onChangeText={setNomComplet}
            />
          </View>

          <Button
            label={isOnline ? "Enregistrer" : "Enregistrer (hors-ligne)"}
            className="mt-8"
            loading={isPending}
            disabled={!typeId || !numero}
            onPress={onSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
