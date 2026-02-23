import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Plus, Check, ChevronRight, ChevronsUpDown } from "lucide-react-native";
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
  defaultCollapsed?: boolean;
  compactItemLimit?: number;
}

const BuyAgainRail: React.FC<BuyAgainRailProps> = ({
  title = "Buy Again",
  subtitle = "Reorder your frequent picks in one tap",
  listings,
  loading = false,
  defaultCollapsed = true,
  compactItemLimit = 8,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [addingListingId, setAddingListingId] = useState<number | null>(null);
  const [addedListingId, setAddedListingId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expandedCardWidth = useMemo(() => {
    if (Platform.OS === "web") return 188;
    if (width >= 430) return 168;
    return 154;
  }, [width]);

  const compactListings = useMemo(() => {
    if (!collapsed) return listings;
    return listings.slice(0, compactItemLimit);
  }, [collapsed, listings, compactItemLimit]);

  const shouldShowExpandToggle =
    listings.length > compactItemLimit || !collapsed;

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const cleanupTimer = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  useEffect(() => cleanupTimer, []);

  const handleGoToDetails = (listingId: number) => {
    navigation.navigate("ProductDetail", { listingId });
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
      <View style={styles.headerRow} testID="buy-again-header">
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{title}</Text>
          {!collapsed && !!subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>

        {!loading && shouldShowExpandToggle && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setCollapsed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={
              collapsed ? "Expand buy again" : "Collapse buy again"
            }
            testID="buy-again-toggle"
          >
            <Text style={styles.expandButtonText}>
              {collapsed ? "See all" : "Collapse"}
            </Text>
            <ChevronsUpDown color={Colors.primary_blue} size={14} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          collapsed ? styles.compactRow : styles.expandedRow
        }
        testID={
          collapsed ? "buy-again-collapsed-row" : "buy-again-expanded-row"
        }
      >
        {loading
          ? [0, 1, 2, 3].map((key) => (
              <View
                key={key}
                style={
                  collapsed ? styles.compactSkeleton : styles.expandedSkeleton
                }
              />
            ))
          : compactListings.map((listing) => {
              const sorted = [...(listing.listing_images || [])].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
              );
              const imageUri = sorted[0]?.url;
              const isAdding = addingListingId === listing.id;
              const isAdded = addedListingId === listing.id;

              return (
                <View
                  key={listing.id}
                  style={
                    collapsed
                      ? styles.compactChip
                      : [styles.expandedCard, { width: expandedCardWidth }]
                  }
                >
                  {collapsed ? (
                    <TouchableOpacity
                      style={styles.compactMain}
                      onPress={() => void handleAddToCart(listing.id)}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={`Quick add ${listing.title}`}
                      disabled={isAdding}
                    >
                      <View style={styles.compactTextWrap}>
                        <Text style={styles.compactTitle} numberOfLines={1}>
                          {listing.title}
                        </Text>
                        <Text style={styles.compactPrice}>
                          {formatPrice(listing.price_cents)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBubble,
                          isAdded && styles.statusBubbleAdded,
                        ]}
                      >
                        {isAdding ? (
                          <ActivityIndicator
                            color={Colors.white}
                            size="small"
                          />
                        ) : isAdded ? (
                          <Check color={Colors.white} size={14} />
                        ) : (
                          <Plus color={Colors.white} size={14} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.expandedMain}
                      onPress={() => void handleAddToCart(listing.id)}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={`Quick add ${listing.title}`}
                      disabled={isAdding}
                    >
                      <OptimizedImage
                        uri={imageUri}
                        fallback={require("../../assets/icon.png")}
                        style={styles.expandedImage}
                        resizeMode="cover"
                      />
                      <View style={styles.expandedTextWrap}>
                        {!!listing.categories?.name && (
                          <Text style={styles.category} numberOfLines={1}>
                            {listing.categories.name}
                          </Text>
                        )}
                        <Text style={styles.expandedTitle} numberOfLines={1}>
                          {listing.title}
                        </Text>
                        <Text style={styles.compactPrice}>
                          {formatPrice(listing.price_cents)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBubble,
                          isAdded && styles.statusBubbleAdded,
                        ]}
                      >
                        {isAdding ? (
                          <ActivityIndicator
                            color={Colors.white}
                            size="small"
                          />
                        ) : isAdded ? (
                          <Check color={Colors.white} size={14} />
                        ) : (
                          <Plus color={Colors.white} size={14} />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={
                      collapsed ? styles.compactDetail : styles.expandedDetail
                    }
                    onPress={() => handleGoToDetails(listing.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${listing.title}`}
                  >
                    <ChevronRight color={Colors.darkTeal} size={14} />
                    {!collapsed && (
                      <Text style={styles.expandedDetailText}>Details</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
      </ScrollView>

      {collapsed && !loading && listings.length > compactItemLimit && (
        <Text style={styles.moreHint} numberOfLines={1}>
          {listings.length - compactItemLimit} more items available
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...Typography.bodySemibold,
    color: Colors.darkTeal,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
    marginTop: 2,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  expandButtonText: {
    ...Typography.bodySmall,
    color: Colors.primary_blue,
    fontWeight: "700",
  },
  compactRow: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  expandedRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  compactSkeleton: {
    width: 160,
    height: 46,
    borderRadius: 999,
    backgroundColor: Colors.white,
    opacity: 0.55,
  },
  expandedSkeleton: {
    width: 168,
    height: 110,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    opacity: 0.55,
  },
  compactChip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
    backgroundColor: Colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  compactMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    minHeight: 46,
    minWidth: Platform.OS === "web" ? 192 : 180,
  },
  compactTextWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  compactTitle: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  compactPrice: {
    ...Typography.bodySmall,
    color: Colors.primary_blue,
    fontWeight: "700",
  },
  compactDetail: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    minHeight: 46,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderLight,
    backgroundColor: Colors.lightGray,
  },
  statusBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_blue,
  },
  statusBubbleAdded: {
    backgroundColor: Colors.primary_green,
  },
  expandedCard: {
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  expandedMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  expandedImage: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.medium,
  },
  expandedTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  category: {
    ...Typography.bodySmall,
    color: Colors.primary_accent,
    marginBottom: 1,
  },
  expandedTitle: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  expandedDetail: {
    minHeight: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: Colors.lightGray,
  },
  expandedDetailText: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  moreHint: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
  },
});

export default BuyAgainRail;
