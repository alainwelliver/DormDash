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

type AddPaymentNavigationProp = NativeStackNavigationProp<any>;

const AddPayment: React.FC = () => {
  const navigation = useNavigation<AddPaymentNavigationProp>();
  const [cardNumber, setCardNumber] = useState("");
  const [ccv, setCcv] = useState("");
  const [exp, setExp] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [saving, setSaving] = useState(false);

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Limit to 16 digits
    const limited = cleaned.substring(0, 16);
    // Add spaces every 4 digits
    const formatted = limited.match(/.{1,4}/g)?.join(" ") || limited;
    return formatted;
  };

  const formatExp = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Limit to 4 digits (MMYY)
    const limited = cleaned.substring(0, 4);
    // Add slash after 2 digits
    if (limited.length >= 2) {
      return `${limited.substring(0, 2)}/${limited.substring(2)}`;
    }
    return limited;
  };

  const handleCardNumberChange = (text: string) => {
    setCardNumber(formatCardNumber(text));
  };

  const handleExpChange = (text: string) => {
    setExp(formatExp(text));
  };

  const handleCcvChange = (text: string) => {
    // Only allow digits and limit to 4
    const cleaned = text.replace(/\D/g, "").substring(0, 4);
    setCcv(cleaned);
  };

  const handleSave = async () => {
    // Validate fields
    if (!cardNumber || !ccv || !exp || !cardholderName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Basic validation
    const cardNumberDigits = cardNumber.replace(/\s/g, "");
    if (cardNumberDigits.length < 13 || cardNumberDigits.length > 16) {
      Alert.alert("Error", "Please enter a valid card number");
      return;
    }

    if (ccv.length < 3) {
      Alert.alert("Error", "Please enter a valid CCV");
      return;
    }

    if (exp.length !== 5) {
      Alert.alert("Error", "Please enter a valid expiration date (MM/YY)");
      return;
    }

    setSaving(true);

    // Simulate saving - will connect to payment processor later
    setTimeout(() => {
      setSaving(false);
      Alert.alert("Success", "Card added successfully!");
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
        <Text style={styles.headerTitle}>Add Card</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TextInput
          style={styles.input}
          placeholder="Card Number"
          placeholderTextColor={Colors.mutedGray}
          value={cardNumber}
          onChangeText={handleCardNumberChange}
          keyboardType="numeric"
          maxLength={19} // 16 digits + 3 spaces
        />

        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="CCV"
            placeholderTextColor={Colors.mutedGray}
            value={ccv}
            onChangeText={handleCcvChange}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Exp"
            placeholderTextColor={Colors.mutedGray}
            value={exp}
            onChangeText={handleExpChange}
            keyboardType="numeric"
            maxLength={5} // MM/YY
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Cardholder Name"
          placeholderTextColor={Colors.mutedGray}
          value={cardholderName}
          onChangeText={setCardholderName}
          autoCapitalize="words"
        />
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
    paddingTop: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
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
    borderRadius: BorderRadius.medium, // 8px
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

export default AddPayment;
