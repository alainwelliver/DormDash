import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";
import { supabase } from "../lib/supabase";

type CheckoutNavigationProp = NativeStackNavigationProp<{
  PaymentPortal: { priceCents: number; listingTitle: string };
  AddAddress: { addressId?: number } | undefined;
  AddressList: undefined;
}>;

interface CartItem {
  id: number;
  title: string;
  price_cents: number;
  quantity: number;
}

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

interface RouteParams {
  selectedItems: CartItem[];
}

const DELIVERY_FEE_CENTS = 400; // $4.00 delivery fee

const Checkout: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigationProp>();
  const route = useRoute();
  const { selectedItems } = (route.params as RouteParams) || {
    selectedItems: [],
  };

  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const fetchAddresses = async () => {
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
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
      // Auto-select default or first address
      if (data && data.length > 0) {
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        if (!selectedAddress) {
          setSelectedAddress(defaultAddr);
        }
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, []),
  );

  const getAddressDisplayText = (address: Address): string => {
    if (address.building_name) {
      return address.room_number
        ? `${address.building_name}, ${address.room_number}`
        : address.building_name;
    }
    if (address.street_address) {
      return address.street_address;
    }
    return address.label || "Address";
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0,
    );
  };

  const calculateTax = () => {
    return Math.round(calculateSubtotal() * 0.08); // 8% tax
  };

  const calculateDeliveryFee = () => {
    return deliveryMethod === "delivery" ? DELIVERY_FEE_CENTS : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateDeliveryFee();
  };

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const handlePlaceOrder = () => {
    if (deliveryMethod === "delivery" && !selectedAddress) {
      alert("Error", "Please select a delivery address");
      return;
    }

    const deliveryInfo =
      deliveryMethod === "delivery"
        ? `\nDelivery to: ${getAddressDisplayText(selectedAddress!)}`
        : "\nPickup from seller";

    alert(
      "Place Order",
      `Total: ${formatPrice(calculateTotal())}${deliveryInfo}\n\nProceed with payment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            navigation.navigate("PaymentPortal", {
              priceCents: calculateTotal(),
              listingTitle: `Order (${selectedItems.length} items)`,
            });
          },
        },
      ],
    );
  };

  const renderAddressItem = ({ item }: { item: Address }) => (
    <TouchableOpacity
      style={[
        styles.addressOption,
        selectedAddress?.id === item.id && styles.addressOptionSelected,
      ]}
      onPress={() => {
        setSelectedAddress(item);
        setShowAddressModal(false);
      }}
    >
      <View style={styles.addressOptionContent}>
        <Text style={styles.addressOptionText}>
          {getAddressDisplayText(item)}
        </Text>
        {item.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      {selectedAddress?.id === item.id && (
        <Icon
          name="check-circle"
          type="material-community"
          color={Colors.primary_green}
          size={24}
        />
      )}
    </TouchableOpacity>
  );

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
            name="arrow-left"
            type="material-community"
            color={Colors.darkTeal}
            size={24}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Delivery Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name="truck-delivery"
              type="material-community"
              color={Colors.primary_blue}
              size={24}
            />
            <Text style={styles.sectionTitle}>Delivery Method</Text>
          </View>
          <View style={styles.deliveryMethodContainer}>
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryMethod === "pickup" && styles.deliveryOptionSelected,
              ]}
              onPress={() => setDeliveryMethod("pickup")}
            >
              <Icon
                name="walk"
                type="material-community"
                color={
                  deliveryMethod === "pickup"
                    ? Colors.primary_green
                    : Colors.mutedGray
                }
                size={24}
              />
              <View style={styles.deliveryOptionText}>
                <Text
                  style={[
                    styles.deliveryOptionTitle,
                    deliveryMethod === "pickup" &&
                      styles.deliveryOptionTitleSelected,
                  ]}
                >
                  Pickup
                </Text>
                <Text style={styles.deliveryOptionSubtitle}>
                  Meet seller in person
                </Text>
              </View>
              <Text style={styles.deliveryOptionPrice}>Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryMethod === "delivery" && styles.deliveryOptionSelected,
              ]}
              onPress={() => setDeliveryMethod("delivery")}
            >
              <Icon
                name="bike-fast"
                type="material-community"
                color={
                  deliveryMethod === "delivery"
                    ? Colors.primary_green
                    : Colors.mutedGray
                }
                size={24}
              />
              <View style={styles.deliveryOptionText}>
                <Text
                  style={[
                    styles.deliveryOptionTitle,
                    deliveryMethod === "delivery" &&
                      styles.deliveryOptionTitleSelected,
                  ]}
                >
                  Dasher Delivery
                </Text>
                <Text style={styles.deliveryOptionSubtitle}>
                  Delivered to your door
                </Text>
              </View>
              <Text style={styles.deliveryOptionPrice}>
                {formatPrice(DELIVERY_FEE_CENTS)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address Section - Only show when delivery selected */}
        {deliveryMethod === "delivery" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon
                name="map-marker"
                type="material-community"
                color={Colors.primary_blue}
                size={24}
              />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            {loadingAddresses ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary_blue}
                style={{ padding: Spacing.lg }}
              />
            ) : addresses.length === 0 ? (
              <TouchableOpacity
                style={styles.addAddressCard}
                onPress={() => navigation.navigate("AddAddress", undefined)}
              >
                <Icon
                  name="plus-circle-outline"
                  type="material-community"
                  color={Colors.primary_blue}
                  size={24}
                />
                <Text style={styles.addAddressText}>Add delivery address</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.selectionCard}
                onPress={() => setShowAddressModal(true)}
              >
                <View style={styles.selectionContent}>
                  <Text style={styles.selectionText}>
                    {selectedAddress
                      ? getAddressDisplayText(selectedAddress)
                      : "Select address"}
                  </Text>
                  <Text style={styles.selectionSubtext}>
                    {selectedAddress?.is_default
                      ? "Default address"
                      : "Tap to change"}
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  type="material-community"
                  color={Colors.mutedGray}
                  size={24}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Order Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name="receipt"
              type="material-community"
              color={Colors.primary_blue}
              size={24}
            />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.summaryCard}>
            {selectedItems.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.orderItemQuantity}>
                    Qty: {item.quantity}
                  </Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  {formatPrice(item.price_cents * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price Breakdown Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name="calculator"
              type="material-community"
              color={Colors.primary_blue}
              size={24}
            />
            <Text style={styles.sectionTitle}>Price Details</Text>
          </View>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Subtotal ({selectedItems.length} items)
              </Text>
              <Text style={styles.priceValue}>
                {formatPrice(calculateSubtotal())}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax (8%)</Text>
              <Text style={styles.priceValue}>
                {formatPrice(calculateTax())}
              </Text>
            </View>
            {deliveryMethod === "delivery" && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Fee</Text>
                <Text style={styles.priceValue}>
                  {formatPrice(calculateDeliveryFee())}
                </Text>
              </View>
            )}
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatPrice(calculateTotal())}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomLabel}>Total Amount</Text>
          <Text style={styles.bottomTotal}>
            {formatPrice(calculateTotal())}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
        >
          <Text style={styles.placeOrderButtonText}>Place Order</Text>
          <Icon
            name="arrow-right"
            type="material-community"
            color={Colors.white}
            size={20}
          />
        </TouchableOpacity>
      </View>

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Icon
                  name="close"
                  type="material-community"
                  color={Colors.darkTeal}
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={addresses}
              renderItem={renderAddressItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.addressList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No addresses found</Text>
              }
            />
            <TouchableOpacity
              style={styles.addNewAddressButton}
              onPress={() => {
                setShowAddressModal(false);
                navigation.navigate("AddAddress", undefined);
              }}
            >
              <Icon
                name="plus"
                type="material-community"
                color={Colors.primary_blue}
                size={20}
              />
              <Text style={styles.addNewAddressText}>Add New Address</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: Spacing.xs,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginLeft: Spacing.sm,
  },
  selectionCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectionContent: {
    flex: 1,
  },
  selectionText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  selectionSubtext: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  orderItemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  orderItemTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  orderItemPrice: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  priceCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  priceLabel: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
  },
  priceValue: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  priceDivider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  bottomLabel: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "500",
  },
  bottomTotal: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  placeOrderButton: {
    backgroundColor: Colors.primary_green,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  placeOrderButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    color: Colors.white,
    marginRight: Spacing.sm,
  },
  // Delivery Method Styles
  deliveryMethodContainer: {
    gap: Spacing.md,
  },
  deliveryOption: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  deliveryOptionSelected: {
    borderColor: Colors.primary_green,
    backgroundColor: Colors.lightMint,
  },
  deliveryOptionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  deliveryOptionTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  deliveryOptionTitleSelected: {
    color: Colors.primary_green,
  },
  deliveryOptionSubtitle: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 2,
  },
  deliveryOptionPrice: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  // Add Address Card Styles
  addAddressCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.primary_blue,
  },
  addAddressText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
    marginLeft: Spacing.sm,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    maxHeight: "70%",
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  addressList: {
    padding: Spacing.lg,
  },
  addressOption: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  addressOptionSelected: {
    borderColor: Colors.primary_green,
    backgroundColor: Colors.lightMint,
  },
  addressOptionContent: {
    flex: 1,
  },
  addressOptionText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  defaultBadge: {
    backgroundColor: Colors.lightMint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.secondary,
    fontWeight: "600",
  },
  addNewAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.primary_blue,
  },
  addNewAddressText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
    marginLeft: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    padding: Spacing.xl,
  },
});

export default Checkout;
