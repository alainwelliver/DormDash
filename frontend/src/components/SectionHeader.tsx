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
      {rightSlot ? <View style={styles.slotWrap}>{rightSlot}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.md,
  },
  slotWrap: {
    alignItems: "flex-start",
    flexShrink: 1,
    marginTop: Spacing.xs,
    maxWidth: "100%",
  },
  title: {
    ...Typography.heading4,
    color: SemanticColors.textPrimary,
    fontWeight: "700",
    flexShrink: 1,
    lineHeight: 28,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: SemanticColors.textSecondary,
    flexShrink: 1,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});

export default SectionHeader;
