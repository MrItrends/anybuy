'use client'

import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@anybuy/utils'
import {
  AlertCircle, Building2, CheckCircle2, CreditCard,
  Loader2, Plus, Trash2, Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const NIGERIAN_BANKS = [
  { name: 'Access Bank',         code: '044' },
  { name: 'Citibank Nigeria',    code: '023' },
  { name: 'Ecobank Nigeria',     code: '050' },
  { name: 'Fidelity Bank',       code: '070' },
  { name: 'First Bank',          code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank',       code: '030' },
  { name: 'Keystone Bank',       code: '082' },
  { name: 'Kuda Bank',           code: '090267' },
  { name: 'OPay',                code: '999992' },
  { name: 'Palmpay',             code: '999991' },
  { name: 'Polaris Bank',        code: '076' },
  { name: 'Providus Bank',       code: '101' },
  { name: 'Stanbic IBTC',        code: '039' },
  { name: 'Standard Chartered',  code: '068' },
  { name: 'Sterling Bank',       code: '232' },
  { name: 'Union Bank',          code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank',          code: '215' },
  { name: 'VFD Microfinance Bank', code: '566' },
  { name: 'Wema Bank',           code: '035' },
  { name: 'Zenith Bank',         code: '057' },
]

interface BankAccount {
  id: string
  bank_name: string
  bank_code: string | null
  account_number: string
  account_name: string
  is_default: boolean
  created_at: string
}
interface Withdrawal {
  id: string
  amount: number
  status: string
  reference: string | null
  created_at: string
  bank_account: { bank_name: string; account_number: string } | null
}

interface PayoutsTabProps {
  sellerId: string
  withdrawable: number
}

const STATUS_COLOR: Record<string, string> = {
  pending:    'text-amber-700 bg-amber-50',
  processing: 'text-blue-700 bg-blue-50',
  completed:  'text-green-700 bg-green-50',
  failed:     'text-red-700 bg-red-50',
}

export function PayoutsTab({ sellerId, withdrawable }: PayoutsTabProps) {
  const [accounts, setAccounts]     = useState<BankAccount[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  // Add bank form state
  const [bankName, setBankName]       = useState('')
  const [bankCode, setBankCode]       = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName]   = useState('')
  const [savingBank, setSavingBank]   = useState(false)

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => {
    load()
  }, [sellerId])

  async function load() {
    const supabase = createClient()
    const [{ data: ba }, { data: wd }] = await Promise.all([
      supabase.from('seller_bank_accounts').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*, bank_account:seller_bank_accounts(bank_name, account_number)').eq('seller_id', sellerId).order('created_at', { ascending: false }),
    ])
    setAccounts(ba ?? [])
    setWithdrawals((wd ?? []).map((w: any) => ({
      ...w,
      bank_account: Array.isArray(w.bank_account) ? w.bank_account[0] : w.bank_account,
    })))
    if (ba && ba.length > 0) setWithdrawAccount(ba.find((a: BankAccount) => a.is_default)?.id ?? ba[0].id)
    setLoading(false)
  }

  async function handleAddBank(e: React.FormEvent) {
    e.preventDefault()
    if (!bankName || !accountNumber || !accountName) return
    setSavingBank(true)
    const supabase = createClient()

    // If this is the first account, make it default
    const isFirst = accounts.length === 0

    const { data, error } = await supabase
      .from('seller_bank_accounts')
      .insert({
        seller_id: sellerId,
        bank_name: bankName,
        bank_code: bankCode || null,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        is_default: isFirst,
      })
      .select()
      .single()

    if (error) {
      toast.error('Could not save bank account')
    } else {
      setAccounts(prev => [data, ...prev])
      if (isFirst) setWithdrawAccount(data.id)
      setBankName(''); setBankCode(''); setAccountNumber(''); setAccountName('')
      setShowAddForm(false)
      toast.success('Bank account added!')
    }
    setSavingBank(false)
  }

  async function deleteAccount(id: string) {
    if (!window.confirm('Remove this bank account?')) return
    const supabase = createClient()
    await supabase.from('seller_bank_accounts').delete().eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
    toast.success('Bank account removed')
  }

  async function setDefault(id: string) {
    const supabase = createClient()
    // Clear all defaults then set this one
    await supabase.from('seller_bank_accounts').update({ is_default: false }).eq('seller_id', sellerId)
    await supabase.from('seller_bank_accounts').update({ is_default: true }).eq('id', id)
    setAccounts(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
    toast.success('Default account updated')
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < 500) { toast.error('Minimum withdrawal is ₦500'); return }
    if (amount > withdrawable) { toast.error('Amount exceeds your withdrawable balance'); return }
    if (!withdrawAccount) { toast.error('Select a bank account'); return }

    setWithdrawing(true)
    const supabase = createClient()
    const ref = `WD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        seller_id: sellerId,
        bank_account_id: withdrawAccount,
        amount,
        reference: ref,
        status: 'pending',
        note: 'Withdrawal requested via seller dashboard',
      })
      .select('*, bank_account:seller_bank_accounts(bank_name, account_number)')
      .single()

    if (error) {
      toast.error('Withdrawal request failed')
    } else {
      const w = { ...data, bank_account: Array.isArray(data.bank_account) ? data.bank_account[0] : data.bank_account }
      setWithdrawals(prev => [w, ...prev])
      setWithdrawAmount('')
      toast.success('Withdrawal request submitted! Processing within 1–2 business days.')
    }
    setWithdrawing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-neutral-300" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-satoshi text-xl font-bold text-neutral-900">Payouts</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage your bank accounts and withdraw earnings.</p>
      </div>

      {/* Withdrawable balance card */}
      <div className="bg-brand-dark rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1 text-white/60 text-sm">
          <Wallet size={15} />
          Withdrawable balance
        </div>
        <p className="font-satoshi text-4xl font-bold">{formatPrice(withdrawable)}</p>
        <p className="text-white/40 text-xs mt-2">
          Funds are released after buyers confirm delivery.
        </p>
      </div>

      {/* Withdraw form */}
      {withdrawable > 0 && accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <h3 className="font-satoshi font-bold text-neutral-900">Request withdrawal</h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Bank account</label>
              <select
                value={withdrawAccount}
                onChange={e => setWithdrawAccount(e.target.value)}
                className="h-11 px-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} — {a.account_number} ({a.account_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Amount (₦)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold text-sm">₦</span>
                <input
                  type="number"
                  min="500"
                  max={withdrawable}
                  step="1"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-8 pr-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-400">Minimum: ₦500</p>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(withdrawable))}
                  className="text-xs text-brand-orange font-semibold hover:underline"
                >
                  Withdraw all
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={withdrawing || !withdrawAmount}
              className="w-full h-11 bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {withdrawing ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              {withdrawing ? 'Submitting…' : 'Request withdrawal'}
            </button>
          </form>

          <div className="flex items-start gap-2 text-xs text-neutral-400 pt-1">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            Withdrawals are processed within 1–2 business days. Platform fee of 5% has already been deducted.
          </div>
        </div>
      )}

      {/* No bank account + no withdrawable nudge */}
      {accounts.length === 0 && withdrawable > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Add a bank account to withdraw</p>
            <p className="text-amber-600 text-xs mt-1">
              You have {formatPrice(withdrawable)} ready to withdraw. Add your bank account below.
            </p>
          </div>
        </div>
      )}

      {/* Bank accounts */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-neutral-500" />
            <h3 className="font-satoshi font-bold text-neutral-900 text-sm">Bank accounts</h3>
          </div>
          <button
            onClick={() => setShowAddForm(f => !f)}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:text-[#e85a2d] transition-colors"
          >
            <Plus size={15} />
            Add account
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAddBank} className="p-5 border-b border-neutral-100 bg-neutral-50 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-neutral-700">Bank name</label>
                <select
                  value={bankName}
                  onChange={e => {
                    const bank = NIGERIAN_BANKS.find(b => b.name === e.target.value)
                    setBankName(e.target.value)
                    setBankCode(bank?.code ?? '')
                  }}
                  required
                  className="h-11 px-3 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="">Select bank…</option>
                  {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-neutral-700">Account number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0123456789"
                  maxLength={10}
                  required
                  className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Account name</label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="As it appears on the bank record"
                required
                className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={savingBank}
                className="flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e85a2d] disabled:opacity-50 transition-all"
              >
                {savingBank ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Save account
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-sm text-neutral-500 hover:text-neutral-700">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Account list */}
        {accounts.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CreditCard size={28} className="text-neutral-200 mb-3" />
            <p className="text-sm font-semibold text-neutral-600">No bank accounts yet</p>
            <p className="text-xs text-neutral-400 mt-1">Add one to start withdrawing your earnings</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 text-sm">{account.bank_name}</p>
                  <p className="text-xs text-neutral-500">{account.account_number} · {account.account_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {account.is_default ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle2 size={12} /> Default
                    </span>
                  ) : (
                    <button
                      onClick={() => setDefault(account.id)}
                      className="text-xs text-neutral-400 hover:text-brand-orange transition-colors font-medium"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal history */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-satoshi font-bold text-neutral-900 text-sm">Withdrawal history</h3>
        </div>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">No withdrawals yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">Bank</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-600">
                    {new Date(w.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-neutral-700">
                    {w.bank_account?.bank_name ?? '—'}
                    {w.bank_account?.account_number && (
                      <span className="text-neutral-400 text-xs ml-1">···{w.bank_account.account_number.slice(-4)}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-satoshi font-bold text-neutral-900">
                    {formatPrice(w.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[w.status] ?? 'text-neutral-500 bg-neutral-100'}`}>
                      {w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
