// Cross-platform utilities for React Native Web compatibility
import { Platform, Alert as RNAlert } from "react-native";

/**
 * Cross-platform alert that works on iOS, Android, and Web
 */
export const alert = (
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }>,
) => {
  if (Platform.OS === "web") {
    // Web: Use window.confirm for simple alerts with buttons
    if (buttons && buttons.length > 1) {
      const confirmButton = buttons.find(
        (b) => b.style !== "cancel" && b.style !== "destructive",
      );
      const destructiveButton = buttons.find((b) => b.style === "destructive");
      const actionButton = destructiveButton || confirmButton;

      const result = window.confirm(message ? `${title}\n\n${message}` : title);
      if (result && actionButton?.onPress) {
        actionButton.onPress();
      } else {
        const cancelButton = buttons.find((b) => b.style === "cancel");
        cancelButton?.onPress?.();
      }
    } else {
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
    }
  } else {
    // iOS/Android: Use native Alert
    RNAlert.alert(title, message, buttons);
  }
};

/**
 * Pick images from device - cross-platform
 */
export const pickImage = async (options?: {
  allowsMultipleSelection?: boolean;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  selectionLimit?: number;
}): Promise<string[] | null> => {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = options?.allowsMultipleSelection ?? false;

      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        if (!files || files.length === 0) {
          resolve(null);
          return;
        }

        const uris: string[] = [];
        for (let i = 0; i < files.length; i++) {
          if (options?.selectionLimit && i >= options.selectionLimit) break;
          uris.push(URL.createObjectURL(files[i]));
        }
        resolve(uris);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  } else {
    // iOS/Android: Use expo-image-picker
    const ImagePicker = require("expo-image-picker");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
      allowsEditing: options?.allowsEditing ?? false,
      aspect: options?.aspect,
      quality: options?.quality ?? 0.8,
      selectionLimit: options?.selectionLimit,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    return result.assets.map((a: any) => a.uri);
  }
};

/**
 * Pick a single image (convenience function)
 */
export const pickSingleImage = async (options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<string | null> => {
  const result = await pickImage({
    ...options,
    allowsMultipleSelection: false,
    selectionLimit: 1,
  });
  return result?.[0] ?? null;
};

/**
 * Upload image to Supabase - cross-platform
 */
export const uploadImageToSupabase = async (
  supabaseClient: any,
  bucket: string,
  localUri: string,
  path: string,
  contentType: string = "image/jpeg",
): Promise<void> => {
  if (Platform.OS === "web") {
    // Web: fetch blob directly works
    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, blob, { upsert: true, contentType });

    if (error) throw error;
  } else {
    // iOS/Android: Use arrayBuffer approach
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, uint8Array, { upsert: true, contentType });

    if (error) throw error;
  }
};

/**
 * Check if running on web
 */
export const isWeb = Platform.OS === "web";

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === "ios";

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === "android";
