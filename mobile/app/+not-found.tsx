import { Link, Stack } from "expo-router";
import { View } from "react-native";

import { Typography } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Introuvable" }} />
      <View className="flex-1 items-center justify-center gap-4 bg-bgMain px-6">
        <Typography variant="h2">Page introuvable</Typography>
        <Link href="/" className="text-base font-semibold text-green-dark">
          Retour à l'accueil
        </Link>
      </View>
    </>
  );
}
