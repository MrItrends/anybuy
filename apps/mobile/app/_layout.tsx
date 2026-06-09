import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0E2A2B" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen name="cart" options={{ headerShown: true, headerTitle: 'Cart', headerStyle: { backgroundColor: '#0E2A2B' }, headerTintColor: '#fff' }} />
        <Stack.Screen name="checkout" options={{ headerShown: true, headerTitle: 'Checkout', headerStyle: { backgroundColor: '#0E2A2B' }, headerTintColor: '#fff' }} />
        <Stack.Screen name="live/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
