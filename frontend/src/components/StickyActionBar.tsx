import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Shadows, Spacing } from "../assets/styles";

interface StickyActionBarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const StickyActionBar: React.FC<StickyActionBarProps> = ({
  children,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom:
            Platform.OS === "ios"
              ? Math.max(insets.bottom, Spacing.md)
              : Spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
    left: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    position: "absolute",
    right: 0,
    ...Shadows.md,
  },
});

export default StickyActionBar;
