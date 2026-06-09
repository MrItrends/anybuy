import { useAuthStore } from '@/stores/auth'
import { PackageOpen } from 'lucide-react-native'
import { Text, View, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function OrdersScreen() {
  const { user, openLoginSheet } = useAuthStore()

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-brand-off-white items-center justify-center px-8">
        <View className="w-20 h-20 rounded-3xl bg-neutral-100 items-center justify-center mb-5">
          <PackageOpen size={32} color="#6B7280" />
        </View>
        <Text className="text-neutral-900 font-bold text-xl text-center">Track your orders</Text>
        <Text className="text-neutral-600 text-sm text-center mt-2 mb-6">
          Sign in to view your purchase history and track deliveries.
        </Text>
        <Pressable onPress={() => openLoginSheet()} className="bg-brand-orange rounded-2xl py-3.5 px-8">
          <Text className="text-white font-bold text-base">Sign In</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-off-white">
      <View className="bg-brand-dark px-4 py-4">
        <Text className="text-white font-bold text-xl">My Orders</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-neutral-600">No orders yet.</Text>
      </View>
    </SafeAreaView>
  )
}
