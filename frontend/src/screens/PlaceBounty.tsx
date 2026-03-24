import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ChevronLeft,
  ShoppingBag,
  MapPin,
  Clock,
  DollarSign,
  Store,
  ChevronRight,
  X,
  Plus,
} from "lucide-react-native";
import {
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";
import { supabase } from "../lib/supabase";
import { placeBounty } from "../lib/api/bounties";
import { SectionHeader, StickyActionBar } from "../components";

type PlaceBountyNavigationProp = NativeStackNavigationProp<{
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
    bountyId?: number;
  };
  AddAddress: { addressId?: number } | undefined;
  MyBounties: undefined;
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

const getAddressDisplayString = (addr: Address): string => {
  if (addr.building_name) {
    return addr.room_number
      ? `${addr.building_name}, ${addr.room_number}`
      : addr.building_name;
  }
  if (addr.street_address) return addr.street_address;
  return addr.label || "Address";
};

const PlaceBounty: React.FC = () => {
  const navigation = useNavigation<PlaceBountyNavigationProp>();

  const [itemDescription, setItemDescription] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [bountyAmountDollars, setBountyAmountDollars] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAddresses(data as Address[]);
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchAddresses();
    }, [fetchAddresses]),
  );

  const formatCurrency = (text: string) => {
    // Remove non-numeric except decimal
    const cleaned = text.replace(/[^0-9.]/g, "");
    // Only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) return bountyAmountDollars;
    // Max 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    return cleaned;
  };

  const buildDeadlineISO = (): string | null => {
    // Expect date: MM/DD/YYYY and time: HH:MM (24h)
    const dateParts = deadlineDate.split("/");
    const timeParts = deadlineTime.split(":");
    if (dateParts.length !== 3 || timeParts.length !== 2) return null;
    const [month, day, year] = dateParts;
    const [hour, minute] = timeParts;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleSubmit = async () => {
    if (!itemDescription.trim()) {
      alert("Missing field", "Please describe the item you want.");
      return;
    }
    if (!storeName.trim()) {
      alert("Missing field", "Please enter the store name.");
      return;
    }
    if (!storeLocation.trim()) {
      alert("Missing field", "Please enter the store address.");
      return;
    }
    const amountCents = Math.round(
      parseFloat(bountyAmountDollars || "0") * 100,
    );
    if (!bountyAmountDollars || amountCents <= 0) {
      alert("Invalid amount", "Please enter a bounty amount greater than $0.");
      return;
    }
    const deadlineISO = buildDeadlineISO();
    if (!deadlineISO) {
      alert(
        "Invalid deadline",
        "Please enter the date as MM/DD/YYYY and time as HH:MM (24-hour).",
      );
      return;
    }
    if (new Date(deadlineISO) <= new Date()) {
      alert("Invalid deadline", "Deadline must be in the future.");
      return;
    }
    if (!selectedAddress) {
      alert("Missing field", "Please select a delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const bountyId = await placeBounty({
        item_description: itemDescription.trim(),
        store_name: storeName.trim(),
        store_location: storeLocation.trim(),
        bounty_amount_cents: amountCents,
        deadline: deadlineISO,
        delivery_address: getAddressDisplayString(selectedAddress),
        delivery_lat: selectedAddress.lat ?? null,
        delivery_lng: selectedAddress.lng ?? null,
      });

      await AsyncStorage.setItem("pendingBountyId", String(bountyId));

      navigation.navigate("PaymentPortal", {
        priceCents: amountCents,
        listingTitle: itemDescription.trim(),
        bountyId,
      });
    } catch (err: any) {
      console.error("Error placing bounty:", err);
      alert("Error", err?.message || "Failed to place bounty. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatAddressLabel = (addr: Address) => getAddressDisplayString(addr);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={Colors.darkTeal} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place a Bounty</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader
          title="What do you need?"
          subtitle="Set your bounty and a dasher will buy and deliver it to you"
          style={styles.sectionHeaderTop}
        />

        {/* Item Description */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabel}>
            <ShoppingBag color={Colors.primary_blue} size={16} />
            <Text style={styles.fieldLabelText}>Item Description</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={itemDescription}
            onChangeText={setItemDescription}
            placeholder="e.g. Large iced coffee, oat milk, extra shot"
            placeholderTextColor={Colors.mutedGray}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </View>

        {/* Store Name */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabel}>
            <Store color={Colors.primary_blue} size={16} />
            <Text style={styles.fieldLabelText}>Store Name</Text>
          </View>
          <TextInput
            style={styles.textInput}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="e.g. Starbucks"
            placeholderTextColor={Colors.mutedGray}
            autoCapitalize="words"
          />
        </View>

        {/* Store Address */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabel}>
            <MapPin color={Colors.primary_blue} size={16} />
            <Text style={styles.fieldLabelText}>Store Address</Text>
          </View>
          <TextInput
            style={styles.textInput}
            value={storeLocation}
            onChangeText={setStoreLocation}
            placeholder="e.g. 3601 Walnut St, Philadelphia"
            placeholderTextColor={Colors.mutedGray}
          />
        </View>

        {/* Bounty Amount */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabel}>
            <DollarSign color={Colors.primary_blue} size={16} />
            <Text style={styles.fieldLabelText}>Bounty Amount</Text>
          </View>
          <TextInput
            style={styles.textInput}
            value={bountyAmountDollars}
            onChangeText={(t) => setBountyAmountDollars(formatCurrency(t))}
            placeholder="0.00"
            placeholderTextColor={Colors.mutedGray}
            keyboardType="decimal-pad"
          />
          <Text style={styles.fieldHint}>
            You pay this total. The dasher buys the item and keeps the difference as profit.
          </Text>
        </View>

        {/* Deadline */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabel}>
            <Clock color={Colors.primary_blue} size={16} />
            <Text style={styles.fieldLabelText}>Deadline</Text>
          </View>
          <View style={styles.deadlineRow}>
            <TextInput
              style={[styles.textInput, styles.deadlineDateInput]}
              value={deadlineDate}
              onChangeText={setDeadlineDate}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={Colors.mutedGray}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <TextInput
              style={[styles.textInput, styles.deadlineTimeInput]}
              value={deadlineTime}
              onChangeText={setDeadlineTime}
              placeholder="HH:MM"
              placeholderTextColor={Colors.mutedGray}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <Text style={styles.fieldHint}>24-hour time (e.g. 14:30 = 2:30 PM)</Text>
        </View>

        {/* Delivery Address */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabel}>
            <MapPin color={Colors.primary_green} size={16} />
            <Text style={styles.fieldLabelText}>Deliver To</Text>
          </View>
          <TouchableOpacity
            style={styles.addressSelector}
            onPress={() => setShowAddressModal(true)}
          >
            {selectedAddress ? (
              <Text style={styles.addressSelectorText} numberOfLines={2}>
                {formatAddressLabel(selectedAddress)}
              </Text>
            ) : (
              <Text style={styles.addressSelectorPlaceholder}>
                Select a delivery address
              </Text>
            )}
            <ChevronRight color={Colors.mutedGray} size={20} />
          </TouchableOpacity>
        </View>

        {/* Bottom padding for sticky bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <StickyActionBar>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Continue to Payment</Text>
          )}
        </TouchableOpacity>
      </StickyActionBar>

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <X color={Colors.darkTeal} size={24} />
              </TouchableOpacity>
            </View>

            {loadingAddresses ? (
              <ActivityIndicator color={Colors.primary_blue} style={{ marginTop: 20 }} />
            ) : addresses.length === 0 ? (
              <View style={styles.noAddresses}>
                <Text style={styles.noAddressesText}>No saved addresses.</Text>
                <TouchableOpacity
                  style={styles.addAddressButton}
                  onPress={() => {
                    setShowAddressModal(false);
                    navigation.navigate("AddAddress", undefined);
                  }}
                >
                  <Plus color={Colors.white} size={16} />
                  <Text style={styles.addAddressButtonText}>Add Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.addressItem,
                      selectedAddress?.id === item.id && styles.addressItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedAddress(item);
                      setShowAddressModal(false);
                    }}
                  >
                    <MapPin color={Colors.primary_blue} size={16} />
                    <Text style={styles.addressItemText} numberOfLines={2}>
                      {formatAddressLabel(item)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.addAddressRow}
                    onPress={() => {
                      setShowAddressModal(false);
                      navigation.navigate("AddAddress", undefined);
                    }}
                  >
                    <Plus color={Colors.primary_blue} size={16} />
                    <Text style={styles.addAddressRowText}>Add New Address</Text>
                  </TouchableOpacity>
                }
              />
            )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionHeaderTop: {
    marginBottom: Spacing.lg,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  fieldLabelText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  fieldHint: {
    marginTop: Spacing.xs,
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    fontStyle: "italic",
  },
  deadlineRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  deadlineDateInput: {
    flex: 2,
  },
  deadlineTimeInput: {
    flex: 1,
  },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  addressSelectorText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
  },
  addressSelectorPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  submitButton: {
    backgroundColor: Colors.primary_green,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.base_bg,
  },
  addressItemSelected: {
    backgroundColor: Colors.lightMint,
    borderWidth: 1,
    borderColor: Colors.primary_green,
  },
  addressItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
  },
  noAddresses: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noAddressesText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  addAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  addAddressButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  addAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addAddressRowText: {
    fontSize: 15,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
  },
});

export default PlaceBounty;
