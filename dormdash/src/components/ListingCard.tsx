import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { Icon } from "@rneui/themed";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
} from "../assets/styles";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Badge from "./Badge";

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

export default function ListingCard({
  listing,
  numColumns = 2,
  showMenu = false,
  onEdit,
  onDelete,
}: ListingCardProps) {
  const navigation = useNavigation<NavProp>();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [menuVisible, setMenuVisible] = useState(false);

  // Calculate card width based on number of columns and container width
  const getCardWidth = () => {
    const containerWidth = Math.min(windowWidth, WebLayout.maxContentWidth);
    const totalGap = (numColumns - 1) * Spacing.lg;
    const horizontalPadding = Spacing.lg * 2;
    const availableWidth = containerWidth - horizontalPadding - totalGap;
    return Math.floor(availableWidth / numColumns);
  };

  const cardWidth = getCardWidth();

  const price = (listing.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  // Sort images by sort_order and get the first one
  const sortedImages = [...(listing.listing_images || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const imageUrl = sortedImages[0]?.url;

  // Check if listing is new (created within last 24 hours)
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
      toValue: 0.97,
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

  const webCardStyle = isWeb
    ? {
        cursor: "pointer" as const,
      }
    : {};

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
          webCardStyle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Image wrapper to apply shadow */}
        <View style={[styles.imageWrapper, { height: cardWidth * 0.72 }]}>
          <Image
            source={
              imageUrl ? { uri: imageUrl } : require("../../assets/icon.png")
            }
            style={styles.image}
            resizeMode="cover"
          />
          {/* New badge */}
          {isNew() && (
            <View style={styles.badgeContainer}>
              <Badge label="New" variant="new" size="sm" />
            </View>
          )}
          {/* Menu button */}
          {showMenu && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name="dots-three-vertical"
                type="entypo"
                size={16}
                color={Colors.white}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.info}>
          {/* Category tag */}
          {listing.categories?.name && (
            <Text style={styles.category} numberOfLines={1}>
              {listing.categories.name}
            </Text>
          )}
          <Text numberOfLines={2} style={styles.title}>
            {listing.title}
          </Text>

          <Text style={styles.price}>{price}</Text>
        </View>
      </Animated.View>

      {/* Menu Modal */}
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
              <Icon
                name="pencil"
                type="material-community"
                size={20}
                color={Colors.darkTeal}
              />
              <Text style={styles.menuItemText}>Edit Listing</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeletePress}
            >
              <Icon
                name="delete"
                type="material-community"
                size={20}
                color={Colors.error || "#E74C3C"}
              />
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
    // Container doesn't need styling, just holds animated view
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    paddingBottom: Spacing.sm,

    // subtle structure - very premium
    borderWidth: 1,
    borderColor: Colors.lightGray,

    // subtle overall card shadow
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Only the image gets depth
  imageWrapper: {
    width: "100%",
    borderRadius: BorderRadius.small,
    overflow: "hidden",

    backgroundColor: Colors.lightMint,

    // beautiful soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,

    marginBottom: Spacing.sm,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.small,
  },

  badgeContainer: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
  },

  info: {
    paddingHorizontal: Spacing.md,
  },

  category: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.darkTeal,
    lineHeight: 20,
    marginBottom: 4,
  },

  price: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary_green,
  },

  menuButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
