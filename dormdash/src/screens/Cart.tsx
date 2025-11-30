// =============================
//      CART.TSX (FINAL)
//   Supabase-Connected Cart
// =============================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type CartNavigationProp = NativeStackNavigationProp<{
  Checkout: { selectedItems: CartItem[] };
}>;

interface CartItem {
  id: number; // cart_items table id
  listing_id: number;
  title: string;
  price_cents: number;
  image_url?: string | null;
  quantity: number;
}

const Cart: React.FC = () => {
  const navigation = useNavigation<CartNavigationProp>();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch cart items from Supabase
  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    setLoading(true);

    // Get current user
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        id,
        listing_id,
        quantity,
        listings (
          id,
          title,
          price_cents,
          listing_images ( url )
        )
      `,
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading cart:", error);
      setLoading(false);
      return;
    }

    const formatted = data.map((item: any) => ({
      id: item.id,
      listing_id: item.listing_id,
      title: item.listings.title,
      price_cents: item.listings.price_cents,
      quantity: item.quantity,
      image_url: item.listings.listing_images?.[0]?.url ?? null,
    }));

    setCartItems(formatted);
    setSelectedItems(formatted.map((i) => i.id));
    setLoading(false);
  };

  // Toggle select/unselect item
  const toggleItemSelection = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  // Update quantity in Supabase
  const updateQuantity = async (cartItemId: number, change: number) => {
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) return;

    const newQty = Math.max(1, item.quantity + change);

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", cartItemId);

    if (error) {
      console.error("Error updating quantity:", error);
      return;
    }

    setCartItems(
      cartItems.map((i) =>
        i.id === cartItemId ? { ...i, quantity: newQty } : i,
      ),
    );
  };

  // Remove item from Supabase
  const removeItem = (cartItemId: number) => {
    Alert.alert("Remove Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await supabase.from("cart_items").delete().eq("id", cartItemId);

          setCartItems(cartItems.filter((i) => i.id !== cartItemId));
          setSelectedItems(selectedItems.filter((id) => id !== cartItemId));
        },
      },
    ]);
  };

  const calculateSubtotal = () => {
    return cartItems
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select at least one item.");
      return;
    }

    const itemsToCheckout = cartItems.filter((item) =>
      selectedItems.includes(item.id),
    );

    navigation.navigate("Checkout", { selectedItems: itemsToCheckout });
  };

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  // Empty Cart
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Icon
            name="cart-outline"
            type="material-community"
            color={Colors.lightGray}
            size={100}
          />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>
            Add items to your cart to get started.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main Cart UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.itemCount}>
          {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Cart Items */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {cartItems.map((item) => (
          <View key={item.id} style={styles.cartItemCard}>
            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleItemSelection(item.id)}
            >
              <Icon
                name={
                  selectedItems.includes(item.id)
                    ? "checkbox-marked"
                    : "checkbox-blank-outline"
                }
                type="material-community"
                color={
                  selectedItems.includes(item.id)
                    ? Colors.primary_blue
                    : Colors.mutedGray
                }
                size={20}
              />
            </TouchableOpacity>

            {/* Image */}
            <View style={styles.itemImage}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} />
              ) : (
                <Icon
                  name="image-outline"
                  type="material-community"
                  size={40}
                  color={Colors.mutedGray}
                />
              )}
            </View>

            {/* Details */}
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.price_cents)}
              </Text>

              {/* Quantity */}
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, -1)}
                >
                  <Icon
                    name="minus"
                    type="material-community"
                    color={Colors.darkTeal}
                    size={18}
                  />
                </TouchableOpacity>

                <Text style={styles.quantityText}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, 1)}
                >
                  <Icon
                    name="plus"
                    type="material-community"
                    color={Colors.darkTeal}
                    size={18}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remove */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(item.id)}
            >
              <Icon
                name="trash-can-outline"
                type="material-community"
                color={Colors.error}
                size={24}
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Checkout Summary */}
      <View style={styles.checkoutContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Subtotal ({selectedItems.length} item
            {selectedItems.length !== 1 ? "s" : ""})
          </Text>
          <Text style={styles.summaryValue}>
            {formatPrice(calculateSubtotal())}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            selectedItems.length === 0 && styles.checkoutButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={selectedItems.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
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

export default Cart;

// --------------------
//     STYLES (same)
// --------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Typography.heading3.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  itemCount: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 200,
  },
  cartItemCard: {
    flexDirection: "row",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  checkbox: {
    marginRight: Spacing.xs,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.medium,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: 4,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
    marginBottom: Spacing.sm,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  quantityButton: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.medium,  // 8px (was 14)
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  quantityText: {
    fontSize: 15,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginHorizontal: Spacing.md,
    minWidth: 30,
    textAlign: "center",
  },
  removeButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  checkoutContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  checkoutButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.mutedGray,
    opacity: 0.5,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    color: Colors.white,
    marginRight: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
  },
  emptyText: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
  },
});
