import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Alert,
  Platform,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type { RouteProp, NavigationProp } from "@react-navigation/native";
import { Colors } from "../assets/styles";

type MainStackParamList = {
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
  };
};

type PaymentPortalRouteProp = RouteProp<MainStackParamList, "PaymentPortal">;
type PaymentPortalNavigationProp = NavigationProp<
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
  // You MUST run a separate node server for this to work.
  // 10.0.2.2 is the Android Emulator's way of reaching your computer's localhost.
  const LOCAL_SERVER_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:4242"
      : "http://localhost:4242";

  useEffect(() => {
    const fetchCheckoutSession = async () => {
      try {
        console.log(
          `Requesting session from: ${LOCAL_SERVER_URL}/create-checkout-session`
        );

        const response = await fetch(
          `${LOCAL_SERVER_URL}/create-checkout-session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: listingTitle,
              price: priceCents, // This requires a server to process safely
            }),
          }
        );

        const text = await response.text();

        // Safety check: Did the server return HTML (error) instead of JSON?
        if (text.trim().startsWith("<")) {
          console.error("Server returned HTML error:", text);
          throw new Error("Server configuration error (Check backend logs)");
        }

        const data = JSON.parse(text);

        if (data.url) {
          setCheckoutUrl(data.url);
        } else {
          Alert.alert("Error", "Server failed to generate a Stripe URL");
        }
      } catch (error) {
        console.error("Payment Error:", error);
        Alert.alert(
          "Connection Error",
          "Ensure your Node server is running on port 4242."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutSession();
  }, [listingTitle, priceCents]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
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
