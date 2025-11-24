import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import ListingCard from "../components/ListingCard";

const COLORS = {
  primaryBlue: "#1A73E8",
  primaryGreen: "#60C694",
  teal: "#47B7C7",
  lightMint: "#E6F5EE",
  white: "#FFFFFF",
  grayDisabled: "#A0A0A0",
  bodyText: "#1F2937",
  subtleText: "#6B7280",
  border: "#E5E7EB",
};

const FONTS = {
  heading: "Poppins",
  body: "Open Sans",
  button: "Poppins",
};

const Explore: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(url)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error.message);
    } else {
      setListings(data || []);
      setFilteredListings(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchListings();
    }, []),
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
          color={COLORS.primaryBlue}
          style={{ marginTop: 20 }}
        />
      );
    }

    if (filteredListings.length === 0) {
      return (
        <Text style={styles.emptyText}>
          {searchQuery.trim() === ""
            ? "No listings available"
            : "No results found"}
        </Text>
      );
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
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <Icon
            name="magnify"
            type="material-community"
            color={COLORS.subtleText}
            size={20}
          />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for products..."
          placeholderTextColor={COLORS.subtleText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <View style={styles.clearIcon}>
            <Icon
              name="close-circle"
              type="material-community"
              color={COLORS.subtleText}
              size={20}
              onPress={() => setSearchQuery("")}
            />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "700",
    fontFamily: FONTS.heading,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.bodyText,
  },
  clearIcon: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.subtleText,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
});

export default Explore;
