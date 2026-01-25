import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./navigationTypes";

import { TabNavigator } from "./TabNavigator";
import { AddTransactionModal } from "../../screens/modals/AddTransactionModal";
import { EditTransactionModal } from "../../screens/modals/EditTransactionModal";
import { ReviewTransactionScreen } from "../../screens/modals/ReviewTransactionScreen";
import { AddTransactionEntryScreen } from "../../screens/modals/AddTransactionEntryScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />

      <Stack.Group
        screenOptions={{
          presentation: "modal",
          animation: "slide_from_bottom",
          headerShown: false
        }}
      >
        <Stack.Screen name="AddTransactionEntry" component={AddTransactionEntryScreen} />
        <Stack.Screen name="ReviewTransaction" component={ReviewTransactionScreen} />
        <Stack.Screen name="AddTransaction" component={AddTransactionModal} />
        <Stack.Screen name="EditTransaction" component={EditTransactionModal} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
