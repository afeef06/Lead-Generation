'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/lib/hooks/use-role'

const TABS = [
  { href: '/discover', label: 'Discover',        ownerOnly: false },
  { href: '/my-leads', label: 'My Leads',        ownerOnly: false },
  { href: '/find',     label: 'Business Finder', ownerOnly: false },
  { href: '/outreach', label: 'Outreach',        ownerOnly: false },
  { href: '/conversion', label: 'Conversion',    ownerOnly: true  },
  { href: '/costs',    label: 'API Costs',       ownerOnly: true  },
]

export function LeadIntelligenceTabs() {
  const pathname = usePathname()
  const role = useRole()
  const isOwner = role === 'owner'
  const visible = TABS.filter(t => isOwner || !t.ownerOnly)

  return (
    <div className="border-b border-[#1A1A1A] px-6 md:px-8 flex gap-1 overflow-x-auto">
      {visible.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`relative shrink-0 px-3 py-3 text-[11px] font-medium tracking-wide transition-colors whitespace-nowrap ${
              active ? 'text-hi' : 'text-lo hover:text-mid'
            }`}
          >
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-signal" />
            )}
            {label}
          </Link>
        )
      })}
    </div>
  )
}
