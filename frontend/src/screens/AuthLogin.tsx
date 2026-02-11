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
import { supabase } from "../lib/supabase";
import { Input } from "@rneui/themed";
import {
  Colors,
  SemanticColors,
  Shadows,
  Typography,
  Spacing,
  WebLayout,
} from "../assets/styles";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { alert } from "../lib/utils/platform";
import { ChevronLeft } from "lucide-react-native";
import { LiveBadge, SectionHeader, SurfaceCard } from "../components";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export default function AuthLogin() {
  const navigation = useNavigation<NavProp>();
  const isWeb = Platform.OS === "web";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const allowedEmailEndings = [
    "@seas.upenn.edu",
    "@sas.upenn.edu",
    "@wharton.upenn.edu",
    "@nursing.upenn.edu",
    "@upenn.edu",
  ];

  function isAllowedEmail(candidate: string) {
    const normalized = candidate.trim().toLowerCase();
    return allowedEmailEndings.some((ending) => normalized.endsWith(ending));
  }

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!isAllowedEmail(email)) {
      alert("Please use your University of Pennsylvania email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      alert("Login Error", error.message);
    }
    setLoading(false);
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
              <LiveBadge label="Secure login" />
            </View>

            <SectionHeader
              title="Welcome Back"
              subtitle="Sign in with your Penn email"
              style={styles.sectionHeader}
            />

            <SurfaceCard variant="glass" style={styles.formCard}>
              <Input
                label="Penn Email"
                leftIcon={{
                  type: "font-awesome",
                  name: "envelope",
                  color: Colors.mutedGray,
                  size: 18,
                }}
                onChangeText={(text: string) => setEmail(text)}
                value={email}
                placeholder="Enter your Penn email"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <Input
                label="Password"
                leftIcon={{
                  type: "font-awesome",
                  name: "lock",
                  color: Colors.mutedGray,
                  size: 18,
                }}
                rightIcon={{
                  type: "font-awesome",
                  name: showPassword ? "eye-slash" : "eye",
                  color: Colors.mutedGray,
                  onPress: () => setShowPassword(!showPassword),
                }}
                onChangeText={(text: string) => setPassword(text)}
                value={password}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="none"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={signInWithEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonTitle}>Login</Text>
                )}
              </TouchableOpacity>
            </SurfaceCard>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Need an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.footerLink}>Create one</Text>
              </TouchableOpacity>
            </View>
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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  forgotPasswordText: {
    color: Colors.primary_blue,
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonTitle: {
    fontSize: 16,
    color: Colors.white,
  },
  footerRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
  },
  footerLink: {
    ...Typography.bodySmall,
    fontWeight: "600",
    color: Colors.primary_green,
  },
});
