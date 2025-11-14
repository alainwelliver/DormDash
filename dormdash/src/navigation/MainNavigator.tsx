import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Feed from "../screens/Feed";

type RootStackParamList = {
  Feed: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Feed" component={Feed} />
    </Stack.Navigator>
  );
}
