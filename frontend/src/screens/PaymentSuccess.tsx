import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCircle, Mail, Home, Receipt } from "lucide-react-native";
import type { NavigationProp } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";

type Props = {
  navigation: NavigationProp<any>;
};

const PaymentSuccess: React.FC<Props> = ({ navigation }) => {
  const [processingOrder, setProcessingOrder] = useState(true);

  useEffect(() => {
    const createDeliveryOrder = async () => {
      try {
        // Retrieve pending order from AsyncStorage
        const pendingOrderStr = await AsyncStorage.getItem("pendingDeliveryOrder");
        if (!pendingOrderStr) {
          setProcessingOrder(false);
          return;
        }

        const orderData = JSON.parse(pendingOrderStr);

        // Only create delivery order if delivery method was selected
        if (orderData.deliveryMethod !== "delivery") {
          await AsyncStorage.removeItem("pendingDeliveryOrder");
          setProcessingOrder(false);
          return;
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("No user found");
          setProcessingOrder(false);
          return;
        }

        // Get seller info from the first item's listing
        const firstItem = orderData.items[0];
        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .select("user_id, pickup_address")
          .eq("id", firstItem.listing_id)
          .single();

        if (listingError || !listing) {
          console.error("Error fetching listing:", listingError);
          setProcessingOrder(false);
          return;
        }

        // Generate order number
        const orderNumber = `DD${Date.now().toString(36).toUpperCase()}`;

        // Create delivery order
        const { error: insertError } = await supabase
          .from("delivery_orders")
          .insert({
            order_number: orderNumber,
            buyer_id: user.id,
            seller_id: listing.user_id,
            listing_id: firstItem.listing_id,
            listing_title: firstItem.title,
            subtotal_cents: orderData.subtotalCents,
            tax_cents: orderData.taxCents,
            delivery_fee_cents: orderData.deliveryFeeCents,
            total_cents: orderData.subtotalCents + orderData.taxCents + orderData.deliveryFeeCents,
            pickup_address: listing.pickup_address || "Seller location",
            delivery_address: orderData.deliveryAddress?.address || "Buyer location",
            status: "pending",
          });

        if (insertError) {
          console.error("Error creating delivery order:", insertError);
        } else {
          console.log("Delivery order created successfully:", orderNumber);

          // Clear cart items for the ordered listings
          const listingIds = orderData.items.map((item: any) => item.listing_id);
          await supabase
            .from("cart_items")
            .delete()
            .eq("user_id", user.id)
            .in("listing_id", listingIds);
        }

        // Clear pending order from AsyncStorage
        await AsyncStorage.removeItem("pendingDeliveryOrder");
      } catch (error) {
        console.error("Error processing order:", error);
      } finally {
        setProcessingOrder(false);
      }
    };

    createDeliveryOrder();
  }, []);

  const handleGoHome = () => {
    if (Platform.OS === "web") {
      window.location.href = "/feed";
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "FeedTab" } }],
      });
    }
  };

  const handleViewOrders = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }, { name: "PastOrders" }],
    });
  };

  if (processingOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={Colors.primary_green} />
          <Text style={[styles.subtitle, { marginTop: Spacing.lg }]}>
            Processing your order...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <CheckCircle size={120} color={Colors.primary_green} />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Thank you for your purchase. Your order has been confirmed and is
          being processed.
        </Text>

        {/* Order Info */}
        <View style={styles.infoBox}>
          <Mail size={24} color={Colors.primary_blue} />
          <Text style={styles.infoText}>
            A confirmation email will be sent to your registered email address.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
            <Home
              size={20}
              color={Colors.white}
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewOrders}
          >
            <Receipt
              size={20}
              color={Colors.primary_blue}
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={styles.secondaryButtonText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.heading2,
    color: Colors.darkTeal,
    textAlign: "center",
    marginBottom: Spacing.md,
    fontWeight: "700",
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.xxl,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary_blue,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.darkTeal,
    marginLeft: Spacing.md,
    flex: 1,
  },
  buttonContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary_green,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryButtonText: {
    ...Typography.bodyLarge,
    color: Colors.white,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary_blue,
  },
  secondaryButtonText: {
    ...Typography.bodyLarge,
    color: Colors.primary_blue,
    fontWeight: "600",
  },
});

export default PaymentSuccess;
