import { useAuthStore } from '@/stores/auth'
import { ChevronRight, Heart, HelpCircle, LogIn, Package, Settings, Shield, Star } from 'lucide-react-native'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const MENU_ITEMS = [
  { Icon: Package, label: 'My Orders', href: '/orders' },
  { Icon: Heart, label: 'Wishlist', href: '/wishlist' },
  { Icon: Star, label: 'My Reviews', href: '/reviews' },
  { Icon: Shield, label: 'Buyer Protection', href: '/protection' },
  { Icon: Settings, label: 'Settings', href: '/settings' },
  { Icon: HelpCircle, label: 'Help & Support', href: '/support' },
]

export default function ProfileScreen() {
  const { user, openLoginSheet } = useAuthStore()

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-brand-off-white items-center justify-center px-8">
        <View className="w-20 h-20 rounded-3xl bg-brand-dark items-center justify-center mb-5">
          <Text className="text-brand-orange font-bold text-3xl">A</Text>
        </View>
        <Text className="text-neutral-900 font-bold text-xl text-center">Your AnyBuy profile</Text>
        <Text className="text-neutral-600 text-sm text-center mt-2 mb-6">
          Sign in to access your orders, wishlist, and seller profile.
        </Text>
        <Pressable onPress={() => openLoginSheet()} className="flex-row items-center gap-2 bg-brand-orange rounded-2xl py-3.5 px-8">
          <LogIn size={18} color="white" />
          <Text className="text-white font-bold text-base">Sign In</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-off-white">
      <ScrollView>
        {/* Profile header */}
        <View className="bg-brand-dark px-4 pt-4 pb-8">
          <Text className="text-white font-bold text-xl mb-4">Profile</Text>
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-brand-orange items-center justify-center">
              <Text className="text-white font-bold text-2xl">{user.full_name[0]}</Text>
            </View>
            <View>
              <Text className="text-white font-bold text-lg">{user.full_name}</Text>
              <Text className="text-white/60 text-sm">{user.email}</Text>
              {user.is_verified && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Shield size={12} color="#22C55E" />
                  <Text className="text-brand-green text-xs font-semibold">Verified Seller</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Menu */}
        <View className="mx-4 -mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          {MENU_ITEMS.map(({ Icon, label }, i) => (
            <Pressable
              key={label}
              className={`flex-row items-center gap-3 px-4 py-4 ${i < MENU_ITEMS.length - 1 ? 'border-b border-neutral-100' : ''}`}
            >
              <View className="w-8 h-8 rounded-lg bg-neutral-100 items-center justify-center">
                <Icon size={16} color="#6B7280" />
              </View>
              <Text className="flex-1 text-neutral-900 font-medium">{label}</Text>
              <ChevronRight size={16} color="#6B7280" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
