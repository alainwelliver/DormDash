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
  PaymentPortal: { priceCents: number; listingTitle: string };
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.md,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: "100%",
    height: cardWidth,
    backgroundColor: Colors.lightMint,
  },
  info: {
    padding: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937", // dark gray/black
    marginBottom: Spacing.xs,
    minHeight: 36,
    lineHeight: 22,
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280", // medium gray
    marginBottom: Spacing.md,
  },
});
