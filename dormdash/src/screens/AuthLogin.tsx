import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { Button, Input } from "@rneui/themed";

interface AuthLoginProps {
  onBackPress: () => void;
}

export default function AuthLogin({ onBackPress }: AuthLoginProps) {
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
      Alert.alert("Please fill in all fields");
      return;
    }

    if (!isAllowedEmail(email)) {
      Alert.alert("Please use your University of Pennsylvania email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert("Login Error", error.message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <View style={styles.headerContainer}>
        <Button
          type="clear"
          icon={{ name: "chevron-left", type: "feather", size: 28 }}
          onPress={onBackPress}
          containerStyle={styles.backButtonContainer}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>Welcome back to DormDash!</Text>

      {/* Email Input */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
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
          placeholder="Enter your password"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      {/* Forgot Password */}
      <View style={styles.forgotPasswordContainer}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </View>

      {/* Login Button */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Login"
          disabled={loading}
          loading={loading}
          buttonStyle={styles.loginButton}
          titleStyle={styles.buttonTitle}
          onPress={() => signInWithEmail()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
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
    fontSize: 30,
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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    color: "#47BEBE",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#31A1E9",
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});
