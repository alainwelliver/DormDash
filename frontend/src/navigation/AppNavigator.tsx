import React, { useEffect, useState } from "react";
import {
  Platform,
  View,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Search, ShoppingCart, Bike, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  WebLayout,
  Typography,
  Spacing,
  Shadows,
} from "../assets/styles";

// Linking configuration for web URL routing
const linking: LinkingOptions<any> = {
  prefixes: [
    "dormdash://",
    "https://dormdash.pages.dev",
    "http://localhost:8081",
    "https://www.dormdash.xyz",
    "https://dormdash.xyz",
  ],
  // On web, the bare root "/" doesn't map to any screen path.
  // Return null so React Navigation skips deep-linking and renders
  // the first screen of whichever navigator is currently mounted
  // (Welcome for guests, Feed for authenticated users).
  getInitialURL() {
    if (Platform.OS === "web") {
      const path = window.location.pathname;
      if (!path || path === "/") {
        return null;
      }
      return window.location.href;
    }
    return undefined; // native: default Linking.getInitialURL
  },
  config: {
    screens: {
      // Auth screens
      Welcome: "welcome",
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",
      // Main stack screens
      MainTabs: {
        screens: {
          FeedTab: "feed",
          ExploreTab: "explore",
          CartTab: "cart",
          DashTab: "dash",
          ProfileTab: "profile",
        },
      },
      ProductDetail: "product/:listingId",
      Checkout: "checkout",
      CreateListing: "create-listing",
      EditListing: "edit-listing/:listingId",
      MyListings: "my-listings",
      PastOrders: "past-orders",
      SavedCarts: "saved-carts",
      OrderDetails: "order/:orderId",
      AddressList: "addresses",
      AddAddress: "add-address",
      PaymentList: "payments",
      AddPayment: "add-payment",
      PaymentPortal: "payment",
      PaymentSuccess: "payment-success",
      PaymentFailed: "payment-failed",
      DasherRegister: "dasher-register",
      DeliveryDetail: "delivery/:deliveryOrderId",
    },
  },
};

// Auth screens
import AuthWelcome from "../screens/AuthWelcome";
import AuthLogin from "../screens/AuthLogin";
import AuthRegister from "../screens/AuthRegister";
import AuthForgotPassword from "../screens/AuthForgotPassword";
import AuthResetPassword from "../screens/AuthResetPassword";

// Main screens
import Feed from "../screens/Feed";
import Explore from "../screens/Explore";
import CreateListing from "../screens/CreateListing";
import PaymentPortal from "../screens/PaymentPortal";
import ProductDetail from "../screens/ProductDetail";
import Cart from "../screens/Cart";
import Checkout from "../screens/Checkout";
import Profile from "../screens/Profile";
import MyListings from "../screens/ProfileMyListings";
import PastOrders from "../screens/ProfilePastOrders";
import SavedCarts from "../screens/ProfileSavedCarts";
import OrderDetails from "../screens/OrderDetails";
import AddressList from "../screens/ProfileAddressList";
import AddAddress from "../screens/ProfileAddAddress";
import PaymentList from "../screens/ProfilePaymentList";
import AddPayment from "../screens/ProfileAddPayment";
import PaymentSuccess from "../screens/PaymentSuccess";
import PaymentFailed from "../screens/PaymentFailed";
import EditListing from "../screens/EditListing";
import DasherDashboard from "../screens/DasherDashboard";
import DasherRegister from "../screens/DasherRegister";
import DeliveryDetail from "../screens/DeliveryDetail";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

type MainTabParamList = {
  FeedTab: undefined;
  ExploreTab: undefined;
  CartTab: undefined;
  DashTab: undefined;
  ProfileTab: undefined;
};

interface CartItem {
  id: number;
  title: string;
  price_cents: number;
  quantity: number;
}

interface OrderData {
  deliveryMethod: "pickup" | "delivery";
  items: Array<{
    listing_id: number;
    title: string;
    price_cents: number;
    quantity: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  deliveryAddress?: {
    address: string;
    lat?: number;
    lng?: number;
  };
}

type MainStackParamList = {
  MainTabs: undefined;
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
    orderData?: OrderData;
  };
  ProductDetail: { listingId: number };
  Checkout: { selectedItems: CartItem[] };
  MyListings: undefined;
  PastOrders: undefined;
  SavedCarts: undefined;
  OrderDetails: { orderId: number };
  AddressList: undefined;
  AddAddress: { addressId?: number } | undefined;
  PaymentList: undefined;
  AddPayment: undefined;
  CreateListing: undefined;
  EditListing: { listingId: number };
  PaymentSuccess: undefined;
  PaymentFailed: undefined;
  DasherRegister: undefined;
  DeliveryDetail: { deliveryOrderId: number };
  ResetPassword: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  // Only use fixed width centered layout on larger web screens
  const isLargeWeb = isWeb && width > WebLayout.breakpoints.sm;

  // Custom icon renderer with animation/style logic
  const renderTabIcon = (Icon: any, focused: boolean, color: string) => (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        top: Platform.OS === "ios" ? 10 : 0,
      }}
    >
      <Icon
        color={focused ? Colors.primary_accent : Colors.mutedGray}
        size={24}
        strokeWidth={focused ? 2.5 : 2}
        fill={focused ? `${Colors.primary_accent}20` : "none"} // 20% opacity fill
      />
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: Colors.primary_accent,
            marginTop: 4,
          }}
        />
      )}
    </View>
  );

  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarShowLabel: false, // Hide labels for a cleaner look
        tabBarStyle: {
          position: "absolute",
          bottom: isWeb ? 20 : 25,
          left: isLargeWeb ? "50%" : 20,
          right: isLargeWeb ? "auto" : 20,
          width: isLargeWeb ? WebLayout.tabBarMaxWidth : undefined,
          transform: isLargeWeb
            ? [{ translateX: -WebLayout.tabBarMaxWidth / 2 }]
            : undefined,
          backgroundColor: Colors.glass_bg,
          borderRadius: 30, // Capsule shape
          height: 60,
          borderTopWidth: 0,
          ...Shadows.glow, // Apply our custom glow
          elevation: 0, // Disable default android shadow
          borderWidth: 1,
          borderColor: Colors.glass_border,
        },
        tabBarItemStyle: {
          height: 60,
          paddingTop: 0, // Reset default padding
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.base_bg,
          shadowColor: "transparent", // Remove header shadow
          elevation: 0,
        },
        headerTitleAlign: "left",
      }}
    >
      <MainTab.Screen
        name="FeedTab"
        component={Feed}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(Home, focused, color),
        }}
      />
      <MainTab.Screen
        name="ExploreTab"
        component={Explore}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(Search, focused, color),
        }}
      />
      <MainTab.Screen
        name="CartTab"
        component={Cart}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(ShoppingCart, focused, color),
        }}
      />
      <MainTab.Screen
        name="DashTab"
        component={DasherDashboard}
        options={{
          headerTitle: () => <Text style={headerStyles.title}>Dash</Text>,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(Bike, focused, color),
        }}
      />
      <MainTab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          headerTitle: () => <Text style={headerStyles.title}>Profile</Text>,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(User, focused, color),
        }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          // Handle invalid refresh token by signing out locally
          console.error("Session error:", error.message);
          await supabase.auth.signOut({ scope: "local" });
          setSession(null);
          return;
        }
        setSession(session);
      } catch (error) {
        console.error("Failed to get session:", error);
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      // unsubscribe safely across SDK versions
      try {
        subscription.subscription.unsubscribe();
      } catch {
        // ignore if shape differs
      }
    };
  }, []);

  // Show a branded splash while the session is being restored
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.base_bg,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary_accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      documentTitle={{
        formatter: (options, route) =>
          `DormDash${options?.title ? ` - ${options.title}` : route?.name ? ` - ${route.name.replace("Tab", "")}` : ""}`,
      }}
    >
      {!session ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={AuthWelcome} />
          <AuthStack.Screen name="Login" component={AuthLogin} />
          <AuthStack.Screen name="Register" component={AuthRegister} />
          <AuthStack.Screen
            name="ForgotPassword"
            component={AuthForgotPassword}
          />
          <AuthStack.Screen
            name="ResetPassword"
            component={AuthResetPassword}
          />
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="MainTabs" component={MainTabs} />
          <MainStack.Screen name="Checkout" component={Checkout} />
          <MainStack.Screen name="MyListings" component={MyListings} />
          <MainStack.Screen name="PastOrders" component={PastOrders} />
          <MainStack.Screen name="SavedCarts" component={SavedCarts} />
          <MainStack.Screen name="OrderDetails" component={OrderDetails} />
          <MainStack.Screen name="AddressList" component={AddressList} />
          <MainStack.Screen name="AddAddress" component={AddAddress} />
          <MainStack.Screen name="PaymentList" component={PaymentList} />
          <MainStack.Screen name="AddPayment" component={AddPayment} />
          <MainStack.Screen
            name="CreateListing"
            component={CreateListing}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="EditListing"
            component={EditListing}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="ProductDetail"
            component={ProductDetail}
            options={{ headerShown: false, title: "Product Details" }}
          />
          <MainStack.Screen
            name="PaymentPortal"
            component={PaymentPortal}
            options={{ headerShown: true, title: "Complete Payment" }}
          />
          <MainStack.Screen
            name="PaymentSuccess"
            component={PaymentSuccess}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="PaymentFailed"
            component={PaymentFailed}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="DasherRegister"
            component={DasherRegister}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="DeliveryDetail"
            component={DeliveryDetail}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="ResetPassword"
            component={AuthResetPassword}
            options={{ headerShown: false }}
          />
        </MainStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
});
