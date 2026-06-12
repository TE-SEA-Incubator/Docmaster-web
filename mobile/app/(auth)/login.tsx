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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Navigation is handled by the protected-route effect in app/_layout.
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <Typography variant="h1">Bon retour</Typography>
            <Typography variant="body" className="mt-2 text-textMuted">
              Connectez-vous pour gérer vos documents.
            </Typography>
          </View>

          <View className="gap-4">
            <Input
              label="Email"
              placeholder="vous@exemple.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              error={error ?? undefined}
            />
          </View>

          <Button
            label="Se connecter"
            className="mt-6"
            loading={submitting}
            disabled={!email || !password}
            onPress={onSubmit}
          />

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-sm text-textMuted">Pas encore de compte ?</Text>
            <Link href="/(auth)/register" className="text-sm font-semibold text-green-dark">
              Créer un compte
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
