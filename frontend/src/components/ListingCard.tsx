import React, { useRef, useState, useEffect, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Check,
  Clock,
  Star,
} from "lucide-react-native";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
  Shadows,
} from "../assets/styles";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Badge from "./Badge";
import OptimizedImage from "./OptimizedImage";
import { supabase } from "../lib/supabase";
import { alert } from "../lib/utils/platform";
import { useQueryClient } from "@tanstack/react-query";

type ListingCardProps = {
  listing: {
    id: number;
    title: string;
    price_cents: number;
    listing_images: { url: string; sort_order?: number }[];
    created_at?: string;
    categories?: { name: string } | null;
  };
  numColumns?: number;
  showMenu?: boolean;
  onEdit?: (listingId: number) => void;
  onDelete?: (listingId: number) => void;
};

type MainStackParamList = {
  ProductDetail: { listingId: number };
};

type NavProp = NativeStackNavigationProp<MainStackParamList>;

function ListingCardComponent({
  listing,
  numColumns = 2,
  showMenu = false,
  onEdit,
  onDelete,
}: ListingCardProps) {
  const navigation = useNavigation<NavProp>();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const getCardWidth = () => {
    const containerWidth = Math.min(windowWidth, WebLayout.maxContentWidth);
    const totalGap = (numColumns - 1) * Spacing.lg;
    const horizontalPadding = Spacing.lg * 2;
    const availableWidth = containerWidth - horizontalPadding - totalGap;
    return Math.floor(availableWidth / numColumns);
  };

  const cardWidth = getCardWidth();
  const cardHeight = cardWidth * 1.25; // Taller aspect ratio for "poster" look

  const price = (listing.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const sortedImages = [...(listing.listing_images || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const imageUrl = sortedImages[0]?.url;

  const isNew = () => {
    if (!listing.created_at) return false;
    const createdDate = new Date(listing.created_at);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  const handleCardPress = () => {
    navigation.navigate("ProductDetail", { listingId: listing.id });
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handleMenuPress = (e: any) => {
    e.stopPropagation();
    setMenuVisible(true);
  };

  const handleEditPress = () => {
    setMenuVisible(false);
    onEdit?.(listing.id);
  };

  const handleDeletePress = () => {
    setMenuVisible(false);
    onDelete?.(listing.id);
  };

  useEffect(() => {
    return () => {
      if (addFeedbackTimeoutRef.current) {
        clearTimeout(addFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleQuickAdd = async (e: any) => {
    e.stopPropagation();
    if (addingToCart) return;

    try {
      setAddingToCart(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        alert("Login Required", "You must be logged in to add to cart.");
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("listing_id", listing.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            listing_id: listing.id,
            quantity: 1,
          });
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      setJustAdded(true);
      if (addFeedbackTimeoutRef.current) {
        clearTimeout(addFeedbackTimeoutRef.current);
      }
      addFeedbackTimeoutRef.current = setTimeout(() => {
        setJustAdded(false);
      }, 900);
    } catch (error) {
      console.error("Quick add to cart error:", error);
      alert("Error", "Could not add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.cardContainer, { width: cardWidth }]}
      onPress={handleCardPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.card,
          { height: cardHeight, transform: [{ scale: scaleAnim }] },
          isWeb && { cursor: "pointer" },
        ]}
      >
        {/* Full Card Image */}
        <OptimizedImage
          uri={imageUrl}
          fallback={require("../../assets/icon.png")}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Top Badges */}
        <View style={styles.topRow}>
          {isNew() ? (
            <View style={styles.glassBadge}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          ) : (
            <View />
          )}

          {/* Price Pill */}
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{price}</Text>
          </View>
        </View>

        {/* Bottom Info - Dynamic Background */}
        <View style={styles.contentOverlay}>
          {listing.categories?.name && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text style={styles.categoryText}>{listing.categories.name}</Text>
            </View>
          )}
          <Text numberOfLines={2} style={styles.titleText}>
            {listing.title}
          </Text>
        </View>

        {/* Quick Action Button (Bottom Right) */}
        {!showMenu && (
          <TouchableOpacity
            style={[
              styles.fab,
              (addingToCart || justAdded) && styles.fabDisabled,
              justAdded && styles.fabAdded,
            ]}
            onPress={handleQuickAdd}
            disabled={addingToCart}
          >
            {justAdded ? (
              <Check color={Colors.white} size={20} strokeWidth={3} />
            ) : (
              <Plus color={Colors.white} size={20} strokeWidth={3} />
            )}
          </TouchableOpacity>
        )}

        {/* Menu Button (if owner) */}
        {showMenu && (
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <MoreVertical size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Menu Modal (Kept same logic) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditPress}>
              <Pencil size={20} color={Colors.darkTeal} />
              <Text style={styles.menuItemText}>Edit Listing</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeletePress}
            >
              <Trash2 size={20} color={Colors.error || "#E74C3C"} />
              <Text style={[styles.menuItemText, styles.deleteText]}>
                Delete Listing
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: Spacing.xl,
  },
  card: {
    width: "100%",
    borderRadius: 24, // Large rounded corners
    overflow: "hidden",
    backgroundColor: Colors.lightGray,
    ...Shadows.md,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topRow: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  glassBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pricePill: {
    backgroundColor: Colors.white, // Solid white for contrast
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    ...Shadows.sm,
  },
  priceText: {
    color: Colors.primary_accent,
    fontWeight: "800",
    fontSize: 14,
  },
  contentOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingRight: 60, // Avoid overlap with FAB
    backgroundColor: "rgba(0,0,0,0.5)", // Dynamic background
    borderTopRightRadius: 24, // Visual flair
  },
  categoryText: {
    color: Colors.primary_green, // Use brand color for accent
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  titleText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary_accent,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.glow,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabAdded: {
    backgroundColor: Colors.primary_green,
  },
  menuButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    minWidth: 200,
    paddingVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.darkTeal,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.md,
  },
  deleteText: {
    color: Colors.error || "#E74C3C",
  },
});

const ListingCard = memo(ListingCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.listing.id === nextProps.listing.id &&
    prevProps.listing.title === nextProps.listing.title &&
    prevProps.listing.price_cents === nextProps.listing.price_cents &&
    prevProps.numColumns === nextProps.numColumns &&
    prevProps.showMenu === nextProps.showMenu
  );
});

export default ListingCard;
