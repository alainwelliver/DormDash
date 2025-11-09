import { useNavigation } from "@react-navigation/native";
import { Button } from "@rneui/themed";
import { View, Text } from "react-native";
import { supabase } from "../lib/supabase";

const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Sign-out failed", error);
};

export default function Feed() {
  const navigation = useNavigation<any>();

  return (
    <View>
      <Text>this is the feed</Text>
      <Button title="Post" />
      <Button title="Profile" onPress={() => navigation.navigate("Profile")} />
      <Button title="Log out" onPress={handleSignOut} />
    </View>
  );
}
