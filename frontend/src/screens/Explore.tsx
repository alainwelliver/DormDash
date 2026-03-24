import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Plus, SlidersHorizontal, FilterX, Zap } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import ListingCard from "../components/ListingCard";
import FilterModal from "../components/FilterModal";
import SearchBar from "../components/SearchBar";
import EmptyState from "../components/EmptyState";
import { ListingGridSkeleton } from "../components/SkeletonLoader";
import {
  LiveBadge,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  BuyAgainRail,
} from "../components";
import {
  Colors,
  Fonts,
  SemanticColors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
} from "../assets/styles";
import { fetchBuyAgainListings } from "../lib/api/repeatBuying";
import {
  getConditionRank,
  LISTING_CARD_VIEW_SELECT,
  mapListingCardRow,
  SORT_OPTIONS,
  matchesConditionFilter,
  sortListings,
  type ListingCondition,
  type ListingSortOption,
} from "../lib/utils/listings";

type MainStackNavigationProp = NativeStackNavigationProp<
  {
    Explore: undefined;
    CreateListing: undefined;
    PlaceBounty: undefined;
  },
  "Explore"
>;

const LISTINGS_PAGE_SIZE = 80;
const Explore: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isPhoneWeb = isWeb && windowWidth < 520;
  const isWideWeb = isWeb && windowWidth >= 1120;

  // Calculate number of columns based on screen width
  const getNumColumns = () => {
    if (isPhoneWeb) return 1;
    if (windowWidth >= 1440) return 5;
    if (windowWidth >= 1180) return 4;
    if (windowWidth >= 820) return 3;
    return 2;
  };

  const numColumns = getNumColumns();

  // Calculate card width for skeleton
  const getCardWidth = () => {
    const containerWidth = isWeb
      ? Math.min(windowWidth - (isPhoneWeb ? 24 : 48), 1360)
      : Math.min(windowWidth, WebLayout.maxContentWidth);
    const totalGap = (numColumns - 1) * Spacing.lg;
    const horizontalPadding = isWeb ? 0 : Spacing.lg * 2;
    const availableWidth = containerWidth - horizontalPadding - totalGap;
    return Math.floor(availableWidth / numColumns);
  };

  const cardWidth = getCardWidth();

  const [listings, setListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [minimumCondition, setMinimumCondition] =
    useState<ListingCondition | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [quickMode, setQuickMode] = useState<"all" | "budget" | "fresh">("all");
  const [sortOption, setSortOption] = useState<ListingSortOption>("newest");
  const { data: buyAgainListings = [], isLoading: buyAgainLoading } = useQuery({
    queryKey: ["buyAgainListings", "explore"],
    queryFn: () => fetchBuyAgainListings(8),
    staleTime: 1000 * 60 * 5,
  });

  const resetFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setPriceRange(null);
    setMinimumCondition(null);
    setQuickMode("all");
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count += 1;
    if (selectedTags.length > 0) count += 1;
    if (priceRange) count += 1;
    if (minimumCondition) count += 1;
    if (quickMode !== "all") count += 1;
    return count;
  }, [
    selectedCategory,
    selectedTags.length,
    priceRange,
    minimumCondition,
    quickMode,
  ]);

  const loadFilterData = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    const { data: tgs } = await supabase
      .from("tags")
      .select("id, name")
      .order("name");

    setCategories(cats || []);
    setTags(tgs || []);
  };

  const fetchListings = async () => {
    let query = supabase
      .from("listing_cards")
      .select(LISTING_CARD_VIEW_SELECT)
      .eq("status", "active")
      .gt("available_quantity", 0)
      .order("created_at", { ascending: false })
      .range(0, LISTINGS_PAGE_SIZE - 1);

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    if (selectedTags.length > 0) {
      query = query.contains("listing_tags", selectedTags);
    }

    if (priceRange) {
      query = query
        .gte("price_cents", priceRange[0])
        .lte("price_cents", priceRange[1]);
    }

    if (minimumCondition) {
      query = query.gte("condition_rank", getConditionRank(minimumCondition));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching listings:", error.message);
    } else {
      const activeListings = (data || []).map((listing: any) =>
        mapListingCardRow(listing),
      );
      setListings(activeListings);
      setFilteredListings(activeListings);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadFilterData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchListings();
    }, [selectedCategory, selectedTags, priceRange, minimumCondition]),
  );

  useEffect(() => {
    let processed = listings;

    if (quickMode === "budget") {
      processed = processed.filter(
        (listing) => Number(listing.price_cents) <= 1000,
      );
    } else if (quickMode === "fresh") {
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      processed = processed.filter((listing) => {
        if (!listing.created_at) return false;
        return now - new Date(listing.created_at).getTime() <= threeDaysMs;
      });
    }

    processed = processed.filter((listing) =>
      matchesConditionFilter(listing, minimumCondition),
    );

    if (searchQuery.trim() === "") {
      setFilteredListings(sortListings(processed as any, sortOption));
    } else {
      const filtered = processed.filter((listing) => {
        const query = searchQuery.toLowerCase();
        const titleMatch = listing.title?.toLowerCase().includes(query);
        const descriptionMatch = listing.description
          ?.toLowerCase()
          .includes(query);
        return titleMatch || descriptionMatch;
      });
      setFilteredListings(sortListings(filtered as any, sortOption));
    }
  }, [searchQuery, listings, quickMode, minimumCondition, sortOption]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
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

    if (filteredListings.length === 0) {
      if (activeFilterCount > 0) {
        return (
          <EmptyState
            icon="filter-off"
            title="No results found"
            subtitle="Try adjusting your filters to see more listings"
            actionLabel="Clear Filters"
            onAction={resetFilters}
          />
        );
      } else if (searchQuery.trim() !== "") {
        return (
          <EmptyState
            icon="magnify-close"
            title="No results found"
            subtitle={`We couldn't find anything matching "${searchQuery}"`}
            actionLabel="Clear Search"
            onAction={() => setSearchQuery("")}
          />
        );
      }
      return (
        <EmptyState
          icon="package-variant"
          title="No listings available"
          subtitle="Be the first to create a listing!"
          actionLabel="Create Listing"
          onAction={() => navigation.navigate("CreateListing")}
        />
      );
    }

    return (
      <FlatList
        data={filteredListings}
        renderItem={({ item }) => (
          <ListingCard listing={item} numColumns={numColumns} />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={[
          styles.row,
          isWeb && {
            maxWidth: WebLayout.maxContentWidth,
            alignSelf: "center" as const,
          },
        ]}
        contentContainerStyle={[
          styles.listContent,
          isWeb && styles.webListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, Spacing.lg) + Spacing.sm },
        ]}
      >
        <View style={[styles.headerContent, isWeb && styles.webHeaderContent]}>
          {isWeb ? (
            <SurfaceCard
              variant="glass"
              style={[
                styles.headerCard,
                isWideWeb && styles.headerCardWide,
                isPhoneWeb && styles.headerCardCompact,
              ]}
            >
              <View
                style={[
                  styles.headerCardRow,
                  isWideWeb && styles.headerCardRowWide,
                ]}
              >
                <SectionHeader
                  title="Explore"
                  subtitle="Fast campus discovery across listings"
                  rightSlot={<LiveBadge label="Explore live" />}
                  style={styles.heroHeader}
                />
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={[styles.newListingButton, styles.webButton]}
                    onPress={() => navigation.navigate("CreateListing")}
                  >
                    <Plus size={18} color={Colors.white} />
                    <Text style={styles.newListingText}>Create Listing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.placeBountyButton, styles.webButton]}
                    onPress={() => navigation.navigate("PlaceBounty")}
                  >
                    <Zap size={18} color={Colors.primary_green} />
                    <Text style={styles.placeBountyText}>Place Bounty</Text>
                  </TouchableOpacity>
                  <StatusPill
                    label={`${filteredListings.length} results`}
                    tone="info"
                  />
                </View>
              </View>
            </SurfaceCard>
          ) : (
            <>
              <SectionHeader
                title="Explore"
                subtitle="Fast campus discovery across listings"
                rightSlot={<LiveBadge label="Explore live" />}
                style={styles.heroHeader}
              />
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.newListingButton}
                  onPress={() => navigation.navigate("CreateListing")}
                >
                  <Plus size={18} color={Colors.white} />
                  <Text style={styles.newListingText}>Create Listing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.placeBountyButton}
                  onPress={() => navigation.navigate("PlaceBounty")}
                >
                  <Zap size={18} color={Colors.primary_green} />
                  <Text style={styles.placeBountyText}>Place Bounty</Text>
                </TouchableOpacity>
                <StatusPill
                  label={`${filteredListings.length} results`}
                  tone="info"
                />
              </View>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrapper, isWeb && styles.webSearchWrapper]}>
        <View style={styles.searchRow}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for products..."
            style={styles.searchBar}
          />
          <TouchableOpacity
            style={[styles.filterButton, isWeb && styles.webButton]}
            onPress={() => setShowFilters(true)}
          >
            <SlidersHorizontal color={Colors.white} size={22} />
          </TouchableOpacity>
        </View>
        <View style={styles.quickFiltersRow}>
          <TouchableOpacity
            style={[
              styles.quickFilterChip,
              quickMode === "all" && styles.quickFilterChipActive,
            ]}
            onPress={() => setQuickMode("all")}
          >
            <Text
              style={[
                styles.quickFilterText,
                quickMode === "all" && styles.quickFilterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickFilterChip,
              quickMode === "budget" && styles.quickFilterChipActive,
            ]}
            onPress={() => setQuickMode("budget")}
          >
            <Text
              style={[
                styles.quickFilterText,
                quickMode === "budget" && styles.quickFilterTextActive,
              ]}
            >
              Under $10
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickFilterChip,
              quickMode === "fresh" && styles.quickFilterChipActive,
            ]}
            onPress={() => setQuickMode("fresh")}
          >
            <Text
              style={[
                styles.quickFilterText,
                quickMode === "fresh" && styles.quickFilterTextActive,
              ]}
            >
              New (3d)
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickFiltersRow}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.quickFilterChip,
                sortOption === option.value && styles.quickFilterChipActive,
              ]}
              onPress={() => setSortOption(option.value)}
            >
              <Text
                style={[
                  styles.quickFilterText,
                  sortOption === option.value && styles.quickFilterTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Active filters indicator */}
        {activeFilterCount > 0 && (
          <SurfaceCard variant="glass" style={styles.activeFiltersRow}>
            <FilterX color={Colors.primary_green} size={16} />
            <Text style={styles.activeFiltersText}>
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
              active
            </Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </SurfaceCard>
        )}
      </View>

      <View style={[styles.buyAgainWrap, isWeb && styles.webSearchWrapper]}>
        <BuyAgainRail
          title="Buy Again"
          subtitle="Your recent picks, ready instantly"
          listings={buyAgainListings as any}
          loading={buyAgainLoading}
        />
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
        selectedCondition={minimumCondition}
        onApply={({ category, tags, priceRange, minimumCondition }) => {
          setSelectedCategory(category);
          setSelectedTags(tags);
          setPriceRange(priceRange);
          setMinimumCondition(minimumCondition);
        }}
        onClear={() => {
          setSelectedCategory(null);
          setSelectedTags([]);
          setPriceRange(null);
          setMinimumCondition(null);
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
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    alignItems: "stretch",
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerCardWide: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerCardCompact: {
    paddingHorizontal: Spacing.md,
  },
  headerCardRow: {
    gap: Spacing.md,
  },
  headerCardRowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroHeader: {
    marginBottom: 0,
  },
  webHeaderContent: {
    maxWidth: 1360,
    width: "100%",
    alignSelf: "center",
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.md,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.heading4.fontSize,
    fontWeight: Typography.heading4.fontWeight,
    fontFamily: Fonts.heading,
  },
  newListingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary_blue,
    borderRadius: 999,
  },
  newListingText: {
    color: Colors.white,
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: "700",
  },
  placeBountyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: 999,
  },
  placeBountyText: {
    color: Colors.primary_green,
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: "700",
  },
  webButton: {
    cursor: "pointer",
  } as any,
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  buyAgainWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 0,
  },
  webSearchWrapper: {
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    width: "100%",
    maxWidth: WebLayout.maxContentWidth,
  },
  quickFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    width: "100%",
    maxWidth: 1360,
    marginTop: Spacing.sm,
  },
  quickFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SemanticColors.borderSubtle,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  quickFilterChipActive: {
    backgroundColor: Colors.primary_green,
    borderColor: Colors.primary_green,
  },
  quickFilterText: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  quickFilterTextActive: {
    color: Colors.white,
  },
  searchBar: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: Colors.primary_blue,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary_blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    maxWidth: 1360,
  },
  activeFiltersText: {
    fontSize: 12,
    color: Colors.primary_green,
    fontWeight: "500",
  },
  clearFiltersText: {
    fontSize: 12,
    color: Colors.primary_blue,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.mutedGray,
  },
  row: {
    justifyContent: "flex-start",
    marginBottom: 15,
    gap: Spacing.lg,
    width: "100%",
  },
  listContent: {
    paddingTop: 15,
    paddingBottom: 100,
    paddingHorizontal: Spacing.lg,
  },
  webListContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
});

export default Explore;
