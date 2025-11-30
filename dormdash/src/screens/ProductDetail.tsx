import React, { useState, useEffect } from "react";
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
  Alert,
} from "react-native";
import { Icon } from "@rneui/themed";
import { useRoute, useNavigation } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

type MainStackParamList = {
  ProductDetail: { listingId: number };
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

  useEffect(() => {
    fetchListingDetails();
  }, [listingId]);

  const fetchListingDetails = async () => {
    try {
      // Fetch listing with images
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*, listing_images(url), categories(name)")
        .eq("id", listingId)
        .single();

      if (listingError) throw listingError;

      setListing(listingData);

      if (listingData?.user_id) {
        // Create a seller object with basic info
        // In a real app, you'd have a profiles table with user metadata
        setSeller({
          id: listingData.user_id,
          username: "Seller",
          avatar_url: undefined,
          rating: 0,
          review_count: 0,
        });

        // Fetch reviews for this listing
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("*")
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false });

        if (!reviewsError && reviewsData) {
          setReviews(reviewsData);

          // Calculate seller rating from reviews
          if (reviewsData.length > 0) {
            const avgRating =
              reviewsData.reduce((sum, review) => sum + review.rating, 0) /
              reviewsData.length;
            setSeller((prev) =>
              prev
                ? {
                    ...prev,
                    rating: avgRating,
                    review_count: reviewsData.length,
                  }
                : null
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        Alert.alert("Login Required", "You must be logged in to add to cart.");
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

      Alert.alert("Added to Cart", `${listing.title} was added to your cart.`, [
        { text: "Continue", style: "cancel" },
        {
          text: "View Cart",
          onPress: () =>
            navigation.navigate("MainTabs" as any, { screen: "CartTab" }),
        },
      ]);
    } catch (error) {
      console.error("Add to cart error:", error);
      Alert.alert("Error", "Could not add item to cart.");
    }
  };

  const handleSubmitReview = async () => {
    try {
      if (!reviewComment.trim() && reviewRating === 0) {
        Alert.alert("Error", "Please provide a rating or comment");
        return;
      }

      setSubmittingReview(true);

      const { data: userData } = await supabase.auth.getSession();
      const userId = userData.session?.user?.id;

      if (!userId) {
        Alert.alert("Error", "You must be logged in to leave a review");
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

      Alert.alert("Success", "Your review has been posted!");
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        {listing.listing_images && listing.listing_images.length > 0 ? (
          <View>
            <Image
              source={{ uri: listing.listing_images[imageIndex]?.url }}
              style={styles.productImage}
              resizeMode="cover"
            />
            {listing.listing_images.length > 1 && (
              <View style={styles.imageIndicators}>
                {listing.listing_images.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.indicator,
                      index === imageIndex && styles.indicatorActive,
                    ]}
                    onPress={() => setImageIndex(index)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <Image
            source={require("../../assets/icon.png")}
            style={styles.productImage}
            resizeMode="cover"
          />
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
                {seller.rating !== undefined && (
                  <View>
                    {renderStars(Math.round(seller.rating))}
                    <Text style={styles.ratingText}>
                      {seller.rating.toFixed(1)} ({seller.review_count || 0}{" "}
                      reviews)
                    </Text>
                  </View>
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
        <TouchableOpacity style={styles.buyButton} onPress={handleAddToCart}>
          <Icon
            name="cart-plus"
            type="material-community"
            color={Colors.white}
            size={24}
            style={{ marginRight: Spacing.sm }}
          />
          <Text style={styles.buyButtonText}>Add to Cart</Text>
        </TouchableOpacity>
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
  productImage: {
    width: "100%",
    height: 420,
    backgroundColor: Colors.lightMint,
  },
  imageIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
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
});
