import { MobileHeader } from '@/components/layout/MobileHeader'
import { CategoryRow } from '@/components/home/CategoryRow'
import { LiveBanner } from '@/components/home/LiveBanner'
import { MobileProductGrid } from '@/components/home/MobileProductGrid'
import { ScrollView, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-brand-off-white" edges={['top']}>
      <MobileHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <LiveBanner />
        <CategoryRow />
        <MobileProductGrid />
      </ScrollView>
    </SafeAreaView>
  )
}
