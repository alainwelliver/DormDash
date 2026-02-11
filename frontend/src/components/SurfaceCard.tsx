import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  BorderRadius,
  Colors,
  SemanticColors,
  Shadows,
  Spacing,
} from "../assets/styles";

type SurfaceVariant = "default" | "glass" | "mint" | "outlined";

interface SurfaceCardProps {
  children: React.ReactNode;
  variant?: SurfaceVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}

const getVariantStyle = (variant: SurfaceVariant): ViewStyle => {
  if (variant === "glass") {
    return {
      backgroundColor: SemanticColors.surfaceGlass,
      borderColor: Colors.glass_border,
      borderWidth: 1,
      ...Shadows.md,
    };
  }

  if (variant === "mint") {
    return {
      backgroundColor: Colors.lightMint,
      borderColor: Colors.lightMint,
      borderWidth: 1,
    };
  }

  if (variant === "outlined") {
    return {
      backgroundColor: SemanticColors.surfaceCard,
      borderColor: SemanticColors.borderStrong,
      borderWidth: 1,
    };
  }

  return {
    backgroundColor: SemanticColors.surfaceCard,
    borderColor: SemanticColors.borderSubtle,
    borderWidth: 1,
    ...Shadows.sm,
  };
};

const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  variant = "default",
  style,
  contentStyle,
  onPress,
  disabled = false,
}) => {
  const sharedStyle = [styles.base, getVariantStyle(variant), style];

  if (!onPress) {
    return <View style={sharedStyle}>{children}</View>;
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyle,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
  },
  content: {
    gap: Spacing.sm,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.6,
  },
});

export default SurfaceCard;
