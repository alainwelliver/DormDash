import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Colors, Fonts, Spacing, BorderRadius } from "../assets/styles";

// Common Penn campus locations for quick selection
const PENN_LOCATIONS = [
  {
    name: "Gutmann College House",
    address: "3901 Locust Walk, Philadelphia, PA 19104",
    lat: 39.9522,
    lng: -75.2005,
  },
  {
    name: "Hill College House",
    address: "3333 Walnut St, Philadelphia, PA 19104",
    lat: 39.9535,
    lng: -75.1915,
  },
  {
    name: "Harnwell College House",
    address: "3820 Locust Walk, Philadelphia, PA 19104",
    lat: 39.9525,
    lng: -75.2015,
  },
  {
    name: "Harrison College House",
    address: "3910 Irving St, Philadelphia, PA 19104",
    lat: 39.9505,
    lng: -75.2025,
  },
  {
    name: "Rodin College House",
    address: "3901 Locust Walk, Philadelphia, PA 19104",
    lat: 39.9518,
    lng: -75.2008,
  },
  {
    name: "Lauder College House",
    address: "3335 Woodland Walk, Philadelphia, PA 19104",
    lat: 39.9528,
    lng: -75.1925,
  },
  {
    name: "Van Pelt Library",
    address: "3420 Walnut St, Philadelphia, PA 19104",
    lat: 39.9523,
    lng: -75.1932,
  },
  {
    name: "Houston Hall",
    address: "3417 Spruce St, Philadelphia, PA 19104",
    lat: 39.9512,
    lng: -75.1938,
  },
  {
    name: "Huntsman Hall",
    address: "3730 Walnut St, Philadelphia, PA 19104",
    lat: 39.9531,
    lng: -75.1985,
  },
  {
    name: "Levine Hall",
    address: "3330 Walnut St, Philadelphia, PA 19104",
    lat: 39.9522,
    lng: -75.1905,
  },
];

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  buildingName?: string;
}

interface LocationPickerProps {
  value?: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
}

export default function LocationPicker({
  value,
  onChange,
  placeholder = "Select pickup location",
  label = "Pickup Location",
  helperText = "This location is hidden from buyers and only shown to dashers.",
}: LocationPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof PENN_LOCATIONS>([]);

  // Filter Penn locations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(PENN_LOCATIONS);
      return;
    }

    const filtered = PENN_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setSearchResults(filtered);
  }, [searchQuery]);

  const handleSelectLocation = (location: (typeof PENN_LOCATIONS)[0]) => {
    onChange({
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      buildingName: location.name,
    });
    setModalVisible(false);
    setSearchQuery("");
  };

  const clearLocation = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputContainer, value && styles.inputContainerFilled]}
        onPress={() => setModalVisible(true)}
      >
        {value ? (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedTextContainer}>
              {value.buildingName && (
                <Text style={styles.buildingName}>{value.buildingName}</Text>
              )}
              <Text style={styles.addressText} numberOfLines={1}>
                {value.address}
              </Text>
            </View>
            <TouchableOpacity
              onPress={clearLocation}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
      </TouchableOpacity>

      {helperText && <Text style={styles.helperText}>{helperText}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Penn buildings..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <ScrollView style={styles.locationList}>
            <Text style={styles.sectionTitle}>Penn Campus Locations</Text>
            {searchResults.map((location, index) => (
              <TouchableOpacity
                key={index}
                style={styles.locationItem}
                onPress={() => handleSelectLocation(location)}
              >
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationAddress}>{location.address}</Text>
              </TouchableOpacity>
            ))}

            {searchResults.length === 0 && searchQuery && (
              <Text style={styles.noResults}>
                No Penn locations found. Try searching by building name.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    marginBottom: 6,
    marginLeft: 10,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    minHeight: 50,
    justifyContent: "center",
  },
  inputContainerFilled: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.lightMint,
  },
  placeholder: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  selectedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.darkTeal,
    fontFamily: Fonts.body,
  },
  addressText: {
    fontSize: 12,
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  clearButtonText: {
    color: Colors.mutedGray,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    marginTop: 4,
    marginLeft: 10,
    fontStyle: "italic",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingTop: Platform.OS === "ios" ? 60 : Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.heading,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeButtonText: {
    color: Colors.primary_blue,
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  searchContainer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: Fonts.body,
    backgroundColor: Colors.lightGray,
  },
  locationList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  locationItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.darkTeal,
    fontFamily: Fonts.body,
  },
  locationAddress: {
    fontSize: 13,
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  noResults: {
    padding: Spacing.lg,
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    textAlign: "center",
    fontStyle: "italic",
  },
});
