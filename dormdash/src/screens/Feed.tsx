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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import FilterModal from "../components/FilterModal";

import ListingCard from "../components/ListingCard";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type MainStackNavigationProp = NativeStackNavigationProp<
  {
    Feed: undefined;
    CreateListing: undefined;
  },
  "Feed"
>;

const Feed: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp>();

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
      .select("*, listing_images(url), categories(name)")
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
        renderItem={({ item }) => <ListingCard listing={item} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
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
        <Text style={styles.headerTitle}>DormDash</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("CreateListing")}
          style={styles.newListingButton}
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

      {/* Filter Button */}
      <TouchableOpacity
        style={styles.filterButton}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  // Clean professional filter button
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.lightMint,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
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
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },

  listContent: {
    paddingBottom: 80,
    paddingTop: Spacing.md,
  },
});

export default Feed;
