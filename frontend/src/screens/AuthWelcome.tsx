import React from "react";
import { StyleSheet, Text, View, Image, Platform } from "react-native";
import { Button } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WebLayout, Spacing } from "../assets/styles";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export default function AuthWelcome() {
  const navigation = useNavigation<NavProp>();
  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      <View style={[styles.contentWrapper, isWeb && styles.webContentWrapper]}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={[styles.logo, isWeb && styles.webLogo]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Login"
            containerStyle={styles.loginButtonContainer}
            buttonStyle={[styles.loginButton, isWeb && styles.webButton]}
            titleStyle={styles.buttonTitle}
            onPress={() => navigation.navigate("Login")}
          />
          <Button
            title="Register"
            containerStyle={styles.registerButtonContainer}
            buttonStyle={[styles.registerButton, isWeb && styles.webButton]}
            titleStyle={styles.registerButtonTitle}
            onPress={() => navigation.navigate("Register")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  webContainer: {
    paddingHorizontal: Spacing.xl,
  },
  contentWrapper: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  webContentWrapper: {
    maxWidth: WebLayout.maxFormWidth,
    flex: 0,
    minHeight: 400,
  },
  logoContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    width: 250,
    height: 125,
    marginTop: 50,
  },
  webLogo: {
    width: 300,
    height: 150,
    marginTop: 0,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a5f6b",
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 50,
  },
  loginButtonContainer: {
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: "#31A1E9",
    paddingVertical: 16,
    borderRadius: 6,
  },
  webButton: {
    cursor: "pointer",
  } as any,
  buttonTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  registerButtonContainer: {
    marginBottom: 12,
  },
  registerButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#65D1A2",
  },
  registerButtonTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#65D1A2",
    letterSpacing: 0.5,
  },
});
