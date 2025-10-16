import React from "react";
import { View, Text } from "react-native";
import { Button } from "@rneui/themed";
import { supabase } from "../lib/supabase";

const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign-out failed", error);
  }
};

const Feed: React.FC = () => {
  return (
    <View>
      <Text>this is the feed</Text>
      <Button title="Post" />
      <Button title="Log out" onPress={handleSignOut} />
    </View>
  );
};

export default Feed;
