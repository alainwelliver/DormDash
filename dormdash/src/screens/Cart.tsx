import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Icon } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import Navbar from "../components/Navbar";

type CartNavigationProp = NativeStackNavigationProp<{
  Checkout: { selectedItems: CartItem[] };
}>;

interface CartItem {
  id: number;
  title: string;
  price_cents: number;
  image_url?: string;
  quantity: number;
}

const Cart: React.FC = () => {
  const navigation = useNavigation<CartNavigationProp>();

  // Mock cart items - in a real app, this would come from context/state management
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      title: "Uniqlo Airism Tee",
      price_cents: 200,
      image_url: undefined,
      quantity: 1,
    },
    {
      id: 2,
      title: "Wooden Nightstand",
      price_cents: 2000,
      image_url: undefined,
      quantity: 1,
    },
    {
      id: 3,
      title: "PSA 10 Charizard VMAX",
      price_cents: 35000,
      image_url: undefined,
      quantity: 1,
    },
  ]);

  const [selectedItems, setSelectedItems] = useState<number[]>([1, 2, 3]);

  const toggleItemSelection = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const updateQuantity = (itemId: number, change: number) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId: number) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setCartItems(cartItems.filter((item) => item.id !== itemId));
            setSelectedItems(selectedItems.filter((id) => id !== itemId));
          },
        },
      ]
    );
  };

  const calculateSubtotal = () => {
    return cartItems
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert(
        "No Items Selected",
        "Please select at least one item to checkout"
      );
      return;
    }

    const itemsToCheckout = cartItems.filter((item) =>
      selectedItems.includes(item.id)
    );
    navigation.navigate("Checkout", { selectedItems: itemsToCheckout });
  };

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
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
            Add items to your cart to get started
          </Text>
        </View>
        <Navbar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

            {/* Item Image */}
            <View style={styles.itemImage}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} />
              ) : (
                <Icon
                  name="image-outline"
                  type="material-community"
                  color={Colors.mutedGray}
                  size={40}
                />
              )}
            </View>

            {/* Item Details */}
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.price_cents)}
              </Text>

              {/* Quantity Controls */}
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

            {/* Remove Button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(item.id)}
            >
              <Icon
                name="trash-can-outline"
                type="material-community"
                color="#EF4444"
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

      <Navbar />
    </SafeAreaView>
  );
};

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
    borderRadius: 14,
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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

export default Cart;
