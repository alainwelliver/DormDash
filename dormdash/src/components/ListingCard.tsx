import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type ListingCardProps = {
  listing: {
    id: number;
    title: string;
    price_cents: number;
    listing_images: { url: string }[];
  };
};

type MainStackParamList = {
  ProductDetail: { listingId: number };
};

type NavProp = NativeStackNavigationProp<MainStackParamList>;

const { width } = Dimensions.get("window");
const cardWidth = width / 2 - Spacing.lg - Spacing.xs;

export default function ListingCard({ listing }: ListingCardProps) {
  const navigation = useNavigation<NavProp>();

  const price = (listing.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const imageUrl = listing.listing_images?.[0]?.url;

  const handleCardPress = () => {
    navigation.navigate("ProductDetail", { listingId: listing.id });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress}>
      {/* Image wrapper to apply shadow */}
      <View style={styles.imageWrapper}>
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
    width: cardWidth,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
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

  // NEW: Only the image gets depth (Option C)
  imageWrapper: {
    width: "100%",
    height: cardWidth * 0.72,
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
