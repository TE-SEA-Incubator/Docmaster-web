import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Typography } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-bgMain" edges={["top"]}>
      <ScrollView contentContainerClassName="px-6 pb-10 pt-4">
        <Typography variant="h2" className="mb-6">
          Profil
        </Typography>

        <Card>
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-green-dark">
              <Typography variant="h3" className="text-white">
                {(user?.prenom?.[0] ?? "D") + (user?.nom?.[0] ?? "M")}
              </Typography>
            </View>
            <View className="flex-1">
              <Typography variant="label">
                {user?.prenom} {user?.nom}
              </Typography>
              <Typography variant="caption">{user?.email}</Typography>
            </View>
          </View>
        </Card>

        <Card className="mt-4">
          <Typography variant="caption">Téléphone</Typography>
          <Typography variant="body">{user?.telephone ?? "—"}</Typography>
          <View className="my-3 h-px bg-borderMain" />
          <Typography variant="caption">Ville</Typography>
          <Typography variant="body">{user?.ville ?? "—"}</Typography>
        </Card>

        <Button
          label="Se déconnecter"
          variant="danger"
          className="mt-8"
          onPress={logout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
