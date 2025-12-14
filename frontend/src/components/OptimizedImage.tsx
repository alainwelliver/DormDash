import React, { memo } from "react";
import { Image, ImageStyle, Platform } from "react-native";

interface OptimizedImageProps {
  uri: string | undefined;
  fallback?: any;
  style?: ImageStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  priority?: "low" | "normal" | "high";
}

/**
 * OptimizedImage component with:
 * - Lazy loading on web
 * - Memoized to prevent re-renders
 */
const OptimizedImage = memo(function OptimizedImage({
  uri,
  fallback = require("../../assets/icon.png"),
  style,
  resizeMode = "cover",
  priority = "normal",
}: OptimizedImageProps) {
  const isWeb = Platform.OS === "web";

  const source = uri ? { uri } : fallback;

  // Web-specific props for lazy loading
  const webImageProps = isWeb
    ? {
        loading: priority === "high" ? "eager" : ("lazy" as const),
      }
    : {};

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      {...(webImageProps as any)}
    />
  );
});

export default OptimizedImage;
