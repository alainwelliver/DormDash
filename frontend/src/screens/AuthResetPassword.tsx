import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Input } from "@rneui/themed";
import { ChevronLeft, Lock } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Colors,
  SemanticColors,
  Shadows,
  Spacing,
  Typography,
  WebLayout,
} from "../assets/styles";
import { alert } from "../lib/utils/platform";
import { supabase } from "../lib/supabase";
import {
  LiveBadge,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from "../components";

const PASSWORD_MIN_LENGTH = 6;
const RECOVERY_TYPE = "recovery";

interface RecoveryTokens {
  accessToken: string;
  refreshToken: string;
  type?: string;
}

function parseRecoveryTokens(url: string): RecoveryTokens | null {
  try {
    const parsedUrl = new URL(url);
    const hash = parsedUrl.hash.startsWith("#")
      ? parsedUrl.hash.slice(1)
      : parsedUrl.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = parsedUrl.searchParams;

    const accessToken =
      hashParams.get("access_token") ?? queryParams.get("access_token");
    const refreshToken =
      hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
    const type = hashParams.get("type") ?? queryParams.get("type") ?? undefined;

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken, type };
  } catch {
    return null;
  }
}

function getWebCurrentUrl(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }
  return window.location.href;
}

function stripWebHash() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  if (window.location.hash) {
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${window.location.search}`,
    );
  }
}

function openAuthPath(path: string) {
  if (Platform.OS === "web") {
    window.location.assign(`/${path}`);
    return;
  }
  void Linking.openURL(`dormdash://${path}`);
}

export default function AuthResetPassword() {
  const navigation = useNavigation();
  const isWeb = Platform.OS === "web";
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  const handledUrlRef = useRef<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Linking.getInitialURL()
      .then((url) => {
        if (isMounted && url) {
          setIncomingUrl(url);
        }
      })
      .catch(() => {
        // no-op
      });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      setIncomingUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const prepareRecoverySession = useCallback(async () => {
    setPreparing(true);

    const candidateUrl = incomingUrl ?? getWebCurrentUrl();

    if (candidateUrl && handledUrlRef.current !== candidateUrl) {
      handledUrlRef.current = candidateUrl;
      const tokens = parseRecoveryTokens(candidateUrl);

      if (tokens && (!tokens.type || tokens.type === RECOVERY_TYPE)) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        if (error) {
          setRecoveryReady(false);
          setRecoveryError(error.message);
          setPreparing(false);
          return;
        }

        stripWebHash();
      }
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      setRecoveryReady(false);
      setRecoveryError(error.message);
    } else if (session) {
      setRecoveryReady(true);
      setRecoveryError(null);
    } else {
      setRecoveryReady(false);
      setRecoveryError(
        "This recovery link is invalid or expired. Request a new reset email.",
      );
    }

    setPreparing(false);
  }, [incomingUrl]);

  useEffect(() => {
    void prepareRecoverySession();
  }, [prepareRecoverySession]);

  const submitNewPassword = async () => {
    if (!recoveryReady) {
      alert("Recovery session missing", "Please open the reset link from email.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      alert("Error", "Please fill in both password fields.");
      return;
    }

    if (password.trim().length < PASSWORD_MIN_LENGTH) {
      alert("Error", `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });
    setLoading(false);

    if (error) {
      alert("Reset failed", error.message);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    alert(
      "Password updated",
      "Your password has been reset. Please sign in with your new password.",
      [{ text: "OK", onPress: () => openAuthPath("login") }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            isWeb && styles.webScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formWrapper, isWeb && styles.webFormWrapper]}>
            <View style={styles.topRow}>
              <TouchableOpacity
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    openAuthPath("login");
                  }
                }}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={Colors.darkTeal} />
              </TouchableOpacity>
              <LiveBadge label="Recovery" />
            </View>

            <SectionHeader
              title="Set New Password"
              subtitle="Use a new password for your DormDash account"
              rightSlot={<StatusPill label="Step 2" tone="warning" />}
              style={styles.sectionHeader}
            />

            <SurfaceCard variant="glass" style={styles.formCard}>
              {preparing ? (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color={Colors.primary_blue} size="small" />
                  <Text style={styles.stateText}>Preparing secure reset...</Text>
                </View>
              ) : recoveryError ? (
                <View style={styles.stateContainer}>
                  <Text style={styles.errorText}>{recoveryError}</Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => openAuthPath("forgot-password")}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Request New Link
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Input
                    label="New Password"
                    leftIcon={<Lock size={18} color={Colors.mutedGray} />}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    secureTextEntry
                    placeholder="Enter your new password"
                    placeholderTextColor={Colors.borderGray}
                    editable={!loading}
                    inputStyle={styles.inputText}
                    labelStyle={styles.inputLabel}
                    inputContainerStyle={styles.inputContainer}
                    containerStyle={styles.inputOuter}
                    autoCapitalize="none"
                  />

                  <Input
                    label="Confirm Password"
                    leftIcon={<Lock size={18} color={Colors.mutedGray} />}
                    onChangeText={(text) => setConfirmPassword(text)}
                    value={confirmPassword}
                    secureTextEntry
                    placeholder="Re-enter your new password"
                    placeholderTextColor={Colors.borderGray}
                    editable={!loading}
                    inputStyle={styles.inputText}
                    labelStyle={styles.inputLabel}
                    inputContainerStyle={styles.inputContainer}
                    containerStyle={styles.inputOuter}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      loading && styles.primaryButtonDisabled,
                    ]}
                    onPress={submitNewPassword}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Update Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </SurfaceCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  webScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  formWrapper: {
    width: "100%",
  },
  webFormWrapper: {
    maxWidth: WebLayout.maxFormWidth,
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  formCard: {
    borderColor: SemanticColors.borderSubtle,
    ...Shadows.sm,
  },
  stateContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  stateText: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    textAlign: "center",
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.error,
    textAlign: "center",
  },
  inputOuter: {
    paddingHorizontal: 0,
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  inputText: {
    ...Typography.bodyMedium,
    color: Colors.darkTeal,
  },
  primaryButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 999,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    ...Typography.buttonText,
    fontSize: 16,
    color: Colors.white,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary_blue,
  },
  secondaryButtonText: {
    ...Typography.bodyMedium,
    color: Colors.primary_blue,
    fontWeight: "600",
  },
});
