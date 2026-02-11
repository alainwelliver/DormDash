import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { SemanticColors, Spacing, Typography } from "../assets/styles";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  rightSlot,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot ? <View>{rightSlot}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  textBlock: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    ...Typography.heading4,
    color: SemanticColors.textPrimary,
    fontWeight: "700",
  },
  subtitle: {
    ...Typography.bodySmall,
    color: SemanticColors.textSecondary,
    marginTop: Spacing.xs,
  },
});

export default SectionHeader;
