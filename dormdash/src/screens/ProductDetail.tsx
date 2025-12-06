import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Icon } from "@rneui/themed";
import { useRoute, useNavigation } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const IMAGE_MAX_WIDTH = 600; // Max width for images on web

type MainStackParamList = {
  ProductDetail: { listingId: number };
  EditListing: { listingId: number };
  PaymentPortal: { priceCents: number; listingTitle: string };
};

type ProductDetailProps = NativeStackScreenProps<
  MainStackParamList,
  "ProductDetail"
>;

interface Listing {
  id: number;
  title: string;
  description: string;
  price_cents: number;
  type: string;
  category_id: number;
  categories?: { name: string } | null;
  listing_images: { url: string }[];
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  rating?: number;
  review_count?: number;
}

interface Review {
  id: number;
  listing_id: number;
  reviewer_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export default function ProductDetail({
  route,
  navigation,
}: ProductDetailProps) {
  const { listingId } = route.params;

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const imageScrollRef = useRef<ScrollView>(null);
  const addToCartScale = useRef(new Animated.Value(1)).current;

  const handleImageScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== imageIndex && listing?.listing_images) {
      setImageIndex(
        Math.max(0, Math.min(newIndex, listing.listing_images.length - 1)),
      );
    }
  };

  const scrollToImage = (index: number) => {
    if (listing?.listing_images) {
      const clampedIndex = Math.max(
        0,
        Math.min(index, listing.listing_images.length - 1),
      );
      // On web, just update the index (no scrolling needed)
      // On mobile, scroll the ScrollView
      if (!isWeb && imageScrollRef.current) {
        imageScrollRef.current.scrollTo({
          x: clampedIndex * SCREEN_WIDTH,
          animated: true,
        });
      }
      setImageIndex(clampedIndex);
    }
  };

  useEffect(() => {
    fetchListingDetails();
  }, [listingId]);

  const fetchListingDetails = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch listing with images
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*, listing_images(url), categories(name)")
        .eq("id", listingId)
        .single();

      if (listingError) throw listingError;

      setListing(listingData);

      // Check if current user is the owner
      if (user && listingData?.user_id === user.id) {
        setIsOwner(true);
      }

      if (listingData?.user_id) {
        // Fetch seller profile with aggregate ratings across all their listings
        const { data: sellerData, error: sellerError } = await supabase
          .from("seller_profiles")
          .select("*")
          .eq("id", listingData.user_id)
          .single();

        if (!sellerError && sellerData) {
          setSeller({
            id: sellerData.id,
            username: sellerData.display_name || "Seller",
            avatar_url: sellerData.avatar_url || undefined,
            rating: parseFloat(sellerData.avg_rating) || 0,
            review_count: sellerData.total_reviews || 0,
          });
        } else {
          // Fallback if seller profile not found
          setSeller({
            id: listingData.user_id,
            username: "Seller",
            avatar_url: undefined,
            rating: 0,
            review_count: 0,
          });
        }

        // Fetch reviews for this listing (for display in review section)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("*")
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false });

        if (!reviewsError && reviewsData) {
          setReviews(reviewsData);
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(addToCartScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(addToCartScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setAddingToCart(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        setAddingToCart(false);
        alert("Login Required", "You must be logged in to add to cart.");
        return;
      }

      if (!listing) return;

      // Check if item already exists in cart
      const { data: existing, error: existingError } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", userId)
        .eq("listing_id", listing.id)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking cart:", existingError);
        return;
      }

      // If in cart → increment quantity
      if (existing) {
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new cart item
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            listing_id: listing.id,
            quantity: 1,
          });

        if (insertError) throw insertError;
      }

      alert("Added to Cart", `${listing.title} was added to your cart.`, [
        { text: "Continue", style: "cancel" },
        {
          text: "View Cart",
          onPress: () =>
            navigation.navigate("MainTabs" as any, { screen: "CartTab" }),
        },
      ]);
    } catch (error) {
      console.error("Add to cart error:", error);
      alert("Error", "Could not add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      if (!reviewComment.trim() && reviewRating === 0) {
        alert("Error", "Please provide a rating or comment");
        return;
      }

      setSubmittingReview(true);

      const { data: userData } = await supabase.auth.getSession();
      const userId = userData.session?.user?.id;

      if (!userId) {
        alert("Error", "You must be logged in to leave a review");
        return;
      }

      const { error } = await supabase.from("reviews").insert([
        {
          listing_id: listingId,
          reviewer_id: userId,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        },
      ]);

      if (error) throw error;

      // Reset form
      setReviewComment("");
      setReviewRating(5);

      // Refresh reviews
      fetchListingDetails();

      alert("Success", "Your review has been posted!");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditListing = () => {
    setMenuVisible(false);
    navigation.navigate("EditListing", { listingId });
  };

  const handleDeleteListing = () => {
    setMenuVisible(false);
    alert(
      "Delete Listing",
      "Are you sure you want to delete this listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              // Delete related records first (due to foreign key constraints)
              await supabase
                .from("listing_images")
                .delete()
                .eq("listing_id", listingId);

              await supabase
                .from("listing_tags")
                .delete()
                .eq("listing_id", listingId);

              await supabase
                .from("reviews")
                .delete()
                .eq("listing_id", listingId);

              await supabase
                .from("cart_items")
                .delete()
                .eq("listing_id", listingId);

              // Delete the listing itself
              const { error } = await supabase
                .from("listings")
                .delete()
                .eq("id", listingId);

              if (error) throw error;

              alert("Success", "Listing has been deleted.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error("Error deleting listing:", error);
              alert("Error", "Failed to delete listing. Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const calculateAverageRating = (): number => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            type="material"
            size={16}
            color={star <= rating ? "#FFB800" : Colors.lightGray}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: 20 }}
        />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" type="material-community" size={24} />
          </TouchableOpacity>
        </View>
        <Text style={styles.errorText}>Product not found</Text>
      </SafeAreaView>
    );
  }

  const price = (listing.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" type="material-community" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            disabled={deleting}
          >
            <Icon
              name="dots-three-vertical"
              type="entypo"
              size={20}
              color={deleting ? Colors.lightGray : Colors.darkTeal}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Owner Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditListing}
            >
              <Icon
                name="pencil"
                type="material-community"
                size={20}
                color={Colors.darkTeal}
              />
              <Text style={styles.menuItemText}>Edit Listing</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteListing}
            >
              <Icon
                name="delete"
                type="material-community"
                size={20}
                color={Colors.error || "#E74C3C"}
              />
              <Text style={[styles.menuItemText, styles.deleteText]}>
                Delete Listing
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        {listing.listing_images && listing.listing_images.length > 0 ? (
          <View style={styles.imageCarouselContainer}>
            {isWeb ? (
              // Web: Show single image, switch with arrows/indicators
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: listing.listing_images[imageIndex]?.url }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              // Mobile: Scrollable carousel
              <ScrollView
                ref={imageScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleImageScroll}
                scrollEventThrottle={16}
              >
                {listing.listing_images.map((img, index) => (
                  <View
                    key={index}
                    style={[styles.imageWrapper, { width: SCREEN_WIDTH }]}
                  >
                    <Image
                      source={{ uri: img.url }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Arrow buttons */}
            {listing.listing_images.length > 1 && (
              <>
                {imageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.arrowLeft]}
                    onPress={() => scrollToImage(imageIndex - 1)}
                  >
                    <Icon
                      name="chevron-left"
                      type="material-community"
                      size={28}
                      color={Colors.white}
                    />
                  </TouchableOpacity>
                )}
                {imageIndex < listing.listing_images.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.arrowRight]}
                    onPress={() => scrollToImage(imageIndex + 1)}
                  >
                    <Icon
                      name="chevron-right"
                      type="material-community"
                      size={28}
                      color={Colors.white}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Indicators */}
            {listing.listing_images.length > 1 && (
              <View style={styles.imageIndicators}>
                {listing.listing_images.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.indicator,
                      index === imageIndex && styles.indicatorActive,
                    ]}
                    onPress={() => scrollToImage(index)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imageWrapper}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.productImage}
              resizeMode={isWeb ? "contain" : "cover"}
            />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{price}</Text>

          {listing.categories?.name && (
            <Text style={styles.category}>
              Category: {listing.categories.name}
            </Text>
          )}

          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Seller Info */}
        {seller && (
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.sellerCard}>
              {seller.avatar_url ? (
                <Image
                  source={{ uri: seller.avatar_url }}
                  style={styles.sellerAvatar}
                />
              ) : (
                <View style={styles.sellerAvatarPlaceholder}>
                  <Icon
                    name="account"
                    type="material-community"
                    size={32}
                    color={Colors.primary_blue}
                  />
                </View>
              )}
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{seller.username}</Text>
                {seller.rating !== undefined && seller.review_count > 0 ? (
                  <View>
                    {renderStars(Math.round(seller.rating))}
                    <Text style={styles.ratingText}>
                      {seller.rating.toFixed(1)} ({seller.review_count}{" "}
                      {seller.review_count === 1 ? "review" : "reviews"}{" "}
                      overall)
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.ratingText}>No reviews yet</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Leave a Review Section */}
        <View style={styles.leaveReviewSection}>
          <Text style={styles.sectionTitle}>Leave a Review</Text>

          {/* Rating Selector */}
          <View style={styles.ratingSelector}>
            <Text style={styles.ratingLabel}>Your Rating:</Text>
            <View style={styles.starsSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.starButton}
                >
                  <Icon
                    name={star <= reviewRating ? "star" : "star-outline"}
                    type="material"
                    size={32}
                    color={star <= reviewRating ? "#FFB800" : Colors.lightGray}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Comment Input */}
          <Text style={styles.commentLabel}>Your Comment (Optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience with this product..."
            placeholderTextColor={Colors.lightGray}
            multiline
            numberOfLines={4}
            value={reviewComment}
            onChangeText={setReviewComment}
            editable={!submittingReview}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitReviewButton,
              submittingReview && styles.submitReviewButtonDisabled,
            ]}
            onPress={handleSubmitReview}
            disabled={submittingReview}
          >
            {submittingReview ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.submitReviewButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.ratingOverview}>
              <View style={styles.ratingScore}>
                <Text style={styles.ratingNumber}>
                  {calculateAverageRating().toFixed(1)}
                </Text>
                {renderStars(Math.round(calculateAverageRating()))}
              </View>
              <Text style={styles.reviewCount}>
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {reviews.map((review) => (
              <React.Fragment key={review.id}>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {`Reviewer ${review.reviewer_id.slice(0, 8)}`}
                    </Text>
                    {renderStars(review.rating)}
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Empty Reviews State */}
        {reviews.length === 0 && (
          <View style={styles.noReviewsSection}>
            <Text style={styles.noReviewsText}>
              No reviews yet. Be the first to review!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={styles.buyButtonContainer}>
        <Animated.View
          style={{ transform: [{ scale: addToCartScale }], width: "100%" }}
        >
          <TouchableOpacity
            style={[styles.buyButton, addingToCart && styles.buyButtonDisabled]}
            onPress={handleAddToCart}
            disabled={addingToCart}
            activeOpacity={0.8}
          >
            {addingToCart ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Icon
                  name="cart-plus"
                  type="material-community"
                  color={Colors.white}
                  size={24}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={styles.buyButtonText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  headerTitle: {
    ...Typography.heading4,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageCarouselContainer: {
    position: "relative",
    alignItems: "center",
    backgroundColor: Colors.lightMint,
  },
  imageWrapper: {
    width: "100%",
    maxWidth: isWeb ? IMAGE_MAX_WIDTH : undefined,
    height: 420,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightMint,
    alignSelf: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  arrowButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  arrowLeft: {
    left: Spacing.md,
  },
  arrowRight: {
    right: Spacing.md,
  },
  imageIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.lightMint,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  indicatorActive: {
    backgroundColor: Colors.primary_blue,
    width: 28,
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
  },
  title: {
    ...Typography.heading3,
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
    fontWeight: "700",
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280", // medium gray
    marginBottom: Spacing.md,
  },
  category: {
    ...Typography.bodySmall,
    color: Colors.primary_green,
    fontWeight: "600",
    marginBottom: Spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  sellerSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: "#F9FAFB",
  },
  sectionTitle: {
    ...Typography.heading4,
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
    fontWeight: "700",
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sellerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: Spacing.lg,
  },
  sellerAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.lightMint,
    marginRight: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    ...Typography.bodyLarge,
    color: Colors.darkTeal,
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xs,
    gap: 2,
  },
  ratingText: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  reviewsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
  },
  ratingOverview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  ratingScore: {
    alignItems: "center",
    marginRight: Spacing.xxl,
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.primary_blue,
    marginBottom: Spacing.sm,
  },
  reviewCount: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
    fontWeight: "500",
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary_green,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  reviewerName: {
    ...Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  reviewComment: {
    ...Typography.bodyMedium,
    color: Colors.darkTeal,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  reviewDate: {
    ...Typography.bodySmall,
    color: Colors.mutedGray,
    marginTop: Spacing.sm,
  },
  noReviewsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  noReviewsText: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Buy Button
  buyButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -2 },
  },
  buyButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buyButtonDisabled: {
    backgroundColor: Colors.borderGray,
  },
  buyButtonText: {
    ...Typography.bodyLarge,
    color: Colors.white,
    fontWeight: "700",
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  leaveReviewSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  ratingSelector: {
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    ...Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
  },
  starsSelector: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: Spacing.lg,
  },
  starButton: {
    padding: Spacing.sm,
  },
  commentLabel: {
    ...Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.darkTeal,
    backgroundColor: Colors.white,
    marginBottom: Spacing.lg,
    textAlignVertical: "top",
  },
  submitReviewButton: {
    backgroundColor: Colors.primary_green,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  submitReviewButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewButtonText: {
    ...Typography.bodyLarge,
    color: Colors.white,
    fontWeight: "600",
  },

  // Menu Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    minWidth: 200,
    paddingVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.darkTeal,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.md,
  },
  deleteText: {
    color: Colors.error || "#E74C3C",
  },
});
