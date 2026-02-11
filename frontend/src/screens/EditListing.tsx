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
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isCompact = !isWeb && windowWidth < 390;

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

  // Location state for dasher system
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(
    null,
  );
  const [defaultPickupLocation, setDefaultPickupLocation] =
    useState<LocationData | null>(null);

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

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: defaultAddress } = await supabase
            .from("addresses")
            .select(
              "building_name, room_number, street_address, city, state, zip_code, lat, lng",
            )
            .eq("user_id", user.id)
            .eq("is_default", true)
            .limit(1)
            .maybeSingle();

          if (defaultAddress?.lat != null && defaultAddress?.lng != null) {
            const baseAddress =
              defaultAddress.street_address ||
              defaultAddress.building_name ||
              "";
            if (baseAddress) {
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

              setDefaultPickupLocation({
                address: addressLine || baseAddress,
                lat: defaultAddress.lat,
                lng: defaultAddress.lng,
                buildingName: defaultAddress.building_name || undefined,
              });
            }
          }
        }

        // Load existing listing
        const { data: listing, error } = await supabase
          .from("listings")
          .select(
            "*, listing_images(id, url, sort_order), listing_tags(tag_id)",
          )
          .eq("id", listingId)
          .single();

        if (error) throw error;

        if (listing) {
          setTitle(listing.title || "");
          setDescription(listing.description || "");
          setPrice(
            listing.price_cents ? (listing.price_cents / 100).toString() : "",
          );
          setType(listing.type || "item");
          setCategoryId(listing.category_id);

          const { data: pickupData } = await supabase
            .from("listing_pickup_locations")
            .select(
              "pickup_address, pickup_building_name, pickup_lat, pickup_lng",
            )
            .eq("listing_id", listingId)
            .maybeSingle();

          if (pickupData) {
            setPickupLocation({
              address: pickupData.pickup_address,
              lat: pickupData.pickup_lat,
              lng: pickupData.pickup_lng,
              buildingName: pickupData.pickup_building_name || undefined,
            });
          } else if (listing.pickup_address || listing.pickup_lat) {
            setPickupLocation({
              address: listing.pickup_address || "",
              lat: Number(listing.pickup_lat || 0),
              lng: Number(listing.pickup_lng || 0),
            });
          }

          // Sort and set existing images
          const sortedImages = [...(listing.listing_images || [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          );
          setExistingImages(
            sortedImages.map((img: any) => ({ id: img.id, url: img.url })),
          );

          // Set selected tags
          const tagIds = (listing.listing_tags || []).map(
            (lt: any) => lt.tag_id,
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
    if (!pickupLocation) {
      return alert(
        "Missing pickup location",
        "Please choose a pickup location for dashers.",
      );
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        alert("Error", "Please log in to update this listing.");
        setSubmitting(false);
        return;
      }

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

      const { error: pickupError } = await supabase
        .from("listing_pickup_locations")
        .upsert(
          {
            listing_id: listingId,
            seller_id: user.id,
            pickup_address: pickupLocation.address,
            pickup_building_name: pickupLocation.buildingName || null,
            pickup_lat: pickupLocation.lat,
            pickup_lng: pickupLocation.lng,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "listing_id" },
        );

      if (pickupError) throw pickupError;

      // 2) Delete removed images
      if (imagesToDelete.length > 0) {
        await supabase.from("listing_images").delete().in("id", imagesToDelete);
      }

      // 3) Upload new images
      const currentImageCount = existingImages.filter(
        (img) => !imagesToDelete.includes(img.id),
      ).length;

      for (let i = 0; i < localImages.length; i++) {
        const uri = localImages[i];
        const ext = guessExt(uri);
        const contentType = guessMime(ext);
        const path = `${listingId}/${Date.now()}_${i}.${ext}`;

        await uploadImageToSupabase(supabase, BUCKET, uri, path, contentType);

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = pub?.publicUrl ?? null;

        const { error } = await supabase.from("listing_images").insert({
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
      navigation.goBack();
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
    (img) => !imagesToDelete.includes(img.id),
  );
  const totalImages = visibleExistingImages.length + localImages.length;

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
              title="Edit Listing"
              subtitle="Update details and media before publishing changes"
              rightSlot={<LiveBadge label="Edit live" />}
              style={styles.pageHeader}
            />

            <SurfaceCard variant="glass" style={styles.sectionCard}>
              <SectionHeader
                title="Basic Info"
                subtitle="Core details shown to buyers"
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
                subtitle="Tune discovery and search relevance"
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
                subtitle="Tap to remove, tap removed to restore"
                rightSlot={
                  <StatusPill label={`${totalImages}/5`} tone="warning" />
                }
                style={styles.sectionHeader}
              />
              <View style={styles.imagesTopRow}>
                <TouchableOpacity
                  style={[
                    styles.pickButton,
                    totalImages >= 5 && styles.pickButtonDisabled,
                  ]}
                  onPress={pickImages}
                  disabled={totalImages >= 5}
                >
                  <Text style={styles.pickButtonText}>Pick Images</Text>
                </TouchableOpacity>
                <Text style={styles.subtleText}>
                  {isCompact ? "Max 5" : "Up to 5 total images"}
                </Text>
              </View>

              {visibleExistingImages.length > 0 && (
                <>
                  <Text style={styles.imageLabel}>Current Images</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imagesRow}>
                      {visibleExistingImages.map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          onPress={() => removeExistingImage(img.id)}
                        >
                          <Image
                            source={{ uri: img.url }}
                            style={styles.previewImage}
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

              {imagesToDelete.length > 0 && (
                <>
                  <Text style={styles.imageLabel}>
                    Removed (tap to restore)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imagesRow}>
                      {existingImages
                        .filter((img) => imagesToDelete.includes(img.id))
                        .map((img) => (
                          <TouchableOpacity
                            key={img.id}
                            onPress={() => restoreExistingImage(img.id)}
                          >
                            <Image
                              source={{ uri: img.url }}
                              style={[styles.previewImage, styles.removedImage]}
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

              {localImages.length > 0 && (
                <>
                  <Text style={styles.imageLabel}>New Images</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imagesRow}>
                      {localImages.map((uri) => (
                        <TouchableOpacity
                          key={uri}
                          onPress={() => removeLocalImage(uri)}
                        >
                          <Image source={{ uri }} style={styles.previewImage} />
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

              {totalImages === 0 && (
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
              onPress={() => navigation.goBack()}
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
                {submitting ? "Saving..." : "Save Changes"}
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
    paddingBottom: 170,
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
    backgroundColor: Colors.primary_blue + "22",
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pickButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  pickButtonDisabled: {
    backgroundColor: Colors.grayDisabled,
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
    marginBottom: Spacing.xs,
  },
  previewImage: {
    width: 130,
    height: 130,
    borderRadius: BorderRadius.medium,
  },
  removedImage: {
    opacity: 0.4,
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
  imageLabel: {
    fontSize: 13,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
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
  emptyImages: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    alignItems: "center",
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
    width: "100%",
    alignSelf: "center",
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
