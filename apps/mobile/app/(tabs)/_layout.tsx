import { Tabs } from 'expo-router'
import { Home, PlusSquare, ShoppingBag, Tv2, User } from 'lucide-react-native'
import { Platform } from 'react-native'

const BRAND_DARK = '#0E2A2B'
const BRAND_ORANGE = '#FF6A3D'
const NEUTRAL_600 = '#6B7280'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_ORANGE,
        tabBarInactiveTintColor: NEUTRAL_600,
        tabBarStyle: {
          backgroundColor: BRAND_DARK,
          borderTopColor: 'rgba(255,255,255,0.1)',
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => <Tv2 size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarIcon: ({ size }) => (
            <PlusSquare size={size + 2} color={BRAND_ORANGE} />
          ),
          tabBarLabelStyle: { color: BRAND_ORANGE, fontSize: 10, fontWeight: '700' },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  )
}
