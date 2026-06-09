import Image from 'next/image'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-brand-dark text-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/Footer_Light Mode.svg"
              alt="AnyBuy"
              width={130}
              height={52}
            />
            <p className="text-sm mt-3 leading-relaxed">
              Africa's most trusted secondhand marketplace.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              {['Browse', 'Categories', 'Live Selling', 'Sell an Item'].map(item => (
                <li key={item}><Link href="#" className="hover:text-white transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/track" className="hover:text-white transition-colors">Track my order</Link></li>
              {['How it works', 'Buyer Protection', 'Dispute Resolution', 'Contact Us'].map(item => (
                <li key={item}><Link href="#" className="hover:text-white transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Earn with AnyBuy</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/rider" className="hover:text-white transition-colors">Deliver with AnyBuy</Link></li>
              <li><Link href="/seller" className="hover:text-white transition-colors">Sell on AnyBuy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              {['About', 'Terms', 'Privacy', 'Blog'].map(item => (
                <li key={item}><Link href="#" className="hover:text-white transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>© {new Date().getFullYear()} AnyBuy. All rights reserved.</p>
          <p>Made with trust in Africa 🌍</p>
        </div>
      </div>
    </footer>
  )
}
