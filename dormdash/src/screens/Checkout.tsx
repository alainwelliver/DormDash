import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Icon } from "@rneui/themed";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import type { DeliveryType } from "../types/order";

type CheckoutNavigationProp = NativeStackNavigationProp<{
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
    deliveryType: DeliveryType;
    deliveryAddress: string;
  };
}>;

interface CartItem {
  id: number;
  listing_id?: number;
  title: string;
  price_cents: number;
  quantity: number;
  delivery_available?: boolean;
  pickup_available?: boolean;
  pickup_address?: string;
}

interface RouteParams {
  selectedItems: CartItem[];
}

const Checkout: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigationProp>();
  const route = useRoute();
  const { selectedItems } = (route.params as RouteParams) || {
    selectedItems: [],
  };

  const [selectedAddress, setSelectedAddress] = useState(
    "Gutmann College House"
  );
  const [selectedPayment, setSelectedPayment] = useState("**** 4187");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");

  // Check what delivery options are available
  const deliveryAvailable = selectedItems.every(
    (item) => item.delivery_available !== false
  );
  const pickupAvailable = selectedItems.every(
    (item) => item.pickup_available !== false
  );

  const calculateSubtotal = () => {
    return selectedItems.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0
    );
  };

  const calculateTax = () => {
    return Math.round(calculateSubtotal() * 0.08); // 8% tax
  };

  const calculateDeliveryFee = () => {
    return deliveryType === "delivery" ? 299 : 0; // $2.99 delivery fee
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
    Alert.alert(
      "Place Order",
      `Total: ${formatPrice(calculateTotal())}\n${deliveryType === "pickup" ? "Pickup" : "Delivery"} order\n\nProceed with payment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            navigation.navigate("PaymentPortal", {
              priceCents: calculateTotal(),
              listingTitle: `Order (${selectedItems.length} items)`,
              deliveryType,
              deliveryAddress: selectedAddress,
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Delivery Type Selection */}
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
          <View style={styles.deliveryTypeContainer}>
            <TouchableOpacity
              style={[
                styles.deliveryTypeOption,
                deliveryType === "delivery" && styles.deliveryTypeOptionSelected,
                !deliveryAvailable && styles.deliveryTypeOptionDisabled,
              ]}
              onPress={() => deliveryAvailable && setDeliveryType("delivery")}
              disabled={!deliveryAvailable}
            >
              <Icon
                name="truck-delivery"
                type="material-community"
                color={
                  deliveryType === "delivery"
                    ? Colors.white
                    : !deliveryAvailable
                      ? Colors.mutedGray
                      : Colors.darkTeal
                }
                size={24}
              />
              <Text
                style={[
                  styles.deliveryTypeText,
                  deliveryType === "delivery" && styles.deliveryTypeTextSelected,
                  !deliveryAvailable && styles.deliveryTypeTextDisabled,
                ]}
              >
                Delivery
              </Text>
              {deliveryType === "delivery" && (
                <Text style={styles.deliveryTypeFee}>+$2.99</Text>
              )}
              {!deliveryAvailable && (
                <Text style={styles.unavailableText}>Unavailable</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryTypeOption,
                deliveryType === "pickup" && styles.deliveryTypeOptionSelected,
                !pickupAvailable && styles.deliveryTypeOptionDisabled,
              ]}
              onPress={() => pickupAvailable && setDeliveryType("pickup")}
              disabled={!pickupAvailable}
            >
              <Icon
                name="walk"
                type="material-community"
                color={
                  deliveryType === "pickup"
                    ? Colors.white
                    : !pickupAvailable
                      ? Colors.mutedGray
                      : Colors.darkTeal
                }
                size={24}
              />
              <Text
                style={[
                  styles.deliveryTypeText,
                  deliveryType === "pickup" && styles.deliveryTypeTextSelected,
                  !pickupAvailable && styles.deliveryTypeTextDisabled,
                ]}
              >
                Pickup
              </Text>
              {deliveryType === "pickup" && (
                <Text style={styles.deliveryTypeFee}>Free</Text>
              )}
              {!pickupAvailable && (
                <Text style={styles.unavailableText}>Unavailable</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name={deliveryType === "pickup" ? "store" : "map-marker"}
              type="material-community"
              color={Colors.primary_blue}
              size={24}
            />
            <Text style={styles.sectionTitle}>
              {deliveryType === "pickup" ? "Pickup Location" : "Delivery Address"}
            </Text>
          </View>
          <TouchableOpacity style={styles.selectionCard}>
            <View style={styles.selectionContent}>
              <Text style={styles.selectionText}>
                {deliveryType === "pickup"
                  ? selectedItems[0]?.pickup_address || "Seller's location"
                  : selectedAddress}
              </Text>
              <Text style={styles.selectionSubtext}>
                {deliveryType === "pickup"
                  ? "You'll pick up the item here"
                  : "Default address"}
              </Text>
            </View>
            {deliveryType === "delivery" && (
              <Icon
                name="chevron-right"
                type="material-community"
                color={Colors.mutedGray}
                size={24}
              />
            )}
          </TouchableOpacity>
        </View>

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

        {/* Payment Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name="credit-card"
              type="material-community"
              color={Colors.primary_blue}
              size={24}
            />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <TouchableOpacity style={styles.selectionCard}>
            <View style={styles.selectionContent}>
              <View style={styles.paymentMethod}>
                <View style={styles.cardLogoContainer}>
                  <View style={[styles.cardCircle, styles.cardCircleRed]} />
                  <View style={[styles.cardCircle, styles.cardCircleOrange]} />
                </View>
                <Text style={styles.selectionText}>{selectedPayment}</Text>
              </View>
            </View>
            <Icon
              name="chevron-right"
              type="material-community"
              color={Colors.mutedGray}
              size={24}
            />
          </TouchableOpacity>
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
            {deliveryType === "delivery" && (
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
          <View>
            <Text style={styles.bottomLabel}>Total Amount</Text>
            <Text style={styles.bottomDeliveryType}>
              {deliveryType === "pickup" ? "Pickup" : "Delivery"}
            </Text>
          </View>
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
  deliveryTypeContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  deliveryTypeOption: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  deliveryTypeOptionSelected: {
    backgroundColor: Colors.primary_blue,
    borderColor: Colors.primary_blue,
  },
  deliveryTypeOptionDisabled: {
    opacity: 0.5,
  },
  deliveryTypeText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.sm,
  },
  deliveryTypeTextSelected: {
    color: Colors.white,
  },
  deliveryTypeTextDisabled: {
    color: Colors.mutedGray,
  },
  deliveryTypeFee: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.white,
    marginTop: 4,
    opacity: 0.8,
  },
  unavailableText: {
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 4,
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
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  cardCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  cardCircleRed: {
    backgroundColor: "#EB001B",
    zIndex: 2,
  },
  cardCircleOrange: {
    backgroundColor: "#F79E1B",
    marginLeft: -8,
    zIndex: 1,
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
    backgroundColor: Colors.base_bg,
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
  bottomDeliveryType: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 2,
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
});

export default Checkout;
