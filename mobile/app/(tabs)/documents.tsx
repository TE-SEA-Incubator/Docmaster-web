import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DocumentCardSkeleton } from "@/components/Skeleton";
import { Badge, Typography } from "@/components/ui";
import { useDocuments } from "@/hooks/useDocuments";
import { colors } from "@/theme/colors";
import type { Document } from "@/types/api";

function DocumentRow({ doc }: { doc: Document }) {
  const isPending = doc.id.startsWith("temp-");
  return (
    <View className="mb-3 rounded-2xl border border-borderMain bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Typography variant="label" numberOfLines={1} className="flex-1">
          {doc.nom_sur_doc ?? doc.numero_doc ?? "Document"}
        </Typography>
        {isPending ? (
          <Badge label="En attente" tone="warning" />
        ) : doc.is_verified ? (
          <Badge label="Vérifié" tone="success" />
        ) : (
          <Badge label="Non vérifié" tone="neutral" />
        )}
      </View>
      <Typography variant="caption" className="mt-1">
        {doc.numero_doc ?? "—"}
      </Typography>
    </View>
  );
}

export default function DocumentsScreen() {
  const { data, isLoading, isRefetching, refetch } = useDocuments();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bgMain" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 pb-4 pt-4">
        <Typography variant="h2">Mes documents</Typography>
        <Pressable
          hitSlop={10}
          onPress={() => router.push("/modals/create-document")}
          className="h-10 w-10 items-center justify-center rounded-full bg-green-dark active:opacity-80"
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="px-6">
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
        </View>
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(item: Document) => item.id}
          estimatedItemSize={84}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }: { item: Document }) => <DocumentRow doc={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.greenDark}
            />
          }
          ListEmptyComponent={
            <View className="items-center pt-20">
              <Ionicons
                name="document-text-outline"
                size={48}
                color={colors.textMuted}
              />
              <Typography variant="body" className="mt-3 text-textMuted">
                Aucun document pour le moment.
              </Typography>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
