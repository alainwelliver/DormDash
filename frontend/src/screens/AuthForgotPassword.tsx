import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Input } from "@rneui/themed";
import { ChevronLeft, Mail } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Colors,
  SemanticColors,
  Shadows,
  Spacing,
  Typography,
  WebLayout,
} from "../assets/styles";
import { alert } from "../lib/utils/platform";
import {
  LiveBadge,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from "../components";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;

export default function AuthForgotPassword() {
  const navigation = useNavigation<NavProp>();
  const isWeb = Platform.OS === "web";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    // This sends a password reset email to the user
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // In a real app, you would set up a deep link here (e.g., dormdash://reset-password)
      // to redirect the user back to a "Update Password" screen in your app.
      // For now, this will send a standard Supabase recovery email.
    });

    setLoading(false);

    if (error) {
      alert("Error", error.message);
    } else {
      alert(
        "Check your email",
        "If an account exists for this email, you will receive a password reset link.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }

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
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={Colors.darkTeal} />
              </TouchableOpacity>
              <LiveBadge label="Recovery" />
            </View>

            <SectionHeader
              title="Reset Password"
              subtitle="We'll email a secure reset link"
              rightSlot={<StatusPill label="Step 1" tone="warning" />}
              style={styles.sectionHeader}
            />

            <SurfaceCard variant="glass" style={styles.formCard}>
              <Text style={styles.subtitle}>
                Enter your Penn email and we will send a recovery link.
              </Text>

              <Input
                label="Penn Email"
                leftIcon={<Mail size={18} color={Colors.mutedGray} />}
                onChangeText={(text) => setEmail(text)}
                value={email}
                placeholder="email@upenn.edu"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  loading && styles.resetButtonDisabled,
                ]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
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
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    marginBottom: Spacing.sm,
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
  resetButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 999,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    ...Typography.buttonText,
    fontSize: 16,
    color: Colors.white,
    fontWeight: "600",
  },
});
