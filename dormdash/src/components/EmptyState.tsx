import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import * as LucideIcons from "lucide-react-native";
import { Colors, Typography, Spacing } from "../assets/styles";
import Button from "./Button";

// Map common icon names to Lucide icons
const iconNameMap: Record<string, keyof typeof LucideIcons> = {
  "inbox": "Inbox",
  "package-variant": "Package",
  "cart-outline": "ShoppingCart",
  "filter-off": "FilterX",
  "magnify-close": "SearchX",
  "receipt": "Receipt",
  "map-marker-outline": "MapPin",
  "credit-card-outline": "CreditCard",
};

interface EmptyStateProps {
  icon?: string;
  iconType?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "inbox",
  iconType = "material-community",
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  const lucideIconName = iconNameMap[icon] || "Inbox";
  const IconComponent = (LucideIcons[lucideIconName] as React.FC<{ color: string; size: number }>) || LucideIcons.Inbox;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <IconComponent size={64} color={Colors.lightGray} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightMint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading4,
    color: Colors.darkTeal,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.mutedGray,
    textAlign: "center",
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: Spacing.md,
  },
});

export default EmptyState;
