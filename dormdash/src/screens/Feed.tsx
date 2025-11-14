import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
      <View style={styles.content}>
        <Text style={styles.emptyText}>
          No posts yet. Start by creating one!
        </Text>
      </View>

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
