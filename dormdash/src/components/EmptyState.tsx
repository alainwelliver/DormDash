import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Icon } from "@rneui/themed";
import { Colors, Typography, Spacing } from "../assets/styles";
import Button from "./Button";

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
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Icon name={icon} type={iconType} size={64} color={Colors.lightGray} />
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
