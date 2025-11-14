import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import AuthNavigator from "./AuthNavigator";
import Feed from "../screens/Feed";

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
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>{session ? <Feed /> : <AuthNavigator />}</View>
  );
}
