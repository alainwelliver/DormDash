import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Colors,
  SemanticColors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  WebLayout,
} from "../assets/styles";
import { alert, pickImage, uploadImageToSupabase } from "../lib/utils/platform";
import {
  LiveBadge,
  LocationPicker,
  LocationData,
  SectionHeader,
  StatusPill,
  StickyActionBar,
  SurfaceCard,
} from "../components";

type MainStackNavigationProp = NativeStackNavigationProp<
  { MainTabs: undefined; CreateListing: undefined },
  "CreateListing"
>;

type Category = { id: number; name: string };
type Tag = { id: number; name: string };
type Props = { onCancel?: () => void; onCreated?: (listingId: number) => void };

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

export default function CreateListing({ onCancel, onCreated }: Props) {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isCompact = !isWeb && windowWidth < 390;
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

  // Location state for dasher system
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(
    null,
  );
  const [defaultPickupLocation, setDefaultPickupLocation] =
    useState<LocationData | null>(null);

  // Load categories and tags
  useEffect(() => {
    const loadCreateListingData = async () => {
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: defaultAddress } = await supabase
        .from("addresses")
        .select(
          "building_name, room_number, street_address, city, state, zip_code, lat, lng",
        )
        .eq("user_id", user.id)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

      if (
        !defaultAddress ||
        defaultAddress.lat == null ||
        defaultAddress.lng == null
      ) {
        return;
      }

      const baseAddress =
        defaultAddress.street_address || defaultAddress.building_name || "";
      if (!baseAddress) return;

      const addressLine = defaultAddress.building_name
        ? defaultAddress.room_number
          ? `${defaultAddress.building_name}, ${defaultAddress.room_number}`
          : defaultAddress.building_name
        : [
            defaultAddress.street_address,
            defaultAddress.city,
            defaultAddress.state,
            defaultAddress.zip_code,
          ]
            .filter(Boolean)
            .join(", ");

      const location: LocationData = {
        address: addressLine || baseAddress,
        lat: defaultAddress.lat,
        lng: defaultAddress.lng,
        buildingName: defaultAddress.building_name || undefined,
      };
      setDefaultPickupLocation(location);
      setPickupLocation(location);
    };

    void loadCreateListingData();
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
    const uris = await pickImage({
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5,
    });
    if (uris && uris.length > 0) {
      setLocalImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function handleSubmit() {
    if (!title.trim()) return alert("Missing title", "Please enter a title.");
    if (!categoryId)
      return alert("Missing category", "Please choose a category.");
    if (!pickupLocation) {
      return alert(
        "Missing pickup location",
        "Please choose a pickup location for dashers.",
      );
    }

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setSubmitting(false);
      return alert("Not signed in");
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
      return alert("Error", insertErr?.message);
    }

    const listingId = listing.id as number;

    try {
      const { error: pickupError } = await supabase
        .from("listing_pickup_locations")
        .insert({
          listing_id: listingId,
          seller_id: user.id,
          pickup_address: pickupLocation.address,
          pickup_building_name: pickupLocation.buildingName || null,
          pickup_lat: pickupLocation.lat,
          pickup_lng: pickupLocation.lng,
        });

      if (pickupError) {
        await supabase.from("listings").delete().eq("id", listingId);
        throw pickupError;
      }

      // 2) Upload images → listing_images
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

      alert("Success", "Your listing has been posted!");
      onCreated?.(listingId);
      navigation.navigate("MainTabs");
    } catch (e: any) {
      alert("Upload error", e.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.pageWrap, isWeb && styles.webContainer]}>
            <SectionHeader
              title="Create a Post"
              subtitle="List something in under a minute"
              rightSlot={<LiveBadge label="Seller live" />}
              style={styles.pageHeader}
            />

            <SurfaceCard variant="glass" style={styles.sectionCard}>
              <SectionHeader
                title="Basic Info"
                subtitle="The essentials buyers see first"
                rightSlot={
                  <StatusPill
                    label={type === "item" ? "Item" : "Service"}
                    tone="info"
                  />
                }
                style={styles.sectionHeader}
              />
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputBox}
                containerStyle={styles.inputContainer}
                placeholder="What are you posting?"
                placeholderTextColor={Colors.borderGray}
              />
              <Input
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Describe what you're offering..."
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={[styles.inputBox, styles.textAreaBox]}
                containerStyle={styles.inputContainer}
                placeholderTextColor={Colors.borderGray}
              />
              <Input
                label="Price (USD)"
                value={price}
                keyboardType="decimal-pad"
                onChangeText={setPrice}
                inputStyle={styles.inputText}
                labelStyle={styles.inputLabel}
                inputContainerStyle={styles.inputBox}
                containerStyle={styles.inputContainer}
                placeholder="0.00"
                placeholderTextColor={Colors.borderGray}
              />

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    type === "item" && styles.toggleActive,
                  ]}
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
            </SurfaceCard>

            <SurfaceCard variant="default" style={styles.sectionCard}>
              <SectionHeader
                title="Category & Tags"
                subtitle="Improve discovery with smart metadata"
                rightSlot={
                  <StatusPill
                    label={`${selectedTagIds.size + customTags.length} tags`}
                    tone="success"
                  />
                }
                style={styles.sectionHeader}
              />

              <Text style={styles.inlineLabel}>Category</Text>
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

              <Text style={styles.inlineLabel}>Tags</Text>
              <View style={styles.tagContainer}>
                {allTags.map((t) => {
                  const active = selectedTagIds.has(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.tagChip, active && styles.tagChipActive]}
                      onPress={() => toggleTag(t.id)}
                    >
                      <Text
                        style={[styles.tagText, active && styles.tagTextActive]}
                      >
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
                inputContainerStyle={styles.inputBox}
                containerStyle={styles.inputContainer}
                placeholderTextColor={Colors.borderGray}
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
            </SurfaceCard>

            <SurfaceCard variant="default" style={styles.sectionCard}>
              <SectionHeader
                title="Images"
                subtitle="Long press any image to remove it"
                rightSlot={
                  <StatusPill
                    label={`${localImages.length}/5`}
                    tone="warning"
                  />
                }
                style={styles.sectionHeader}
              />
              <View style={styles.imagesTopRow}>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={pickImages}
                >
                  <Text style={styles.pickButtonText}>Pick Images</Text>
                </TouchableOpacity>
                <Text style={styles.subtleText}>
                  {isCompact ? "Max 5" : "You can upload up to 5 images"}
                </Text>
              </View>

              {localImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imagesRow}>
                    {localImages.map((uri, idx) => (
                      <TouchableOpacity
                        key={uri}
                        onLongPress={() =>
                          setLocalImages((prev) =>
                            prev.filter((u) => u !== uri),
                          )
                        }
                      >
                        <Image source={{ uri }} style={styles.previewImage} />
                        <Text style={styles.previewIndex}>#{idx + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyImages}>
                  <Text style={styles.subtleText}>No images selected yet</Text>
                </View>
              )}
            </SurfaceCard>

            <SurfaceCard variant="mint" style={styles.sectionCard}>
              <SectionHeader
                title="Pickup Location"
                subtitle="Only dashers can see this for delivery orders"
                rightSlot={
                  <StatusPill
                    label={pickupLocation ? "Set" : "Required"}
                    tone={pickupLocation ? "success" : "warning"}
                  />
                }
                style={styles.sectionHeader}
              />
              {defaultPickupLocation ? (
                <TouchableOpacity
                  style={styles.defaultLocationButton}
                  onPress={() => setPickupLocation(defaultPickupLocation)}
                >
                  <Text style={styles.defaultLocationButtonText}>
                    Use profile default location
                  </Text>
                </TouchableOpacity>
              ) : null}
              <LocationPicker
                value={pickupLocation}
                onChange={setPickupLocation}
                placeholder="Select where item can be picked up"
                label=""
                helperText="Required. This location is hidden from buyers and only shown to dashers for delivery orders."
              />
            </SurfaceCard>
          </View>
        </ScrollView>

        <StickyActionBar style={styles.actionBar}>
          <View style={[styles.buttonRow, isWeb && styles.webButtonRow]}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => {
                onCancel?.();
                navigation.navigate("MainTabs");
              }}
              disabled={submitting}
            >
              <Text style={styles.secondaryActionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryAction,
                submitting && styles.disabledAction,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryActionText}>
                {submitting ? "Posting..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
        </StickyActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 160,
  },
  pageWrap: {
    width: "100%",
    gap: Spacing.sm,
  },
  webContainer: {
    maxWidth: WebLayout.maxFormWidth + 120,
    alignSelf: "center",
  },
  pageHeader: {
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    borderColor: SemanticColors.borderSubtle,
    ...Shadows.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  inlineLabel: {
    ...Typography.label,
    color: Colors.mutedGray,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  inputText: {
    color: Colors.darkTeal,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 15,
  },
  inputBox: {
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white,
    minHeight: 46,
  },
  textAreaBox: {
    minHeight: 92,
    alignItems: "flex-start",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 15,
  },
  toggleTextActive: {
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Typography.bodyMedium.fontFamily,
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    marginVertical: 4,
    backgroundColor: Colors.white,
  },
  categoryActive: {
    backgroundColor: Colors.primary_blue + "1A",
    borderColor: Colors.primary_blue,
  },
  categoryText: {
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  categoryTextActive: {
    fontWeight: "700",
    color: Colors.darkTeal,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: Spacing.xs,
  },
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
    borderColor: Colors.borderLight,
  },
  tagChipActive: {
    backgroundColor: Colors.primary_blue,
    borderColor: Colors.primary_blue,
  },
  tagText: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  tagTextActive: {
    color: Colors.white,
    fontWeight: "700",
    fontFamily: Typography.bodySmall.fontFamily,
  },
  imagesTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  pickButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  pickButtonText: {
    ...Typography.buttonText,
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  subtleText: {
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  imagesRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  previewImage: {
    width: 130,
    height: 130,
    borderRadius: BorderRadius.medium,
  },
  previewIndex: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: 4,
  },
  emptyImages: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  defaultLocationButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.primary_blue,
    marginBottom: Spacing.sm,
    backgroundColor: `${Colors.primary_blue}14`,
  },
  defaultLocationButtonText: {
    color: Colors.primary_blue,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "700",
    fontSize: 13,
  },
  linkButtonTitle: {
    color: Colors.primary_blue,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    letterSpacing: Typography.buttonText.letterSpacing,
    fontSize: 13,
  },
  actionBar: {
    bottom: 0,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  webButtonRow: {
    maxWidth: WebLayout.maxFormWidth + 120,
    alignSelf: "center",
    width: "100%",
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 999,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  secondaryActionText: {
    ...Typography.buttonText,
    color: Colors.primary_blue,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryAction: {
    flex: 1,
    backgroundColor: Colors.primary_blue,
    borderRadius: 999,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  primaryActionText: {
    ...Typography.buttonText,
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledAction: {
    backgroundColor: Colors.grayDisabled,
  },
});
