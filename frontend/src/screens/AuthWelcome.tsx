import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  SemanticColors,
  Shadows,
  Spacing,
  Typography,
  WebLayout,
} from "../assets/styles";
import {
  LiveBadge,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from "../components";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export default function AuthWelcome() {
  const navigation = useNavigation<NavProp>();
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      <View style={styles.backgroundOrb} />
      <View
        style={[
          styles.contentWrapper,
          isWeb && styles.webContentWrapper,
          { paddingTop: Math.max(insets.top, Spacing.lg) },
        ]}
      >
        <SectionHeader
          title="DormDash"
          subtitle="Your Penn marketplace, redesigned for speed"
          rightSlot={<LiveBadge label="Campus live" />}
          style={styles.header}
        />

        <SurfaceCard variant="glass" style={styles.heroCard}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={[styles.logo, isWeb && styles.webLogo]}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroText}>
            Buy, sell, and get items delivered around campus in minutes.
          </Text>
          <View style={styles.pillsRow}>
            <StatusPill label="Penn Only" tone="success" />
            <StatusPill label="Fast Checkout" tone="info" />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.buttonTitle}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.registerButtonTitle}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: Spacing.lg,
  },
  webContainer: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  backgroundOrb: {
    position: "absolute",
    top: -120,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(101, 209, 162, 0.12)",
  },
  contentWrapper: {
    width: "100%",
    flex: 1,
  },
  webContentWrapper: {
    maxWidth: WebLayout.maxFormWidth + 80,
    justifyContent: "center",
  },
  header: {
    marginBottom: Spacing.md,
  },
  heroCard: {
    width: "100%",
    marginTop: Spacing.sm,
    borderColor: SemanticColors.borderSubtle,
    ...Shadows.md,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 220,
    height: 110,
  },
  webLogo: {
    width: 300,
    height: 150,
  },
  heroText: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  buttonContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  loginButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonTitle: {
    ...Typography.buttonText,
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary_green,
    alignItems: "center",
  },
  registerButtonTitle: {
    ...Typography.buttonText,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary_green,
  },
});
