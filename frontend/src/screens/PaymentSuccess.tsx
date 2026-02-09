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
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";

type Props = {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
};

const PaymentSuccess: React.FC<Props> = ({ navigation, route }) => {
  const [processingOrder, setProcessingOrder] = useState(true);

  useEffect(() => {
    const finalizeOrder = async () => {
      try {
        // 1. Wait for auth session to be ready (critical after Stripe redirect)
        let user = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            user = session.user;
            break;
          }
          // Wait before retrying — session may still be loading from storage
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (!user) {
          // Final attempt with getUser()
          const {
            data: { user: lastTry },
          } = await supabase.auth.getUser();
          user = lastTry;
        }
        if (!user) {
          console.error("No user found after retries");
          setProcessingOrder(false);
          return;
        }

        // 2. Resolve orderId from multiple sources (in priority order)
        let orderId: number | null = null;

        // 2a. URL query param (most reliable — embedded in Stripe success_url)
        if (Platform.OS === "web") {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const urlOrderId = urlParams.get("orderId");
            if (urlOrderId) {
              orderId = Number(urlOrderId);
              console.log("Got orderId from URL:", orderId);
            }
          } catch {
            // URL parsing failed, continue to fallbacks
          }
        }

        // 2b. Route params (React Navigation parses query params into route.params)
        if (!orderId && route.params) {
          const routeOrderId = (route.params as any).orderId;
          if (routeOrderId) {
            orderId = Number(routeOrderId);
            console.log("Got orderId from route params:", orderId);
          }
        }

        // 2c. AsyncStorage (set before Stripe redirect)
        if (!orderId) {
          const pendingOrderId = await AsyncStorage.getItem("pendingOrderId");
          if (pendingOrderId) {
            orderId = Number(pendingOrderId);
            console.log("Got orderId from AsyncStorage:", orderId);
          }
        }

        // 2d. Fallback: find the most recent pending_payment order
        if (!orderId) {
          console.log(
            "No orderId from URL/storage, checking Supabase for recent pending order...",
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

        // 3. Mark order as paid
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

        // 4. Clear cart items for the ordered listings
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

        // 5. If delivery, create delivery_orders records for the dasher flow
        const { data: orderData } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (orderData && orderData.delivery_method === "delivery") {
          // Check if delivery orders already exist for this order (idempotency)
          const { data: existingDelivery } = await supabase
            .from("delivery_orders")
            .select("id")
            .eq("order_id", orderId)
            .limit(1);

          if (existingDelivery && existingDelivery.length > 0) {
            console.log("Delivery orders already exist for order:", orderId);
          } else {
            // Fetch order items separately to avoid RLS join issues
            const { data: orderItems } = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", orderId);

            if (orderItems && orderItems.length > 0) {
              // Get unique listing IDs to look up sellers
              const uniqueListingIds = [
                ...new Set(orderItems.map((item: any) => item.listing_id)),
              ];

              const { data: listings } = await supabase
                .from("listings")
                .select("id, user_id, pickup_address, pickup_lat, pickup_lng")
                .in("id", uniqueListingIds);

              const listingMap = new Map(
                (listings || []).map((l: any) => [l.id, l]),
              );

              // Group items by seller
              const sellerGroups = new Map<
                string,
                { items: any[]; listing: any }
              >();
              for (const item of orderItems) {
                const listing = listingMap.get(item.listing_id);
                if (!listing) continue;
                const sellerId = listing.user_id;
                if (!sellerGroups.has(sellerId)) {
                  sellerGroups.set(sellerId, { items: [], listing });
                }
                sellerGroups.get(sellerId)!.items.push(item);
              }

              // Create one delivery order per seller
              for (const [sellerId, group] of sellerGroups) {
                const itemTitles = group.items
                  .map((i: any) => i.title)
                  .join(", ");
                const orderNumber = `DD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

                const { error: deliveryError } = await supabase
                  .from("delivery_orders")
                  .insert({
                    order_id: orderId,
                    order_number: orderNumber,
                    buyer_id: user.id,
                    seller_id: sellerId,
                    listing_id: group.items[0].listing_id,
                    listing_title: itemTitles,
                    subtotal_cents: orderData.subtotal_cents,
                    tax_cents: orderData.tax_cents,
                    delivery_fee_cents: orderData.delivery_fee_cents,
                    total_cents: orderData.total_cents,
                    pickup_address:
                      group.listing.pickup_address || "Seller location",
                    pickup_lat: group.listing.pickup_lat || null,
                    pickup_lng: group.listing.pickup_lng || null,
                    delivery_address:
                      orderData.delivery_address || "Buyer location",
                    status: "pending",
                  });

                if (deliveryError) {
                  console.error(
                    "Error creating delivery order for seller",
                    sellerId,
                    deliveryError,
                  );
                } else {
                  console.log(
                    "Delivery order created for seller:",
                    sellerId,
                    "order:",
                    orderId,
                  );
                }
              }
            } else {
              console.warn(
                "No order items found for delivery order creation, orderId:",
                orderId,
              );
            }
          }
        }

        // 6. Clean up AsyncStorage
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
