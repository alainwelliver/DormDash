import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { Colors, Typography, Spacing } from "../assets/styles";
import Navbar from "../components/Navbar";

const Profile: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>This is the profile</Text>
      </View>
      <Navbar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: Typography.heading3.fontSize,
    fontFamily: Typography.heading3.fontFamily,
    fontWeight: Typography.heading3.fontWeight,
    color: Colors.darkTeal,
  },
});

export default Profile;
