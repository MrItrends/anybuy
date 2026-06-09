'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, LogOut, MessageSquare, Megaphone,
  Package, Store, Truck, Users, ShieldAlert,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { OrderAssignmentTab } from './tabs/OrderAssignmentTab'
import { RidersTab } from './tabs/RidersTab'
import { AnnouncementsTab } from './tabs/AnnouncementsTab'
import { ChatInboxTab } from './tabs/ChatInboxTab'
import { SellersTab } from './tabs/SellersTab'

export type AdminRole =
  | 'super_admin' | 'chat_admin' | 'order_admin'
  | 'technical_admin' | 'viewer'

type Tab = 'orders' | 'riders' | 'sellers' | 'chat' | 'announcements'

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard; roles: AdminRole[] }[] = [
  { key: 'orders',        label: 'Order Assignment', icon: Package,       roles: ['super_admin','order_admin','technical_admin','viewer'] },
  { key: 'riders',        label: 'Riders',           icon: Truck,         roles: ['super_admin','order_admin','technical_admin','viewer'] },
  { key: 'sellers',       label: 'Sellers',          icon: Store,         roles: ['super_admin','order_admin','technical_admin','viewer'] },
  { key: 'chat',          label: 'Chat Inbox',       icon: MessageSquare, roles: ['super_admin','chat_admin','technical_admin','viewer'] },
  { key: 'announcements', label: 'Announcements',    icon: Megaphone,     roles: ['super_admin','technical_admin'] },
]

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:     'Super Admin',
  chat_admin:      'Chat Admin',
  order_admin:     'Order Admin',
  technical_admin: 'Technical Admin',
  viewer:          'Viewer',
}

export default function AdminDashboardPage() {
  const { user, setUser, loading: authLoading } = useAuthStore()
  const router = useRouter()

  const [adminRole, setAdminRole]         = useState<AdminRole | null>(null)
  const [checking, setChecking]           = useState(true)
  const [activeTab, setActiveTab]         = useState<Tab>('orders')
  const [pendingAssignment, setPendingAssignment] = useState(0)
  const [pendingSellers, setPendingSellers]       = useState(0)
  const [pendingRiders, setPendingRiders]         = useState(0)

  useEffect(() => {
    if (authLoading) return          // wait for AuthProvider to resolve the session
    if (!user) { router.replace('/admin/login'); return }
    checkAccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  async function checkAccess() {
    // Use the service-role API route to bypass RLS on admin_roles
    const res = await fetch('/api/admin/check-role', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: user!.id }),
    })
    const { role } = await res.json()

    if (!role) { router.replace('/admin/login'); return }
    setAdminRole(role as AdminRole)
    setChecking(false)

    // Pending counts use the normal client (read-only, no RLS issue)
    const supabase = createClient()

    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('ready_for_pickup', true)
      .is('id', null)
    setPendingAssignment(orderCount ?? 0)

    const { count: sellerCount } = await supabase
      .from('seller_profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('kyc_status', 'submitted')
    setPendingSellers(sellerCount ?? 0)

    const { count: riderCount } = await supabase
      .from('rider_profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingRiders(riderCount ?? 0)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.replace('/')
  }

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#080c12' }}>
        <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allowedTabs   = NAV.filter(n => adminRole && n.roles.includes(adminRole))
  const activeNavItem = NAV.find(n => n.key === activeTab)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080c12' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col overflow-y-auto border-r border-white/[0.06]" style={{ background: '#0d1117' }}>

        {/* Logo + admin badge */}
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
          <Link href="/">
            <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={100} height={30} />
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-red-500/15 text-red-400 text-[11px] font-bold px-2.5 py-1 rounded-full">
            <ShieldAlert size={10} />
            ADMIN
          </div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-orange font-bold text-sm">
                {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.full_name}</p>
              <p className="text-white/35 text-xs">{adminRole ? ROLE_LABELS[adminRole] : ''}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {allowedTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                ${activeTab === key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {key === 'orders' && pendingAssignment > 0 && (
                <span className="bg-brand-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingAssignment}
                </span>
              )}
              {key === 'riders' && pendingRiders > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingRiders}
                </span>
              )}
              {key === 'sellers' && pendingSellers > 0 && (
                <span className="bg-brand-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingSellers}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="px-3 pb-5 border-t border-white/[0.06] pt-4 space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <Users size={16} />
            View marketplace
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top header bar */}
        <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-white/[0.06]" style={{ background: '#0d1117' }}>
          <div className="flex items-center gap-3">
            {activeNavItem && (
              <>
                <activeNavItem.icon size={16} className="text-white/40" />
                <span className="text-white font-semibold text-sm">{activeNavItem.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'orders' && pendingAssignment > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-brand-orange font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                {pendingAssignment} pending
              </span>
            )}
            {activeTab === 'sellers' && pendingSellers > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-brand-orange font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                {pendingSellers} pending review
              </span>
            )}
            <span className="text-white/20 text-xs">{adminRole ? ROLE_LABELS[adminRole] : ''}</span>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto px-6 py-8 ${activeTab === 'orders' || activeTab === 'riders' ? 'max-w-full' : 'max-w-4xl'}`}>
            {activeTab === 'orders'        && <OrderAssignmentTab adminRole={adminRole!} onPendingChange={setPendingAssignment} />}
            {activeTab === 'riders'        && <RidersTab adminRole={adminRole!} />}
            {activeTab === 'sellers'       && <SellersTab adminRole={adminRole!} />}
            {activeTab === 'chat'          && <ChatInboxTab adminId={user!.id} />}
            {activeTab === 'announcements' && <AnnouncementsTab adminId={user!.id} />}
          </div>
        </div>

      </div>
    </div>
  )
}
