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
    title: string;
    price_cents: number;
    listing_images: { url: string }[];
  };
};

type NavProp = NativeStackNavigationProp<{
  PaymentPortal: { priceCents: number; listingTitle: string };
}>;

const { width } = Dimensions.get("window");
const cardWidth = width / 2 - Spacing.lg - Spacing.xs;

export default function ListingCard({ listing }: ListingCardProps) {
  const navigation = useNavigation<NavProp>();
  const price = (listing.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  const imageUrl = listing.listing_images?.[0]?.url;

  return (
    <View style={styles.card}>
      <Image
        source={imageUrl ? { uri: imageUrl } : require("../../assets/icon.png")}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{price}</Text>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() =>
            navigation.navigate("PaymentPortal", {
              priceCents: listing.price_cents,
              listingTitle: listing.title,
            })
          }
        >
          <Text style={styles.buyButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: cardWidth,
  },
  info: {
    padding: Spacing.sm,
  },
  title: {
    ...Typography.bodyMedium,
    color: Colors.darkTeal,
    marginBottom: Spacing.xs,
    minHeight: 36, // for 2 lines of text
  },
  price: {
    ...Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.primary_blue,
    marginBottom: Spacing.sm,
  },
  buyButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.xs,
    alignItems: "center",
  },
  buyButtonText: {
    ...Typography.bodyMedium,
    color: Colors.white,
    fontWeight: "600",
  },
});
