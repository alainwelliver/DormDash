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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";

type AddressListNavigationProp = NativeStackNavigationProp<{
  AddAddress: undefined;
}>;

interface Address {
  id: number;
  building_name?: string;
  room_number?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

const AddressList: React.FC = () => {
  const navigation = useNavigation<AddressListNavigationProp>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = async () => {
    // Using mock data for now - will connect to database later
    setAddresses([
      { id: 1, building_name: "Gutmann College House", room_number: "" },
      { id: 2, building_name: "", room_number: "Levine 605" },
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAddresses();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };

  const handleEdit = (address: Address) => {
    alert("Edit Address", "Edit functionality coming soon!");
  };

  const renderAddressItem = ({ item }: { item: Address }) => {
    const displayText =
      item.building_name && item.room_number
        ? `${item.building_name} - ${item.room_number}`
        : item.building_name ||
          item.room_number ||
          item.street_address ||
          "Address";

    return (
      <View style={styles.addressCard}>
        <Text style={styles.addressText}>{displayText}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Address</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Add Address Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddAddress")}
        >
          <Text style={styles.addButtonText}>Add Address</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  addressText: {
    flex: 1,
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "500",
    color: Colors.darkTeal,
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
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.base_bg,
  },
  addButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium, // 8px
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
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
