import React, { useState } from "react";
import AuthWelcome from "../screens/AuthWelcome";
import AuthLogin from "../screens/AuthLogin";
import AuthRegister from "../screens/AuthRegister";

type AuthScreen = "welcome" | "login" | "register";

export default function AuthNavigator() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>("welcome");

  const handleLoginPress = () => {
    setCurrentScreen("login");
  };

  const handleRegisterPress = () => {
    setCurrentScreen("register");
  };

  const handleBackPress = () => {
    setCurrentScreen("welcome");
  };

  switch (currentScreen) {
    case "login":
      return <AuthLogin onBackPress={handleBackPress} />;
    case "register":
      return <AuthRegister onBackPress={handleBackPress} />;
    case "welcome":
    default:
      return (
        <AuthWelcome
          onLoginPress={handleLoginPress}
          onRegisterPress={handleRegisterPress}
        />
      );
  }
}
