import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
} from "react-native";
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
};

type MainStackParamList = {
  ProductDetail: { listingId: number };
};

type NavProp = NativeStackNavigationProp<MainStackParamList>;

export default function ListingCard({
  listing,
  numColumns = 2,
}: ListingCardProps) {
  const navigation = useNavigation<NavProp>();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
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
});
