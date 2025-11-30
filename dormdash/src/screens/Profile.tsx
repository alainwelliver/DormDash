import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

type ProfileNavigationProp = NativeStackNavigationProp<{
  MyListings: undefined;
  PastOrders: undefined;
  AddressList: undefined;
  PaymentList: undefined;
}>;

const Profile: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const [profile, setProfile] = useState<UserProfile>({
    name: "Gilbert Jones",
    email: "Gilbertj@wharton.upenn.edu",
    phone: "111-222-3333",
  });

  /**
   * TODO: Uncomment and implement fetchUserProfile to get real user data
   */
  // useEffect(() => {
  //   fetchUserProfile();
  // }, []);

  const fetchUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // You can fetch additional profile data from your profiles table
      setProfile({
        name: user.user_metadata?.full_name || "User",
        email: user.email || "",
        phone: user.user_metadata?.phone || "N/A",
      });
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) console.error("Sign-out failed", error);
        },
      },
    ]);
  };

  const menuItems = [
    { title: "My Listings", icon: "format-list-bulleted", route: "MyListings" },
    { title: "Past Orders", icon: "history", route: "PastOrders" },
    { title: "Address", icon: "map-marker", route: "AddressList" },
    { title: "Payment", icon: "credit-card", route: "PaymentList" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: "https://via.placeholder.com/120" }}
              style={styles.avatar}
            />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.email}>{profile.email}</Text>
                <Text style={styles.phone}>{profile.phone}</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                } else {
                  Alert.alert(
                    "Coming Soon",
                    `${item.title} feature coming soon!`,
                  );
                }
              }}
            >
              <Text style={styles.menuItemText}>{item.title}</Text>
              <Icon
                name="chevron-right"
                type="material-community"
                color={Colors.mutedGray}
                size={24}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: Spacing.lg,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightGray,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  infoCard: {
    width: "100%",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,  // 8px
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
  },
  menuContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  menuItem: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,  // 8px
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  menuItemText: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "500",
    color: Colors.darkTeal,
  },
  signOutButton: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,  // 8px
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.sm,
    width: "60%",
    alignSelf: "center",
  },
  signOutButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
});

export default Profile;
