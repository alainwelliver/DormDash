import React, { useState } from "react";
import { View, StyleSheet, Alert, Text } from "react-native";
import { Button, Input } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { Colors, CommonStyles } from "../assets/styles";

export default function AuthForgotPassword() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
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
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Check your email",
        "If an account exists for this email, you will receive a password reset link.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Button
          type="clear"
          icon={{
            name: "chevron-left",
            type: "feather",
            size: 28,
            color: Colors.darkTeal,
          }}
          onPress={() => navigation.goBack()}
          containerStyle={styles.backButtonContainer}
        />
      </View>

      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you a link to reset your
        password.
      </Text>

      <View style={styles.verticallySpaced}>
        <Input
          label="Email"
          leftIcon={{
            type: "font-awesome",
            name: "envelope",
            color: Colors.mutedGray,
          }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@upenn.edu"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Send Reset Link"
          disabled={loading}
          loading={loading}
          buttonStyle={{
            backgroundColor: Colors.primary_blue,
            borderRadius: 6,
            paddingVertical: 12,
          }}
          onPress={handleReset}
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
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.darkTeal,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.mutedGray,
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
});
