// Cross-platform utilities for React Native Web compatibility
import { Platform, Alert as RNAlert } from "react-native";

/**
 * Convert image to JPEG on iOS/Android using expo-image-manipulator
 */
const convertImageToJpegNative = async (
  uri: string,
  quality: number = 0.8,
): Promise<string> => {
  const ImageManipulator = require("expo-image-manipulator");

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [], // no transformations, just convert format
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
};

/**
 * Convert HEIC/HEIF image to JPEG using canvas (web only)
 */
const convertHeicToJpeg = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Try to load heic2any dynamically for HEIC conversion
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });

        const resultBlob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
        resolve(URL.createObjectURL(resultBlob));
      } catch (err) {
        // If heic2any fails or isn't available, try using canvas as fallback
        console.warn(
          "heic2any conversion failed, trying canvas fallback:",
          err,
        );

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(URL.createObjectURL(blob));
                } else {
                  reject(new Error("Canvas conversion failed"));
                }
              },
              "image/jpeg",
              0.85,
            );
          } else {
            reject(new Error("Canvas context not available"));
          }
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = e.target?.result as string;
      }
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
};

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
 * Automatically converts HEIC to JPEG for web compatibility
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

          const file = files[i];
          // Check if HEIC and convert to JPEG
          if (
            file.type === "image/heic" ||
            file.type === "image/heif" ||
            file.name.toLowerCase().endsWith(".heic") ||
            file.name.toLowerCase().endsWith(".heif")
          ) {
            try {
              const convertedUri = await convertHeicToJpeg(file);
              uris.push(convertedUri);
            } catch (err) {
              console.error("HEIC conversion failed, using original:", err);
              uris.push(URL.createObjectURL(file));
            }
          } else {
            uris.push(URL.createObjectURL(file));
          }
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

    // Convert any HEIC images to JPEG using expo-image-manipulator
    const convertedUris: string[] = [];
    for (const asset of result.assets) {
      const uri = asset.uri;
      // Check if it's a HEIC file (common on iOS)
      if (
        uri.toLowerCase().includes(".heic") ||
        uri.toLowerCase().includes(".heif") ||
        asset.mimeType?.includes("heic") ||
        asset.mimeType?.includes("heif")
      ) {
        try {
          const convertedUri = await convertImageToJpegNative(
            uri,
            options?.quality ?? 0.8,
          );
          convertedUris.push(convertedUri);
        } catch (err) {
          console.warn("HEIC conversion failed, using original:", err);
          convertedUris.push(uri);
        }
      } else {
        convertedUris.push(uri);
      }
    }

    return convertedUris;
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
 * Automatically converts HEIC to JPEG for web compatibility
 */
export const uploadImageToSupabase = async (
  supabaseClient: any,
  bucket: string,
  localUri: string,
  path: string,
  contentType: string = "image/jpeg",
): Promise<void> => {
  // Ensure path uses .jpg extension for compatibility
  let finalPath = path;
  if (
    path.toLowerCase().endsWith(".heic") ||
    path.toLowerCase().endsWith(".heif")
  ) {
    finalPath = path.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  }

  // Always use JPEG content type for maximum compatibility
  const finalContentType =
    contentType.includes("heic") || contentType.includes("heif")
      ? "image/jpeg"
      : contentType;

  if (Platform.OS === "web") {
    // Web: fetch blob directly works
    const response = await fetch(localUri);
    let blob = await response.blob();

    // If it's a HEIC blob, it should already be converted by pickImage
    // but let's ensure the content type is correct
    if (blob.type.includes("heic") || blob.type.includes("heif")) {
      // Re-encode using canvas
      blob = await convertBlobToJpeg(blob);
    }

    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(finalPath, blob, { upsert: true, contentType: finalContentType });

    if (error) throw error;
  } else {
    // iOS/Android: Convert to JPEG first if it's HEIC
    let uriToUpload = localUri;

    if (
      localUri.toLowerCase().includes(".heic") ||
      localUri.toLowerCase().includes(".heif") ||
      contentType.includes("heic") ||
      contentType.includes("heif")
    ) {
      try {
        uriToUpload = await convertImageToJpegNative(localUri, 0.85);
      } catch (err) {
        console.warn("Failed to convert HEIC to JPEG:", err);
      }
    }

    const response = await fetch(uriToUpload);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(finalPath, uint8Array, {
        upsert: true,
        contentType: "image/jpeg", // Always upload as JPEG
      });

    if (error) throw error;
  }
};

/**
 * Convert a blob to JPEG using canvas (web only helper)
 */
const convertBlobToJpeg = (blob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (newBlob) => {
            if (newBlob) {
              resolve(newBlob);
            } else {
              reject(new Error("Canvas conversion failed"));
            }
          },
          "image/jpeg",
          0.85,
        );
      } else {
        reject(new Error("Canvas context not available"));
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(blob);
  });
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
