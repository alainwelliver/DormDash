import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  Colors,
  Fonts,
  Typography,
  Spacing,
  BorderRadius,
} from "../assets/styles";
import { alert, pickImage, uploadImageToSupabase } from "../lib/utils/platform";

type MainStackParamList = {
  MainTabs: undefined;
  EditListing: { listingId: number };
  ProductDetail: { listingId: number };
};

type EditListingProps = NativeStackScreenProps<
  MainStackParamList,
  "EditListing"
>;

type Category = { id: number; name: string };
type Tag = { id: number; name: string };

const BUCKET = "listings";

// ---------- Helper functions ----------
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
// --------------------------------------------------

export default function EditListing({ route, navigation }: EditListingProps) {
  const { listingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [type, setType] = useState<"item" | "service">("item");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [tagText, setTagText] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);

  // Track existing images from DB and new local images
  const [existingImages, setExistingImages] = useState<
    { id: number; url: string }[]
  >([]);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  const [cats, setCats] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load categories, tags, and existing listing data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const { data: catsData } = await supabase
          .from("categories")
          .select("id,name")
          .order("name");
        if (catsData) setCats(catsData);

        // Load tags
        const { data: tagsData } = await supabase
          .from("tags")
          .select("id,name")
          .order("name");
        if (tagsData) setAllTags(tagsData);

        // Load existing listing
        const { data: listing, error } = await supabase
          .from("listings")
          .select(
            "*, listing_images(id, url, sort_order), listing_tags(tag_id)"
          )
          .eq("id", listingId)
          .single();

        if (error) throw error;

        if (listing) {
          setTitle(listing.title || "");
          setDescription(listing.description || "");
          setPrice(
            listing.price_cents ? (listing.price_cents / 100).toString() : ""
          );
          setType(listing.type || "item");
          setCategoryId(listing.category_id);

          // Sort and set existing images
          const sortedImages = [...(listing.listing_images || [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          );
          setExistingImages(
            sortedImages.map((img: any) => ({ id: img.id, url: img.url }))
          );

          // Set selected tags
          const tagIds = (listing.listing_tags || []).map(
            (lt: any) => lt.tag_id
          );
          setSelectedTagIds(new Set(tagIds));
        }
      } catch (e: any) {
        console.error("Error loading listing:", e);
        alert("Error", "Failed to load listing details.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [listingId]);

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
    const totalImages =
      existingImages.length - imagesToDelete.length + localImages.length;
    const remaining = 5 - totalImages;
    if (remaining <= 0) {
      alert("Limit reached", "You can only have up to 5 images.");
      return;
    }

    const uris = await pickImage({
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: remaining,
    });
    if (uris && uris.length > 0) {
      setLocalImages((prev) => [...prev, ...uris].slice(0, remaining));
    }
  };

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const removeExistingImage = (imageId: number) => {
    setImagesToDelete((prev) => [...prev, imageId]);
  };

  const restoreExistingImage = (imageId: number) => {
    setImagesToDelete((prev) => prev.filter((id) => id !== imageId));
  };

  const removeLocalImage = (uri: string) => {
    setLocalImages((prev) => prev.filter((u) => u !== uri));
  };

  async function handleSubmit() {
    if (!title.trim()) return alert("Missing title", "Please enter a title.");
    if (!categoryId)
      return alert("Missing category", "Please choose a category.");

    setSubmitting(true);

    try {
      // 1) Update listing
      const { error: updateErr } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price_cents,
          type,
          category_id: categoryId,
        })
        .eq("id", listingId);

      if (updateErr) throw updateErr;

      // 2) Delete removed images
      if (imagesToDelete.length > 0) {
        await supabase.from("listing_images").delete().in("id", imagesToDelete);
      }

      // 3) Upload new images
      const currentImageCount = existingImages.filter(
        (img) => !imagesToDelete.includes(img.id)
      ).length;

      for (let i = 0; i < localImages.length; i++) {
        const uri = localImages[i];
        const ext = guessExt(uri);
        const contentType = guessMime(ext);
        const path = `${listingId}/${Date.now()}_${i}.${ext}`;

        await uploadImageToSupabase(supabase, BUCKET, uri, path, contentType);

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = pub?.publicUrl ?? null;

        const { error } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listingId,
            url,
            sort_order: currentImageCount + i,
          });
        if (error) throw error;
      }

      // 4) Update tags - delete existing and re-insert
      await supabase.from("listing_tags").delete().eq("listing_id", listingId);

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

      alert("Success", "Your listing has been updated!");
      navigation.navigate("ProductDetail", { listingId });
    } catch (e: any) {
      alert("Error", e.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.primary_blue} />
      </SafeAreaView>
    );
  }

  const visibleExistingImages = existingImages.filter(
    (img) => !imagesToDelete.includes(img.id)
  );
  const totalImages = visibleExistingImages.length + localImages.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.white }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerWrap}>
          <Text style={styles.header}>Edit Listing</Text>
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
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <Button
            title="Pick images"
            onPress={pickImages}
            buttonStyle={styles.primaryButton}
            titleStyle={styles.primaryButtonTitle}
            disabledStyle={{ backgroundColor: Colors.grayDisabled }}
            disabled={totalImages >= 5}
          />
          <Text style={styles.subtleText}>{totalImages}/5</Text>
        </View>

        {/* Existing Images */}
        {visibleExistingImages.length > 0 && (
          <>
            <Text style={styles.imageLabel}>
              Current Images (tap to remove)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                {visibleExistingImages.map((img, idx) => (
                  <TouchableOpacity
                    key={img.id}
                    onPress={() => removeExistingImage(img.id)}
                  >
                    <Image
                      source={{ uri: img.url }}
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: BorderRadius.medium,
                      }}
                    />
                    <View style={styles.removeOverlay}>
                      <Text style={styles.removeText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Deleted Images (can restore) */}
        {imagesToDelete.length > 0 && (
          <>
            <Text style={styles.imageLabel}>Removed (tap to restore)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                {existingImages
                  .filter((img) => imagesToDelete.includes(img.id))
                  .map((img) => (
                    <TouchableOpacity
                      key={img.id}
                      onPress={() => restoreExistingImage(img.id)}
                    >
                      <Image
                        source={{ uri: img.url }}
                        style={{
                          width: 140,
                          height: 140,
                          borderRadius: BorderRadius.medium,
                          opacity: 0.4,
                        }}
                      />
                      <View style={styles.restoreOverlay}>
                        <Text style={styles.restoreText}>↺ Restore</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* New Local Images */}
        {localImages.length > 0 && (
          <>
            <Text style={styles.imageLabel}>New Images (tap to remove)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {localImages.map((uri, idx) => (
                  <TouchableOpacity
                    key={uri}
                    onPress={() => removeLocalImage(uri)}
                  >
                    <Image
                      source={{ uri }}
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: BorderRadius.medium,
                      }}
                    />
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                    <View style={styles.removeOverlay}>
                      <Text style={styles.removeText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            type="outline"
            onPress={() => navigation.goBack()}
            containerStyle={{ flex: 1, marginRight: 8 }}
            buttonStyle={styles.secondaryButton}
            titleStyle={styles.secondaryButtonTitle}
          />
          <Button
            title={submitting ? "Saving..." : "Save Changes"}
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
    padding: Spacing.lg,
  },

  headerWrap: { marginBottom: Spacing.sm },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.heading,
  },
  headerUnderline: {
    height: 6,
    width: 72,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
  },

  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.darkTeal,
    fontFamily: Fonts.heading,
  },

  inputContainer: { paddingHorizontal: 0 },
  inputLabel: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  inputText: {
    color: Colors.darkTeal,
    fontFamily: Fonts.body,
    fontSize: 16,
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  toggleActive: {
    backgroundColor: Colors.lightMint,
    borderColor: Colors.secondary,
  },
  toggleText: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  toggleTextActive: {
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.body,
  },

  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  categoryChip: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    marginVertical: 4,
    backgroundColor: Colors.white,
  },
  categoryActive: {
    backgroundColor: Colors.primary_blue + "22",
    borderColor: Colors.primary_blue,
  },
  categoryText: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
  },
  categoryTextActive: {
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Fonts.body,
  },

  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginVertical: 10 },
  tagChip: {
    backgroundColor: Colors.lightMint,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  customTagChip: {
    backgroundColor: Colors.white,
    borderColor: Colors.lightGray,
  },
  tagChipActive: {
    backgroundColor: Colors.primary_blue,
    borderColor: Colors.primary_blue,
  },
  tagText: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: Fonts.body,
  },
  tagTextActive: {
    color: Colors.white,
    fontWeight: "700",
    fontFamily: Fonts.body,
  },

  subtleText: {
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
  },

  imageLabel: {
    fontSize: 13,
    color: Colors.mutedGray,
    fontFamily: Fonts.body,
    marginBottom: 6,
    marginTop: 8,
  },

  removeOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "bold",
  },

  restoreOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
    borderBottomLeftRadius: BorderRadius.medium,
    borderBottomRightRadius: BorderRadius.medium,
  },
  restoreText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: Colors.primary_green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
  },
  primaryButtonTitle: {
    fontFamily: Fonts.heading,
    fontWeight: "600",
    letterSpacing: Typography.buttonText.letterSpacing,
    fontSize: Typography.buttonText.fontSize,
  },
  secondaryButton: {
    borderColor: Colors.borderLight,
    borderWidth: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
  },
  secondaryButtonTitle: {
    color: Colors.secondaryText,
    fontFamily: Fonts.heading,
    fontWeight: "600",
    letterSpacing: Typography.buttonText.letterSpacing,
    fontSize: Typography.buttonText.fontSize,
  },
  linkButtonTitle: {
    color: Colors.primary_blue,
    fontFamily: Fonts.heading,
    fontWeight: "600",
    letterSpacing: Typography.buttonText.letterSpacing,
    fontSize: Typography.buttonText.fontSize,
  },

  buttonRow: { flexDirection: "row", marginTop: Spacing.xl },
});
