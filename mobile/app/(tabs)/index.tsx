import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Card, Typography } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";
import { colors } from "@/theme/colors";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: documents } = useDocuments();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bgMain" edges={["top"]}>
      <ScrollView contentContainerClassName="px-6 pb-10 pt-4">
        <Typography variant="caption">Bonjour</Typography>
        <Typography variant="h1">{user?.prenom ?? "Bienvenue"}</Typography>

        <View className="mt-6 flex-row gap-3">
          <Card className="flex-1">
            <Typography variant="caption">Documents</Typography>
            <Typography variant="h2">{documents?.length ?? 0}</Typography>
          </Card>
          <Card className="flex-1">
            <Typography variant="caption">Solde</Typography>
            <Typography variant="h2">
              {user?.wallet_balance ?? 0} {user?.currency ?? "XAF"}
            </Typography>
          </Card>
        </View>

        <Typography variant="h3" className="mb-3 mt-8">
          Actions rapides
        </Typography>

        <Pressable
          onPress={() => router.push("/modals/create-document")}
          className="flex-row items-center justify-between rounded-2xl border border-borderMain bg-surface p-4 active:opacity-80"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-light">
              <Ionicons name="add" size={22} color={colors.greenDark} />
            </View>
            <View>
              <Typography variant="label">Ajouter un document</Typography>
              <Typography variant="caption">Enregistrez une nouvelle pièce</Typography>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <View className="mt-3 flex-row items-center justify-between">
          <Badge label="Offline-first" tone="success" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
