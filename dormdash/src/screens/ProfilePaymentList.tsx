import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";

type PaymentListNavigationProp = NativeStackNavigationProp<{
  AddPayment: undefined;
}>;

interface Card {
  id: number;
  last4: string;
  type: "mastercard" | "visa";
}

interface PayPalAccount {
  id: number;
  email: string;
}

const PaymentList: React.FC = () => {
  const navigation = useNavigation<PaymentListNavigationProp>();
  const [cards, setCards] = useState<Card[]>([]);
  const [paypalAccounts, setPaypalAccounts] = useState<PayPalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPaymentMethods = async () => {
    // Using mock data for now - will connect to database later
    setCards([
      { id: 1, last4: "4187", type: "mastercard" },
      { id: 2, last4: "9387", type: "mastercard" },
    ]);
    setPaypalAccounts([{ id: 1, email: "Cloth@gmail.com" }]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPaymentMethods();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentMethods();
  };

  const handleCardPress = (card: Card) => {
    alert("Card Details", `Card ending in ${card.last4}`);
  };

  const handlePayPalPress = (account: PayPalAccount) => {
    alert("PayPal Account", account.email);
  };

  const renderMastercardLogo = () => (
    <View style={styles.cardLogoContainer}>
      <View style={[styles.cardCircle, styles.cardCircleRed]} />
      <View style={[styles.cardCircle, styles.cardCircleOrange]} />
    </View>
  );

  const renderCardItem = ({ item }: { item: Card }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => handleCardPress(item)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>**** {item.last4}</Text>
        {renderMastercardLogo()}
      </View>
      <Icon
        name="chevron-right"
        type="material-community"
        color={Colors.mutedGray}
        size={24}
      />
    </TouchableOpacity>
  );

  const renderPayPalItem = ({ item }: { item: PayPalAccount }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => handlePayPalPress(item)}
    >
      <Text style={styles.paypalText}>{item.email}</Text>
      <Icon
        name="chevron-right"
        type="material-community"
        color={Colors.mutedGray}
        size={24}
      />
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: 20 }}
        />
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cards Section */}
        {cards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cards</Text>
            {cards.map((card) => (
              <View key={card.id}>{renderCardItem({ item: card })}</View>
            ))}
          </View>
        )}

        {/* PayPal Section */}
        {paypalAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paypal</Text>
            {paypalAccounts.map((account) => (
              <View key={account.id}>
                {renderPayPalItem({ item: account })}
              </View>
            ))}
          </View>
        )}

        {cards.length === 0 && paypalAccounts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon
              name="credit-card-outline"
              type="material-community"
              color={Colors.lightGray}
              size={80}
            />
            <Text style={styles.emptyText}>No payment methods</Text>
            <Text style={styles.emptySubtext}>
              Add a payment method for faster checkout
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-left"
            type="material-community"
            color={Colors.darkTeal}
            size={32}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Add Payment Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddPayment")}
        >
          <Text style={styles.addButtonText}>Add Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

import { ScrollView } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
  },
  paymentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardText: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "500",
    color: Colors.darkTeal,
    marginRight: Spacing.md,
  },
  cardLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  cardCircle: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.medium, // 8px
  },
  cardCircleRed: {
    backgroundColor: Colors.mastercardRed,
    zIndex: 2,
  },
  cardCircleOrange: {
    backgroundColor: Colors.mastercardOrange,
    marginLeft: -8,
    zIndex: 1,
  },
  paypalText: {
    flex: 1,
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "500",
    color: Colors.darkTeal,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.base_bg,
  },
  addButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium, // 8px
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
    paddingTop: 100,
  },
  emptyText: {
    fontFamily: Typography.heading4.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: Colors.mutedGray,
    textAlign: "center",
  },
});

export default PaymentList;
