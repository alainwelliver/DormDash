import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";

type AddAddressNavigationProp = NativeStackNavigationProp<any>;

const AddAddress: React.FC = () => {
  const navigation = useNavigation<AddAddressNavigationProp>();
  const [buildingName, setBuildingName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validate that at least one field is filled
    if (
      !buildingName &&
      !roomNumber &&
      !streetAddress &&
      !city &&
      !state &&
      !zipCode
    ) {
      Alert.alert("Error", "Please fill in at least one field");
      return;
    }

    setSaving(true);

    // Simulate saving - will connect to database later
    setTimeout(() => {
      setSaving(false);
      Alert.alert("Success", "Address saved!");
      navigation.goBack();
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-left"
            type="material-community"
            color={Colors.darkTeal}
            size={32}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Address</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TextInput
          style={styles.input}
          placeholder="Penn Building Name"
          placeholderTextColor={Colors.mutedGray}
          value={buildingName}
          onChangeText={setBuildingName}
        />

        <TextInput
          style={styles.input}
          placeholder="Room Number"
          placeholderTextColor={Colors.mutedGray}
          value={roomNumber}
          onChangeText={setRoomNumber}
        />

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Street Address"
          placeholderTextColor={Colors.mutedGray}
          value={streetAddress}
          onChangeText={setStreetAddress}
        />

        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor={Colors.mutedGray}
          value={city}
          onChangeText={setCity}
        />

        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="State"
            placeholderTextColor={Colors.mutedGray}
            value={state}
            onChangeText={setState}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Zip Code"
            placeholderTextColor={Colors.mutedGray}
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="numeric"
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,  // 8px
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.lightGray,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.base_bg,
  },
  saveButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,  // 8px
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
});

export default AddAddress;
