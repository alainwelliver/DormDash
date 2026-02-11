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
import FilterModal from "../components/FilterModal";
import EmptyState from "../components/EmptyState";
import { ListingGridSkeleton } from "../components/SkeletonLoader";
import { useListings, useCategories, useTags } from "../lib/api/queries";

import ListingCard from "../components/ListingCard";
import { LiveBadge, SectionHeader, SurfaceCard } from "../components";
import {
  Colors,
  SemanticColors,
  Typography,
  Spacing,
  WebLayout,
  Shadows,
} from "../assets/styles";

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
  });

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

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
        <ListingGridSkeleton
          numColumns={numColumns}
          count={numColumns * 3}
          cardWidth={cardWidth}
        />
      );
    }

    if (processedListings.length === 0) {
      return (
        <EmptyState
          icon="package-variant"
          title="No listings yet"
          subtitle="Try adjusting your filters or be the first to create a listing!"
          actionLabel="Create Listing"
          onAction={() => navigation.navigate("CreateListing")}
        />
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
          { paddingTop: Math.max(insets.top, Spacing.lg) + Spacing.sm },
          isWeb && styles.webHeader,
        ]}
      >
        <SectionHeader
          title="DormDash"
          subtitle="Fast campus marketplace"
          rightSlot={<LiveBadge label="Market live" />}
          style={styles.heroHeader}
        />

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.quickChip,
              quickMode === "all" && styles.quickChipActive,
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
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFilters(true)}
          >
            <SlidersHorizontal size={24} color={Colors.darkTeal} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("CreateListing")}
            style={styles.primaryButton}
          >
            <Plus size={20} color={Colors.white} strokeWidth={3} />
            <Text style={styles.primaryButtonText}>Sell</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.metaRow, isWeb && styles.webMetaRow]}>
        <SurfaceCard variant="glass" style={styles.metaCard}>
          <Text style={styles.metaTitle}>Discover faster</Text>
          <Text style={styles.metaSubtitle}>
            Tap + to add instantly. Use quick chips for rapid filtering.
          </Text>
        </SurfaceCard>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  heroHeader: {
    marginBottom: 0,
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
  headerActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: Spacing.md,
  },
  quickChip: {
    backgroundColor: Colors.white,
    borderColor: SemanticColors.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
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
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: 12,
    ...Shadows.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary_accent,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 6,
    ...Shadows.glow,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  metaRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  webMetaRow: {
    alignItems: "center",
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
