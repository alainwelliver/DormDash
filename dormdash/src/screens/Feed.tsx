import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import FilterModal from "../components/FilterModal";

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

  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ---------- Load categories & tags ----------
  const loadFilterData = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    const { data: tgs } = await supabase.from("tags").select("*").order("name");

    setCategories(cats || []);
    setTags(tgs || []);
  };

  useEffect(() => {
    loadFilterData();
  }, []);

  // ---------- Fetch listings with filters ----------
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

    if (error) console.error("Error fetching listings:", error);
    else setListings(data || []);

    setLoading(false);
    setRefreshing(false);
  };

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchListings();
    }, [selectedCategory, selectedTags, priceRange]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: Spacing.xl }}
        />
      );
    }

    if (listings.length === 0) {
      return (
        <Text style={styles.emptyText}>
          No posts found. Try adjusting your filters!
        </Text>
      );
    }

    return (
      <FlatList
        data={listings}
        renderItem={({ item }) => (
          <ListingCard listing={item} numColumns={numColumns} />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isWeb && styles.webHeaderContent]}>
          <Text style={styles.headerTitle}>DormDash</Text>

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

      {/* Filter Button */}
      <View style={[styles.filterWrapper, isWeb && styles.webFilterWrapper]}>
        <TouchableOpacity
          style={[styles.filterButton, isWeb && styles.webButton]}
          onPress={() => setShowFilters(true)}
        >
          <Icon
            name="filter-variant"
            type="material-community"
            size={22}
            color={Colors.darkTeal}
          />
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
    </SafeAreaView>
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
    ...Typography.heading4,
    color: Colors.white,
  },

  newListingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: Spacing.xs,
  },

  newListingText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "500",
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
