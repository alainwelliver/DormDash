import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing, Typography } from "../assets/styles";

interface LiveBadgeProps {
  label?: string;
}

const LiveBadge: React.FC<LiveBadgeProps> = ({ label = "Live" }) => {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "rgba(101, 209, 162, 0.18)",
    borderColor: "rgba(101, 209, 162, 0.5)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  dot: {
    backgroundColor: Colors.primary_green,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  text: {
    ...Typography.bodySmall,
    color: Colors.primary_green,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default LiveBadge;
