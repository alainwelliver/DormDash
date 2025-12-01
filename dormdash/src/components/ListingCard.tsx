import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
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

type ListingCardProps = {
  listing: {
    id: number;
    title: string;
    price_cents: number;
    listing_images: { url: string; sort_order?: number }[];
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

  const handleCardPress = () => {
    navigation.navigate("ProductDetail", { listingId: listing.id });
  };

  const webCardStyle = isWeb
    ? {
        cursor: "pointer" as const,
      }
    : {};

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }, webCardStyle]}
      onPress={handleCardPress}
      activeOpacity={isWeb ? 0.8 : 0.7}
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
      </View>

      <View style={styles.info}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>

        <Text style={styles.price}>{price}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    paddingBottom: Spacing.sm,

    // subtle structure - very premium
    borderWidth: 1,
    borderColor: Colors.lightGray,

    // subtle overall card shadow
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
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

  info: {
    paddingHorizontal: Spacing.md,
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.darkTeal,
    lineHeight: 20,
    marginBottom: 2,
  },

  price: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary_green,
  },
});
