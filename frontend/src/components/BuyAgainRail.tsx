import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Plus, Check } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import OptimizedImage from "./OptimizedImage";
import { supabase } from "../lib/supabase";
import { addItemsToCartBatch } from "../lib/api/repeatBuying";
import { alert } from "../lib/utils/platform";

type RailListing = {
  id: number;
  title: string;
  price_cents: number;
  listing_images?: Array<{ url: string; sort_order?: number }>;
  categories?: { name: string } | null;
};

type MainStackParamList = {
  ProductDetail: { listingId: number };
};

interface BuyAgainRailProps {
  title?: string;
  subtitle?: string;
  listings: RailListing[];
  loading?: boolean;
}

const BuyAgainRail: React.FC<BuyAgainRailProps> = ({
  title = "Buy Again",
  subtitle = "Reorder your frequent picks in one tap",
  listings,
  loading = false,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [addingListingId, setAddingListingId] = useState<number | null>(null);
  const [addedListingId, setAddedListingId] = useState<number | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardWidth = useMemo(() => {
    if (Platform.OS === "web") return 220;
    if (width >= 430) return 180;
    return 164;
  }, [width]);

  const cleanupTimer = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const handleAddToCart = async (listingId: number) => {
    if (addingListingId) return;

    try {
      setAddingListingId(listingId);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        alert("Login Required", "You must be logged in to add items.");
        return;
      }

      await addItemsToCartBatch([{ listing_id: listingId, quantity: 1 }]);
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      setAddedListingId(listingId);
      cleanupTimer();
      feedbackTimerRef.current = setTimeout(() => {
        setAddedListingId(null);
      }, 850);
    } catch (error) {
      console.error("Buy-again add to cart failed:", error);
      alert("Error", "Could not add this item to cart.");
    } finally {
      setAddingListingId(null);
    }
  };

  if (!loading && listings.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {loading
          ? [0, 1, 2].map((key) => (
              <View
                key={key}
                style={[styles.skeletonCard, { width: cardWidth }]}
              />
            ))
          : listings.map((listing) => {
              const sorted = [...(listing.listing_images || [])].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
              );
              const imageUri = sorted[0]?.url;
              const isAdding = addingListingId === listing.id;
              const isAdded = addedListingId === listing.id;

              return (
                <TouchableOpacity
                  key={listing.id}
                  style={[styles.card, { width: cardWidth }]}
                  onPress={() =>
                    navigation.navigate("ProductDetail", {
                      listingId: listing.id,
                    })
                  }
                  activeOpacity={0.9}
                >
                  <OptimizedImage
                    uri={imageUri}
                    fallback={require("../../assets/icon.png")}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.cardBody}>
                    {!!listing.categories?.name && (
                      <Text style={styles.category} numberOfLines={1}>
                        {listing.categories.name}
                      </Text>
                    )}
                    <Text style={styles.name} numberOfLines={2}>
                      {listing.title}
                    </Text>
                    <View style={styles.bottomRow}>
                      <Text style={styles.price}>
                        {(listing.price_cents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          isAdded && styles.addButtonAdded,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          void handleAddToCart(listing.id);
                        }}
                        disabled={isAdding}
                      >
                        {isAdding ? (
                          <ActivityIndicator
                            color={Colors.white}
                            size="small"
                          />
                        ) : isAdded ? (
                          <Check color={Colors.white} size={16} />
                        ) : (
                          <Plus color={Colors.white} size={16} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: Spacing.sm,
  },
  headerRow: {
    gap: 2,
  },
  title: {
    ...Typography.bodySemibold,
    color: Colors.darkTeal,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
  },
  row: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  skeletonCard: {
    height: 168,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    opacity: 0.55,
  },
  card: {
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  image: {
    width: "100%",
    height: 84,
  },
  cardBody: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 82,
  },
  category: {
    ...Typography.bodySmall,
    color: Colors.primary_accent,
    marginBottom: 2,
  },
  name: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    fontWeight: "700",
    minHeight: 34,
  },
  bottomRow: {
    marginTop: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    ...Typography.bodySemibold,
    color: Colors.primary_blue,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_blue,
  },
  addButtonAdded: {
    backgroundColor: Colors.primary_green,
  },
});

export default BuyAgainRail;
