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
import PaymentPortal from "../screens/PaymentPortal";
import ProductDetail from "../screens/ProductDetail";
import Cart from "../screens/Cart";
import Profile from "../screens/Profile";

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

type MainStackParamList = {
  Feed: undefined;
  HomePage: undefined;
  CreateListing: undefined;
  PaymentPortal: { priceCents: number; listingTitle: string };
  ProductDetail: { listingId: number };
  Cart: undefined;
  Profile: undefined;
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
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="Feed" component={Feed} />
          <MainStack.Screen name="Cart" component={Cart} />
          <MainStack.Screen name="Profile" component={Profile} />
          <MainStack.Screen
            name="CreateListing"
            component={CreateListing}
            options={{ headerShown: true }}
          />
          <MainStack.Screen
            name="ProductDetail"
            component={ProductDetail}
            options={{ headerShown: true, title: "Product Details" }}
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
