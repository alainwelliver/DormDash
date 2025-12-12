import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { Colors, Typography, Spacing } from "../assets/styles";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "We couldn't load the content. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <AlertCircle size={64} color={Colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="primary"
          size="md"
          icon={<RefreshCw size={18} color={Colors.white} />}
          style={styles.retryButton}
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FDEDED",
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
  message: {
    ...Typography.bodyLarge,
    color: Colors.mutedGray,
    textAlign: "center",
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
});

export default ErrorState;
