import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Input, Typography } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    mot_de_passe: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...form, email: form.email.trim() });
    } catch {
      setError("Inscription impossible. Vérifiez vos informations.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    form.nom && form.prenom && form.email && form.mot_de_passe.length >= 6;

  return (
    <SafeAreaView className="flex-1 bg-bgMain">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Typography variant="h1">Créer un compte</Typography>
            <Typography variant="body" className="mt-2 text-textMuted">
              Rejoignez Docmaster en quelques secondes.
            </Typography>
          </View>

          <View className="gap-4">
            <Input label="Nom" value={form.nom} onChangeText={set("nom")} />
            <Input label="Prénom" value={form.prenom} onChangeText={set("prenom")} />
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={set("email")}
            />
            <Input
              label="Mot de passe"
              secureTextEntry
              hint="6 caractères minimum"
              value={form.mot_de_passe}
              onChangeText={set("mot_de_passe")}
              error={error ?? undefined}
            />
          </View>

          <Button
            label="S'inscrire"
            className="mt-6"
            loading={submitting}
            disabled={!canSubmit}
            onPress={onSubmit}
          />

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-sm text-textMuted">Déjà inscrit ?</Text>
            <Link href="/(auth)/login" className="text-sm font-semibold text-green-dark">
              Se connecter
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
