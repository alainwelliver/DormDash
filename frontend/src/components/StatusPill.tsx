import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing, Typography } from "../assets/styles";

type StatusTone = "info" | "success" | "warning" | "neutral";

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

const getToneStyles = (tone: StatusTone) => {
  if (tone === "success") {
    return {
      backgroundColor: "rgba(101, 209, 162, 0.2)",
      borderColor: "rgba(101, 209, 162, 0.45)",
      textColor: Colors.primary_green,
    };
  }

  if (tone === "warning") {
    return {
      backgroundColor: "rgba(243, 156, 18, 0.2)",
      borderColor: "rgba(243, 156, 18, 0.45)",
      textColor: Colors.warning,
    };
  }

  if (tone === "info") {
    return {
      backgroundColor: "rgba(49, 161, 233, 0.16)",
      borderColor: "rgba(49, 161, 233, 0.4)",
      textColor: Colors.primary_blue,
    };
  }

  return {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.borderLight,
    textColor: Colors.darkTeal,
  };
};

const StatusPill: React.FC<StatusPillProps> = ({ label, tone = "neutral" }) => {
  const toneStyle = getToneStyles(tone);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: toneStyle.textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  text: {
    ...Typography.bodySmall,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

export default StatusPill;
