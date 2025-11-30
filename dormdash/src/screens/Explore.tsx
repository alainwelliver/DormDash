import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ListingCard from "../components/ListingCard";
import FilterModal from "../components/FilterModal";
import {
  Colors,
  Fonts,
  Typography,
  Spacing,
  BorderRadius,
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
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: 20 }}
        />
      );
    }

    if (filteredListings.length === 0) {
      let emptyMessage = "No listings available";

      if (selectedCategory || selectedTags.length > 0 || priceRange) {
        emptyMessage = "No results found. Try adjusting your filters!";
      } else if (searchQuery.trim() !== "") {
        emptyMessage = "No results found";
      }

      return <Text style={styles.emptyText}>{emptyMessage}</Text>;
    }

    return (
      <FlatList
        data={filteredListings}
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
        <Text style={styles.headerTitle}>Explore</Text>

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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <Icon
            name="magnify"
            type="material-community"
            color={Colors.mutedGray}
            size={20}
          />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for products..."
          placeholderTextColor={Colors.mutedGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearIcon}
            onPress={() => setSearchQuery("")}
          >
            <Icon
              name="close-circle"
              type="material-community"
              color={Colors.mutedGray}
              size={20}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.filterIconContainer}
          onPress={() => setShowFilters(true)}
        >
          <Icon
            name="filter-variant"
            type="material-community"
            color={Colors.primary_blue}
            size={20}
          />
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
    backgroundColor: Colors.primary_green, // #2ECC71 (style guide green)
    paddingHorizontal: Spacing.lg, // 16px (was 20)
    paddingVertical: Spacing.lg, // 16px
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.heading4.fontSize, // 24px
    fontWeight: Typography.heading4.fontWeight, // 700
    fontFamily: Fonts.heading, // Angora
  },
  newListingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  newListingText: {
    color: Colors.white,
    fontSize: Typography.bodySmall.fontSize, // 12px
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px (was 12)
    marginHorizontal: Spacing.lg, // 16px
    marginVertical: Spacing.md, // 12px
    paddingHorizontal: Spacing.md, // 12px
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm, // 8px
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.bodyLarge.fontSize, // 16px
    fontFamily: Fonts.body, // Open Sans
    color: Colors.darkTeal,
  },
  clearIcon: {
    marginLeft: Spacing.sm, // 8px
  },
  filterIconContainer: {
    marginLeft: Spacing.md, // 12px
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  emptyText: {
    fontFamily: Fonts.body, // Open Sans
    fontSize: Typography.bodyLarge.fontSize, // 16px
    color: Colors.mutedGray,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: Spacing.lg, // 16px (was 20)
    gap: Spacing.sm, // 8px
  },
  listContent: {
    paddingTop: 15,
    paddingBottom: 80,
  },
});

export default Explore;
