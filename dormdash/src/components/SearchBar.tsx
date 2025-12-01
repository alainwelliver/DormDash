import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ViewStyle,
} from "react-native";
import { Icon } from "@rneui/themed";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  style?: ViewStyle;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  onFocus,
  onBlur,
  onSubmit,
  onClear,
  autoFocus = false,
  style,
}) => {
  const isWeb = Platform.OS === "web";
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      friction: 8,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <View style={styles.searchIcon}>
        <Icon
          name="magnify"
          type="material-community"
          size={22}
          color={isFocused ? Colors.primary_blue : Colors.mutedGray}
        />
      </View>
      <TextInput
        ref={inputRef}
        style={[styles.input, isWeb && (styles.webInput as any)]}
        placeholder={placeholder}
        placeholderTextColor={Colors.mutedGray}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name="close-circle"
            type="material-community"
            size={18}
            color={Colors.mutedGray}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  containerFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary_blue,
    shadowColor: Colors.primary_blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyLarge.fontSize,
    fontFamily: Typography.bodyLarge.fontFamily,
    color: Colors.darkTeal,
    paddingVertical: Spacing.xs,
  },
  webInput: {
    // @ts-ignore - web-only property
    outlineStyle: "none",
  },
  clearButton: {
    marginLeft: Spacing.sm,
    padding: 2,
  },
});

export default SearchBar;
