import { useAuthStore } from '@/stores/auth'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { Users } from 'lucide-react-native'
import { FlatList, Pressable, Text, View } from 'react-native'

const SESSIONS = [
  { id: '1', seller: 'Adaeze Stores', title: 'iPhone 14 Pro Live', viewers: 142, thumb: 'https://images.unsplash.com/photo-1592910147752-a9602c287d5a?w=300&h=200&fit=crop' },
  { id: '2', seller: 'TrendHouse', title: 'Ankara Fashion Drop', viewers: 89, thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' },
  { id: '3', seller: 'GadgetHub NG', title: 'Laptop Deals', viewers: 217, thumb: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop' },
]

export function LiveBanner() {
  const { requireAuth } = useAuthStore()

  function handleJoin(id: string) {
    if (requireAuth('live')) router.push(`/live/${id}`)
  }

  return (
    <View className="py-4">
      <View className="flex-row items-center justify-between px-4 mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-neutral-900 font-bold text-lg">Live Now</Text>
          <View className="flex-row items-center gap-1 bg-red-500 px-2.5 py-1 rounded-full">
            <View className="w-1.5 h-1.5 rounded-full bg-white" />
            <Text className="text-white text-xs font-bold">LIVE</Text>
          </View>
        </View>
        <Text className="text-brand-orange text-sm font-semibold">View all</Text>
      </View>

      <FlatList
        data={SESSIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleJoin(item.id)}
            className="w-52 rounded-2xl overflow-hidden"
          >
            <View className="relative">
              <Image
                source={{ uri: item.thumb }}
                className="w-52 h-32"
                contentFit="cover"
              />
              <View className="absolute inset-0 bg-black/40" />
              <View className="absolute top-2 left-2 flex-row items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-white" />
                <Text className="text-white text-xs font-bold">LIVE {item.viewers}</Text>
              </View>
              {/* Join button overlay */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="bg-brand-orange px-4 py-2 rounded-full">
                  <Text className="text-white font-bold text-sm">Join Live</Text>
                </View>
              </View>
            </View>
            <View className="p-2.5 bg-white">
              <Text className="text-neutral-900 font-semibold text-sm" numberOfLines={1}>{item.title}</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Users size={11} color="#6B7280" />
                <Text className="text-neutral-600 text-xs">{item.seller}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  )
}
