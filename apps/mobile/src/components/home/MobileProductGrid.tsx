import type { Product } from '@anybuy/types'
import { formatPrice } from '@anybuy/utils'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'
import { CONDITION_LABELS } from '@anybuy/types'

const MOCK: Product[] = [
  {
    id: '1', seller_id: 'u1', title: 'iPhone 14 Pro Max 256GB', description: '', price: 850000,
    category: 'phones', condition: 'grade_a',
    media: [], thumbnail_url: 'https://images.unsplash.com/photo-1592910147752-a9602c287d5a?w=400&h=400&fit=crop',
    is_negotiable: true, is_available: true, view_count: 234, created_at: '', updated_at: '',
    seller: { id: 'u1', full_name: 'Adaeze', rating: 4.8, rating_count: 47, is_verified: true },
  },
  {
    id: '2', seller_id: 'u2', title: 'Nike Air Force 1 White Size 42', description: '', price: 45000,
    category: 'fashion', condition: 'grade_a',
    media: [], thumbnail_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    is_negotiable: false, is_available: true, view_count: 89, created_at: '', updated_at: '',
    seller: { id: 'u2', full_name: 'Tunde', rating: 4.5, rating_count: 12, is_verified: false },
  },
  {
    id: '3', seller_id: 'u3', title: 'MacBook Air M2 13"', description: '', price: 1100000,
    category: 'electronics', condition: 'grade_a',
    media: [], thumbnail_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    is_negotiable: true, is_available: true, view_count: 512, created_at: '', updated_at: '',
    seller: { id: 'u3', full_name: 'GadgetHub NG', rating: 4.9, rating_count: 203, is_verified: true },
  },
  {
    id: '4', seller_id: 'u4', title: 'Sony WH-1000XM5 Headphones', description: '', price: 95000,
    category: 'electronics', condition: 'grade_a',
    media: [], thumbnail_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    is_negotiable: true, is_available: true, view_count: 127, created_at: '', updated_at: '',
    seller: { id: 'u8', full_name: 'SoundWave NG', rating: 4.8, rating_count: 74, is_verified: true },
  },
]

const CONDITION_COLOR: Record<string, string> = {
  new: '#22C55E', grade_a: '#22C55E', grade_b: '#F59E0B', grade_c: '#6B7280',
}

export function MobileProductGrid() {
  return (
    <View className="px-4 mt-2">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-neutral-900 font-bold text-lg">Recommended</Text>
        <Text className="text-brand-orange text-sm font-semibold">View all</Text>
      </View>

      <FlatList
        data={MOCK}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        scrollEnabled={false}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/product/${item.id}` as never)}
            className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm"
          >
            <Image
              source={{ uri: item.thumbnail_url }}
              className="w-full aspect-square"
              contentFit="cover"
            />
            <View className="p-2.5">
              <Text className="text-neutral-900 font-medium text-sm leading-snug" numberOfLines={2}>
                {item.title}
              </Text>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-neutral-900 font-bold text-base">
                  {formatPrice(item.price)}
                </Text>
                <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: CONDITION_COLOR[item.condition] + '20' }}>
                  <Text className="text-xs font-semibold" style={{ color: CONDITION_COLOR[item.condition] }}>
                    {item.condition === 'grade_a' ? 'Grade A' : CONDITION_LABELS[item.condition]}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  )
}
