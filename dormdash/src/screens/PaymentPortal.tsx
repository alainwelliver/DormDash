import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import type { RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { Colors } from "../assets/styles";
import { alert } from "../lib/utils/platform";

// Only import WebView on native platforms
let WebView: any = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

type MainStackParamList = {
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
  };
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
  const { priceCents, listingTitle } = route.params;
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------
  // NETWORK CONFIGURATION
  // ---------------------------------------------------------
  const CONVEX_SITE_URL = "https://notable-bass-729.convex.site";

  useEffect(() => {
    const fetchCheckoutSession = async () => {
      try {
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
              price: priceCents, // This requires a server to process safely
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
  }, [listingTitle, priceCents]);

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    // Handle redirects from Stripe
    if (url.includes("/success")) {
      navigation.replace("PaymentSuccess" as any);
    } else if (url.includes("/cancel")) {
      navigation.replace("PaymentFailed" as any);
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
