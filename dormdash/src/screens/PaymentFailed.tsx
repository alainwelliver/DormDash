import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { XCircle, Info, RefreshCw, Home } from "lucide-react-native";
import type { NavigationProp } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";
import { alert } from "../lib/utils/platform";

type Props = {
  navigation: NavigationProp<any>;
};

const TAX_RATE = 0.08; // 8% tax

const PaymentFailed: React.FC<Props> = ({ navigation }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleTryAgain = async () => {
    setIsRetrying(true);
    try {
      // Get current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        alert("Error", "Please log in to retry payment");
        setIsRetrying(false);
        return;
      }

      // Fetch cart items
      const { data: cartData, error: cartError } = await supabase
        .from("cart_items")
        .select(
          `
          id,
          quantity,
          listings (
            id,
            title,
            price_cents
          )
        `,
        )
        .eq("user_id", userId);

      if (cartError) {
        throw cartError;
      }

      if (!cartData || cartData.length === 0) {
        alert("Empty Cart", "Your cart is empty. Add items to checkout.");
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs", params: { screen: "CartTab" } }],
        });
        return;
      }

      // Calculate totals
      const subtotal = cartData.reduce((sum: number, item: any) => {
        return sum + item.listings.price_cents * item.quantity;
      }, 0);
      const tax = Math.round(subtotal * TAX_RATE);
      const total = subtotal + tax;
      const itemCount = cartData.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
      );

      // Navigate to payment portal
      navigation.navigate(
        "PaymentPortal" as never,
        {
          priceCents: total,
          listingTitle: `Order (${itemCount} item${itemCount !== 1 ? "s" : ""})`,
        } as never,
      );
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      alert("Error", "Failed to process. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

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

  const handleContactSupport = () => {
    // You could navigate to a support page or open an email client
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "ProfileTab" } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Failed Icon */}
        <View style={styles.iconContainer}>
          <XCircle size={120} color="#EF4444" />
        </View>

        {/* Failed Message */}
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.subtitle}>
          Your payment was not completed. Don't worry, no charges were made to
          your account.
        </Text>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Info size={24} color="#F59E0B" />
          <Text style={styles.infoText}>
            Your items are still in your cart. You can try again whenever you're
            ready.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isRetrying && styles.primaryButtonDisabled,
            ]}
            onPress={handleTryAgain}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <RefreshCw
                  size={20}
                  color={Colors.white}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoHome}
          >
            <Home
              size={20}
              color={Colors.primary_blue}
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            onPress={handleContactSupport}
          >
            <Text style={styles.textButtonText}>
              Need help? Contact Support
            </Text>
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
    backgroundColor: "#FFFBEB",
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.xxl,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
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
    backgroundColor: Colors.primary_blue,
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
  primaryButtonDisabled: {
    opacity: 0.7,
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
  textButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  textButtonText: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    textDecorationLine: "underline",
  },
});

export default PaymentFailed;
