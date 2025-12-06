import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";
import { alert } from "../lib/utils/platform";

type DasherRegisterNavigationProp = NativeStackNavigationProp<any>;

type VehicleType = "walk" | "bike" | "scooter" | "car";

interface VehicleOption {
  type: VehicleType;
  icon: string;
  label: string;
  description: string;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: "walk",
    icon: "walk",
    label: "Walking",
    description: "Perfect for short campus deliveries",
  },
  {
    type: "bike",
    icon: "bike",
    label: "Bicycle",
    description: "Great for covering more ground quickly",
  },
  {
    type: "scooter",
    icon: "scooter-electric",
    label: "Scooter",
    description: "Electric or kick scooter",
  },
  {
    type: "car",
    icon: "car",
    label: "Car",
    description: "For longer distance deliveries",
  },
];

const DasherRegister: React.FC = () => {
  const navigation = useNavigation<DasherRegisterNavigationProp>();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadyDasher, setIsAlreadyDasher] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    checkDasherStatus();
  }, []);

  const checkDasherStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("dashers")
        .select("id, status, vehicle_type")
        .eq("id", user.id)
        .single();

      if (data) {
        setIsAlreadyDasher(true);
        setSelectedVehicle(data.vehicle_type);
      }
    } catch (error) {
      // Not a dasher yet, that's fine
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedVehicle) {
      alert("Error", "Please select your delivery method");
      return;
    }

    if (!agreedToTerms) {
      alert("Error", "Please agree to the terms and conditions");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Error", "Please log in to register as a dasher");
        return;
      }

      const { error } = await supabase.from("dashers").insert({
        id: user.id,
        vehicle_type: selectedVehicle,
        status: "offline",
        total_deliveries: 0,
        total_earnings_cents: 0,
      });

      if (error) {
        if (error.code === "23505") {
          // Unique violation - already registered
          alert("Info", "You are already registered as a dasher!");
          setIsAlreadyDasher(true);
        } else {
          throw error;
        }
      } else {
        alert(
          "Success",
          "You are now registered as a DormDash Dasher! Head to the Dash tab to start accepting deliveries.",
        );
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Error registering dasher:", error);
      alert("Error", error.message || "Failed to register as dasher");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (isAlreadyDasher) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
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
          <Text style={styles.headerTitle}>Dasher Status</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.alreadyDasherContainer}>
          <View style={styles.successIcon}>
            <Icon
              name="check-circle"
              type="material-community"
              color={Colors.primary_green}
              size={80}
            />
          </View>
          <Text style={styles.alreadyDasherTitle}>You're a Dasher!</Text>
          <Text style={styles.alreadyDasherSubtitle}>
            You're already registered as a DormDash Dasher. Head to the Dash tab
            to start accepting deliveries!
          </Text>
          <TouchableOpacity
            style={styles.dashButton}
            onPress={() => navigation.goBack()}
          >
            <Icon
              name="bike-fast"
              type="material-community"
              color={Colors.white}
              size={20}
            />
            <Text style={styles.dashButtonText}>Start Dashing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Become a Dasher</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Icon
              name="bike-fast"
              type="material-community"
              color={Colors.primary_green}
              size={60}
            />
          </View>
          <Text style={styles.heroTitle}>Earn money delivering on campus</Text>
          <Text style={styles.heroSubtitle}>
            Deliver items between Penn students and earn $4 per delivery. Set
            your own schedule and dash when it works for you.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Dash?</Text>
          <View style={styles.benefitItem}>
            <Icon
              name="cash"
              type="material-community"
              color={Colors.primary_green}
              size={24}
            />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>$4 per delivery</Text>
              <Text style={styles.benefitSubtitle}>
                Earn money for each completed delivery
              </Text>
            </View>
          </View>
          <View style={styles.benefitItem}>
            <Icon
              name="clock-outline"
              type="material-community"
              color={Colors.primary_green}
              size={24}
            />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Flexible schedule</Text>
              <Text style={styles.benefitSubtitle}>
                Go online whenever you want to dash
              </Text>
            </View>
          </View>
          <View style={styles.benefitItem}>
            <Icon
              name="map-marker-radius"
              type="material-community"
              color={Colors.primary_green}
              size={24}
            />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Stay on campus</Text>
              <Text style={styles.benefitSubtitle}>
                All deliveries are within Penn campus
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.vehicleSection}>
          <Text style={styles.sectionTitle}>How will you deliver?</Text>
          <View style={styles.vehicleGrid}>
            {VEHICLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.vehicleOption,
                  selectedVehicle === option.type &&
                    styles.vehicleOptionSelected,
                ]}
                onPress={() => setSelectedVehicle(option.type)}
              >
                <Icon
                  name={option.icon}
                  type="material-community"
                  color={
                    selectedVehicle === option.type
                      ? Colors.primary_green
                      : Colors.mutedGray
                  }
                  size={32}
                />
                <Text
                  style={[
                    styles.vehicleLabel,
                    selectedVehicle === option.type &&
                      styles.vehicleLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.vehicleDescription}>
                  {option.description}
                </Text>
                {selectedVehicle === option.type && (
                  <View style={styles.vehicleCheck}>
                    <Icon
                      name="check-circle"
                      type="material-community"
                      color={Colors.primary_green}
                      size={20}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View
            style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
          >
            {agreedToTerms && (
              <Icon
                name="check"
                type="material-community"
                color={Colors.white}
                size={16}
              />
            )}
          </View>
          <Text style={styles.termsText}>
            I agree to the DormDash Dasher Terms of Service and understand that
            I am responsible for completing deliveries in a timely manner.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Register Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.registerButton,
            (!selectedVehicle || !agreedToTerms || submitting) &&
              styles.registerButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={!selectedVehicle || !agreedToTerms || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Icon
                name="rocket-launch"
                type="material-community"
                color={Colors.white}
                size={20}
              />
              <Text style={styles.registerButtonText}>Register as Dasher</Text>
            </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lightMint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: Typography.heading3.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    lineHeight: 24,
  },
  benefitsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  benefitText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  benefitSubtitle: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  vehicleSection: {
    marginBottom: Spacing.xl,
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  vehicleOption: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.lightGray,
    position: "relative",
  },
  vehicleOptionSelected: {
    borderColor: Colors.primary_green,
    backgroundColor: Colors.lightMint,
  },
  vehicleLabel: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.sm,
  },
  vehicleLabelSelected: {
    color: Colors.primary_green,
  },
  vehicleDescription: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: 4,
  },
  vehicleCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.mutedGray,
    marginRight: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary_green,
    borderColor: Colors.primary_green,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    lineHeight: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  registerButton: {
    backgroundColor: Colors.primary_green,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
  // Already Dasher styles
  alreadyDasherContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  alreadyDasherTitle: {
    fontSize: 28,
    fontFamily: Typography.heading3.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.sm,
  },
  alreadyDasherSubtitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  dashButton: {
    backgroundColor: Colors.primary_green,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dashButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
});

export default DasherRegister;
