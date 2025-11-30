import React, { useState, useEffect, useCallback } from "react";
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
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type PastOrdersNavigationProp = NativeStackNavigationProp<any>;

interface Order {
  id: number;
  listing_title: string;
  order_number: string;
  created_at: string;
  price_cents: number;
}

const PastOrders: React.FC = () => {
  const navigation = useNavigation<PastOrdersNavigationProp>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    // Using mock data for now - will connect to database later
    setOrders([
      {
        id: 1,
        listing_title: "Dining Table",
        order_number: "456765",
        created_at: new Date().toISOString(),
        price_cents: 5000,
      },
      {
        id: 2,
        listing_title: "Used Volleyball Net",
        order_number: "35345",
        created_at: new Date().toISOString(),
        price_cents: 2500,
      },
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.iconContainer}>
        <Icon
          name="heart-outline"
          type="material-community"
          color={Colors.darkTeal}
          size={32}
        />
      </View>
      <View style={styles.orderInfo}>
        <Text style={styles.orderTitle}>{item.listing_title}</Text>
        <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
      </View>
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

    if (orders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon
            name="receipt"
            type="material-community"
            color={Colors.lightGray}
            size={80}
          />
          <Text style={styles.emptyText}>No past orders</Text>
          <Text style={styles.emptySubtext}>
            Your order history will appear here
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
        <Text style={styles.headerTitle}>Past Orders</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,  // 8px
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
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

export default PastOrders;
