import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";

import {
  Plus,
  List,
  Clock,
  MapPin,
  CreditCard,
  ChevronRight,
  X,
  RefreshCw,
  MessageCircle,
} from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
} from "../assets/styles";
import {
  LiveBadge,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from "../components";
import { supabase } from "../lib/supabase";
import { useUnreadConversationCount } from "../lib/api/messages";
import {
  alert,
  pickSingleImage,
  uploadImageToSupabase,
} from "../lib/utils/platform";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

interface UserStats {
  listingsCount: number;
  ordersCount: number;
  reviewsCount: number;
}

type ProfileNavigationProp = NativeStackNavigationProp<{
  MyListings: undefined;
  PastOrders: undefined;
  Inbox: undefined;
  SavedCarts: undefined;
  AddressList: undefined;
  PaymentList: undefined;
}>;

const Profile: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const isWeb = Platform.OS === "web";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
  });
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [stats, setStats] = useState<UserStats>({
    listingsCount: 0,
    ordersCount: 0,
    reviewsCount: 0,
  });
  const { data: unreadMessagesCount = 0 } = useUnreadConversationCount();

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, "");

    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);

    // Format as xxx-xxx-xxxx
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    setEditPhone(formatPhoneNumber(text));
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Refresh stats every time the Profile screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchUserStats();
    }, []),
  );

  const fetchUserStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch listings count
      const { count: listingsCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch orders count (only paid orders)
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "paid");

      // Fetch reviews given
      const { count: reviewsCount } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", user.id);

      setStats({
        listingsCount: listingsCount || 0,
        ordersCount: ordersCount || 0,
        reviewsCount: reviewsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handleEditProfile = () => {
    setEditName(profile.name);
    setEditPhone(
      profile.phone === "N/A" ? "" : formatPhoneNumber(profile.phone),
    );
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      alert("Error", "Name cannot be empty");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: editName.trim(),
          phone: editPhone.trim(),
        },
      });

      if (error) {
        alert("Error", error.message);
        return;
      }

      setProfile({
        ...profile,
        name: editName.trim(),
        phone: editPhone.trim() || "N/A",
      });
      setIsEditModalVisible(false);
      alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          name: user.user_metadata?.full_name || "User",
          email: user.email || "",
          phone: user.user_metadata?.phone || "N/A",
        });
        // Fetch avatar URL if exists
        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut({ scope: "local" });
            if (error && error.name !== "AuthSessionMissingError") {
              console.error("Sign-out failed", error);
            }
          } catch (e) {
            // Ignore session missing errors - user is effectively signed out
            console.log("Sign out completed");
          }
        },
      },
    ]);
  };

  const handleUploadAvatar = async () => {
    try {
      // Use cross-platform image picker
      const localUri = await pickSingleImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!localUri) {
        return;
      }

      setUploadingAvatar(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Error", "User not found");
        return;
      }

      // Upload to Supabase Storage
      const ext = localUri.match(/\.(\w+)(?:\?|$)/)?.[1] || "jpg";
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      // Use cross-platform upload
      await uploadImageToSupabase(
        supabase,
        "avatars",
        localUri,
        fileName,
        contentType,
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update user metadata with avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      setIsAvatarModalVisible(false);
      alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error", "Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const menuItems = [
    {
      title: "My Listings",
      IconComponent: List,
      route: "MyListings",
      badge: "Selling",
    },
    {
      title: "Past Orders",
      IconComponent: Clock,
      route: "PastOrders",
      badge: "History",
    },
    {
      title: "Messages",
      IconComponent: MessageCircle,
      route: "Inbox",
      badge: "Inbox",
    },
    {
      title: "Saved Routines",
      IconComponent: RefreshCw,
      route: "SavedCarts",
      badge: "Quick Buy",
    },
    {
      title: "Address",
      IconComponent: MapPin,
      route: "AddressList",
      badge: "Delivery",
    },
    {
      title: "Payment Methods",
      IconComponent: CreditCard,
      route: "PaymentList",
      badge: "Billing",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && styles.webScrollContent,
        ]}
      >
        <View style={[styles.heroSection, isWeb && styles.webContainer]}>
          <SectionHeader
            title="Profile"
            subtitle="Everything about your account and activity"
            rightSlot={<LiveBadge label="Account live" />}
            style={styles.profileSectionHeader}
          />
        </View>

        {/* Profile Header */}
        <View style={[styles.profileHeader, isWeb && styles.webContainer]}>
          <SurfaceCard variant="glass" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={() => setIsAvatarModalVisible(true)}
              >
                <View style={styles.avatarContainer}>
                  <Image
                    source={
                      avatarUrl
                        ? { uri: avatarUrl }
                        : { uri: "https://via.placeholder.com/120" }
                    }
                    style={styles.avatar}
                  />
                </View>
                <View style={styles.avatarPlusButton}>
                  <Plus color={Colors.white} size={18} />
                </View>
              </TouchableOpacity>

              <View style={styles.infoContent}>
                <Text style={styles.name}>
                  {loading ? "Loading..." : profile.name}
                </Text>
                <Text style={styles.email}>{loading ? "" : profile.email}</Text>
                <Text style={styles.phone}>{loading ? "" : profile.phone}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditProfile}
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SurfaceCard>
        </View>

        {/* Stats Section */}
        <View style={[styles.statsContainer, isWeb && styles.webContainer]}>
          <SurfaceCard variant="mint" style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.listingsCount}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.ordersCount}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.reviewsCount}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>
          </SurfaceCard>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuContainer, isWeb && styles.webContainer]}>
          {menuItems.map((item, index) => (
            <SurfaceCard
              key={index}
              variant="default"
              style={[styles.menuItem, isWeb && styles.webButton]}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                } else {
                  alert("Coming Soon", `${item.title} feature coming soon!`);
                }
              }}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIcon}>
                  <item.IconComponent color={Colors.primary_blue} size={18} />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.route === "Inbox" ? (
                  unreadMessagesCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                      </Text>
                    </View>
                  ) : (
                    <StatusPill label={item.badge} tone="info" />
                  )
                ) : (
                  <StatusPill label={item.badge} tone="info" />
                )}
                <ChevronRight color={Colors.mutedGray} size={20} />
              </View>
            </SurfaceCard>
          ))}
        </View>

        {/* Sign Out Button */}
        <View style={[styles.signOutWrap, isWeb && styles.webContainer]}>
          <TouchableOpacity
            style={[styles.signOutButton, isWeb && styles.webButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWeb && styles.webModalContent]}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={editPhone}
              onChangeText={handlePhoneChange}
              placeholder="xxx-xxx-xxxx"
              keyboardType="phone-pad"
            />

            <Text style={styles.emailNote}>
              Email cannot be changed: {profile.email}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal
        visible={isAvatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.avatarModalContent}>
            <TouchableOpacity
              style={styles.avatarModalClose}
              onPress={() => setIsAvatarModalVisible(false)}
            >
              <X color={Colors.darkTeal} size={24} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Profile Picture</Text>

            <View style={styles.avatarPreviewContainer}>
              <Image
                source={
                  avatarUrl
                    ? { uri: avatarUrl }
                    : { uri: "https://via.placeholder.com/150" }
                }
                style={styles.avatarPreview}
              />
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload New Picture</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  webScrollContent: {
    alignItems: "center",
  },
  heroSection: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  webContainer: {
    maxWidth: WebLayout.maxFormWidth,
    width: "100%",
    alignSelf: "center",
  },
  profileSectionHeader: {
    marginBottom: Spacing.sm,
  },
  profileHeader: {
    alignItems: "stretch",
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
  statsContainer: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
  statsCard: {
    width: "100%",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.primary_green,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.darkTeal,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.secondary,
    opacity: 0.3,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: Spacing.lg,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.lightGray,
    overflow: "hidden",
  },
  avatarPlusButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary_blue,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  infoCard: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
  },
  menuContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  menuItem: {
    marginBottom: Spacing.sm,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.lightMint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: Colors.primary_blue,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
  webButton: {
    cursor: "pointer",
  } as any,
  menuItemText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  signOutWrap: {
    paddingHorizontal: Spacing.lg,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  signOutButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.md,
    alignItems: "center",
    width: "100%",
    alignSelf: "center",
  },
  signOutButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: WebLayout.maxFormWidth,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
  },
  webModalContent: {
    width: WebLayout.maxFormWidth,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.small,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
    backgroundColor: Colors.base_bg,
  },
  emailNote: {
    fontSize: 12,
    color: Colors.mutedGray,
    fontStyle: "italic",
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.mutedGray,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.mutedGray,
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primary_blue,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
  avatarModalContent: {
    width: "85%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: "center",
  },
  avatarModalClose: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  avatarPreviewContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.lightGray,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  avatarPreview: {
    width: "100%",
    height: "100%",
  },
  uploadButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.medium,
    width: "100%",
    alignItems: "center",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});

export default Profile;
