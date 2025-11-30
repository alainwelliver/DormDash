/**
 * DormDash design tokens
 * - Fonts and color tokens for easy access across the app
 * - Spacing / typography / border radius utilities
 *
 */

// Color tokens (from the style guide / request)
export const Colors = {
  base_bg: "#FFFFFF", // assumed corrected from #FFFFF
  card_bg: "#DCF4F0",
  primary_blue: "#31A1E9",
  primary_green: "#65D1A2",
  secondary: "#47BEBE",

  // Additional commonly-used tokens
  white: "#FFFFFF",
  darkTeal: "#39605B",
  lightMint: "#E8F7F4",
  mutedGray: "#6B7D7E",
  lightGray: "#eef0f0ff",
};

// Fonts (app integrates Poppins and Open Sans)
// These are the family names to use in style objects. Make sure the fonts
// are added to your native project / expo assets and linked if required.
export const Fonts = {
  heading: "Poppins",
  body: "OpenSans",
};

// Typography sizes and weights
export const Typography = {
  heading1: {
    fontSize: 48,
    fontWeight: "700" as const,
    fontFamily: Fonts.heading,
  },
  heading2: {
    fontSize: 40,
    fontWeight: "700" as const,
    fontFamily: Fonts.heading,
  },
  heading3: {
    fontSize: 32,
    fontWeight: "700" as const,
    fontFamily: Fonts.heading,
  },
  heading4: {
    fontSize: 24,
    fontWeight: "700" as const,
    fontFamily: Fonts.heading,
  },

  bodyLarge: {
    fontSize: 16,
    fontWeight: "500" as const,
    fontFamily: Fonts.body,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "500" as const,
    fontFamily: Fonts.body,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: "500" as const,
    fontFamily: Fonts.body,
  },

  buttonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },
  label: { fontSize: 14, fontWeight: "600" as const, fontFamily: Fonts.body },
};

// Spacing scale (8px increments, plus a few helpers)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 15,
  lg: 20,
  xl: 50,
  xxl: 75,
  xxxl: 100,
};

export const BorderRadius = {
  small: 4,
  medium: 6,
  large: 12,
  xl: 16,
};

// Common composite styles (JS objects intended to be spread into StyleSheet)
export const CommonStyles = {
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
    paddingHorizontal: Spacing.lg,
  },

  card: {
    backgroundColor: Colors.card_bg,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
  },

  primaryButton: {
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
  },

  secondaryButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: Colors.primary_green,
  },

  inputLabel: {
    color: Colors.darkTeal,
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight,
    fontFamily: Typography.label.fontFamily,
  },

  input: {
    color: Colors.darkTeal,
    fontSize: Typography.bodyMedium.fontSize,
    fontFamily: Typography.bodyMedium.fontFamily,
  },

  buttonTitle: {
    fontSize: Typography.buttonText.fontSize,
    fontWeight: Typography.buttonText.fontWeight,
    fontFamily: Typography.buttonText.fontFamily,
  },

  title: {
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight,
    color: Colors.darkTeal,
    fontFamily: Typography.heading3.fontFamily,
  },
};

export default {
  Colors,
  Fonts,
  Typography,
  Spacing,
  BorderRadius,
  CommonStyles,
};
