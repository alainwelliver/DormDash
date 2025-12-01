import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Icon } from "@rneui/themed";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = "info",
  duration = 3000,
  onDismiss,
  action,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timeout = setTimeout(() => {
          hideToast();
        }, duration);
        return () => clearTimeout(timeout);
      }
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const getTypeConfig = () => {
    const configs: Record<
      ToastType,
      { bg: string; icon: string; color: string }
    > = {
      success: {
        bg: Colors.success,
        icon: "check-circle",
        color: Colors.white,
      },
      error: {
        bg: Colors.error,
        icon: "alert-circle",
        color: Colors.white,
      },
      warning: {
        bg: Colors.warning,
        icon: "alert",
        color: Colors.white,
      },
      info: {
        bg: Colors.primary_blue,
        icon: "information",
        color: Colors.white,
      },
    };
    return configs[type];
  };

  const config = getTypeConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bg },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <Icon
        name={config.icon}
        type="material-community"
        size={24}
        color={config.color}
      />
      <Text style={[styles.message, { color: config.color }]} numberOfLines={2}>
        {message}
      </Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
          <Text style={[styles.actionText, { color: config.color }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Icon
          name="close"
          type="material-community"
          size={20}
          color={config.color}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: Typography.bodyMedium.fontSize,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "500",
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  closeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

export default Toast;
