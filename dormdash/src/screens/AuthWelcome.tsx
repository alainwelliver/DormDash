import React from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import { Button } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export default function AuthWelcome() {
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Login"
          containerStyle={styles.loginButtonContainer}
          buttonStyle={styles.loginButton}
          titleStyle={styles.buttonTitle}
          onPress={() => navigation.navigate("Login")}
        />
        <Button
          title="Register"
          containerStyle={styles.registerButtonContainer}
          buttonStyle={styles.registerButton}
          titleStyle={styles.registerButtonTitle}
          onPress={() => navigation.navigate("Register")}
        />
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
