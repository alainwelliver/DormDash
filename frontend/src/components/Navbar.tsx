import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Home, Search, ShoppingCart, User } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing } from "../assets/styles";

type NavbarNavigationProp = NativeStackNavigationProp<{
  Feed: undefined;
  Explore: undefined;
  Cart: undefined;
  Profile: undefined;
}>;

const iconMap = {
  Feed: Home,
  Explore: Search,
  Cart: ShoppingCart,
  Profile: User,
};

const Navbar: React.FC = () => {
  const navigation = useNavigation<NavbarNavigationProp>();
  const route = useRoute();
  const currentRoute = route.name;
  const insets = useSafeAreaInsets();

  const tabs = ["Feed", "Explore", "Cart", "Profile"] as const;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: (insets.bottom || 0) + Spacing.md },
      ]}
    >
      {tabs.map((tabName) => {
        const isActive = currentRoute === tabName;
        const IconComponent = iconMap[tabName];
        return (
          <TouchableOpacity
            key={tabName}
            style={styles.tab}
            onPress={() => navigation.navigate(tabName as any)}
          >
            <IconComponent
              color={isActive ? Colors.primary_blue : Colors.mutedGray}
              size={28}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tabName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    minWidth: 50,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "500",
    color: Colors.mutedGray,
    marginTop: 4,
    textAlign: "center",
    flexShrink: 0,
  },
  tabLabelActive: {
    color: Colors.primary_blue,
    fontWeight: "600",
  },
});

export default Navbar;
