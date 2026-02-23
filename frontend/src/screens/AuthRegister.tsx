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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { alert } from "../lib/utils/platform";
import {
  Colors,
  SemanticColors,
  Shadows,
  Spacing,
  Typography,
  WebLayout,
} from "../assets/styles";
import {
  AtSign,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react-native";
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

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export default function AuthRegister() {
  const navigation = useNavigation<NavProp>();
  const isWeb = Platform.OS === "web";
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState("");

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

  async function signUpWithEmail() {
    // Validation
    if (
      !fullName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      alert("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (!isAllowedEmail(email)) {
      alert("Please use your University of Pennsylvania email address.");
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: username.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error) {
      alert("Registration Error", error.message);
    } else if (!session) {
      alert(
        "Verification Required",
        "Please check your inbox for email verification!",
      );
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
              <LiveBadge label="Penn verified" />
            </View>

            <SectionHeader
              title="Create Account"
              subtitle="Join the fastest Penn campus marketplace"
              rightSlot={<StatusPill label="UPenn Email" tone="success" />}
              style={styles.sectionHeader}
            />

            <SurfaceCard variant="glass" style={styles.formCard}>
              <Input
                label="Full Name"
                leftIcon={<User size={18} color={Colors.mutedGray} />}
                onChangeText={(text: string) => setFullName(text)}
                value={fullName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="words"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <Input
                label="Username"
                leftIcon={<AtSign size={18} color={Colors.mutedGray} />}
                onChangeText={(text: string) => setUsername(text)}
                value={username}
                placeholder="Choose a username"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="none"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <Input
                label="Penn Email"
                leftIcon={<Mail size={18} color={Colors.mutedGray} />}
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
                label="Phone Number"
                leftIcon={<Phone size={18} color={Colors.mutedGray} />}
                onChangeText={(text: string) => setPhone(text)}
                value={phone}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.borderGray}
                keyboardType="phone-pad"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <Input
                label="Password"
                leftIcon={<Lock size={18} color={Colors.mutedGray} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={Colors.mutedGray} />
                    ) : (
                      <Eye size={18} color={Colors.mutedGray} />
                    )}
                  </TouchableOpacity>
                }
                onChangeText={(text: string) => setPassword(text)}
                value={password}
                secureTextEntry={!showPassword}
                placeholder="Create a password"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="none"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <Input
                label="Confirm Password"
                leftIcon={<Lock size={18} color={Colors.mutedGray} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={Colors.mutedGray} />
                    ) : (
                      <Eye size={18} color={Colors.mutedGray} />
                    )}
                  </TouchableOpacity>
                }
                onChangeText={(text: string) => setConfirmPassword(text)}
                value={confirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor={Colors.borderGray}
                autoCapitalize="none"
                editable={!loading}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputContainer}
                containerStyle={styles.inputOuter}
              />

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  loading && styles.registerButtonDisabled,
                ]}
                onPress={signUpWithEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonTitle}>Create Account</Text>
                )}
              </TouchableOpacity>
            </SurfaceCard>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already registered?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerLink}>Sign in</Text>
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
  registerButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  buttonTitle: {
    ...Typography.buttonText,
    fontSize: 16,
    fontWeight: "600",
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
    fontWeight: "700",
    color: Colors.primary_green,
  },
});
