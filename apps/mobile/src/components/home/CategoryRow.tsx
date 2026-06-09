import { router } from 'expo-router'
import { Cpu, Dumbbell, Home, MoreHorizontal, Shirt, Smartphone } from 'lucide-react-native'
import { FlatList, Pressable, Text, View } from 'react-native'

const CATS = [
  { name: 'Phones', slug: 'phones', Icon: Smartphone, color: '#3B82F6', bg: '#EFF6FF' },
  { name: 'Fashion', slug: 'fashion', Icon: Shirt, color: '#A855F7', bg: '#FAF5FF' },
  { name: 'Home', slug: 'home', Icon: Home, color: '#F59E0B', bg: '#FFFBEB' },
  { name: 'Electronics', slug: 'electronics', Icon: Cpu, color: '#14B8A6', bg: '#F0FDFA' },
  { name: 'Sports', slug: 'sports', Icon: Dumbbell, color: '#EC4899', bg: '#FDF2F8' },
  { name: 'More', slug: 'all', Icon: MoreHorizontal, color: '#6B7280', bg: '#F3F4F6' },
]

export function CategoryRow() {
  return (
    <FlatList
      data={CATS}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 8 }}
      keyExtractor={c => c.slug}
      renderItem={({ item: { name, slug, Icon, color, bg } }) => (
        <Pressable
          onPress={() => router.push(`/category/${slug}` as never)}
          className="items-center gap-2 px-3 py-3 rounded-2xl"
          style={{ backgroundColor: bg }}
        >
          <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: color + '20' }}>
            <Icon size={20} color={color} />
          </View>
          <Text className="text-xs font-semibold text-neutral-900">{name}</Text>
        </Pressable>
      )}
    />
  )
}
