import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";

type AddressListNavigationProp = NativeStackNavigationProp<{
  AddAddress: { addressId?: number } | undefined;
}>;

interface Address {
  id: number;
  label?: string;
  building_name?: string;
  room_number?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

const AddressList: React.FC = () => {
  const navigation = useNavigation<AddressListNavigationProp>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error("Error fetching addresses:", error);
      alert("Error", "Failed to load addresses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAddresses();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };

  const handleEdit = (address: Address) => {
    navigation.navigate("AddAddress", { addressId: address.id });
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // First, unset all defaults for this user
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Then set this one as default
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId);

      if (error) throw error;
      fetchAddresses();
    } catch (error: any) {
      console.error("Error setting default:", error);
      alert("Error", "Failed to set default address");
    }
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("addresses")
                .delete()
                .eq("id", address.id);

              if (error) throw error;
              fetchAddresses();
            } catch (error: any) {
              console.error("Error deleting address:", error);
              alert("Error", "Failed to delete address");
            }
          },
        },
      ],
    );
  };

  const getDisplayText = (
    item: Address,
  ): { primary: string; secondary: string } => {
    let primary = item.label || "";
    let secondary = "";

    if (item.building_name) {
      if (!primary) primary = item.building_name;
      else secondary = item.building_name;

      if (item.room_number) {
        secondary = secondary
          ? `${secondary}, ${item.room_number}`
          : item.room_number;
      }
    } else if (item.street_address) {
      if (!primary) primary = item.street_address;
      else secondary = item.street_address;

      const cityState = [item.city, item.state, item.zip_code]
        .filter(Boolean)
        .join(", ");
      if (cityState) {
        secondary = secondary ? `${secondary}, ${cityState}` : cityState;
      }
    }

    if (!primary) primary = "Address";

    return { primary, secondary };
  };

  const renderAddressItem = ({ item }: { item: Address }) => {
    const { primary, secondary } = getDisplayText(item);

    return (
      <View style={styles.addressCard}>
        <TouchableOpacity
          style={styles.addressContent}
          onPress={() => handleSetDefault(item.id)}
        >
          <View style={styles.addressIcon}>
            <Icon
              name={item.is_default ? "map-marker-check" : "map-marker-outline"}
              type="material-community"
              color={item.is_default ? Colors.primary_green : Colors.mutedGray}
              size={24}
            />
          </View>
          <View style={styles.addressTextContainer}>
            <View style={styles.addressLabelRow}>
              <Text style={styles.addressPrimary}>{primary}</Text>
              {item.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
            {secondary ? (
              <Text style={styles.addressSecondary} numberOfLines={2}>
                {secondary}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Icon
              name="pencil"
              type="material-community"
              color={Colors.primary_blue}
              size={20}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Icon
              name="delete-outline"
              type="material-community"
              color={Colors.error}
              size={20}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
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

    return (
      <FlatList
        data={addresses}
        renderItem={renderAddressItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon
              name="map-marker-outline"
              type="material-community"
              color={Colors.lightGray}
              size={80}
            />
            <Text style={styles.emptyText}>No saved addresses</Text>
            <Text style={styles.emptySubtext}>
              Add an address for faster checkout
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-left"
            type="material-community"
            color={Colors.darkTeal}
            size={32}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Add Address Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddAddress", undefined)}
        >
          <Icon
            name="plus"
            type="material-community"
            color={Colors.white}
            size={20}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  addressContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  addressIcon: {
    marginRight: Spacing.md,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  addressPrimary: {
    fontSize: 16,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginRight: Spacing.sm,
  },
  addressSecondary: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: Colors.lightMint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.secondary,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.base_bg,
  },
  addButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
    paddingTop: 100,
  },
  emptyText: {
    fontFamily: Typography.heading4.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: Colors.mutedGray,
    textAlign: "center",
  },
});

export default AddressList;
