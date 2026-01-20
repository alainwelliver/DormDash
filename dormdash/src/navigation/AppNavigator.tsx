import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Auth screens
import AuthWelcome from "../screens/AuthWelcome";
import AuthLogin from "../screens/AuthLogin";
import AuthRegister from "../screens/AuthRegister";

// Main screens
import Feed from "../screens/Feed";
import CreateListing from "../screens/CreateListing";
import PaymentPortal from "../screens/ProfilePaymentPortal";
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
import OrderStatus from "../screens/OrderStatus";
import SellerOrders from "../screens/SellerOrders";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

interface CartItem {
  id: number;
  title: string;
  price_cents: number;
  quantity: number;
}

type MainStackParamList = {
  Feed: { direction?: "left" | "right" } | undefined;
  HomePage: undefined;
  CreateListing: undefined;
  PaymentPortal: { priceCents: number; listingTitle: string };
  ProductDetail: { listingId: number };
  Cart: { direction?: "left" | "right" } | undefined;
  Checkout: { selectedItems: CartItem[] };
  Profile: { direction?: "left" | "right" } | undefined;
  MyListings: undefined;
  PastOrders: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  PaymentList: undefined;
  AddPayment: undefined;
  OrderStatus: { orderId: number };
  SellerOrders: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
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
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator
  screenOptions={({ route }) => {
  const params = route.params as any;
  const direction = params?.direction;

    return {
      headerShown: false,
      animation:
        direction === "left"
          ? "slide_from_left"
          : direction === "right"
          ? "slide_from_right"
          : "default",
    };
  }}
>
  <MainStack.Screen name="Feed" component={Feed} />
  <MainStack.Screen name="Cart" component={Cart} />
  <MainStack.Screen name="Checkout" component={Checkout} />
  <MainStack.Screen name="Profile" component={Profile} />
  <MainStack.Screen name="MyListings" component={MyListings} />
  <MainStack.Screen name="PastOrders" component={PastOrders} />
  <MainStack.Screen name="AddressList" component={AddressList} />
  <MainStack.Screen name="AddAddress" component={AddAddress} />
  <MainStack.Screen name="PaymentList" component={PaymentList} />
  <MainStack.Screen name="AddPayment" component={AddPayment} />
  <MainStack.Screen name="OrderStatus" component={OrderStatus} />
  <MainStack.Screen name="SellerOrders" component={SellerOrders} />

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
</MainStack.Navigator>

      )}
    </NavigationContainer>
  );
}
