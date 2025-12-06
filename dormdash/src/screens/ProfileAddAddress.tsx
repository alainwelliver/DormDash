import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";
import { alert } from "../lib/utils/platform";
import { LocationPicker, LocationData } from "../components";

type AddAddressRouteProp = RouteProp<
  { AddAddress: { addressId?: number } },
  "AddAddress"
>;
type AddAddressNavigationProp = NativeStackNavigationProp<any>;

const AddAddress: React.FC = () => {
  const navigation = useNavigation<AddAddressNavigationProp>();
  const route = useRoute<AddAddressRouteProp>();
  const addressId = route.params?.addressId;
  const isEditMode = !!addressId;

  const [label, setLabel] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Philadelphia");
  const [state, setState] = useState("PA");
  const [zipCode, setZipCode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      loadAddress();
    }
  }, [addressId]);

  const loadAddress = async () => {
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", addressId)
        .single();

      if (error) throw error;
      if (data) {
        setLabel(data.label || "");
        setBuildingName(data.building_name || "");
        setRoomNumber(data.room_number || "");
        setStreetAddress(data.street_address || "");
        setCity(data.city || "Philadelphia");
        setState(data.state || "PA");
        setZipCode(data.zip_code || "");
        setLat(data.lat);
        setLng(data.lng);
        setIsDefault(data.is_default || false);
      }
    } catch (error: any) {
      console.error("Error loading address:", error);
      alert("Error", "Failed to load address");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationData | null) => {
    if (!location) {
      // Clear location data
      setLat(null);
      setLng(null);
      return;
    }
    if (location.buildingName) {
      setBuildingName(location.buildingName);
    } else {
      setStreetAddress(location.address);
    }
    setLat(location.lat);
    setLng(location.lng);
  };

  // Build current location value for LocationPicker
  const currentLocationValue: LocationData | null =
    lat && lng
      ? {
          address: streetAddress || buildingName || "",
          lat,
          lng,
          buildingName: buildingName || undefined,
        }
      : null;

  const handleSave = async () => {
    // Validate that at least building or street address is filled
    if (!buildingName && !streetAddress) {
      alert("Error", "Please enter a building name or street address");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Error", "Please log in to save address");
        setSaving(false);
        return;
      }

      const addressData = {
        user_id: user.id,
        label: label || null,
        building_name: buildingName || null,
        room_number: roomNumber || null,
        street_address: streetAddress || null,
        city: city || "Philadelphia",
        state: state || "PA",
        zip_code: zipCode || null,
        lat,
        lng,
        is_default: isDefault,
      };

      // If setting as default, first unset all other defaults
      if (isDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      let error;
      if (isEditMode) {
        const result = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", addressId);
        error = result.error;
      } else {
        const result = await supabase.from("addresses").insert(addressData);
        error = result.error;
      }

      if (error) throw error;

      alert("Success", isEditMode ? "Address updated!" : "Address saved!");
      navigation.goBack();
    } catch (error: any) {
      console.error("Error saving address:", error);
      alert("Error", error.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <Text style={styles.headerTitle}>
            {isEditMode ? "Edit Address" : "Add Address"}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
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
        <Text style={styles.headerTitle}>
          {isEditMode ? "Edit Address" : "Add Address"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Label */}
        <Text style={styles.sectionLabel}>Address Label (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Home, Dorm, Work"
          placeholderTextColor={Colors.mutedGray}
          value={label}
          onChangeText={setLabel}
        />

        {/* Pick from Campus Locations */}
        <LocationPicker
          value={currentLocationValue}
          onChange={handleLocationSelect}
          label="Pick from Campus Locations"
          placeholder="Select a Penn building"
          helperText="Choose a campus location to auto-fill the address"
        />

        <Text style={styles.sectionLabel}>Penn Campus Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Penn Building Name"
          placeholderTextColor={Colors.mutedGray}
          value={buildingName}
          onChangeText={setBuildingName}
        />

        <TextInput
          style={styles.input}
          placeholder="Room Number (optional)"
          placeholderTextColor={Colors.mutedGray}
          value={roomNumber}
          onChangeText={setRoomNumber}
        />

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sectionLabel}>Off-Campus Address</Text>
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

        {/* Set as Default */}
        <View style={styles.defaultRow}>
          <Text style={styles.defaultLabel}>Set as default address</Text>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: Colors.lightGray, true: Colors.primary_green }}
            thumbColor={Colors.white}
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
            {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
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
    borderRadius: BorderRadius.medium, // 8px
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
  sectionLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  defaultLabel: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
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

export default AddAddress;
