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
          const { data: rpcRows, error: rpcError } = await supabase.rpc(
            "create_delivery_orders_for_order",
            { p_order_id: orderId },
          );

          if (rpcError) {
            console.error(
              "Failed to create delivery orders via RPC for order:",
              orderId,
              rpcError,
            );
          } else {
            console.log(
              "Delivery orders created via RPC for order:",
              orderId,
              "count:",
              Array.isArray(rpcRows) ? rpcRows.length : 0,
            );
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
    backgroundColor: Colors.lightMint,
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
