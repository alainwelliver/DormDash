import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Icon } from "@rneui/themed";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing } from "../assets/styles";

type RootStackParamList = {
  Profile: { direction?: "left" | "right" } | undefined;
  Feed: { direction?: "left" | "right" } | undefined;
  Cart: { direction?: "left" | "right" } | undefined;
};

type NavbarNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Navbar: React.FC = () => {
  const navigation = useNavigation<NavbarNavigationProp>();
  const route = useRoute();
  const currentRoute = route.name;

  // LEFT → CENTER → RIGHT layout
  const tabs = [
    { name: "Profile", icon: "account", type: "material-community" },
    { name: "Feed", icon: "home", type: "material-community" },
    { name: "Cart", icon: "cart", type: "material-community" },
  ];

  const currentIndex = tabs.findIndex((t) => t.name === currentRoute);

  const handleNavigate = (target: string) => {
    const targetIndex = tabs.findIndex((t) => t.name === target);

    const direction = targetIndex < currentIndex ? "left" : "right";

    navigation.navigate(
      target as keyof RootStackParamList,
      { direction } as any
    );
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentRoute === tab.name;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleNavigate(tab.name)}
          >
            <Icon
              name={tab.icon}
              type={tab.type}
              color={isActive ? Colors.primary_blue : Colors.mutedGray}
              size={28}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.name}
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
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
    gap: Spacing.xl,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "500",
    color: Colors.mutedGray,
    marginTop: 4,
  },
  tabLabelActive: {
    color: Colors.primary_blue,
    fontWeight: "600",
  },
});

export default Navbar;
