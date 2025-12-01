import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle, Platform } from "react-native";
import { Colors, BorderRadius, Spacing } from "../assets/styles";

interface SkeletonLoaderProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Individual skeleton element with shimmer effect
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.medium,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton card for listing cards
export const ListingCardSkeleton: React.FC<{ width: number }> = ({ width }) => {
  const imageHeight = width * 0.72;

  return (
    <View style={[styles.cardSkeleton, { width }]}>
      <SkeletonLoader
        width="100%"
        height={imageHeight}
        borderRadius={BorderRadius.small}
        style={styles.imageSkeleton}
      />
      <View style={styles.cardContent}>
        <SkeletonLoader width="80%" height={16} style={styles.titleSkeleton} />
        <SkeletonLoader width="40%" height={14} />
      </View>
    </View>
  );
};

// Skeleton for a list of listing cards
interface ListingGridSkeletonProps {
  numColumns: number;
  count?: number;
  cardWidth: number;
}

export const ListingGridSkeleton: React.FC<ListingGridSkeletonProps> = ({
  numColumns,
  count = 6,
  cardWidth,
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={styles.gridContainer}>
      {skeletons.map((_, index) => (
        <ListingCardSkeleton key={index} width={cardWidth} />
      ))}
    </View>
  );
};

// Profile skeleton
export const ProfileSkeleton: React.FC = () => {
  return (
    <View style={styles.profileContainer}>
      <SkeletonLoader
        width={100}
        height={100}
        borderRadius={50}
        style={styles.avatarSkeleton}
      />
      <SkeletonLoader width={150} height={24} style={styles.nameSkeleton} />
      <SkeletonLoader width={200} height={16} style={styles.emailSkeleton} />
    </View>
  );
};

// Cart item skeleton
export const CartItemSkeleton: React.FC = () => {
  return (
    <View style={styles.cartItemContainer}>
      <SkeletonLoader width={24} height={24} borderRadius={4} />
      <SkeletonLoader
        width={80}
        height={80}
        borderRadius={BorderRadius.small}
        style={styles.cartImage}
      />
      <View style={styles.cartDetails}>
        <SkeletonLoader width="70%" height={16} style={styles.cartTitle} />
        <SkeletonLoader width="40%" height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.lightGray,
  },
  cardSkeleton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    paddingBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  imageSkeleton: {
    marginBottom: Spacing.sm,
  },
  cardContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  titleSkeleton: {
    marginBottom: Spacing.xs,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  profileContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  avatarSkeleton: {
    marginBottom: Spacing.sm,
  },
  nameSkeleton: {
    marginBottom: Spacing.xs,
  },
  emailSkeleton: {},
  cartItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
  },
  cartImage: {
    marginRight: Spacing.sm,
  },
  cartDetails: {
    flex: 1,
    gap: Spacing.sm,
  },
  cartTitle: {
    marginBottom: Spacing.xs,
  },
});

export default SkeletonLoader;
