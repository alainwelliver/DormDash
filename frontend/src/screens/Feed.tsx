import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Plus, SlidersHorizontal, Zap } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import FilterModal from "../components/FilterModal";
import EmptyState from "../components/EmptyState";
import { ListingGridSkeleton } from "../components/SkeletonLoader";
import { useListings, useCategories, useTags } from "../lib/api/queries";

import ListingCard from "../components/ListingCard";
import { BuyAgainRail, LiveBadge, SurfaceCard } from "../components";
import {
  Colors,
  SemanticColors,
  Typography,
  Spacing,
  WebLayout,
  Shadows,
} from "../assets/styles";
import { fetchBuyAgainListings } from "../lib/api/repeatBuying";

type MainStackNavigationProp = NativeStackNavigationProp<
  {
    Feed: undefined;
    CreateListing: undefined;
  },
  "Feed"
>;

const Feed: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isCompactMobile = !isWeb && windowWidth < 430;

  const getNumColumns = () => {
    if (windowWidth >= 1200) return 4; // Fewer columns for bigger cards
    if (windowWidth >= 900) return 3;
    return 2; // Default to 2 columns for mobile
  };

  const numColumns = getNumColumns();

  const getCardWidth = () => {
    const containerWidth = Math.min(windowWidth, WebLayout.maxContentWidth);
    const totalGap = (numColumns - 1) * Spacing.lg;
    const horizontalPadding = Spacing.lg * 2;
    const availableWidth = containerWidth - horizontalPadding - totalGap;
    return Math.floor(availableWidth / numColumns);
  };

  const cardWidth = getCardWidth();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [quickMode, setQuickMode] = useState<"all" | "budget" | "new">("all");

  const effectivePriceRange = useMemo(() => {
    if (quickMode === "budget") {
      return [0, 1500] as [number, number];
    }
    return priceRange;
  }, [priceRange, quickMode]);

  const {
    data: listings = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useListings({
    category: selectedCategory,
    tags: selectedTags,
    priceRange: effectivePriceRange,
  }, {
    page: 0,
    pageSize: 60,
  });

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: buyAgainListings = [], isLoading: buyAgainLoading } = useQuery({
    queryKey: ["buyAgainListings", "feed"],
    queryFn: () => fetchBuyAgainListings(10),
    staleTime: 1000 * 60 * 5,
  });

  const onRefresh = () => {
    refetch();
  };

  const processedListings = useMemo(() => {
    if (quickMode !== "new") return listings;
    return [...listings].sort((a, b) => {
      const left = a.created_at ? new Date(a.created_at).getTime() : 0;
      const right = b.created_at ? new Date(b.created_at).getTime() : 0;
      return right - left;
    });
  }, [listings, quickMode]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingOrEmptyWrap}>
          {renderListHeaderPanel()}
          <ListingGridSkeleton
            numColumns={numColumns}
            count={numColumns * 3}
            cardWidth={cardWidth}
          />
        </View>
      );
    }

    if (processedListings.length === 0) {
      return (
        <View style={styles.loadingOrEmptyWrap}>
          {renderListHeaderPanel()}
          <EmptyState
            icon="package-variant"
            title="No listings yet"
            subtitle="Try adjusting your filters or be the first to create a listing!"
            actionLabel="Create Listing"
            onAction={() => navigation.navigate("CreateListing")}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={processedListings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={numColumns > 1 ? columnWrapperStyle : undefined}
        ListHeaderComponent={renderListHeaderPanel}
        contentContainerStyle={[
          styles.listContent,
          isWeb && styles.webListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary_accent}
            colors={[Colors.primary_accent]}
            progressBackgroundColor={Colors.white}
          />
        }
        removeClippedSubviews={Platform.OS !== "web"}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
      />
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ListingCard listing={item} numColumns={numColumns} />
    ),
    [numColumns],
  );

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const columnWrapperStyle = useMemo(
    () => [
      styles.row,
      isWeb && {
        maxWidth: WebLayout.maxContentWidth,
        alignSelf: "center" as const,
      },
    ],
    [isWeb],
  );

  const renderListHeaderPanel = useCallback(
    () => (
      <View
        style={[styles.listHeaderPanel, isWeb && styles.listHeaderPanelWeb]}
      >
        <BuyAgainRail
          title="Buy Again"
          subtitle="Fast reorder from your recent favorites"
          listings={buyAgainListings as any}
          loading={buyAgainLoading}
        />
        <View style={styles.quickChipsRow}>
          <TouchableOpacity
            style={[
              styles.quickChip,
              quickMode === "all" && styles.quickChipActive,
              isCompactMobile && styles.quickChipCompact,
            ]}
            onPress={() => setQuickMode("all")}
          >
            <Text
              style={[
                styles.quickChipText,
                quickMode === "all" && styles.quickChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickChip,
              quickMode === "budget" && styles.quickChipActive,
              isCompactMobile && styles.quickChipCompact,
            ]}
            onPress={() => setQuickMode("budget")}
          >
            <Text
              style={[
                styles.quickChipText,
                quickMode === "budget" && styles.quickChipTextActive,
              ]}
            >
              Under $15
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickChip,
              quickMode === "new" && styles.quickChipActive,
              isCompactMobile && styles.quickChipCompact,
            ]}
            onPress={() => setQuickMode("new")}
          >
            <Text
              style={[
                styles.quickChipText,
                quickMode === "new" && styles.quickChipTextActive,
              ]}
            >
              New
            </Text>
          </TouchableOpacity>
        </View>

        <SurfaceCard variant="glass" style={styles.metaCard}>
          <Text style={styles.metaTitle}>Discover faster</Text>
          <Text style={styles.metaSubtitle}>
            Tap + to add instantly. Use quick chips for rapid filtering.
          </Text>
        </SurfaceCard>
      </View>
    ),
    [isCompactMobile, isWeb, quickMode, buyAgainListings, buyAgainLoading],
  );

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.lightGray} />

      {/* Background Decor */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Zap
          size={windowWidth * 0.8}
          color={Colors.primary_accent}
          opacity={0.05}
          style={{ transform: [{ rotate: "-15deg" }] }}
        />
      </View>

      {/* Minimal Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Spacing.lg) + Spacing.sm,
            paddingBottom: Spacing.sm,
            paddingHorizontal: isCompactMobile ? Spacing.md : Spacing.lg,
          },
          isWeb && styles.webHeader,
        ]}
      >
        <View style={styles.collapsedHeaderRow}>
          <View style={styles.collapsedTitleWrap}>
            <View style={styles.collapsedTitleRow}>
              <Text style={styles.collapsedTitle}>DormDash</Text>
              {!isCompactMobile ? <LiveBadge label="Live" /> : null}
            </View>
            <Text style={styles.collapsedSubtitle}>Campus market</Text>
          </View>
          <View style={styles.collapsedActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowFilters(true)}
            >
              <SlidersHorizontal size={20} color={Colors.darkTeal} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("CreateListing")}
              style={styles.compactSellButton}
            >
              <Plus size={18} color={Colors.white} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
        tags={tags}
        selectedCategory={selectedCategory}
        selectedTags={selectedTags}
        priceRange={priceRange}
        onApply={({ category, tags, priceRange }) => {
          setSelectedCategory(category);
          setSelectedTags(tags);
          setPriceRange(priceRange);
        }}
        onClear={() => {
          setSelectedCategory(null);
          setSelectedTags([]);
          setPriceRange(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.lightGray, // Overall background
  },
  watermarkContainer: {
    position: "absolute",
    top: -50,
    right: -100,
    zIndex: 0,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: "column",
    alignItems: "stretch",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  collapsedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.sm,
  },
  collapsedTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  collapsedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  collapsedTitle: {
    ...Typography.heading4,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  collapsedSubtitle: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
  },
  collapsedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexShrink: 0,
  },
  webHeader: {
    maxWidth: WebLayout.maxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingTop: Spacing.xl,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.darkTeal,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.mutedGray,
    fontWeight: "600",
    marginTop: -4,
  },
  listHeaderPanel: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  listHeaderPanelWeb: {
    alignItems: "center",
  },
  quickChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickChip: {
    backgroundColor: Colors.white,
    borderColor: SemanticColors.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  quickChipCompact: {
    paddingHorizontal: Spacing.sm + 2,
  },
  quickChipActive: {
    backgroundColor: Colors.primary_blue,
    borderColor: Colors.primary_blue,
  },
  quickChipText: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  quickChipTextActive: {
    color: Colors.white,
  },
  iconButton: {
    width: 38,
    height: 38,
    backgroundColor: Colors.white,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  compactSellButton: {
    backgroundColor: Colors.primary_accent,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  metaCard: {
    width: "100%",
    maxWidth: WebLayout.maxContentWidth,
    alignSelf: "center",
  },
  metaTitle: {
    ...Typography.bodySemibold,
    color: Colors.darkTeal,
  },
  metaSubtitle: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
  },
  content: {
    flex: 1,
    // Transparent to show watermark
  },
  loadingOrEmptyWrap: {
    flex: 1,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  listContent: {
    paddingBottom: 100, // Space for floating tab bar
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg, // Add padding to sides for single column
  },
  webListContent: {
    alignItems: "center",
  },
});

export default Feed;
