import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Input, Typography } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function SearchScreen() {
  const [query, setQuery] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-bgMain" edges={["top"]}>
      <View className="px-6 pt-4">
        <Typography variant="h2" className="mb-4">
          Rechercher
        </Typography>
        <Input
          placeholder="Numéro, type de document..."
          value={query}
          onChangeText={setQuery}
          leftIcon={
            <Ionicons name="search" size={18} color={colors.textMuted} />
          }
        />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Typography variant="caption">
          Recherchez un document perdu ou trouvé.
        </Typography>
      </View>
    </SafeAreaView>
  );
}
