import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { Colors } from "../assets/styles";
import { alert } from "../lib/utils/platform";

// Only import WebView on native platforms
let WebView: any = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

interface OrderData {
  deliveryMethod: "pickup" | "delivery";
  items: Array<{
    listing_id: number;
    title: string;
    price_cents: number;
    quantity: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  deliveryAddress?: {
    address: string;
    lat?: number;
    lng?: number;
  };
}

type MainStackParamList = {
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
    orderData?: OrderData;
  };
  PaymentSuccess: { orderId?: number } | undefined;
  PaymentFailed: undefined;
};
type PaymentPortalRouteProp = RouteProp<MainStackParamList, "PaymentPortal">;
type PaymentPortalNavigationProp = StackNavigationProp<
  MainStackParamList,
  "PaymentPortal"
>;

type Props = {
  route: PaymentPortalRouteProp;
  navigation: PaymentPortalNavigationProp;
};

const PaymentPortal: React.FC<Props> = ({ route, navigation }) => {
  const { priceCents, listingTitle, orderData } = route.params;
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasHandledRedirectRef = useRef(false);

  // ---------------------------------------------------------
  // NETWORK CONFIGURATION
  // ---------------------------------------------------------
  const CONVEX_SITE_URL = "https://notable-bass-729.convex.site";

  useEffect(() => {
    const fetchCheckoutSession = async () => {
      try {
        // Store pending order ID before redirecting to Stripe
        if (orderData) {
          const orderId = (orderData as any).orderId;
          if (orderId) {
            await AsyncStorage.setItem("pendingOrderId", String(orderId));
          }
          // Also store listing IDs for cart cleanup
          const listingIds = orderData.items.map((item) => item.listing_id);
          await AsyncStorage.setItem(
            "pendingOrderListingIds",
            JSON.stringify(listingIds),
          );
        }

        console.log(
          `Requesting session from: ${CONVEX_SITE_URL}/create-checkout-session`,
        );

        const response = await fetch(
          `${CONVEX_SITE_URL}/create-checkout-session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: listingTitle,
              price: priceCents,
              ...(orderData && (orderData as any).orderId
                ? { orderId: (orderData as any).orderId }
                : {}),
            }),
          },
        );

        const text = await response.text();

        // Safety check: Did the server return HTML (error) instead of JSON?
        if (text.trim().startsWith("<")) {
          console.error("Server returned HTML error:", text);
          throw new Error("Server configuration error (Check backend logs)");
        }

        const data = JSON.parse(text);

        if (data.url) {
          // On web, redirect directly to the checkout URL
          if (Platform.OS === "web") {
            window.location.href = data.url;
          } else {
            setCheckoutUrl(data.url);
          }
        } else {
          alert("Error", "Server failed to generate a Stripe URL");
        }
      } catch (error) {
        console.error("Payment Error:", error);
        alert("Connection Error", "Ensure your Convex server is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutSession();
  }, [listingTitle, priceCents, orderData]);

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (!url || hasHandledRedirectRef.current) return;

    const normalizedUrl = url.toLowerCase();
    const isCancel =
      normalizedUrl.includes("/cancel") ||
      normalizedUrl.includes("payment-failed") ||
      normalizedUrl.includes("cancelled") ||
      normalizedUrl.includes("canceled");

    if (isCancel) {
      hasHandledRedirectRef.current = true;
      navigation.replace("PaymentFailed");
      return;
    }

    const isKnownSuccessPath =
      normalizedUrl.includes("/success") ||
      normalizedUrl.includes("payment-success") ||
      normalizedUrl.includes("redirect_status=succeeded");

    // Some Stripe return configurations may land on the app domain root/feed.
    // If checkout has already left Stripe and comes back to dormdash domains, treat as success.
    const isReturnToAppDomain =
      normalizedUrl.includes("dormdash.xyz") ||
      normalizedUrl.includes("dormdash.pages.dev");

    if (isKnownSuccessPath || isReturnToAppDomain) {
      hasHandledRedirectRef.current = true;
      let orderId: number | undefined;
      try {
        const parsedUrl = new URL(url);
        const orderIdRaw = parsedUrl.searchParams.get("orderId");
        if (orderIdRaw && !Number.isNaN(Number(orderIdRaw))) {
          orderId = Number(orderIdRaw);
        }
      } catch {
        // Ignore parse errors and rely on AsyncStorage fallback in PaymentSuccess.
      }

      navigation.replace("PaymentSuccess", orderId ? { orderId } : undefined);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary_blue} />
        <Text style={{ marginTop: 10 }}>Connecting to Secure Server...</Text>
      </View>
    );
  }

  if (!checkoutUrl) {
    return (
      <View style={styles.center}>
        <Text>Could not load payment page.</Text>
        <Text style={{ color: "red", marginTop: 10 }}>
          Is the backend running?
        </Text>
      </View>
    );
  }

  // On web, we redirect directly, so show loading
  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary_blue} />
        <Text style={{ marginTop: 10 }}>Redirecting to payment...</Text>
      </View>
    );
  }

  // Native platforms use WebView
  return (
    <WebView
      source={{ uri: checkoutUrl }}
      onNavigationStateChange={handleNavigationStateChange}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default PaymentPortal;
