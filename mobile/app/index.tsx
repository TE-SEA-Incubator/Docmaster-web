import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";

/**
 * Entry route. While the persisted token is being verified we show a
 * splash-like loader; afterwards we hand off to the correct route group.
 */
export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bgMain">
        <ActivityIndicator size="large" color={colors.greenDark} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />;
}
