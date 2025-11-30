import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input } from "@rneui/themed";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system/next";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Colors,
  Fonts,
  Typography,
  Spacing,
  BorderRadius,
} from "../assets/styles";

type MainStackNavigationProp = NativeStackNavigationProp<
  { MainTabs: undefined; CreateListing: undefined },
  "CreateListing"
>;

type Category = { id: number; name: string };
type Tag = { id: number; name: string };
type Props = { onCancel?: () => void; onCreated?: (listingId: number) => void };

const BUCKET = "listings";

// ---------- RN-safe image upload helpers ----------
function guessExt(uri: string) {
  const m = uri.match(/\.(\w+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : "jpg";
}
function guessMime(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}
async function uploadImageRN(
  supabaseClient: typeof supabase,
  bucket: string,
  uri: string,
  path: string,
) {
  const ext = guessExt(uri);
  const contentType = guessMime(ext);

  // Read file using the new expo-file-system/next API
  const file = new File(uri);
  const base64 = await file.base64();
  const arrayBuffer = decode(base64);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: false });

  if (error) throw error;
  return data;
}
// --------------------------------------------------

export default function CreateListing({ onCancel, onCreated }: Props) {
  const navigation = useNavigation<MainStackNavigationProp>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [type, setType] = useState<"item" | "service">("item");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [tagText, setTagText] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);

  const [localImages, setLocalImages] = useState<string[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load categories and tags
  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name")
      .order("name")
      .then(({ data }) => {
        if (data) setCats(data);
      });

    supabase
      .from("tags")
      .select("id,name")
      .order("name")
      .then(({ data }) => {
        if (data) setAllTags(data);
      });
  }, []);

  const price_cents = useMemo(() => {
    const n = Number((price || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [price]);

  const normalizeTag = (s: string) => s.replace(/^#/, "").trim().toLowerCase();
  const addTagFromText = () => {
    const cleaned = normalizeTag(tagText);
    if (!cleaned) return;
    const fixedHasName =
      allTags.find((t) => t.name.toLowerCase() === cleaned) !== undefined;
    const customHas = customTags.includes(cleaned);

    if (fixedHasName) {
      const existing = allTags.find((t) => t.name.toLowerCase() === cleaned)!;
      setSelectedTagIds((prev) => new Set(prev).add(existing.id));
    } else if (!customHas) {
      setCustomTags((prev) => [...prev, cleaned]);
    }
    setTagText("");
  };
  const removeCustomTag = (name: string) =>
    setCustomTags((prev) => prev.filter((t) => t !== name));

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5,
    });
    if (!res.canceled && res.assets?.length) {
      setLocalImages((prev) =>
        [...prev, ...res.assets.map((a) => a.uri)].slice(0, 5),
      );
    }
  };

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function handleSubmit() {
    if (!title.trim())
      return Alert.alert("Missing title", "Please enter a title.");
    if (!categoryId)
      return Alert.alert("Missing category", "Please choose a category.");

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setSubmitting(false);
      return Alert.alert("Not signed in");
    }

    // 1) Create listing
    const { data: listing, error: insertErr } = await supabase
      .from("listings")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price_cents,
        type,
        category_id: categoryId,
      })
      .select("id")
      .single();

    if (insertErr || !listing) {
      setSubmitting(false);
      return Alert.alert("Error", insertErr?.message);
    }

    const listingId = listing.id as number;

    try {
      // 2) Upload images → listing_images
      for (let i = 0; i < localImages.length; i++) {
        const uri = localImages[i];
        const ext = guessExt(uri);
        const path = `${listingId}/${Date.now()}_${i}.${ext}`;

        await uploadImageRN(supabase, BUCKET, uri, path);

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = pub?.publicUrl ?? null;

        const { error } = await supabase
          .from("listing_images")
          .insert({ listing_id: listingId, url, sort_order: i });
        if (error) throw error;
      }

      // 3) Upsert custom tags & assign
      let allSelectedIds = new Set<number>(selectedTagIds);
      if (customTags.length > 0) {
        const { data: upserted, error: upErr } = await supabase
          .from("tags")
          .upsert(customTags.map((name) => ({ name })))
          .select("id,name");
        if (upErr) throw upErr;

        const idsFromNames = (upserted ?? [])
          .filter((r) => customTags.includes(r.name.toLowerCase()))
          .map((r) => r.id);
        idsFromNames.forEach((id) => allSelectedIds.add(id));
      }

      if (allSelectedIds.size) {
        const rows = Array.from(allSelectedIds).map((tag_id) => ({
          listing_id: listingId,
          tag_id,
        }));
        const { error } = await supabase.from("listing_tags").insert(rows);
        if (error) throw error;
      }

      Alert.alert("Success", "Your listing has been posted!");
      onCreated?.(listingId);
      navigation.navigate("MainTabs");
    } catch (e: any) {
      Alert.alert("Upload error", e.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.white }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerWrap}>
          <Text style={styles.header}>Create a Post</Text>
          <View style={styles.headerUnderline} />
        </View>

        <Text style={styles.sectionTitle}>Basic Info</Text>
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={styles.inputContainer}
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe what you're offering..."
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={styles.inputContainer}
        />
        <Input
          label="Price (USD)"
          value={price}
          keyboardType="decimal-pad"
          onChangeText={setPrice}
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={styles.inputContainer}
        />

        <Text style={styles.sectionTitle}>Type</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, type === "item" && styles.toggleActive]}
            onPress={() => setType("item")}
          >
            <Text
              style={[
                styles.toggleText,
                type === "item" && styles.toggleTextActive,
              ]}
            >
              Item
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              type === "service" && styles.toggleActive,
            ]}
            onPress={() => setType("service")}
          >
            <Text
              style={[
                styles.toggleText,
                type === "service" && styles.toggleTextActive,
              ]}
            >
              Service
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryList}>
          {cats.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                cat.id === categoryId && styles.categoryActive,
              ]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  cat.id === categoryId && styles.categoryTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tagContainer}>
          {allTags.map((t) => {
            const active = selectedTagIds.has(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => toggleTag(t.id)}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>
                  #{t.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Add your own tag"
          placeholder="e.g. delivery, urgent"
          value={tagText}
          onChangeText={setTagText}
          onSubmitEditing={addTagFromText}
          rightIcon={
            <Button
              title="Add"
              type="clear"
              titleStyle={styles.linkButtonTitle}
              onPress={addTagFromText}
            />
          }
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={styles.inputContainer}
        />
        {customTags.length > 0 && (
          <View style={styles.tagContainer}>
            {customTags.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.tagChip, styles.customTagChip]}
                onPress={() => removeCustomTag(name)}
              >
                <Text style={styles.tagText}>#{name} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Images</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <Button
            title="Pick images"
            onPress={pickImages}
            buttonStyle={styles.primaryButton}
            titleStyle={styles.primaryButtonTitle}
            disabledStyle={{ backgroundColor: Colors.grayDisabled }}
          />
          <Text style={styles.subtleText}>{localImages.length}/5</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {localImages.map((uri, idx) => (
              <TouchableOpacity
                key={uri}
                onLongPress={() =>
                  setLocalImages((prev) => prev.filter((u) => u !== uri))
                }
              >
                <Image
                  source={{ uri }}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: BorderRadius.medium,
                  }}
                />
                <Text
                  style={[
                    styles.subtleText,
                    { textAlign: "center", marginTop: 4 },
                  ]}
                >
                  #{idx + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            type="outline"
            onPress={() => {
              onCancel?.();
              navigation.navigate("MainTabs");
            }}
            containerStyle={{ flex: 1, marginRight: 8 }}
            buttonStyle={styles.secondaryButton}
            titleStyle={styles.secondaryButtonTitle}
          />
          <Button
            title={submitting ? "Posting..." : "Post"}
            onPress={handleSubmit}
            disabled={submitting}
            containerStyle={{ flex: 1 }}
            buttonStyle={styles.primaryButton}
            titleStyle={styles.primaryButtonTitle}
            disabledStyle={{ backgroundColor: Colors.grayDisabled }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    padding: Spacing.lg, // 16px
  },

  // Headings: Angora, bold
  headerWrap: { marginBottom: Spacing.sm }, // 8px
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.heading, // Angora
  },
  headerUnderline: {
    height: 6,
    width: 72,
    backgroundColor: Colors.secondary, // Teal #1ABC9C
    borderRadius: BorderRadius.medium, // 8px (was 3)
    marginTop: Spacing.sm, // 8px
  },

  sectionTitle: {
    marginTop: Spacing.lg, // 16px (was 20)
    marginBottom: 6,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.darkTeal,
    fontFamily: Fonts.heading, // Angora
  },

  // Inputs: light borders, body font
  inputContainer: { paddingHorizontal: 0 },
  inputLabel: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body, // Open Sans
    fontSize: 14,
  },
  inputText: {
    color: Colors.darkTeal,
    fontFamily: Fonts.body, // Open Sans
    fontSize: 16,
  },

  // Toggle (Item/Service)
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px (was 12)
    padding: Spacing.md, // 12px
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  toggleActive: {
    backgroundColor: Colors.lightMint,
    borderColor: Colors.secondary, // Teal #1ABC9C
  },
  toggleText: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body, // Open Sans
    fontSize: 15,
  },
  toggleTextActive: {
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.body, // Open Sans
  },

  // Category chips
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }, // 8px
  categoryChip: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px (was 24)
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm, // 8px
    marginVertical: 4,
    backgroundColor: Colors.white,
  },
  categoryActive: {
    backgroundColor: Colors.primary_blue + "22", // subtle tint
    borderColor: Colors.primary_blue, // #3498DB
  },
  categoryText: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body, // Open Sans
  },
  categoryTextActive: {
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.body, // Open Sans
  },

  // Tags
  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginVertical: 10 },
  tagChip: {
    backgroundColor: Colors.lightMint,
    borderRadius: BorderRadius.medium, // 8px (was 20)
    paddingHorizontal: Spacing.md, // 12px
    paddingVertical: 6,
    marginRight: Spacing.sm, // 8px
    marginBottom: Spacing.sm, // 8px
    borderWidth: 1,
    borderColor: Colors.secondary, // Teal #1ABC9C
  },
  customTagChip: {
    backgroundColor: Colors.white,
    borderColor: Colors.lightGray,
  },
  tagChipActive: {
    backgroundColor: Colors.primary_blue, // #3498DB
    borderColor: Colors.primary_blue,
  },
  tagText: {
    color: Colors.secondary, // Teal #1ABC9C
    fontSize: 14,
    fontFamily: Fonts.body, // Open Sans
  },
  tagTextActive: {
    color: Colors.white,
    fontWeight: "700",
    fontFamily: Fonts.body, // Open Sans
  },

  subtleText: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body, // Open Sans
  },

  // Buttons (Primary/Secondary per style guide)
  primaryButton: {
    backgroundColor: Colors.primary_blue, // #3498DB
    borderRadius: BorderRadius.medium, // 8px (was 12)
    paddingVertical: Spacing.md, // 12px
  },
  primaryButtonTitle: {
    fontFamily: Fonts.heading, // Angora
    fontWeight: "600",
    letterSpacing: Typography.buttonText.letterSpacing, // 1.2
    fontSize: Typography.buttonText.fontSize, // 14px
  },
  secondaryButton: {
    borderColor: Colors.borderLight, // #ECF0F1
    borderWidth: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium, // 8px (was 12)
    paddingVertical: Spacing.md, // 12px
  },
  secondaryButtonTitle: {
    color: Colors.secondaryText, // #2E86C1
    fontFamily: Fonts.heading, // Angora
    fontWeight: "600",
    letterSpacing: Typography.buttonText.letterSpacing, // 1.2
    fontSize: Typography.buttonText.fontSize, // 14px
  },
  linkButtonTitle: {
    color: Colors.primary_blue, // #3498DB
    fontFamily: Fonts.heading, // Angora
    fontWeight: "600",
    letterSpacing: Typography.buttonText.letterSpacing, // 1.2
    fontSize: Typography.buttonText.fontSize, // 14px
  },

  buttonRow: { flexDirection: "row", marginTop: Spacing.xl }, // 24px
});
