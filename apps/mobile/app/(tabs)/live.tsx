import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Users } from 'lucide-react-native'
import { FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth'

const SESSIONS = [
  { id: '1', seller: 'Adaeze Stores', title: 'iPhone 14 Pro — Live Inspection', viewers: 142, thumb: 'https://images.unsplash.com/photo-1592910147752-a9602c287d5a?w=600&h=400&fit=crop' },
  { id: '2', seller: 'TrendHouse Lagos', title: 'Ankara Fashion Collection', viewers: 89, thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop' },
  { id: '3', seller: 'GadgetHub NG', title: 'Laptops — Grade A Deals', viewers: 217, thumb: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop' },
  { id: '4', seller: 'SoundWave NG', title: 'Headphones Unboxing', viewers: 54, thumb: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop' },
]

export default function LiveScreen() {
  const { requireAuth } = useAuthStore()

  return (
    <SafeAreaView className="flex-1 bg-brand-off-white">
      <View className="bg-brand-dark px-4 py-4">
        <Text className="text-white font-bold text-xl">Live Selling</Text>
        <Text className="text-white/60 text-sm mt-0.5">Watch sellers show products in real time</Text>
      </View>

      <FlatList
        data={SESSIONS}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { if (requireAuth('live')) router.push(`/live/${item.id}` as never) }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm"
          >
            <View className="relative">
              <Image source={{ uri: item.thumb }} className="w-full h-48" contentFit="cover" />
              <View className="absolute inset-0 bg-black/40" />
              <View className="absolute top-3 left-3 flex-row items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-white" />
                <Text className="text-white text-xs font-bold">LIVE</Text>
                <Text className="text-white text-xs">{item.viewers}</Text>
              </View>
            </View>
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-neutral-900 font-bold text-base" numberOfLines={1}>{item.title}</Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Users size={12} color="#6B7280" />
                  <Text className="text-neutral-600 text-sm">{item.seller}</Text>
                </View>
              </View>
              <View className="bg-brand-orange px-4 py-2 rounded-full ml-3">
                <Text className="text-white font-bold text-sm">Join</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}
