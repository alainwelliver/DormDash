/**
 * DormDash design tokens
 * - Fonts and color tokens for easy access across the app
 * - Spacing / typography / border radius utilities
 *
 */

// Color tokens (from DORMDASH_STYLE_GUIDE.md)
export const Colors = {
  base_bg: "#FFFFFF",
  card_bg: "#DCF4F0",

  // PRIMARY COLORS
  primary_blue: "#3498DB",
  primary_green: "#2ECC71",
  secondary: "#1ABC9C",
  lightMint: "#E8F8F5",

  // UNIQUE ACCENTS
  primary_accent: "#6C5CE7", // A vibrant purple/indigo for unique flair
  glass_bg: "rgba(255, 255, 255, 0.85)",
  glass_border: "rgba(255, 255, 255, 0.5)",
  glass_shadow: "rgba(0, 0, 0, 0.1)",

  // Supporting colors
  white: "#FFFFFF",
  darkTeal: "#39605B",
  mutedGray: "#6B7D7E",
  lightGray: "#F8FAFC", // Slightly cooler gray

  // Button States
  grayDisabled: "#95A5A6",
  primaryHover: "#2E86C1",
  borderLight: "#ECF0F1",
  borderGray: "#BDC3C7",
  secondaryText: "#2E86C1",
  secondaryHover: "#2C6FA6",
  error: "#E74C3C",
  success: "#27AE60",
  warning: "#F39C12",
  info: "#3498DB",

  overlay: "rgba(0, 0, 0, 0.3)",
  overlayDark: "rgba(0, 0, 0, 0.5)",
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  glow: {
    shadowColor: Colors.primary_accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Fonts - System Fallbacks for reliability
export const Fonts = {
  heading: "System",
  body: "System",
};

export const Typography = {
  heading1: {
    fontSize: 48,
    fontWeight: "800" as const, // Extra Bold for impact
    color: Colors.darkTeal,
  },
  heading2: {
    fontSize: 36,
    fontWeight: "700" as const,
    color: Colors.darkTeal,
  },
  heading3: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.darkTeal,
  },
  heading4: {
    fontSize: 22,
    fontWeight: "600" as const,
    color: Colors.darkTeal,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: "400" as const,
    color: Colors.darkTeal,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: Colors.mutedGray,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.darkTeal,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.mutedGray,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.mutedGray,
  },
};

// Spacing scale (strict 8px increments per style guide: 4, 8, 12, 16, 24, 32)
export const Spacing = {
  xs: 4, // 4px
  sm: 8, // 8px
  md: 12, // was 15 - align to 12px (8px increment)
  lg: 16, // was 20 - align to 16px (8px increment)
  xl: 24, // was 50 - align to 24px (style guide)
  xxl: 32, // was 75 - align to 32px (style guide)
  xxxl: 100, // Keep for special cases (large margins)
};

// Web-specific responsive breakpoints and max-widths
export const WebLayout = {
  maxContentWidth: 1200, // Max width for content area
  maxFormWidth: 480, // Max width for forms (login, register)
  maxCardWidth: 320, // Max width for individual cards
  tabBarMaxWidth: 600, // Max width for bottom tab bar
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

// Border radius (8px for all UI elements per style guide)
export const BorderRadius = {
  small: 8, // was 4 - standardize to 8px
  medium: 8, // was 6 - standardize to 8px
  large: 8, // was 12 - standardize to 8px
  xl: 8, // was 16 - standardize to 8px
};

// Common composite styles (per DORMDASH_STYLE_GUIDE.md)
export const CommonStyles = {
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
    paddingHorizontal: Spacing.lg, // 16px (was 20px)
  },

  card: {
    backgroundColor: Colors.card_bg,
    borderRadius: BorderRadius.medium, // 8px
    padding: Spacing.lg, // 16px (was 20px)
  },

  // Primary Button - Style Guide specifications
  primaryButton: {
    backgroundColor: Colors.primary_blue, // #3498DB
    paddingVertical: Spacing.md, // 12px (was 15px)
    borderRadius: BorderRadius.medium, // 8px
    borderWidth: 0, // none
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.borderGray, // #BDC3C7
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 0,
  },

  // Secondary Button - Style Guide specifications
  secondaryButton: {
    backgroundColor: Colors.white, // #FFFFFF
    paddingVertical: Spacing.md, // 12px
    borderRadius: BorderRadius.medium, // 8px
    borderWidth: 1, // was 2
    borderColor: Colors.borderLight, // #ECF0F1 (was primary_green)
  },
  secondaryButtonDisabled: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.borderGray, // #BDC3C7
  },

  inputLabel: {
    color: Colors.darkTeal,
    fontSize: Typography.label.fontSize, // 14px
    fontWeight: Typography.label.fontWeight, // 600
    fontFamily: Typography.label.fontFamily, // Open Sans
  },

  input: {
    color: Colors.darkTeal,
    fontSize: Typography.bodyMedium.fontSize, // 16px (was 14px)
    fontFamily: Typography.bodyMedium.fontFamily, // Open Sans
    borderRadius: BorderRadius.medium, // 8px
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.lg, // 16px
    paddingVertical: Spacing.md, // 12px
  },

  buttonTitle: {
    fontSize: Typography.buttonText.fontSize, // 14px (was 18px)
    fontWeight: Typography.buttonText.fontWeight, // 600
    fontFamily: Typography.buttonText.fontFamily, // Angora
    letterSpacing: Typography.buttonText.letterSpacing, // 1.2 (was 0.5)
    color: Colors.white,
  },

  secondaryButtonTitle: {
    fontSize: Typography.buttonText.fontSize, // 14px
    fontWeight: Typography.buttonText.fontWeight, // 600
    fontFamily: Typography.buttonText.fontFamily, // Angora
    letterSpacing: Typography.buttonText.letterSpacing, // 1.2
    color: Colors.secondaryText, // #2E86C1
  },

  title: {
    fontSize: Typography.heading3.fontSize, // 32px
    fontWeight: Typography.heading3.fontWeight, // 700
    color: Colors.darkTeal,
    fontFamily: Typography.heading3.fontFamily, // Angora (was Poppins)
  },
};

// Web-specific styles for responsive layouts
export const WebStyles = {
  // Centered container with max-width for web
  webContainer: {
    width: "100%",
    maxWidth: WebLayout.maxContentWidth,
    marginHorizontal: "auto",
    alignSelf: "center" as const,
  },
  // Narrow container for forms
  formContainer: {
    width: "100%",
    maxWidth: WebLayout.maxFormWidth,
    marginHorizontal: "auto",
    alignSelf: "center" as const,
    paddingHorizontal: Spacing.xl,
  },
  // Web button with hover cursor
  webButton: {
    cursor: "pointer" as const,
  },
  // Web card with hover effect preparation
  webCard: {
    cursor: "pointer" as const,
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  // Grid layout for cards on web
  webGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "flex-start" as const,
    gap: Spacing.lg,
  },
};

export default {
  Colors,
  Fonts,
  Typography,
  Spacing,
  BorderRadius,
  CommonStyles,
  WebLayout,
  WebStyles,
};
