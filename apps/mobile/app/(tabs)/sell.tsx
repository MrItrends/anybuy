import { useAuthStore } from '@/stores/auth'
import { Camera, Video, Tag, Truck } from 'lucide-react-native'
import { Text, View, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const STEPS = [
  { Icon: Camera, title: 'Upload photos', desc: 'Add up to 10 clear photos of your item' },
  { Icon: Video, title: 'Record a video', desc: 'Show the item in detail — builds buyer trust' },
  { Icon: Tag, title: 'Set your price', desc: 'Choose a fair price based on condition' },
  { Icon: Truck, title: 'Ship when sold', desc: 'We connect you with a delivery partner' },
]

export default function SellScreen() {
  const { requireAuth } = useAuthStore()

  function handleStart() {
    if (!requireAuth()) return
    // Navigate to sell form
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-off-white">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="bg-brand-dark rounded-3xl p-6 mb-6">
          <Text className="text-white font-bold text-2xl mb-1">Sell an item</Text>
          <Text className="text-white/70 text-sm leading-relaxed">
            Turn your unused items into cash. List in minutes.
          </Text>
        </View>

        <Text className="text-neutral-900 font-bold text-lg mb-4">How it works</Text>

        <View className="gap-3 mb-8">
          {STEPS.map(({ Icon, title, desc }, i) => (
            <View key={title} className="flex-row items-start gap-4 bg-white rounded-2xl p-4 shadow-sm">
              <View className="w-10 h-10 rounded-xl bg-brand-orange/10 items-center justify-center flex-shrink-0">
                <Icon size={20} color="#FF6A3D" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-xs font-bold text-brand-orange">STEP {i + 1}</Text>
                </View>
                <Text className="text-neutral-900 font-semibold text-sm">{title}</Text>
                <Text className="text-neutral-600 text-sm mt-0.5">{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleStart}
          className="bg-brand-orange rounded-2xl py-4 items-center shadow-sm"
        >
          <Text className="text-white font-bold text-lg">Start Listing</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
