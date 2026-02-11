import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import {
  addSavedCartToCart,
  createSavedCartFromCurrentCart,
  deleteSavedCart,
  fetchSavedCarts,
  renameSavedCart,
  summarizeBatchResults,
} from "../lib/api/repeatBuying";
import type { SavedCart } from "../types/repeatBuying";
import { alert } from "../lib/utils/platform";

type SavedCartsNavigationProp = NativeStackNavigationProp<any>;

const summarizeMessage = (savedCartName: string, rows: any[]) => {
  const summary = summarizeBatchResults(rows);
  if (summary.total === 0 || summary.skipped === summary.total) {
    return `No active listings from "${savedCartName}" were available to add.`;
  }
  return [
    `${summary.added + summary.merged} item${summary.added + summary.merged === 1 ? "" : "s"} added to your cart.`,
    summary.skipped > 0
      ? `${summary.skipped} item${summary.skipped === 1 ? "" : "s"} skipped (unavailable/invalid).`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
};

const ProfileSavedCarts: React.FC = () => {
  const navigation = useNavigation<SavedCartsNavigationProp>();
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);

  const loadSavedCarts = useCallback(async () => {
    try {
      const rows = await fetchSavedCarts();
      setSavedCarts(rows);
    } catch (error) {
      console.error("Failed to load saved carts:", error);
      alert("Error", "Couldn't load your saved carts right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadSavedCarts();
    }, [loadSavedCarts]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadSavedCarts();
  };

  const handleApply = async (savedCart: SavedCart) => {
    if (applyingId) return;
    try {
      setApplyingId(savedCart.id);
      const rows = await addSavedCartToCart(savedCart.id);
      const message = summarizeMessage(savedCart.name, rows);
      alert("Added to cart", message, [
        { text: "Stay here", style: "cancel" },
        {
          text: "Open cart",
          onPress: () =>
            navigation.navigate("MainTabs", {
              screen: "CartTab",
            }),
        },
      ]);
      void loadSavedCarts();
    } catch (error) {
      console.error("Failed to apply saved cart:", error);
      alert("Error", "Couldn't add this routine to your cart.");
    } finally {
      setApplyingId(null);
    }
  };

  const handleCreate = async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      alert("Name required", "Please enter a name for this routine.");
      return;
    }

    try {
      setCreating(true);
      await createSavedCartFromCurrentCart(trimmed);
      setCreateModalVisible(false);
      setCreateName("");
      alert("Saved", `"${trimmed}" is now available in your routines.`);
      void loadSavedCarts();
    } catch (error: any) {
      console.error("Failed to save routine:", error);
      const message =
        typeof error?.message === "string" &&
        error.message.toLowerCase().includes("empty cart")
          ? "Your cart is empty. Add items first, then save."
          : "Couldn't save this routine right now.";
      alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenRename = (savedCart: SavedCart) => {
    setRenameTargetId(savedCart.id);
    setRenameName(savedCart.name);
    setRenameModalVisible(true);
  };

  const handleRename = async () => {
    if (!renameTargetId) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      alert("Name required", "Please enter a routine name.");
      return;
    }

    try {
      setRenaming(true);
      await renameSavedCart(renameTargetId, trimmed);
      setRenameModalVisible(false);
      setRenameTargetId(null);
      setRenameName("");
      void loadSavedCarts();
    } catch (error) {
      console.error("Failed to rename routine:", error);
      alert("Error", "Couldn't rename this routine.");
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = (savedCart: SavedCart) => {
    alert(
      "Delete routine?",
      `Remove "${savedCart.name}" from your saved routines?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(savedCart.id);
              await deleteSavedCart(savedCart.id);
              void loadSavedCarts();
            } catch (error) {
              console.error("Failed to delete routine:", error);
              alert("Error", "Couldn't delete this routine.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <ActivityIndicator
          style={{ marginTop: Spacing.xl }}
          color={Colors.primary_blue}
          size="large"
        />
      );
    }

    if (savedCarts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <RefreshCw color={Colors.lightGray} size={64} />
          <Text style={styles.emptyTitle}>No routines yet</Text>
          <Text style={styles.emptySubtitle}>
            Save your current cart as a routine so you can reorder in seconds.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {savedCarts.map((savedCart) => (
          <View key={savedCart.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{savedCart.name}</Text>
                <Text style={styles.cardMeta}>
                  {savedCart.item_count} item
                  {savedCart.item_count === 1 ? "" : "s"}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.loadButton,
                  applyingId === savedCart.id && styles.buttonDisabled,
                ]}
                onPress={() => void handleApply(savedCart)}
                disabled={applyingId === savedCart.id}
              >
                {applyingId === savedCart.id ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.loadButtonText}>Load</Text>
                )}
              </TouchableOpacity>
            </View>

            {savedCart.preview_titles.length > 0 && (
              <Text style={styles.previewText}>
                {savedCart.preview_titles.join(" • ")}
              </Text>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleOpenRename(savedCart)}
              >
                <Pencil color={Colors.darkTeal} size={14} />
                <Text style={styles.secondaryButtonText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleDelete(savedCart)}
                disabled={deletingId === savedCart.id}
              >
                {deletingId === savedCart.id ? (
                  <ActivityIndicator color={Colors.error} size="small" />
                ) : (
                  <>
                    <Trash2 color={Colors.error} size={14} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }, [applyingId, deletingId, loading, savedCarts]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.navigate("MainTabs", { screen: "ProfileTab" })
          }
        >
          <ChevronLeft color={Colors.darkTeal} size={30} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Routines</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Plus color={Colors.white} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.saveCurrentButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.saveCurrentButtonText}>Save current cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentBody}>{content}</View>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save current cart</Text>
            <TextInput
              style={styles.input}
              placeholder="Routine name (ex: Weekly Lunch)"
              value={createName}
              onChangeText={setCreateName}
              autoFocus
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setCreateModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => void handleCreate()}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename routine</Text>
            <TextInput
              style={styles.input}
              placeholder="Routine name"
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setRenameModalVisible(false)}
                disabled={renaming}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => void handleRename()}
                disabled={renaming}
              >
                {renaming ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_blue,
  },
  content: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  saveCurrentButton: {
    flex: 1,
    backgroundColor: Colors.primary_accent,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  saveCurrentButtonText: {
    fontSize: 14,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
  refreshButton: {
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "600",
  },
  contentBody: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Typography.bodySemibold.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  previewText: {
    marginTop: Spacing.xs,
    fontSize: 13,
    color: Colors.darkTeal,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  actionRow: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  loadButton: {
    minWidth: 78,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_blue,
  },
  loadButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontFamily: Typography.buttonText.fontFamily,
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  secondaryButtonText: {
    color: Colors.darkTeal,
    fontWeight: "600",
    fontFamily: Typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  deleteButtonText: {
    color: Colors.error,
    fontWeight: "700",
    fontFamily: Typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.darkTeal,
    fontSize: 15,
    fontFamily: Typography.bodyMedium.fontFamily,
    backgroundColor: Colors.lightGray,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  modalCancelButton: {
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
  },
  modalCancelText: {
    color: Colors.darkTeal,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Typography.bodyMedium.fontFamily,
  },
  modalPrimaryButton: {
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primary_blue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Typography.buttonText.fontFamily,
  },
});

export default ProfileSavedCarts;
