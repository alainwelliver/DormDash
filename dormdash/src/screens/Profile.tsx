import React, { useState, useEffect } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
} from "../assets/styles";
import { supabase } from "../lib/supabase";
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

type ProfileNavigationProp = NativeStackNavigationProp<{
  MyListings: undefined;
  PastOrders: undefined;
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
    { title: "My Listings", icon: "format-list-bulleted", route: "MyListings" },
    { title: "Past Orders", icon: "history", route: "PastOrders" },
    { title: "Address", icon: "map-marker", route: "AddressList" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && styles.webScrollContent,
        ]}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, isWeb && styles.webProfileHeader]}>
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
              <Icon
                name="plus"
                type="material-community"
                color={Colors.white}
                size={18}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.name}>
                  {loading ? "Loading..." : profile.name}
                </Text>
                <Text style={styles.email}>{loading ? "" : profile.email}</Text>
                <Text style={styles.phone}>{loading ? "" : profile.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuContainer, isWeb && styles.webMenuContainer]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, isWeb && styles.webButton]}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                } else {
                  alert("Coming Soon", `${item.title} feature coming soon!`);
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
        <TouchableOpacity
          style={[styles.signOutButton, isWeb && styles.webButton]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
              <Icon
                name="close"
                type="material-community"
                color={Colors.darkTeal}
                size={24}
              />
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
  webScrollContent: {
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
  webProfileHeader: {
    maxWidth: WebLayout.maxFormWidth,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px
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
    width: "100%",
  },
  webMenuContainer: {
    maxWidth: WebLayout.maxFormWidth,
  },
  menuItem: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  webButton: {
    cursor: "pointer",
  } as any,
  menuItemText: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "500",
    color: Colors.darkTeal,
  },
  signOutButton: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium, // 8px
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
