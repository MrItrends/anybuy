import { MessageCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ product?: string; seller?: string }>
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const { product, seller } = await searchParams

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-6">
          <MessageCircle size={36} className="text-brand-orange" />
        </div>

        <h1 className="font-satoshi text-2xl font-bold text-neutral-900 mb-2">
          AnyBuy Protected Chat
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed mb-6">
          All buyer–seller conversations on AnyBuy are mediated by our team to
          keep your deal safe, secure, and fully covered by escrow.
        </p>

        {/* Trust callout */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">Why admin-mediated?</p>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                Off-platform deals lose escrow protection. Our team keeps a record of
                every conversation so disputes can be resolved fairly.
              </p>
            </div>
          </div>
        </div>

        {/* Coming soon state */}
        <div className="bg-brand-dark rounded-2xl p-6 text-white mb-6">
          <p className="font-satoshi font-bold text-lg mb-1">Inbox coming soon</p>
          <p className="text-white/60 text-sm">
            Our protected messaging system is being set up. In the meantime, reach
            our team directly and we'll connect you with the seller.
          </p>
          <a
            href={`mailto:support@anybuy.africa${product ? `?subject=Product enquiry (${product})` : ''}`}
            className="mt-4 inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-orange/90 transition-colors"
          >
            Contact AnyBuy Support
          </a>
        </div>

        <Link href={product ? `/products/${product}` : '/'} className="text-sm text-brand-orange hover:underline">
          ← Back to {product ? 'product' : 'home'}
        </Link>
      </div>
    </div>
  )
}
