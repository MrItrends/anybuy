import { Search, ShoppingCart } from 'lucide-react-native'
import { Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'

export function MobileHeader() {
  return (
    <View className="bg-brand-dark px-4 pt-2 pb-4">
      {/* Logo row */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-bold text-2xl">
          <Text className="text-brand-orange">A</Text>nyBuy
        </Text>
        <Pressable onPress={() => router.push('/cart')} className="relative p-1">
          <ShoppingCart size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>

      {/* Search bar */}
      <Pressable
        onPress={() => router.push('/search')}
        className="flex-row items-center gap-3 h-11 px-4 bg-white/10 rounded-2xl"
      >
        <Search size={16} color="rgba(255,255,255,0.6)" />
        <Text className="text-white/60 text-sm flex-1">Search for anything…</Text>
      </Pressable>
    </View>
  )
}
