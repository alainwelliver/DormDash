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
    const finalizeOrder = async () => {
      try {
        // 1. Get current user first — we need it for all paths
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.error("No user found");
          setProcessingOrder(false);
          return;
        }

        // 2. Try to get pendingOrderId from AsyncStorage
        let orderId: number | null = null;
        const pendingOrderId = await AsyncStorage.getItem("pendingOrderId");
        if (pendingOrderId) {
          orderId = Number(pendingOrderId);
        }

        // 3. Fallback: if no AsyncStorage key (e.g. cross-origin redirect from Stripe),
        //    find the most recent pending_payment order for this user
        if (!orderId) {
          console.log(
            "No pendingOrderId in AsyncStorage, checking Supabase for recent pending order...",
          );
          const { data: pendingOrder } = await supabase
            .from("orders")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "pending_payment")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (pendingOrder) {
            orderId = pendingOrder.id;
            console.log("Found pending order from Supabase:", orderId);
          }
        }

        if (!orderId) {
          console.warn(
            "No pending order found — may have already been finalized",
          );
          setProcessingOrder(false);
          return;
        }

        // 4. Mark order as paid
        const { error: updateError } = await supabase
          .from("orders")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", orderId)
          .eq("user_id", user.id)
          .eq("status", "pending_payment"); // only update if still pending (idempotent)

        if (updateError) {
          console.error("Error finalizing order:", updateError);
        } else {
          console.log("Order finalized successfully:", orderId);
        }

        // 5. Clear cart items for the ordered listings
        //    Get listing IDs from AsyncStorage or from the order_items table
        let listingIds: number[] = [];
        const listingIdsStr = await AsyncStorage.getItem(
          "pendingOrderListingIds",
        );
        if (listingIdsStr) {
          listingIds = JSON.parse(listingIdsStr);
        } else {
          // Fallback: read listing IDs from order_items
          const { data: items } = await supabase
            .from("order_items")
            .select("listing_id")
            .eq("order_id", orderId);
          if (items) {
            listingIds = items.map((i: any) => i.listing_id);
          }
        }

        if (listingIds.length > 0) {
          await supabase
            .from("cart_items")
            .delete()
            .eq("user_id", user.id)
            .in("listing_id", listingIds);
          console.log("Cart cleared for listings:", listingIds);
        }

        // 6. If delivery, also create a delivery_orders record for the dasher flow
        const { data: orderData } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", orderId)
          .single();

        if (orderData && orderData.delivery_method === "delivery") {
          const firstItem = orderData.order_items?.[0];
          if (firstItem) {
            // Look up seller from listing
            const { data: listing } = await supabase
              .from("listings")
              .select("user_id, pickup_address")
              .eq("id", firstItem.listing_id)
              .single();

            if (listing) {
              const orderNumber = `DD${Date.now().toString(36).toUpperCase()}`;
              await supabase.from("delivery_orders").insert({
                order_number: orderNumber,
                buyer_id: user.id,
                seller_id: listing.user_id,
                listing_id: firstItem.listing_id,
                listing_title: firstItem.title,
                subtotal_cents: orderData.subtotal_cents,
                tax_cents: orderData.tax_cents,
                delivery_fee_cents: orderData.delivery_fee_cents,
                total_cents: orderData.total_cents,
                pickup_address: listing.pickup_address || "Seller location",
                delivery_address:
                  orderData.delivery_address || "Buyer location",
                status: "pending",
              });
            }
          }
        }

        // 7. Clean up AsyncStorage
        await AsyncStorage.removeItem("pendingOrderId");
        await AsyncStorage.removeItem("pendingOrderListingIds");
        await AsyncStorage.removeItem("pendingDeliveryOrder");
      } catch (error) {
        console.error("Error processing order:", error);
      } finally {
        setProcessingOrder(false);
      }
    };

    finalizeOrder();
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
