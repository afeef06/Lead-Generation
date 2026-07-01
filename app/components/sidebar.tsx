'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, Briefcase,
  Bot, BarChart3, FileText, CheckSquare,
  Settings, GitBranch, LogOut, Target, Users2, MessageSquare, BookOpen,
  Search, Bookmark, Mail, TrendingUp, Cpu,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useRole } from '@/lib/hooks/use-role'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, ownerOnly: false },
      { href: '/analytics', label: 'Analytics', icon: BarChart3,       ownerOnly: true  },
    ],
  },
  {
    label: 'Lead Intelligence',
    items: [
      { href: '/discover',   label: 'Discover',   icon: Search,     ownerOnly: false },
      { href: '/my-leads',   label: 'My Leads',   icon: Bookmark,   ownerOnly: false },
      { href: '/outreach',   label: 'Outreach',   icon: Mail,       ownerOnly: false },
      { href: '/conversion', label: 'Conversion', icon: TrendingUp, ownerOnly: true  },
      { href: '/costs',      label: 'API Costs',  icon: Cpu,        ownerOnly: true  },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/clients',  label: 'Clients',   icon: Users,     ownerOnly: false },
      { href: '/leads',    label: 'CRM Leads', icon: Target,    ownerOnly: false },
      { href: '/team',     label: 'Team',      icon: Users2,    ownerOnly: true  },
      { href: '/playbook', label: 'Playbook',  icon: BookOpen,  ownerOnly: false },
      { href: '/pipeline', label: 'Pipeline',  icon: GitBranch, ownerOnly: false },
      { href: '/projects', label: 'Projects',  icon: Briefcase, ownerOnly: false },
      { href: '/invoices', label: 'Invoices',  icon: FileText,  ownerOnly: true  },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/finance', label: 'Finance', icon: DollarSign,  ownerOnly: true  },
      { href: '/tasks',   label: 'Tasks',   icon: CheckSquare, ownerOnly: false },
    ],
  },
  {
    label: 'AI System',
    items: [
      { href: '/agent',    label: 'AI Agent', icon: Bot,           ownerOnly: false },
      { href: '/messages', label: 'Messages', icon: MessageSquare, ownerOnly: false },
      { href: '/settings', label: 'Settings', icon: Settings,      ownerOnly: true  },
    ],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const role     = useRole()
  const isOwner  = role === 'owner'

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder_key'
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className={`fixed left-0 top-0 h-full w-60 bg-[#080808] border-r border-[#1A1A1A] flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
            <Image src="/rr-logo.png" alt="R&R Collective" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-hi text-[13px] font-semibold tracking-tight leading-none">R&R Collective</p>
            <p className="text-lo text-[9px] tracking-[0.18em] uppercase mt-1">Business Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {navGroups.map(({ label, items }) => {
          const visible = items.filter(i => isOwner || !i.ownerOnly)
          if (visible.length === 0) return null
          return (
          <div key={label}>
            <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] px-3 mb-2">{label}</p>
            <div className="space-y-0.5">
              {visible.map(({ href, label: itemLabel, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                      active
                        ? 'bg-[#1C1C1C] text-hi'
                        : 'text-lo hover:text-mid hover:bg-[#141414]'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-signal rounded-r-full" />
                    )}
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                      active ? 'text-signal' : 'text-lo group-hover:text-mid'
                    }`} />
                    <span>{itemLabel}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#1A1A1A] space-y-2">
        {/* System status */}
        <div className="flex items-center gap-2.5 px-3">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-up opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-up" />
          </span>
          <p className="text-lo text-[10px] tracking-wide">AI System Online</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-lo hover:text-mid hover:bg-[#141414] transition-all duration-150 group"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-lo group-hover:text-mid transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
