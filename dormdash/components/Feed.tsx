import React from "react";
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
    <div>
      this is the feed
      <Button title="Post" />
      <Button title="Log out" onPress={handleSignOut} />
    </div>
  );
};

export default Feed;
