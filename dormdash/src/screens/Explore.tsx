import React, { useState, useEffect, useCallback } from "react";
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

import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ListingCard from "../components/ListingCard";
import FilterModal from "../components/FilterModal";
import SearchBar from "../components/SearchBar";
import EmptyState from "../components/EmptyState";
import { ListingGridSkeleton } from "../components/SkeletonLoader";
import {
  Colors,
  Fonts,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
} from "../assets/styles";

type MainStackNavigationProp = NativeStackNavigationProp<
  {
    Explore: undefined;
    CreateListing: undefined;
  },
  "Explore"
>;

const Explore: React.FC = () => {
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
  const [showFilters, setShowFilters] = useState(false);

  const loadFilterData = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    const { data: tgs } = await supabase.from("tags").select("*").order("name");

    setCategories(cats || []);
    setTags(tgs || []);
  };

  const fetchListings = async () => {
    let query = supabase
      .from("listings")
      .select("*, listing_images(url, sort_order), categories(name)")
      .order("created_at", { ascending: false });

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

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching listings:", error.message);
    } else {
      setListings(data || []);
      setFilteredListings(data || []);
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
    }, [selectedCategory, selectedTags, priceRange]),
  );

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredListings(listings);
    } else {
      const filtered = listings.filter((listing) => {
        const query = searchQuery.toLowerCase();
        const titleMatch = listing.title?.toLowerCase().includes(query);
        const descriptionMatch = listing.description
          ?.toLowerCase()
          .includes(query);
        return titleMatch || descriptionMatch;
      });
      setFilteredListings(filtered);
    }
  }, [searchQuery, listings]);

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
      if (selectedCategory || selectedTags.length > 0 || priceRange) {
        return (
          <EmptyState
            icon="filter-off"
            title="No results found"
            subtitle="Try adjusting your filters to see more listings"
            actionLabel="Clear Filters"
            onAction={() => {
              setSelectedCategory(null);
              setSelectedTags([]);
              setPriceRange(null);
            }}
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
      <View style={styles.header}>
        <View style={[styles.headerContent, isWeb && styles.webHeaderContent]}>
          <Text style={styles.headerTitle}>Explore</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("CreateListing")}
            style={[styles.newListingButton, isWeb && styles.webButton]}
          >
            <Icon
              name="plus"
              type="material-community"
              size={20}
              color={Colors.white}
            />
            <Text style={styles.newListingText}>new listing</Text>
          </TouchableOpacity>
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
            <Icon
              name="filter-variant"
              type="material-community"
              color={Colors.white}
              size={22}
            />
          </TouchableOpacity>
        </View>
        {/* Active filters indicator */}
        {(selectedCategory || selectedTags.length > 0 || priceRange) && (
          <View style={styles.activeFiltersRow}>
            <Icon
              name="filter-check"
              type="material-community"
              color={Colors.primary_green}
              size={16}
            />
            <Text style={styles.activeFiltersText}>Filters active</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory(null);
                setSelectedTags([]);
                setPriceRange(null);
              }}
            >
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.heading4.fontSize,
    fontWeight: Typography.heading4.fontWeight,
    fontFamily: Fonts.heading,
  },
  newListingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  newListingText: {
    color: Colors.white,
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: "500",
  },
  webButton: {
    cursor: "pointer",
  } as any,
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    marginTop: Spacing.sm,
    gap: Spacing.xs,
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    width: "100%",
  },
  listContent: {
    paddingTop: 15,
    paddingBottom: 80,
  },
  webListContent: {
    alignItems: "center",
  },
});

export default Explore;
