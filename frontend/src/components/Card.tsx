import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from "react-native";
import { Colors, BorderRadius, Spacing } from "../assets/styles";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined" | "filled";
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  disabled?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  onPress,
  style,
  contentStyle,
  disabled = false,
}) => {
  const isWeb = Platform.OS === "web";

  const getVariantStyle = (): ViewStyle => {
    const variants: Record<string, ViewStyle> = {
      default: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.lightGray,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
      elevated: {
        backgroundColor: Colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      },
      outlined: {
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.borderGray,
      },
      filled: {
        backgroundColor: Colors.lightMint,
        borderWidth: 0,
      },
    };
    return variants[variant] || variants.default;
  };

  const cardStyle = [
    styles.card,
    getVariantStyle(),
    onPress && isWeb && { cursor: "pointer" as any },
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Card;
