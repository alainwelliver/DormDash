import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ListingCard from "../components/ListingCard";
import { Colors } from "../assets/styles";

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

type MainStackNavigationProp = NativeStackNavigationProp<
  { Feed: undefined; CreateListing: undefined },
  "Feed"
>;

const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Sign-out failed", error);
};

const Feed: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp>();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(url)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error.message);
    } else {
      setListings(data || []);
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

    if (listings.length === 0) {
      return (
        <Text style={styles.emptyText}>
          No posts yet. Start by creating one!
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
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DormDash</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Icon
            name="logout"
            type="material-community"
            color={COLORS.white}
            size={24}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Floating New Post Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateListing")}
      >
        <Icon
          name="plus"
          type="material-community"
          color={COLORS.white}
          size={28}
        />
      </TouchableOpacity>
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
  logoutButton: {
    padding: 6,
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
    paddingBottom: 80,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primaryBlue,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
});

export default Feed;
