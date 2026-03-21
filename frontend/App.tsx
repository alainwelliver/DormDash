import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppNavigator from "./src/navigation/AppNavigator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export default function App() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlBackground = html.style.background;
    const previousBodyBackground = body.style.background;
    const previousBodyMargin = body.style.margin;
    const previousBodyMinHeight = body.style.minHeight;
    const previousBodyFontFamily = body.style.fontFamily;
    const previousBodyColor = body.style.color;
    const previousBodyOverscroll = body.style.overscrollBehaviorY;

    html.style.background =
      "linear-gradient(180deg, #f6fffc 0%, #eef8ff 42%, #ffffff 100%)";
    body.style.background = "transparent";
    body.style.margin = "0";
    body.style.minHeight = "100vh";
    body.style.fontFamily =
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    body.style.color = "#39605B";
    body.style.overscrollBehaviorY = "none";

    return () => {
      html.style.background = previousHtmlBackground;
      body.style.background = previousBodyBackground;
      body.style.margin = previousBodyMargin;
      body.style.minHeight = previousBodyMinHeight;
      body.style.fontFamily = previousBodyFontFamily;
      body.style.color = previousBodyColor;
      body.style.overscrollBehaviorY = previousBodyOverscroll;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
