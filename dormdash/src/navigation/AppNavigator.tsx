import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Icon } from "@rneui/themed";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../assets/styles";

// Auth screens
import AuthWelcome from "../screens/AuthWelcome";
import AuthLogin from "../screens/AuthLogin";
import AuthRegister from "../screens/AuthRegister";
import AuthForgotPassword from "../screens/AuthForgotPassword";

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
import AddressList from "../screens/ProfileAddressList";
import AddAddress from "../screens/ProfileAddAddress";
import PaymentList from "../screens/ProfilePaymentList";
import AddPayment from "../screens/ProfileAddPayment";
import PaymentSuccess from "../screens/PaymentSuccess";
import PaymentFailed from "../screens/PaymentFailed";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type MainTabParamList = {
  FeedTab: undefined;
  ExploreTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
};

interface CartItem {
  id: number;
  title: string;
  price_cents: number;
  quantity: number;
}

type MainStackParamList = {
  MainTabs: undefined;
  PaymentPortal: { priceCents: number; listingTitle: string };
  ProductDetail: { listingId: number };
  Checkout: { selectedItems: CartItem[] };
  MyListings: undefined;
  PastOrders: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  PaymentList: undefined;
  AddPayment: undefined;
  CreateListing: undefined;
  PaymentSuccess: undefined;
  PaymentFailed: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary_green,
        tabBarInactiveTintColor: Colors.mutedGray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
          height: 60 + (insets.bottom || 0),
          paddingBottom: (insets.bottom || 0) + 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <MainTab.Screen
        name="FeedTab"
        component={Feed}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="home"
              type="material-community"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="ExploreTab"
        component={Explore}
        options={{
          tabBarLabel: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="magnify"
              type="material-community"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="CartTab"
        component={Cart}
        options={{
          tabBarLabel: "Cart",
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="cart"
              type="material-community"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="account"
              type="material-community"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

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

  return (
    <NavigationContainer>
      {!session ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={AuthWelcome} />
          <AuthStack.Screen name="Login" component={AuthLogin} />
          <AuthStack.Screen name="Register" component={AuthRegister} />
          <AuthStack.Screen
            name="ForgotPassword"
            component={AuthForgotPassword}
          />
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="MainTabs" component={MainTabs} />
          <MainStack.Screen name="Checkout" component={Checkout} />
          <MainStack.Screen name="MyListings" component={MyListings} />
          <MainStack.Screen name="PastOrders" component={PastOrders} />
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
        </MainStack.Navigator>
      )}
    </NavigationContainer>
  );
}
