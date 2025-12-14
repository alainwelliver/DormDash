import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
}) => {
  const isWeb = Platform.OS === "web";
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.medium,
      gap: Spacing.sm,
    };

    // Size styles
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      sm: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
      },
      md: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
      },
      lg: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
      },
    };

    // Variant styles
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: isDisabled ? Colors.borderGray : Colors.primary_blue,
      },
      secondary: {
        backgroundColor: isDisabled ? Colors.borderGray : Colors.primary_green,
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: isDisabled ? Colors.borderGray : Colors.primary_blue,
      },
      ghost: {
        backgroundColor: "transparent",
      },
      danger: {
        backgroundColor: isDisabled ? Colors.borderGray : Colors.error,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: "100%" }),
      ...(isWeb && ({ cursor: isDisabled ? "not-allowed" : "pointer" } as any)),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: Typography.buttonText.fontFamily,
      fontWeight: Typography.buttonText.fontWeight,
      letterSpacing: Typography.buttonText.letterSpacing,
    };

    const sizeStyles: Record<ButtonSize, TextStyle> = {
      sm: { fontSize: 12 },
      md: { fontSize: 14 },
      lg: { fontSize: 16 },
    };

    const variantStyles: Record<ButtonVariant, TextStyle> = {
      primary: { color: Colors.white },
      secondary: { color: Colors.white },
      outline: { color: isDisabled ? Colors.borderGray : Colors.primary_blue },
      ghost: { color: isDisabled ? Colors.mutedGray : Colors.primary_blue },
      danger: { color: Colors.white },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getLoaderColor = (): string => {
    if (variant === "outline" || variant === "ghost") {
      return Colors.primary_blue;
    }
    return Colors.white;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor()} />
      ) : (
        <>
          {icon && iconPosition === "left" && icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {icon && iconPosition === "right" && icon}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
