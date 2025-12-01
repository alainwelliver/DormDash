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

  // PRIMARY COLORS - Style Guide specified
  primary_blue: "#3498DB", // was #31A1E9
  primary_green: "#2ECC71", // was #65D1A2
  secondary: "#1ABC9C", // Teal Accent - was #47BEBE
  lightMint: "#E8F8F5", // was #E8F7F4

  // Supporting colors
  white: "#FFFFFF",
  darkTeal: "#39605B", // Keep - for text
  mutedGray: "#6B7D7E", // Keep - for inactive states
  lightGray: "#eef0f0ff", // Keep - for backgrounds

  // NEW ADDITIONS - Button States & Style Guide Colors
  grayDisabled: "#95A5A6", // Gray (Disabled) from style guide
  primaryHover: "#2E86C1", // Primary button hover state
  borderLight: "#ECF0F1", // Secondary button border/hover bg
  borderGray: "#BDC3C7", // Borders and disabled button bg
  secondaryText: "#2E86C1", // Secondary button text
  secondaryHover: "#2C6FA6", // Secondary button hover text
  error: "#E74C3C", // Error states (style guide forms section)
  success: "#27AE60", // Success states
  warning: "#F39C12", // Warning states
  info: "#3498DB", // Info states

  // Brand-specific colors (keep separate from style guide)
  mastercardRed: "#EB001B",
  mastercardOrange: "#F79E1B",
  overlay: "rgba(0, 0, 0, 0.3)", // Modal overlays
  overlayDark: "rgba(0, 0, 0, 0.5)", // Darker modal overlays
};

// Fonts (per DORMDASH_STYLE_GUIDE.md)
// Angora for headings/buttons, Open Sans for body text
// NOTE: Angora font files need to be added to assets and loaded via expo-font
export const Fonts = {
  heading: "Angora", // was "Poppins"
  body: "Open Sans", // was "OpenSans" - added space
};

// Typography sizes and weights (per DORMDASH_STYLE_GUIDE.md)
export const Typography = {
  // Headings - Angora font, Bold (700)
  heading1: {
    fontSize: 48, // 48px Bold
    fontWeight: "700" as const,
    fontFamily: Fonts.heading, // Angora
  },
  heading2: {
    fontSize: 40, // 40px Bold
    fontWeight: "700" as const,
    fontFamily: Fonts.heading, // Angora
  },
  heading3: {
    fontSize: 32, // 32px Bold
    fontWeight: "700" as const,
    fontFamily: Fonts.heading, // Angora
  },
  heading4: {
    fontSize: 24, // 24px Bold
    fontWeight: "700" as const,
    fontFamily: Fonts.heading, // Angora
  },

  // Body text - Open Sans
  bodyLarge: {
    fontSize: 16, // 16px, weight 400 (Regular)
    fontWeight: "400" as const, // was 500 - style guide says Regular = 400
    fontFamily: Fonts.body, // Open Sans
  },
  bodyMedium: {
    fontSize: 16, // was 14 - style guide says all body is 16px
    fontWeight: "500" as const, // Medium
    fontFamily: Fonts.body, // Open Sans
  },
  bodySemibold: {
    fontSize: 16, // 16px, weight 600 (Semibold)
    fontWeight: "600" as const,
    fontFamily: Fonts.body, // Open Sans
  },
  bodySmall: {
    fontSize: 12, // Keep for actual small text/labels
    fontWeight: "500" as const,
    fontFamily: Fonts.body, // Open Sans
  },

  // Button text - Angora, 14pt, Semibold, extra spacing
  buttonText: {
    fontSize: 14, // was 18 - style guide says 14pt
    fontWeight: "600" as const, // Semibold
    fontFamily: Fonts.heading, // Angora (was Fonts.heading which is now Angora)
    letterSpacing: 1.2, // was 0.5 - "extra spacing"
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    fontFamily: Fonts.body, // Open Sans
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
