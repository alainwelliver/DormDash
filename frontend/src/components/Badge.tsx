import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type BadgeVariant =
  | "new"
  | "sale"
  | "featured"
  | "sold"
  | "info"
  | "success"
  | "warning";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "info",
  size = "sm",
  style,
  textStyle,
}) => {
  const getVariantStyle = (): { bg: string; text: string } => {
    const variants: Record<BadgeVariant, { bg: string; text: string }> = {
      new: { bg: Colors.primary_blue, text: Colors.white },
      sale: { bg: Colors.error, text: Colors.white },
      featured: { bg: Colors.primary_green, text: Colors.white },
      sold: { bg: Colors.mutedGray, text: Colors.white },
      info: { bg: Colors.lightMint, text: Colors.secondary },
      success: { bg: Colors.lightMint, text: Colors.primary_green },
      warning: { bg: "#FFF3CD", text: "#856404" },
    };
    return variants[variant];
  };

  const variantColors = getVariantStyle();

  const sizeStyles = {
    sm: {
      paddingVertical: 2,
      paddingHorizontal: Spacing.sm,
      fontSize: 10,
    },
    md: {
      paddingVertical: 4,
      paddingHorizontal: Spacing.md,
      fontSize: 12,
    },
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantColors.bg,
          paddingVertical: sizeStyles[size].paddingVertical,
          paddingHorizontal: sizeStyles[size].paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: variantColors.text,
            fontSize: sizeStyles[size].fontSize,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.small,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default Badge;
