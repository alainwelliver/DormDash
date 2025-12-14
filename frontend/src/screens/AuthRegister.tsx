import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Button, Input } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { alert } from "../lib/utils/platform";
import { Colors, Spacing, WebLayout } from "../assets/styles";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && styles.webScrollContent,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.formWrapper, isWeb && styles.webFormWrapper]}>
          {/* Back Button */}
          <View style={styles.headerContainer}>
            <Button
              type="clear"
              icon={{ name: "chevron-left", type: "feather", size: 28 }}
              onPress={() => navigation.goBack()}
              containerStyle={styles.backButtonContainer}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Create New Account</Text>

          {/* Full Name Input */}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="Full Name"
              leftIcon={{ type: "font-awesome", name: "user" }}
              onChangeText={(text: string) => setFullName(text)}
              value={fullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* Username Input */}
          <View style={styles.verticallySpaced}>
            <Input
              label="Username"
              leftIcon={{ type: "font-awesome", name: "at" }}
              onChangeText={(text: string) => setUsername(text)}
              value={username}
              placeholder="Choose a username"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.verticallySpaced}>
            <Input
              label="Penn Email"
              leftIcon={{ type: "font-awesome", name: "envelope" }}
              onChangeText={(text: string) => setEmail(text)}
              value={email}
              placeholder="Enter your Penn email"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Phone Number Input */}
          <View style={styles.verticallySpaced}>
            <Input
              label="Phone Number"
              leftIcon={{ type: "font-awesome", name: "phone" }}
              onChangeText={(text: string) => setPhone(text)}
              value={phone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.verticallySpaced}>
            <Input
              label="Password"
              leftIcon={{ type: "font-awesome", name: "lock" }}
              rightIcon={{
                type: "font-awesome",
                name: showPassword ? "eye-slash" : "eye",
                onPress: () => setShowPassword(!showPassword),
              }}
              onChangeText={(text: string) => setPassword(text)}
              value={password}
              secureTextEntry={!showPassword}
              placeholder="Create a password"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Confirm Password Input */}
          <View style={styles.verticallySpaced}>
            <Input
              label="Confirm Password"
              leftIcon={{ type: "font-awesome", name: "lock" }}
              rightIcon={{
                type: "font-awesome",
                name: showConfirmPassword ? "eye-slash" : "eye",
                onPress: () => setShowConfirmPassword(!showConfirmPassword),
              }}
              onChangeText={(text: string) => setConfirmPassword(text)}
              value={confirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirm your password"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Register Button */}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button
              title="Register"
              disabled={loading}
              loading={loading}
              buttonStyle={styles.registerButton}
              titleStyle={styles.buttonTitle}
              onPress={() => signUpWithEmail()}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
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
    paddingHorizontal: Spacing.xl,
  },
  headerContainer: {
    marginBottom: 20,
  },
  backButtonContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 30,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
  registerButton: {
    backgroundColor: "#31A1E9",
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
