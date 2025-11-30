import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { Button, Input } from "@rneui/themed";
import { Colors, CommonStyles, Typography, Spacing } from "../assets/styles";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export default function AuthLogin() {
  const navigation = useNavigation<NavProp>();
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
          onPress={() => navigation.goBack()}
          containerStyle={styles.backButtonContainer}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>Welcome back to DormDash!</Text>

      {/* Email Input */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Penn Email"
          leftIcon={{
            type: "font-awesome",
            name: "envelope",
            color: Colors.mutedGray,
          }}
          onChangeText={(text: string) => setEmail(text)}
          value={email}
          placeholder="Enter your Penn email"
          placeholderTextColor={Colors.lightGray}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          inputStyle={{ color: Colors.darkTeal }}
        />
      </View>

      {/* Password Input */}
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{
            type: "font-awesome",
            name: "lock",
            color: Colors.mutedGray,
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
          placeholderTextColor={Colors.lightGray}
          autoCapitalize="none"
          editable={!loading}
          inputStyle={{ color: Colors.darkTeal }}
        />
      </View>

      {/* Forgot Password */}
      <View style={styles.forgotPasswordContainer}>
        <Text
          style={styles.forgotPasswordText}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          Forgot Password?
        </Text>
      </View>

      {/* Login Button */}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Login"
          disabled={loading}
          loading={loading}
          buttonStyle={[
            styles.loginButton,
            { backgroundColor: Colors.primary_blue },
          ]}
          titleStyle={styles.buttonTitle}
          onPress={() => signInWithEmail()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.container,
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
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: 30,
    fontFamily: Typography.heading3.fontFamily,
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
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: Typography.bodySmall.fontFamily,
  },
  loginButton: {
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});
