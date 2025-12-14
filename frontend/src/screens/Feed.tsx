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

import { Plus, SlidersHorizontal } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import FilterModal from "../components/FilterModal";
import EmptyState from "../components/EmptyState";
import { ListingGridSkeleton } from "../components/SkeletonLoader";
import { useListings, useCategories, useTags } from "../lib/api/queries";

import ListingCard from "../components/ListingCard";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
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
  const isWeb = Platform.OS === "web";

  // Calculate number of columns based on screen width
  const getNumColumns = () => {
    if (windowWidth >= 1200) return 5;
    if (windowWidth >= 900) return 4;
    if (windowWidth >= 600) return 3;
    return 2;
  };

  const numColumns = getNumColumns();

  // Calculate card width for skeleton
  const getCardWidth = () => {
    const containerWidth = Math.min(windowWidth, WebLayout.maxContentWidth);
    const totalGap = (numColumns - 1) * Spacing.lg;
    const horizontalPadding = Spacing.lg * 2;
    const availableWidth = containerWidth - horizontalPadding - totalGap;
    return Math.floor(availableWidth / numColumns);
  };

  const cardWidth = getCardWidth();

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // React Query hooks - data is cached and loads instantly on return visits
  const {
    data: listings = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useListings({
    category: selectedCategory,
    tags: selectedTags,
    priceRange,
  });

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const onRefresh = () => {
    refetch();
  };

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

    if (listings.length === 0) {
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
        data={listings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
        columnWrapperStyle={columnWrapperStyle}
        contentContainerStyle={[
          styles.listContent,
          isWeb && styles.webListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary_green}
            colors={[Colors.primary_green, Colors.primary_blue]}
            progressBackgroundColor={Colors.white}
          />
        }
        // Performance optimizations
        removeClippedSubviews={Platform.OS !== "web"}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        initialNumToRender={numColumns * 3}
        getItemLayout={undefined} // Let FlatList calculate
      />
    );
  };

  // Memoized render item to prevent unnecessary re-renders
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ListingCard listing={item} numColumns={numColumns} />
    ),
    [numColumns]
  );

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  // Memoize column wrapper style
  const columnWrapperStyle = useMemo(
    () => [
      styles.row,
      isWeb && {
        maxWidth: WebLayout.maxContentWidth,
        alignSelf: "center" as const,
      },
    ],
    [isWeb]
  );

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isWeb && styles.webHeaderContent]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>DormDash</Text>
            <Text style={styles.headerSubtitle}>Campus Marketplace</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("CreateListing")}
            style={[styles.newListingButton, isWeb && styles.webButton]}
          >
            <View style={styles.newListingButtonInner}>
              <Plus size={20} color={Colors.primary_green} />
              <Text style={styles.newListingText}>Sell</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Button */}
      <View style={[styles.filterWrapper, isWeb && styles.webFilterWrapper]}>
        <TouchableOpacity
          style={[styles.filterButton, isWeb && styles.webButton]}
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={22} color={Colors.darkTeal} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
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
    backgroundColor: Colors.white,
  },

  header: {
    backgroundColor: Colors.primary_green,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },

  webHeaderContent: {
    maxWidth: WebLayout.maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },

  headerLeft: {
    flex: 1,
  },

  headerTitle: {
    ...Typography.heading4,
    color: Colors.white,
    fontWeight: "700",
  },

  headerSubtitle: {
    fontSize: 12,
    color: Colors.lightMint,
    marginTop: 2,
    fontWeight: "500",
    opacity: 0.9,
  },

  newListingButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  newListingButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },

  newListingText: {
    color: Colors.primary_green,
    fontSize: 14,
    fontWeight: "700",
  },

  // Web button styles
  webButton: {
    cursor: "pointer",
  } as any,

  // Filter wrapper for centering
  filterWrapper: {
    backgroundColor: Colors.lightMint,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },

  webFilterWrapper: {
    alignItems: "center",
  },

  // Clean professional filter button
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    width: "100%",
    maxWidth: WebLayout.maxContentWidth,
  },
  filterButtonText: {
    ...Typography.bodyMedium,
    color: Colors.darkTeal,
    fontWeight: "600",
  },

  content: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  emptyText: {
    ...Typography.bodyLarge,
    textAlign: "center",
    marginTop: Spacing.xl,
    color: Colors.mutedGray,
  },

  row: {
    justifyContent: "flex-start",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    width: "100%",
  },

  listContent: {
    paddingBottom: 80,
    paddingTop: Spacing.md,
  },

  webListContent: {
    alignItems: "center",
  },
});

export default Feed;
